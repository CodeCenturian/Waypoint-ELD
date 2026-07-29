from django.test import TestCase
from datetime import datetime

from .hos_engine import plan_trip, segments_to_daily_logs


class HosEngineTests(TestCase):
	def test_plan_trip_and_daily_totals(self):
		"""Run a simple trip through the HOS engine and assert each
		returned daily log sums to exactly 24 hours (fills were added).
		"""
		start = datetime.now().replace(minute=0, second=0, microsecond=0)

		plan = plan_trip(
			start_time=start,
			cycle_used_hours=10.0,
			current_label="Home",
			pickup_label="Pickup",
			dropoff_label="Dropoff",
			leg1_miles=300.0,
			leg1_hours=5.0,
			leg2_miles=900.0,
			leg2_hours=12.0,
		)

		# basic sanity
		self.assertIn("segments", plan)
		self.assertIn("total_driving_hours", plan)

		daily = segments_to_daily_logs(plan["segments"])
		self.assertTrue(len(daily) >= 1)

		for day in daily:
			totals = day["totals"]
			# sum of all four categories should equal 24.00 (within rounding)
			total_sum = round(sum(totals[k] for k in totals), 2)
			self.assertEqual(total_sum, 24.00, msg=f"Day {day['date']} totals {total_sum} != 24.00")


class TripDetailAPITests(TestCase):
	def test_trip_detail_view(self):
		from .models import Trip, Segment
		from django.urls import reverse

		start = datetime.now().replace(minute=0, second=0, microsecond=0)
		trip = Trip.objects.create(
			start_time=start,
			current_location="Chicago, IL",
			pickup_location="Indianapolis, IN",
			dropoff_location="Atlanta, GA",
			current_cycle_used=10.0,
			total_miles=800.0,
			total_driving_hours=14.0,
			total_on_duty_hours=16.0,
			total_off_duty_hours=10.0,
			final_cycle_hours=26.0,
		)
		Segment.objects.create(
			trip=trip,
			status="D",
			start=start,
			end=start,
			label="Driving",
		)

		url = reverse("trip-detail", kwargs={"trip_id": trip.id})
		response = self.client.get(url)
		self.assertEqual(response.status_code, 200)
		data = response.json()
		self.assertEqual(data["saved_trip_id"], trip.id)
		self.assertIn("daily_logs", data)
		self.assertIn("locations", data)
		self.assertIn("trip_summary", data)


