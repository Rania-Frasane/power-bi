"""
Initialize Django database with migrations.
"""

import os
import sys
import django
from pathlib import Path

# Setup Django
sys.path.insert(0, str(Path(__file__).parent.parent / 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

try:
    django.setup()
except Exception as e:
    print(f"[v0] Error setting up Django: {e}")
    sys.exit(1)

from django.core.management import call_command
from django.contrib.auth.models import User
from api.models import UserPreference

print("\n╔════════════════════════════════════════════════════╗")
print("║     Analytics Dashboard - Database Initialization  ║")
print("╚════════════════════════════════════════════════════╝\n")

try:
    print("📊 Running migrations...")
    call_command('makemigrations', 'api', verbosity=1)
    call_command('migrate', verbosity=1)
    print("✅ Migrations completed\n")
    
    # Create superuser if it doesn't exist
    if not User.objects.filter(username='admin').exists():
        print("👤 Creating admin superuser...")
        admin_user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='admin123'
        )
        UserPreference.objects.create(user=admin_user)
        print("✅ Admin user created (username: admin, password: admin123)\n")
    else:
        print("✅ Admin user already exists\n")
    
    print("🎉 Database initialization complete!")
    print("\nYou can now:")
    print("  1. Run the development server: python backend/manage.py runserver")
    print("  2. Access the API at: http://localhost:8000/api/")
    print("  3. Access Django admin at: http://localhost:8000/admin/\n")

except Exception as e:
    print(f"❌ Error during initialization: {e}")
    sys.exit(1)
