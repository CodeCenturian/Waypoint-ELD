import { useState } from "react";

const FIELD_META = [
  { key: "currentLocation", label: "Current Location", placeholder: "e.g. Chicago, IL" },
  { key: "pickupLocation", label: "Pickup Location", placeholder: "e.g. Dallas, TX" },
  { key: "dropoffLocation", label: "Drop-off Location", placeholder: "e.g. Miami, FL" },
];

export default function TripForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    currentLocation: "",
    pickupLocation: "",
    dropoffLocation: "",
    cycleUsed: "",
  });
  const [touched, setTouched] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!form.currentLocation || !form.pickupLocation || !form.dropoffLocation || form.cycleUsed === "") {
      return;
    }
    onSubmit(form);
  };

  return (
    <form className="dispatch-ticket" onSubmit={handleSubmit}>
      <div className="ticket-header">
        <span className="ticket-eyebrow">Trip Sheet</span>
        <h2>Plan a Compliant Run</h2>
      </div>

      <div className="ticket-grid">
        {FIELD_META.map(({ key, label, placeholder }) => (
          <label className="field" key={key}>
            <span className="field-label">{label}</span>
            <input
              type="text"
              value={form[key]}
              onChange={update(key)}
              placeholder={placeholder}
              autoComplete="off"
            />
            {touched && !form[key] && <span className="field-error">Required</span>}
          </label>
        ))}

        <label className="field">
          <span className="field-label">Current Cycle Used (Hrs)</span>
          <input
            type="number"
            min="0"
            max="70"
            step="0.25"
            value={form.cycleUsed}
            onChange={update("cycleUsed")}
            placeholder="e.g. 12"
          />
          <span className="field-hint">70-hr / 8-day rule &middot; hours already on duty</span>
          {touched && form.cycleUsed === "" && <span className="field-error">Required</span>}
        </label>
      </div>

      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? "Calculating route & logs…" : "Generate Route + ELD Logs"}
      </button>
    </form>
  );
}
