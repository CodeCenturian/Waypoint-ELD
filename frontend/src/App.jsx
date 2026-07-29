import { useState } from "react";
import TripForm from "./components/TripForm";
import MapView from "./components/MapView";
import LogSheet from "./components/LogSheet";
import TripSummary from "./components/TripSummary";
import PastTrips from "./components/PastTrips";
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
          <div id="trip-results" className="results-container">
            <TripSummary summary={result.trip_summary} />

            {result.route && (
              <section className="panel">
                <span className="panel-eyebrow">Interactive Route &amp; Stop Map</span>
                <MapView route={result.route} locations={result.locations} />
                <div className="leg-breakdown">
                  {result.route.legs?.map((leg, i) => (
                    <span key={i} className="leg-chip">
                      {leg.from} &rarr; {leg.to}: <strong>{leg.distance_miles} mi</strong> ({leg.duration_hours} hrs drive time)
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="panel">
              <span className="panel-eyebrow">FMCSA Driver's Daily Log Sheets</span>
              <div className="log-sheet-stack">
                {result.daily_logs?.map((day, i) => (
                  <LogSheet key={day.date} day={day} dayNumber={i + 1} />
                ))}
              </div>
            </section>
          </div>
        )}

        <PastTrips onLoad={(data) => {
          setResult(data);
          setTimeout(() => {
            document.getElementById("trip-results")?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }} />
      </main>

      <footer className="app-footer">
        <div>Made by <strong>Ashutosh Kumar</strong></div>
        <div style={{ marginTop: 6 }}>
          <a href="mailto:ashuotshkumariiitb@gmail.com" style={{ color: "inherit", textDecoration: "underline" }}>ashuotshkumariiitb@gmail.com</a>
          {" \u00b7 "}
          <a href="https://www.linkedin.com/in/ashutosh-kumar879/" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>LinkedIn</a>
        </div>
      </footer>
    </div>
  );
}
