"""
DRF serializers for API endpoints.
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Dataset, APIConnection, Dashboard, Widget, 
    DashboardFilter, UserPreference
)


class UserSerializer(serializers.ModelSerializer):
    """User profile serializer"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class UserRegisterSerializer(serializers.ModelSerializer):
    """User registration serializer"""
    password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name']
    
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email'),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        UserPreference.objects.create(user=user)
        return user


class APIConnectionSerializer(serializers.ModelSerializer):
    """API/Database connection serializer"""
    class Meta:
        model = APIConnection
        fields = ['id', 'name', 'connection_type', 'config', 'is_active', 'last_tested', 'created_at']
        read_only_fields = ['id', 'last_tested', 'created_at']


class DatasetSerializer(serializers.ModelSerializer):
    """Dataset serializer"""
    class Meta:
        model = Dataset
        fields = [
            'id', 'name', 'description', 'source_type', 'file',
            'connection', 'query', 'schema', 'row_count',
            'last_refreshed', 'refresh_interval', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'schema', 'row_count', 'last_refreshed', 'created_at', 'updated_at']


class WidgetSerializer(serializers.ModelSerializer):
    """Widget serializer"""
    class Meta:
        model = Widget
        fields = [
            'id', 'dashboard', 'dataset', 'name', 'widget_type',
            'config', 'query', 'x_axis', 'y_axis', 'group_by',
            'filters', 'position_x', 'position_y', 'width', 'height',
            'background_color', 'title_color', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DashboardFilterSerializer(serializers.ModelSerializer):
    """Dashboard filter serializer"""
    class Meta:
        model = DashboardFilter
        fields = [
            'id', 'dashboard', 'name', 'filter_type', 'column',
            'default_value', 'options', 'applied_widgets', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class DashboardDetailSerializer(serializers.ModelSerializer):
    """Dashboard with nested widgets and filters"""
    widgets = WidgetSerializer(many=True, read_only=True)
    dashboard_filters = DashboardFilterSerializer(many=True, read_only=True)
    
    class Meta:
        model = Dashboard
        fields = [
            'id', 'name', 'description', 'layout', 'theme', 'filters',
            'is_public', 'share_token', 'auto_refresh', 'auto_refresh_interval',
            'widgets', 'dashboard_filters', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'share_token', 'created_at', 'updated_at']


class DashboardListSerializer(serializers.ModelSerializer):
    """Simplified dashboard serializer for list views"""
    widget_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Dashboard
        fields = [
            'id', 'name', 'description', 'theme', 'is_public',
            'auto_refresh', 'widget_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_widget_count(self, obj):
        return obj.widgets.count()


class UserPreferenceSerializer(serializers.ModelSerializer):
    """User preferences serializer"""
    class Meta:
        model = UserPreference
        fields = ['theme', 'timezone', 'auto_logout', 'updated_at']
        read_only_fields = ['updated_at']
