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
    setSourceStatus(`Checking public power.ýç{h‘éì¶»§q«^v-spacing:.08em; }
.brand img { width:34px; height:29px; object-fit:cover; object-position:center; background:#111; }
.top-meta,.kicker { font-family:"IBM Plex Mono",monospace; letter-spacing:.08em; font-size:10px; }
.top-meta { color:var(--muted); }
.kicker { margin:0 0 8px; color:var(--muted); }
.intro { display:flex; justify-content:space-between; align-items:end; gap:30px; padding:65px 0 42px; border-bottom:1px solid var(--line); }
.intro h1 { max-width:720px; margin:0; font-size:clamp(44px,6.2vw,82px); font-weight:500; letter-spacing:-.075em; line-height:.92; }
.intro p:not(.kicker) { max-width:560px; margin:18px 0 0; color:#50504d; font-size:15px; line-height:1.65; }
.black-button { min-height:42px; border:1px solid #111; border-radius:0; padding:0 16px; color:#fff; background:#111; font-size:12px; font-weight:600; white-space:nowrap; }
.black-button:disabled { opacity:.5; cursor:wait; }
.brief-strip { display:grid; grid-template-columns:minmax(220px,.8fr) 1.2fr; gap:28px; align-items:center; padding:28px 0; border-bottom:1px solid var(--line); }
.brief-strip h2,.location-card h2,.candidate-panel h2,.shortlist h2 { margin:0; font-size:18px; letter-spacing:-.04em; font-weight:600; }
.dropzone { display:grid; gap:6px; border:1px dashed #777; padding:16px 18px; color:#171717; font-size:13px; font-weight:600; background:#fafaf8; }
.dropzone input { display:none; }
.dropzone small { color:var(--muted); font-size:10px; font-weight:400; }
.inputs { display:grid; grid-template-columns:1.4fr 1.15fr 1.35fr repeat(2,.75fr); gap:12px; padding:22px 0; border-bottom:1px solid var(--line); }
.inputs label,.requirements label { display:grid; gap:6px; color:#555551; font-size:10px; font-weight:600; }
input,select { width:100%; min-height:39px; border:1px solid #cfcfca; border-radius:0; padding:0 10px; color:#111; background:#fff; outline:0; font-size:12px; }
input:focus,select:focus { border-color:#111; box-shadow:0 0 0 1px #111; }
.location-card { display:flex; align-items:end; justify-content:space-between; gap:30px; padding:28px 0; border-bottom:1px solid var(--line); }
.location-card p:not(.kicker) { margin:7px 0 0; color:var(--muted); font-size:12px; }
.location-form { display:flex; gap:8px; width:min(100%,620px); }
.location-picker { position:relative; flex:1; }
.location-options { position:absolute; z-index:20; top:calc(100% + 4px); left:0; right:0; border:1px solid #111; background:#fff; box-shadow:5px 5px 0 #111; }
.location-options > strong { display:block; padding:10px 11px; border-bottom:1px solid var(--line); font-family:"IBM Plex Mono",monospace; font-size:10px; }
.location-choice { display:grid; grid-template-columns:1fr auto; border-bottom:1px solid #e5e5e1; }.location-options button { display:grid; width:100%; gap:3px; border:0; padding:10px 11px; text-align:left; color:#111; background:#fff; }
.location-options button:hover,.location-choice:hover { background:#f2f2ef; }.location-choice a { align-self:center; margin-right:10px; border-left:1px solid var(--line); padding-left:10px; color:#111; font-family:"IBM Plex Mono",monospace; font-size:9px; text-decoration:none; }
.location-options b { font-size:12px; }.location-options small { color:var(--muted); font-size:10px; }
.location-status { display:block; margin-top:6px; color:var(--muted); font-size:10px; line-height:1.4; }
.requirements { display:grid; grid-template-columns:1.3fr repeat(6,1fr); gap:11px; align-items:end; padding:20px 0; border-bottom:1px solid var(--line); }
.requirements > span { align-self:center; font-family:"IBM Plex Mono",monospace; font-size:10px; letter-spacing:.08em; }
.requirements select,.requirements input { min-height:35px; }
.scope-row { display:flex; align-items:center; gap:7px; padding:15px 0; border-bottom:1px solid var(--line); }
.scope-row span { margin-right:8px; font-family:"IBM Plex Mono",monospace; font-size:10px; letter-spacing:.07em; }
.scope-row button,.button-pair button { border:1px solid var(--line); padding:7px 10px; color:#555; background:#fff; font-size:11px; }
.scope-row button.active,.button-pair button.active { border-color:#111; color:#fff; background:#111; }.scope-row small { margin-left:auto; color:var(--muted); font-size:10px; }
.workspace { display:grid; grid-template-columns:220px minmax(480px,1fr) 284px; gap:0; margin-top:24px; border:1px solid #111; }
.map-controls,.candidate-panel { padding:18px; background:#fff; }.map-controls { display:flex; flex-direction:column; gap:10px; border-right:1px solid #111; }.map-controls hr { width:100%; margin:5px 0; border:0; border-top:1px solid var(--line); }
.button-pair { display:grid; grid-template-columns:1fr 1fr; }.outline-button,.text-button { border:1px solid #111; padding:10px; color:#111; background:#fff; text-align:left; font-size:11px; font-weight:600; }.outline-button.active { color:#fff; background:#111; }.text-button { border:0; padding:4px 0; text-decoration:underline; font-size:10px; }.map-controls small,.source-note { margin:0; color:var(--muted); font-size:10px; line-height:1.55; }
.map-frame { position:relative; min-height:620px; overflow:hidden; border-right:1px solid #111; background:#ecece9; }.real-map { position:absolute; inset:0; min-height:620px; font-family:Inter,Arial,sans-serif; filter:grayscale(1) contrast(.92); }.map-loading { display:grid; min-height:620px; place-items:center; background:#f2f2ef; font-size:12px; }.map-caption { position:absolute; z-index:5; bottom:12px; left:12px; max-width:270px; padding:7px 9px; color:#111; background:rgba(255,255,255,.94); border:1px solid #111; font-size:9px; line-height:1.4; }
.map-fallback { position:absolute; inset:0; background:#f2f2ef; }.map-fallback iframe { width:100%; height:100%; border:0; filter:grayscale(1) contrast(.92); }.map-fallback button { position:absolute; z-index:6; left:12px; top:12px; border:1px solid #111; padding:8px 9px; color:#fff; background:#111; font-size:10px; }.map-fallback p { position:absolute; right:12px; top:12px; max-width:210px; margin:0; padding:7px 9px; color:#111; background:rgba(255,255,255,.94); border:1px solid #111; font-size:9px; line-height:1.4; }
.candidate-panel { display:flex; flex-direction:column; gap:17px; }.candidate-list { display:grid; gap:3px; }.candidate-row { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:stretch; border:1px solid transparent; background:#fff; }.candidate-row:hover,.candidate-row.active { border-color:#111; background:#f4f4f1; }.candidate { display:grid; grid-template-columns:25px 1fr auto; gap:8px; align-items:center; width:100%; min-width:0; border:0; padding:9px 4px; text-align:left; color:#111; background:transparent; }.candidate-row a { display:grid; place-items:center; border-left:1px solid var(--line); padding:0 8px; color:#111; font-family:"IBM Plex Mono",monospace; font-size:9px; text-decoration:none; }.candidate-row a:hover,.candidate-row a:focus-visible { color:#fff; background:#111; outline:0; }.candidate > span { font-family:"IBM Plex Mono",monospace; font-size:10px; }.candidate b,.candidate small { display:block; }.candidate b { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; }.candidate small { margin-top:3px; color:var(--muted); font-family:"IBM Plex Mono",monospace; font-size:9px; }.candidate > strong { font-size:16px; letter-spacing:-.05em; }
.evidence { display:grid; gap:6px; margin-top:auto; border-top:1px solid var(--line); padding-top:13px; }.evidence b { font-size:12px; }.evidence small { color:var(--muted); font-size:10px; line-height:1.45; }
.shortlist { display:grid; grid-template-columns:.68fr 1.32fr; gap:28px; align-items:center; margin-top:24px; border:1px solid #111; padding:22px; }.shortlist p:not(.kicker) { margin:7px 0 0; color:var(--muted); font-size:11px; }.shortlist ol { display:grid; gap:0; margin:0; padding:0; list-style:none; }.shortlist li { display:grid; grid-template-columns:40px 1fr auto; gap:10px; align-items:center; min-width:0; border-top:1px solid var(--line); padding:12px 0; }.shortlist li:first-child { border-top:0; }.shortlist li > span { font-family:"IBM Plex Mono",monospace; font-size:11px; }.shortlist li b,.shortlist li small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.shortlist li b { font-size:12px; }.shortlist li small { margin-top:3px; color:var(--muted); font-size:9px; }.shortlist li strong { font-size:16px; }
.legal-review { display:grid; grid-template-columns:.68fr 1.32fr; gap:28px; align-items:start; margin-top:24px; border:1px solid #111; padding:22px; }.legal-review h2 { margin:0; font-size:19px; letter-spacing:-.04em; }.legal-review p:not(.kicker) { margin:8px 0 0; color:var(--muted); font-size:10px; line-height:1.55; }.table-wrap { overflow-x:auto; }.legal-review table { width:100%; min-width:780px; border-collapse:collapse; font-size:10px; line-height:1.45; }.legal-review th,.legal-review td { vertical-align:top; border-bottom:1px solid var(--line); padding:9px 8px; text-align:left; }.legal-review th { color:#555; font-family:"IBM Plex Mono",monospace; font-size:9px; font-weight:500; letter-spacing:.04em; text-transform:uppercase; }.legal-review td:first-child { min-width:116px; }.legal-review td b,.legal-review td small { display:block; }.legal-review td b { font-size:10px; }.legal-review td small { margin-top:3px; color:var(--muted); font-size:9px; }
.connection-review,.financial-review { display:grid; grid-template-columns:.68fr 1.32fr; gap:28px; align-items:start; margin-top:24px; border:1px solid #111; padding:22px; }.connection-review h2,.financial-review h2 { margin:0; font-size:19px; letter-spacing:-.04em; }.connection-review p:not(.kicker),.financial-review p:not(.kicker) { margin:8px 0 0; color:var(--muted); font-size:10px; line-height:1.55; }.connection-review ul { display:grid; gap:8px; margin:0; padding:0; list-style:none; }.connection-review li { border-bottom:1px solid var(--line); padding:0 0 8px; font-size:11px; line-height:1.45; }.connection-review small { display:block; margin-top:12px; color:var(--muted); font-size:10px; line-height:1.55; }.financial-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); border:1px solid var(--line); }.financial-grid article { display:grid; gap:6px; min-height:100px; padding:15px; border-right:1px solid var(--line); border-bottom:1px solid var(--line); }.financial-grid article:nth-child(2n) { border-right:0; }.financial-grid article:nth-last-child(-n+2) { border-bottom:0; }.financial-grid small,.financial-grid span { color:var(--muted); font-size:9px; line-height:1.4; }.financial-grid b { font-size:20px; letter-spacing:-.05em; }
.facts { display:grid; grid-template-columns:repeat(3,1fr); gap:0; margin-top:24px; border:1px solid #111; }.facts article { display:grid; gap:8px; min-height:150px; padding:20px; border-right:1px solid #111; }.facts article:last-child { border-right:0; }.facts b { font-size:24px; font-weight:500; letter-spacing:-.04em; }.facts small { max-width:350px; color:var(--muted); font-size:10px; line-height:1.55; }
.assistant-bar { position:fixed; z-index:30; right:18px; bottom:18px; display:grid; gap:10px; width:300px; border:1px solid #111; padding:13px; background:#fff; box-shadow:5px 5px 0 #111; }.assistant-bar b { font-size:12px; }.messages { display:grid; gap:6px; max-height:144px; overflow:auto; }.messages p { margin:0; padding:7px 8px; font-size:10px; line-height:1.4; }.messages .assistant { color:#222; background:#f0f0ed; }.messages .user { border:1px solid var(--line); text-align:right; }.assistant-input { display:grid; grid-template-columns:1fr 34px; }.assistant-bar input { min-height:34px; font-size:10px; }.assistant-bar button { border:1px solid #111; color:#fff; background:#111; font-size:16px; }
.compare-review { display:grid; grid-template-columns:.68fr 1.32fr; gap:28px; align-items:start; margin-top:24px; border:1px solid #111; padding:22px; }.compare-review h2 { margin:0; font-size:19px; letter-spacing:-.04em; }.compare-review p:not(.kicker) { margin:8px 0 0; color:var(--muted); font-size:10px; line-height:1.55; }.compare-workspace { display:grid; gap:15px; }.compare-controls { display:grid; grid-template-columns:1fr 1fr; gap:10px; }.compare-controls label { display:grid; gap:5px; color:#555; font-family:"IBM Plex Mono",monospace; font-size:9px; letter-spacing:.04em; text-transform:uppercase; }.compare-controls select { min-width:0; border:1px solid #111; padding:9px; color:#111; background:#fff; font-family:Inter,Arial,sans-serif; font-size:11px; text-transform:none; }.comparison-table { width:100%; border-collapse:collapse; font-size:10px; }.comparison-table th,.comparison-table td { border-bottom:1px solid var(--line); padding:9px 8px; text-align:left; }.comparison-table th { color:#555; font-family:"IBM Plex Mono",monospace; font-size:9px; font-weight:500; letter-spacing:.04em; text-transform:uppercase; }.comparison-table td:last-child { font-weight:600; }.comparison-summary { padding:10px; color:#222!important; background:#f3f3ef; border-left:2px solid #111; }
footer { max-width:980px; margin:28px auto 0; color:#777; font-size:10px; line-height:1.6; text-align:center; }
@media (max-width:780px) { .compare-review { grid-template-columns:1fr; gap:14px; }.compare-controls { grid-template-columns:1fr; } }
@media (max-width:1250px) { .inputs { grid-template-columns:repeat(3,1fr); }.requirements { grid-template-columns:repeat(4,1fr); }.requirements > span { grid-column:span 4; }.workspace { grid-template-columns:190px 1fr; }.candidate-panel { grid-column:span 2; border-top:1px solid #111; }.candidate-list { grid-template-columns:repeat(2,1fr); }.evidence { display:none; } }
@media (max-width:780px) { .map-app { padding:0 14px 35px; }.topbar { height:62px; }.top-meta { display:none; }.intro { align-items:start; flex-direction:column; padding:42px 0 30px; }.intro h1 { font-size:49px; }.brief-strip,.location-card,.shortlist,.legal-review,.connection-review,.financial-review { grid-template-columns:1fr; display:grid; }.location-form { width:100%; }.inputs,.requirements { grid-template-columns:1fr 1fr; }.requirements > span { grid-column:span 2; }.scope-row { flex-wrap:wrap; }.scope-row small { width:100%; margin-left:0; }.workspace { grid-template-columns:1fr; }.map-controls { border-right:0; border-bottom:1px solid #111; }.map-frame { min-height:480px; border-right:0; }.real-map { min-height:480px; }.candidate-panel { grid-column:auto; }.candidate-list { grid-template-columns:1fr; }.shortlist,.legal-review,.connection-review,.financial-review { gap:14px; }.facts { grid-template-columns:1fr; }.facts article { border-right:0; border-bottom:1px solid var(--line); }.facts article:last-child { border-bottom:0; }.assistant-bar { position:static; width:auto; margin-top:24px; box-shadow:none; } }
@media (max-width:430px) { .inputs,.requirements { grid-template-columns:1fr; }.requirements > span { grid-column:auto; }.location-form { display:grid; }.intro h1 { font-size:43px; } }
