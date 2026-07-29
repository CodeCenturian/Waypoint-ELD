from datetime import datetime

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from .routing import geocode, route, RoutingError
from .hos_engine import plan_trip, segments_to_daily_logs
from .models import Trip, Segment
from .serializers import TripSerializer


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
    except Exception as exc:
        import logging
        logging.exception("Routing/Geocoding error: %s", exc)
        return Response(
            {"error": f"Routing service connection issue: {str(exc)}. Please try again in a few seconds."},
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
    # Persist the trip and its segments so frontend can list past trips
    try:
        trip = Trip.objects.create(
            start_time=trip_start,
            current_location=cur_name,
            pickup_location=pick_name,
            dropoff_location=drop_name,
            current_cycle_used=cycle_used,
            total_miles=plan.get("total_miles"),
            total_driving_hours=plan.get("total_driving_hours"),
            total_on_duty_hours=plan.get("total_on_duty_hours"),
            total_off_duty_hours=plan.get("total_off_duty_hours"),
            final_cycle_hours=plan.get("final_cycle_hours"),
        )
        for seg in plan["segments"]:
            Segment.objects.create(
                trip=trip,
                status=seg.status,
                start=seg.start,
                end=seg.end,
                label=seg.label,
            )
        response["saved_trip_id"] = trip.id
    except Exception:
        # don't fail the API if persistence fails; just continue without saving
        pass

    return Response(response)


@api_view(["GET"])
def list_trips(request):
    trips = Trip.objects.order_by("-created_at").all()[:50]
    serializer = TripSerializer(trips, many=True)
    return Response(serializer.data)


@api_view(["GET"])
def trip_detail(request, trip_id):
    trip = get_object_or_404(Trip, pk=trip_id)
    # order segments by start time to reconstruct the trip
    segments = list(trip.segments.order_by("start").all())

    # Recreate the daily_logs structure from stored segments so frontend can render exact saved trip
    daily_logs = segments_to_daily_logs(segments)
    end_time = segments[-1].end.isoformat() if segments else trip.start_time.isoformat()

    locations_data = {
        "current": {"name": trip.current_location},
        "pickup": {"name": trip.pickup_location},
        "dropoff": {"name": trip.dropoff_location},
    }
    route_data_resp = None

    try:
        cur_lat, cur_lon, cur_name = geocode(trip.current_location)
        pick_lat, pick_lon, pick_name = geocode(trip.pickup_location)
        drop_lat, drop_lon, drop_name = geocode(trip.dropoff_location)

        route_data = route([
            (cur_lat, cur_lon),
            (pick_lat, pick_lon),
            (drop_lat, drop_lon),
        ])
        leg1, leg2 = route_data["legs"][0], route_data["legs"][1]

        locations_data = {
            "current": {"name": cur_name, "lat": cur_lat, "lon": cur_lon},
            "pickup": {"name": pick_name, "lat": pick_lat, "lon": pick_lon},
            "dropoff": {"name": drop_name, "lat": drop_lat, "lon": drop_lon},
        }
        route_data_resp = {
            "geometry": route_data["geometry"],
            "total_distance_miles": route_data["distance_miles"],
            "total_drive_duration_hours": route_data["duration_hours"],
            "legs": [
                {"from": "Current Location", "to": "Pickup", **leg1},
                {"from": "Pickup", "to": "Drop-off", **leg2},
            ],
        }
    except Exception:
        # Fallback if external geocoding/routing service fails
        pass

    response = {
        "saved_trip_id": trip.id,
        "locations": locations_data,
        "route": route_data_resp,
        "trip_summary": {
            "start_time": trip.start_time.isoformat(),
            "end_time": end_time,
            "total_days": len(daily_logs),
            "total_driving_hours": trip.total_driving_hours,
            "total_on_duty_hours": trip.total_on_duty_hours,
            "total_off_duty_hours": trip.total_off_duty_hours,
            "total_miles": trip.total_miles,
            "cycle_hours_used_at_end": trip.final_cycle_hours,
        },
        "daily_logs": daily_logs,
    }

    return Response(response)
