"""
API views and endpoints for analytics dashboard.
"""

import secrets
import pandas as pd

from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.utils import timezone

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
            if not instance.file:
                return

            if instance.source_type == "csv":
                df = pd.read_csv(instance.file)
            elif instance.source_type == "excel":
                df = pd.read_excel(instance.file)
            elif instance.source_type == "json":
                df = pd.read_json(instance.file)
            else:
                return

            instance.schema = {col: str(df[col].dtype) for col in df.columns}
            instance.row_count = len(df)
            instance.cached_data = df.head(1000).to_dict("records")
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
                "row_count": dataset.row_count
            })

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


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
                df = (
                    pd.read_csv(dataset.file)
                    if dataset.source_type == "csv"
                    else pd.read_excel(dataset.file)
                )

                # NOTE: real query engine not implemented
                return Response({"data": df.to_dict("records")})

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