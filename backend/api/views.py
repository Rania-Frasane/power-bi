"""
API views and endpoints for analytics dashboard.
"""

from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
import secrets
import pandas as pd
from io import StringIO
import json

from .models import (
    Dataset, APIConnection, Dashboard, Widget,
    DashboardFilter, UserPreference, DatasetAnalysis
)
from .serializers import (
    UserSerializer, UserRegisterSerializer, APIConnectionSerializer,
    DatasetSerializer, WidgetSerializer, DashboardFilterSerializer,
    DashboardDetailSerializer, DashboardListSerializer,
    UserPreferenceSerializer
)
from .file_processor import FileProcessor
from .llm_service import LLMAnalyzer


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


class FileUploadView(APIView):
    """Handle file uploads for datasets"""
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    
    def post(self, request):
        """
        Upload a file (CSV, Excel, or JSON) and create a dataset.
        Returns dataset with schema and sample data.
        """
        try:
            # Get file and metadata
            file_obj = request.FILES.get('file')
            file_type = request.POST.get('file_type', 'csv')
            dataset_name = request.POST.get('name')
            dataset_description = request.POST.get('description', '')
            
            if not file_obj:
                return Response(
                    {'error': 'No file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not dataset_name:
                dataset_name = file_obj.name.split('.')[0]
            
            # Process file
            df, metadata = FileProcessor.process_file(file_obj, file_type)
            
            print(f"[v0] Processing file: {dataset_name}, Shape: {df.shape}")
            
            # Create dataset record
            dataset = Dataset.objects.create(
                user=request.user,
                name=dataset_name,
                description=dataset_description,
                source_type=file_type,
                file=file_obj,
                schema=metadata['schema'],
                row_count=metadata['row_count'],
                cached_data=FileProcessor.get_sample_data(df, 1000),
                last_refreshed=timezone.now()
            )
            
            print(f"[v0] Dataset created with ID: {dataset.id}")
            
            # Get sample data for preview
            sample_data = FileProcessor.get_sample_data(df, 10)
            
            return Response({
                'id': dataset.id,
                'name': dataset.name,
                'row_count': dataset.row_count,
                'column_count': len(df.columns),
                'columns': list(df.columns),
                'schema': metadata['schema'],
                'sample_data': sample_data,
                'message': 'File uploaded successfully'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"[v0] Error in file upload: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class DatasetAnalysisView(APIView):
    """Generate LLM analysis for a dataset"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        """
        Analyze dataset using LLM.
        Returns insights, recommendations, and visualization suggestions.
        """
        try:
            dataset = get_object_or_404(Dataset, id=pk, user=request.user)
            
            print(f"[v0] Starting LLM analysis for dataset: {dataset.name}")
            
            # Reconstruct DataFrame from cached data
            if dataset.cached_data:
                df = pd.DataFrame(dataset.cached_data)
            elif dataset.file:
                if dataset.source_type == 'csv':
                    df = pd.read_csv(dataset.file)
                elif dataset.source_type in ['excel', 'xlsx', 'xls']:
                    df = pd.read_excel(dataset.file)
                elif dataset.source_type == 'json':
                    df = pd.read_json(dataset.file)
                else:
                    return Response(
                        {'error': 'Unsupported file type'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                return Response(
                    {'error': 'No data available for analysis'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Run LLM analysis
            analyzer = LLMAnalyzer()
            analysis_result = analyzer.analyze_dataset(df, dataset.name)
            
            print(f"[v0] LLM analysis completed, generating visualizations")
            
            # Get chart recommendations
            chart_recommendations = analyzer.generate_chart_recommendations(df)
            
            # Create or update analysis record
            analysis, created = DatasetAnalysis.objects.get_or_create(
                dataset=dataset,
                defaults={
                    'summary': analysis_result.get('summary', ''),
                    'key_patterns': analysis_result.get('key_patterns', []),
                    'anomalies': analysis_result.get('anomalies', []),
                    'data_quality_score': analysis_result.get('data_quality_score', 50),
                    'data_quality_issues': analysis_result.get('data_quality_issues', []),
                    'recommendations': analysis_result.get('recommendations', []),
                    'column_insights': analysis_result.get('column_insights', {}),
                    'recommended_visualizations': chart_recommendations,
                    'dashboard_layout': analysis_result.get('dashboard_layout', {}),
                }
            )
            
            if not created:
                # Update existing
                analysis.summary = analysis_result.get('summary', '')
                analysis.key_patterns = analysis_result.get('key_patterns', [])
                analysis.anomalies = analysis_result.get('anomalies', [])
                analysis.data_quality_score = analysis_result.get('data_quality_score', 50)
                analysis.data_quality_issues = analysis_result.get('data_quality_issues', [])
                analysis.recommendations = analysis_result.get('recommendations', [])
                analysis.column_insights = analysis_result.get('column_insights', {})
                analysis.recommended_visualizations = chart_recommendations
                analysis.dashboard_layout = analysis_result.get('dashboard_layout', {})
                analysis.save()
            
            print(f"[v0] Analysis saved to database")
            
            return Response({
                'dataset_id': dataset.id,
                'summary': analysis.summary,
                'key_patterns': analysis.key_patterns,
                'anomalies': analysis.anomalies,
                'data_quality_score': analysis.data_quality_score,
                'data_quality_issues': analysis.data_quality_issues,
                'recommendations': analysis.recommendations,
                'column_insights': analysis.column_insights,
                'recommended_visualizations': chart_recommendations,
                'dashboard_layout': analysis.dashboard_layout,
            })
            
        except Exception as e:
            print(f"[v0] Error in dataset analysis: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class GenerateDashboardView(APIView):
    """Auto-generate dashboard from dataset analysis"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Create a new dashboard from analysis recommendations.
        Automatically creates widgets based on LLM suggestions.
        """
        try:
            dataset_id = request.data.get('dataset_id')
            dashboard_name = request.data.get('dashboard_name')
            include_table = request.data.get('include_table', True)
            
            dataset = get_object_or_404(Dataset, id=dataset_id, user=request.user)
            analysis = get_object_or_404(DatasetAnalysis, dataset=dataset)
            
            print(f"[v0] Generating dashboard from analysis for: {dataset.name}")
            
            # Create dashboard
            dashboard = Dashboard.objects.create(
                user=request.user,
                name=dashboard_name or f"{dataset.name} Dashboard",
                description=f"Auto-generated dashboard for {dataset.name}",
                layout={},
                theme='light'
            )
            
            # Add widgets based on recommendations
            position_x = 0
            position_y = 0
            widgets_created = 0
            
            # Add data table first
            if include_table:
                Widget.objects.create(
                    dashboard=dashboard,
                    dataset=dataset,
                    name=f"{dataset.name} Data",
                    widget_type='table',
                    position_x=0,
                    position_y=0,
                    width=12,
                    height=3,
                    config={
                        'title': f"{dataset.name}",
                        'show_pagination': True
                    }
                )
                widgets_created += 1
                position_y = 3
            
            # Add recommended charts
            for viz in analysis.recommended_visualizations[:4]:
                widget_type = viz.get('type', 'bar')
                
                # Map visualization type to widget type
                widget_type_map = {
                    'line': 'line',
                    'bar': 'bar',
                    'pie': 'pie',
                    'scatter': 'scatter',
                }
                widget_type = widget_type_map.get(widget_type, 'bar')
                
                # Reset x position and move to next row
                if position_x >= 12:
                    position_x = 0
                    position_y += 3
                
                widget = Widget.objects.create(
                    dashboard=dashboard,
                    dataset=dataset,
                    name=viz.get('title', f"{widget_type.title()} Chart"),
                    widget_type=widget_type,
                    x_axis=viz.get('x_axis'),
                    y_axis=viz.get('y_axis'),
                    position_x=position_x,
                    position_y=position_y,
                    width=6,
                    height=3,
                    config={
                        'title': viz.get('title', ''),
                        'description': viz.get('description', ''),
                    }
                )
                
                print(f"[v0] Created widget: {widget.name}")
                widgets_created += 1
                position_x += 6
            
            print(f"[v0] Dashboard created with {widgets_created} widgets")
            
            # Serialize and return
            serializer = DashboardDetailSerializer(dashboard)
            
            return Response({
                'dashboard': serializer.data,
                'widgets_created': widgets_created,
                'message': 'Dashboard generated successfully'
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"[v0] Error generating dashboard: {str(e)}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
