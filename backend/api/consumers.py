"""
WebSocket consumers for real-time updates.
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Dashboard, Dataset


class DashboardConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for dashboard real-time updates"""
    
    async def connect(self):
        self.dashboard_id = self.scope['url_route']['kwargs']['dashboard_id']
        self.room_group_name = f'dashboard_{self.dashboard_id}'
        
        # Verify user has access to dashboard
        dashboard = await self.get_dashboard()
        if not dashboard:
            await self.close()
            return
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'filter_update':
                # Broadcast filter updates to all clients
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'filter.update',
                        'filter': data.get('filter'),
                        'widget_id': data.get('widget_id')
                    }
                )
            elif message_type == 'data_refresh':
                # Request data refresh
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'data.refresh',
                        'widget_id': data.get('widget_id')
                    }
                )
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({'error': 'Invalid JSON'}))
    
    async def filter_update(self, event):
        """Handle filter update message"""
        await self.send(text_data=json.dumps({
            'type': 'filter_update',
            'filter': event['filter'],
            'widget_id': event['widget_id']
        }))
    
    async def data_refresh(self, event):
        """Handle data refresh message"""
        await self.send(text_data=json.dumps({
            'type': 'data_refresh',
            'widget_id': event['widget_id']
        }))
    
    @database_sync_to_async
    def get_dashboard(self):
        try:
            return Dashboard.objects.get(id=self.dashboard_id)
        except Dashboard.DoesNotExist:
            return None


class DatasetConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for dataset updates"""
    
    async def connect(self):
        self.dataset_id = self.scope['url_route']['kwargs']['dataset_id']
        self.room_group_name = f'dataset_{self.dataset_id}'
        
        # Verify dataset exists
        dataset = await self.get_dataset()
        if not dataset:
            await self.close()
            return
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Handle refresh requests"""
        try:
            data = json.loads(text_data)
            if data.get('type') == 'refresh':
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'dataset.refresh',
                    }
                )
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({'error': 'Invalid JSON'}))
    
    async def dataset_refresh(self, event):
        """Handle dataset refresh"""
        await self.send(text_data=json.dumps({
            'type': 'dataset_refresh',
            'timestamp': event.get('timestamp')
        }))
    
    @database_sync_to_async
    def get_dataset(self):
        try:
            return Dataset.objects.get(id=self.dataset_id)
        except Dataset.DoesNotExist:
            return None
