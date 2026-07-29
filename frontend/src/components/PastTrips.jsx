import { useEffect, useState } from "react";
import { getTrips, getTrip } from "../api";

export default function PastTrips({ onLoad }) {
  const [trips, setTrips] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setInitialLoading(true);
    getTrips()
      .then((data) => setTrips(data))
      .catch((err) => setError(err.message))
      .finally(() => setInitialLoading(false));
  }, []);

  if (initialLoading) {
    return (
      <section className="panel history-section">
        <span className="panel-eyebrow">Trip History &amp; Archives</span>
        <div className="panel-card loading-card">Loading saved trip history…</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel history-section">
        <span className="panel-eyebrow">Trip History &amp; Archives</span>
        <div className="panel-card error-card">Could not load trip history: {error}</div>
      </section>
    );
  }

  if (!trips.length) {
    return (
      <section className="panel history-section">
        <span className="panel-eyebrow">Trip History &amp; Archives</span>
        <div className="panel-card empty-card">No saved trips yet. Generate your first run above!</div>
      </section>
    );
  }

  return (
    <section className="panel history-section">
      <div className="history-header">
        <div>
          <span className="panel-eyebrow">Saved Trips &amp; HOS Archives</span>
          <h2>Past ELD Runs</h2>
        </div>
        <span className="count-badge">{trips.length} Saved {trips.length === 1 ? "Trip" : "Trips"}</span>
      </div>

      <div className="history-grid">
        {trips.map((t) => (
          <div className="history-card" key={t.id}>
            <div className="history-card-top">
              <span className="trip-date">{new Date(t.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <span className="miles-badge">{t.total_miles ? `${t.total_miles.toLocaleString()} mi` : "N/A"}</span>
            </div>

            <div className="trip-route-line">
              <span className="loc-start">{t.current_location?.split(',')[0]}</span>
              <span className="arrow">&rarr;</span>
              <span className="loc-end">{t.dropoff_location?.split(',')[0]}</span>
            </div>

            <div className="history-card-stats">
              <div>
                <span className="stat-lbl">Driving Time</span>
                <span className="stat-num">{t.total_driving_hours ?? 0}h</span>
              </div>
              <div>
                <span className="stat-lbl">Cycle Used</span>
                <span className="stat-num">{t.final_cycle_hours ?? 0}h</span>
              </div>
            </div>

            <div className="history-card-action">
              {onLoad && (
                <button
                  className="btn-pine"
                  disabled={loadingId === t.id}
                  onClick={async () => {
                    try {
                      setLoadingId(t.id);
                      const full = await getTrip(t.id);
                      onLoad(full);
                    } catch (err) {
                      alert(`Error loading trip: ${err.message}`);
                    } finally {
                      setLoadingId(null);
                    }
                  }}
                >
                  {loadingId === t.id ? "Loading..." : "View Log Sheet"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
