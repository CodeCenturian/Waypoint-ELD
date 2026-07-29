export default function TripSummary({ summary }) {
  if (!summary) return null;

  const cyclePct = Math.min(100, Math.round((summary.cycle_hours_used_at_end / 70) * 100));

  const items = [
    { label: "Total Distance", value: `${(summary.total_miles || 0).toLocaleString()} mi`, sub: "Calculated route distance" },
    { label: "Driving Duration", value: `${summary.total_driving_hours || 0} hrs`, sub: "Line 3 driving total" },
    { label: "On-Duty Total", value: `${summary.total_on_duty_hours || 0} hrs`, sub: "Lines 3 & 4 combined" },
    { label: "Trip Duration", value: `${summary.total_days} Day${summary.total_days > 1 ? "s" : ""}`, sub: "24-hr daily log sheets" },
  ];

  return (
    <div className="summary-dashboard">
      <div className="metrics-grid">
        {items.map((it) => (
          <div className="metric-card" key={it.label}>
            <span className="metric-label">{it.label}</span>
            <span className="metric-value">{it.value}</span>
            <span className="metric-sub">{it.sub}</span>
          </div>
        ))}
        
        <div className="metric-card cycle-card">
          <div className="cycle-header">
            <span className="metric-label">70-Hr / 8-Day Cycle</span>
            <span className="cycle-value">{summary.cycle_hours_used_at_end}h / 70.0h</span>
          </div>
          <div className="cycle-bar-bg">
            <div className="cycle-bar-fill" style={{ width: `${cyclePct}%` }} />
          </div>
          <span className="metric-sub">{70 - summary.cycle_hours_used_at_end} hrs available remaining</span>
        </div>
      </div>
    </div>
  );
}
