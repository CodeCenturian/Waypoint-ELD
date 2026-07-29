const ROWS = [
  { key: "OFF", label: "1: OFF DUTY" },
  { key: "SB", label: "2: SLEEPER BERTH" },
  { key: "D", label: "3: DRIVING" },
  { key: "ON", label: "4: ON DUTY (NOT DRIVING)" },
];

const LEFT_LABEL_W = 160;
const GRID_W = 800;
const ROW_H = 40;
const TOP_PAD = 36;
const TOTALS_W = 75;
const SVG_W = LEFT_LABEL_W + GRID_W + TOTALS_W;
const SVG_H = TOP_PAD + ROWS.length * ROW_H + 10;

const hourX = (h) => LEFT_LABEL_W + (h / 24) * GRID_W;
const rowY = (idx) => TOP_PAD + idx * ROW_H;

const HOUR_LABELS = [
  "Mid-\nnight", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11",
  "Noon", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "Mid-\nnight",
];

export default function LogSheet({ day, dayNumber }) {
  const rowIndex = { OFF: 0, SB: 1, D: 2, ON: 3 };

  // Build continuous step-line path across lanes & corner transition points
  const points = [];
  const sorted = [...(day.segments || [])].sort((a, b) => a.start_hour - b.start_hour);
  
  sorted.forEach((seg, i) => {
    const y = rowY(rowIndex[seg.status]) + ROW_H / 2;
    const x1 = hourX(seg.start_hour);
    const x2 = hourX(seg.end_hour);
    if (i > 0) {
      const prevY = points[points.length - 1][1];
      points.push([x1, prevY]); // vertical jump to new lane at transition x
    }
    points.push([x1, y]);
    points.push([x2, y]);
  });
  
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

  // Corner transition points
  const transitionDots = points.filter((p, i, self) => 
    i === 0 || i === self.length - 1 || (p[0] !== self[i - 1][0] || p[1] !== self[i - 1][1])
  );

  const onDutyToday = (day.totals.D + day.totals.ON).toFixed(2);

  return (
    <div className="log-sheet-paper">
      {/* Paper Form Header */}
      <div className="paper-header">
        <div className="paper-title-block">
          <h2>Driver's Daily Log</h2>
          <span className="paper-subtitle">(24 hours &middot; Property-Carrying Driver)</span>
        </div>
        <div className="paper-meta-block">
          <div className="meta-box">
            <span className="meta-label">Date</span>
            <span className="meta-value">{day.date} (Day {dayNumber})</span>
          </div>
          <div className="meta-box">
            <span className="meta-label">Carrier Name &amp; Home Address</span>
            <span className="meta-value">Waypoint Logistics Ltd. &middot; Green Bay, WI</span>
          </div>
          <div className="meta-box">
            <span className="meta-label">Truck / Trailer</span>
            <span className="meta-value">Tractor #4082 &middot; TR-990</span>
          </div>
        </div>
      </div>

      {/* Totals Summary Ribbon */}
      <div className="totals-ribbon">
        {ROWS.map((r) => (
          <div key={r.key} className="ribbon-item">
            <span className="ribbon-label">{r.label}</span>
            <span className="ribbon-val">{day.totals[r.key].toFixed(2)} hrs</span>
          </div>
        ))}
        <div className="ribbon-item highlight">
          <span className="ribbon-label">Total On-Duty Today</span>
          <span className="ribbon-val">{onDutyToday} hrs</span>
        </div>
      </div>

      {/* Duty Status SVG Grid */}
      <div className="grid-wrapper">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="log-sheet-svg" role="img" aria-label={`ELD log grid for ${day.date}`}>
          {/* Main outer border */}
          <rect x={LEFT_LABEL_W} y={TOP_PAD} width={GRID_W} height={ROWS.length * ROW_H} fill="#fdfbf7" stroke="#2b2620" strokeWidth="1.6" />

          {/* Hour grid lines */}
          {Array.from({ length: 25 }).map((_, h) => (
            <line
              key={h}
              x1={hourX(h)} x2={hourX(h)}
              y1={TOP_PAD} y2={TOP_PAD + ROWS.length * ROW_H}
              stroke={h % 6 === 0 ? "#2b2620" : "#c9c2ad"}
              strokeWidth={h % 6 === 0 ? 1.4 : 0.8}
            />
          ))}

          {/* Quarter-hour tick marks */}
          {Array.from({ length: 96 }).map((_, q) => {
            if (q % 4 === 0) return null;
            const h = q / 4;
            return (
              <g key={`q${q}`}>
                {ROWS.map((_, idx) => (
                  <line
                    key={`q${q}-${idx}`}
                    x1={hourX(h)} x2={hourX(h)}
                    y1={rowY(idx)} y2={rowY(idx) + (q % 2 === 0 ? 7 : 4)}
                    stroke="#a39a85" strokeWidth={0.6}
                  />
                ))}
              </g>
            );
          })}

          {/* Row separators + lane labels + total column */}
          {ROWS.map((r, idx) => (
            <g key={r.key}>
              <line x1={LEFT_LABEL_W} x2={LEFT_LABEL_W + GRID_W}
                y1={rowY(idx)} y2={rowY(idx)} stroke="#2b2620" strokeWidth={1} />
              <text x={LEFT_LABEL_W - 12} y={rowY(idx) + ROW_H / 2 + 4} textAnchor="end" className="log-row-label">
                {r.label}
              </text>
              <text x={LEFT_LABEL_W + GRID_W + TOTALS_W / 2} y={rowY(idx) + ROW_H / 2 + 4} textAnchor="middle" className="log-row-total">
                {day.totals[r.key].toFixed(2)}
              </text>
            </g>
          ))}

          {/* Total Column Header & Border */}
          <line x1={LEFT_LABEL_W + GRID_W} x2={LEFT_LABEL_W + GRID_W} y1={TOP_PAD} y2={TOP_PAD + ROWS.length * ROW_H} stroke="#2b2620" strokeWidth="1.4" />
          <text x={LEFT_LABEL_W + GRID_W + TOTALS_W / 2} y={TOP_PAD - 8} textAnchor="middle" className="log-hour-label" style={{ fontWeight: 700 }}>
            Total
          </text>

          {/* Hour labels along top */}
          {HOUR_LABELS.map((lbl, h) => {
            const parts = lbl.split("\n");
            const anchor = h === 0 ? "start" : h === 24 ? "end" : "middle";
            if (parts.length > 1) {
              return (
                <text key={h} x={hourX(h)} y={TOP_PAD - 18} textAnchor={anchor} className="log-hour-label">
                  <tspan x={hourX(h)} dy="0">{parts[0]}</tspan>
                  <tspan x={hourX(h)} dy="9">{parts[1]}</tspan>
                </text>
              );
            }
            return (
              <text key={h} x={hourX(h)} y={TOP_PAD - 10} textAnchor={anchor} className="log-hour-label">
                {lbl}
              </text>
            );
          })}

          {/* Plotted Duty-Status Line */}
          <path d={pathD} fill="none" stroke="#2b2620" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

          {/* Red Duty Transition Dots (matching Schneider ELD video) */}
          {transitionDots.map((pt, i) => (
            <circle
              key={i}
              cx={pt[0]}
              cy={pt[1]}
              r={4}
              fill="#C2492E"
              stroke="#FFFFFF"
              strokeWidth={1.5}
            />
          ))}
        </svg>
      </div>

      {/* Remarks Section */}
      {day.remarks?.length > 0 && (
        <div className="paper-remarks">
          <div className="remarks-header">
            <span className="remarks-title">REMARKS</span>
            <span className="remarks-sub">City, State &amp; Duty Change Explanations</span>
          </div>
          <ul className="remarks-list">
            {day.remarks.map((r, i) => (
              <li key={i} className="remark-item">
                <span className="remark-bullet">&bull;</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* FMCSA 70-Hr / 8-Day Driver Recap Section */}
      <div className="paper-recap">
        <div className="recap-col">
          <span className="recap-label">A. On duty hours today (Lines 3 &amp; 4)</span>
          <span className="recap-val">{onDutyToday} hrs</span>
        </div>
        <div className="recap-col">
          <span className="recap-label">B. 70-Hr / 8-Day Cycle Rule</span>
          <span className="recap-val">Property Carrying (11h drive / 14h window)</span>
        </div>
        <div className="recap-col">
          <span className="recap-label">C. 34-Hour Restart Status</span>
          <span className="recap-val">Compliant</span>
        </div>
      </div>
    </div>
  );
}
