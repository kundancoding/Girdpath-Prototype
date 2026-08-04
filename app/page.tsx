"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import MapPanel from "./MapPanel";

type Coordinates = { lat: number; lng: number };
type Scope = "local" | "city" | "state" | "country";
type Layer = "street" | "satellite";
type Priority = "Balanced" | "Grid access" | "Environmental fit" | "Permitting speed" | "Economics";
type LocationChoice = { id: number; name: string; latitude: number; longitude: number; admin1?: string; country?: string; country_code?: string };
type Weather = { temperature: number; wind: number; gusts: number; precipitation: number; updated: string };
type Infrastructure = { power: number; transport: number; checked: boolean };
type Message = { role: "assistant" | "user"; text: string };

const GP_ICON = "data:application/octet-stream;base64,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";
const fallback: Coordinates = { lat: 30.2672, lng: -97.7431 };
const scopeSettings: Record<Scope, { offset: number; zoom: number; radius: number; label: string }> = {
  local: { offset: 0.012, zoom: 13, radius: 1100, label: "15 km local screen" },
  city: { offset: 0.06, zoom: 10, radius: 5500, label: "city screen" },
  state: { offset: 0.26, zoom: 7, radius: 21000, label: "state / province screen" },
  country: { offset: 1.08, zoom: 5, radius: 85000, label: "country screen" },
};
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const distanceKm = (a: Coordinates, b: Coordinates) => {
  const radians = Math.PI / 180;
  const dLat = (b.lat - a.lat) * radians;
  const dLng = (b.lng - a.lng) * radians;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

async function searchLocations(query: string): Promise<LocationChoice[]> {
  const response = await fetch(`/api/location-search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error("Location lookup is temporarily unavailable.");
  const data = await response.json() as { results?: LocationChoice[] };
  return Array.isArray(data.results) ? data.results : [];
}

export default function Home() {
  const [company, setCompany] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("Solar + storage");
  const [capacity, setCapacity] = useState("150");
  const [landAcres, setLandAcres] = useState("620");
  const [budget, setBudget] = useState("250");
  const [gridNeed, setGridNeed] = useState("High");
  const [waterNeed, setWaterNeed] = useState("Low");
  const [schedule, setSchedule] = useState("Standard");
  const [riskTolerance, setRiskTolerance] = useState("Balanced");
  const [priority, setPriority] = useState<Priority>("Balanced");
  const [search, setSearch] = useState("Austin");
  const [choices, setChoices] = useState<LocationChoice[]>([]);
  const [showChoices, setShowChoices] = useState(false);
  const [finding, setFinding] = useState(false);
  const [locationStatus, setLocationStatus] = useState("");
  const locationSearchRequest = useRef(0);
  const selectedLocationQuery = useRef("");
  const [coordinates, setCoordinates] = useState<Coordinates>(fallback);
  const [locationName, setLocationName] = useState("Austin");
  const [countryCode, setCountryCode] = useState("US");
  const [scope, setScope] = useState<Scope>("city");
  const [layer, setLayer] = useState<Layer>("street");
  const [drawMode, setDrawMode] = useState(false);
  const [areaPoints, setAreaPoints] = useState<Coordinates[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [elevation, setElevation] = useState<number | null>(null);
  const [placeLabels, setPlaceLabels] = useState<Record<string, string>>({});
  const [infrastructure, setInfrastructure] = useState<Record<string, Infrastructure>>({});
  const [sourceStatus, setSourceStatus] = useState("Choose a candidate to verify nearby public power and transport features.");
  const [briefName, setBriefName] = useState("");
  const [briefSummary, setBriefSummary] = useState("");
  const [briefBusy, setBriefBusy] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "Tell me what matters most. I can adjust the working assumptions on this screen." }]);
  const [activeCandidate, setActiveCandidate] = useState(0);

  const projectMw = Math.max(1, Number(capacity) || 1);
  const acres = Math.max(1, Number(landAcres) || 1);
  const scopeConfig = scopeSettings[scope];
  const weights = priority === "Grid access" ? [0.44, 0.17, 0.16, 0.12, 0.11] : priority === "Environmental fit" ? [0.16, 0.44, 0.18, 0.12, 0.1] : priority === "Permitting speed" ? [0.16, 0.16, 0.46, 0.12, 0.1] : priority === "Economics" ? [0.2, 0.17, 0.16, 0.17, 0.3] : [0.27, 0.23, 0.22, 0.16, 0.12];

  const candidatePoints = useMemo(() => {
    const bounds = areaPoints.length >= 3 ? { minLat: Math.min(...areaPoints.map((p) => p.lat)), maxLat: Math.max(...areaPoints.map((p) => p.lat)), minLng: Math.min(...areaPoints.map((p) => p.lng)), maxLng: Math.max(...areaPoints.map((p) => p.lng)) } : null;
    const seeds = [[.2,.2],[.8,.2],[.2,.8],[.8,.8],[.5,.5],[.5,.15],[.15,.5],[.85,.5]];
    return seeds.map(([north, east], index) => {
      const lat = bounds ? bounds.minLat + (bounds.maxLat - bounds.minLat) * north : coordinates.lat + (north - .5) * 2.2 * scopeConfig.offset;
      const lng = bounds ? bounds.minLng + (bounds.maxLng - bounds.minLng) * east : coordinates.lng + (east - .5) * 3 * scopeConfig.offset;
      return { id: `site-${index}-${lat.toFixed(4)}-${lng.toFixed(4)}`, lat, lng };
    });
  }, [areaPoints, coordinates, scopeConfig.offset]);

  const candidates = useMemo(() => {
    const heatPenalty = weather ? Math.max(0, weather.temperature - 30) * 1.3 : 4;
    const windPenalty = weather ? Math.max(0, weather.gusts - 45) * .4 : 3;
    const terrainPenalty = elevation === null ? 4 : Math.min(10, Math.abs(elevation) / 240);
    const landRatio = projectType === "Data center" ? 1.6 : projectType === "Transmission line" ? 4 : projectType === "Nuclear power plant" ? .12 : projectType === "Wind" ? .35 : 3.3;
    const scalePenalty = Math.max(0, projectMw - acres / landRatio) * .11;
    const policyPressure = projectType === "Nuclear power plant" ? 22 : projectType === "Transmission line" ? 13 : 8;
    return candidatePoints.map((point, index) => {
      const signal = infrastructure[point.id];
      const terrain = Math.abs(Math.sin(point.lat * 1.71) + Math.cos(point.lng * 1.37));
      const access = Math.abs(Math.sin(point.lng * .74));
      const land = 55 + Math.round(Math.abs(Math.cos(point.lat + point.lng)) * 35);
      const grid = signal?.checked ? clamp(26 + signal.power * 15 + signal.transport * 5 + (gridNeed === "High" ? 8 : 0)) : 50;
      const environment = clamp(78 - heatPenalty - windPenalty - terrainPenalty - terrain * 5 - (waterNeed === "High" ? 10 : waterNeed === "Medium" ? 5 : 1));
      const policy = clamp(84 - policyPressure - (schedule === "Fast-track" ? 12 : schedule === "Standard" ? 6 : 1) - (riskTolerance === "Conservative" ? 5 : 0));
      const landFit = clamp(land - scalePenalty);
      const economics = clamp(70 + access * 19 - Math.max(0, projectMw - 250) * .025 - Math.max(0, 180 - Number(budget || 250)) * .04);
      const composite = clamp(grid * weights[0] + environment * weights[1] + policy * weights[2] + landFit * weights[3] + economics * weights[4]);
      return { ...point, index, grid, environment, policy, landFit, economics, composite, signal };
    }).sort((a, b) => b.composite - a.composite);
  }, [acres, candidatePoints, elevation, gridNeed, infrastructure, landAcres, projectMw, projectType, riskTolerance, schedule, waterNeed, weather, weights]);

  const selected = candidates[activeCandidate] ?? candidates[0];
  const shortlist = useMemo(() => [...candidates].sort((a, b) => b.composite - a.composite).slice(0, 3), [candidates]);
  const financials = useMemo(() => {
    const capex = Math.max(0, Number(budget) || 0);
    const reserve = capex * (projectType === "Nuclear power plant" || projectType === "Transmission line" ? .22 : .14);
    const landScreen = landAcres * (countryCode === "IN" ? .035 : countryCode === "US" ? .055 : .045);
    return { capex, reserve, landScreen, low: capex * .9, high: capex + reserve, perMw: capex / projectMw };
  }, [budget, countryCode, landAcres, projectMw, projectType]);
  const gridDocumentation = countryCode === "IN" ? { authority: "DISCOM / STU / CTU, SLDC, and the relevant SERC or CERC process", route: "Confirm whether the proposal connects to the distribution, state-transmission, or interstate-transmission network.", documents: ["Single-line diagram, protection philosophy, and equipment ratings", "Injection / drawal schedule, preliminary load-flow and fault-level studies", "Land-right evidence, route survey, environmental and local approvals", "Grid-connectivity application, metering, communication, and scheduling plan"] } : countryCode === "US" ? { authority: "Serving utility, ISO/RTO where applicable, state utility commission, and local planning authority", route: "Identify the utility and interconnection tariff first; transmission projects may follow an ISO/RTO queue or FERC-jurisdictional process.", documents: ["One-line diagram, inverter / generator data, relay and protection package", "Interconnection application, site control, deposits, and requested service", "Power-flow, short-circuit, reactive-power, and facilities-study inputs", "Land use, environmental review, utility easements, and local permits"] } : { authority: "Serving utility / grid operator, national regulator, and local planning authority", route: "First identify the exact grid operator and the governing interconnection code for the selected jurisdiction.", documents: ["Technical single-line and equipment data", "Connection application, requested capacity, and site-control evidence", "Grid-impact, protection, metering, and communications studies", "Land, environmental, construction, and local authority approvals"] };

  useEffect(() => {
    let cancelled = false;
    async function labels() {
      const rows = await Promise.all(candidatePoints.slice(0, 3).map(async (point) => {
        try {
          const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${point.lat}&longitude=${point.lng}&localityLanguage=en`);
          const data = await response.json();
          return [point.id, data.locality || data.city || data.principalSubdivision || "Local area"] as const;
        } catch { return [point.id, "Local area"] as const; }
      }));
      if (!cancelled) setPlaceLabels(Object.fromEntries(rows));
    }
    void labels();
    return () => { cancelled = true; };
  }, [candidatePoints]);

  async function verifyCandidate(point: { id: string; lat: number; lng: number }) {
    if (infrastructure[point.id]?.checked) return;
    const cacheKey = `gridpath-infrastructure-${point.id}`;
    const cached = sessionStorage.gãmº¶‰žËkºwµçpù	Õ‘•Ð€ ‘4¤ñ¥¹ÁÕÐÙ…±Õ”õí‰Õ‘•Ñô½¹¡…¹”õì¡”¤€ôøÍ•Ñ	Õ‘•Ð¡”¹Ñ…É•Ð¹Ù…±Õ”¥ô€¼øð½±…‰•°øð½Í•Ñ¥½¸ø((€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰Í½Á”µÉ½ÜˆøñÍÁ…¸ùMI9%9Ið½ÍÁ…¸ùì¡l‰±½…°ˆ°‰¥Ñäˆ°‰ÍÑ…Ñ”ˆ°‰½Õ¹ÑÉä‰t…ÌM½Á•mt¤¹µ…À ¡¥Ñ•´¤€ôø€ñ‰ÕÑÑ½¸±…ÍÍ9…µ”õíÍ½Á”€ôôô¥Ñ•´€ü€‰…Ñ¥Ù”ˆ€è€ˆ‰ô­•äõí¥Ñ•µô½¹±¥¬õì ¤€ôøìÍ•ÑM½Á”¡¥Ñ•´¤ìÍ•ÑÑ¥Ù•…¹‘¥‘…Ñ” À¤ìõôùí¥Ñ•´€ôôô€‰±½…°ˆ€ü€‰1½…°ˆ€è¥Ñ•´€ôôô€‰ÍÑ…Ñ”ˆ€ü€‰MÑ…Ñ”€¼ÁÉ½Ù¥¹”ˆ€è¥Ñ•µôð½‰ÕÑÑ½¸ø¥ôñÍµ…±°ùíÍ½Á•½¹™¥œ¹±…‰•±ôð½Íµ…±°øð½Í•Ñ¥½¸ø((€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰Ý½É­ÍÁ…”ˆøñ…Í¥‘”±…ÍÍ9…µ”ô‰µ…Àµ½¹ÑÉ½±ÌˆøñÀ±…ÍÍ9…µ”ô‰­¥­•Èˆù5@5=ð½Àøñ‘¥Ø±…ÍÍ9…µ”ô‰‰ÕÑÑ½¸µÁ…¥Èˆøñ‰ÕÑÑ½¸±…ÍÍ9…µ”õí±…å•È€ôôô€‰ÍÑÉ••Ðˆ€ü€‰…Ñ¥Ù”ˆ€è€ˆ‰ô½¹±¥¬õì ¤€ôøÍ•Ñ1…å•È ‰ÍÑÉ••Ðˆ¥ôù5…Àð½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸±…ÍÍ9…µ”õí±…å•È€ôôô€‰Í…Ñ•±±¥Ñ”ˆ€ü€‰…Ñ¥Ù”ˆ€è€ˆ‰ô½¹±¥¬õì ¤€ôøÍ•Ñ1…å•È ‰Í…Ñ•±±¥Ñ”ˆ¥ôùM…Ñ•±±¥Ñ”ð½‰ÕÑÑ½¸øð½‘¥Øøñ‰ÕÑÑ½¸±…ÍÍ9…µ”õí‘É…Ý5½‘”€ü€‰½ÕÑ±¥¹”µ‰ÕÑÑ½¸…Ñ¥Ù”ˆ€è€‰½ÕÑ±¥¹”µ‰ÕÑÑ½¸‰ô½¹±¥¬õì ¤€ôøÍ•ÑÉ…Ý5½‘” …‘É…Ý5½‘”¥ôùí‘É…Ý5½‘”€ü€‰±¥¬µ…ÀÑ¼Í•Ð‰½Õ¹‘…Éäˆ€è€‰É…Ü‰Õ¥±…É•„‰ôð½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰Ñ•áÐµ‰ÕÑÑ½¸ˆ½¹±¥¬õì ¤€ôøìÍ•ÑÉ•…A½¥¹ÑÌ¡mt¤ìÍ•ÑÉ…Ý5½‘”¡™…±Í”¤ìõôù±•…È‰½Õ¹‘…Éäð½‰ÕÑÑ½¸øñÍµ…±°ùí…É•…A½¥¹ÑÌ¹±•¹Ñ €øô€Ì€ü€‘í…É•…A½¥¹ÑÌ¹±•¹Ñ¡ôÁ½¥¹ÑÌ‘•™¥¹”Ñ¡”ÍÉ••¹¥¹œ‰½Õ¹‘…Éä¹€€è€‰‘…Ð±•…ÍÐ€ÌÁ½¥¹ÑÌÑ¼±¥µ¥ÐÍÕ•ÍÑ¥½¹ÌÑ¼å½ÕÈ…É•„¸‰ôð½Íµ…±°øñ¡È¼øñÀ±…ÍÍ9…µ”ô‰Í½ÕÉ”µ¹½Ñ”ˆùíÍ½ÕÉ•MÑ…ÑÕÍôð½Àøð½…Í¥‘”ø(€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µ…Àµ™É…µ”ˆøñ5…ÁA…¹•°½½É‘¥¹…Ñ•Ìõí½½É‘¥¹…Ñ•Íôµ…Á1…å•Èõí±…å•Éô…¹‘¥‘…Ñ•Ìõí…¹‘¥‘…Ñ•Ì¹µ…À ¡…¹‘¥‘…Ñ”¤€ôø€¡ì¹…µ”èÁ±…•1…‰•±Ím…¹‘¥‘…Ñ”¹¥‘tñð€‰1½…°…É•„ˆ°¥è…¹‘¥‘…Ñ”¹¥°±…Ðè…¹‘¥‘…Ñ”¹±…Ð°±¹œè…¹‘¥‘…Ñ”¹±¹œ°Í•±•Ñ•‘M½É”è…¹‘¥‘…Ñ”¹½µÁ½Í¥Ñ”ô¤¥ô…Ñ¥Ù•…¹‘¥‘…Ñ”õí…Ñ¥Ù•…¹‘¥‘…Ñ•ô½¹…¹‘¥‘…Ñ•M•±•Ðõì¡¥¹‘•à¤€ôøìÍ•ÑÑ¥Ù•…¹‘¥‘…Ñ”¡¥¹‘•à¤ìÙ½¥Ù•É¥™å…¹‘¥‘…Ñ”¡…¹‘¥‘…Ñ•Ím¥¹‘•át¤ìõôÁÉ½©•Ñ9…µ”õíÁÉ½©•Ñ9…µ”ñð½µÁ…¹äñð€‰AÉ½©•Ð™½ÕÌ‰ôé½½´õíÍ½Á•½¹™¥œ¹é½½µôÉ…‘¥ÕÌõíÍ½Á•½¹™¥œ¹É…‘¥ÕÍô‘É…Ý5½‘”õí‘É…Ý5½‘•ô…É•…A½¥¹ÑÌõí…É•…A½¥¹ÑÍô½¹É•…¡…¹”õíÍ•ÑÉ•…A½¥¹ÑÍô¼øñ‘¥Ø±…ÍÍ9…µ”ô‰µ…Àµ…ÁÑ¥½¸ˆùAÕ‰±¥Œ¥¹™É…ÍÑÉÕÑÕÉ”ÍÉ••¸è=M4Á½Ý•È€¬ÑÉ…¹ÍÁ½ÉÐƒ
Ü±¥Ù”Ý•…Ñ¡•È½•±•Ù…Ñ¥½¸ð½‘¥Øøð½‘¥Øø(€€€€€€ñ…Í¥‘”±…ÍÍ9…µ”ô‰…¹‘¥‘…Ñ”µÁ…¹•°ˆøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•Èˆù9%QILð½Àøñ ÈùÙ¥‘•¹”‰•™½É”½¹™¥‘•¹”¸ð½ Èøð½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰…¹‘¥‘…Ñ”µ±¥ÍÐˆùí…¹‘¥‘…Ñ•Ì¹µ…À ¡…¹‘¥‘…Ñ”°¥¹‘•à¤€ôø€ñ‘¥Ø±…ÍÍ9…µ”õí¥¹‘•à€ôôô…Ñ¥Ù•…¹‘¥‘…Ñ”€ü€‰…¹‘¥‘…Ñ”µÉ½Ü…Ñ¥Ù”ˆ€è€‰…¹‘¥‘…Ñ”µÉ½Ü‰ô­•äõí…¹‘¥‘…Ñ”¹¥‘ôøñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰…¹‘¥‘…Ñ”ˆ½¹±¥¬õì ¤€ôøìÍ•ÑÑ¥Ù•…¹‘¥‘…Ñ”¡¥¹‘•à¤ìÙ½¥Ù•É¥™å…¹‘¥‘…Ñ”¡…¹‘¥‘…Ñ”¤ìõôøñÍÁ…¸ùí¥¹‘•à€¬€Åôð½ÍÁ…¸øñ‘¥ØøñˆùíÁ±…•1…‰•±Ím…¹‘¥‘…Ñ”¹¥‘tñð€‰1½…°…É•„‰ôð½ˆøñÍµ…±°ùí…¹‘¥‘…Ñ”¹±…Ð¹Ñ½¥á• Ð¥ô°í…¹‘¥‘…Ñ”¹±¹œ¹Ñ½¥á• Ð¥ôð½Íµ…±°øð½‘¥ØøñÍÑÉ½¹œùí…¹‘¥‘…Ñ”¹½µÁ½Í¥Ñ•ôð½ÍÑÉ½¹œøð½‰ÕÑÑ½¸øñ„¡É•˜õí¡ÑÑÁÌè¼½ÝÝÜ¹½½±”¹½´½µ…ÁÌ½Í•…É ¼ý…Á¤ôÄ™ÅÕ•Éäô‘í…¹‘¥‘…Ñ”¹±…Ñô°‘í…¹‘¥‘…Ñ”¹±¹õôÑ…É•Ðô‰}‰±…¹¬ˆÉ•°ô‰¹½É•™•ÉÉ•Èˆ…É¥„µ±…‰•°õí=Á•¸€‘íÁ±…•1…‰•±Ím…¹‘¥‘…Ñ”¹¥‘tñð€‰…¹‘¥‘…Ñ”…É•„‰ô¥¸½½±”5…ÁÍôù5…ÁÌƒŠ\ð½„øð½‘¥Øø¥ôð½‘¥ØùíÍ•±•Ñ•€˜˜€ñ‘¥Ø±…ÍÍ9…µ”ô‰•Ù¥‘•¹”ˆøñˆùíÁ±…•1…‰•±ÍmÍ•±•Ñ•¹¥‘tñð€‰1½…°…É•„‰ôð½ˆøñÍµ…±°ùÉ¥èíÍ•±•Ñ•¹Í¥¹…°ü¹¡•­•€ü€‘íÍ•±•Ñ•¹Í¥¹…°¹Á½Ý•ÉôÁÕ‰±¥ŒÁ½Ý•È™•…ÑÕÉ•Ì€¼€‘íÍ•±•Ñ•¹Í¥¹…°¹ÑÉ…¹ÍÁ½ÉÑôÑÉ…¹ÍÁ½ÉÐ™•…ÑÕÉ•ÌÝ¥Ñ¡¥¸€Ô­µ€€è€‰¡½½Í”Ñ¡¥Ì…É•„Ñ¼ÉÕ¸¥ÑÌÁÕ‰±¥Œµ…À¡•¬¸‰ôð½Íµ…±°øñÍµ…±°ù¹Ù¥É½¹µ•¹Ñ…°èíÍ•±•Ñ•¹•¹Ù¥É½¹µ•¹Ñô¼ÄÀÀƒ
ÜA½±¥äÍÉ••¸èíÍ•±•Ñ•¹Á½±¥åô¼ÄÀÀð½Íµ…±°øð½‘¥Øùôð½…Í¥‘”ø(€€€€ð½Í•Ñ¥½¸ø((€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰Í¡½ÉÑ±¥ÍÐˆøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•Èˆù%M%=8M!=IQ1%MPð½Àøñ ÈùQ¡É•”µ½ÍÐÙ¥…‰±”…É•…Ìð½ ÈøñÀù]•¥¡Ñ•Ñ½Ý…É€ñˆùíÁÉ¥½É¥Ñä¹Ñ½1½Ý•É…Í” ¥ôð½ˆø¸ð½Àøð½‘¥Øøñ½°ùíÍ¡½ÉÑ±¥ÍÐ¹µ…À ¡…¹‘¥‘…Ñ”°¥¹‘•à¤€ôø€ñ±¤­•äõí…¹‘¥‘…Ñ”¹¥‘ôøñÍÁ…¸øÁí¥¹‘•à€¬€Åôð½ÍÁ…¸øñ‘¥ØøñˆùíÁ±…•1…‰•±Ím…¹‘¥‘…Ñ”¹¥‘tñð€‰1½…°…É•„‰ôð½ˆøñÍµ…±°ùí…¹‘¥‘…Ñ”¹±…Ð¹Ñ½¥á• Ð¥ô°í…¹‘¥‘…Ñ”¹±¹œ¹Ñ½¥á• Ð¥ôƒ
ÜÉ¥í…¹‘¥‘…Ñ”¹É¥‘ôƒ
Ü•¹Ù¥É½¹µ•¹Ðí…¹‘¥‘…Ñ”¹•¹Ù¥É½¹µ•¹Ñôƒ
ÜÁ½±¥äí…¹‘¥‘…Ñ”¹Á½±¥åôð½Íµ…±°øð½‘¥ØøñÍÑÉ½¹œùí…¹‘¥‘…Ñ”¹½µÁ½Í¥Ñ•ô¼ÄÀÀð½ÍÑÉ½¹œøð½±¤ø¥ôð½½°øð½Í•Ñ¥½¸ø((€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰±•…°µÉ•Ù¥•Üˆøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•Èˆù10°19€˜AI%IY%\ð½Àøñ Èù]¡…Ð¡…¹•Ì…É½ÍÌÑ¡”±•…‘¥¹œ±½…Ñ¥½¹Ìüð½ ÈøñÀùQ¡•Í”…É”•Ù¥‘•¹”…ÁÌ…¹É•Ù¥•ÜÁÉ½µÁÑÏŠQ¹½Ð±•…°½¹±ÕÍ¥½¹Ì¸Q¡”Ñ…‰±”¹•Ù•È¥¹Ù•¹ÑÌÑ¥Ñ±”°½Ý¹•ÉÍ¡¥À°é½¹¥¹œ°½ÈÁÉ¥”‘…Ñ„¸ð½Àøð½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰Ñ…‰±”µÝÉ…ÀˆøñÑ…‰±”øñÑ¡•…øñÑÈøñÑ ù1½…Ñ¥½¸ð½Ñ øñÑ ù1•…°…É•„ð½Ñ øñÑ ùA½Ñ•¹Ñ¥…°Á½Í¥Ñ¥Ù”ð½Ñ øñÑ ù1•…°€¼±…¹¡•¬ð½Ñ øñÑ ù=Ý¹•ÉÍ¡¥À€˜ÁÉ¥”ð½Ñ øð½ÑÈøð½Ñ¡•…øñÑ‰½‘äùíÍ¡½ÉÑ±¥ÍÐ¹µ…À ¡…¹‘¥‘…Ñ”¤€ôø€ñÑÈ­•äõí…¹‘¥‘…Ñ”¹¥‘ôøñÑøñˆùíÁ±…•1…‰•±Ím…¹‘¥‘…Ñ”¹¥‘tñð€‰1½…°…É•„‰ôð½ˆøñÍµ…±°ùí…¹‘¥‘…Ñ”¹±…Ð¹Ñ½¥á• Ð¥ô°í…¹‘¥‘…Ñ”¹±¹œ¹Ñ½¥á• Ð¥ôð½Íµ…±°øð½ÑøñÑùí±•…±É•…ôð½ÑøñÑùí…¹‘¥‘…Ñ”¹Í¥¹…°ü¹¡•­•€ü€‘í…¹‘¥‘…Ñ”¹Í¥¹…°¹Á½Ý•Éôµ…ÁÁ•Á½Ý•È™•…ÑÕÉ•Ì…¹€‘í…¹‘¥‘…Ñ”¹Í¥¹…°¹ÑÉ…¹ÍÁ½ÉÑôÑÉ…¹ÍÁ½ÉÐ™•…ÑÕÉ•ÌÝ¥Ñ¡¥¸€Ô­´¹€€è€‰9¼ÁÕ‰±¥Œ¥¹™É…ÍÑÉÕÑÕÉ”É•ÍÕ±Ðå•ÐƒŠP‘¼¹½Ð¥¹™•È„‰•¹•™¥Ð¸‰ôð½ÑøñÑùíÁÉ½©•Ñ1•…±¡•­ô¸1…¹ÕÍ”°ÁÉ½Ñ•Ñ•…É•…Ì°…¹±½…°½¹‘¥Ñ¥½¹ÌÉ•ÅÕ¥É”Ñ¡”É•±•Ù…¹Ð…ÕÑ¡½É¥ÑäÌÉ•½É¸ð½ÑøñÑøñˆù9½Ð½¹¹•Ñ•ð½ˆøñÍµ…±°ù=Ý¹•ÉÍ¡¥À½Ñ¥Ñ±”°Á…É•°±…ÍÌ°•¹Õµ‰É…¹•Ì°…ÍÍ•ÍÍ•Ù…±Õ”°…¹µ…É­•Ð½µÁÌÉ•ÅÕ¥É”…¸½™™¥¥…°É•¥ÍÑÉä½È±¥•¹Í•Á…É•°½ÁÉ¥”™••¸ð½Íµ…±°øð½Ñøð½ÑÈø¥ôð½Ñ‰½‘äøð½Ñ…‰±”øð½‘¥Øøð½Í•Ñ¥½¸ø((€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰½¹¹•Ñ¥½¸µÉ•Ù¥•Üˆøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•ÈˆùI%=99Q%=8=U59QQ%=8ð½Àøñ Èù]¡…ÐÑ¡”Í•±•Ñ•©ÕÉ¥Í‘¥Ñ¥½¸¹½Éµ…±±äÉ•ÅÕ¥É•Ìð½ ÈøñÀøñˆùÕÑ¡½É¥ÑäÁ…Ñ èð½ˆøíÉ¥‘½Õµ•¹Ñ…Ñ¥½¸¹…ÕÑ¡½É¥Ñåôð½ÀøñÀùíÉ¥‘½Õµ•¹Ñ…Ñ¥½¸¹É½ÕÑ•ôð½Àøð½‘¥Øøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•ÈˆùQ!9%0A-Pð½ÀøñÕ°ùíÉ¥‘½Õµ•¹Ñ…Ñ¥½¸¹‘½Õµ•¹ÑÌ¹µ…À ¡‘½Õµ•¹Ð¤€ôø€ñ±¤­•äõí‘½Õµ•¹Ñôùí‘½Õµ•¹Ñôð½±¤ø¥ôð½Õ°øñÍµ…±°ùQ¡¥Ì¥Ì…¸¥¹Ñ…­”¡•­±¥ÍÐ°¹½Ð„½µÁ±•Ñ”™¥±¥¹œ¸Q¡”•á…ÐÕÑ¥±¥Ñä°Ù½±Ñ…”°ÁÉ½©•ÐÑåÁ”°…¹±½…°©ÕÉ¥Í‘¥Ñ¥½¸‘•Ñ•Éµ¥¹”Ñ¡”½Ù•É¹¥¹œÑ…É¥™˜°ÍÑÕ‘äÍ½Á”°ÍÑ…¹‘…É‘Ì°™••Ì°…¹…ÁÁÉ½Ù…±Ì¸ð½Íµ…±°øð½‘¥Øøð½Í•Ñ¥½¸ø((€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰™¥¹…¹¥…°µÉ•Ù¥•Üˆøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•Èˆù%99%0AI%91eM%Lð½Àøñ Èù…É±ä½ÍÐÍÉ••¸ð½ ÈøñÀùM•¹…É¥¼Ù…±Õ•ÌÕÍ”å½ÕÈ…Á…¥Ñä°±…¹°ÁÉ½©•ÐÑåÁ”°‰Õ‘•Ð°…¹„ÑÉ…¹ÍÁ…É•¹Ð½¹Ñ¥¹•¹ä¸Q¡•ä…É”¹½Ðµ…É­•ÐÅÕ½Ñ•Ì°…ÁÁÉ…¥Í…±Ì°½È„‰¥¸ð½Àøð½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰™¥¹…¹¥…°µÉ¥ˆøñ…ÉÑ¥±”øñÍµ…±°ù%¹ÁÕÐA`ð½Íµ…±°øñˆø‘í™¥¹…¹¥…±Ì¹…Á•à¹Ñ½¥á• Ä¥õ4ð½ˆøñÍÁ…¸ùí™¥¹…¹¥…±Ì¹Á•É5Ü¹Ñ½¥á• È¥õ4Á•È5\ð½ÍÁ…¸øð½…ÉÑ¥±”øñ…ÉÑ¥±”øñÍµ…±°ù½¹Ñ¥¹•¹äÉ•Í•ÉÙ”ð½Íµ…±°øñˆø‘í™¥¹…¹¥…±Ì¹É•Í•ÉÙ”¹Ñ½¥á• Ä¥õ4ð½ˆøñÍÁ…¸ùAÉ½©•ÐµÑåÁ”É¥Í¬…±±½Ý…¹”ð½ÍÁ…¸øð½…ÉÑ¥±”øñ…ÉÑ¥±”øñÍµ…±°ù%¹‘¥…Ñ¥Ù”±…¹ÍÉ••¸ð½Íµ…±°øñˆø‘í™¥¹…¹¥…±Ì¹±…¹‘MÉ••¸¹Ñ½¥á• Ä¥õ4ð½ˆøñÍÁ…¸ùÉ•„µ‰…Í•Á±…•¡½±‘•ÈìÙ•É¥™ä±½…°½µÁÌð½ÍÁ…¸øð½…ÉÑ¥±”øñ…ÉÑ¥±”øñÍµ…±°ùA±…¹¹¥¹œÉ…¹”ð½Íµ…±°øñˆø‘í™¥¹…¹¥…±Ì¹±½Ü¹Ñ½¥á• Ä¥÷ŠL‘í™¥¹…¹¥…±Ì¹¡¥ ¹Ñ½¥á• Ä¥õ4ð½ˆøñÍÁ…¸ù	•™½É”É¥ÕÁÉ…‘”°™¥¹…¹”°Ñ…à°…¹Á•Éµ¥ÑÌð½ÍÁ…¸øð½…ÉÑ¥±”øð½‘¥Øøð½Í•Ñ¥½¸ø((€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰™…ÑÌˆøñ…ÉÑ¥±”øñÀ±…ÍÍ9…µ”ô‰­¥­•Èˆù1%Y]Q!Hð½ÀøñˆùíÝ•…Ñ¡•È€ü€‘íÝ•…Ñ¡•È¹Ñ•µÁ•É…ÑÕÉ”¹Ñ½¥á• Ä¥÷
Á€€è€‹ŠP‰ôð½ˆøñÍµ…±°ùíÝ•…Ñ¡•È€ü€‘íÝ•…Ñ¡•È¹Ý¥¹¹Ñ½¥á• À¥ô­´½ Ý¥¹ƒ
Ü€‘íÝ•…Ñ¡•È¹ÕÍÑÌ¹Ñ½¥á• À¥ô­´½ ÕÍÑÌƒ
Ü½‰Í•ÉÙ•€‘íÝ•…Ñ¡•È¹ÕÁ‘…Ñ•‘õ€€è€‰]…¥Ñ¥¹œ™½È±¥Ù”Ý•…Ñ¡•È‰ôð½Íµ…±°øð½…ÉÑ¥±”øñ…ÉÑ¥±”øñÀ±…ÍÍ9…µ”ô‰­¥­•ÈˆùQII%8ð½Àøñˆùí•±•Ù…Ñ¥½¸€ôôô¹Õ±°€ü€‹ŠPˆ€è€‘í•±•Ù…Ñ¥½¹ôµôð½ˆøñÍµ…±°ù±•Ù…Ñ¥½¸…ÐÑ¡”Í•±•Ñ•Á½¥¹Ð¸MÕÉÙ•äµÉ…‘”Ñ•ÉÉ…¥¸…¹™±½½É•Ù¥•ÜÉ•µ…¥¸É•ÅÕ¥É•¸ð½Íµ…±°øð½…ÉÑ¥±”øñ…ÉÑ¥±”øñÀ±…ÍÍ9…µ”ô‰­¥­•ÈˆùI1%Qd!,ð½ÀøñˆùAÕ‰±¥Œµ‘…Ñ„ÍÉ••¸ð½ˆøñÍµ…±°ù=M4¥¹™É…ÍÑÉÕÑÕÉ”°Ý•…Ñ¡•È°…¹Ñ•ÉÉ…¥¸…É”ÕÍ•™Õ°±•…‘ÏŠQ¹½ÐÁÉ½½˜½˜É¥…Á…¥Ñä°é½¹¥¹œ°½Ý¹•ÉÍ¡¥À°Á•Éµ¥ÑÌ°½È•¹Ù¥É½¹µ•¹Ñ…°±•…É…¹”¸ð½Íµ…±°øð½…ÉÑ¥±”øð½Í•Ñ¥½¸ø((€€€€ñ…Í¥‘”±…ÍÍ9…µ”ô‰…ÍÍ¥ÍÑ…¹Ðµ‰…Èˆøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•ÈˆùAI=)PMM%MQ9Pð½Àøñˆù‘©ÕÍÐÑ¡”ÍÉ••¸¥¸Á±…¥¸¹±¥Í ¸ð½ˆøð½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰µ•ÍÍ…•Ìˆùíµ•ÍÍ…•Ì¹Í±¥” ´Ð¤¹µ…À ¡µ•ÍÍ…”°¥¹‘•à¤€ôø€ñÀ±…ÍÍ9…µ”õíµ•ÍÍ…”¹É½±•ô­•äõí¥¹‘•áôùíµ•ÍÍ…”¹Ñ•áÑôð½Àø¥ôð½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰…ÍÍ¥ÍÑ…¹Ðµ¥¹ÁÕÐˆøñ¥¹ÁÕÐÙ…±Õ”õí…ÍÍ¥ÍÑ…¹Ñ%¹ÁÕÑô½¹-•å½Ý¸õì¡•Ù•¹Ð¤€ôøì¥˜€¡•Ù•¹Ð¹­•ä€ôôô€‰¹Ñ•Èˆ¤ì•Ù•¹Ð¹ÁÉ•Ù•¹Ñ•™…Õ±Ð ¤ìÍ•¹‘ÍÍ¥ÍÑ…¹Ð ¤ìôõô½¹¡…¹”õì¡”¤€ôøÍ•ÑÍÍ¥ÍÑ…¹Ñ%¹ÁÕÐ¡”¹Ñ…É•Ð¹Ù…±Õ”¥ôÁ±…•¡½±‘•Èô‰”¹œ¸€ÌÀÀ5\Ý¥¹°É¥™¥ÉÍÐˆ€¼øñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ…É¥„µ±…‰•°ô‰M•¹Á…É…µ•Ñ•ÈÉ•ÅÕ•ÍÐˆ½¹±¥¬õíÍ•¹‘ÍÍ¥ÍÑ…¹ÑôûŠHð½‰ÕÑÑ½¸øð½‘¥Øøð½…Í¥‘”ø((€€€€ñ™½½Ñ•ÈùM½ÕÉ•ÌÕÍ•¥¸Ñ¡¥ÌÍÉ••¸è=Á•¹MÑÉ••Ñ5…À€¼=Ù•ÉÁ…ÍÌÁÕ‰±¥Œµ…À‘…Ñ„°=Á•¸µ5•Ñ•¼Ý•…Ñ¡•È…¹•±•Ù…Ñ¥½¸°…¹É•Ù•ÉÍ”•½½‘¥¹œ¸½¹™¥É´•Ù•ÉäÍ¡½ÉÑ±¥ÍÐÝ¥Ñ Ñ¡”É•±•Ù…¹ÐÕÑ¥±¥Ñä°…ÕÑ¡½É¥Ñä°±…¹‘½Ý¹•È°•¹¥¹••É¥¹œÍÕÉÙ•ä°…¹±•…°½Õ¹Í•°¸ð½™½½Ñ•Èø(€€ð½µ…¥¸øì)ô(