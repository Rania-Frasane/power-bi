#!/bin/bash

set -e

echo "🚀 Setting up Django Backend..."

# Create backend directory
mkdir -p backend
cd backend

# Initialize Python project with uv
echo "📦 Initializing Python project..."
uv init --bare

# Add Django and required dependencies
echo "📚 Installing dependencies..."
uv add django
uv add djangorestframework
uv add django-cors-headers
uv add python-decouple
uv add psycopg2-binary
uv add djangorestframework-simplejwt
uv add django-channels
uv add channels-redis
uv add pandas
uv add openpyxl
uv add requests
uv add pillow
uv add reportlab

# Create Django project
echo "⚙️ Creating Django project..."
uv run django-admin startproject analytics_api .

# Create main app
echo "📱 Creating main app..."
uv run python manage.py startapp api

echo "✅ Backend setup complete!"
echo ""
echo "Next steps:"
echo "1. Create environment variables (.env file)"
echo "2. Run migrations"
echo "3. Create superuser"
