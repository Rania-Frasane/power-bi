"""
Django admin configuration for API models.
"""

from django.contrib import admin
from .models import Dataset, APIConnection, Dashboard, Widget, DashboardFilter, UserPreference


@admin.register(Dataset)
class DatasetAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'source_type', 'row_count', 'created_at']
    list_filter = ['source_type', 'created_at']
    search_fields = ['name', 'user__username']


@admin.register(APIConnection)
class APIConnectionAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'connection_type', 'is_active', 'created_at']
    list_filter = ['connection_type', 'is_active']
    search_fields = ['name', 'user__username']


@admin.register(Dashboard)
class DashboardAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'is_public', 'created_at']
    list_filter = ['is_public', 'created_at']
    search_fields = ['name', 'user__username']


@admin.register(Widget)
class WidgetAdmin(admin.ModelAdmin):
    list_display = ['name', 'dashboard', 'widget_type', 'dataset', 'created_at']
    list_filter = ['widget_type', 'created_at']
    search_fields = ['name', 'dashboard__name']


@admin.register(DashboardFilter)
class DashboardFilterAdmin(admin.ModelAdmin):
    list_display = ['name', 'dashboard', 'filter_type', 'created_at']
    list_filter = ['filter_type', 'created_at']
    search_fields = ['name', 'dashboard__name']


@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = ['user', 'theme', 'timezone']
    list_filter = ['theme']
    search_fields = ['user__username']
