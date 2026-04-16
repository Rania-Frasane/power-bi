# Complete Setup Guide for Analytics Dashboard

This guide walks you through setting up both the frontend and backend for the Analytics Dashboard application.

## Quick Start (Local Development)

### 1. Frontend Setup (Next.js)

```bash
# Install dependencies (pnpm is default)
npm install

# Create environment file
echo 'NEXT_PUBLIC_API_URL=http://localhost:8000' > .env.local

# Run development server
npm run dev
```

Frontend runs at: `http://localhost:3000`

### 2. Backend Setup (Django)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from template
cp .env.example .env

# Edit .env with your PostgreSQL credentials
nano .env  # or use your preferred editor
```

### 3. Database Setup

```bash
# Create PostgreSQL database
createdb analytics_db
# (or use pgAdmin/DBeaver if you prefer GUI)

# Run migrations
python manage.py migrate

# Create superuser (admin account)
python manage.py createsuperuser
# Follow the prompts to create admin credentials

# (Optional) Load sample data
python manage.py loaddata sample_data.json
```

### 4. Start Backend

```bash
# Still in backend directory
python manage.py runserver
```

Backend runs at: `http://localhost:8000/api/`
Django Admin at: `http://localhost:8000/admin/`

### 5. Access the Application

1. Go to `http://localhost:3000`
2. Click "Register" to create an account OR use demo credentials:
   - Username: `admin`
   - Password: `admin123`
3. You'll be redirected to your dashboards

## Detailed Setup Instructions

### Prerequisites Check

Before starting, verify you have:

```bash
# Check Node.js (v18+)
node --version

# Check npm/pnpm
npm --version

# Check Python (3.9+)
python --version

# Check PostgreSQL (12+)
psql --version

# (Optional) Check Redis (for real-time features)
redis-cli --version
```

### Frontend Configuration

#### Environment Variables

Create `.env.local` in the project root:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Optional: Analytics
NEXT_PUBLIC_GA_ID=your-google-analytics-id
```

For production, set:
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

#### Run Development Server

```bash
npm run dev
# or
pnpm dev
```

Visit `http://localhost:3000` in your browser.

#### Build for Production

```bash
npm run build
npm start
```

### Backend Configuration

#### PostgreSQL Setup

**Option A: Using Command Line**

```bash
# Connect to PostgreSQL
psql -U postgres

# In psql prompt:
CREATE DATABASE analytics_db;
CREATE USER dashboard_user WITH PASSWORD 'your_password';
ALTER ROLE dashboard_user SET client_encoding TO 'utf8';
ALTER ROLE dashboard_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE dashboard_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE analytics_db TO dashboard_user;
\q
```

**Option B: Using Docker**

```bash
# Pull and run PostgreSQL container
docker run --name postgres-analytics \
  -e POSTGRES_DB=analytics_db \
  -e POSTGRES_USER=dashboard_user \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -d postgres:15
```

#### Django Configuration

Update `backend/.env`:

```env
DEBUG=True
SECRET_KEY=your-secret-key-here

# Database
DB_NAME=analytics_db
DB_USER=dashboard_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# CORS (for frontend connection)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000

# JWT
JWT_ALGORITHM=HS256
```

#### Database Migrations

```bash
cd backend

# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create admin user
python manage.py createsuperuser
# Enter username, email, and password when prompted

# Collect static files (optional for development)
python manage.py collectstatic --noinput
```

#### Run Development Server

```bash
# With default Runserver
python manage.py runserver

# Or with Daphne (for WebSocket support)
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

Visit `http://localhost:8000/admin/` to access Django Admin.

### Redis Setup (for Real-time Features)

**Optional but Recommended** for WebSocket and caching support.

**Option A: Local Installation**

```bash
# macOS (with Homebrew)
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo service redis-server start

# Windows (via WSL or Docker recommended)
# Use Docker option below
```

**Option B: Docker**

```bash
docker run --name redis-analytics \
  -p 6379:6379 \
  -d redis:7
```

**Verify Redis is Running**

```bash
redis-cli ping
# Should respond with: PONG
```

### Testing the Full Stack

1. **Frontend Login/Register**
   - Visit `http://localhost:3000/login`
   - Use credentials: `admin` / `admin123`
   - Or register a new account

2. **Dashboard Access**
   - Should redirect to `/dashboard`
   - See "No dashboards yet" message
   - This is normal - empty slate

3. **API Testing**
   - Visit `http://localhost:8000/api/`
   - Use Django's API interface to test endpoints
   - Or use Postman/Insomnia

4. **Admin Panel**
   - Visit `http://localhost:8000/admin/`
   - Login with superuser credentials
   - View database models and data

## Common Issues & Solutions

### "Connection Refused" Error

**Problem**: Can't connect to backend API

**Solution**:
```bash
# 1. Verify backend is running on port 8000
ps aux | grep runserver  # Linux/macOS
netstat -ano | findstr :8000  # Windows

# 2. Check CORS settings in backend/.env
CORS_ALLOWED_ORIGINS=http://localhost:3000

# 3. Verify API URL in frontend .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### "Database Connection Failed"

**Problem**: Can't connect to PostgreSQL

**Solution**:
```bash
# 1. Verify PostgreSQL is running
psql -U postgres -c "SELECT 1"

# 2. Check credentials in backend/.env
DB_NAME=analytics_db
DB_USER=dashboard_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# 3. Verify database exists
psql -U postgres -l | grep analytics_db
```

### "Port Already in Use"

**Problem**: Port 3000 or 8000 is already taken

**Solution**:
```bash
# Find process using port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process (macOS/Linux)
kill -9 <PID>

# Or use different port
npm run dev -- -p 3001  # Frontend
python manage.py runserver 8001  # Backend
```

### "Module Not Found" Errors

**Solution**:
```bash
# Frontend
rm -rf node_modules package-lock.json
npm install

# Backend
pip install --upgrade pip
pip install -r requirements.txt
```

## Deployment

### Frontend Deployment (Vercel)

```bash
# Login to Vercel
npm install -g vercel
vercel login

# Deploy
vercel

# Set environment variables in Vercel dashboard
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Backend Deployment (Render/Railway)

1. **Create Account** on Render or Railway
2. **Push Code** to GitHub
3. **Connect Repository** in Render/Railway dashboard
4. **Set Environment Variables**:
   ```
   DEBUG=False
   SECRET_KEY=production-key
   DB_NAME=your_db
   DB_USER=your_user
   DB_PASSWORD=your_password
   ALLOWED_HOSTS=yourdomain.com
   CORS_ALLOWED_ORIGINS=https://yourdomain.com
   ```
5. **Configure Database** (PostgreSQL managed service)
6. **Deploy**

## Development Workflow

### Adding New Features

1. **Backend**: Create model → serializer → view → test
2. **Frontend**: Create component → integrate with API → test
3. **Database**: Run migrations after model changes
4. **Test**: Use API tester + browser DevTools

### File Structure Conventions

```
# Backend app structure
api/
├── models.py          # Database models (one per feature)
├── serializers.py     # DRF serializers
├── views.py           # ViewSets and APIViews
├── consumers.py       # WebSocket consumers (async)
└── admin.py           # Admin interface

# Frontend structure
components/
├── auth/              # Auth-related components
├── dashboard/         # Dashboard-specific components
├── ui/                # Reusable UI components (shadcn/ui)
└── common/            # Shared components (layouts, wrappers)

app/
├── (auth)/            # Route groups for logical organization
├── dashboard/         # Protected routes
└── api/               # API route handlers (if needed)
```

## Performance Optimization

### Frontend
- Enable React Compiler in `next.config.js`
- Use `Image` component for optimization
- Implement code splitting with dynamic imports
- Cache API responses with SWR

### Backend
- Use Django QuerySet select_related/prefetch_related
- Implement API pagination
- Cache with Redis
- Use database indexes on frequently queried fields

## Security Checklist

### Before Production

- [ ] Change Django `SECRET_KEY`
- [ ] Set `DEBUG=False`
- [ ] Update `ALLOWED_HOSTS`
- [ ] Configure HTTPS/SSL
- [ ] Set strong database passwords
- [ ] Enable CORS only for trusted origins
- [ ] Set secure JWT secret
- [ ] Use environment variables for all secrets
- [ ] Enable Django security middleware
- [ ] Set up CSRF protection
- [ ] Configure email for password recovery
- [ ] Implement rate limiting
- [ ] Set up logging and monitoring

## Next Steps

1. ✅ **Complete Setup** - Follow the Quick Start above
2. 📊 **Create Dashboard** - Build your first dashboard
3. 📤 **Upload Data** - Add CSV/Excel files
4. 📈 **Add Widgets** - Create visualizations
5. 🔗 **Connect Data** - Integrate with databases/APIs
6. 🚀 **Deploy** - Take it to production

## Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Recharts Documentation](https://recharts.org/)

## Support & Troubleshooting

### Check Logs

**Frontend**
```bash
# Browser console
F12 → Console tab

# Terminal output
npm run dev  # Watch for errors
```

**Backend**
```bash
# Terminal output
python manage.py runserver  # Watch for errors

# Database logs
django-extensions  # For profiling queries
```

### Common Commands

```bash
# Backend
python manage.py shell           # Python shell with Django context
python manage.py dbshell         # Database shell
python manage.py test api        # Run tests
python manage.py check           # Check for issues

# Frontend
npm run lint                      # Check code style
npm run build                     # Build for production
npm run start                     # Run production build
```

## Getting Help

1. Check logs for error messages
2. Review this guide's "Common Issues" section
3. Check project README.md
4. Review Django/Next.js documentation
5. Open an issue in the repository

Good luck! 🚀
