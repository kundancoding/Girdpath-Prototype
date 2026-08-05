/** Cloudflare Worker entry point for the GridPath public-data model. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

const securityHeaders = {
  "Content-Security-Policy": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https://*.tile.openstreetmap.org https://*.arcgisonline.com; connect-src 'self' https://api.open-meteo.com https://air-quality-api.open-meteo.com https://geocoding-api.open-meteo.com https://api.bigdatacloud.net https://www.federalregister.gov https://overpass-api.de https://maps.mail.ru https://photon.komoot.io; frame-src https://www.openstreetmap.org; upgrade-insecure-requests",
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
type Point = { lat: number; lng: number };

const scopeRadii: Record<Scope, number> = { local: 12000, city: 50000, regional: 110000, state: 180000, country: 240000 };
const landUses = new Set(["industrial", "brownfield", "commercial", "farmland", "construction", "quarry"]);

function jsonResponse(data: unknown, maxAge = 300) {
  return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": `public, max-age=${maxAge}` } });
}
function locationResponse(results: LocationResult[]) { return jsonResponse({ results }, 300); }
function parsePoint(url: URL): Point | null {
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}
function pointFrom(element: OsmElement): Point | null {
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat: Number(lat), lng: Number(lng) } : null;
}
function distanceKm(a: Point, b: Point) {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
async function overpass(query: string): Promise<OsmElement[]> {
  const endpoints = ["https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass-api.de/api/interpreter"];
  let lastError = "Public map service did not respond.";
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "GridPath public-map screening" }, body: `data=${encodeURIComponent(query)}` });
      if (!response.ok) { lastError = `Public map service returned ${response.status}`; continue; }
      const data = await response.json() as { elements?: OsmElement[] };
      return Array.isArray(data.elements) ? data.elements : [];
    } catch { lastError = "Public map service could not be reached."; }
  }
  throw new Error(lastError);
}
function requestedScope(value: string | null): Scope { return value === "local" || value === "city" || value === "regional" || value === "state" || value === "country" ? value : "city"; }
function useScore(tags: Record<string, string | undefined>, project: string) {
  const land = tags.landuse || "";
  const lower = project.toLowerCase();
  let score = land === "brownfield" ? 8 : land === "industrial" ? 7 : land === "construction" ? 6 : land === "commercial" ? 5 : land === "farmland" ? 4 : land === "quarry" ? 3 : 2;
  if (lower.includes("data center") && ["industrial", "brownfield", "commercial"].includes(land)) score += 5;
  if ((lower.includes("solar") || lower.includes("wind")) && ["farmland", "brownfield", "quarry"].includes(land)) score += 5;
  if (lower.includes("transmission") && tags.power) score += 6;
  if (lower.includes("nuclear") && ["industrial", "brownfield"].includes(land)) score += 4;
  if (tags.name) score += 1;
  return score;
}

async function findCandidateLeads(url: URL): Promise<Response> {
  const point = parsePoint(url);
  const scope = requestedScope(url.searchParams.get("scope"));
  const project = (url.searchParams.get("project") || "").slice(0, 80);
  if (!point) return jsonResponse({ candidates: [], message: "A valid latitude and longitude are required." }, 60);
  try {
    const radius = scopeRadii[scope];
    const query = `[out:json][timeout:18];(way(around:${radius},${point.lat},${point.lng})["landuse"~"^(industrial|brownfield|commercial|farmland|construction|quarry)$"];nwr(around:${radius},${point.lat},${point.lng})["power"~"^(substation|plant|generator)$"];);out center 160;`;
    let elements = await overpass(query);
    // Some regions have little parcel tagging. A named OSM locality is still a real,
    // clickable geographic lead; use it only when there are no mapped land/power features.
    let localityFallback = false;
    if (!elements.length) {
      localityFallback = true;
      elements = await overpass(`[out:json][timeout:18];nwr(around:${radius},${point.lat},${point.lng})["place"~"^(city|town|village|suburb)$"];out center 100;`);
    }
    const pool = elements.flatMap((element) => {
      const center = pointFrom(element); const tags = element.tags ?? {};
      const isLocality = localityFallback && Boolean(tags.place);
      if (!center || !element.id || (!landUses.has(tags.landuse || "") && !tags.power && !isLocality)) return [];
      const distance = distanceKm(point, center);
      if (distance < .15) return [];
      const landUse = isLocality ? `nearby ${tags.place} area` : tags.landuse || (tags.power ? `power ${tags.power}` : "mapped land");
      return [{ id: `osm-${element.type || "way"}-${element.id}`, lat: center.lat, lng: center.lng, name: tags.name || tags["name:en"] || tags["addr:city"] || tags["addr:suburb"] || `Nearby ${tags.place || landUse}`, landUse, source: "mapped" as const, distance, score: isLocality ? 1 : useScore(tags, project) }];
    }).sort((a, b) => b.score - a.score || a.distance - b.distance);
    // Select mapped features, not a compass pattern. Separation only prevents duplicate pins on one parcel.
    const minimumSeparation = Math.max(.7, radius / 1000 / 16);
    const candidates: Array<{ id: string; lat: number; lng: number; name: string; landUse: string; source: "mapped" }> = [];
    for (const candidate of pool) {
      if (candidates.some((picked) => distanceKm(picked, candidate) < minimumSeparation)) continue;
      candidates.push({ id: candidate.id, lat: candidate.lat, lng: candidate.lng, name: candidate.name, landUse: candidate.landUse, source: candidate.source });
      if (candidates.length === 12) break;
    }
    return jsonResponse({ candidates, source: localityFallback ? "OpenStreetMap named locality fallback (no mapped land/power lead was available)" : "OpenStreetMap mapped land-use and power leads", cappedRadiusM: radius, message: candidates.length ? undefined : "The public map query completed but did not return a usable mapped feature for this area." }, 300);
  } catch {
    return jsonResponse({ candidates: [], message: "Mapped-area discovery is temporarily unavailable." }, 60);
  }
}

function average(values: unknown) {
  const numbers = Array.isArray(values) ? values.filter((value): value is number => typeof value === "number" && Number.isFinite(value)) : [];
  return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : null;
}
function maximum(values: unknown) {
  const numbers = Array.isArray(values) ? values.filter((value): value is number => typeof value === "number" && Number.isFinite(value)) : [];
  return numbers.length ? Math.max(...numbers) : null;
}

async function candidateEvidence(url: URL): Promise<Response> {
  const point = parsePoint(url);
  if (!point) return jsonResponse({ error: "A valid latitude and longitude are required." }, 60);
  const query = `[out:json][timeout:16];(nwr(around:5000,${point.lat},${point.lng})["power"="substation"];nwr(around:5000,${point.lat},${point.lng})["power"="plant"];nwr(around:5000,${point.lat},${point.lng})["power"="generator"];way(around:5000,${point.lat},${point.lng})["power"~"^(line|minor_line)$"];node(around:5000,${point.lat},${point.lng})["power"~"^(tower|pole)$"];way(around:5000,${point.lat},${point.lng})["highway"~"^(motorway|trunk|primary)$"];way(around:5000,${point.lat},${point.lng})["railway"~"^(rail|light_rail)$"];nwr(around:5000,${point.lat},${point.lng})["aeroway"~"^(aerodrome|helipad)$"];nwr(around:5000,${point.lat},${point.lng})["landuse"~"^(industrial|brownfield|commercial|farmland|construction|quarry)$"];nwr(around:5000,${point.lat},${point.lng})["building"];nwr(around:5000,${point.lat},${point.lng})["boundary"="protected_area"];nwr(around:5000,${point.lat},${point.lng})["leisure"="nature_reserve"];nwr(around:5000,${point.lat},${point.lng})["natural"~"^(wetland|water|wood)$"];nwr(around:5000,${point.lat},${point.lng})["landuse"="forest"];way(around:5000,${point.lat},${point.lng})["waterway"~"^(river|stream|canal)$"];);out center 400;`;
  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lng}&timezone=auto&forecast_days=7&current=temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,shortwave_radiation_sum,sunshine_duration,et0_fao_evapotranspiration`;
  const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${point.lat}&longitude=${point.lng}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,dust`;
  const [mapResult, forecastResult, airResult] = await Promise.allSettled([overpass(query), fetch(forecastUrl), fetch(airUrl)]);
  if (mapResult.status !== "fulfilled" && forecastResult.status !== "fulfilled" && airResult.status !== "fulfilled") return jsonResponse({ error: "Public evidence is temporarily unavailable." }, 60);
  const elements = mapResult.status === "fulfilled" ? mapResult.value : [];
  const forecast = forecastResult.status === "fulfilled" && forecastResult.value.ok ? await forecastResult.value.json() as { elevation?: number; current?: Record<string, unknown>; daily?: Record<string, unknown> } : {};
  const air = airResult.status === "fulfilled" && airResult.value.ok ? await airResult.value.json() as { current?: Record<string, unknown> } : {};
  const count = { substations: 0, plants: 0, generators: 0, powerLines: 0, towers: 0, primaryRoads: 0, railways: 0, airports: 0, industrial: 0, brownfield: 0, commercial: 0, farmland: 0, construction: 0, quarry: 0, buildings: 0, protectedAreas: 0, natureReserves: 0, wetlands: 0, water: 0, waterways: 0, forests: 0 };
  for (const element of elements) {
    const tags = element.tags ?? {};
    if (tags.power === "substation") count.substations += 1;
    if (tags.power === "plant") count.plants += 1;
    if (tags.power === "generator") count.generators += 1;
    if (tags.power === "line" || tags.power === "minor_line") count.powerLines += 1;
    if (tags.power === "tower" || tags.power === "pole") count.towers += 1;
    if (tags.highway) count.primaryRoads += 1;
    if (tags.railway) count.railways += 1;
    if (tags.aeroway) count.airports += 1;
    if (tags.landuse === "industrial") count.industrial += 1;
    if (tags.landuse === "brownfield") count.brownfield += 1;
    if (tags.landuse === "commercial") count.commercial += 1;
    if (tags.landuse === "farmland") count.farmland += 1;
    if (tags.landuse === "construction") count.construction += 1;
    if (tags.landuse === "quarry") count.quarry += 1;
    if (tags.building) count.buildings += 1;
    if (tags.boundary === "protected_area") count.protectedAreas += 1;
    if (tags.leisure === "nature_reserve") count.natureReserves += 1;
    if (tags.natural === "wetland") count.wetlands += 1;
    if (tags.natural === "water") count.water += 1;
    if (tags.waterway) count.waterways += 1;
    if (tags.natural === "wood" || tags.landuse === "forest") count.forests += 1;
  }
  const current = forecast.current ?? {}; const daily = forecast.daily ?? {}; const airCurrent = air.current ?? {};
  const weather = typeof current.temperature_2m === "number" ? { temperature: current.temperature_2m, wind: Number(current.wind_speed_10m ?? 0), gusts: Number(current.wind_gusts_10m ?? 0), precipitation: Number(current.precipitation ?? 0), updated: String(current.time ?? "") } : null;
  const climate = { maxTemperature: maximum(daily.temperature_2m_max), minTemperature: average(daily.temperature_2m_min), precipitation7d: average(daily.precipitation_sum) === null ? null : (daily.precipitation_sum as number[]).filter((value) => typeof value === "number").reduce((sum, value) => sum + value, 0), maxWind: maximum(daily.wind_speed_10m_max), maxGust: maximum(daily.wind_gusts_10m_max), radiation: average(daily.shortwave_radiation_sum), sunshineHours: average(daily.sunshine_duration) === null ? null : average(daily.sunshine_duration)! / 3600, evapotranspiration: average(daily.et0_fao_evapotranspiration) };
  const airQuality = { usAqi: typeof airCurrent.us_aqi === "number" ? airCurrent.us_aqi : null, pm25: typeof airCurrent.pm2_5 === "number" ? airCurrent.pm2_5 : null, pm10: typeof airCurrent.pm10 === "number" ? airCurrent.pm10 : null, nitrogenDioxide: typeof airCurrent.nitrogen_dioxide === "number" ? airCurrent.nitrogen_dioxide : null, ozone: typeof airCurrent.ozone === "number" ? airCurrent.ozone : null, dust: typeof airCurrent.dust === "number" ? airCurrent.dust : null };
  const coverage = [mapResult.status === "fulfilled", Boolean(weather), climate.radiation !== null, airQuality.usAqi !== null].filter(Boolean).length;
  return jsonResponse({ checked: coverage > 0, coverage, features: count, elevation: Number.isFinite(forecast.elevation) ? Math.round(Number(forecast.elevation)) : null, weather, climate, airQuality, sources: ["OpenStreetMap / Overpass (5 km mapped-feature screen)", "Open-Meteo (current and seven-day operational-weather screen)", "Open-Meteo / CAMS air-quality forecast"] }, 600);
}

function legalTerms(project: string) {
  const lower = project.toLowerCase();
  if (lower.includes("nuclear")) return "nuclear power plant environmental permitting";
  if (lower.includes("transmission")) return "electric transmission right of way permitting";
  if (lower.includes("wind")) return "wind energy environmental permitting";
  if (lower.includes("solar")) return "solar energy environmental permitting";
  if (lower.includes("data center")) return "data center energy environmental permitting";
  return "energy infrastructure environmental permitting";
}

async function legalResearch(url: URL): Promise<Response> {
  const country = (url.searchParams.get("country") || "").toUpperCase();
  const term = legalTerms((url.searchParams.get("project") || "").slice(0, 80));
  if (country !== "US") return jsonResponse({ available: false, jurisdiction: country || "Unresolved", notices: [], cases: [], message: "No universal authoritative legal or court database is connected for this jurisdiction. Add the relevant official registry before making a legal assessment." }, 300);
  const federalUrl = `https://www.federalregister.gov/api/v1/documents.json?conditions[term]=${encodeURIComponent(term)}&per_page=8&order=newest`;
  const courtUrl = `https://www.courtlistener.com/api/rest/v4/search/?q=${encodeURIComponent(term)}&type=o&order_by=dateFiled%20desc`;
  const [federalResult, courtResult] = await Promise.allSettled([fetch(federalUrl), fetch(courtUrl)]);
  const notices: Array<{ title: string; date?: string; agency?: string; url: string }> = [];
  const cases: Array<{ title: string; date?: string; court?: string; url: string }> = [];
  if (federalResult.status === "fulfilled" && federalResult.value.ok) {
    const data = await federalResult.value.json() as { results?: Array<{ title?: string; publication_date?: string; html_url?: string; agencies?: Array<{ name?: string }> }> };
    for (const document of data.results ?? []) if (document.title && document.html_url) notices.push({ title: document.title, date: document.publication_date, agency: document.agencies?.map((agency) => agency.name).filter(Boolean).join(", "), url: document.html_url });
  }
  if (courtResult.status === "fulfilled" && courtResult.value.ok) {
    const data = await courtResult.value.json() as { results?: Array<{ caseName?: string; caseNameFull?: string; dateFiled?: string; court?: string; absolute_url?: string; cluster?: string }> };
    for (const item of data.results ?? []) {
      const path = item.absolute_url || item.cluster;
      if (path) cases.push({ title: item.caseNameFull || item.caseName || "Public court result", date: item.dateFiled, court: item.court, url: path.startsWith("http") ? path : `https://www.courtlistener.com${path}` });
    }
  }
  return jsonResponse({ available: true, jurisdiction: "United States - Federal Register and public court search", notices, cases, message: notices.length || cases.length ? "These are scoped research leads. Read the source and confirm relevance, current status, jurisdiction, and precedential effect with counsel." : "No matching public result was returned for this query. This is not proof that no law, permit, or case is relevant.", sources: ["Federal Register", "CourtListener public search"] }, 300);
}

async function findLocations(query: string): Promise<Response> {
  if (query.length < 2 || query.length > 140) return locationResponse([]);
  try {
    const photonResponse = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
    const photon = photonResponse.ok ? await photonResponse.json() as { features?: Array<{ geometry?: { coordinates?: number[] }; properties?: Record<string, string | number | undefined> }> } : {};
    const results = (photon.features ?? []).map((feature, index) => { const properties = feature.properties ?? {}; return { id: Number(properties.osm_id) || index + 1, name: String(properties.name || properties.city || properties.state || query), latitude: Number(feature.geometry?.coordinates?.[1]), longitude: Number(feature.geometry?.coordinates?.[0]), admin1: String(properties.state || properties.county || properties.city || "") || undefined, country: String(properties.country || "") || undefined, country_code: String(properties.countrycode || "") || undefined }; }).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
    if (results.length) return locationResponse(results);
  } catch { /* Use the secondary provider. */ }
  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
    const data = response.ok ? await response.json() as { results?: Array<{ id?: number; name?: string; latitude?: number; longitude?: number; admin1?: string; country?: string; country_code?: string }> } : {};
    return locationResponse((data.results ?? []).filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude)).map((item, index) => ({ id: item.id || index + 1, name: item.name || query, latitude: Number(item.latitude), longitude: Number(item.longitude), admin1: item.admin1, country: item.country, country_code: item.country_code })));
  } catch { return locationResponse([]); }
}

interface Env { ASSETS: Fetcher; DB: D1Database; IMAGES: { input(stream: ReadableStream): { transform(options: Record<string, unknown>): { output(options: { format: string; quality: number }): Promise<{ response(): Response }> } } } }
interface ExecutionContext { waitUntil(promise: Promise<unknown>): void; passThroughOnException(): void; }

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/location-search") return secure(await findLocations(url.searchParams.get("q")?.trim() ?? ""));
    if (url.pathname === "/api/candidate-search") return secure(await findCandidateLeads(url));
    if (url.pathname === "/api/candidate-evidence") return secure(await candidateEvidence(url));
    if (url.pathname === "/api/legal-research") return secure(await legalResearch(url));
    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return secure(await handleImageOptimization(request, { fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))), transformImage: async (body, { width, format, quality }) => (await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality })).response() }, allowedWidths));
    }
    return secure(await handler.fetch(request, env, ctx));
  },
};

export default worker;
