"""
Database models for analytics dashboard.
"""

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import json


class Dataset(models.Model):
    """Data source for dashboards (CSV, Excel, API, SQL)"""
    SOURCE_CHOICES = [
        ('csv', 'CSV File'),
        ('excel', 'Excel File'),
        ('api', 'API Endpoint'),
        ('sql', 'SQL Database'),
        ('json', 'JSON File'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='datasets')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    
    # For file uploads (CSV, Excel, JSON)
    file = models.FileField(upload_to='datasets/', null=True, blank=True)
    
    # For API/SQL connections
    connection = models.ForeignKey('APIConnection', on_delete=models.SET_NULL, null=True, blank=True)
    query = models.TextField(blank=True, help_text='SQL query or API endpoint path')
    
    # Schema and column metadata
    schema = models.JSONField(default=dict, help_text='Column names and types')
    row_count = models.IntegerField(default=0)
    
    # Data cache
    cached_data = models.JSONField(default=list, blank=True)
    last_refreshed = models.DateTimeField(null=True, blank=True)
    refresh_interval = models.IntegerField(default=3600, help_text='Refresh interval in seconds')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class APIConnection(models.Model):
    """Credentials for connecting to external APIs or databases"""
    TYPE_CHOICES = [
        ('sql', 'SQL Database'),
        ('api', 'REST API'),
        ('graphql', 'GraphQL API'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_connections')
    name = models.CharField(max_length=255)
    connection_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    
    # Connection details (encrypted in production)
    config = models.JSONField(help_text='Connection configuration (host, port, API key, etc.)')
    
    # For testing connection
    is_active = models.BooleanField(default=True)
    last_tested = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_connection_type_display()})"


class Dashboard(models.Model):
    """User-created dashboards"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dashboards')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    
    # Layout and styling
    layout = models.JSONField(default=dict, help_text='Grid layout configuration')
    theme = models.CharField(max_length=20, default='light', choices=[('light', 'Light'), ('dark', 'Dark')])
    
    # Global filters
    filters = models.JSONField(default=list, help_text='Global dashboard filters')
    
    # Sharing
    is_public = models.BooleanField(default=False)
    share_token = models.CharField(max_length=100, unique=True, null=True, blank=True)
    
    # Auto-refresh
    auto_refresh = models.BooleanField(default=False)
    auto_refresh_interval = models.IntegerField(default=60, help_text='Seconds')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class Widget(models.Model):
    """Individual charts/visualizations within a dashboard"""
    WIDGET_TYPE_CHOICES = [
        ('bar', 'Bar Chart'),
        ('line', 'Line Chart'),
        ('pie', 'Pie Chart'),
        ('table', 'Data Table'),
        ('kpi', 'KPI Card'),
        ('metric', 'Metric Card'),
        ('heatmap', 'Heatmap'),
        ('scatter', 'Scatter Plot'),
    ]

    dashboard = models.ForeignKey(Dashboard, on_delete=models.CASCADE, related_name='widgets')
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name='widgets')
    
    name = models.CharField(max_length=255)
    widget_type = models.CharField(max_length=20, choices=WIDGET_TYPE_CHOICES)
    
    # Chart configuration
    config = models.JSONField(default=dict, help_text='Chart-specific config (axes, colors, etc.)')
    
    # Data transformation
    query = models.TextField(blank=True, help_text='SQL query or transformation')
    x_axis = models.CharField(max_length=255, blank=True)
    y_axis = models.CharField(max_length=255, blank=True)
    group_by = models.CharField(max_length=255, blank=True)
    
    # Widget-level filters
    filters = models.JSONField(default=list, blank=True)
    
    # Layout
    position_x = models.IntegerField(default=0)
    position_y = models.IntegerField(default=0)
    width = models.IntegerField(default=4)
    height = models.IntegerField(default=3)
    
    # Styling
    background_color = models.CharField(max_length=10, default='#ffffff')
    title_color = models.CharField(max_length=10, default='#000000')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['position_y', 'position_x']

    def __str__(self):
        return f"{self.name} ({self.get_widget_type_display()})"


class DashboardFilter(models.Model):
    """Global filters that can be applied across multiple widgets"""
    FILTER_TYPE_CHOICES = [
        ('text', 'Text'),
        ('number', 'Number'),
        ('date', 'Date'),
        ('select', 'Select'),
        ('multi_select', 'Multi-Select'),
    ]

    dashboard = models.ForeignKey(Dashboard, on_delete=models.CASCADE, related_name='dashboard_filters')
    name = models.CharField(max_length=255)
    filter_type = models.CharField(max_length=20, choices=FILTER_TYPE_CHOICES)
    
    # Filter definition
    column = models.CharField(max_length=255, help_text='Column to filter on')
    default_value = models.JSONField(null=True, blank=True)
    options = models.JSONField(null=True, blank=True, help_text='For select/multi_select')
    
    # Applied widgets
    applied_widgets = models.ManyToManyField(Widget, blank=True, related_name='applied_filters')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.dashboard.name} - {self.name}"


class UserPreference(models.Model):
    """User settings and preferences"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='preference')
    theme = models.CharField(max_length=20, default='light', choices=[('light', 'Light'), ('dark', 'Dark')])
    timezone = models.CharField(max_length=50, default='UTC')
    auto_logout = models.IntegerField(default=3600, help_text='Seconds of inactivity before logout')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} preferences"
