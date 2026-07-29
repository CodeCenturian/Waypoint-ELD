from rest_framework import serializers
from .models import Trip, Segment


class SegmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Segment
        fields = ["id", "status", "start", "end", "label"]


class TripSerializer(serializers.ModelSerializer):
    segments = SegmentSerializer(many=True, read_only=True)

    class Meta:
        model = Trip
        fields = [
            "id",
            "created_at",
            "start_time",
            "current_location",
            "pickup_location",
            "dropoff_location",
            "current_cycle_used",
            "total_miles",
            "total_driving_hours",
            "total_on_duty_hours",
            "total_off_duty_hours",
            "final_cycle_hours",
            "segments",
        ]
