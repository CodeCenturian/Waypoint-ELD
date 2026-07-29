"""
Hours of Service (HOS) simulation engine.

Implements the FMCSA property-carrying driver ruleset under the assumptions
given in the assessment brief:
  - 70 hour / 8 day on-duty limit (carrier operates every day)
  - 11-hour driving limit within a 14-hour on-duty window
  - 30-minute break required after 8 cumulative hours of driving
  - 10 consecutive hours off duty resets the 11-hr / 14-hr clocks
  - 34 consecutive hours off duty resets the 70-hr/8-day cycle
  - No adverse driving conditions exception applied
  - Fueling stop (assume 30 min, on-duty-not-driving) at least every 1,000 mi
  - 1 hour on-duty (not driving) at pickup, and 1 hour at drop-off

The engine turns a sequence of "activities" (drive legs + fixed duty stops)
into a flat list of duty-status segments, each tagged with a clock-time
range, which the API layer then slices into 24-hour driver's-daily-log
pages for the frontend to render.
"""
from dataclasses import dataclass, field
from datetime import datetime, timedelta

OFF_DUTY = "OFF"
SLEEPER = "SB"
DRIVING = "D"
ON_DUTY = "ON"

DAILY_DRIVE_LIMIT = 11.0
WINDOW_LIMIT = 14.0
BREAK_AFTER_DRIVE = 8.0
BREAK_DURATION = 0.5
CYCLE_LIMIT = 70.0
RESTART_HOURS = 34.0
DAILY_OFF_DUTY = 10.0
FUEL_INTERVAL_MILES = 1000.0
FUEL_STOP_HOURS = 0.5
PICKUP_DROPOFF_HOURS = 1.0


@dataclass
class Segment:
    status: str
    start: datetime
    end: datetime
    label: str = ""

    @property
    def hours(self):
        return (self.end - self.start).total_seconds() / 3600.0


@dataclass
class _State:
    clock: datetime
    cycle_hours: float          # rolling 70/8 total (simplified: does not
                                 # drop old days, matches "worst case"
                                 # planning use, only reset by 34-hr restart)
    window_elapsed: float = 0.0
    today_drive: float = 0.0
    drive_since_break: float = 0.0
    miles_since_fuel: float = 0.0
    on_duty_window_open: bool = False
    segments: list = field(default_factory=list)

    def push(self, status, hours, label=""):
        if hours <= 0:
            return
        start = self.clock
        end = self.clock + timedelta(hours=hours)
        self.segments.append(Segment(status, start, end, label))
        self.clock = end


def _reset_day(state: _State):
    state.window_elapsed = 0.0
    state.today_drive = 0.0
    state.drive_since_break = 0.0
    state.on_duty_window_open = False


def _take_off_duty(state: _State, hours: float, label: str):
    state.push(OFF_DUTY, hours, label)
    _reset_day(state)


def _take_restart(state: _State, label: str):
    state.push(OFF_DUTY, RESTART_HOURS, label)
    _reset_day(state)
    state.cycle_hours = 0.0


def _drive_leg(state: _State, miles: float, hours: float, from_label: str, to_label: str):
    """Drive `miles`/`hours` worth of road, inserting breaks, fuel stops,
    and end-of-day rest as required by the HOS limits."""
    remaining_hours = hours
    remaining_miles = miles
    avg_speed = miles / hours if hours > 0 else 45.0

    while remaining_hours > 1e-6:
        # Cycle (70/8) exhausted -> mandatory 34-hr restart
        if state.cycle_hours >= CYCLE_LIMIT - 1e-6:
            _take_restart(state, "34-hr restart (70-hr cycle reached)")
            continue

        # 30-minute break required after 8 cumulative driving hours
        if state.drive_since_break >= BREAK_AFTER_DRIVE - 1e-6:
            state.push(ON_DUTY, BREAK_DURATION, "Required 30-min rest break")
            state.window_elapsed += BREAK_DURATION
            state.drive_since_break = 0.0
            continue

        # How much can we drive right now, bound by every limit at once?
        max_by_daily_drive = DAILY_DRIVE_LIMIT - state.today_drive
        max_by_window = WINDOW_LIMIT - state.window_elapsed
        max_by_break = BREAK_AFTER_DRIVE - state.drive_since_break
        max_by_cycle = CYCLE_LIMIT - state.cycle_hours
        # distance to next fuel stop, expressed in hours at current pace
        miles_to_fuel = FUEL_INTERVAL_MILES - state.miles_since_fuel
        max_by_fuel = miles_to_fuel / avg_speed if avg_speed > 0 else 999

        drivable = min(
            remaining_hours, max_by_daily_drive, max_by_window,
            max_by_break, max_by_cycle, max_by_fuel,
        )

        if drivable <= 1e-6:
            # Can't drive any more today -> mandatory 10-hr off duty
            if max_by_daily_drive <= 1e-6 or max_by_window <= 1e-6:
                _take_off_duty(state, DAILY_OFF_DUTY, "Required 10-hr rest")
                continue
            # Shouldn't normally get here, but guard against infinite loops
            _take_off_duty(state, DAILY_OFF_DUTY, "Required 10-hr rest")
            continue

        label = f"En route: {from_label} -> {to_label}"
        state.push(DRIVING, drivable, label)
        state.today_drive += drivable
        state.window_elapsed += drivable
        state.drive_since_break += drivable
        state.cycle_hours += drivable

        chunk_miles = drivable * avg_speed
        state.miles_since_fuel += chunk_miles
        remaining_miles -= chunk_miles
        remaining_hours -= drivable

        if state.miles_since_fuel >= FUEL_INTERVAL_MILES - 1e-6 and remaining_hours > 1e-6:
            state.push(ON_DUTY, FUEL_STOP_HOURS, "Fuel stop")
            state.window_elapsed += FUEL_STOP_HOURS
            state.miles_since_fuel = 0.0


def _on_duty_stop(state: _State, hours: float, label: str):
    # If there isn't room left in the 14-hr window, rest first.
    if state.window_elapsed + hours > WINDOW_LIMIT + 1e-6:
        _take_off_duty(state, DAILY_OFF_DUTY, "Required 10-hr rest before duty stop")
    if state.cycle_hours + hours > CYCLE_LIMIT + 1e-6:
        _take_restart(state, "34-hr restart (70-hr cycle reached)")
    state.push(ON_DUTY, hours, label)
    state.window_elapsed += hours
    state.cycle_hours += hours


def plan_trip(
    start_time: datetime,
    cycle_used_hours: float,
    current_label: str,
    pickup_label: str,
    dropoff_label: str,
    leg1_miles: float,
    leg1_hours: float,
    leg2_miles: float,
    leg2_hours: float,
):
    """Simulate the full trip and return the flat list of Segments plus
    trip-level totals."""
    state = _State(clock=start_time, cycle_hours=cycle_used_hours)

    _drive_leg(state, leg1_miles, leg1_hours, current_label, pickup_label)
    _on_duty_stop(state, PICKUP_DROPOFF_HOURS, f"Pickup at {pickup_label}")
    _drive_leg(state, leg2_miles, leg2_hours, pickup_label, dropoff_label)
    _on_duty_stop(state, PICKUP_DROPOFF_HOURS, f"Drop-off at {dropoff_label}")

    total_drive = sum(s.hours for s in state.segments if s.status == DRIVING)
    total_onduty = sum(s.hours for s in state.segments if s.status == ON_DUTY) + total_drive
    total_off = sum(s.hours for s in state.segments if s.status == OFF_DUTY)

    return {
        "segments": state.segments,
        "end_time": state.clock,
        "total_driving_hours": round(total_drive, 2),
        "total_on_duty_hours": round(total_onduty, 2),
        "total_off_duty_hours": round(total_off, 2),
        "total_miles": round(leg1_miles + leg2_miles, 1),
        "final_cycle_hours": round(state.cycle_hours, 2),
    }


def segments_to_daily_logs(segments):
    """Slice a flat segment list into per-24-hour-day log sheets.

    Each day is keyed by the calendar date of the log's *start* (midnight
    to midnight, in the clock the segments were generated with). Segments
    that cross midnight are split across two day pages.
    """
    days = {}

    def day_key(dt: datetime):
        return dt.date().isoformat()

    def day_start(dt: datetime):
        return datetime(dt.year, dt.month, dt.day)

    for seg in segments:
        cursor = seg.start
        while cursor < seg.end:
            this_day_start = day_start(cursor)
            next_day_start = this_day_start + timedelta(days=1)
            piece_end = min(seg.end, next_day_start)

            key = day_key(cursor)
            if key not in days:
                days[key] = {
                    "date": key,
                    "segments": [],
                    "totals": {OFF_DUTY: 0.0, SLEEPER: 0.0, DRIVING: 0.0, ON_DUTY: 0.0},
                    "remarks": [],
                }

            start_hr = (cursor - this_day_start).total_seconds() / 3600.0
            end_hr = (piece_end - this_day_start).total_seconds() / 3600.0
            piece_hours = end_hr - start_hr

            days[key]["segments"].append({
                "status": seg.status,
                "start_hour": round(start_hr, 3),
                "end_hour": round(end_hr, 3),
                "label": seg.label,
            })
            days[key]["totals"][seg.status] += piece_hours

            if seg.label and (not days[key]["remarks"] or days[key]["remarks"][-1] != seg.label):
                days[key]["remarks"].append(f"{cursor.strftime('%H:%M')} - {seg.label}")

            cursor = piece_end

    ordered = [days[k] for k in sorted(days.keys())]
    for d in ordered:
        for k in d["totals"]:
            d["totals"][k] = round(d["totals"][k], 2)
    return ordered
