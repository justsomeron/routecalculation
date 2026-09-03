import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["KREISVERBAND", "ORTSVEREIN", "EXTERN"]),
  externalRef: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
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

export async function GET() {
  const organizations = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    include: { customers: { include: { customer: true } } },
  });
  return NextResponse.json(organizations);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 },
    );
  }

  const { customerIds, ...data } = parsed.data;

  const org = await prisma.organization.create({
    data: {
      ...data,
      customers: customerIds
        ? { create: customerIds.map((customerId) => ({ customerId })) }
        : undefined,
    },
  });

  return NextResponse.json({ ok: true, organization: org });
}
