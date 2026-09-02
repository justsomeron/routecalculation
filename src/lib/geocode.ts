import "server-only";

export type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
};

const cache = new Map<string, GeocodeResult | null>();

let lastRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();

// Photon ist ein öffentlicher, kostenloser Dienst (komoot) - trotzdem aus
// Fairness gegenüber dem Dienst gedrosselt statt bei jedem Tastendruck neu
// anzufragen.
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = Math.max(0, 300 - (Date.now() - lastRequestAt));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
    return fn();
  });
  queue = run.catch(() => undefined);
  return run;
}

function photonHeaders() {
  return {
    "User-Agent": `MedicalOperationsCenter/1.0 (${
      process.env.GEOCODER_CONTACT_EMAIL ?? "kontakt@example.com"
    })`,
    "Accept-Language": "de",
  };
}

// Deutschland/Österreich/Schweiz als grober Suchraum (Bounding Box), damit
// Ergebnisse aus aller Welt bei mehrdeutigen Namen nicht überwiegen.
const DACH_BBOX = "5.5,45.6,17.3,55.1";

type PhotonProperties = {
  name?: string;
  housenumber?: string;
  street?: string;
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  country?: string;
  osm_key?: string;
  osm_value?: string;
};

type PhotonFeature = {
  geometry: { coordinates: [number, number] }; // [lng, lat]
  properties: PhotonProperties;
};

// OSM taggt in Deutschland z.B. häufig eine Bushaltestelle direkt mit dem
// Namen "Krankenhaus" oder "Flughafen" - ohne Kennzeichnung nicht vom
// eigentlichen Gebäude zu unterscheiden. Nur eine Auswahl an für die
// Einsatzplanung relevanten/verwirrenden Kategorien, keine vollständige Liste.
const TYPE_LABELS: Record<string, string> = {
  "highway:bus_stop": "Bushaltestelle",
  "railway:tram_stop": "Tram-Haltestelle",
  "railway:station": "Bahnhof",
  "railway:halt": "Haltepunkt",
  "public_transport:platform": "Haltestelle",
  "public_transport:stop_position": "Haltestelle",
  "amenity:hospital": "Krankenhaus",
  "amenity:clinic": "Klinik",
  "amenity:doctors": "Arztpraxis",
  "amenity:pharmacy": "Apotheke",
  "amenity:nursing_home": "Pflegeheim",
  "aeroway:aerodrome": "Flughafen",
  "aeroway:terminal": "Flughafen-Terminal",
};

function typeLabel(p: PhotonProperties): string | undefined {
  if (!p.osm_key || !p.osm_value) return undefined;
  return TYPE_LABELS[`${p.osm_key}:${p.osm_value}`];
}

// Baut aus den strukturierten Photon-Feldern eine kompakte, Google-Maps-
// artige Bezeichnung. Bei reinen Straßenadressen liefert Photon "name" oft
// identisch zum Straßennamen - dann wird "name" nicht doppelt angezeigt.
// Der Typ (z.B. "Bushaltestelle" vs. "Krankenhaus") wird angehängt, wenn er
// zur Unterscheidung gleichnamiger Treffer hilfreich ist.
function formatFeature(p: PhotonProperties): string {
  const streetLine = [p.street, p.housenumber].filter(Boolean).join(" ");
  const city = p.city || p.town || p.village;
  const cityLine = [p.postcode, city].filter(Boolean).join(" ");
  const poiName =
    p.name && p.name !== p.street && p.name !== city ? p.name : undefined;
  const rawLabel = typeLabel(p);
  // Label weglassen, wenn der Name das Wort schon enthält (z.B. "Flughafen
  // Innsbruck" braucht kein zusätzliches "(Flughafen)").
  const label =
    rawLabel && !poiName?.toLowerCase().includes(rawLabel.toLowerCase())
      ? rawLabel
      : undefined;
  const poi = poiName && label ? `${poiName} (${label})` : poiName;

  const parts = [poi, streetLine, cityLine].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : (city ?? p.country ?? "");
}

function photonUrl(query: string, limit: number) {
  const base = process.env.PHOTON_URL ?? "https://photon.komoot.io/api";
  return `${base}/?q=${encodeURIComponent(query)}&limit=${limit}&lang=de&bbox=${DACH_BBOX}`;
}

export async function geocodeAddress(
  query: string,
): Promise<GeocodeResult | null> {
  const normalized = query.trim();
  if (!normalized) return null;
  if (cache.has(normalized)) return cache.get(normalized) ?? null;

  const result = await throttled(async () => {
    try {
      const res = await fetch(photonUrl(normalized, 1), {
        headers: photonHeaders(),
      });
      if (!res.ok) {
        console.error(`Photon-Fehler ${res.status} für "${normalized}"`);
        return null;
      }
      const data = (await res.json()) as { features: PhotonFeature[] };
      const feature = data.features?.[0];
      if (!feature) return null;
      return {
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
        displayName: formatFeature(feature.properties),
      };
    } catch (err) {
      console.error(`Photon nicht erreichbar für "${normalized}":`, err);
      return null;
    }
  });

  cache.set(normalized, result);
  return result;
}

export type AddressSuggestion = {
  displayName: string;
  lat: number;
  lng: number;
};

export async function searchAddress(
  query: string,
): Promise<AddressSuggestion[]> {
  const normalized = query.trim();
  if (normalized.length < 3) return [];

  return throttled(async () => {
    try {
      const res = await fetch(photonUrl(normalized, 6), {
        headers: photonHeaders(),
      });
      if (!res.ok) {
        console.error(`Photon-Fehler ${res.status} für "${normalized}"`);
        return [];
      }
      const data = (await res.json()) as { features: PhotonFeature[] };
      return (data.features ?? []).map((f) => ({
        displayName: formatFeature(f.properties),
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      }));
    } catch (err) {
      console.error(`Photon nicht erreichbar für "${normalized}":`, err);
      return [];
    }
  });
}
