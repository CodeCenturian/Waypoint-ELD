export default function TripSummary({ summary, route }) {
  if (!summary) return null;

  const items = [
    { label: "Total Miles", value: `${summary.total_miles.toLocaleString()} mi` },
    { label: "Driving Time", value: `${summary.total_driving_hours}h` },
    { label: "On-Duty Time", value: `${summary.total_on_duty_hours}h` },
    { label: "Trip Length", value: `${summary.total_days} day${summary.total_days > 1 ? "s" : ""}` },
    { label: "70-hr Cycle Used", value: `${summary.cycle_hours_used_at_end}h / 70h` },
  ];

  return (
    <div className="trip-summary-strip">
      {items.map((it) => (
        <div className="summary-item" key={it.label}>
          <span className="summary-value">{it.value}</span>
          <span className="summary-label">{it.label}</span>
        </div>
      ))}
    </div>
  );
}
