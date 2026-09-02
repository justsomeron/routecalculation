import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const tierSchema = z.object({
  minKm: z.number().min(0),
  maxKm: z.number().min(0).nullable(),
  bufferKm: z.number().min(0),
});

const schema = z.object({
  tiers: z.array(tierSchema),
});

export async function GET() {
  const tiers = await prisma.bufferTier.findMany({
    where: { customerId: null },
    orderBy: { minKm: "asc" },
  });
  return NextResponse.json(tiers);
}

// Ersetzt die komplette allgemeine (globale) Staffel durch die übergebenen
// Stufen - einfacher und weniger fehleranfällig als einzelne Zeilen
// anzulegen/zu bearbeiten/zu löschen, bei einer überschaubaren Anzahl an
// Stufen (typischerweise < 10).
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.bufferTier.deleteMany({ where: { customerId: null } }),
    prisma.bufferTier.createMany({
      data: parsed.data.tiers.map((t) => ({ ...t, customerId: null })),
    }),
  ]);

  const tiers = await prisma.bufferTier.findMany({
    where: { customerId: null },
    orderBy: { minKm: "asc" },
  });
  return NextResponse.json(tiers);
}
