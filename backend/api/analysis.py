"""
Synchronous dataset profiling and heuristic chart specs (demo / MVP).
Produces a stable JSON shape for the dashboard renderer.
"""

from __future__ import annotations

import json
import math
from typing import Any, Optional

import pandas as pd


def _finite(x: Any) -> bool:
    try:
        v = float(x)
        return math.isfinite(v)
    except (TypeError, ValueError):
        return False


def _json_float(x: Any) -> Optional[float]:
    if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))):
        return None
    try:
        v = float(x)
        if not math.isfinite(v):
            return None
        return round(v, 6)
    except (TypeError, ValueError):
        return None


def _infer_semantic_type(series: pd.Series) -> str:
    if pd.api.types.is_bool_dtype(series):
        return "boolean"
    if pd.api.types.is_numeric_dtype(series) and not pd.api.types.is_datetime64_any_dtype(series):
        return "number"
    if pd.api.types.is_datetime64_any_dtype(series):
        return "datetime"

    if pd.api.types.is_object_dtype(series) or pd.api.types.is_string_dtype(series):
        coerced = pd.to_datetime(series, errors="coerce", utc=False, format="mixed")
        valid_ratio = float(coerced.notna().mean()) if len(series) else 0.0
        if valid_ratio >= 0.7:
            return "datetime"

    numeric = pd.to_numeric(series, errors="coerce")
    valid_ratio = float(numeric.notna().mean()) if len(series) else 0.0
    if valid_ratio >= 0.7:
        return "number"

    return "text"


def _profile_column(name: str, series: pd.Series) -> dict[str, Any]:
    n = int(len(series))
    nulls = int(series.isna().sum())
    null_pct = round((nulls / n) * 100, 2) if n else 0.0
    inferred = _infer_semantic_type(series)

    distinct_full = series.nunique(dropna=True)
    distinct = int(distinct_full)
    if inferred == "text":
        sample_vals = series.dropna().astype(str).head(3).tolist()
    elif inferred == "number":
        num_head = pd.to_numeric(series, errors="coerce").dropna().head(3)
        sample_vals = [_json_float(v) for v in num_head.tolist()]
    else:
        coerced = pd.to_datetime(series, errors="coerce").dropna().head(3)
        sample_vals = [t.isoformat() if pd.notna(t) else None for t in coerced.tolist()]

    profile: dict[str, Any] = {
        "name": name,
        "inferredType": inferred,
        "pandasDtype": str(series.dtype),
        "nullCount": nulls,
        "nullPct": null_pct,
        "distinctCount": distinct,
        "sampleValues": sample_vals,
    }

    if inferred == "number":
        num = pd.to_numeric(series, errors="coerce")
        profile["min"] = _json_float(num.min())
        profile["max"] = _json_float(num.max())
        profile["mean"] = _json_float(num.mean())
    elif inferred == "datetime":
        coerced = pd.to_datetime(series, errors="coerce")
        mn, mx = coerced.min(), coerced.max()
        profile["min"] = mn.isoformat() if pd.notna(mn) else None
        profile["max"] = mx.isoformat() if pd.notna(mx) else None

    return profile


def profile_dataframe(df: pd.DataFrame) -> list[dict[str, Any]]:
    return [_profile_column(str(c), df[c]) for c in df.columns]


def build_metrics(df: pd.DataFrame, columns: list[dict[str, Any]]) -> dict[str, Any]:
    dupes = int(df.duplicated().sum()) if len(df) else 0
    return {
        "rowCount": int(len(df)),
        "columnCount": int(len(df.columns)),
        "duplicateRowCount": dupes,
        "numericColumnCount": sum(1 for c in columns if c["inferredType"] == "number"),
        "textColumnCount": sum(1 for c in columns if c["inferredType"] == "text"),
        "datetimeColumnCount": sum(1 for c in columns if c["inferredType"] == "datetime"),
    }


def _pick_columns(columns: list[dict[str, Any]]):
    date_cols = [c["name"] for c in columns if c["inferredType"] == "datetime"]
    num_cols = [c["name"] for c in columns if c["inferredType"] == "number"]
    text_cols = [c["name"] for c in columns if c["inferredType"] == "text"]
    return date_cols, num_cols, text_cols


def _preview_table_chart(df: pd.DataFrame) -> Optional[dict[str, Any]]:
    """
    Tabular preview spec for the UI renderer.

    Contract:
      type: "table"
      mapping.columnKeys: ordered column names to display
      mapping.tableRef: optional "dataset" → use GET …/analysis/table/ when UI has datasetId + token
      data: list of row objects (JSON-serializable values; embedded preview / fallback)
    """
    if df.empty:
        return None

    max_rows = 15
    max_cols = 12
    col_slice = list(df.columns[:max_cols])
    colnames = [str(c) for c in col_slice]
    if not colnames:
        return None

    sample = df.loc[:, col_slice].head(max_rows)
    data = json.loads(sample.to_json(orient="records", date_format="iso"))

    return {
        "id": "chart_preview_table",
        "type": "table",
        "title": "Preview (sample rows)",
        "mapping": {"columnKeys": colnames, "tableRef": "dataset"},
        "data": data,
    }


def _heuristic_charts(df: pd.DataFrame, columns: list[dict[str, Any]]) -> list[dict[str, Any]]:
    charts: list[dict[str, Any]] = []
    if df.empty or not len(columns):
        return charts

    date_cols, num_cols, text_cols = _pick_columns(columns)
    name_by_col = {c["name"]: c for c in columns}

    # 1) Time series: first datetime x first numeric
    if date_cols and num_cols:
        dcol, ncol = date_cols[0], num_cols[0]
        dts = pd.to_datetime(df[dcol], errors="coerce")
        vals = pd.to_numeric(df[ncol], errors="coerce")
        work = pd.DataFrame({"__d": dts, "__y": vals}).dropna()
        if not work.empty:
            work["__day"] = work["__d"].dt.floor("D")
            agg = work.groupby("__day", as_index=False)["__y"].sum().sort_values("__day")
            agg = agg.tail(30)
            data = [
                {"x": row["__day"].isoformat(), "y": _json_float(row["__y"])}
                for _, row in agg.iterrows()
            ]
            charts.append(
                {
                    "id": "chart_time_series",
                    "type": "line",
                    "title": f"{ncol} over time ({dcol})",
                    "mapping": {"xKey": "x", "yKey": "y", "labelKey": "x"},
                    "data": data,
                }
            )

    # 2) Bar: low-cardinality text x numeric sum
    for tcol in text_cols:
        if len(charts) >= 2:
            break
        if not num_cols:
            break
        ncol = num_cols[0]
        if tcol == ncol:
            continue
        distinct = int(name_by_col[tcol]["distinctCount"])
        if distinct > 20 or distinct < 2:
            continue
        sub = df[[tcol, ncol]].copy()
        sub[ncol] = pd.to_numeric(sub[ncol], errors="coerce")
        g = sub.dropna(subset=[ncol]).groupby(tcol, dropna=True)[ncol].sum().sort_values(ascending=False).head(15)
        data = [{"category": str(k), "value": _json_float(v)} for k, v in g.items()]
        if data:
            charts.append(
                {
                    "id": f"chart_bar_{tcol}",
                    "type": "bar",
                    "title": f"{ncol} by {tcol}",
                    "mapping": {"xKey": "category", "yKey": "value", "labelKey": "category"},
                    "data": data,
                }
            )
            break

    # 3) Pie: small categorical breakdown of first numeric
    if len(charts) < 2 and text_cols and num_cols:
        tcol = text_cols[0]
        ncol = num_cols[0]
        distinct = int(name_by_col[tcol]["distinctCount"])
        if 2 <= distinct <= 8:
            sub = df[[tcol, ncol]].copy()
            sub[ncol] = pd.to_numeric(sub[ncol], errors="coerce")
            g = sub.dropna(subset=[ncol]).groupby(tcol, dropna=True)[ncol].sum()
            data = [{"name": str(k), "value": _json_float(v)} for k, v in g.items() if _finite(v)]
            if len(data) >= 2:
                charts.append(
                    {
                        "id": f"chart_pie_{tcol}",
                        "type": "pie",
                        "title": f"Share of {ncol} by {tcol}",
                        "mapping": {"nameKey": "name", "valueKey": "value"},
                        "data": data,
                    }
                )

    out = charts[:2]
    preview = _preview_table_chart(df)
    if preview is not None and len(out) < 3:
        out.append(preview)
    return out


def _stub_insights(columns: list[dict[str, Any]], metrics: dict[str, Any], charts: list[dict[str, Any]]):
    insights: list[dict[str, Any]] = []
    insights.append(
        {
            "id": "insight_shape",
            "text": f"The dataset has {metrics['rowCount']:,} rows and {metrics['columnCount']} columns.",
            "evidence": {"kind": "metrics", "keys": ["rowCount", "columnCount"]},
        }
    )

    worst = None
    for c in columns:
        if c["nullPct"] > 0 and (worst is None or c["nullPct"] > worst["nullPct"]):
            worst = c
    if worst and worst["nullPct"] >= 1:
        insights.append(
            {
                "id": "insight_nulls",
                "text": f"Column “{worst['name']}” has the most missing values ({worst['nullPct']}% null).",
                "evidence": {"kind": "column", "column": worst["name"], "nullPct": worst["nullPct"]},
            }
        )
    else:
        insights.append(
            {
                "id": "insight_types",
                "text": (
                    f"Detected {metrics['numericColumnCount']} numeric, "
                    f"{metrics['datetimeColumnCount']} date/time, and "
                    f"{metrics['textColumnCount']} text columns."
                ),
                "evidence": {"kind": "metrics", "keys": ["numericColumnCount", "datetimeColumnCount", "textColumnCount"]},
            }
        )

    if charts:
        ch = charts[0]
        insights.append(
            {
                "id": "insight_chart",
                "text": f"A {ch['type']} chart was generated: {ch.get('title', ch['id'])}.",
                "evidence": {"kind": "chart", "chartId": ch.get("id")},
            }
        )
    else:
        insights.append(
            {
                "id": "insight_no_chart",
                "text": "No automatic chart was selected (needs a clear date/category plus numeric pairing).",
                "evidence": {"kind": "charts", "count": 0},
            }
        )

    return insights[:3]


def build_analysis_payload(df: pd.DataFrame) -> dict[str, Any]:
    """Full analysis contract returned to the client."""
    columns = profile_dataframe(df)
    metrics = build_metrics(df, columns)
    charts = _heuristic_charts(df, columns)
    insights = _stub_insights(columns, metrics, charts)
    return {
        "version": 1,
        "columns": columns,
        "metrics": metrics,
        "charts": charts,
        "insights": insights,
    }


def coerce_tabular_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Best-effort cleanup for profiling."""
    out = df.copy()
    out.columns = [str(c).strip() or f"column_{i}" for i, c in enumerate(out.columns)]
    return out
