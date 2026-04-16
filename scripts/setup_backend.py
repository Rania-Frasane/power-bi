#!/usr/bin/env python3
"""
Setup script for Django backend project
"""
import os
import subprocess
import sys

def run_command(cmd, description):
    """Run a shell command and print the description"""
    print(f"\n{'='*60}")
    print(f"📌 {description}")
    print(f"{'='*60}")
    try:
        result = subprocess.run(cmd, shell=True, check=True, cwd="backend")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("""
    ╔════════════════════════════════════════════════════════╗
    ║     Analytics Dashboard - Django Backend Setup         ║
    ╚════════════════════════════════════════════════════════╝
    """)
    
    # Create backend directory
    os.makedirs("backend", exist_ok=True)
    print("✅ Backend directory created")
    
    # Initialize Python project with uv
    os.chdir("backend")
    
    if not os.path.exists("pyproject.toml"):
        print("📦 Initializing Python project with uv...")
        subprocess.run(["uv", "init", "--bare"], check=True)
    
    # Add dependencies
    dependencies = [
        "django==4.2",
        "djangorestframework==3.14.0",
        "django-cors-headers==4.3.1",
        "python-decouple==3.8",
        "psycopg2-binary==2.9.9",
        "djangorestframework-simplejwt==5.3.2",
        "django-channels==4.0.0",
        "channels-redis==4.1.0",
        "pandas==2.1.3",
        "openpyxl==3.11.0",
        "requests==2.31.0",
        "pillow==10.1.0",
        "reportlab==4.0.7",
    ]
    
    print("📚 Installing dependencies...")
    for dep in dependencies:
        print(f"  → {dep}")
        subprocess.run(["uv", "add", dep], check=True)
    
    # Create Django project
    print("\n⚙️ Creating Django project...")
    subprocess.run(["uv", "run", "django-admin", "startproject", "analytics_api", "."], check=True)
    
    # Create main app
    print("📱 Creating API app...")
    subprocess.run(["uv", "run", "python", "manage.py", "startapp", "api"], check=True)
    
    print("""
    ✅ Backend setup complete!
    
    Next steps:
    1. Create a .env file with DATABASE_URL and SECRET_KEY
    2. Run migrations: uv run python manage.py migrate
    3. Create superuser: uv run python manage.py createsuperuser
    4. Start server: uv run python manage.py runserver
    """)

if __name__ == "__main__":
    main()
