import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { calculateRoute } from "@/lib/routeCalculation";
import { UserFacingError } from "@/lib/errors";

const FALLBACK_ERROR_MESSAGE =
  "Die Route konnte gerade nicht berechnet werden. Bitte versuche es in Kürze erneut. Falls das Problem bestehen bleibt, wende dich an einen Administrator.";

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
    // Nur explizit als "für Disponenten verständlich" markierte Fehler
    // dürfen in der Oberfläche angezeigt werden. Alles andere (Bugs,
    // Datenbankfehler etc.) zeigt eine generische Meldung - Details landen
    // ausschließlich im Server-Log.
    console.error("Fehler bei der Routenberechnung", err);
    const message =
      err instanceof UserFacingError ? err.message : FALLBACK_ERROR_MESSAGE;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
