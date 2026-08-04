/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

const securityHeaders = {
  "Content-Security-Policy": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https://*.tile.openstreetmap.org https://*.arcgisonline.com; connect-src 'self' https://api.open-meteo.com https://geocoding-api.open-meteo.com https://api.bigdatacloud.net https://www.federalregister.gov https://overpass-api.de https://photon.komoot.io; frame-src https://www.openstreetmap.org; upgrade-insecure-requests",
  "Permissions-Policy": "geolocation=(self), camera=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
} as const;

function secure(response: Response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders)) headers.set(name, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

type LocationResult = { id: number; name: string; latitude: number; longitude: number; admin1?: string; country?: string; country_code?: string };
type Scope = "local" | "city" | "regional" | "state" | "country";
type OsmElement = { id?: number; type?: string; lat?: number; lon?: number; center?: { lat?: number; lon?: number }; tags?: Record<string, string | undefined> };

const scopeRadii: Record<Scope, number> = { local: 8000, city: 28000, regional: 65000, state: 120000, country: 180000 };

function locationResponse(results: LocationResult[]) {
  return new Response(JSON.stringify({ results }), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}

function jsonResponse(data: unknown, maxAge = 300) {
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": `public, max-age=${maxAge}` } });
}

function parsePoint(url: URL): { lat: number; lng: number } | null {
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

function pointFrom(element: OsmElement) {
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat: Number(lat), lng: Number(lng) } : null;
}

async function overpass(query: string): Promise<OsmElement[]> {
  const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error(`Public map service returned ${response.status}`);
  const data = await response.json() as { elements?: OsmElement[] };
  return Array.isArray(data.elements) ? data.elements : [];
}

async function findCandidateLeads(url: URL): Promise<Response> {
  const point = parsePoint(url);
  const requestedScope = url.searchParams.get("scope");
  const scope: Scope = requestedScope === "local" || requestedScope === "city" || requestedScope === "regional" || requestedScope === "state" || requestedScope === "country" ? requestedScope : "city";
  if (!point) return jsonResponse({ candidates: [], message: "A valid latitude and longitude are required." }, 60);
  try {
    // These are map leads, not parcel ownership records. The radius is deliberately capped
    // to keep a public Overpass query responsive even when a country-wide lens is selected.
    const query = `[out:json][timeout:14];way(around:${scopeRadii[scope]},${point.lat},${point.lng})["landuse"~"^(industrial|brownfield|commercial|farmland)$"];out center 80;`;
    const elements = await overpass(query);
    const buckets = new Map<number, { id: string; lat: number; lng: number; name: string; landUse: string; source: "mapped"; distance: number }>();
    for (const element of elements) {
      const center = pointFrom(element);
      if (!center || !element.id) continue;
      const north = center.lat - point.lat;
      const east = (center.lng - point.lng) * Math.cos(point.lat * Math.PI / 180);
      const distance = Math.hypot(north, east);
      if (distance < 0.002) continue;
      const bearing = (Math.atan2(east, north) + Math.PI * 2) % (Math.PI * 2);
      const bucket = Math.floor(bearing / (Math.PI / 4));
      const tags = element.tags ?? {};
      const landUse = tags.landuse || "mapped land";
      const candidate = { id: `osm-${element.type || "way"}-${element.id}`, lat: center.lat, lng: center.lng, name: tags.name || `Mapped ${landUse}`, landUse, source: "mapped" as const, distance };
      const previous = buckets.get(bucket);
      if (!previous || candidate.distance < previous.distance) buckets.set(bucket, candidate);
    }
    const candidates = [...buckets.values()].sort((a, b) => a.distance - b.distance).slice(0, 8).map(({ distance: _distance, ...candidate }) => candidate);
    return jsonResponse({ candidates, source: "OpenStreetMap mapped land-use leads", cappedRadiusM: scopeRadii[scope] }, 300);
  } catch {
    return jsonResponse({ candidates: [], message: "Mapped-area discovery is temporarily unavailable." }, 60);
  }
}

async function candidateEvidence(url: URL): Promise<Response> {
  const point = parsePoint(url);
  if (!point) return jsonResponse({ error: "A valid latitude and longitude are required." }, 60);
  try {
    const query = `[out:json][timeout:14];(nwr(around:5000,${point.lat},${point.lng})["power"~"^(substation|plant|generator)$"];way(around:5000,${point.lat},${point.lng})["highway"~"^(motorway|trunk|primary)$"];way(around:5000,${point.lat},${point.lng})["railway"~"^(rail|light_rail)$"];nwr(around:5000,${point.lat},${point.lng})["landuse"~"^(industrial|brownfield|commercial|farmland)$"];nwr(around:5000,${point.lat},${point.lng})["boundary"="protected_area"];nwr(around:5000,${point.lat},${point.lng})["leisure"="nature_reserve"];nwr(around:5000,${point.lat},${point.lng})["natural"="wetland"];);out center;`;
    const [elements, weatherResponse] = await Promise.all([
      overpass(query),
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lng}&timezone=auto&current=temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation`),
    ]);
    const weatherData = weatherResponse.ok ? await weatherResponse.json() as { elevation?: number; current?: { temperature_2m?: number; wind_speed_10m?: number; wind_gusts_10m?: number; precipitation?: number; time?: string } } : {};
    let power = 0; let transport = 0; let mappedLand = 0; let protectedAreas = 0; let wetlands = 0;
    for (const element of elements) {
      const tags = element.tags ?? {};
      if (tags.power) power += 1;
      if (tags.highway || tags.railway) transport += 1;
      if (tags.landuse) mappedLand += 1;
      if (tags.boundary === "protected_area" || tags.leisure === "nature_reserve") protectedAreas += 1;
      if (tags.natural === "wetland") wetlands += 1;
    }
    const current = weatherData.current;
    return jsonResponse({
      checked: true,
      power: Math.min(power, 99),
      transport: Math.min(transport, 99),
      mappedLand: Math.min(mappedLand, 99),
      protectedAreas: Math.min(protectedAreas, 99),
      wetlands: Math.min(wetlands, 99),
      elevation: Number.isFinite(weatherData.elevation) ? Math.round(Number(weatherData.elevation)) : null,
      weather: current ? { temperature: Number(current.temperature_2m ?? 0), wind: Number(current.wind_speed_10m ?? 0), gusts: Number(current.wind_gusts_10m ?? 0), precipitation: Number(current.precipitation ?? 0), updated: String(current.time ?? "") } : null,
      sources: ["OpenStreetMap / Overpass (5 km screen)", "Open-Meteo (current weather and elevation)"],
    }, 600);
  } catch {
    return jsonResponse({ error: "Public evidence is temporarily unavailable." }, 60);
  }
}

async function findLocations(query: string): Promise<Response> {
  if (query.length < 2 || query.length > 140) return locationResponse([]);
  try {
    const photonResponse = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
    const photon = photonResponse.ok ? await photonResponse.json() as { features?: Array<{ geometry?: { coordinates?: number[] }; properties?: Record<string, string | number | undefined> }> } : {};
    const photonResults = (photon.features ?? []).map((feature, index) => {
      const properties = feature.properties ?? {};
      return { id: Number(properties.osm_id) || index + 1, name: String(properties.name || properties.city || properties.state || query), latitude: Number(feature.geometry?.coordinates?.[1]), longitude: Number(feature.geometry?.coordinates?.[0]), admin1: String(properties.state || properties.county || properties.city || "") || undefined, country: String(properties.country || "") || undefined, country_code: String(properties.countrycode || "") || undefined };
    }).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
    if (photonResults.length) return locationResponse(photonResults);
  } catch { /* Try the secondary provider below. */ }
  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
    const data = response.ok ? await response.json() as { results?: Array<{ id?: number; name?: string; latitude?: number; longitude?: number; admin1?: string; country?: string; country_code?: string }> } : {};
    return locationResponse((data.results ?? []).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)).map((item, index) => ({ id: item.id || index + 1, name: item.name || query, latitude: Number(item.latitude), longitude: Number(item.longitude), admin1: item.admin1, country: item.country, country_code: item.country_code })));
  } catch { return locationResponse([]); }
}

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/location-search") return secure(await findLocations(url.searchParams.get("q")?.trim() ?? ""));
    if (url.pathname === "/api/candidate-search") return secure(await findCandidateLeads(url));
    if (url.pathname === "/api/candidate-evidence") return secure(await candidateEvidence(url));

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return secure(await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths));
    }

    return secure(await handler.fetch(request, env, ctx));
  },
};

export default worker;
