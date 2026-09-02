import "server-only";
import { Prisma, VehicleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRoute, getDistanceMatrix, type LngLat } from "@/lib/ors";

export type RoutePoint = {
  address: string;
  lat: number;
  lng: number;
};

export type RouteCalculationInput = {
  requestedById: string;
  start: RoutePoint;
  stops: RoutePoint[]; // 0-3 Zwischenstopps, in Reihenfolge
  destination: RoutePoint;
  vehicleType: VehicleType;
  needsDoctor: boolean;
  needsTemperingMattress: boolean;
  customerId?: string | null;
};

const VEHICLE_COLUMN: Record<VehicleType, string> = {
  PKW: "hasPkw",
  VAN: "hasVan",
  KTW: "hasKtw",
  N_KTW: "hasNKtw",
  RTW: "hasRtw",
  ITW: "hasItw",
};

const CORRIDOR_BUFFER_M = Number(process.env.ROUTE_CORRIDOR_BUFFER_M ?? 30000);

type CandidateOrg = { id: string; name: string; lat: number; lng: number };

async function findCandidateOrganizations(
  input: RouteCalculationInput,
  routeGeoJson: GeoJSON.LineString,
  restrictToCorridor: boolean,
): Promise<CandidateOrg[]> {
  const vehicleColumn = VEHICLE_COLUMN[input.vehicleType];

  return prisma.$queryRaw<CandidateOrg[]>(Prisma.sql`
    SELECT o.id, o.name, o.lat, o.lng
    FROM "Organization" o
    WHERE o.active = true
      AND o.${Prisma.raw(`"${vehicleColumn}"`)} = true
      AND (${input.needsDoctor} = false OR o."hasDoctor" = true)
      AND (${input.needsTemperingMattress} = false OR o."hasTemperingMattress" = true)
      AND (
        ${input.customerId ?? null}::text IS NULL
        OR EXISTS (
          SELECT 1 FROM "OrganizationCustomer" oc
          WHERE oc."organizationId" = o.id AND oc."customerId" = ${input.customerId ?? null}
        )
      )
      ${
        restrictToCorridor
          ? Prisma.sql`AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(o.lng, o.lat), 4326)::geography,
        ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(routeGeoJson)}), 4326)::geography,
        ${CORRIDOR_BUFFER_M}
      )`
          : Prisma.empty
      }
  `);
}

export type RankedCandidate = {
  organizationId: string;
  organizationName: string;
  lat: number;
  lng: number;
  toStartDistanceM: number;
  fromDestDistanceM: number;
  totalRoundTripM: number;
};

export async function calculateRoute(input: RouteCalculationInput) {
  const waypoints: LngLat[] = [
    [input.start.lng, input.start.lat],
    ...input.stops.map((s): LngLat => [s.lng, s.lat]),
    [input.destination.lng, input.destination.lat],
  ];

  const patientRoute = await getRoute(waypoints);

  let candidates = await findCandidateOrganizations(
    input,
    patientRoute.geometry,
    true,
  );

  // Falls im Korridor niemand Passendes liegt, lieber bundesweit die
  // nächstgelegenen zeigen als "keine Transporteure gefunden" - der
  // Dispo braucht immer eine Antwort, auch wenn die Anfahrt weit ist.
  let usedNationwideFallback = false;
  if (candidates.length === 0) {
    candidates = await findCandidateOrganizations(
      input,
      patientRoute.geometry,
      false,
    );
    usedNationwideFallback = candidates.length > 0;
  }

  let ranked: RankedCandidate[] = [];

  if (candidates.length > 0) {
    // Rückweg (Ziel -> Basis) wird näherungsweise mit der Hinstrecke (Basis -> Ziel)
    // gleichgesetzt, da ORS für Einbahnstraßen-Effekte keine praktikable Alternative
    // ohne einen zweiten Matrix-Call pro Kandidat bietet.
    const matrix = await getDistanceMatrix(
      candidates.map((c): LngLat => [c.lng, c.lat]),
      [
        [input.start.lng, input.start.lat],
        [input.destination.lng, input.destination.lat],
      ],
    );

    ranked = candidates
      .map((c, i) => {
        const toStartDistanceM = matrix[i][0];
        const fromDestDistanceM = matrix[i][1];
        return {
          organizationId: c.id,
          organizationName: c.name,
          lat: c.lat,
          lng: c.lng,
          toStartDistanceM,
          fromDestDistanceM,
          totalRoundTripM:
            toStartDistanceM + patientRoute.distanceM + fromDestDistanceM,
        };
      })
      .sort((a, b) => a.totalRoundTripM - b.totalRoundTripM);
  }

  const routeRequest = await prisma.routeRequest.create({
    data: {
      requestedById: input.requestedById,
      customerId: input.customerId ?? null,
      vehicleType: input.vehicleType,
      needsDoctor: input.needsDoctor,
      needsTemperingMattress: input.needsTemperingMattress,
      startAddress: input.start.address,
      startLat: input.start.lat,
      startLng: input.start.lng,
      destinationAddress: input.destination.address,
      destLat: input.destination.lat,
      destLng: input.destination.lng,
      totalPatientRouteDistanceM: patientRoute.distanceM,
      routeGeoJson: patientRoute.geometry as unknown as Prisma.InputJsonValue,
      stops: {
        create: input.stops.map((s, i) => ({
          orderIndex: i,
          address: s.address,
          lat: s.lat,
          lng: s.lng,
        })),
      },
      candidates: {
        create: ranked.map((r, i) => ({
          rank: i,
          organizationId: r.organizationId,
          organizationName: r.organizationName,
          toStartDistanceM: r.toStartDistanceM,
          fromDestDistanceM: r.fromDestDistanceM,
          totalRoundTripM: r.totalRoundTripM,
        })),
      },
    },
  });

  return {
    routeRequestId: routeRequest.id,
    patientRouteDistanceM: patientRoute.distanceM,
    patientRouteGeometry: patientRoute.geometry,
    totalCandidates: ranked.length,
    candidates: ranked.slice(0, 5),
    usedNationwideFallback,
  };
}
