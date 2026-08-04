"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import MapPanel from "./MapPanel";

type Coordinates = { lat: number; lng: number };
type Scope = "local" | "city" | "regional" | "state" | "country";
type Layer = "street" | "satellite";
type Priority = "Balanced" | "Grid access" | "Environmental fit" | "Permitting speed" | "Economics";
type LocationChoice = { id: number; name: string; latitude: number; longitude: number; admin1?: string; country?: string; country_code?: string };
type Weather = { temperature: number; wind: number; gusts: number; precipitation: number; updated: string };
type Infrastructure = { power: number; transport: number; checked: boolean };
type Message = { role: "assistant" | "user"; text: string };

const GP_ICON = "data:application/octet-stream;base64,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";
const fallback: Coordinates = { lat: 30.2672, lng: -97.7431 };
const scopeSettings: Record<Scope, { offset: number; zoom: number; radius: number; label: string }> = {
  local: { offset: 0.014, zoom: 13, radius: 1100, label: "15 km local screen" },
  city: { offset: 0.09, zoom: 10, radius: 5500, label: "city screen" },
  regional: { offset: 0.38, zoom: 8, radius: 18000, label: "regional screen" },
  state: { offset: 1.15, zoom: 6, radius: 58000, label: "state / province screen" },
  country: { offset: 3.8, zoom: 4, radius: 190000, label: "country screen" },
};
const scopeCandidatePatterns: Record<Scope, Array<[number, number]>> = {
  local: [[-.36,-.42],[-.1,.46],[.38,-.3],[.44,.34],[0,0],[-.48,.08],[.1,-.54],[.56,.02]],
  city: [[-.8,-.55],[-.48,.6],[.12,-.78],[.62,-.32],[.74,.42],[-.08,.02],[.3,.8],[-.82,.1]],
  regional: [[-.9,-.62],[-.56,.72],[.04,-.92],[.58,-.58],[.86,.24],[-.12,.05],[.38,.9],[-.82,.05]],
  state: [[-.92,-.72],[-.65,.64],[-.12,-.9],[.44,-.64],[.86,-.08],[.68,.68],[.06,.92],[-.72,.12]],
  country: [[-.9,-.8],[-.72,.6],[-.2,-.92],[.34,-.72],[.84,-.2],[.7,.62],[.04,.92],[-.58,.04]],
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
  const [compareCandidateId, setCompareCandidateId] = useState("");

  const projectMw = Math.max(1, Number(capacity) || 1);
  const acres = Math.max(1, Number(landAcres) || 1);
  const scopeConfig = scopeSettings[scope];
  const weights = priority === "Grid access" ? [0.44, 0.17, 0.16, 0.12, 0.11] : priority === "Environmental fit" ? [0.16, 0.44, 0.18, 0.12, 0.1] : priority === "Permitting speed" ? [0.16, 0.16, 0.46, 0.12, 0.1] : priority === "Economics" ? [0.2, 0.17, 0.16, 0.17, 0.3] : [0.27, 0.23, 0.22, 0.16, 0.12];

  const candidatePoints = useMemo(() => {
    const bounds = areaPoints.length >= 3 ? { minLat: Math.min(...areaPoints.map((p) => p.lat)), maxLat: Math.max(...areaPoints.map((p) => p.lat)), minLng: Math.min(...areaPoints.map((p) => p.lng)), maxLng: Math.max(...areaPoints.map((p) => p.lng)) } : null;
    const longitudeScale = 1 / Math.max(.28, Math.cos(coordinates.lat * Math.PI / 180));
    return scopeCandidatePatterns[scope].map(([north, east], index) => {
      const lat = bounds ? bounds.minLat + (bounds.maxLat - bounds.minLat) * ((north + 1) / 2) : coordinates.lat + north * scopeConfig.offset;
      const lng = bounds ? bounds.minLng + (bounds.maxLng - bounds.minLng) * ((east + 1) / 2) : coordinates.lng + east * scopeConfig.offset * longitudeScale;
      return { id: `${scope}-site-${index}-${lat.toFixed(4)}-${lng.toFixed(4)}`, lat, lng };
    });
  }, [areaPoints, coordinates, scope, scopeConfig.offset]);

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
  const compared = candidates.find((candidate) => candidate.id === compareCandidateId) ?? candidates.find((candidate) => candidate.id !== selected?.id) ?? candidates[0];
  const comparisonMetrics = selected && compared ? [
    ["Overall fit", selected.composite, compared.composite],
    ["Grid access", selected.grid, compared.grid],
    ["Environmental fit", selected.environment, compared.environment],
    ["Policy readiness", selected.policy, compared.policy],
    ["Land fit", selected.landFit, compared.landFit],
    ["Economics", selected.economics, compared.economics],
  ] as const : [];
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
      const rows = await Promise.all(candidatePoints.map(async (point) => {
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
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { setInfrastructure((current) => ({ ...current, [point.id]: JSON.parse(cached) })); setSourceStatus("Reused this location's public infrastructure result from this session."); return; }
    setSourceStatus(`Checking public power and transport features neÛ®ú¶‰ËkºwµçM9…µ”ô‰Ñ½Àµµ•Ñ„ˆùAU	1%QMI8ƒ
Ü9=PAI5%P=H%9YMQ59P%M%=8ğ½‘¥Øøğ½¡•…‘•Èø(€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰¥¹ÑÉ¼ˆ¥ô‰İ½É­ÍÁ…”ˆøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•ÈˆùM%QM1Q%=8ğ½Àøñ Äù5…­”Ñ¡”±½…Ñ¥½¸‘•¥Í¥½¸Í¥µÁ±•È¸ğ½ ÄøñÀù	É¥¹œ¥¸„ÁÉ½©•Ğ‰É¥•˜°™¥¹Ñ¡”•á…ĞÁ±…”°…¹½µÁ…É”É½Õ¹‘•ÁÕ‰±¥ŒÍ¥¹…±Ì½¸½¹”µ…À¸ğ½Àøğ½‘¥Øøñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰‰±…¬µ‰ÕÑÑ½¸ˆ½¹±¥¬õì ¤€ôøÙ½¥É•™É•Í¡1¥Ù” ¥ôùI•™É•Í ±¥Ù”‘…Ñ„ğ½‰ÕÑÑ½¸øğ½Í•Ñ¥½¸ø((€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰‰É¥•˜µÍÑÉ¥Àˆøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•ÈˆùMQIP]%Q 	I%ğ½Àøñ ÈùM­¥ÀÑ¡”™½É´¥˜å½Ô…±É•…‘ä¡…Ù”Ñ¡”ÍÑ½Éä¸ğ½ Èøğ½‘¥Øøñ±…‰•°±…ÍÍ9…µ”ô‰‘É½Áé½¹”ˆ½¹É…=Ù•Èõì¡•Ù•¹Ğ¤€ôø•Ù•¹Ğ¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¥ô½¹É½Àõí½¹É½Áôøñ¥¹ÁÕĞÑåÁ”ô‰™¥±”ˆ…•ÁĞôˆ¹µ°¹ÑáĞ°¹ÁÁÑàˆ½¹¡…¹”õí½¹¥±•¡…¹•ô€¼ùí‰É¥•™	ÕÍä€ü€‰I•…‘¥¹œ‰É¥•›Š˜ˆ€è€‰É½À„€¹µ½È€¹ÁÁÑà¡•É”°½È‰É½İÍ”‰ôñÍµ…±°ùí‰É¥•™MÕµµ…Éäñğ€‰]”½¹±äÉ•…Ñ¡”™¥±”¥¸Ñ¡¥Ì‰É½İÍ•ÈÑ¼ÁÉ•™¥±°…ÍÍÕµÁÑ¥½¹Ì¸‰ôğ½Íµ…±°øğ½±…‰•°øğ½Í•Ñ¥½¸ø((€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰¥¹ÁÕÑÌˆøñ±…‰•°ù½µÁ…¹äñ¥¹ÁÕĞÙ…±Õ”õí½µÁ…¹åô½¹¡…¹”õì¡”¤€ôøÍ•Ñ½µÁ…¹ä¡”¹Ñ…É•Ğ¹Ù…±Õ”¥ôÁ±…•¡½±‘•Èô‰½µÁ…¹ä¹…µ”ˆ€¼øğ½±…‰•°øñ±…‰•°ùAÉ½©•Ğñ¥¹ÁÕĞÙ…±Õ”õíÁÉ½©•Ñ9…µ•ô½¹¡…¹”õì¡”¤€ôøÍ•ÑAÉ½©•Ñ9…µ”¡”¹Ñ…É•Ğ¹Ù…±Õ”¥ôÁ±…•¡½±‘•Èô‰AÉ½©•Ğ¹…µ”ˆ€¼øğ½±…‰•°øñ±…‰•°ùQ•¡¹½±½äñÍ•±•ĞÙ…±Õ”õíÁÉ½©•ÑQåÁ•ô½¹¡…¹”õì¡”¤€ôøÍ•ÑAÉ½©•ÑQåÁ”¡”¹Ñ…É•Ğ¹Ù…±Õ”¥ôùíl‰M½±…È€¬ÍÑ½É…”ˆ°‰UÑ¥±¥ÑäÍ½±…Èˆ°‰	…ÑÑ•ÉäÍÑ½É…”ˆ°‰]¥¹ˆ°‰9Õ±•…ÈÁ½İ•ÈÁ±…¹Ğˆ°‰…Ì€¼Ñ¡•Éµ…°Á±…¹Ğˆ°‰É••¸¡å‘É½•¸ˆ°‰…Ñ„•¹Ñ•Èˆ°‰QÉ…¹Íµ¥ÍÍ¥½¸±¥¹”ˆ°‰5…¹Õ™…ÑÕÉ¥¹œ€¼¥¹‘ÕÍÑÉ¥…°ˆ°‰•½Ñ¡•Éµ…°‰t¹µ…À ¡¥Ñ•´¤€ôø€ñ½ÁÑ¥½¸­•äõí¥Ñ•µôùí¥Ñ•µôğ½½ÁÑ¥½¸ø¥ôğ½Í•±•Ğøğ½±…‰•°øñ±…‰•°ù…Á…¥Ñä€¡5\¤ñ¥¹ÁÕĞÙ…±Õ”õí…Á…¥Ñåô¥¹ÁÕÑ5½‘”ô‰‘•¥µ…°ˆ½¹¡…¹”õì¡”¤€ôøÍ•Ñ…Á…¥Ñä¡”¹Ñ…É•Ğ¹Ù…±Õ”¥ô€¼øğ½±…‰•°øñ±…‰•°ù1…¹€¡…É•Ì¤ñ¥¹ÁÕĞÙ…±Õ”õí±…¹‘É•Íô¥¹ÁÕÑ5½‘”ô‰‘•¥µ…°ˆ½¹¡…¹”õì¡”¤€ôøÍ•Ñ1…¹‘É•Ì¡”¹Ñ…É•Ğ¹Ù…±Õ”¥ô€¼øğ½±…‰•°øğ½Í•Ñ¥½¸ø((€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰±½…Ñ¥½¸µ…Éˆøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•Èˆù1=Q%=8ğ½Àøñ Èù]¡•É”‘¼å½Ôİ…¹ĞÑ¼‰Õ¥±üğ½ ÈøñÀùí±½…Ñ¥½¹9…µ•ôƒ
Üí½½É‘¥¹…Ñ•Ì¹±…Ğ¹Ñ½¥á• Ô¥ô°í½½É‘¥¹…Ñ•Ì¹±¹œ¹Ñ½¥á• Ô¥ôğ½Àøğ½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰±½…Ñ¥½¸µ™½É´ˆøñ‘¥Ø±…ÍÍ9…µ”ô‰±½…Ñ¥½¸µÁ¥­•Èˆøñ¥¹ÁÕĞÙ…±Õ”õíÍ•…É¡ô½¹½ÕÌõì ¤€ôøÍ•ÑM¡½İ¡½¥•Ì¡ÑÉÕ”¥ô½¹-•å½İ¸õì¡•Ù•¹Ğ¤€ôøì¥˜€¡•Ù•¹Ğ¹­•ä€ôôô€‰¹Ñ•Èˆ¤ì•Ù•¹Ğ¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¤ìÙ½¥Í•…É¡½É1½…Ñ¥½¸ ¤ìôõô½¹¡…¹”õì¡”¤€ôøìÍ•ÑM•…É ¡”¹Ñ…É•Ğ¹Ù…±Õ”¤ìÍ•Ñ¡½¥•Ì¡mt¤ìÍ•ÑM¡½İ¡½¥•Ì¡™…±Í”¤ìÍ•Ñ1½…Ñ¥½¹MÑ…ÑÕÌ ˆˆ¤ìõôÁ±…•¡½±‘•Èô‰¥Ñä°ÍÑ…Ñ”°½Õ¹ÑÉä°½È½½É‘¥¹…Ñ•Ìˆ…É¥„µ±…‰•°ô‰1½…Ñ¥½¸Í•…É ˆ€¼ùíÍ¡½İ¡½¥•Ì€˜˜¡½¥•Ì¹±•¹Ñ €ø€À€˜˜€ñ‘¥Ø±…ÍÍ9…µ”ô‰±½…Ñ¥½¸µ½ÁÑ¥½¹ÌˆøñÍÑÉ½¹œù<e=T5;Š˜ğ½ÍÑÉ½¹œùí¡½¥•Ì¹µ…À ¡¡½¥”¤€ôø€ñ‘¥Ø±…ÍÍ9…µ”ô‰±½…Ñ¥½¸µ¡½¥”ˆ­•äõí¡½¥”¹¥‘ôøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹5½ÕÍ•½İ¸õì¡”¤€ôø”¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¥ô½¹±¥¬õì ¤€ôø¡½½Í•1½…Ñ¥½¸¡¡½¥”¥ôøñˆùí¡½¥”¹¹…µ•ôğ½ˆøñÍµ…±°ùím¡½¥”¹…‘µ¥¸Ä°¡½¥”¹½Õ¹ÑÉåt¹™¥±Ñ•È¡	½½±•…¸¤¹©½¥¸ ˆ°€ˆ¥ôƒ
Üí¡½¥”¹±…Ñ¥ÑÕ‘”¹Ñ½¥á• Ğ¥ô°í¡½¥”¹±½¹¥ÑÕ‘”¹Ñ½¥á• Ğ¥ôğ½Íµ…±°øğ½‰ÕÑÑ½¸øñ„¡É•˜õí¡ÑÑÁÌè¼½İİÜ¹½½±”¹½´½µ…ÁÌ½Í•…É ¼ı…Á¤ôÄ™ÅÕ•Éäô‘í¡½¥”¹±…Ñ¥ÑÕ‘•ô°‘í¡½¥”¹±½¹¥ÑÕ‘•õôÑ…É•Ğô‰}‰±…¹¬ˆÉ•°ô‰¹½É•™•ÉÉ•Èˆ…É¥„µ±…‰•°õí=Á•¸€‘í¡½¥”¹¹…µ•ô¥¸½½±”5…ÁÍôù5…ÁÌƒŠ\ğ½„øğ½‘¥Øø¥ôğ½‘¥ØùôñÍµ…±°±…ÍÍ9…µ”ô‰±½…Ñ¥½¸µÍÑ…ÑÕÌˆ…É¥„µ±¥Ù”ô‰Á½±¥Ñ”ˆùí±½…Ñ¥½¹MÑ…ÑÕÍôğ½Íµ…±°øğ½‘¥Øøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÍ9…µ”ô‰‰±…¬µ‰ÕÑÑ½¸ˆ‘¥Í…‰±•õí™¥¹‘¥¹ô½¹±¥¬õì ¤€ôøÙ½¥Í•…É¡½É1½…Ñ¥½¸ ¥ôùí™¥¹‘¥¹œ€ü€‰¥¹‘¥¹ŸŠ˜ˆ€è€‰M•…É ±½…Ñ¥½¹Ì‰ôğ½‰ÕÑÑ½¸øğ½‘¥Øøğ½Í•Ñ¥½¸ø((€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰É•ÅÕ¥É•µ•¹ÑÌˆøñÍÁ…¸ù]!P5QQIL5=MPğ½ÍÁ…¸øñÍ•±•ĞÙ…±Õ”õíÁÉ¥½É¥Ñåô½¹¡…¹”õì¡”¤€ôøÍ•ÑAÉ¥½É¥Ñä¡”¹Ñ…É•Ğ¹Ù…±Õ”…ÌAÉ¥½É¥Ñä¥ôùíl‰	…±…¹•ˆ°‰É¥…•ÍÌˆ°‰¹Ù¥É½¹µ•¹Ñ…°™¥Ğˆ°‰A•Éµ¥ÑÑ¥¹œÍÁ••ˆ°‰½¹½µ¥Ì‰t¹µ…À ¡¥Ñ•´¤€ôø€ñ½ÁÑ¥½¸­•äõí¥Ñ•µôùí¥Ñ•µôğ½½ÁÑ¥½¸ø¥ôğ½Í•±•Ğøñ±…‰•°ùÉ¥ñÍ•±•ĞÙ…±Õ”õíÉ¥‘9••‘ô½¹¡…¹”õì¡”¤€ôøÍ•ÑÉ¥‘9••¡”¹Ñ…É•Ğ¹Ù…±Õ”¥ôøñ½ÁÑ¥½¸ù!¥ ğ½½ÁÑ¥½¸øñ½ÁÑ¥½¸ù5•‘¥Õ´ğ½½ÁÑ¥½¸øñ½ÁÑ¥½¸ù1½Üğ½½ÁÑ¥½¸øğ½Í•±•Ğøğ½±…‰•°øñ±…‰•°ù]…Ñ•ÈñÍ•±•ĞÙ…±Õ”õíİ…Ñ•É9••‘ô½¹¡…¹”õì¡”¤€ôøÍ•Ñ]…Ñ•É9••¡”¹Ñ…É•Ğ¹Ù…±Õ”¥ôøñ½ÁÑ¥½¸ù1½Üğ½½ÁÑ¥½¸øñ½ÁÑ¥½¸ù5•‘¥Õ´ğ½½ÁÑ¥½¸øñ½ÁÑ¥½¸ù!¥ ğ½½ÁÑ¥½¸øğ½Í•±•Ğøğ½±…‰•°øñ±…‰•°ùM¡•‘Õ±”ñÍ•±•ĞÙ…±Õ”õíÍ¡•‘Õ±•ô½¹¡…¹”õì¡”¤€ôøÍ•ÑM¡•‘Õ±”¡”¹Ñ…É•Ğ¹Ù…±Õ”¥ôøñ½ÁÑ¥½¸ù…ÍĞµÑÉ…¬ğ½½ÁÑ¥½¸øñ½ÁÑ¥½¸ùMÑ…¹‘…Éğ½½ÁÑ¥½¸øñ½ÁÑ¥½¸ù±•á¥‰±”ğ½½ÁÑ¥½¸øğ½Í•±•Ğøğ½±…‰•°øñ±…‰•°ùI¥Í¬ñÍ•±•ĞÙ…±Õ”õíÉ¥Í­Q½±•É…¹•ô½¹¡…¹”õì¡”¤€ôøÍ•ÑI¥Í­Q½±•É…¹”¡”¹Ñ…É•Ğ¹Ù…±Õ”¥ôøñ½ÁÑ¥½¸ù½¹Í•ÉÙ…Ñ¥Ù”ğ½½ÁÑ¥½¸øñ½ÁÑ¥½¸ù	…±…¹•ğ½½ÁÑ¥½¸øñ½ÁÑ¥½¸ù=ÁÁ½ÉÑÕ¹¥ÍÑ¥Œğ½½ÁÑ¥½¸øğ½Í•±•Ğøğ½±…‰•°øñ±…‰•°ù	Õ‘•Ğ€ ‘4¤ñ¥¹ÁÕĞÙ…±Õ”õí‰Õ‘•Ñô½¹¡…¹”õì¡”¤€ôøÍ•Ñ	Õ‘•Ğ¡”¹Ñ…É•Ğ¹Ù…±Õ”¥ô€¼øğ½±…‰•°øğ½Í•Ñ¥½¸ø((€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰Í½Á”µÉ½ÜˆøñÍÁ…¸ùMI9%9Iğ½ÍÁ…¸ùì¡l‰±½…°ˆ°‰¥Ñäˆ°‰É•¥½¹…°ˆ°‰ÍÑ…Ñ”ˆ°‰½Õ¹ÑÉä‰t…ÌM½Á•mt¤¹µ…À ¡¥Ñ•´¤€ôø€ñ‰ÕÑÑ½¸±…ÍÍ9…µ”õíÍ½Á”€ôôô¥Ñ•´€ü€‰…Ñ¥Ù”ˆ€è€ˆ‰ô­•äõí¥Ñ•µô½¹±¥¬õì ¤€ôøìÍ•ÑM½Á”¡¥Ñ•´¤ìÍ•ÑÑ¥Ù•…¹‘¥‘…Ñ” À¤ìÍ•Ñ½µÁ…É•…¹‘¥‘…Ñ•% ˆˆ¤ìõôùí¥Ñ•´€ôôô€‰±½…°ˆ€ü€‰1½…°ˆ€è¥Ñ•´€ôôô€‰É•¥½¹…°ˆ€ü€‰I•¥½¹…°ˆ€è¥Ñ•´€ôôô€‰ÍÑ…Ñ”ˆ€ü€‰MÑ…Ñ”€¼ÁÉ½Ù¥¹”ˆ€è¥Ñ•µôğ½‰ÕÑÑ½¸ø¥ôñÍµ…±°ùíÍ½Á•½¹™¥œ¹±…‰•±ôğ½Íµ…±°øğ½Í•Ñ¥½¸ø((€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰İ½É­ÍÁ…”ˆøñ…Í¥‘”±…ÍÍ9…µ”ô‰µ…Àµ½¹ÑÉ½±ÌˆøñÀ±…ÍÍ9…µ”ô‰­¥­•Èˆù5@5=ğ½Àøñ‘¥Ø±…ÍÍ9…µ”ô‰‰ÕÑÑ½¸µÁ…¥Èˆøñ‰ÕÑÑ½¸±…ÍÍ9…µ”õí±…å•È€ôôô€‰ÍÑÉ••Ğˆ€ü€‰…Ñ¥Ù”ˆ€è€ˆ‰ô½¹±¥¬õì ¤€ôøÍ•Ñ1…å•È ‰ÍÑÉ••Ğˆ¥ôù5…Àğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸±…ÍÍ9…µ”õí±…å•È€ôôô€‰Í…Ñ•±±¥Ñ”ˆ€ü€‰…Ñ¥Ù”ˆ€è€ˆ‰ô½¹±¥¬õì ¤€ôøÍ•Ñ1…å•È ‰Í…Ñ•±±¥Ñ”ˆ¥ôùM…Ñ•±±¥Ñ”ğ½‰ÕÑÑ½¸øğ½‘¥Øøñ‰ÕÑÑ½¸±…ÍÍ9…µ”õí‘É…İ5½‘”€ü€‰½ÕÑ±¥¹”µ‰ÕÑÑ½¸…Ñ¥Ù”ˆ€è€‰½ÕÑ±¥¹”µ‰ÕÑÑ½¸‰ô½¹±¥¬õì ¤€ôøÍ•ÑÉ…İ5½‘” …‘É…İ5½‘”¥ôùí‘É…İ5½‘”€ü€‰±¥¬µ…ÀÑ¼Í•Ğ‰½Õ¹‘…Éäˆ€è€‰É…Ü‰Õ¥±…É•„‰ôğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰Ñ•áĞµ‰ÕÑÑ½¸ˆ½¹±¥¬õì ¤€ôøìÍ•ÑÉ•…A½¥¹ÑÌ¡mt¤ìÍ•ÑÉ…İ5½‘”¡™…±Í”¤ìõôù±•…È‰½Õ¹‘…Éäğ½‰ÕÑÑ½¸øñÍµ…±°ùí…É•…A½¥¹ÑÌ¹±•¹Ñ €øô€Ì€ü€‘í…É•…A½¥¹ÑÌ¹±•¹Ñ¡ôÁ½¥¹ÑÌ‘•™¥¹”Ñ¡”ÍÉ••¹¥¹œ‰½Õ¹‘…Éä¹€€è€‰‘…Ğ±•…ÍĞ€ÌÁ½¥¹ÑÌÑ¼±¥µ¥ĞÍÕ•ÍÑ¥½¹ÌÑ¼å½ÕÈ…É•„¸‰ôğ½Íµ…±°øñ¡È¼øñÀ±…ÍÍ9…µ”ô‰Í½ÕÉ”µ¹½Ñ”ˆùíÍ½ÕÉ•MÑ…ÑÕÍôğ½Àøğ½…Í¥‘”ø(€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µ…Àµ™É…µ”ˆøñ5…ÁA…¹•°½½É‘¥¹…Ñ•Ìõí½½É‘¥¹…Ñ•Íôµ…Á1…å•Èõí±…å•Éô…¹‘¥‘…Ñ•Ìõí…¹‘¥‘…Ñ•Ì¹µ…À ¡…¹‘¥‘…Ñ”¤€ôø€¡ì¹…µ”èÁ±…•1…‰•±Ím…¹‘¥‘…Ñ”¹¥‘tñğ€‰1½…°…É•„ˆ°¥è…¹‘¥‘…Ñ”¹¥°±…Ğè…¹‘¥‘…Ñ”¹±…Ğ°±¹œè…¹‘¥‘…Ñ”¹±¹œ°Í•±•Ñ•‘M½É”è…¹‘¥‘…Ñ”¹½µÁ½Í¥Ñ”ô¤¥ô…Ñ¥Ù•…¹‘¥‘…Ñ”õí…Ñ¥Ù•…¹‘¥‘…Ñ•ô½¹…¹‘¥‘…Ñ•M•±•Ğõì¡¥¹‘•à¤€ôøìÍ•ÑÑ¥Ù•…¹‘¥‘…Ñ”¡¥¹‘•à¤ìÙ½¥Ù•É¥™å…¹‘¥‘…Ñ”¡…¹‘¥‘…Ñ•Ím¥¹‘•át¤ìõôÁÉ½©•Ñ9…µ”õíÁÉ½©•Ñ9…µ”ñğ½µÁ…¹äñğ€‰AÉ½©•Ğ™½ÕÌ‰ôé½½´õíÍ½Á•½¹™¥œ¹é½½µôÉ…‘¥ÕÌõíÍ½Á•½¹™¥œ¹É…‘¥ÕÍô‘É…İ5½‘”õí‘É…İ5½‘•ô…É•…A½¥¹ÑÌõí…É•…A½¥¹ÑÍô½¹É•…¡…¹”õíÍ•ÑÉ•…A½¥¹ÑÍô¼øñ‘¥Ø±…ÍÍ9…µ”ô‰µ…Àµ…ÁÑ¥½¸ˆùAÕ‰±¥Œ¥¹™É…ÍÑÉÕÑÕÉ”ÍÉ••¸è=M4Á½İ•È€¬ÑÉ…¹ÍÁ½ÉĞƒ
Ü±¥Ù”İ•…Ñ¡•È½•±•Ù…Ñ¥½¸ğ½‘¥Øøğ½‘¥Øø(€€€€€€ñ…Í¥‘”±…ÍÍ9…µ”ô‰…¹‘¥‘…Ñ”µÁ…¹•°ˆøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•Èˆù9%QILğ½Àøñ ÈùÙ¥‘•¹”‰•™½É”½¹™¥‘•¹”¸ğ½ Èøğ½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰…¹‘¥‘…Ñ”µ±¥ÍĞˆùí…¹‘¥‘…Ñ•Ì¹µ…À ¡…¹‘¥‘…Ñ”°¥¹‘•à¤€ôø€ñ‘¥Ø±…ÍÍ9…µ”õí¥¹‘•à€ôôô…Ñ¥Ù•…¹‘¥‘…Ñ”€ü€‰…¹‘¥‘…Ñ”µÉ½Ü…Ñ¥Ù”ˆ€è€‰…¹‘¥‘…Ñ”µÉ½Ü‰ô­•äõí…¹‘¥‘…Ñ”¹¥‘ôøñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰…¹‘¥‘…Ñ”ˆ½¹±¥¬õì ¤€ôøìÍ•ÑÑ¥Ù•…¹‘¥‘…Ñ”¡¥¹‘•à¤ìÙ½¥Ù•É¥™å…¹‘¥‘…Ñ”¡…¹‘¥‘…Ñ”¤ìõôøñÍÁ…¸ùí¥¹‘•à€¬€Åôğ½ÍÁ…¸øñ‘¥ØøñˆùíÁ±…•1…‰•±Ím…¹‘¥‘…Ñ”¹¥‘tñğ€‰1½…°…É•„‰ôğ½ˆøñÍµ…±°ùí…¹‘¥‘…Ñ”¹±…Ğ¹Ñ½¥á• Ğ¥ô°í…¹‘¥‘…Ñ”¹±¹œ¹Ñ½¥á• Ğ¥ôğ½Íµ…±°øğ½‘¥ØøñÍÑÉ½¹œùí…¹‘¥‘…Ñ”¹½µÁ½Í¥Ñ•ôğ½ÍÑÉ½¹œøğ½‰ÕÑÑ½¸øñ„¡É•˜õí¡ÑÑÁÌè¼½İİÜ¹½½±”¹½´½µ…ÁÌ½Í•…É ¼ı…Á¤ôÄ™ÅÕ•Éäô‘í…¹‘¥‘…Ñ”¹±…Ñô°‘í…¹‘¥‘…Ñ”¹±¹õôÑ…É•Ğô‰}‰±…¹¬ˆÉ•°ô‰¹½É•™•ÉÉ•Èˆ…É¥„µ±…‰•°õí=Á•¸€‘íÁ±…•1…‰•±Ím…¹‘¥‘…Ñ”¹¥‘tñğ€‰…¹‘¥‘…Ñ”…É•„‰ô¥¸½½±”5…ÁÍôù5…ÁÌƒŠ\ğ½„øğ½‘¥Øø¥ôğ½‘¥ØùíÍ•±•Ñ•€˜˜€ñ‘¥Ø±…ÍÍ9…µ”ô‰•Ù¥‘•¹”ˆøñˆùíÁ±…•1…‰•±ÍmÍ•±•Ñ•¹¥‘tñğ€‰1½…°…É•„‰ôğ½ˆøñÍµ…±°ùÉ¥èíÍ•±•Ñ•¹Í¥¹…°ü¹¡•­•€ü€‘íÍ•±•Ñ•¹Í¥¹…°¹Á½İ•ÉôÁÕ‰±¥ŒÁ½İ•È™•…ÑÕÉ•Ì€¼€‘íÍ•±•Ñ•¹Í¥¹…°¹ÑÉ…¹ÍÁ½ÉÑôÑÉ…¹ÍÁ½ÉĞ™•…ÑÕÉ•Ìİ¥Ñ¡¥¸€Ô­µ€€è€‰¡½½Í”Ñ¡¥Ì…É•„Ñ¼ÉÕ¸¥ÑÌÁÕ‰±¥Œµ…À¡•¬¸‰ôğ½Íµ…±°øñÍµ…±°ù¹Ù¥É½¹µ•¹Ñ…°èíÍ•±•Ñ•¹•¹Ù¥É½¹µ•¹Ñô¼ÄÀÀƒ
ÜA½±¥äÍÉ••¸èíÍ•±•Ñ•¹Á½±¥åô¼ÄÀÀğ½Íµ…±°øğ½‘¥Øùôğ½…Í¥‘”ø(€€€€ğ½Í•Ñ¥½¸ø((€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰½µÁ…É”µÉ•Ù¥•Üˆøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•ÈˆùQ]<µ1=Q%=8=5AI%M=8ğ½Àøñ ÈùQÉ…‘”µ½™™Ì°¹½Ğ©ÕÍĞ„É…¹¬¸ğ½ ÈøñÀù½µÁ…É”…¹äÑİ¼…¹‘¥‘…Ñ”…É•…Ì…É½ÍÌÑ¡”Í…µ”ÕÉÉ•¹ĞÁÉ½©•Ğ…ÍÍÕµÁÑ¥½¹Ì…¹ÍÉ••¹¥¹œ±•¹Ì¸ğ½Àøğ½‘¥ØùíÍ•±•Ñ•€˜˜½µÁ…É•€˜˜€ñ‘¥Ø±…ÍÍ9…µ”ô‰½µÁ…É”µİ½É­ÍÁ…”ˆøñ‘¥Ø±…ÍÍ9…µ”ô‰½µÁ…É”µ½¹ÑÉ½±Ìˆøñ±…‰•°ù1½…Ñ¥½¸ñÍ•±•ĞÙ…±Õ”õíÍ•±•Ñ•¹¥‘ô½¹¡…¹”õì¡•Ù•¹Ğ¤€ôøì½¹ÍĞ¥¹‘•à€ô…¹‘¥‘…Ñ•Ì¹™¥¹‘%¹‘•à ¡…¹‘¥‘…Ñ”¤€ôø…¹‘¥‘…Ñ”¹¥€ôôô•Ù•¹Ğ¹Ñ…É•Ğ¹Ù…±Õ”¤ì¥˜€¡¥¹‘•à€øô€À¤ìÍ•ÑÑ¥Ù•…¹‘¥‘…Ñ”¡¥¹‘•à¤ìÙ½¥Ù•É¥™å…¹‘¥‘…Ñ”¡…¹‘¥‘…Ñ•Ím¥¹‘•át¤ìôõôùí…¹‘¥‘…Ñ•Ì¹µ…À ¡…¹‘¥‘…Ñ”°¥¹‘•à¤€ôø€ñ½ÁÑ¥½¸­•äõí…¹‘¥‘…Ñ”¹¥‘ôÙ…±Õ”õí…¹‘¥‘…Ñ”¹¥‘ôùí¥¹‘•à€¬€Åô¸íÁ±…•1…‰•±Ím…¹‘¥‘…Ñ”¹¥‘tñğ€‰…¹‘¥‘…Ñ”…É•„‰ôƒ
Üí…¹‘¥‘…Ñ”¹±…Ğ¹Ñ½¥á• Ì¥ô°í…¹‘¥‘…Ñ”¹±¹œ¹Ñ½¥á• Ì¥ôğ½½ÁÑ¥½¸ø¥ôğ½Í•±•Ğøğ½±…‰•°øñ±…‰•°ù1½…Ñ¥½¸ñÍ•±•ĞÙ…±Õ”õí½µÁ…É•¹¥‘ô½¹¡…¹”õì¡•Ù•¹Ğ¤€ôøìÍ•Ñ½µÁ…É•…¹‘¥‘…Ñ•%¡•Ù•¹Ğ¹Ñ…É•Ğ¹Ù…±Õ”¤ì½¹ÍĞ…¹‘¥‘…Ñ”€ô…¹‘¥‘…Ñ•Ì¹™¥¹ ¡¥Ñ•´¤€ôø¥Ñ•´¹¥€ôôô•Ù•¹Ğ¹Ñ…É•Ğ¹Ù…±Õ”¤ì¥˜€¡…¹‘¥‘…Ñ”¤Ù½¥Ù•É¥™å…¹‘¥‘…Ñ”¡…¹‘¥‘…Ñ”¤ìõôùí…¹‘¥‘…Ñ•Ì¹™¥±Ñ•È ¡…¹‘¥‘…Ñ”¤€ôø…¹‘¥‘…Ñ”¹¥€„ôôÍ•±•Ñ•¹¥¤¹µ…À ¡…¹‘¥‘…Ñ”°¥¹‘•à¤€ôø€ñ½ÁÑ¥½¸­•äõí…¹‘¥‘…Ñ”¹¥‘ôÙ…±Õ”õí…¹‘¥‘…Ñ”¹¥‘ôùí¥¹‘•à€¬€Åô¸íÁ±…•1…‰•±Ím…¹‘¥‘…Ñ”¹¥‘tñğ€‰…¹‘¥‘…Ñ”…É•„‰ôƒ
Üí…¹‘¥‘…Ñ”¹±…Ğ¹Ñ½¥á• Ì¥ô°í…¹‘¥‘…Ñ”¹±¹œ¹Ñ½¥á• Ì¥ôğ½½ÁÑ¥½¸ø¥ôğ½Í•±•Ğøğ½±…‰•°øğ½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰Ñ…‰±”µİÉ…ÀˆøñÑ…‰±”±…ÍÍ9…µ”ô‰½µÁ…É¥Í½¸µÑ…‰±”ˆøñÑ¡•…øñÑÈøñÑ ù5•ÑÉ¥Œğ½Ñ øñÑ ùíÁ±…•1…‰•±ÍmÍ•±•Ñ•¹¥‘tñğ€‰1½…Ñ¥½¸‰ôğ½Ñ øñÑ ùíÁ±…•1…‰•±Ím½µÁ…É•¹¥‘tñğ€‰1½…Ñ¥½¸‰ôğ½Ñ øñÑ ù‘”ğ½Ñ øğ½ÑÈøğ½Ñ¡•…øñÑ‰½‘äùí½µÁ…É¥Í½¹5•ÑÉ¥Ì¹µ…À ¡mµ•ÑÉ¥Œ°™¥ÉÍĞ°Í•½¹‘t¤€ôø€ñÑÈ­•äõíµ•ÑÉ¥ôøñÑùíµ•ÑÉ¥ôğ½ÑøñÑùí™¥ÉÍÑô¼ÄÀÀğ½ÑøñÑùíÍ•½¹‘ô¼ÄÀÀğ½ÑøñÑùí™¥ÉÍĞ€ôôôÍ•½¹€ü€‰Ù•¸ˆ€è™¥ÉÍĞ€øÍ•½¹€ü€‰1½…Ñ¥½¸ˆ€è€‰1½…Ñ¥½¸‰ôğ½Ñøğ½ÑÈø¥ôğ½Ñ‰½‘äøğ½Ñ…‰±”øğ½‘¥ØøñÀ±…ÍÍ9…µ”ô‰½µÁ…É¥Í½¸µÍÕµµ…ÉäˆùíÁ±…•1…‰•±ÍmÍ•±•Ñ•¹¥‘tñğ€‰1½…Ñ¥½¸‰ô¥Ìí5…Ñ ¹…‰Ì¡Í•±•Ñ•¹½µÁ½Í¥Ñ”€´½µÁ…É•¹½µÁ½Í¥Ñ”¥ôÁ½¥¹ÑÌíÍ•±•Ñ•¹½µÁ½Í¥Ñ”€ôôô½µÁ…É•¹½µÁ½Í¥Ñ”€ü€‰±•Ù•°İ¥Ñ ˆ€èÍ•±•Ñ•¹½µÁ½Í¥Ñ”€ø½µÁ…É•¹½µÁ½Í¥Ñ”€ü€‰…¡•…½˜ˆ€è€‰‰•¡¥¹‰ôíÁ±…•1…‰•±Ím½µÁ…É•¹¥‘tñğ€‰1½…Ñ¥½¸‰ôÕ¹‘•ÈÑ¡”ÕÉÉ•¹Ğ€ñˆùíÁÉ¥½É¥Ñä¹Ñ½1½İ•É…Í” ¥ôğ½ˆø±•¹Ì¸ğ½Àøğ½‘¥Øùôğ½Í•Ñ¥½¸ø((€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰Í¡½ÉÑ±¥ÍĞˆøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•Èˆù%M%=8M!=IQ1%MPğ½Àøñ ÈùQ¡É•”µ½ÍĞÙ¥…‰±”…É•…Ìğ½ ÈøñÀù]•¥¡Ñ•Ñ½İ…É€ñˆùíÁÉ¥½É¥Ñä¹Ñ½1½İ•É…Í” ¥ôğ½ˆø¸ğ½Àøğ½‘¥Øøñ½°ùíÍ¡½ÉÑ±¥ÍĞ¹µ…À ¡…¹‘¥‘…Ñ”°¥¹‘•à¤€ôø€ñ±¤­•äõí…¹‘¥‘…Ñ”¹¥‘ôøñÍÁ…¸øÁí¥¹‘•à€¬€Åôğ½ÍÁ…¸øñ‘¥ØøñˆùíÁ±…•1…‰•±Ím…¹‘¥‘…Ñ”¹¥‘tñğ€‰1½…°…É•„‰ôğ½ˆøñÍµ…±°ùí…¹‘¥‘…Ñ”¹±…Ğ¹Ñ½¥á• Ğ¥ô°í…¹‘¥‘…Ñ”¹±¹œ¹Ñ½¥á• Ğ¥ôƒ
ÜÉ¥í…¹‘¥‘…Ñ”¹É¥‘ôƒ
Ü•¹Ù¥É½¹µ•¹Ğí…¹‘¥‘…Ñ”¹•¹Ù¥É½¹µ•¹Ñôƒ
ÜÁ½±¥äí…¹‘¥‘…Ñ”¹Á½±¥åôğ½Íµ…±°øğ½‘¥ØøñÍÑÉ½¹œùí…¹‘¥‘…Ñ”¹½µÁ½Í¥Ñ•ô¼ÄÀÀğ½ÍÑÉ½¹œøğ½±¤ø¥ôğ½½°øğ½Í•Ñ¥½¸ø((€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰±•…°µÉ•Ù¥•Üˆøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•Èˆù10°19€˜AI%IY%\ğ½Àøñ Èù]¡…Ğ¡…¹•Ì…É½ÍÌÑ¡”±•…‘¥¹œ±½…Ñ¥½¹Ìüğ½ ÈøñÀùQ¡•Í”…É”•Ù¥‘•¹”…ÁÌ…¹É•Ù¥•ÜÁÉ½µÁÑÏŠQ¹½Ğ±•…°½¹±ÕÍ¥½¹Ì¸Q¡”Ñ…‰±”¹•Ù•È¥¹Ù•¹ÑÌÑ¥Ñ±”°½İ¹•ÉÍ¡¥À°é½¹¥¹œ°½ÈÁÉ¥”‘…Ñ„¸ğ½Àøğ½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰Ñ…‰±”µİÉ…ÀˆøñÑ…‰±”øñÑ¡•…øñÑÈøñÑ ù1½…Ñ¥½¸ğ½Ñ øñÑ ù1•…°…É•„ğ½Ñ øñÑ ùA½Ñ•¹Ñ¥…°Á½Í¥Ñ¥Ù”ğ½Ñ øñÑ ù1•…°€¼±…¹¡•¬ğ½Ñ øñÑ ù=İ¹•ÉÍ¡¥À€˜ÁÉ¥”ğ½Ñ øğ½ÑÈøğ½Ñ¡•…øñÑ‰½‘äùíÍ¡½ÉÑ±¥ÍĞ¹µ…À ¡…¹‘¥‘…Ñ”¤€ôø€ñÑÈ­•äõí…¹‘¥‘…Ñ”¹¥‘ôøñÑøñˆùíÁ±…•1…‰•±Ím…¹‘¥‘…Ñ”¹¥‘tñğ€‰1½…°…É•„‰ôğ½ˆøñÍµ…±°ùí…¹‘¥‘…Ñ”¹±…Ğ¹Ñ½¥á• Ğ¥ô°í…¹‘¥‘…Ñ”¹±¹œ¹Ñ½¥á• Ğ¥ôğ½Íµ…±°øğ½ÑøñÑùí±•…±É•…ôğ½ÑøñÑùí…¹‘¥‘…Ñ”¹Í¥¹…°ü¹¡•­•€ü€‘í…¹‘¥‘…Ñ”¹Í¥¹…°¹Á½İ•Éôµ…ÁÁ•Á½İ•È™•…ÑÕÉ•Ì…¹€‘í…¹‘¥‘…Ñ”¹Í¥¹…°¹ÑÉ…¹ÍÁ½ÉÑôÑÉ…¹ÍÁ½ÉĞ™•…ÑÕÉ•Ìİ¥Ñ¡¥¸€Ô­´¹€€è€‰9¼ÁÕ‰±¥Œ¥¹™É…ÍÑÉÕÑÕÉ”É•ÍÕ±Ğå•ĞƒŠP‘¼¹½Ğ¥¹™•È„‰•¹•™¥Ğ¸‰ôğ½ÑøñÑùíÁÉ½©•Ñ1•…±¡•­ô¸1…¹ÕÍ”°ÁÉ½Ñ•Ñ•…É•…Ì°…¹±½…°½¹‘¥Ñ¥½¹ÌÉ•ÅÕ¥É”Ñ¡”É•±•Ù…¹Ğ…ÕÑ¡½É¥ÑäÌÉ•½É¸ğ½ÑøñÑøñˆù9½Ğ½¹¹•Ñ•ğ½ˆøñÍµ…±°ù=İ¹•ÉÍ¡¥À½Ñ¥Ñ±”°Á…É•°±…ÍÌ°•¹Õµ‰É…¹•Ì°…ÍÍ•ÍÍ•Ù…±Õ”°…¹µ…É­•Ğ½µÁÌÉ•ÅÕ¥É”…¸½™™¥¥…°É•¥ÍÑÉä½È±¥•¹Í•Á…É•°½ÁÉ¥”™••¸ğ½Íµ…±°øğ½Ñøğ½ÑÈø¥ôğ½Ñ‰½‘äøğ½Ñ…‰±”øğ½‘¥Øøğ½Í•Ñ¥½¸ø((€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰½¹¹•Ñ¥½¸µÉ•Ù¥•Üˆøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•ÈˆùI%=99Q%=8=U59QQ%=8ğ½Àøñ Èù]¡…ĞÑ¡”Í•±•Ñ•©ÕÉ¥Í‘¥Ñ¥½¸¹½Éµ…±±äÉ•ÅÕ¥É•Ìğ½ ÈøñÀøñˆùÕÑ¡½É¥ÑäÁ…Ñ èğ½ˆøíÉ¥‘½Õµ•¹Ñ…Ñ¥½¸¹…ÕÑ¡½É¥Ñåôğ½ÀøñÀùíÉ¥‘½Õµ•¹Ñ…Ñ¥½¸¹É½ÕÑ•ôğ½Àøğ½‘¥Øøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•ÈˆùQ!9%0A-Pğ½ÀøñÕ°ùíÉ¥‘½Õµ•¹Ñ…Ñ¥½¸¹‘½Õµ•¹ÑÌ¹µ…À ¡‘½Õµ•¹Ğ¤€ôø€ñ±¤­•äõí‘½Õµ•¹Ñôùí‘½Õµ•¹Ñôğ½±¤ø¥ôğ½Õ°øñÍµ…±°ùQ¡¥Ì¥Ì…¸¥¹Ñ…­”¡•­±¥ÍĞ°¹½Ğ„½µÁ±•Ñ”™¥±¥¹œ¸Q¡”•á…ĞÕÑ¥±¥Ñä°Ù½±Ñ…”°ÁÉ½©•ĞÑåÁ”°…¹±½…°©ÕÉ¥Í‘¥Ñ¥½¸‘•Ñ•Éµ¥¹”Ñ¡”½Ù•É¹¥¹œÑ…É¥™˜°ÍÑÕ‘äÍ½Á”°ÍÑ…¹‘…É‘Ì°™••Ì°…¹…ÁÁÉ½Ù…±Ì¸ğ½Íµ…±°øğ½‘¥Øøğ½Í•Ñ¥½¸ø((€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰™¥¹…¹¥…°µÉ•Ù¥•Üˆøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•Èˆù%99%0AI%91eM%Lğ½Àøñ Èù…É±ä½ÍĞÍÉ••¸ğ½ ÈøñÀùM•¹…É¥¼Ù…±Õ•ÌÕÍ”å½ÕÈ…Á…¥Ñä°±…¹°ÁÉ½©•ĞÑåÁ”°‰Õ‘•Ğ°…¹„ÑÉ…¹ÍÁ…É•¹Ğ½¹Ñ¥¹•¹ä¸Q¡•ä…É”¹½Ğµ…É­•ĞÅÕ½Ñ•Ì°…ÁÁÉ…¥Í…±Ì°½È„‰¥¸ğ½Àøğ½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰™¥¹…¹¥…°µÉ¥ˆøñ…ÉÑ¥±”øñÍµ…±°ù%¹ÁÕĞA`ğ½Íµ…±°øñˆø‘í™¥¹…¹¥…±Ì¹…Á•à¹Ñ½¥á• Ä¥õ4ğ½ˆøñÍÁ…¸ùí™¥¹…¹¥…±Ì¹Á•É5Ü¹Ñ½¥á• È¥õ4Á•È5\ğ½ÍÁ…¸øğ½…ÉÑ¥±”øñ…ÉÑ¥±”øñÍµ…±°ù½¹Ñ¥¹•¹äÉ•Í•ÉÙ”ğ½Íµ…±°øñˆø‘í™¥¹…¹¥…±Ì¹É•Í•ÉÙ”¹Ñ½¥á• Ä¥õ4ğ½ˆøñÍÁ…¸ùAÉ½©•ĞµÑåÁ”É¥Í¬…±±½İ…¹”ğ½ÍÁ…¸øğ½…ÉÑ¥±”øñ…ÉÑ¥±”øñÍµ…±°ù%¹‘¥…Ñ¥Ù”±…¹ÍÉ••¸ğ½Íµ…±°øñˆø‘í™¥¹…¹¥…±Ì¹±…¹‘MÉ••¸¹Ñ½¥á• Ä¥õ4ğ½ˆøñÍÁ…¸ùÉ•„µ‰…Í•Á±…•¡½±‘•ÈìÙ•É¥™ä±½…°½µÁÌğ½ÍÁ…¸øğ½…ÉÑ¥±”øñ…ÉÑ¥±”øñÍµ…±°ùA±…¹¹¥¹œÉ…¹”ğ½Íµ…±°øñˆø‘í™¥¹…¹¥…±Ì¹±½Ü¹Ñ½¥á• Ä¥÷ŠL‘í™¥¹…¹¥…±Ì¹¡¥ ¹Ñ½¥á• Ä¥õ4ğ½ˆøñÍÁ…¸ù	•™½É”É¥ÕÁÉ…‘”°™¥¹…¹”°Ñ…à°…¹Á•Éµ¥ÑÌğ½ÍÁ…¸øğ½…ÉÑ¥±”øğ½‘¥Øøğ½Í•Ñ¥½¸ø((€€€€ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰™…ÑÌˆøñ…ÉÑ¥±”øñÀ±…ÍÍ9…µ”ô‰­¥­•Èˆù1%Y]Q!Hğ½Àøñˆùíİ•…Ñ¡•È€ü€‘íİ•…Ñ¡•È¹Ñ•µÁ•É…ÑÕÉ”¹Ñ½¥á• Ä¥÷
Á€€è€‹ŠP‰ôğ½ˆøñÍµ…±°ùíİ•…Ñ¡•È€ü€‘íİ•…Ñ¡•È¹İ¥¹¹Ñ½¥á• À¥ô­´½ İ¥¹ƒ
Ü€‘íİ•…Ñ¡•È¹ÕÍÑÌ¹Ñ½¥á• À¥ô­´½ ÕÍÑÌƒ
Ü½‰Í•ÉÙ•€‘íİ•…Ñ¡•È¹ÕÁ‘…Ñ•‘õ€€è€‰]…¥Ñ¥¹œ™½È±¥Ù”İ•…Ñ¡•È‰ôğ½Íµ…±°øğ½…ÉÑ¥±”øñ…ÉÑ¥±”øñÀ±…ÍÍ9…µ”ô‰­¥­•ÈˆùQII%8ğ½Àøñˆùí•±•Ù…Ñ¥½¸€ôôô¹Õ±°€ü€‹ŠPˆ€è€‘í•±•Ù…Ñ¥½¹ôµôğ½ˆøñÍµ…±°ù±•Ù…Ñ¥½¸…ĞÑ¡”Í•±•Ñ•Á½¥¹Ğ¸MÕÉÙ•äµÉ…‘”Ñ•ÉÉ…¥¸…¹™±½½É•Ù¥•ÜÉ•µ…¥¸É•ÅÕ¥É•¸ğ½Íµ…±°øğ½…ÉÑ¥±”øñ…ÉÑ¥±”øñÀ±…ÍÍ9…µ”ô‰­¥­•ÈˆùI1%Qd!,ğ½ÀøñˆùAÕ‰±¥Œµ‘…Ñ„ÍÉ••¸ğ½ˆøñÍµ…±°ù=M4¥¹™É…ÍÑÉÕÑÕÉ”°İ•…Ñ¡•È°…¹Ñ•ÉÉ…¥¸…É”ÕÍ•™Õ°±•…‘ÏŠQ¹½ĞÁÉ½½˜½˜É¥…Á…¥Ñä°é½¹¥¹œ°½İ¹•ÉÍ¡¥À°Á•Éµ¥ÑÌ°½È•¹Ù¥É½¹µ•¹Ñ…°±•…É…¹”¸ğ½Íµ…±°øğ½…ÉÑ¥±”øğ½Í•Ñ¥½¸ø((€€€€ñ…Í¥‘”±…ÍÍ9…µ”ô‰…ÍÍ¥ÍÑ…¹Ğµ‰…Èˆøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•ÈˆùAI=)PMM%MQ9Pğ½Àøñˆù‘©ÕÍĞÑ¡”ÍÉ••¸¥¸Á±…¥¸¹±¥Í ¸ğ½ˆøğ½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰µ•ÍÍ…•Ìˆùíµ•ÍÍ…•Ì¹Í±¥” ´Ğ¤¹µ…À ¡µ•ÍÍ…”°¥¹‘•à¤€ôø€ñÀ±…ÍÍ9…µ”õíµ•ÍÍ…”¹É½±•ô­•äõí¥¹‘•áôùíµ•ÍÍ…”¹Ñ•áÑôğ½Àø¥ôğ½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰…ÍÍ¥ÍÑ…¹Ğµ¥¹ÁÕĞˆøñ¥¹ÁÕĞÙ…±Õ”õí…ÍÍ¥ÍÑ…¹Ñ%¹ÁÕÑô½¹-•å½İ¸õì¡•Ù•¹Ğ¤€ôøì¥˜€¡•Ù•¹Ğ¹­•ä€ôôô€‰¹Ñ•Èˆ¤ì•Ù•¹Ğ¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¤ìÍ•¹‘ÍÍ¥ÍÑ…¹Ğ ¤ìôõô½¹¡…¹”õì¡”¤€ôøÍ•ÑÍÍ¥ÍÑ…¹Ñ%¹ÁÕĞ¡”¹Ñ…É•Ğ¹Ù…±Õ”¥ôÁ±…•¡½±‘•Èô‰”¹œ¸€ÌÀÀ5\İ¥¹°É¥™¥ÉÍĞˆ€¼øñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ…É¥„µ±…‰•°ô‰M•¹Á…É…µ•Ñ•ÈÉ•ÅÕ•ÍĞˆ½¹±¥¬õíÍ•¹‘ÍÍ¥ÍÑ…¹ÑôûŠHğ½‰ÕÑÑ½¸øğ½‘¥Øøğ½…Í¥‘”ø((€€€€ñ™½½Ñ•ÈùM½ÕÉ•ÌÕÍ•¥¸Ñ¡¥ÌÍÉ••¸è=Á•¹MÑÉ••Ñ5…À€¼=Ù•ÉÁ…ÍÌÁÕ‰±¥Œµ…À‘…Ñ„°=Á•¸µ5•Ñ•¼İ•…Ñ¡•È…¹•±•Ù…Ñ¥½¸°…¹É•Ù•ÉÍ”•½½‘¥¹œ¸½¹™¥É´•Ù•ÉäÍ¡½ÉÑ±¥ÍĞİ¥Ñ Ñ¡”É•±•Ù…¹ĞÕÑ¥±¥Ñä°…ÕÑ¡½É¥Ñä°±…¹‘½İ¹•È°•¹¥¹••É¥¹œÍÕÉÙ•ä°…¹±•…°½Õ¹Í•°¸ğ½™½½Ñ•Èø(€€ğ½µ…¥¸øì)ô