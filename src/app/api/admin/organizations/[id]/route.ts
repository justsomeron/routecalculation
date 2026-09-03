import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["KREISVERBAND", "ORTSVEREIN", "EXTERN"]).optional(),
  externalRef: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  hasPkw: z.boolean().optional(),
  hasVan: z.boolean().optional(),
  hasKtw: z.boolean().optional(),
  hasNKtw: z.boolean().optional(),
  hasRtw: z.boolean().optional(),
  hasItw: z.boolean().optional(),
  hasDoctor: z.boolean().optional(),
  hasTemperingMattress: z.boolean().optional(),
  isHighPerformance: z.boolean().optional(),
  contactName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  contactEmail: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  active: z.boolean().optional(),
  customerIds: z.array(z.string()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 },
    );
  }

  const { customerIds, ...data } = parsed.data;

  if (customerIds) {
    await prisma.organizationCustomer.deleteMany({
      where: { organizationId: id },
    });
  }

  const org = await prisma.organization.update({
    where: { id },
    data: {
      ...data,
      customers: customerIds
        ? { create: customerIds.map((customerId) => ({ customerId })) }
        : undefined,
    },
  });

  return NextResponse.json({ ok: true, organization: org });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.organization.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
