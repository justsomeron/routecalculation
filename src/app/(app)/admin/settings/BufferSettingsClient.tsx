"use client";

import { BufferTierEditor, TierRow } from "@/components/BufferTierEditor";

export function BufferSettingsClient({
  initialTiers,
}: {
  initialTiers: TierRow[];
}) {
  async function save(tiers: TierRow[]) {
    const res = await fetch("/api/admin/settings/buffer-tiers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tiers }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? "Fehler beim Speichern");
    }
  }

  return <BufferTierEditor initialTiers={initialTiers} onSave={save} />;
}
