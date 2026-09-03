import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VEHICLE_COLUMN: Record<string, string> = {
  PKW: "hasPkw",
  VAN: "hasVan",
  KTW: "hasKtw",
  N_KTW: "hasNKtw",
  RTW: "hasRtw",
  ITW: "hasItw",
};

// Für die Live-Vorschau auf der Routenkalkulationsseite: alle aktiven
// Transporteure mit dem gewählten Fahrzeugtyp, unabhängig von einer
// konkreten Route. Nur die für die Kartenanzeige nötigen Felder.
export async function GET(req: NextRequest) {
  const vehicleType = req.nextUrl.searchParams.get("vehicleType") ?? "";
  const column = VEHICLE_COLUMN[vehicleType];
  if (!column) {
    return NextResponse.json({ error: "Ungültiger Fahrzeugtyp" }, { status: 400 });
  }

  const organizations = await prisma.organization.findMany({
    where: { active: true, [column]: true },
    select: { id: true, name: true, type: true, lat: true, lng: true },
  });

  return NextResponse.json(organizations);
}
