# Waypoint ELD — Trip & Hours-of-Service Planner

A full-stack application built for the **Spotter Full Stack Developer Assessment** that takes a trip (current location, pickup, drop-off, and hours already used in the driver's 70-hr/8-day cycle) and outputs:

1. A mapped route with stop markers (pickup, drop-off, fueling).
2. Fully-drawn **FMCSA driver's daily log sheets** — one per calendar day of the trip — with duty status plotted exactly like the paper log grid (Off Duty / Sleeper Berth / Driving / On Duty), totals, and remarks.

Built with **Django + Django REST Framework** (backend) and **React + Vite** (frontend).

---

## 📹 Video Walkthrough & Presentation

> 🎥 **[Watch the 4-Minute Loom Video Walkthrough](https://www.loom.com/share/ce597a2c9c7d4a36ba357ca97de4524c)**

[![Waypoint ELD Loom Presentation](https://cdn.loom.com/sessions/thumbnails/ce597a2c9c7d4a36ba357ca97de4524c-with-play.gif)](https://www.loom.com/share/ce597a2c9c7d4a36ba357ca97de4524c)

<div align="center" style="margin-top: 16px;">
  <iframe src="https://www.loom.com/embed/ce597a2c9c7d4a36ba357ca97de4524c" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="width: 100%; max-width: 720px; height: 405px; border-radius: 8px;"></iframe>
</div>

---

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

### Environment (.env)

- The backend loads `backend/.env` (via `python-dotenv`) for local dev. Do not commit this file.
- Important variables:
  - `SECRET_KEY` — Django secret (production: set a strong value in your host env)
  - `DEBUG` — `False` in production
  - `DATABASE_URL` — set to your Postgres URL for production (e.g. Neon)
  - `CORS_ALLOWED_ORIGINS` / `ALLOWED_HOSTS`

You can use `backend/.env` for local development and the hosting dashboard/env for production.

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

## Saved trips (history)

The backend now persists generated plans so you can review past trips from the frontend.

- Endpoint: `GET /api/trips/` — returns recent saved trips with their `segments`.
- When you POST to `POST /api/plan-trip/` the API will attempt to save the generated trip and return `saved_trip_id` in the response.
- Frontend: the app includes a "Saved Trips" panel (left under the form) that fetches `/api/trips/` and lets you load a trip into the viewer.

If you add/remove models, run:

```bash
cd backend
.venv\Scripts\Activate.ps1   # or source venv/bin/activate on mac/linux
python manage.py makemigrations
python manage.py migrate
```

## Running tests

Run the HOS engine unit tests with Django's test runner (uses your `DATABASE_URL`):

```bash
cd backend
.venv\Scripts\Activate.ps1
python manage.py test planner.tests.HosEngineTests.test_plan_trip_and_daily_totals
```

If your `DATABASE_URL` points to a shared Postgres instance (Neon), prefer running tests against SQLite locally or use `--keepdb` to avoid teardown issues.

## Notes / Production

- Django 6 requires Python 3.12+; ensure your deployment environment uses Python 3.12 or later.
- Do not use SQLite in production — set `DATABASE_URL` to a managed Postgres and run migrations on deploy.
- Add authentication before exposing saved trips publicly.
