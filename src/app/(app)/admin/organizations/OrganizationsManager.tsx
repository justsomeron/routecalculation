"use client";

import { useRef, useState } from "react";
import { AddressAutocomplete, AddressValue } from "@/components/AddressAutocomplete";

type Customer = { id: string; name: string; active: boolean };

type Organization = {
  id: string;
  name: string;
  type: "KREISVERBAND" | "ORTSVEREIN" | "EXTERN";
  externalRef: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  lat: number;
  lng: number;
  hasPkw: boolean;
  hasVan: boolean;
  hasKtw: boolean;
  hasNKtw: boolean;
  hasRtw: boolean;
  hasItw: boolean;
  hasDoctor: boolean;
  hasTemperingMattress: boolean;
  isHighPerformance: boolean;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  notes: string | null;
  active: boolean;
  customers: { customer: Customer }[];
};

const typeLabels: Record<Organization["type"], string> = {
  KREISVERBAND: "Kreisverband",
  ORTSVEREIN: "Ortsverein",
  EXTERN: "Extern (Nicht-DRK)",
};

type VehicleKey =
  | "hasPkw"
  | "hasVan"
  | "hasKtw"
  | "hasNKtw"
  | "hasRtw"
  | "hasItw";

const vehicleFields: { key: VehicleKey; label: string }[] = [
  { key: "hasPkw", label: "PKW" },
  { key: "hasVan", label: "VAN" },
  { key: "hasKtw", label: "KTW" },
  { key: "hasNKtw", label: "N-KTW" },
  { key: "hasRtw", label: "RTW" },
  { key: "hasItw", label: "ITW" },
];

type FormState = {
  name: string;
  type: Organization["type"];
  address: AddressValue | null;
  hasPkw: boolean;
  hasVan: boolean;
  hasKtw: boolean;
  hasNKtw: boolean;
  hasRtw: boolean;
  hasItw: boolean;
  hasDoctor: boolean;
  hasTemperingMattress: boolean;
  isHighPerformance: boolean;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  notes: string;
  customerIds: string[];
};

const emptyForm: FormState = {
  name: "",
  type: "KREISVERBAND",
  address: null,
  hasPkw: false,
  hasVan: false,
  hasKtw: false,
  hasNKtw: false,
  hasRtw: false,
  hasItw: false,
  hasDoctor: false,
  hasTemperingMattress: false,
  isHighPerformance: false,
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  notes: "",
  customerIds: [],
};

export function OrganizationsManager({
  initialOrganizations,
  customers,
}: {
  initialOrganizations: Organization[];
  customers: Customer[];
}) {
  const [organizations, setOrganizations] = useState(initialOrganizations);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    summary: { total: number; created: number; updated: number; errors: number };
    results: { row: number; name: string; status: string; message?: string }[];
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const res = await fetch("/api/admin/organizations");
    if (res.ok) setOrganizations(await res.json());
  }

  function startEdit(org: Organization) {
    setEditing(org.id);
    setForm({
      name: org.name,
      type: org.type,
      address: {
        address: [org.street, org.postalCode, org.city].filter(Boolean).join(", "),
        lat: org.lat,
        lng: org.lng,
      },
      hasPkw: org.hasPkw,
      hasVan: org.hasVan,
      hasKtw: org.hasKtw,
      hasNKtw: org.hasNKtw,
      hasRtw: org.hasRtw,
      hasItw: org.hasItw,
      hasDoctor: org.hasDoctor,
      hasTemperingMattress: org.hasTemperingMattress,
      isHighPerformance: org.isHighPerformance,
      contactName: org.contactName ?? "",
      contactPhone: org.contactPhone ?? "",
      contactEmail: org.contactEmail ?? "",
      notes: org.notes ?? "",
      customerIds: org.customers.map((c) => c.customer.id),
    });
    setError(null);
  }

  function startNew() {
    setEditing("new");
    setForm(emptyForm);
    setError(null);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.address) {
      setError("Bitte eine gültige Adresse aus den Vorschlägen auswählen.");
      return;
    }

    const payload = {
      name: form.name,
      type: form.type,
      street: form.address.address,
      lat: form.address.lat,
      lng: form.address.lng,
      hasPkw: form.hasPkw,
      hasVan: form.hasVan,
      hasKtw: form.hasKtw,
      hasNKtw: form.hasNKtw,
      hasRtw: form.hasRtw,
      hasItw: form.hasItw,
      hasDoctor: form.hasDoctor,
      hasTemperingMattress: form.hasTemperingMattress,
      isHighPerformance: form.isHighPerformance,
      contactName: form.contactName || null,
      contactPhone: form.contactPhone || null,
      contactEmail: form.contactEmail || null,
      notes: form.notes || null,
      customerIds: form.customerIds,
    };

    setLoading(true);
    try {
      const res =
        editing === "new"
          ? await fetch("/api/admin/organizations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/admin/organizations/${editing}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Fehler beim Speichern");
        return;
      }
      setEditing(null);
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function remove(org: Organization) {
    if (!confirm(`Transporteur "${org.name}" wirklich löschen?`)) return;
    await fetch(`/api/admin/organizations/${org.id}`, { method: "DELETE" });
    await refresh();
  }

  async function toggleActive(org: Organization) {
    await fetch(`/api/admin/organizations/${org.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !org.active }),
    });
    await refresh();
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/organizations/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult(data);
        await refresh();
      } else {
        setError(data.error ?? "Fehler beim Import");
      }
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function toggleCustomer(id: string) {
    setForm((f) => ({
      ...f,
      customerIds: f.customerIds.includes(id)
        ? f.customerIds.filter((c) => c !== id)
        : [...f.customerIds, id],
    }));
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="cursor-pointer rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {importing ? "Importiere…" : "Excel-Import"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onImportFile}
              disabled={importing}
              className="hidden"
            />
          </label>
        </div>
        <button
          onClick={startNew}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Neuer Transporteur
        </button>
      </div>

      {importResult && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-900">
            Import abgeschlossen: {importResult.summary.created} neu,{" "}
            {importResult.summary.updated} aktualisiert,{" "}
            {importResult.summary.errors} Fehler (von{" "}
            {importResult.summary.total} Zeilen).
          </p>
          {importResult.summary.errors > 0 && (
            <ul className="mt-2 max-h-40 overflow-auto text-sm text-red-700">
              {importResult.results
                .filter((r) => r.status === "error")
                .map((r, i) => (
                  <li key={i}>
                    Zeile {r.row} ({r.name}): {r.message}
                  </li>
                ))}
            </ul>
          )}
          <button
            onClick={() => setImportResult(null)}
            className="mt-2 text-xs text-slate-500 hover:underline"
          >
            Schließen
          </button>
        </div>
      )}

      {editing && (
        <form
          onSubmit={save}
          className="mb-6 space-y-4 rounded-lg border border-slate-200 bg-white p-5"
        >
          <h2 className="font-semibold text-slate-900">
            {editing === "new" ? "Neuer Transporteur" : "Transporteur bearbeiten"}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Name
              </label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Typ
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as Organization["type"],
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {Object.entries(typeLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <AddressAutocomplete
            label="Standort-Adresse"
            value={form.address}
            onChange={(v) => setForm((f) => ({ ...f, address: v }))}
            placeholder="Straße, PLZ Ort"
          />

          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">
              Fahrzeugtypen
            </p>
            <div className="flex flex-wrap gap-4">
              {vehicleFields.map((vf) => (
                <label key={vf.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form[vf.key] as boolean}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [vf.key]: e.target.checked }))
                    }
                  />
                  {vf.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.hasDoctor}
                onChange={(e) =>
                  setForm((f) => ({ ...f, hasDoctor: e.target.checked }))
                }
              />
              Ärzte verfügbar
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.hasTemperingMattress}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    hasTemperingMattress: e.target.checked,
                  }))
                }
              />
              Tempurmatratze
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isHighPerformance}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    isHighPerformance: e.target.checked,
                  }))
                }
              />
              Leistungsstark (für Notfalltransporte)
            </label>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">
              Kunden (für wen wird gefahren?)
            </p>
            <div className="flex flex-wrap gap-3">
              {customers.map((c) => (
                <label key={c.id} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={form.customerIds.includes(c.id)}
                    onChange={() => toggleCustomer(c.id)}
                  />
                  {c.name}
                </label>
              ))}
              {customers.length === 0 && (
                <p className="text-sm text-slate-400">
                  Noch keine Kunden angelegt.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Kontakt Name
              </label>
              <input
                value={form.contactName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactName: e.target.value }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Kontakt Telefon
              </label>
              <input
                value={form.contactPhone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactPhone: e.target.value }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Kontakt E-Mail
              </label>
              <input
                value={form.contactEmail}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactEmail: e.target.value }))
                }
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Notizen
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={2}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Speichern…" : "Speichern"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Typ</th>
              <th className="px-4 py-3">Ort</th>
              <th className="px-4 py-3">Fahrzeuge</th>
              <th className="px-4 py-3">Ärzte</th>
              <th className="px-4 py-3">Tempur.</th>
              <th className="px-4 py-3">Leistungsstark</th>
              <th className="px-4 py-3">Kunden</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {organizations.map((org) => (
              <tr key={org.id}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {org.name}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {typeLabels[org.type]}
                </td>
                <td className="px-4 py-3 text-slate-600">{org.city ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {vehicleFields
                    .filter((vf) => org[vf.key])
                    .map((vf) => vf.label)
                    .join(", ") || "—"}
                </td>
                <td className="px-4 py-3">{org.hasDoctor ? "Ja" : "Nein"}</td>
                <td className="px-4 py-3">
                  {org.hasTemperingMattress ? "Ja" : "Nein"}
                </td>
                <td className="px-4 py-3">
                  {org.isHighPerformance ? "Ja" : "Nein"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {org.customers.map((c) => c.customer.name).join(", ") || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      org.active
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {org.active ? "Aktiv" : "Inaktiv"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(org)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => toggleActive(org)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      {org.active ? "Deaktivieren" : "Aktivieren"}
                    </button>
                    <button
                      onClick={() => remove(org)}
                      className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                    >
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {organizations.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-slate-400">
                  Noch keine Transporteure angelegt.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
