"use client";

import { useState } from "react";
import { BufferTierEditor, TierRow } from "@/components/BufferTierEditor";

type BufferMode = "DEFAULT" | "CUSTOM" | "NONE";

const modeLabels: Record<BufferMode, string> = {
  DEFAULT: "Allgemeine Staffel verwenden",
  CUSTOM: "Eigene Staffel für diesen Kunden",
  NONE: "Kein Puffer für diesen Kunden",
};

export function CustomerBufferSettings({
  customerId,
  initialBufferMode,
  initialTiers,
}: {
  customerId: string;
  initialBufferMode: BufferMode;
  initialTiers: TierRow[];
}) {
  const [bufferMode, setBufferMode] = useState<BufferMode>(initialBufferMode);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function saveMode(mode: BufferMode) {
    setBufferMode(mode);
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/admin/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bufferMode: mode }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function saveTiers(tiers: TierRow[]) {
    const res = await fetch(`/api/admin/customers/${customerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bufferTiers: tiers }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? "Fehler beim Speichern");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          Puffer-Modus
        </p>
        <div className="space-y-1.5">
          {(Object.keys(modeLabels) as BufferMode[]).map((mode) => (
            <label key={mode} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="bufferMode"
                checked={bufferMode === mode}
                onChange={() => saveMode(mode)}
                disabled={saving}
              />
              {modeLabels[mode]}
            </label>
          ))}
        </div>
        {saved && (
          <p className="mt-2 text-sm text-green-700 dark:text-green-400">Gespeichert.</p>
        )}
      </div>

      {bufferMode === "CUSTOM" && (
        <div>
          <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            Eigene Staffel für diesen Kunden
          </p>
          <BufferTierEditor initialTiers={initialTiers} onSave={saveTiers} />
        </div>
      )}
    </div>
  );
}
