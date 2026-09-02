import "server-only";

export type LngLat = [number, number];

export type ORSRoute = {
  distanceM: number;
  durationS: number;
  geometry: GeoJSON.LineString;
};

function apiKey() {
  const key = process.env.ORS_API_KEY;
  if (!key || key === "changeme") {
    throw new Error(
      "ORS_API_KEY ist nicht konfiguriert. Bitte einen OpenRouteService-API-Key hinterlegen.",
    );
  }
  return key;
}

export async function getRoute(waypoints: LngLat[]): Promise<ORSRoute> {
  const res = await fetch(
    "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
    {
      method: "POST",
      headers: {
        Authorization: apiKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ coordinates: waypoints }),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouteService Directions-Fehler (${res.status}): ${text}`);
  }

  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) {
    throw new Error("OpenRouteService lieferte keine Route zurück.");
  }

  return {
    distanceM: feature.properties.summary.distance,
    durationS: feature.properties.summary.duration,
    geometry: feature.geometry,
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

  const res = await fetch("https://api.openrouteservice.org/v2/matrix/driving-car", {
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

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouteService Matrix-Fehler (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.distances;
}
