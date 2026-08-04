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

function locationResponse(results: LocationResult[]) {
  return new Response(JSON.stringify({ results }), { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" } });
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
