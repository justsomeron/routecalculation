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
  // Ein Eintrag pro Teilstrecke (Start->Stopp1, ..., ->Ziel), markiert ob
  // der Patient auf dieser Teilstrecke tatsächlich transportiert wird (z.B.
  // nicht die Leerfahrt zum Abholen einer Medical Crew). Länge muss
  // stops.length + 1 entsprechen. Wird das Feld weggelassen, gilt die
  // gesamte Fahrt als Patiententransport (bisheriges Verhalten).
  patientLegs?: boolean[];
};

const VEHICLE_COLUMN: Record<VehicleType, string> = {
  PKW: "hasPkw",
  VAN: "hasVan",
  KTW: "hasKtw",
  N_KTW: "hasNKtw",
  RTW: "hasRtw",
  ITW: "hasItw",
};

// ORS Matrix erlaubt maximal ~2500 Quelle×Ziel-Kombinationen pro Aufruf.
// Bei 2 Zielen (Start/Ziel) bleiben wir mit 1000 Kandidaten pro Batch
// deutlich darunter.
const MATRIX_BATCH_SIZE = 1000;

type CandidateOrg = { id: string; name: string; lat: number; lng: number };

// Bewusst KEIN geografischer Vorfilter: Ein Transporteur, der weiter von der
// Routenlinie entfernt liegt, kann trotzdem einen kürzeren echten
// Gesamtumlauf haben als einer, der näher liegt (Distanz-zur-Route ist kein
// verlässlicher Proxy für Basis->Start + Ziel->Basis). Deshalb wird für
// wirklich alle passenden Transporteure der echte Gesamtumlauf berechnet.
async function findCandidateOrganizations(
  input: RouteCalculationInput,
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

async function rankCandidates(
  candidates: CandidateOrg[],
  snappedStart: LngLat,
  snappedDestination: LngLat,
  patientRouteDistanceM: number,
): Promise<RankedCandidate[]> {
  const destinations: LngLat[] = [snappedStart, snappedDestination];

  const ranked: RankedCandidate[] = [];

  for (let i = 0; i < candidates.length; i += MATRIX_BATCH_SIZE) {
    const batch = candidates.slice(i, i + MATRIX_BATCH_SIZE);
    // Rückweg (Ziel -> Basis) wird näherungsweise mit der Hinstrecke
    // (Basis -> Ziel) gleichgesetzt, da ORS für Einbahnstraßen-Effekte keine
    // praktikable Alternative ohne einen zweiten Matrix-Call pro Kandidat
    // bietet.
    const matrix = await getDistanceMatrix(
      batch.map((c): LngLat => [c.lng, c.lat]),
      destinations,
    );

    batch.forEach((c, j) => {
      const toStartDistanceM = matrix[j][0];
      const fromDestDistanceM = matrix[j][1];
      ranked.push({
        organizationId: c.id,
        organizationName: c.name,
        lat: c.lat,
        lng: c.lng,
        toStartDistanceM,
        fromDestDistanceM,
        totalRoundTripM:
          toStartDistanceM + patientRouteDistanceM + fromDestDistanceM,
      });
    });
  }

  return ranked.sort((a, b) => a.totalRoundTripM - b.totalRoundTripM);
}

export async function calculateRoute(input: RouteCalculationInput) {
  const waypoints: LngLat[] = [
    [input.start.lng, input.start.lat],
    ...input.stops.map((s): LngLat => [s.lng, s.lat]),
    [input.destination.lng, input.destination.lat],
  ];

  const patientRoute = await getRoute(waypoints);

  // ORS "snappt" jeden Wegpunkt beim Routing auf den nächsten befahrbaren
  // Straßenpunkt. Für die Matrix-Anfrage (die keinen "radiuses"-Parameter
  // kennt) genau diese bereits gesnappten Koordinaten verwenden statt der
  // rohen Adresskoordinate - so kann bei Punkten wie Flughafen-Terminals
  // kein "could not find routable point"-Fehler mehr auftreten, weil ORS
  // diese Koordinate gerade selbst für die Route benutzt hat.
  const routeCoords = patientRoute.geometry.coordinates as LngLat[];
  const snappedStart = routeCoords[0];
  const snappedDestination = routeCoords[routeCoords.length - 1];

  const patientLegs =
    input.patientLegs?.length === patientRoute.legDistancesM.length
      ? input.patientLegs
      : patientRoute.legDistancesM.map(() => true);
  const patientDistanceM = patientRoute.legDistancesM.reduce(
    (sum, legM, i) => sum + (patientLegs[i] ? legM : 0),
    0,
  );

  const candidates = await findCandidateOrganizations(input);
  const ranked =
    candidates.length > 0
      ? await rankCandidates(
          candidates,
          snappedStart,
          snappedDestination,
          patientRoute.distanceM,
        )
      : [];

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
      patientDistanceM,
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
    patientDistanceM,
    patientRouteGeometry: patientRoute.geometry,
    totalCandidates: ranked.length,
    candidates: ranked.slice(0, 5),
  };
}
