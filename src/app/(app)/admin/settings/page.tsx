import { prisma } from "@/lib/prisma";
import { BufferSettingsClient } from "./BufferSettingsClient";

export default async function SettingsPage() {
  const tiers = await prisma.bufferTier.findMany({
    where: { customerId: null },
    orderBy: { minKm: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Einstellungen</h1>
      <p className="mt-1 text-slate-500 dark:text-slate-400">
        Allgemeine Puffer-Staffel für den Gesamtumlauf. Gilt für alle
        Anfragen, außer ein Kunde hat eine eigene Staffel oder ist auf
        &bdquo;kein Puffer&ldquo; gestellt (siehe Kundenverwaltung).
      </p>
      <div className="mt-6 max-w-2xl">
        <BufferSettingsClient
          initialTiers={tiers.map((t) => ({
            minKm: t.minKm,
            maxKm: t.maxKm,
            bufferKm: t.bufferKm,
          }))}
        />
      </div>
    </div>
  );
}
