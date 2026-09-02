import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { calculateRoute } from "@/lib/routeCalculation";

const pointSchema = z.object({
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
});

const schema = z.object({
  start: pointSchema,
  stops: z.array(pointSchema).max(3).default([]),
  destination: pointSchema,
  vehicleType: z.enum(["PKW", "VAN", "KTW", "N_KTW", "RTW", "ITW"]),
  needsDoctor: z.boolean().default(false),
  needsTemperingMattress: z.boolean().default(false),
  customerId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" },
      { status: 400 },
    );
  }

  try {
    const result = await calculateRoute({
      ...parsed.data,
      requestedById: user.id,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Fehler bei der Routenberechnung", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Fehler bei der Routenberechnung.",
      },
      { status: 500 },
    );
  }
}
