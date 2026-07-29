const ROWS = [
  { key: "OFF", label: "Off Duty" },
  { key: "SB", label: "Sleeper Berth" },
  { key: "D", label: "Driving" },
  { key: "ON", label: "On Duty (Not Driving)" },
];

const LEFT_LABEL_W = 150;
const GRID_W = 820;
const ROW_H = 42;
const TOP_PAD = 34;
const TOTALS_W = 70;
const SVG_W = LEFT_LABEL_W + GRID_W + TOTALS_W;
const SVG_H = TOP_PAD + ROWS.length * ROW_H + 10;

const hourX = (h) => LEFT_LABEL_W + (h / 24) * GRID_W;
const rowY = (idx) => TOP_PAD + idx * ROW_H;

const HOUR_LABELS = [
  "Mid-\nnight", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11",
  "Noon", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "Mid-\nnight",
];

function formatClock(dateStr, hour) {
  const h = Math.floor(hour) % 24;
  const m = Math.round((hour - Math.floor(hour)) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function LogSheet({ day, dayNumber }) {
  const rowIndex = { OFF: 0, SB: 1, D: 2, ON: 3 };

  // Build the continuous step-line path across all four lanes
  const points = [];
  const sorted = [...day.segments].sort((a, b) => a.start_hour - b.start_hour);
  sorted.forEach((seg, i) => {
    const y = rowY(rowIndex[seg.status]) + ROW_H / 2;
    const x1 = hourX(seg.start_hour);
    const x2 = hourX(seg.end_hour);
    if (i > 0) {
      const prevY = points[points.length - 1][1];
      points.push([x1, prevY]); // vertical jump to new lane at the transition x
    }
    points.push([x1, y]);
    points.push([x2, y]);
  });
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

  return (
    <div className="log-sheet">
      <div className="log-sheet-header">
        <div>
          <span className="log-sheet-eyebrow">Driver's Daily Log &middot; Day {dayNumber}</span>
          <h3>{day.date}</h3>
        </div>
        <div className="log-sheet-totals-chip">
          {ROWS.map((r) => (
            <span key={r.key}>
              <strong>{day.totals[r.key].toFixed(2)}h</strong> {r.label}
            </span>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="log-sheet-svg" role="img" aria-label={`ELD log grid for ${day.date}`}>
        {/* hour grid lines */}
        {Array.from({ length: 25 }).map((_, h) => (
          <line
            key={h}
            x1={hourX(h)} x2={hourX(h)}
            y1={TOP_PAD} y2={TOP_PAD + ROWS.length * ROW_H}
            stroke={h % 6 === 0 ? "#2b2f26" : "#c9c2ad"}
            strokeWidth={h % 6 === 0 ? 1.4 : 0.8}
          />
        ))}
        {/* quarter-hour tick marks */}
        {Array.from({ length: 96 }).map((_, q) => {
          if (q % 4 === 0) return null;
          const h = q / 4;
          return (
            <line key={`q${q}`} x1={hourX(h)} x2={hourX(h)}
              y1={TOP_PAD} y2={TOP_PAD + ROWS.length * ROW_H}
              stroke="#e3ddc8" strokeWidth={0.5} />
          );
        })}

        {/* row separators + labels */}
        {ROWS.map((r, idx) => (
          <g key={r.key}>
            <line x1={LEFT_LABEL_W} x2={LEFT_LABEL_W + GRID_W}
              y1={rowY(idx)} y2={rowY(idx)} stroke="#2b2f26" strokeWidth={1} />
            <text x={LEFT_LABEL_W - 10} y={rowY(idx) + ROW_H / 2 + 4} textAnchor="end" className="log-row-label">
              {r.label}
            </text>
            <text x={LEFT_LABEL_W + GRID_W + TOTALS_W - 8} y={rowY(idx) + ROW_H / 2 + 4} textAnchor="end" className="log-row-total">
              {day.totals[r.key].toFixed(2)}
            </text>
          </g>
        ))}
        <line x1={LEFT_LABEL_W} x2={LEFT_LABEL_W + GRID_W}
          y1={TOP_PAD + ROWS.length * ROW_H} y2={TOP_PAD + ROWS.length * ROW_H} stroke="#2b2f26" strokeWidth={1.4} />
        <line x1={LEFT_LABEL_W} x2={LEFT_LABEL_W} y1={TOP_PAD} y2={TOP_PAD + ROWS.length * ROW_H} stroke="#2b2f26" strokeWidth={1.4} />
        <line x1={LEFT_LABEL_W + GRID_W} x2={LEFT_LABEL_W + GRID_W} y1={TOP_PAD} y2={TOP_PAD + ROWS.length * ROW_H} stroke="#2b2f26" strokeWidth={1.4} />

        {/* hour labels along top */}
        {HOUR_LABELS.map((lbl, h) => (
          <text key={h} x={hourX(h)} y={TOP_PAD - 10} textAnchor="middle" className="log-hour-label">
            {lbl}
          </text>
        ))}

        {/* the plotted duty-status line — signature element */}
        <path d={pathD} fill="none" stroke="#1f2a44" strokeWidth={2.6} strokeLinejoin="round" />
      </svg>

      {day.remarks?.length > 0 && (
        <div className="log-remarks">
          <span className="log-remarks-label">Remarks</span>
          <ul>
            {day.remarks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
