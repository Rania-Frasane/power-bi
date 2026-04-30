"""
Dataset cleaning utilities:
- duplicate row detection
- corrupted value detection (type coercion failures)
- inconsistency detection for numeric columns (robust outliers)
- neighbor-based interpolation (previous/next expected value)
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Optional

import pandas as pd


def _is_missing(x: Any) -> bool:
    if x is None:
        return True
    if isinstance(x, float) and (math.isnan(x) or math.isinf(x)):
        return True
    if isinstance(x, str) and x.strip() == "":
        return True
    return False


def _robust_zscore(series: pd.Series) -> pd.Series:
    """
    Robust z-score using MAD:
      z = 0.6745 * (x - median) / MAD
    """
    s = pd.to_numeric(series, errors="coerce")
    med = float(s.median()) if len(s) else float("nan")
    mad = float((s - med).abs().median()) if len(s) else float("nan")
    if not math.isfinite(med) or not math.isfinite(mad) or mad == 0:
        return pd.Series([0.0] * len(series), index=series.index, dtype="float64")
    z = 0.6745 * (s - med) / mad
    z = z.replace([math.inf, -math.inf], math.nan).fillna(0.0)
    return z


def _neighbor_expected(values: list[Optional[float]], idx: int) -> Optional[float]:
    prev = None
    for j in range(idx - 1, -1, -1):
        v = values[j]
        if v is not None and math.isfinite(v):
            prev = v
            break
    nxt = None
    for j in range(idx + 1, len(values)):
        v = values[j]
        if v is not None and math.isfinite(v):
            nxt = v
            break
    if prev is None and nxt is None:
        return None
    if prev is None:
        return nxt
    if nxt is None:
        return prev
    return (prev + nxt) / 2.0


@dataclass
class CleaningReport:
    row_count: int
    duplicate_row_count: int
    corrupted_cells: int
    outlier_cells: int
    fixed_cells: int
    fixed_by_column: dict[str, int]
    corrupted_by_column: dict[str, int]
    outliers_by_column: dict[str, int]


def clean_dataframe(
    df: pd.DataFrame,
    *,
    drop_duplicates: bool = True,
    trim_strings: bool = True,
    outlier_z: float = 6.0,
    fix_numeric: bool = True,
    max_rows: Optional[int] = 50000,
) -> tuple[pd.DataFrame, CleaningReport]:
    """
    Returns (cleaned_df, report).

    Detection:
    - duplicates: exact duplicate rows
    - corrupted: non-coercible values in numeric-looking columns
    - outliers: robust MAD z-score > outlier_z for numeric columns

    Fix:
    - numeric corrupted/outlier values are replaced with neighbor-based expected values
      (previous/next valid values, average if both exist).
    """
    work = df.copy()
    if max_rows is not None and len(work) > max_rows:
        work = work.head(int(max_rows)).copy()

    if trim_strings:
        for col in work.columns:
            if pd.api.types.is_object_dtype(work[col]) or pd.api.types.is_string_dtype(work[col]):
                work[col] = work[col].astype(str).map(lambda x: x.strip() if isinstance(x, str) else x)

    duplicate_count = int(work.duplicated().sum()) if len(work) else 0
    if drop_duplicates and len(work):
        work = work.drop_duplicates(ignore_index=True)

    corrupted_cells = 0
    outlier_cells = 0
    fixed_cells = 0
    fixed_by_col: dict[str, int] = {}
    corrupted_by_col: dict[str, int] = {}
    outliers_by_col: dict[str, int] = {}

    for col in work.columns:
        series = work[col]

        # Heuristic: treat a column as "numeric candidate" if >= 70% can be coerced
        numeric = pd.to_numeric(series, errors="coerce")
        valid_ratio = float(numeric.notna().mean()) if len(series) else 0.0
        if valid_ratio < 0.7:
            continue

        # Mark corrupted (non-missing but non-coercible)
        is_coercible = numeric.notna()
        is_missing = series.map(_is_missing)
        corrupted_mask = (~is_missing) & (~is_coercible)

        c_count = int(corrupted_mask.sum())
        if c_count:
            corrupted_cells += c_count
            corrupted_by_col[col] = c_count

        # Outliers (only among coercible values)
        z = _robust_zscore(series)
        outlier_mask = (z.abs() > float(outlier_z)) & is_coercible
        o_count = int(outlier_mask.sum())
        if o_count:
            outlier_cells += o_count
            outliers_by_col[col] = o_count

        if not fix_numeric:
            continue

        # Fix by neighbor interpolation on the numeric array (None where invalid/outlier/corrupted)
        numeric_values: list[Optional[float]] = []
        for i, v in enumerate(numeric.tolist()):
            if corrupted_mask.iloc[i] or outlier_mask.iloc[i] or _is_missing(series.iloc[i]):
                numeric_values.append(None)
            else:
                fv = float(v) if v is not None and not (isinstance(v, float) and math.isnan(v)) else None
                numeric_values.append(fv if fv is not None and math.isfinite(fv) else None)

        # Apply fixes back into dataframe
        fix_mask = corrupted_mask | outlier_mask
        if int(fix_mask.sum()) == 0:
            continue

        col_fixed = 0
        for i in range(len(work)):
            if not bool(fix_mask.iloc[i]):
                continue
            exp = _neighbor_expected(numeric_values, i)
            if exp is None or not math.isfinite(exp):
                continue
            # keep original type as best-effort (store number)
            work.at[i, col] = exp
            numeric_values[i] = exp
            col_fixed += 1

        if col_fixed:
            fixed_cells += col_fixed
            fixed_by_col[col] = col_fixed

    report = CleaningReport(
        row_count=int(len(work)),
        duplicate_row_count=duplicate_count,
        corrupted_cells=corrupted_cells,
        outlier_cells=outlier_cells,
        fixed_cells=fixed_cells,
        fixed_by_column=fixed_by_col,
        corrupted_by_column=corrupted_by_col,
        outliers_by_column=outliers_by_col,
    )
    return work, report

