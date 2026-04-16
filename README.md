# Analytics Dashboard - Power BI-like Application

A full-stack analytics dashboard application that allows users to create powerful visualizations from multiple data sources (CSV, Excel, APIs, SQL databases). Built with Next.js 16 (React 19) frontend and Django REST Framework backend.

## Features

### Core Features
- **User Authentication**: Secure JWT-based authentication and user management
- **Dashboard Builder**: Drag-and-drop interface for creating custom dashboards
- **Multiple Data Sources**: 
  - CSV and Excel file uploads
  - REST API connections
  - SQL database connections (PostgreSQL, MySQL, etc.)
  - JSON data imports
- **Rich Visualizations**:
  - Bar charts, line charts, pie charts
  - Data tables with sorting and filtering
  - KPI cards and metric visualizations
  - Heatmaps and scatter plots
- **Global Filtering**: Cross-widget filtering for comprehensive data exploration
- **Real-time Updates**: WebSocket support for live data refreshes
- **Sharing & Export**: 
  - Generate shareable links for dashboards
  - Export dashboards as PDF or images
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

## Architecture

### Frontend (Next.js)
- **Framework**: Next.js 16 with React 19
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **State Management**: React Context API with useAuth hook
- **Charts**: Recharts for data visualization
- **UI Components**: shadcn/ui with Radix UI primitives

### Backend (Django)
- **Framework**: Django 4.2 + Django REST Framework
- **Database**: PostgreSQL
- **Real-time**: Django Channels with Redis for WebSocket support
- **Authentication**: djangorestframework-simplejwt (JWT)
- **Data Processing**: Pandas for CSV/Excel operations

## Project Structure

```
analytics-dashboard/
├── app/                          # Next.js app directory
│   ├── login/                    # Authentication pages
│   ├── register/
│   ├── dashboard/                # Protected dashboard routes
│   │   ├── page.tsx             # Dashboard list
│   │   ├── [id]/                # Dashboard viewer/editor
│   │   ├── create/              # Dashboard creation
│   │   ├── datasets/            # Dataset management
│   │   ├── connections/         # Connection management
│   │   └── settings/            # User settings
│   ├── layout.tsx               # Root layout with AuthProvider
│   ├── page.tsx                 # Home (redirects to dashboard)
│   └── globals.css              # Tailwind styles
├── components/
│   ├── auth/                    # Auth form components
│   ├── dashboard/               # Dashboard UI components
│   │   ├── header.tsx
│   │   ├── sidebar.tsx
│   │   ├── builder/            # Dashboard builder components
│   │   └── viewer/             # Dashboard viewer components
│   └── ui/                      # shadcn/ui components
├── lib/
│   ├── auth-context.tsx        # Auth state management
│   ├── api.ts                  # API utility functions
│   └── utils.ts                # Helper utilities
├── backend/                     # Django REST backend
│   ├── config/                 # Django settings
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py            # WebSocket support
│   │   └── wsgi.py
│   ├── api/                    # Main app
│   │   ├── models.py          # Database models
│   │   ├── views.py           # API views
│   │   ├── serializers.py     # DRF serializers
│   │   ├── consumers.py       # WebSocket consumers
│   │   ├── routing.py         # WebSocket routing
│   │   └── admin.py           # Django admin
│   ├── manage.py              # Django CLI
│   ├── pyproject.toml         # Dependencies
│   └── README.md              # Backend documentation
└── scripts/                     # Setup and migration scripts
    └── init_database.py        # Database initialization
```

## Getting Started

### Prerequisites
- Node.js 18+ (for frontend)
- Python 3.9+ (for backend)
- PostgreSQL 12+ (database)
- Redis 6.0+ (for real-time features)

### Frontend Setup

1. **Install dependencies**
```bash
npm install
```

2. **Configure API endpoint**
Edit `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. **Run development server**
```bash
npm run dev
```

Access at `http://localhost:3000`

### Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Create virtual environment** (recommended)
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```
Or using Python UV:
```bash
uv sync
```

4. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your database credentials
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

Access API at `http://localhost:8000/api/`

### Demo Credentials

After initialization, use these credentials:
- **Username**: admin
- **Password**: admin123

## Database Schema

### Users & Authentication
- **User**: Django's built-in user model
- **UserPreference**: User settings (theme, timezone, etc.)

### Data Management
- **Dataset**: Data sources (CSV, Excel, API, SQL)
- **APIConnection**: External service credentials
- **DashboardFilter**: Global dashboard filters

### Dashboard Components
- **Dashboard**: User-created dashboards
- **Widget**: Individual charts/visualizations
- **DashboardFilter**: Filter configurations

## API Endpoints

### Authentication
- `POST /api/token/` - Get JWT token
- `POST /api/token/refresh/` - Refresh token
- `POST /api/users/register/` - User registration

### Dashboards
- `GET /api/dashboards/` - List dashboards
- `POST /api/dashboards/` - Create dashboard
- `GET /api/dashboards/{id}/` - Get dashboard details
- `PUT /api/dashboards/{id}/` - Update dashboard
- `DELETE /api/dashboards/{id}/` - Delete dashboard
- `POST /api/dashboards/{id}/share/` - Generate share link
- `POST /api/dashboards/{id}/export/` - Export dashboard

### Datasets
- `GET /api/datasets/` - List datasets
- `POST /api/datasets/` - Upload dataset
- `GET /api/datasets/{id}/preview/` - Preview data
- `POST /api/datasets/{id}/refresh/` - Refresh from source

### Widgets
- `GET /api/widgets/` - List widgets
- `POST /api/widgets/` - Create widget
- `PUT /api/widgets/{id}/` - Update widget
- `DELETE /api/widgets/{id}/` - Delete widget

### Connections
- `GET /api/connections/` - List connections
- `POST /api/connections/` - Create connection
- `POST /api/connections/{id}/test_connection/` - Test connection

## WebSocket Events

### Dashboard Updates
**Endpoint**: `ws://localhost:8000/ws/dashboard/{dashboard_id}/`

Events:
- `filter_update`: Global filter changed
- `data_refresh`: Data refresh requested
- `widget_update`: Widget configuration changed

### Dataset Updates
**Endpoint**: `ws://localhost:8000/ws/dataset/{dataset_id}/`

Events:
- `dataset_refresh`: Dataset refreshed from source

## Development Roadmap

### Phase 1: Backend Foundation ✓
- Django setup with PostgreSQL
- User authentication (JWT)
- Core database models
- REST API endpoints

### Phase 2: Data Processing ✓
- CSV/Excel file uploads
- API connection support
- SQL query execution
- Data caching and refresh

### Phase 3: Frontend Auth ✓
- Login/register pages
- Auth context management
- Protected routes
- User dashboard

### Phase 4: Dashboard Builder
- Drag-and-drop interface
- Widget configuration
- Layout management
- Widget positioning

### Phase 5: Dashboard Viewer
- Dashboard rendering
- Filter application
- Cross-filtering
- Widget data binding

### Phase 6: Export & Sharing
- PDF export
- Image export
- Share link generation
- Public dashboard views

### Phase 7: Real-time Features
- WebSocket integration
- Live data updates
- Auto-refresh functionality

### Phase 8: Polish & Docs
- Sample dashboard
- Documentation
- Performance optimization
- Error handling

## Deployment

### Frontend (Vercel)
```bash
npm run build
vercel deploy
```

### Backend (Render, Railway, or Heroku)
Set environment variables and deploy with:
```
DEBUG=False
SECRET_KEY=your-production-key
ALLOWED_HOSTS=yourdomain.com
```

## Contributing

Guidelines for contributing:
1. Create feature branches from `main`
2. Follow the existing code style
3. Include tests for new functionality
4. Submit pull requests with clear descriptions

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or suggestions:
1. Check existing GitHub issues
2. Review the documentation in `/backend/README.md`
3. Open a new issue with detailed information

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check `.env` credentials match your setup
- Run migrations: `python manage.py migrate`

### API Connection Issues
- Verify backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Check CORS settings in Django

### WebSocket Issues
- Ensure Redis is running (for production)
- Check Django Channels installation
- Verify WebSocket routes in `api/routing.py`

## Performance Tips

1. **Frontend**: Enable React Compiler in next.config.js
2. **Backend**: Use database connection pooling
3. **Caching**: Leverage Redis for frequently accessed data
4. **Charts**: Virtualize large datasets in tables
5. **Images**: Optimize exported images

## Technologies Used

### Frontend
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- Recharts
- shadcn/ui
- Radix UI

### Backend
- Django 4.2
- Django REST Framework
- PostgreSQL
- Django Channels
- Redis
- Pandas

### DevOps
- Docker
- Vercel (frontend)
- Render/Railway/Heroku (backend)
- GitHub Actions (CI/CD)
