# NBLEsport — Full Stack Project

Django backend + React frontend in a single repo, single server.

## Project Structure

```
nblesport/
├── config/          Django project settings & URLs
├── apps/
│   ├── joins/       Join requests (public submit + staff review)
│   ├── matches/     Match schedule
│   ├── news/        News & posts
│   ├── players/     Player roster
│   └── teams/       Teams
└── frontend/        React + Vite + Tailwind
    └── src/
        ├── pages/
        │   ├── Landing.tsx    Public landing page (/)
        │   ├── Login.tsx      Staff login (/login)
        │   └── Dashboard.tsx  Staff dashboard (/dashboard)
        └── utils/
            └── api.ts         Central API client
```

## API Endpoints

| Method | URL | Access | Description |
|--------|-----|--------|-------------|
| POST | `/api/auth/login/` | Public | Staff login |
| POST | `/api/auth/logout/` | Auth | Logout |
| GET | `/api/auth/me/` | Any | Check session |
| POST | `/api/joins/` | Public | Submit join request |
| GET | `/api/joins/list/` | Staff | List join requests |
| PATCH | `/api/joins/<id>/` | Staff | Update join status |
| GET | `/api/matches/` | Public | List matches |
| POST | `/api/matches/create/` | Staff | Create match |
| PATCH | `/api/matches/<id>/` | Staff | Update match |
| DELETE | `/api/matches/<id>/delete/` | Staff | Delete match |
| GET | `/api/news/` | Public | Published news |
| GET | `/api/news/all/` | Staff | All news inc. drafts |
| POST | `/api/news/create/` | Staff | Create post |
| PATCH | `/api/news/<id>/` | Staff | Update post |
| DELETE | `/api/news/<id>/delete/` | Staff | Delete post |
| GET | `/api/players/` | Public | Active players |
| GET | `/api/players/all/` | Staff | All players |
| POST | `/api/players/create/` | Staff | Add player |
| PATCH | `/api/players/<id>/` | Staff | Update player |
| DELETE | `/api/players/<id>/delete/` | Staff | Remove player |
| GET | `/api/teams/` | Public | Active teams |
| GET | `/api/teams/all/` | Staff | All teams |
| POST | `/api/teams/create/` | Staff | Create team |
| PATCH | `/api/teams/<id>/` | Staff | Update team |
| DELETE | `/api/teams/<id>/delete/` | Staff | Delete team |

## Setup

### 1. Backend

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env .env.local
# Edit .env and set a real SECRET_KEY

# Run migrations
python manage.py migrate

# Create a staff user (for dashboard access)
python manage.py createsuperuser

# Mark that user as staff in the admin or shell:
# python manage.py shell
# >>> from django.contrib.auth.models import User
# >>> u = User.objects.get(username='yourusername')
# >>> u.is_staff = True; u.save()

# Start Django
python manage.py runserver
```

### 2. Frontend (development)

```bash
cd frontend
npm install
npm run dev        # Vite dev server on :5173
                   # Proxies /api/* to Django on :8000
```

Visit `http://localhost:5173` — the React app runs with hot reload.
Django handles all API calls, React handles all UI.

### 3. Production build

```bash
cd frontend
npm run build      # outputs to frontend/dist/

# Back in project root:
python manage.py collectstatic --noinput
python manage.py runserver     # or gunicorn config.wsgi
```

Django now serves `frontend/dist/index.html` as the app shell and
all static assets via WhiteNoise.

## PythonAnywhere Deployment

1. Upload the project (excluding `node_modules` and `venv`)
2. Create a virtualenv and `pip install -r requirements.txt`
3. Run `npm run build` in `frontend/` (or build locally and upload `dist/`)
4. Set `DEBUG=False` and your real `ALLOWED_HOSTS` in `.env`
5. Run `python manage.py collectstatic`
6. Point your PythonAnywhere WSGI file to `config.wsgi`
7. Set the static files path: URL `/static/` → `staticfiles/`

## Dashboard Access

Go to `/login` — sign in with a staff account — lands on `/dashboard`.
The dashboard has sections for: Overview, Join Requests, Matches, News, Players, Teams.
