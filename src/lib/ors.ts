import "server-only";
import { UserFacingError } from "@/lib/errors";

export type LngLat = [number, number];

export type ORSRoute = {
  distanceM: number;
  durationS: number;
  geometry: GeoJSON.LineString;
  // Distanz je Teilstrecke zwischen zwei aufeinanderfolgenden Wegpunkten
  // (Start->Stopp1, Stopp1->Stopp2, ..., ->Ziel), in derselben Reihenfolge.
  legDistancesM: number[];
};

function apiKey() {
  const key = process.env.ORS_API_KEY;
  if (!key || key === "changeme") {
    throw new UserFacingError(
      "ORS_API_KEY ist nicht konfiguriert. Bitte einen OpenRouteService-API-Key hinterlegen.",
    );
  }
  return key;
}

const GENERIC_ERROR_MESSAGE =
  "Die Route konnte gerade nicht berechnet werden. Bitte versuche es in Kürze erneut. Falls das Problem bestehen bleibt, wende dich an einen Administrator.";

const ROUTABLE_POINT_ERROR_MESSAGE =
  "Für eine der angegebenen Adressen (Start, Ziel oder Zwischenstopp) konnte keine befahrbare Straße in der Nähe gefunden werden. Bitte die Adresse noch einmal aus den Vorschlägen auswählen oder einen etwas anderen Punkt in der Nähe angeben (z. B. die Straße statt eines Gebäudeteils).";

// Baut aus einer fehlgeschlagenen ORS-Antwort eine für Disponenten
// verständliche, deutsche Fehlermeldung. Die technischen Details (Status,
// Rohantwort) werden nur ins Server-Log geschrieben, nie an die Oberfläche
// durchgereicht - dort soll nie ein rohes JSON/Technik-Fehler auftauchen.
async function buildORSError(res: Response, context: string): Promise<UserFacingError> {
  const text = await res.text().catch(() => "");
  console.error(`OpenRouteService ${context}-Fehler (${res.status}):`, text);

  let code: number | undefined;
  try {
    code = JSON.parse(text)?.error?.code;
  } catch {
    // Antwort war kein JSON - ignorieren, generische Meldung greift unten.
  }

  // ORS-Fehlercode 2010: "Could not find routable point within a radius
  // of X meters" - der Adresspunkt selbst ist mit dem Auto nicht
  // erreichbar (z.B. mitten in einem Gebäude/auf einem Vorfeld).
  if (code === 2010) {
    return new UserFacingError(ROUTABLE_POINT_ERROR_MESSAGE);
  }

  return new UserFacingError(GENERIC_ERROR_MESSAGE);
}

function networkError(context: string, err: unknown): UserFacingError {
  console.error(`OpenRouteService (${context}) nicht erreichbar:`, err);
  return new UserFacingError(GENERIC_ERROR_MESSAGE);
}

export async function getRoute(waypoints: LngLat[]): Promise<ORSRoute> {
  let res: Response;
  try {
    res = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      {
        method: "POST",
        headers: {
          Authorization: apiKey(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates: waypoints,
          // -1 = unbegrenzte Suche nach der nächsten befahrbaren Straße.
          // Ohne das schlägt ORS bei Punkten wie Flughafen-Terminals fehl,
          // weil der exakte Adresspunkt selbst nicht mit dem Auto erreichbar
          // ist. Das deckt die allermeisten Fälle automatisch ab - bleibt es
          // trotzdem erfolglos, greift die Fehlermeldung unten.
          radiuses: waypoints.map(() => -1),
        }),
      },
    );
  } catch (err) {
    throw networkError("Directions", err);
  }

  if (!res.ok) {
    throw await buildORSError(res, "Directions");
  }

  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) {
    console.error("OpenRouteService Directions lieferte kein Feature:", data);
    throw new UserFacingError(GENERIC_ERROR_MESSAGE);
  }

  const segments = feature.properties.segments as Array<{
    distance: number;
  }>;

  return {
    distanceM: feature.properties.summary.distance,
    durationS: feature.properties.summary.duration,
    geometry: feature.geometry,
    legDistancesM: segments.map((s) => s.distance),
  };
}

// Liefert Distanzen (Meter) von jeder `sources`-Position zu jeder `destinations`-Position,
// in genau dieser Reihenfolge (matrix[i][j] = Distanz von sources[i] zu destinations[j]).
export async function getDistanceMatrix(
  sources: LngLat[],
  destinations: LngLat[],
): Promise<number[][]> {
  const locations = [...sources, ...destinations];
  const sourceIndices = sources.map((_, i) => i);
  const destinationIndices = destinations.map((_, i) => sources.length + i);

  let res: Response;
  try {
    res = await fetch("https://api.openrouteservice.org/v2/matrix/driving-car", {
      method: "POST",
      headers: {
        Authorization: apiKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locations,
        sources: sourceIndices,
        destinations: destinationIndices,
        metrics: ["distance"],
        units: "m",
      }),
    });
  } catch (err) {
    throw networkError("Matrix", err);
  }

  if (!res.ok) {
    throw await buildORSError(res, "Matrix");
  }

  const data = await res.json();
  return data.distances;
}
