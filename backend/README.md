# Analytics Dashboard Backend

Django REST Framework API for the Power BI-like analytics dashboard application.

## Setup

### Prerequisites
- Python 3.9+
- PostgreSQL 12+
- Redis 6.0+ (for WebSocket support)

### Installation

1. **Clone and navigate to backend directory**
```bash
cd backend
```

2. **Create virtual environment** (optional but recommended)
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

5. **Initialize database**
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

6. **Run development server**
```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`

## API Endpoints

### Authentication
- `POST /api/token/` - Obtain JWT token
- `POST /api/token/refresh/` - Refresh JWT token
- `POST /api/users/register/` - Register new user

### Users
- `GET /api/users/me/` - Get current user profile
- `GET /api/users/{id}/` - Get user profile

### Datasets
- `GET /api/datasets/` - List user's datasets
- `POST /api/datasets/` - Create new dataset
- `GET /api/datasets/{id}/` - Get dataset details
- `PUT /api/datasets/{id}/` - Update dataset
- `DELETE /api/datasets/{id}/` - Delete dataset
- `POST /api/datasets/{id}/refresh/` - Refresh dataset from source
- `GET /api/datasets/{id}/preview/` - Preview dataset

### API Connections
- `GET /api/connections/` - List API/database connections
- `POST /api/connections/` - Create new connection
- `POST /api/connections/{id}/test_connection/` - Test connection

### Dashboards
- `GET /api/dashboards/` - List user's dashboards
- `POST /api/dashboards/` - Create new dashboard
- `GET /api/dashboards/{id}/` - Get dashboard with widgets
- `PUT /api/dashboards/{id}/` - Update dashboard
- `DELETE /api/dashboards/{id}/` - Delete dashboard
- `POST /api/dashboards/{id}/share/` - Generate share link
- `POST /api/dashboards/{id}/export/` - Export dashboard

### Widgets
- `GET /api/widgets/` - List widgets
- `POST /api/widgets/` - Create widget
- `PUT /api/widgets/{id}/` - Update widget
- `DELETE /api/widgets/{id}/` - Delete widget

### Filters
- `GET /api/filters/` - List dashboard filters
- `POST /api/filters/` - Create filter
- `PUT /api/filters/{id}/` - Update filter
- `DELETE /api/filters/{id}/` - Delete filter

## WebSocket Endpoints

### Dashboard Updates
- `ws://localhost:8000/ws/dashboard/{dashboard_id}/`

Real-time updates for dashboard filters and data refreshes.

### Dataset Updates
- `ws://localhost:8000/ws/dataset/{dataset_id}/`

Real-time updates for dataset refreshes.

## Database Schema

### Users
- Django built-in User model
- UserPreference (theme, timezone, auto-logout)

### Data Management
- **Dataset**: Data source (CSV, Excel, API, SQL)
- **APIConnection**: Credentials for external connections
- **DashboardFilter**: Global filters

### Dashboard Components
- **Dashboard**: User-created dashboards
- **Widget**: Individual charts/visualizations
- **DashboardFilter**: Filters applied across widgets

## Architecture

- **Framework**: Django 4.2 + Django REST Framework
- **Database**: PostgreSQL
- **Real-time**: Django Channels + Redis
- **Authentication**: JWT (djangorestframework-simplejwt)
- **Data Processing**: Pandas + openpyxl
- **API**: RESTful with JSON responses

## Development

### File Structure
```
backend/
├── config/          # Project settings
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   ├── wsgi.py
├── api/            # Main app
│   ├── models.py   # Database models
│   ├── views.py    # API views
│   ├── serializers.py
│   ├── consumers.py # WebSocket consumers
│   ├── routing.py  # WebSocket routing
├── manage.py
└── requirements.txt
```

### Adding New Endpoints

1. Add model in `api/models.py`
2. Create serializer in `api/serializers.py`
3. Create ViewSet in `api/views.py`
4. Register in `config/urls.py`
5. Add to admin in `api/admin.py`

## Testing

```bash
python manage.py test api
```

## Deployment

For production deployment:

1. Set `DEBUG=False` in `.env`
2. Update `ALLOWED_HOSTS` with your domain
3. Use a production-grade server (Gunicorn + Daphne)
4. Set up SSL/TLS certificates
5. Configure CORS with specific origins
6. Use environment variables for all secrets
