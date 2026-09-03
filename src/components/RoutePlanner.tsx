"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AddressAutocomplete, AddressValue } from "@/components/AddressAutocomplete";
import type { MapCandidate, MapPoint, MapPreviewOrg } from "@/components/RouteMap";

const RouteMap = dynamic(
  () => import("@/components/RouteMap").then((m) => m.RouteMap),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-slate-400">Karte wird geladen…</div> },
);

type VehicleType = "PKW" | "VAN" | "KTW" | "N_KTW" | "RTW" | "ITW";

const vehicleLabels: Record<VehicleType, string> = {
  PKW: "PKW",
  VAN: "VAN",
  KTW: "KTW",
  N_KTW: "N-KTW",
  RTW: "RTW",
  ITW: "ITW",
};

type OrgType = "KREISVERBAND" | "ORTSVEREIN" | "EXTERN";

type Candidate = {
  organizationId: string;
  organizationName: string;
  organizationType: OrgType;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  lat: number;
  lng: number;
  toStartDistanceM: number;
  fromDestDistanceM: number;
  totalRoundTripM: number;
  totalRoundTripWithBufferM: number;
};

type Customer = { id: string; name: string };

// Immer auf den nächsthöheren Kilometer aufrunden (nie ab-/kaufmännisch
// runden) - sicherheitshalber für Planung/Abrechnung.
function km(meters: number) {
  return Math.ceil(meters / 1000).toLocaleString("de-DE");
}

function candidateAddress(c: Candidate): string | null {
  const line = [c.street, [c.postalCode, c.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  return line || null;
}

// Ab dieser Entfernung des nächstgelegenen Transporteurs ein Hinweis, dass es
// sich um ein ungewöhnlich weit entferntes Ergebnis handelt (z.B. bei sehr
// speziellen Anforderungen, die kaum ein Transporteur erfüllt).
const FAR_RESULT_THRESHOLD_M = 150_000;

export function RoutePlanner({ customers }: { customers: Customer[] }) {
  // Ein Punkt pro Halt: Index 0 ist immer "Start", der letzte Index immer
  // "Ziel", alles dazwischen "Zwischenstopp". Die Reihenfolge (und damit,
  // welcher Punkt gerade Start bzw. Ziel ist) wird per Drag & Drop verändert -
  // es wird also nie eine Adresse "verschoben", sondern der ganze Punkt inkl.
  // seiner Rolle in der Route.
  const [points, setPoints] = useState<(AddressValue | null)[]>([null, null]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [stale, setStale] = useState(false);
  const start = points[0];
  const destination = points[points.length - 1];
  const stops = points.slice(1, -1);
  const [vehicleType, setVehicleType] = useState<VehicleType>("KTW");
  const [needsDoctor, setNeedsDoctor] = useState(false);
  const [needsTemperingMattress, setNeedsTemperingMattress] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Live-Vorschau: zeigt vor dem Berechnen bereits alle Transporteure mit
  // dem gewählten Fahrzeugtyp bundesweit an, wenn der Disponent das aktiviert.
  const [showPreview, setShowPreview] = useState(false);
  const [previewOrgs, setPreviewOrgs] = useState<MapPreviewOrg[]>([]);

  // Kartenvorschau und Notfalltransport sind Sonderfälle, kein Standard-Case
  // - deshalb standardmäßig eingeklappt, damit sie den normalen
  // Kalkulations-Ablauf nicht dominieren.
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!showPreview) {
      setPreviewOrgs([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/organizations/preview?vehicleType=${vehicleType}`)
      .then((res) => res.json())
      .then((data: MapPreviewOrg[]) => {
        if (!cancelled) setPreviewOrgs(data);
      });
    return () => {
      cancelled = true;
    };
  }, [showPreview, vehicleType]);

  const [routeRequestId, setRouteRequestId] = useState<string | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<GeoJSON.LineString | null>(null);
  const [patientRouteDistanceM, setPatientRouteDistanceM] = useState<number | null>(null);
  const [patientDistanceM, setPatientDistanceM] = useState<number | null>(null);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // Ein Eintrag pro Teilstrecke (Start->Stopp1, ..., ->Ziel), Index i steht
  // für die Strecke, die am i-ten Punkt (Start bzw. Zwischenstopp i)
  // beginnt. Markiert, ob der Patient auf dieser Teilstrecke tatsächlich
  // mitfährt (z.B. nicht bei einer Leerfahrt zum Abholen einer Medical
  // Crew). Standard: alles ist Patiententransport.
  const [patientLegs, setPatientLegs] = useState<boolean[]>([true]);

  const legsCount = stops.length + 1;

  useEffect(() => {
    setPatientLegs((prev) =>
      prev.length === legsCount
        ? prev
        : Array.from({ length: legsCount }, (_, i) => prev[i] ?? true),
    );
  }, [legsCount]);

  function toggleLeg(index: number) {
    setPatientLegs((legs) =>
      legs.map((v, i) => (i === index ? !v : v)),
    );
  }

  function addStop() {
    if (stops.length >= 5) return;
    // Neuer Zwischenstopp wird direkt vor dem Ziel (letzter Punkt) eingefügt.
    setPoints((p) => [...p.slice(0, -1), null, p[p.length - 1]]);
  }

  function removeStop(index: number) {
    // index bezieht sich auf die Position innerhalb der Zwischenstopps,
    // in "points" liegt der Zwischenstopp an Position index + 1.
    setPoints((p) => p.filter((_, i) => i !== index + 1));
  }

  function updatePoint(index: number, value: AddressValue | null) {
    setPoints((p) => p.map((x, i) => (i === index ? value : x)));
  }

  function pointLabel(index: number) {
    if (index === 0) return "Start";
    if (index === points.length - 1) return "Ziel";
    return `Zwischenstopp ${index}`;
  }

  function movePoint(from: number, to: number) {
    if (from === to) return;
    setPoints((p) => {
      const arr = [...p];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
    // Nach dem Umsortieren beziehen sich die Teilstrecken auf komplett
    // andere Punktepaare - sicherheitshalber wieder alles als
    // Patiententransport markieren, statt falsche Haken zu übernehmen.
    setPatientLegs(Array(points.length - 1).fill(true));
    setStale(true);
  }

  function handleDragStart(index: number) {
    return (e: React.DragEvent) => {
      setDragIndex(index);
      e.dataTransfer.effectAllowed = "move";
    };
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(index: number) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === index) return;
      movePoint(dragIndex, index);
      setDragIndex(null);
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!start || !destination) {
      setError("Bitte Start und Ziel aus den Adressvorschlägen auswählen.");
      return;
    }
    if (stops.some((s) => !s)) {
      setError("Bitte alle Zwischenstopps aus den Adressvorschlägen auswählen oder entfernen.");
      return;
    }

    setLoading(true);
    setRouteRequestId(null);
    setCandidates([]);
    try {
      const res = await fetch("/api/route-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start,
          stops: stops.filter(Boolean),
          destination,
          vehicleType,
          needsDoctor,
          needsTemperingMattress,
          isEmergency,
          customerId: customerId || null,
          patientLegs,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Fehler bei der Routenberechnung.");
        return;
      }
      setRouteRequestId(data.routeRequestId);
      setRouteGeometry(data.patientRouteGeometry);
      setPatientRouteDistanceM(data.patientRouteDistanceM);
      setPatientDistanceM(data.patientDistanceM);
      setTotalCandidates(data.totalCandidates);
      setCandidates(data.candidates);
      setStale(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!routeRequestId) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/route-requests/${routeRequestId}/candidates?offset=${candidates.length}&limit=5`,
      );
      const data = await res.json();
      const more: Candidate[] = data.candidates.map(
        (c: {
          organizationId: string | null;
          organizationName: string;
          toStartDistanceM: number;
          fromDestDistanceM: number;
          totalRoundTripM: number;
          totalRoundTripWithBufferM: number;
          organization: {
            lat: number;
            lng: number;
            type: OrgType;
            street: string | null;
            postalCode: string | null;
            city: string | null;
          } | null;
        }) => ({
          organizationId: c.organizationId ?? "",
          organizationName: c.organizationName,
          organizationType: c.organization?.type ?? "EXTERN",
          street: c.organization?.street ?? null,
          postalCode: c.organization?.postalCode ?? null,
          city: c.organization?.city ?? null,
          lat: c.organization?.lat ?? 0,
          lng: c.organization?.lng ?? 0,
          toStartDistanceM: c.toStartDistanceM,
          fromDestDistanceM: c.fromDestDistanceM,
          totalRoundTripM: c.totalRoundTripM,
          totalRoundTripWithBufferM: c.totalRoundTripWithBufferM,
        }),
      );
      setCandidates((cs) => [...cs, ...more]);
    } finally {
      setLoadingMore(false);
    }
  }

  const waypoints: MapPoint[] = [
    ...(start
      ? [{ lat: start.lat, lng: start.lng, label: "S", name: start.address }]
      : []),
    ...stops
      .filter((s): s is AddressValue => !!s)
      .map((s, i) => ({
        lat: s.lat,
        lng: s.lng,
        label: `${i + 1}`,
        name: s.address,
      })),
    ...(destination
      ? [
          {
            lat: destination.lat,
            lng: destination.lng,
            label: "Z",
            name: destination.address,
          },
        ]
      : []),
  ];

  const mapCandidates: MapCandidate[] = candidates.map((c, i) => ({
    lat: c.lat,
    lng: c.lng,
    rank: i,
    name: c.organizationName,
    type: c.organizationType,
  }));

  const routeLine: [number, number][] | null = routeGeometry
    ? routeGeometry.coordinates.map(([lng, lat]) => [lat, lng])
    : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
      <div>
        <form
          onSubmit={onSubmit}
          autoComplete="off"
          data-1p-ignore
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
        >
          <p className="text-xs text-slate-400">
            Reihenfolge per Ziehen am Griff <span aria-hidden>⠿</span> anpassen
            – der jeweils erste Punkt ist Start, der letzte Ziel. Mit
            „Patientenstrecke“ markierst du, auf welchen Teilstrecken der
            Patient tatsächlich mitfährt (z. B. abwählen bei einer Leerfahrt
            zum Abholen einer Medical Crew).
          </p>

          {points.map((p, i) => (
            <div
              key={i}
              draggable
              onDragStart={handleDragStart(i)}
              onDragOver={handleDragOver}
              onDrop={handleDrop(i)}
              onDragEnd={() => setDragIndex(null)}
              className={`rounded-md ${
                dragIndex === i ? "opacity-40" : ""
              }`}
            >
              <div className="flex items-end gap-2">
                <span
                  className="mb-2.5 cursor-move select-none px-1 text-slate-400 hover:text-slate-600"
                  title="Ziehen zum Umsortieren"
                  aria-hidden
                >
                  ⠿
                </span>
                <div className="flex-1">
                  <AddressAutocomplete
                    label={pointLabel(i)}
                    value={p}
                    onChange={(v) => updatePoint(i, v)}
                    placeholder={
                      i === 0
                        ? "Abholadresse"
                        : i === points.length - 1
                          ? "Zieladresse"
                          : undefined
                    }
                  />
                </div>
                {i > 0 && i < points.length - 1 && (
                  <button
                    type="button"
                    onClick={() => removeStop(i - 1)}
                    className="mb-0.5 rounded-md border border-slate-300 px-2 py-2 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Entfernen
                  </button>
                )}
              </div>
              {legsCount > 1 && i < points.length - 1 && (
                <label className="mt-1 ml-7 flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={patientLegs[i] ?? true}
                    onChange={() => toggleLeg(i)}
                  />
                  Patientenstrecke
                </label>
              )}
            </div>
          ))}
          {stops.length < 5 && (
            <button
              type="button"
              onClick={addStop}
              className="text-sm text-blue-600 hover:underline"
            >
              + Zwischenstopp hinzufügen
            </button>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Fahrzeugtyp
            </label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as VehicleType)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {Object.entries(vehicleLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={needsDoctor}
                onChange={(e) => setNeedsDoctor(e.target.checked)}
              />
              Arzt erforderlich
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={needsTemperingMattress}
                onChange={(e) => setNeedsTemperingMattress(e.target.checked)}
              />
              Tempurmatratze erforderlich
            </label>
          </div>

          <div className="rounded-md border border-slate-200">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <span>
                Erweiterte Optionen
                {(isEmergency || showPreview) && (
                  <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-normal text-blue-700">
                    aktiv
                  </span>
                )}
              </span>
              <span
                className={`text-slate-400 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                aria-hidden
              >
                ▾
              </span>
            </button>
            {showAdvanced && (
              <div className="space-y-3 border-t border-slate-200 p-3">
                <button
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  className={`w-full rounded-md border px-3 py-1.5 text-xs font-medium ${
                    showPreview
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {showPreview
                    ? `✓ Alle ${vehicleLabels[vehicleType]}-Standorte werden auf der Karte angezeigt`
                    : `Alle ${vehicleLabels[vehicleType]}-Standorte auf Karte anzeigen`}
                </button>

                <label className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  <input
                    type="checkbox"
                    checked={isEmergency}
                    onChange={(e) => setIsEmergency(e.target.checked)}
                  />
                  Notfalltransport (nur leistungsstarke Transporteure)
                </label>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Kunde
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Kein bestimmter Kunde</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {stale && routeRequestId && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Die Route wurde geändert – bitte neu berechnen, damit die
              Ergebnisse aktuell sind.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading
              ? "Berechne Route…"
              : stale && routeRequestId
                ? "Route neu berechnen"
                : "Route berechnen"}
          </button>
        </form>

        {patientRouteDistanceM !== null && patientDistanceM !== null && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 text-sm">
            <p className="text-slate-500">Patientenstrecke</p>
            <p className="text-lg font-semibold text-slate-900">
              {km(patientDistanceM)} km
            </p>
            {Math.abs(patientDistanceM - patientRouteDistanceM) > 1 && (
              <p className="mt-1 text-xs text-slate-400">
                Gesamte Fahrtstrecke (inkl. Teilstrecken ohne Patient):{" "}
                {km(patientRouteDistanceM)} km
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="h-[420px] overflow-hidden rounded-lg border border-slate-200">
          <RouteMap
            waypoints={waypoints}
            routeLine={routeLine}
            candidates={mapCandidates}
            previewOrgs={previewOrgs}
          />
        </div>

        {candidates.length > 0 &&
          candidates[0].toStartDistanceM + candidates[0].fromDestDistanceM >
            FAR_RESULT_THRESHOLD_M && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Hinweis: Der nächstgelegene passende Transporteur hat mit{" "}
            {km(candidates[0].toStartDistanceM + candidates[0].fromDestDistanceM)}{" "}
            km An-/Abfahrt (ohne die eigentliche Fahrtstrecke) einen
            ungewöhnlich weiten Weg zu Start bzw. von Ziel zurück zur Basis.
            Prüfe ggf. Fahrzeugtyp-, Arzt-/Tempurmatratzen- oder
            Kunden-Anforderung.
          </div>
        )}

        {candidates.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Transporteur</th>
                  <th className="px-4 py-3">Basis → Start</th>
                  <th className="px-4 py-3">Ziel → Basis</th>
                  <th className="px-4 py-3">Gesamtumlauf</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map((c, i) => (
                  <tr key={`${c.organizationId}-${i}`}>
                    <td className="px-4 py-3 text-slate-500">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {c.organizationName}
                      {candidateAddress(c) && (
                        <>
                          <br />
                          <span className="text-xs font-normal text-slate-400">
                            {candidateAddress(c)}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {km(c.toStartDistanceM)} km
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {km(c.fromDestDistanceM)} km
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {km(c.totalRoundTripWithBufferM)} km
                      {c.totalRoundTripWithBufferM > c.totalRoundTripM && (
                        <>
                          <br />
                          <span className="text-xs font-normal text-slate-400">
                            inkl. {km(
                              c.totalRoundTripWithBufferM - c.totalRoundTripM,
                            )}{" "}
                            km Puffer
                          </span>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {candidates.length < totalCandidates && (
              <div className="border-t border-slate-100 p-3 text-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-md border border-slate-300 px-4 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60"
                >
                  {loadingMore ? "Lädt…" : "Mehr laden"}
                </button>
              </div>
            )}
          </div>
        )}

        {routeRequestId && candidates.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Keine passenden Transporteure entlang der Route gefunden. Prüfe
            Fahrzeugtyp, Arzt-/Tempurmatratzen-Anforderung, Kunden-Zuordnung
            oder den Korridor-Radius.
          </div>
        )}
      </div>
    </div>
  );
}
