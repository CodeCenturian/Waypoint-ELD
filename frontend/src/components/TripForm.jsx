import { useState } from "react";

const PRESETS = [
  { label: "Chicago → Dallas → Miami", current: "Chicago, IL", pickup: "Dallas, TX", dropoff: "Miami, FL", cycle: 15 },
  { label: "Green Bay → Indianapolis → Atlanta", current: "Green Bay, WI", pickup: "Indianapolis, IN", dropoff: "Atlanta, GA", cycle: 8 },
  { label: "Los Angeles → Phoenix → Denver", current: "Los Angeles, CA", pickup: "Phoenix, AZ", dropoff: "Denver, CO", cycle: 20 },
];

export default function TripForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    currentLocation: "Chicago, IL",
    pickupLocation: "Indianapolis, IN",
    dropoffLocation: "Atlanta, GA",
    cycleUsed: "10",
  });
  const [touched, setTouched] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const applyPreset = (p) => {
    setForm({
      currentLocation: p.current,
      pickupLocation: p.pickup,
      dropoffLocation: p.dropoff,
      cycleUsed: String(p.cycle),
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!form.currentLocation || !form.pickupLocation || !form.dropoffLocation || form.cycleUsed === "") {
      return;
    }
    onSubmit(form);
  };

  return (
    <form className="golden-card" onSubmit={handleSubmit}>
      <div className="golden-header">
        <div>
          <span className="golden-eyebrow">Dispatch Ticket &middot; HOS Planner</span>
          <h2>Plan a Compliant Trip</h2>
        </div>
        <div className="preset-bar">
          <span className="preset-title">Quick Presets:</span>
          {PRESETS.map((p, i) => (
            <button key={i} type="button" className="preset-chip" onClick={() => applyPreset(p)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="golden-grid">
        <div className="field-group">
          <label className="field-label">Current Location (Start)</label>
          <input
            type="text"
            className="field-input"
            value={form.currentLocation}
            onChange={update("currentLocation")}
            placeholder="e.g. Chicago, IL"
            autoComplete="off"
          />
          {touched && !form.currentLocation && <span className="field-error">Location required</span>}
        </div>

        <div className="field-group">
          <label className="field-label">Pickup Location</label>
          <input
            type="text"
            className="field-input"
            value={form.pickupLocation}
            onChange={update("pickupLocation")}
            placeholder="e.g. Indianapolis, IN"
            autoComplete="off"
          />
          {touched && !form.pickupLocation && <span className="field-error">Pickup required</span>}
        </div>

        <div className="field-group">
          <label className="field-label">Drop-off Location</label>
          <input
            type="text"
            className="field-input"
            value={form.dropoffLocation}
            onChange={update("dropoffLocation")}
            placeholder="e.g. Atlanta, GA"
            autoComplete="off"
          />
          {touched && !form.dropoffLocation && <span className="field-error">Drop-off required</span>}
        </div>

        <div className="field-group">
          <label className="field-label">Current Cycle Used (Hrs)</label>
          <input
            type="number"
            className="field-input"
            min="0"
            max="70"
            step="0.25"
            value={form.cycleUsed}
            onChange={update("cycleUsed")}
            placeholder="e.g. 10"
          />
          <span className="field-hint">70-hr / 8-day rolling cycle accumulator</span>
          {touched && form.cycleUsed === "" && <span className="field-error">Hours required</span>}
        </div>
      </div>

      <div className="golden-footer">
        <button className="btn-amber" type="submit" disabled={loading}>
          {loading ? "Calculating Route & Generating Daily Logs…" : "Generate Route & Draw ELD Logs →"}
        </button>
      </div>
    </form>
  );
}
