"use client";

import { useState } from "react";

export type TierRow = { minKm: number; maxKm: number | null; bufferKm: number };

export function BufferTierEditor({
  initialTiers,
  onSave,
}: {
  initialTiers: TierRow[];
  onSave: (tiers: TierRow[]) => Promise<void>;
}) {
  const [tiers, setTiers] = useState<TierRow[]>(initialTiers);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function updateTier(i: number, patch: Partial<TierRow>) {
    setSaved(false);
    setTiers((ts) => ts.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }

  function addTier() {
    setSaved(false);
    const last = tiers[tiers.length - 1];
    setTiers((ts) => [
      ...ts,
      { minKm: last ? (last.maxKm ?? last.minKm + 50) : 0, maxKm: null, bufferKm: 0 },
    ]);
  }

  function removeTier(i: number) {
    setSaved(false);
    setTiers((ts) => ts.filter((_, idx) => idx !== i));
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const sorted = [...tiers].sort((a, b) => a.minKm - b.minKm);
      await onSave(sorted);
      setTiers(sorted);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900 text-left text-xs uppercase text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2">Gesamtumlauf von (km)</th>
              <th className="px-4 py-2">bis (km, leer = offen)</th>
              <th className="px-4 py-2">Puffer (km)</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {tiers.map((t, i) => (
              <tr key={i}>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min={0}
                    value={t.minKm}
                    onChange={(e) =>
                      updateTier(i, { minKm: Number(e.target.value) })
                    }
                    className="w-24 rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min={0}
                    value={t.maxKm ?? ""}
                    placeholder="offen"
                    onChange={(e) =>
                      updateTier(i, {
                        maxKm:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="w-24 rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    min={0}
                    value={t.bufferKm}
                    onChange={(e) =>
                      updateTier(i, { bufferKm: Number(e.target.value) })
                    }
                    className="w-24 rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1"
                  />
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    onClick={() => removeTier(i)}
                    className="text-xs text-red-600 dark:text-red-400 hover:underline"
                  >
                    Entfernen
                  </button>
                </td>
              </tr>
            ))}
            {tiers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-center text-slate-400 dark:text-slate-500">
                  Keine Stufen – es wird kein Puffer angewendet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={addTier}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          + Stufe hinzufügen
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Speichern…" : "Speichern"}
        </button>
        {saved && <span className="text-sm text-green-700 dark:text-green-400">Gespeichert.</span>}
      </div>
    </div>
  );
}
