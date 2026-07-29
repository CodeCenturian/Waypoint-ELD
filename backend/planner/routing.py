"""
Free routing + geocoding helpers.

Geocoding: OpenStreetMap Nominatim (https://nominatim.org) - free, no API key.
Routing:   OSRM public demo server (https://router.project-osrm.org) - free,
           no API key, driving profile.

"""
import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OSRM_URL = "https://router.project-osrm.org/route/v1/driving"
METERS_PER_MILE = 1609.344

HEADERS = {"User-Agent": "eld-trip-planner/1.0"}


class RoutingError(Exception):
    pass


def geocode(place: str):
    """Return (lat, lon, display_name) for a free-text place string."""
    resp = requests.get(
        NOMINATIM_URL,
        params={"q": place, "format": "json", "limit": 1},
        headers=HEADERS,
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    if not data:
        raise RoutingError(f"Could not geocode location: '{place}'")
    top = data[0]
    return float(top["lat"]), float(top["lon"]), top.get("display_name", place)


def route(coords):
    """coords: list of (lat, lon) tuples, in visit order.
    Returns dict with total distance (miles), duration (hours), per-leg
    distance/duration, and route geometry (GeoJSON LineString coords)."""
    lonlat = ";".join(f"{lon},{lat}" for lat, lon in coords)
    url = f"{OSRM_URL}/{lonlat}"
    resp = requests.get(
        url,
        params={"overview": "full", "geometries": "geojson", "steps": "false"},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != "Ok" or not data.get("routes"):
        raise RoutingError("Could not compute a route between the given locations.")

    r = data["routes"][0]
    legs = [
        {
            "distance_miles": round(leg["distance"] / METERS_PER_MILE, 1),
            "duration_hours": round(leg["duration"] / 3600.0, 3),
        }
        for leg in r["legs"]
    ]
    return {
        "distance_miles": round(r["distance"] / METERS_PER_MILE, 1),
        "duration_hours": round(r["duration"] / 3600.0, 3),
        "legs": legs,
        "geometry": r["geometry"]["coordinates"],  # [lon, lat] pairs
    }
