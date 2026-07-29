from django.urls import path
from .views import plan_trip_view, list_trips, trip_detail

urlpatterns = [
    path("plan-trip/", plan_trip_view, name="plan-trip"),
    path("trips/", list_trips, name="trip-list"),
    path("trips/<int:trip_id>/", trip_detail, name="trip-detail"),
]
