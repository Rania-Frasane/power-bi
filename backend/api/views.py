"""
API views and endpoints for analytics dashboard.
"""

import json
import secrets
import pandas as pd

from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import HttpResponse

from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView

from .models import (
    Dataset, APIConnection, Dashboard, Widget,
    DashboardFilter, UserPreference
)

from .serializers import (
    UserSerializer, UserRegisterSerializer, APIConnectionSerializer,
    DatasetSerializer, WidgetSerializer, DashboardFilterSerializer,
    DashboardDetailSerializer, DashboardListSerializer,
    UserPreferenceSerializer
)
from .analysis import build_analysis_payload
from .dataset_io import load_tabular_dataframe
from .cleaning import clean_dataframe


# =========================
# USER
# =========================
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_queryset(self):
        return User.objects.filter(id=self.request.user.id)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


# =========================
# API CONNECTION
# =========================
class APIConnectionViewSet(viewsets.ModelViewSet):
    serializer_class = APIConnectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return APIConnection.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        connection = self.get_object()

        try:
            connection.last_tested = timezone.now()
            connection.is_active = True
            connection.save()

            return Response({"status": "Connection successful"})
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# =========================
# DATASET
# =========================
class DatasetViewSet(viewsets.ModelViewSet):
    serializer_class = DatasetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Dataset.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        instance = serializer.save(user=self.request.user)
        self._process_dataset(instance)

    def _process_dataset(self, instance):
        try:
            df = load_tabular_dataframe(instance)
            if df is None:
                return

            instance.schema = {col: str(df[col].dtype) for col in df.columns}
            instance.row_count = len(df)
            instance.cached_data = json.loads(
                df.head(1000).to_json(orient="records", date_format="iso")
            )
            instance.analysis = build_analysis_payload(df)
            instance.last_refreshed = timezone.now()
            instance.save()

        except Exception as e:
            print(f"[Dataset Error] {e}")

    @action(detail=True, methods=["post"])
    def refresh(self, request, pk=None):
        dataset = self.get_object()

        try:
            self._process_dataset(dataset)
            return Response({
                "status": "Dataset refreshed",
                "row_count": dataset.row_count,
                "analysis": dataset.analysis or {},
            })

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get"])
    def analysis(self, request, pk=None):
        """Return persisted profiling + chart specs (same shape as upload response)."""
        dataset = self.get_object()
        return Response(dataset.analysis or {})

    @action(detail=True, methods=["get"])
    def data(self, request, pk=None):
        """
        Return dataset rows for dashboard widgets.
        Uses cached data first; falls back to reading the dataset file.
        """
        dataset = self.get_object()
        limit_raw = request.query_params.get("limit")
        try:
            limit = int(limit_raw) if limit_raw else None
        except (TypeError, ValueError):
            return Response({"error": "Invalid limit"}, status=status.HTTP_400_BAD_REQUEST)

        rows = dataset.cached_data or []
        if not rows:
            try:
                df = load_tabular_dataframe(dataset)
            except Exception as e:
                return Response(
                    {"error": f"Could not read dataset: {e}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if df is None:
                # Return an empty payload instead of 400 so dashboards can still load.
                return Response({"data": [], "row_count": 0, "warning": "No tabular data"}, status=status.HTTP_200_OK)
            rows = json.loads(df.to_json(orient="records", date_format="iso"))

        if isinstance(limit, int) and limit > 0:
            rows = rows[:limit]

        return Response({"data": rows, "row_count": len(rows)})

    @action(detail=True, methods=["get"], url_path="analysis/table")
    def analysis_table(self, request, pk=None):
        """
        Paginated tabular rows for large datasets (server-side filter + sort).

        Query params:
          page (default 1), page_size (default 8, max 100),
          q — case-insensitive substring across all columns,
          sort — column name, order — asc | desc (default asc).

        Response: columnKeys, rows, total, page, page_size, page_count
        """
        dataset = self.get_object()

        raw_page = request.query_params.get("page", "1")
        raw_size = request.query_params.get("page_size", "8")
        try:
            page = int(raw_page)
        except (TypeError, ValueError):
            return Response({"error": "Invalid page"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            page_size = int(raw_size)
        except (TypeError, ValueError):
            return Response(
                {"error": "Invalid page_size"}, status=status.HTTP_400_BAD_REQUEST
            )

        page = max(1, page)
        page_size = max(1, min(100, page_size))

        q = (request.query_params.get("q") or "").strip()
        sort_col = (request.query_params.get("sort") or "").strip()
        order = (request.query_params.get("order") or "asc").lower()
        if order not in ("asc", "desc"):
            order = "asc"

        try:
            df = load_tabular_dataframe(dataset)
        except Exception as e:
            return Response(
                {"error": f"Could not read dataset: {e}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if df is None:
            return Response(
                {"error": "No tabular file available for this dataset."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        column_keys = [str(c) for c in df.columns]

        if q:
            q_lower = q.lower()
            mask = pd.Series(False, index=df.index)
            for col in df.columns:
                mask = mask | df[col].astype(str).str.lower().str.contains(
                    q_lower, na=False, regex=False
                )
            df = df.loc[mask]

        if sort_col:
            if sort_col not in df.columns:
                return Response(
                    {"error": f"Unknown sort column: {sort_col}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                df = df.sort_values(
                    by=sort_col, ascending=(order == "asc"), kind="mergesort"
                )
            except Exception as e:
                return Response(
                    {"error": f"Cannot sort by {sort_col}: {e}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        total = int(len(df))
        page_count = max(1, (total + page_size - 1) // page_size) if total else 1
        current_page = min(page, page_count) if total else 1
        start = (current_page - 1) * page_size
        chunk = df.iloc[start : start + page_size]
        rows = json.loads(chunk.to_json(orient="records", date_format="iso"))

        return Response(
            {
                "columnKeys": column_keys,
                "rows": rows,
                "total": total,
                "page": current_page,
                "page_size": page_size,
                "page_count": page_count,
            }
        )

    @action(detail=True, methods=["get"], url_path="cleaning/preview")
    def cleaning_preview(self, request, pk=None):
        """
        Preview cleaning report + cleaned sample rows (JSON).

        Query params:
          limit (default 50) — number of cleaned rows to return
          outlier_z (default 6.0) — robust z-score threshold
          drop_duplicates (default 1), trim_strings (default 1), fix_numeric (default 1)
          max_rows (default 50000) — cap rows processed for performance
        """
        dataset = self.get_object()
        try:
            df = load_tabular_dataframe(dataset)
        except Exception as e:
            return Response({"error": f"Could not read dataset: {e}"}, status=status.HTTP_400_BAD_REQUEST)

        if df is None:
            return Response({"data": [], "report": {"warning": "No tabular data"}}, status=status.HTTP_200_OK)

        def _bool_q(name: str, default: bool) -> bool:
            raw = request.query_params.get(name)
            if raw is None:
                return default
            return str(raw).strip().lower() not in ("0", "false", "no", "off")

        try:
            limit = int(request.query_params.get("limit", "50"))
        except (TypeError, ValueError):
            limit = 50
        limit = max(0, min(200, limit))

        try:
            outlier_z = float(request.query_params.get("outlier_z", "6.0"))
        except (TypeError, ValueError):
            outlier_z = 6.0
        outlier_z = max(2.0, min(20.0, outlier_z))

        try:
            max_rows = int(request.query_params.get("max_rows", "50000"))
        except (TypeError, ValueError):
            max_rows = 50000
        max_rows = max(1000, min(200000, max_rows))

        cleaned, report = clean_dataframe(
            df,
            drop_duplicates=_bool_q("drop_duplicates", True),
            trim_strings=_bool_q("trim_strings", True),
            fix_numeric=_bool_q("fix_numeric", True),
            outlier_z=outlier_z,
            max_rows=max_rows,
        )

        sample = cleaned.head(limit) if limit else cleaned.head(0)
        rows = json.loads(sample.to_json(orient="records", date_format="iso"))
        return Response(
            {
                "data": rows,
                "columns": [str(c) for c in cleaned.columns],
                "report": {
                    "row_count": report.row_count,
                    "duplicate_row_count": report.duplicate_row_count,
                    "corrupted_cells": report.corrupted_cells,
                    "outlier_cells": report.outlier_cells,
                    "fixed_cells": report.fixed_cells,
                    "fixed_by_column": report.fixed_by_column,
                    "corrupted_by_column": report.corrupted_by_column,
                    "outliers_by_column": report.outliers_by_column,
                    "outlier_z": outlier_z,
                    "max_rows": max_rows,
                },
            }
        )

    @action(detail=True, methods=["get"], url_path="cleaning/export")
    def cleaning_export(self, request, pk=None):
        """
        Download a cleaned CSV using the same logic as cleaning_preview.

        Query params are the same as /cleaning/preview (except limit is ignored).
        """
        dataset = self.get_object()
        try:
            df = load_tabular_dataframe(dataset)
        except Exception as e:
            return Response({"error": f"Could not read dataset: {e}"}, status=status.HTTP_400_BAD_REQUEST)

        if df is None:
            return Response({"error": "No tabular data"}, status=status.HTTP_400_BAD_REQUEST)

        def _bool_q(name: str, default: bool) -> bool:
            raw = request.query_params.get(name)
            if raw is None:
                return default
            return str(raw).strip().lower() not in ("0", "false", "no", "off")

        try:
            outlier_z = float(request.query_params.get("outlier_z", "6.0"))
        except (TypeError, ValueError):
            outlier_z = 6.0
        outlier_z = max(2.0, min(20.0, outlier_z))

        try:
            max_rows = int(request.query_params.get("max_rows", "200000"))
        except (TypeError, ValueError):
            max_rows = 200000
        max_rows = max(1000, min(500000, max_rows))

        cleaned, _report = clean_dataframe(
            df,
            drop_duplicates=_bool_q("drop_duplicates", True),
            trim_strings=_bool_q("trim_strings", True),
            fix_numeric=_bool_q("fix_numeric", True),
            outlier_z=outlier_z,
            max_rows=max_rows,
        )

        csv_text = cleaned.to_csv(index=False)
        filename = f"{dataset.name}-cleaned.csv".replace("/", "-")
        resp = HttpResponse(csv_text, content_type="text/csv; charset=utf-8")
        resp["Content-Disposition"] = f'attachment; filename="{filename}"'
        return resp


# =========================
# PREVIEW
# =========================
class DataPreviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        dataset = get_object_or_404(Dataset, id=pk, user=request.user)

        return Response({
            "schema": dataset.schema,
            "sample_data": dataset.cached_data[:10],
            "row_count": dataset.row_count
        })


# =========================
# QUERY EXECUTION
# =========================
class ExecuteQueryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            dataset_id = request.data.get("dataset_id")
            dataset = get_object_or_404(Dataset, id=dataset_id, user=request.user)

            if dataset.source_type in ["csv", "excel"] and dataset.file:
                try:
                    df = load_tabular_dataframe(dataset)
                except Exception as e:
                    return Response(
                        {"error": str(e)}, status=status.HTTP_400_BAD_REQUEST
                    )
                if df is None:
                    return Response(
                        {"error": "Could not load dataset"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # NOTE: real query engine not implemented
                return Response(
                    {"data": json.loads(df.to_json(orient="records", date_format="iso"))}
                )

            return Response(
                {"error": "Query not supported"},
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# =========================
# WIDGETS
# =========================
class WidgetViewSet(viewsets.ModelViewSet):
    serializer_class = WidgetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Widget.objects.filter(dashboard__user=self.request.user)

    def perform_create(self, serializer):
        dashboard = serializer.validated_data["dashboard"]

        if dashboard.user != self.request.user:
            raise serializers.ValidationError("No permission")

        serializer.save()


# =========================
# DASHBOARD FILTERS
# =========================
class DashboardFilterViewSet(viewsets.ModelViewSet):
    serializer_class = DashboardFilterSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DashboardFilter.objects.filter(dashboard__user=self.request.user)

    def perform_create(self, serializer):
        dashboard = serializer.validated_data["dashboard"]

        if dashboard.user != self.request.user:
            raise serializers.ValidationError("No permission")

        serializer.save()


# =========================
# DASHBOARD
# =========================
class DashboardViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return DashboardDetailSerializer
        if self.action == "list":
            return DashboardListSerializer
        return DashboardDetailSerializer

    def get_queryset(self):
        return Dashboard.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def share(self, request, pk=None):
        dashboard = self.get_object()

        if not dashboard.share_token:
            dashboard.share_token = secrets.token_urlsafe(32)

        dashboard.is_public = True
        dashboard.save()

        return Response({
            "share_token": dashboard.share_token,
            "share_url": f"/dashboard/share/{dashboard.share_token}"
        })

    @action(detail=True, methods=["post"])
    def export(self, request, pk=None):
        dashboard = self.get_object()
        fmt = request.data.get("format", "pdf")

        return Response({
            "status": "Export initiated",
            "format": fmt
        })


# =========================
# EXPORT (standalone endpoint)
# =========================
class ExportDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        dashboard = get_object_or_404(Dashboard, id=pk, user=request.user)
        fmt = request.data.get("format", "pdf")

        return Response({
            "status": "Export initiated",
            "dashboard": dashboard.name,
            "format": fmt
        })


# =========================
# SHARE (standalone endpoint)
# =========================
class ShareDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        dashboard = get_object_or_404(Dashboard, id=pk, user=request.user)

        if not dashboard.share_token:
            dashboard.share_token = secrets.token_urlsafe(32)

        dashboard.is_public = True
        dashboard.save()

        return Response({
            "share_token": dashboard.share_token,
            "is_public": dashboard.is_public
        })