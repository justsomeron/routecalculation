import "server-only";
import { prisma } from "@/lib/prisma";

export type BufferTierRow = {
  minKm: number;
  maxKm: number | null;
  bufferKm: number;
};

// Ermittelt, welche Staffel für eine Anfrage gilt: Hat der Kunde eine eigene
// Staffel (bufferMode "CUSTOM"), gilt ausschließlich diese. Ist der Kunde auf
// "NONE" gestellt, gibt es gar keinen Puffer. Sonst (kein Kunde angegeben,
// oder Kunde auf "DEFAULT") gilt die allgemeine (globale) Staffel. Es wird
// nie addiert - immer nur genau eine Staffel angewendet.
export async function getApplicableBufferTiers(
  customerId: string | null,
): Promise<BufferTierRow[]> {
  if (customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { bufferTiers: true },
    });
    if (customer?.bufferMode === "NONE") return [];
    if (customer?.bufferMode === "CUSTOM") return customer.bufferTiers;
  }

  return prisma.bufferTier.findMany({ where: { customerId: null } });
}

export function findBufferKm(tiers: BufferTierRow[], totalKm: number): number {
  const match = tiers.find(
    (t) => totalKm >= t.minKm && (t.maxKm === null || totalKm <= t.maxKm),
  );
  return match?.bufferKm ?? 0;
}
