"""
API views and endpoints for analytics dashboard.
"""

from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.db.models import Q
import secrets
import pandas as pd
from io import StringIO
import json

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


class UserViewSet(viewsets.ModelViewSet):
    """User management endpoints"""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see their own profile
        return User.objects.filter(id=self.request.user.id)
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        """Register new user"""
        serializer = UserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user profile"""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


class APIConnectionViewSet(viewsets.ModelViewSet):
    """API/Database connection management"""
    serializer_class = APIConnectionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return APIConnection.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """Test database/API connection"""
        connection = self.get_object()
        try:
            # Connection test logic would go here
            # For now, just mark as tested
            connection.last_tested = timezone.now()
            connection.is_active = True
            connection.save()
            return Response({'status': 'Connection successful'})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class DatasetViewSet(viewsets.ModelViewSet):
    """Dataset management"""
    serializer_class = DatasetSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Dataset.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def refresh(self, request, pk=None):
        """Refresh dataset from source"""
        dataset = self.get_object()
        try:
            if dataset.source_type == 'csv' or dataset.source_type == 'excel':
                # Load file data
                if dataset.file:
                    if dataset.source_type == 'csv':
                        df = pd.read_csv(dataset.file)
                    else:
                        df = pd.read_excel(dataset.file)
                    
                    dataset.schema = {col: str(df[col].dtype) for col in df.columns}
                    dataset.row_count = len(df)
                    dataset.cached_data = df.head(1000).to_dict('records')
            
            from django.utils import timezone
            dataset.last_refreshed = timezone.now()
            dataset.save()
            
            return Response({'status': 'Dataset refreshed', 'row_count': dataset.row_count})
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class DataPreviewView(APIView):
    """Preview dataset before adding to dashboard"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        dataset = get_object_or_404(Dataset, id=pk, user=request.user)
        return Response({
            'schema': dataset.schema,
            'sample_data': dataset.cached_data[:10],
            'row_count': dataset.row_count
        })


class ExecuteQueryView(APIView):
    """Execute queries on datasets"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            dataset_id = request.data.get('dataset_id')
            query = request.data.get('query')
            
            dataset = get_object_or_404(Dataset, id=dataset_id, user=request.user)
            
            # For CSV/Excel, use pandas
            if dataset.source_type in ['csv', 'excel']:
                if dataset.file:
                    if dataset.source_type == 'csv':
                        df = pd.read_csv(dataset.file)
                    else:
                        df = pd.read_excel(dataset.file)
                    
                    # Apply query (simplified - would need proper SQL parser)
                    results = df.to_dict('records')
                    return Response({'data': results})
            
            return Response({'error': 'Query execution not supported for this source'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class WidgetViewSet(viewsets.ModelViewSet):
    """Widget management"""
    serializer_class = WidgetSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Widget.objects.filter(dashboard__user=self.request.user)
    
    def perform_create(self, serializer):
        # Verify dashboard ownership
        dashboard = serializer.validated_data['dashboard']
        if dashboard.user != self.request.user:
            raise serializers.ValidationError("You don't have permission to add widgets to this dashboard")
        serializer.save()


class DashboardFilterViewSet(viewsets.ModelViewSet):
    """Dashboard filter management"""
    serializer_class = DashboardFilterSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return DashboardFilter.objects.filter(dashboard__user=self.request.user)
    
    def perform_create(self, serializer):
        dashboard = serializer.validated_data['dashboard']
        if dashboard.user != self.request.user:
            raise serializers.ValidationError("You don't have permission to modify this dashboard")
        serializer.save()


class DashboardViewSet(viewsets.ModelViewSet):
    """Dashboard management"""
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return DashboardDetailSerializer
        elif self.action == 'list':
            return DashboardListSerializer
        return DashboardDetailSerializer
    
    def get_queryset(self):
        return Dashboard.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def share(self, request, pk=None):
        """Generate shareable link for dashboard"""
        dashboard = self.get_object()
        if not dashboard.share_token:
            dashboard.share_token = secrets.token_urlsafe(32)
        dashboard.is_public = True
        dashboard.save()
        return Response({
            'share_token': dashboard.share_token,
            'share_url': f'/dashboard/share/{dashboard.share_token}'
        })
    
    @action(detail=True, methods=['post'])
    def export(self, request, pk=None):
        """Export dashboard as PDF or image"""
        dashboard = self.get_object()
        format_type = request.data.get('format', 'pdf')
        
        try:
            # Export logic would go here
            return Response({'status': 'Export initiated', 'format': format_type})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ExportDashboardView(APIView):
    """Export dashboard endpoint"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        dashboard = get_object_or_404(Dashboard, id=pk, user=request.user)
        format_type = request.data.get('format', 'pdf')
        
        try:
            # Export logic would go here
            return Response({
                'status': 'Export initiated',
                'dashboard': dashboard.name,
                'format': format_type
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ShareDashboardView(APIView):
    """Share dashboard endpoint"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        dashboard = get_object_or_404(Dashboard, id=pk, user=request.user)
        
        if not dashboard.share_token:
            dashboard.share_token = secrets.token_urlsafe(32)
        
        dashboard.is_public = True
        dashboard.save()
        
        return Response({
            'share_token': dashboard.share_token,
            'is_public': dashboard.is_public
        })
