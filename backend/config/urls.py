"""
URL configuration for analytics dashboard backend.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from api.views import (
    UserViewSet, DatasetViewSet, DashboardViewSet, 
    WidgetViewSet, APIConnectionViewSet, DashboardFilterViewSet,
    DataPreviewView, ExecuteQueryView, ExportDashboardView,
    ShareDashboardView
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'datasets', DatasetViewSet, basename='dataset')
router.register(r'dashboards', DashboardViewSet, basename='dashboard')
router.register(r'widgets', WidgetViewSet, basename='widget')
router.register(r'connections', APIConnectionViewSet, basename='connection')
router.register(r'filters', DashboardFilterViewSet, basename='filter')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/', include(router.urls)),
    path('api/datasets/<int:pk>/preview/', DataPreviewView.as_view(), name='dataset-preview'),
    path('api/execute-query/', ExecuteQueryView.as_view(), name='execute-query'),
    path('api/dashboards/<int:pk>/export/', ExportDashboardView.as_view(), name='export-dashboard'),
    path('api/dashboards/<int:pk>/share/', ShareDashboardView.as_view(), name='share-dashboard'),
]
