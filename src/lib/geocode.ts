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
    const res = await fetch(url, { headers: nominatimHeaders() });
    if (!res.ok) return null;
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
    const base = process.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org";
    const url = `${base}/search?format=jsonv2&limit=6&countrycodes=de,at,ch&q=${encodeURIComponent(
      normalized,
    )}`;
    const res = await fetch(url, { headers: nominatimHeaders() });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    return data.map((d) => ({
      displayName: d.display_name,
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
    }));
  });
}
