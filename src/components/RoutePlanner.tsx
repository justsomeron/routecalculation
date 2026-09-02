"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AddressAutocomplete, AddressValue } from "@/components/AddressAutocomplete";
import type { MapCandidate, MapPoint } from "@/components/RouteMap";

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

type Candidate = {
  organizationId: string;
  organizationName: string;
  lat: number;
  lng: number;
  toStartDistanceM: number;
  fromDestDistanceM: number;
  totalRoundTripM: number;
};

type Customer = { id: string; name: string };

function km(meters: number) {
  return (meters / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

// Ab dieser Entfernung des nächstgelegenen Transporteurs ein Hinweis, dass es
// sich um ein ungewöhnlich weit entferntes Ergebnis handelt (z.B. bei sehr
// speziellen Anforderungen, die kaum ein Transporteur erfüllt).
const FAR_RESULT_THRESHOLD_M = 150_000;

export function RoutePlanner({ customers }: { customers: Customer[] }) {
  const [start, setStart] = useState<AddressValue | null>(null);
  const [stops, setStops] = useState<(AddressValue | null)[]>([]);
  const [destination, setDestination] = useState<AddressValue | null>(null);
  const [vehicleType, setVehicleType] = useState<VehicleType>("KTW");
  const [needsDoctor, setNeedsDoctor] = useState(false);
  const [needsTemperingMattress, setNeedsTemperingMattress] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

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
    setStops((s) => [...s, null]);
  }

  function removeStop(index: number) {
    setStops((s) => s.filter((_, i) => i !== index));
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
          organization: { lat: number; lng: number } | null;
        }) => ({
          organizationId: c.organizationId ?? "",
          organizationName: c.organizationName,
          lat: c.organization?.lat ?? 0,
          lng: c.organization?.lng ?? 0,
          toStartDistanceM: c.toStartDistanceM,
          fromDestDistanceM: c.fromDestDistanceM,
          totalRoundTripM: c.totalRoundTripM,
        }),
      );
      setCandidates((cs) => [...cs, ...more]);
    } finally {
      setLoadingMore(false);
    }
  }

  const waypoints: MapPoint[] = [
    ...(start ? [{ lat: start.lat, lng: start.lng, label: "S" }] : []),
    ...stops
      .filter((s): s is AddressValue => !!s)
      .map((s, i) => ({ lat: s.lat, lng: s.lng, label: `Z${i + 1}` })),
    ...(destination
      ? [{ lat: destination.lat, lng: destination.lng, label: "Z" }]
      : []),
  ];

  const mapCandidates: MapCandidate[] = candidates.map((c, i) => ({
    lat: c.lat,
    lng: c.lng,
    rank: i,
    name: c.organizationName,
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
          <AddressAutocomplete label="Start" value={start} onChange={setStart} placeholder="Abholadresse" />
          {legsCount > 1 && (
            <div className="-mt-2">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={patientLegs[0] ?? true}
                  onChange={() => toggleLeg(0)}
                />
                Patientenstrecke
              </label>
              <p className="mt-0.5 text-xs text-slate-400">
                Markiert die Teilstrecke ab diesem Punkt (z. B. abwählen bei
                einer Leerfahrt zum Abholen einer Medical Crew)
              </p>
            </div>
          )}

          {stops.map((s, i) => (
            <div key={i}>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <AddressAutocomplete
                    label={`Zwischenstopp ${i + 1}`}
                    value={s}
                    onChange={(v) =>
                      setStops((arr) => arr.map((x, idx) => (idx === i ? v : x)))
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeStop(i)}
                  className="mb-0.5 rounded-md border border-slate-300 px-2 py-2 text-xs text-slate-600 hover:bg-slate-50"
                >
                  Entfernen
                </button>
              </div>
              {legsCount > 1 && (
                <label className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={patientLegs[i + 1] ?? true}
                    onChange={() => toggleLeg(i + 1)}
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

          <AddressAutocomplete
            label="Ziel"
            value={destination}
            onChange={setDestination}
            placeholder="Zieladresse"
          />

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

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Berechne Route…" : "Route berechnen"}
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
          <RouteMap waypoints={waypoints} routeLine={routeLine} candidates={mapCandidates} />
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
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {km(c.toStartDistanceM)} km
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {km(c.fromDestDistanceM)} km
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {km(c.totalRoundTripM)} km
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
