# Waypoint ELD — Trip & Hours-of-Service Planner

A full-stack app that takes a trip (current location, pickup, drop-off, and
hours already used in the driver's 70-hr/8-day cycle) and returns:

1. A mapped route with stop markers (pickup, drop-off, fueling).
2. Fully-drawn **FMCSA driver's daily log sheets** — one per calendar day of
   the trip — with duty status plotted exactly like the paper log grid
   (Off Duty / Sleeper Berth / Driving / On Duty), totals, and remarks.

Built with **Django + Django REST Framework** (backend) and **React + Vite**
(frontend).

## Assumptions (per assessment brief)

- Property-carrying driver, **70-hr / 8-day** cycle (carrier operates every day).
- No adverse driving conditions exception applied.
- Fueling stop (30 min, on-duty-not-driving) at least every 1,000 miles.
- 1 hour on-duty (not driving) at pickup, and 1 hour at drop-off.
- Standard HOS limits: 11-hr driving / 14-hr on-duty window / 30-min break
  after 8 cumulative driving hours / 10 consecutive hours off resets the
  daily clocks / 34 consecutive hours off resets the 70-hr cycle.

## Architecture

```
backend/   Django + DRF API
  planner/hos_engine.py   -> core HOS simulation (pure Python, unit-testable)
  planner/routing.py      -> free geocoding (Nominatim) + routing (OSRM)
  planner/views.py        -> POST /api/plan-trip/

frontend/  React (Vite)
  src/components/TripForm.jsx    -> trip input form
  src/components/MapView.jsx     -> Leaflet route map
  src/components/LogSheet.jsx    -> SVG-drawn daily log grid (signature UI)
  src/components/TripSummary.jsx -> trip totals strip
```

### Why these free APIs

- **Geocoding:** OpenStreetMap Nominatim — free, no API key.
- **Routing:** OSRM public demo server — free, no API key, driving profile,
  returns full route geometry for the map plus per-leg distance/duration.

Both are public demo/dev services (rate-limited), which is the right choice
for a take-home assessment. For production you'd drop in a paid provider
(Mapbox, ORS with a key, Google) behind the same `routing.py` interface.

## Local development

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

API is now at `http://127.0.0.1:8000/api/plan-trip/`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # set VITE_API_BASE_URL if backend isn't local
npm run dev
```

App is now at `http://127.0.0.1:5173`.

## Deployment

### Backend → Render (free tier)

1. Push this repo to GitHub.
2. On [render.com](https://render.com), New → Blueprint → point at the repo
   (it will read `backend/render.yaml`), **or** New → Web Service manually with:
   - Root directory: `backend`
   - Build command: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
   - Start command: `python manage.py migrate --noinput && gunicorn eldproject.wsgi:application --bind 0.0.0.0:$PORT`
   - Env vars: `DEBUG=False`, `ALLOWED_HOSTS=*`, `CORS_ALLOW_ALL_ORIGINS=True` (or lock to your Vercel domain), `SECRET_KEY=<generate one>`
3. Note the deployed URL, e.g. `https://eld-trip-planner-api.onrender.com`.

*(Railway works identically — same `Procfile`/start command.)*

### Frontend → Vercel

1. Import the repo in Vercel, set **root directory** to `frontend`.
2. Framework preset: Vite.
3. Add environment variable: `VITE_API_BASE_URL=https://<your-render-url>`.
4. Deploy.

Once both are live, tighten `CORS_ALLOWED_ORIGINS` on the backend to your
exact Vercel domain instead of allowing all origins.

## Testing the HOS engine without network access

`planner/hos_engine.py` has no external dependencies, so it's easy to sanity
check in isolation:

```bash
cd backend && source venv/bin/activate
python -c "
from datetime import datetime
from planner.hos_engine import plan_trip, segments_to_daily_logs
plan = plan_trip(
    start_time=datetime(2026,7,29,6,0), cycle_used_hours=10.0,
    current_label='Chicago, IL', pickup_label='Dallas, TX', dropoff_label='Miami, FL',
    leg1_miles=925, leg1_hours=14.5, leg2_miles=1310, leg2_hours=19.5,
)
for d in segments_to_daily_logs(plan['segments']):
    print(d['date'], d['totals'])
"
```
