"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type OrgType = "KREISVERBAND" | "ORTSVEREIN" | "EXTERN";

// Drittverbände (nicht-DRK) werden gelb dargestellt, DRK-Verbände grün.
function candidateColor(type: OrgType) {
  return type === "EXTERN" ? "#eab308" : "#16a34a";
}

function numberedIcon(label: string, color: string, opacity = 1) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};opacity:${opacity};color:#fff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)">${label}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

// Kleinerer, transparenter Punkt für die Vorschau aller Transporteure eines
// Fahrzeugtyps - bewusst deutlich von den Routen-/Ergebnis-Markern
// unterscheidbar (kein Badge, kein Rang, keine Beschriftung).
function previewDotIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};opacity:0.45;border-radius:50%;width:14px;height:14px;border:1.5px solid white;box-shadow:0 1px 2px rgba(0,0,0,0.3)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

// Deutschland als Startansicht, bevor irgendetwas eingegeben wurde.
const GERMANY_CENTER: [number, number] = [51.1657, 10.4515];
const GERMANY_ZOOM = 6;

export type MapPoint = { lat: number; lng: number; label: string; name: string };
export type MapCandidate = {
  lat: number;
  lng: number;
  rank: number;
  name: string;
  type: OrgType;
};
export type MapPreviewOrg = {
  lat: number;
  lng: number;
  name: string;
  type: OrgType;
};

// Zoomt/verschiebt die Karte automatisch, sodass immer alle Wegpunkte und
// Kandidaten-Marker sichtbar sind (mit etwas Rand) - ohne feste Zoomstufe.
// Die transparente Vorschau-Ebene beeinflusst den Zoom bewusst NICHT (sonst
// würde ein einzelner weit entfernter Transporteur die ganze Karte
// herauszoomen, noch bevor überhaupt eine Route existiert).
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");

  useEffect(() => {
    if (points.length === 0) {
      map.setView(GERMANY_CENTER, GERMANY_ZOOM);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

  return null;
}

export function RouteMap({
  waypoints,
  routeLine,
  candidates,
  previewOrgs = [],
}: {
  waypoints: MapPoint[];
  routeLine: [number, number][] | null;
  candidates: MapCandidate[];
  previewOrgs?: MapPreviewOrg[];
}) {
  const allPoints: [number, number][] = [
    ...waypoints.map((w): [number, number] => [w.lat, w.lng]),
    ...candidates.map((c): [number, number] => [c.lat, c.lng]),
  ];

  return (
    <MapContainer
      center={GERMANY_CENTER}
      zoom={GERMANY_ZOOM}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <FitBounds points={allPoints} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {previewOrgs.map((o, i) => (
        <Marker
          key={`preview-${i}`}
          position={[o.lat, o.lng]}
          icon={previewDotIcon(candidateColor(o.type))}
        >
          <Tooltip>{o.name}</Tooltip>
        </Marker>
      ))}
      {routeLine && (
        <Polyline positions={routeLine} pathOptions={{ color: "#2563eb", weight: 4 }} />
      )}
      {waypoints.map((w, i) => (
        <Marker
          key={`wp-${i}`}
          position={[w.lat, w.lng]}
          icon={numberedIcon(w.label, "#1e293b")}
        >
          <Tooltip>{w.name}</Tooltip>
        </Marker>
      ))}
      {candidates.map((c) => (
        <Marker
          key={`cand-${c.rank}`}
          position={[c.lat, c.lng]}
          icon={numberedIcon(String(c.rank + 1), candidateColor(c.type))}
        >
          <Tooltip>{c.name}</Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
