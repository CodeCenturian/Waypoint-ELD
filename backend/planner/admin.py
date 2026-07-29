from django.contrib import admin
from .models import Trip, Segment


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
	list_display = ("id", "start_time", "current_location", "pickup_location", "dropoff_location", "created_at")
	readonly_fields = ("created_at",)


@admin.register(Segment)
class SegmentAdmin(admin.ModelAdmin):
	list_display = ("id", "trip", "status", "start", "end", "label")
