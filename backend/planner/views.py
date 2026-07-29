from datetime import datetime

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .routing import geocode, route, RoutingError
from .hos_engine import plan_trip, segments_to_daily_logs


@api_view(["POST"])
def plan_trip_view(request):
    data = request.data

    current_location = (data.get("current_location") or "").strip()
    pickup_location = (data.get("pickup_location") or "").strip()
    dropoff_location = (data.get("dropoff_location") or "").strip()
    cycle_used = data.get("current_cycle_used")

    if not all([current_location, pickup_location, dropoff_location]):
        return Response(
            {"error": "current_location, pickup_location, and dropoff_location are all required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        cycle_used = float(cycle_used)
    except (TypeError, ValueError):
        return Response(
            {"error": "current_cycle_used must be a number of hours."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if cycle_used < 0 or cycle_used > 70:
        return Response(
            {"error": "current_cycle_used must be between 0 and 70 hours."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        cur_lat, cur_lon, cur_name = geocode(current_location)
        pick_lat, pick_lon, pick_name = geocode(pickup_location)
        drop_lat, drop_lon, drop_name = geocode(dropoff_location)

        route_data = route([
            (cur_lat, cur_lon),
            (pick_lat, pick_lon),
            (drop_lat, drop_lon),
        ])
    except RoutingError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        return Response(
            {"error": "The routing service is temporarily unavailable. Please try again shortly."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    leg1, leg2 = route_data["legs"][0], route_data["legs"][1]

    trip_start = datetime.now().replace(minute=0, second=0, microsecond=0)

    plan = plan_trip(
        start_time=trip_start,
        cycle_used_hours=cycle_used,
        current_label=cur_name.split(",")[0],
        pickup_label=pick_name.split(",")[0],
        dropoff_label=drop_name.split(",")[0],
        leg1_miles=leg1["distance_miles"],
        leg1_hours=leg1["duration_hours"],
        leg2_miles=leg2["distance_miles"],
        leg2_hours=leg2["duration_hours"],
    )

    daily_logs = segments_to_daily_logs(plan["segments"])

    response = {
        "locations": {
            "current": {"name": cur_name, "lat": cur_lat, "lon": cur_lon},
            "pickup": {"name": pick_name, "lat": pick_lat, "lon": pick_lon},
            "dropoff": {"name": drop_name, "lat": drop_lat, "lon": drop_lon},
        },
        "route": {
            "geometry": route_data["geometry"],
            "total_distance_miles": route_data["distance_miles"],
            "total_drive_duration_hours": route_data["duration_hours"],
            "legs": [
                {"from": "Current Location", "to": "Pickup", **leg1},
                {"from": "Pickup", "to": "Drop-off", **leg2},
            ],
        },
        "trip_summary": {
            "start_time": trip_start.isoformat(),
            "end_time": plan["end_time"].isoformat(),
            "total_days": len(daily_logs),
            "total_driving_hours": plan["total_driving_hours"],
            "total_on_duty_hours": plan["total_on_duty_hours"],
            "total_off_duty_hours": plan["total_off_duty_hours"],
            "total_miles": plan["total_miles"],
            "cycle_hours_used_at_end": plan["final_cycle_hours"],
        },
        "daily_logs": daily_logs,
    }
    return Response(response)
