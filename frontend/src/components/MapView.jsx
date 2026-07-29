import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import "leaflet/dist/leaflet.css";

// Custom Golden Hour pin factory
function pin(color, label) {
  return L.divIcon({
    className: "",
    html: `<div class="map-pin" style="--pin-color:${color}"><span>${label}</span></div>`,
    iconSize: [30, 40],
    iconAnchor: [15, 38],
    popupAnchor: [0, -36],
  });
}

const ICONS = {
  current: pin("#2E4034", "S"),
  pickup: pin("#E8912D", "P"),
  dropoff: pin("#C2492E", "D"),
  fuel: pin("#7C9070", "F"),
};

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [40, 40] });
    }
  }, [positions, map]);
  return null;
}

export default function MapView({ route, locations }) {
  const routePositions = useMemo(
    () => (route?.geometry || []).map(([lon, lat]) => [lat, lon]),
    [route]
  );

  if (!route || !locations) {
    return (
      <div className="map-placeholder">
        <span>Route will appear here once a trip is generated.</span>
      </div>
    );
  }

  return (
    <MapContainer
      center={routePositions[0] || [39.8, -98.5]}
      zoom={5}
      scrollWheelZoom
      className="map-container"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={routePositions} pathOptions={{ color: "#E8912D", weight: 4 }} />

      {locations?.current?.lat != null && locations?.current?.lon != null && (
        <Marker position={[locations.current.lat, locations.current.lon]} icon={ICONS.current}>
          <Popup>Start: {locations.current.name}</Popup>
        </Marker>
      )}
      {locations?.pickup?.lat != null && locations?.pickup?.lon != null && (
        <Marker position={[locations.pickup.lat, locations.pickup.lon]} icon={ICONS.pickup}>
          <Popup>Pickup: {locations.pickup.name}</Popup>
        </Marker>
      )}
      {locations?.dropoff?.lat != null && locations?.dropoff?.lon != null && (
        <Marker position={[locations.dropoff.lat, locations.dropoff.lon]} icon={ICONS.dropoff}>
          <Popup>Drop-off: {locations.dropoff.name}</Popup>
        </Marker>
      )}

      <FitBounds positions={routePositions} />
    </MapContainer>
  );
}
