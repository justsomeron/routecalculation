import "server-only";

export type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
};

const cache = new Map<string, GeocodeResult | null>();

let lastRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();

// Nominatim-Nutzungsrichtlinie: max. 1 Anfrage/Sekunde, aussagekräftiger User-Agent.
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = Math.max(0, 1100 - (Date.now() - lastRequestAt));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
    return fn();
  });
  queue = run.catch(() => undefined);
  return run;
}

function nominatimHeaders() {
  return {
    "User-Agent": `MedicalOperationsCenter/1.0 (${
      process.env.NOMINATIM_EMAIL ?? "kontakt@example.com"
    })`,
    "Accept-Language": "de",
  };
}

export async function geocodeAddress(
  query: string,
): Promise<GeocodeResult | null> {
  const normalized = query.trim();
  if (!normalized) return null;
  if (cache.has(normalized)) return cache.get(normalized) ?? null;

  const result = await throttled(async () => {
    const base = process.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org";
    const url = `${base}/search?format=jsonv2&limit=1&countrycodes=de,at,ch&q=${encodeURIComponent(
      normalized,
    )}`;
    try {
      const res = await fetch(url, { headers: nominatimHeaders() });
      if (!res.ok) {
        console.error(`Nominatim-Fehler ${res.status} für "${normalized}"`);
        return null;
      }
      const data = (await res.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;
      if (!data.length) return null;
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      };
    } catch (err) {
      console.error(`Nominatim nicht erreichbar für "${normalized}":`, err);
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

type NominatimAddress = {
  amenity?: string;
  aeroway?: string;
  shop?: string;
  tourism?: string;
  building?: string;
  road?: string;
  pedestrian?: string;
  house_number?: string;
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
};

// Baut aus den strukturierten Nominatim-Adressfeldern eine kompakte,
// Google-Maps-artige Bezeichnung statt der vollen Verwaltungshierarchie
// (die "display_name" enthält z.B. auch Stadtteil, Landkreis, Bundesland).
function formatSuggestion(item: {
  name?: string;
  display_name: string;
  address?: NominatimAddress;
}): string {
  const a = item.address;
  if (!a) return item.display_name;

  const poi = item.name || a.amenity || a.aeroway || a.shop || a.tourism;
  const street = a.road || a.pedestrian;
  const streetLine = [street, a.house_number].filter(Boolean).join(" ");
  const city = a.city || a.town || a.village || a.municipality || a.county;
  const cityLine = [a.postcode, city].filter(Boolean).join(" ");

  const parts = [poi, streetLine, cityLine].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : item.display_name;
}

export async function searchAddress(
  query: string,
): Promise<AddressSuggestion[]> {
  const normalized = query.trim();
  if (normalized.length < 3) return [];

  return throttled(async () => {
    const base = process.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org";
    const url = `${base}/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=de,at,ch&q=${encodeURIComponent(
      normalized,
    )}`;
    try {
      const res = await fetch(url, { headers: nominatimHeaders() });
      if (!res.ok) {
        console.error(`Nominatim-Fehler ${res.status} für "${normalized}"`);
        return [];
      }
      const data = (await res.json()) as Array<{
        lat: string;
        lon: string;
        name?: string;
        display_name: string;
        address?: NominatimAddress;
      }>;
      return data.map((d) => ({
        displayName: formatSuggestion(d),
        lat: parseFloat(d.lat),
        lng: parseFloat(d.lon),
      }));
    } catch (err) {
      console.error(`Nominatim nicht erreichbar für "${normalized}":`, err);
      return [];
    }
  });
}
