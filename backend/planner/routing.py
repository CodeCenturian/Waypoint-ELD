"""
Free routing + geocoding helpers.

Geocoding: OpenStreetMap Nominatim (https://nominatim.org) - free, no API key.
Routing:   OSRM public demo server (https://router.project-osrm.org) - free,
           no API key, driving profile.

"""
import time
import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OSRM_URL = "https://router.project-osrm.org/route/v1/driving"
METERS_PER_MILE = 1609.344

HEADERS = {
    "User-Agent": "WaypointELD/1.0 (ashuotshkumariiitb@gmail.com; spotter-assessment-app)",
    "Accept-Language": "en-US,en;q=0.9",
}
_last_nominatim_time = 0.0

# Continental US/Canada/Mexico bounding box for FMCSA jurisdiction validation
NA_LAT_MIN, NA_LAT_MAX = 24.0, 60.0   # ~Key West to ~northern Canada
NA_LON_MIN, NA_LON_MAX = -130.0, -60.0  # ~Pacific coast to ~Atlantic coast

# Maximum plausible one-way driving distance in miles
MAX_ROUTE_DISTANCE_MILES = 6000.0


class RoutingError(Exception):
    pass


def _is_in_north_america(lat, lon):
    """Check if coordinates fall within the continental North America bounding box."""
    return NA_LAT_MIN <= lat <= NA_LAT_MAX and NA_LON_MIN <= lon <= NA_LON_MAX


def geocode(place: str):
    """Return (lat, lon, display_name) for a free-text place string.
    Enforces a time.sleep rate limit to respect Nominatim's 1 req/sec policy.
    Validates that the result is within North America (FMCSA jurisdiction).
    """
    global _last_nominatim_time
    now = time.time()
    elapsed = now - _last_nominatim_time
    if elapsed < 1.1:
        time.sleep(1.1 - elapsed)
    _last_nominatim_time = time.time()

    try:
        resp = requests.get(
            NOMINATIM_URL,
            params={"q": place, "format": "json", "limit": 1},
            headers=HEADERS,
            timeout=10,
        )
        if resp.status_code == 403 or resp.status_code == 429:
            raise RoutingError("Geocoding service rate limit reached. Please wait 2 seconds and try again.")
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.RequestException as exc:
        raise RoutingError(f"Could not connect to geocoding service for '{place}'. Please try again shortly.") from exc

    if not data:
        raise RoutingError(f"Could not find location: '{place}'. Please check the city/state spelling.")
    top = data[0]
    lat, lon = float(top["lat"]), float(top["lon"])

    if not _is_in_north_america(lat, lon):
        raise RoutingError(
            f"'{place}' is outside the continental US/Canada/Mexico. "
            f"FMCSA HOS rules apply to North American routes only."
        )

    return lat, lon, top.get("display_name", place)


def route(coords):
    """coords: list of (lat, lon) tuples, in visit order.
    Returns dict with total distance (miles), duration (hours), per-leg
    distance/duration, and route geometry (GeoJSON LineString coords).

    Raises RoutingError if OSRM cannot compute a drivable route or if the
    returned route distance exceeds the plausible maximum for North American
    trucking (guards against OSRM silently returning absurd ferry/ocean routes).
    """
    lonlat = ";".join(f"{lon},{lat}" for lat, lon in coords)
    url = f"{OSRM_URL}/{lonlat}"
    try:
        resp = requests.get(
            url,
            params={"overview": "full", "geometries": "geojson", "steps": "false"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.exceptions.RequestException as exc:
        raise RoutingError("Routing service (OSRM) is unreachable. Please try again in a few seconds.") from exc

    if data.get("code") != "Ok" or not data.get("routes"):
        raise RoutingError("Could not compute a drivable route between the given locations.")

    r = data["routes"][0]
    total_miles = round(r["distance"] / METERS_PER_MILE, 1)

    # Sanity check: reject absurdly long routes that OSRM may return via
    # ferry networks instead of properly failing for cross-ocean pairs.
    if total_miles > MAX_ROUTE_DISTANCE_MILES:
        raise RoutingError(
            f"Route distance ({total_miles:,.0f} mi) exceeds the maximum plausible "
            f"driving distance ({MAX_ROUTE_DISTANCE_MILES:,.0f} mi). "
            f"Please ensure all locations are reachable by road within North America."
        )

    legs = [
        {
            "distance_miles": round(leg["distance"] / METERS_PER_MILE, 1),
            "duration_hours": round(leg["duration"] / 3600.0, 3),
        }
        for leg in r["legs"]
    ]
    return {
        "distance_miles": total_miles,
        "duration_hours": round(r["duration"] / 3600.0, 3),
        "legs": legs,
        "geometry": r["geometry"]["coordinates"],  # [lon, lat] pairs
    }

