const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export async function planTrip({ currentLocation, pickupLocation, dropoffLocation, cycleUsed }) {
  const res = await fetch(`${API_BASE}/api/plan-trip/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      current_location: currentLocation,
      pickup_location: pickupLocation,
      dropoff_location: dropoffLocation,
      current_cycle_used: cycleUsed,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong planning this trip.");
  }
  return data;
}

export async function getTrips() {
  const res = await fetch(`${API_BASE}/api/trips/`);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(text || "Could not fetch trips (non-JSON response).");
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Could not fetch trips.");
  }
  return data;
}

export async function getTrip(id) {
  const res = await fetch(`${API_BASE}/api/trips/${id}/`);
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text();
    throw new Error(text || "Could not fetch trip (non-JSON response).");
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Could not fetch trip.");
  }
  return data;
}
