"use client";

import { MapContainer, TileLayer, Marker, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function numberedIcon(label: string, color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};color:#fff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)">${label}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

export type MapPoint = { lat: number; lng: number; label: string };
export type MapCandidate = { lat: number; lng: number; rank: number; name: string };

export function RouteMap({
  waypoints,
  routeLine,
  candidates,
}: {
  waypoints: MapPoint[];
  routeLine: [number, number][] | null;
  candidates: MapCandidate[];
}) {
  const center: [number, number] =
    waypoints.length > 0
      ? [waypoints[0].lat, waypoints[0].lng]
      : [51.1657, 10.4515]; // Mitte Deutschlands als Fallback

  return (
    <MapContainer
      center={center}
      zoom={6}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {routeLine && (
        <Polyline positions={routeLine} pathOptions={{ color: "#2563eb", weight: 4 }} />
      )}
      {waypoints.map((w, i) => (
        <Marker
          key={`wp-${i}`}
          position={[w.lat, w.lng]}
          icon={numberedIcon(w.label, "#1e293b")}
        >
          <Tooltip>{w.label}</Tooltip>
        </Marker>
      ))}
      {candidates.map((c) => (
        <Marker
          key={`cand-${c.rank}`}
          position={[c.lat, c.lng]}
          icon={numberedIcon(String(c.rank + 1), "#16a34a")}
        >
          <Tooltip>{c.name}</Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
