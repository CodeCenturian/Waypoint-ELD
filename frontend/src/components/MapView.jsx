import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import "leaflet/dist/leaflet.css";

// Custom pin factory so we don't depend on leaflet's default marker image assets
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
  current: pin("#3C5875", "S"),
  pickup: pin("#F2A93B", "P"),
  dropoff: pin("#D64545", "D"),
  fuel: pin("#6E9B7A", "F"),
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

export default function MapView({ route, locations, stops }) {
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
      <Polyline positions={routePositions} pathOptions={{ color: "#F2A93B", weight: 4 }} />

      <Marker position={[locations.current.lat, locations.current.lon]} icon={ICONS.current}>
        <Popup>Start: {locations.current.name}</Popup>
      </Marker>
      <Marker position={[locations.pickup.lat, locations.pickup.lon]} icon={ICONS.pickup}>
        <Popup>Pickup: {locations.pickup.name}</Popup>
      </Marker>
      <Marker position={[locations.dropoff.lat, locations.dropoff.lon]} icon={ICONS.dropoff}>
        <Popup>Drop-off: {locations.dropoff.name}</Popup>
      </Marker>

      <FitBounds positions={routePositions} />
    </MapContainer>
  );
}
