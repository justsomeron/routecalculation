import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const tierSchema = z.object({
  minKm: z.number().min(0),
  maxKm: z.number().min(0).nullable(),
  bufferKm: z.number().min(0),
});

const schema = z.object({
  name: z.string().min(1).optional(),
  notes: z.string().optional(),
  active: z.boolean().optional(),
  bufferMode: z.enum(["DEFAULT", "CUSTOM", "NONE"]).optional(),
  bufferTiers: z.array(tierSchema).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  }

  const { bufferTiers, ...data } = parsed.data;

  if (bufferTiers) {
    await prisma.$transaction([
      prisma.bufferTier.deleteMany({ where: { customerId: id } }),
      prisma.bufferTier.createMany({
        data: bufferTiers.map((t) => ({ ...t, customerId: id })),
      }),
    ]);
  }

  const customer = await prisma.customer.update({
    where: { id },
    data,
    include: { bufferTiers: true },
  });
  return NextResponse.json({ ok: true, customer });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.customer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
