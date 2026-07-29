import { useState } from "react";
import TripForm from "./components/TripForm";
import MapView from "./components/MapView";
import LogSheet from "./components/LogSheet";
import TripSummary from "./components/TripSummary";
import { planTrip } from "./api";

export default function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (form) => {
    setLoading(true);
    setError(null);
    try {
      const data = await planTrip({
        currentLocation: form.currentLocation,
        pickupLocation: form.pickupLocation,
        dropoffLocation: form.dropoffLocation,
        cycleUsed: form.cycleUsed,
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            <span className="brand-mark">⟟</span>
            <div>
              <span className="brand-name">Waypoint ELD</span>
              <span className="brand-tag">Trip &amp; Hours-of-Service Planner</span>
            </div>
          </div>
          <span className="brand-rule">70-hr / 8-day &middot; Property-Carrying</span>
        </div>
      </header>

      <main className="app-main">
        <section className="hero">
          <h1>Route the load. Draw the logs. Stay compliant.</h1>
          <p>
            Enter a trip and get a mapped route plus fully-drawn FMCSA driver's
            daily log sheets — automatically split across days, with rest
            breaks, fuel stops, and pickup/drop-off duty time already worked in.
          </p>
        </section>

        <TripForm onSubmit={handleSubmit} loading={loading} />

        {error && <div className="error-banner">{error}</div>}

        {result && (
          <>
            <TripSummary summary={result.trip_summary} route={result.route} />

            <section className="panel">
              <span className="panel-eyebrow">Route</span>
              <MapView route={result.route} locations={result.locations} />
              <div className="leg-breakdown">
                {result.route.legs.map((leg, i) => (
                  <span key={i}>
                    {leg.from} &rarr; {leg.to}: <strong>{leg.distance_miles} mi</strong> / {leg.duration_hours}h
                  </span>
                ))}
              </div>
            </section>

            <section className="panel">
              <span className="panel-eyebrow">Driver's Daily Logs</span>
              <div className="log-sheet-stack">
                {result.daily_logs.map((day, i) => (
                  <LogSheet key={day.date} day={day} dayNumber={i + 1} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="app-footer">
        Routing via OpenStreetMap Nominatim &amp; OSRM &middot; HOS assumptions: 70hr/8day cycle, no adverse conditions, fuel every 1,000 mi, 1hr pickup/drop-off.
      </footer>
    </div>
  );
}
