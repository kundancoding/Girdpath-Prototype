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
    setSourceStatus(`Checking public power and transport features near ${placeLabels[point.id] || "this area"}…`);
    try {
      const query = `[out:json][timeout:12];(nwr(around:5000,${point.lat},${point.lng})["power"~"substation|plant|generator"];way(around:5000,${point.lat},${point.lng})["highway"~"motorway|trunk|primary"];);out center;`;
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      const data = await response.json();
      let power = 0; let transport = 0;
      for (const item of data.elements ?? []) {
        const itemPoint = { lat: item.lat ?? item.center?.lat, lng: item.lon ?? item.center?.lon };
        if (!Number.isFinite(itemPoint.lat) || distanceKm(point, itemPoint) > 5) continue;
        if (item.tags?.power) power += 1;
        if (item.tags?.highway || item.tags?.railway) transport += 1;
      }
      const result = { power: Math.min(power, 6), transport: Math.min(transport, 8), checked: true };
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
      setInfrastructure((current) => ({ ...current, [point.id]: result }));
      setSourceStatus("Public power and transport check complete for the selected area.");
    } catch { setSourceStatus("Public map verification is unavailable right now. This area remains unverified."); }
  }

  async function refreshLive(point = coordinates) {
    try {
      const [weatherResponse, elevationResponse] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${point.lat}&longitude=${point.lng}&timezone=auto&current=temperature_2m,wind_speed_10m,wind_gusts_10m,precipitation`),
        fetch(`https://api.open-meteo.com/v1/elevation?latitude=${point.lat}&longitude=${point.lng}`),
      ]);
      const weatherData = await weatherResponse.json();
      const elevationData = await elevationResponse.json();
      if (weatherData.current) setWeather({ temperature: weatherData.current.temperature_2m, wind: weatherData.current.wind_speed_10m, gusts: weatherData.current.wind_gusts_10m, precipitation: weatherData.current.precipitation, updated: weatherData.current.time });
      if (typeof elevationData.elevation?.[0] === "number") setElevation(Math.round(elevationData.elevation[0]));
    } catch { setWeather(null); setElevation(null); }
  }
  useEffect(() => { void refreshLive(); }, []);

  function chooseLocation(choice: LocationChoice) {
    const point = { lat: choice.latitude, lng: choice.longitude };
    selectedLocationQuery.current = choice.name;
    setCoordinates(point); setLocationName(choice.name); setCountryCode(choice.country_code ?? ""); setSearch(choice.name); setChoices([]); setShowChoices(false); setLocationStatus(`${choice.name} selected.`); setActiveCandidate(0); void refreshLive(point);
  }
  async function searchForLocation() {
    const direct = search.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (direct) { const point = { lat: Number(direct[1]), lng: Number(direct[2]) }; setCoordinates(point); setLocationName("Selected point"); setShowChoices(false); setLocationStatus("Coordinates selected."); void refreshLive(point); return; }
    setFinding(true);
    try {
      const query = search.trim();
      const request = ++locationSearchRequest.current;
      const results = await searchLocations(query);
      if (request === locationSearchRequest.current) { setChoices(results); setShowChoices(true); setLocationStatus(results.length ? "Choose the exact place from the matches below." : "No matching place found. Try city, state, country, or coordinates."); }
    } catch { setLocationStatus("Location service is temporarily unavailable. Please retry."); }
    finally { setFinding(false); }
  }

  function applyText(text: string) {
    const clean = text.replace(/\s+/g, " ").trim();
    const lower = clean.toLowerCase();
    const changes: string[] = [];
    const type = lower.includes("nuclear") ? "Nuclear power plant" : lower.includes("data center") ? "Data center" : lower.includes("hydrogen") ? "Green hydrogen" : lower.includes("transmission") || lower.includes("highline") ? "Transmission line" : lower.includes("geothermal") ? "Geothermal" : lower.includes("wind") ? "Wind" : lower.includes("battery") ? "Battery storage" : lower.includes("solar") ? "Solar + storage" : "";
    if (type && type !== projectType) { setProjectType(type); changes.push(type); }
    const mw = clean.match(/\b(\d+(?:\.\d+)?)\s*(?:mw|megawatt)/i);
    if (mw) { setCapacity(mw[1]); changes.push(`${mw[1]} MW`); }
    const land = clean.match(/\b(\d+(?:\.\d+)?)\s*acres?\b/i);
    if (land) { setLandAcres(land[1]); changes.push(`${land[1]} acres`); }
    const money = clean.match(/\$?\s*(\d+(?:\.\d+)?)\s*(?:m|million)\b/i);
    if (money && /budget|capex|cost/i.test(clean)) { setBudget(money[1]); changes.push(`$${money[1]}M budget`); }
    if (/fast|urgent|quick/.test(lower)) { setSchedule("Fast-track"); changes.push("fast-track delivery"); }
    if (/grid|interconnection|substation/.test(lower)) { setPriority("Grid access"); changes.push("grid priority"); }
    else if (/permit|legal|regulat/.test(lower)) { setPriority("Permitting speed"); changes.push("permitting priority"); }
    else if (/environment|wetland|habitat|carbon/.test(lower)) { setPriority("Environmental fit"); changes.push("environment priority"); }
    else if (/cost|cheap|economic|finance/.test(lower)) { setPriority("Economics"); changes.push("economics priority"); }
    return changes;
  }

  async function handleBrief(file: File) {
    setBriefBusy(true);
    try {
      let text = "";
      if (/\.pptx$/i.test(file.name)) {
        const { default: JSZip } = await import("jszip");
        const zip = await JSZip.loadAsync(file);
        const slides = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => Number(a.match(/slide(\d+)/)?.[1]) - Number(b.match(/slide(\d+)/)?.[1]));
        text = (await Promise.all(slides.map(async (name) => (await zip.file(name)?.async("string") ?? "").replace(/<[^>]+>/g, " ")))).join(" ");
      } else if (/\.(md|txt)$/i.test(file.name)) text = await file.text();
      else throw new Error("Use a .md, .txt, or .pptx file.");
      const changes = applyText(text);
      setBriefName(file.name);
      setBriefSummary(changes.length ? `Read ${file.name}: ${changes.join(" · ")}` : `Read ${file.name}. Add the project inputs that should drive the screen.`);
    } catch (error) { setBriefSummary(error instanceof Error ? error.message : "That file could not be read."); }
    finally { setBriefBusy(false); }
  }
  function onDrop(event: DragEvent<HTMLLabelElement>) { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void handleBrief(file); }
  function onFileChange(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (file) void handleBrief(file); }
  function sendAssistant() {
    const text = assistantInput.trim(); if (!text) return;
    const changes = applyText(text);
    setMessages((items) => [...items, { role: "user", text }, { role: "assistant", text: changes.length ? `Updated: ${changes.join(" · ")}. The shortlist recalculated.` : "I did not find a parameter to change. Try “prioritise grid access”, “300 MW solar”, or “fast-track delivery”." }]);
    setAssistantInput("");
  }
  const legalArea = countryCode === "IN" ? "India · state / local authority review" : countryCode === "US" ? "United States · state / local authority review" : countryCode ? `${countryCode} · local authority review` : "Jurisdiction not yet resolved";
  const projectLegalCheck = projectType === "Nuclear power plant" ? "Nuclear siting, safety, environmental and land approvals" : projectType === "Transmission line" ? "Route, easement, right-of-way and environmental review" : "Land-use, environmental and project-permit review";

  return <main className="map-app">
    <header className="topbar"><a className="brand" href="#workspace"><img src={GP_ICON} alt="GP" /><span>GRIDPATH</span></a><div className="top-meta">PUBLIC DATA SCREEN · NOT A PERMIT OR INVESTMENT DECISION</div></header>
    <section className="intro" id="workspace"><div><p className="kicker">SITE SELECTION</p><h1>Make the location decision simpler.</h1><p>Bring in a project brief, find the exact place, and compare grounded public signals on one map.</p></div><button className="black-button" onClick={() => void refreshLive()}>Refresh live data</button></section>

    <section className="brief-strip"><div><p className="kicker">START WITH A BRIEF</p><h2>Skip the form if you already have the story.</h2></div><label className="dropzone" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><input type="file" accept=".md,.txt,.pptx" onChange={onFileChange} />{briefBusy ? "Reading brief…" : "Drop a .md or .pptx here, or browse"}<small>{briefSummary || "We only read the file in this browser to prefill assumptions."}</small></label></section>

    <section className="inputs"><label>Company<input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" /></label><label>Project<input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project name" /></label><label>Technology<select value={projectType} onChange={(e) => setProjectType(e.target.value)}>{["Solar + storage","Utility solar","Battery storage","Wind","Nuclear power plant","Gas / thermal plant","Green hydrogen","Data center","Transmission line","Manufacturing / industrial","Geothermal"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Capacity (MW)<input value={capacity} inputMode="decimal" onChange={(e) => setCapacity(e.target.value)} /></label><label>Land (acres)<input value={landAcres} inputMode="decimal" onChange={(e) => setLandAcres(e.target.value)} /></label></section>

    <section className="location-card"><div><p className="kicker">LOCATION</p><h2>Where do you want to build?</h2><p>{locationName} · {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}</p></div><div className="location-form"><div className="location-picker"><input value={search} onFocus={() => setShowChoices(true)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchForLocation(); } }} onChange={(e) => { setSearch(e.target.value); setChoices([]); setShowChoices(false); setLocationStatus(""); }} placeholder="City, state, country, or coordinates" aria-label="Location search" />{showChoices && choices.length > 0 && <div className="location-options"><strong>DO YOU MEAN…</strong>{choices.map((choice) => <div className="location-choice" key={choice.id}><button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => chooseLocation(choice)}><b>{choice.name}</b><small>{[choice.admin1, choice.country].filter(Boolean).join(", ")} · {choice.latitude.toFixed(4)}, {choice.longitude.toFixed(4)}</small></button><a href={`https://www.google.com/maps/search/?api=1&query=${choice.latitude},${choice.longitude}`} target="_blank" rel="noreferrer" aria-label={`Open ${choice.name} in Google Maps`}>Maps ↗</a></div>)}</div>}<small className="location-status" aria-live="polite">{locationStatus}</small></div><button type="button" className="black-button" disabled={finding} onClick={() => void searchForLocation()}>{finding ? "Finding…" : "Search locations"}</button></div></section>

    <section className="requirements"><span>WHAT MATTERS MOST</span><select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{["Balanced","Grid access","Environmental fit","Permitting speed","Economics"].map((item) => <option key={item}>{item}</option>)}</select><label>Grid<select value={gridNeed} onChange={(e) => setGridNeed(e.target.value)}><option>High</option><option>Medium</option><option>Low</option></select></label><label>Water<select value={waterNeed} onChange={(e) => setWaterNeed(e.target.value)}><option>Low</option><option>Medium</option><option>High</option></select></label><label>Schedule<select value={schedule} onChange={(e) => setSchedule(e.target.value)}><option>Fast-track</option><option>Standard</option><option>Flexible</option></select></label><label>Risk<select value={riskTolerance} onChange={(e) => setRiskTolerance(e.target.value)}><option>Conservative</option><option>Balanced</option><option>Opportunistic</option></select></label><label>Budget ($M)<input value={budget} onChange={(e) => setBudget(e.target.value)} /></label></section>

    <section className="scope-row"><span>SCREENING AREA</span>{(["local","city","regional","state","country"] as Scope[]).map((item) => <button className={scope === item ? "active" : ""} key={item} onClick={() => { setScope(item); setActiveCandidate(0); setCompareCandidateId(""); }}>{item === "local" ? "Local" : item === "regional" ? "Regional" : item === "state" ? "State / province" : item}</button>)}<small>{scopeConfig.label}</small></section>

    <section className="workspace"><aside className="map-controls"><p className="kicker">MAP MODE</p><div className="button-pair"><button className={layer === "street" ? "active" : ""} onClick={() => setLayer("street")}>Map</button><button className={layer === "satellite" ? "active" : ""} onClick={() => setLayer("satellite")}>Satellite</button></div><button className={drawMode ? "outline-button active" : "outline-button"} onClick={() => setDrawMode(!drawMode)}>{drawMode ? "Click map to set boundary" : "Draw build area"}</button><button className="text-button" onClick={() => { setAreaPoints([]); setDrawMode(false); }}>Clear boundary</button><small>{areaPoints.length >= 3 ? `${areaPoints.length} points define the screening boundary.` : "Add at least 3 points to limit suggestions to your area."}</small><hr/><p className="source-note">{sourceStatus}</p></aside>
      <div className="map-frame"><MapPanel coordinates={coordinates} mapLayer={layer} candidates={candidates.map((candidate) => ({ name: placeLabels[candidate.id] || "Local area", id: candidate.id, lat: candidate.lat, lng: candidate.lng, selectedScore: candidate.composite }))} activeCandidate={activeCandidate} onCandidateSelect={(index) => { setActiveCandidate(index); void verifyCandidate(candidates[index]); }} projectName={projectName || company || "Project focus"} zoom={scopeConfig.zoom} radius={scopeConfig.radius} drawMode={drawMode} areaPoints={areaPoints} onAreaChange={setAreaPoints}/><div className="map-caption">Public infrastructure screen: OSM power + transport · live weather/elevation</div></div>
      <aside className="candidate-panel"><div><p className="kicker">CANDIDATE AREAS</p><h2>Evidence before confidence.</h2></div><div className="candidate-list">{candidates.map((candidate, index) => <div className={index === activeCandidate ? "candidate-row active" : "candidate-row"} key={candidate.id}><button className="candidate" onClick={() => { setActiveCandidate(index); void verifyCandidate(candidate); }}><span>{index + 1}</span><div><b>{placeLabels[candidate.id] || "Local area"}</b><small>{candidate.lat.toFixed(4)}, {candidate.lng.toFixed(4)}</small></div><strong>{candidate.composite}</strong></button><a href={`https://www.google.com/maps/search/?api=1&query=${candidate.lat},${candidate.lng}`} target="_blank" rel="noreferrer" aria-label={`Open ${placeLabels[candidate.id] || "candidate area"} in Google Maps`}>Maps ↗</a></div>)}</div>{selected && <div className="evidence"><b>{placeLabels[selected.id] || "Local area"}</b><small>Grid: {selected.signal?.checked ? `${selected.signal.power} public power features / ${selected.signal.transport} transport features within 5 km` : "Choose this area to run its public map check."}</small><small>Environmental: {selected.environment}/100 · Policy screen: {selected.policy}/100</small></div>}</aside>
    </section>

    <section className="compare-review"><div><p className="kicker">TWO-LOCATION COMPARISON</p><h2>Trade-offs, not just a rank.</h2><p>Compare any two candidate areas across the same current project assumptions and screening lens.</p></div>{selected && compared && <div className="compare-workspace"><div className="compare-controls"><label>Location A<select value={selected.id} onChange={(event) => { const index = candidates.findIndex((candidate) => candidate.id === event.target.value); if (index >= 0) { setActiveCandidate(index); void verifyCandidate(candidates[index]); } }}>{candidates.map((candidate, index) => <option key={candidate.id} value={candidate.id}>{index + 1}. {placeLabels[candidate.id] || "Candidate area"} · {candidate.lat.toFixed(3)}, {candidate.lng.toFixed(3)}</option>)}</select></label><label>Location B<select value={compared.id} onChange={(event) => { setCompareCandidateId(event.target.value); const candidate = candidates.find((item) => item.id === event.target.value); if (candidate) void verifyCandidate(candidate); }}>{candidates.filter((candidate) => candidate.id !== selected.id).map((candidate, index) => <option key={candidate.id} value={candidate.id}>{index + 1}. {placeLabels[candidate.id] || "Candidate area"} · {candidate.lat.toFixed(3)}, {candidate.lng.toFixed(3)}</option>)}</select></label></div><div className="table-wrap"><table className="comparison-table"><thead><tr><th>Metric</th><th>{placeLabels[selected.id] || "Location A"}</th><th>{placeLabels[compared.id] || "Location B"}</th><th>Edge</th></tr></thead><tbody>{comparisonMetrics.map(([metric, first, second]) => <tr key={metric}><td>{metric}</td><td>{first}/100</td><td>{second}/100</td><td>{first === second ? "Even" : first > second ? "Location A" : "Location B"}</td></tr>)}</tbody></table></div><p className="comparison-summary">{placeLabels[selected.id] || "Location A"} is {Math.abs(selected.composite - compared.composite)} points {selected.composite === compared.composite ? "level with" : selected.composite > compared.composite ? "ahead of" : "behind"} {placeLabels[compared.id] || "Location B"} under the current <b>{priority.toLowerCase()}</b> lens.</p></div>}</section>

    <section className="shortlist"><div><p className="kicker">DECISION SHORTLIST</p><h2>Three most viable areas</h2><p>Weighted toward <b>{priority.toLowerCase()}</b>.</p></div><ol>{shortlist.map((candidate, index) => <li key={candidate.id}><span>0{index + 1}</span><div><b>{placeLabels[candidate.id] || "Local area"}</b><small>{candidate.lat.toFixed(4)}, {candidate.lng.toFixed(4)} · grid {candidate.grid} · environment {candidate.environment} · policy {candidate.policy}</small></div><strong>{candidate.composite}/100</strong></li>)}</ol></section>

    <section className="legal-review"><div><p className="kicker">LEGAL, LAND & PRICE REVIEW</p><h2>What changes across the leading locations?</h2><p>These are evidence gaps and review prompts—not legal conclusions. The table never invents title, ownership, zoning, or price data.</p></div><div className="table-wrap"><table><thead><tr><th>Location</th><th>Legal area</th><th>Potential positive</th><th>Legal / land check</th><th>Ownership & price</th></tr></thead><tbody>{shortlist.map((candidate) => <tr key={candidate.id}><td><b>{placeLabels[candidate.id] || "Local area"}</b><small>{candidate.lat.toFixed(4)}, {candidate.lng.toFixed(4)}</small></td><td>{legalArea}</td><td>{candidate.signal?.checked ? `${candidate.signal.power} mapped power features and ${candidate.signal.transport} transport features within 5 km.` : "No public infrastructure result yet — do not infer a benefit."}</td><td>{projectLegalCheck}. Land use, protected areas, and local conditions require the relevant authority's record.</td><td><b>Not connected</b><small>Ownership/title, parcel class, encumbrances, assessed value, and market comps require an official registry or licensed parcel/price feed.</small></td></tr>)}</tbody></table></div></section>

    <section className="connection-review"><div><p className="kicker">GRID CONNECTION DOCUMENTATION</p><h2>What the selected jurisdiction normally requires</h2><p><b>Authority path:</b> {gridDocumentation.authority}</p><p>{gridDocumentation.route}</p></div><div><p className="kicker">TECHNICAL PACKET</p><ul>{gridDocumentation.documents.map((document) => <li key={document}>{document}</li>)}</ul><small>This is an intake checklist, not a complete filing. The exact utility, voltage, project type, and local jurisdiction determine the governing tariff, study scope, standards, fees, and approvals.</small></div></section>

    <section className="financial-review"><div><p className="kicker">FINANCIAL PRICE ANALYSIS</p><h2>Early cost screen</h2><p>Scenario values use your capacity, land, project type, budget, and a transparent contingency. They are not market quotes, appraisals, or a bid.</p></div><div className="financial-grid"><article><small>Input CAPEX</small><b>${financials.capex.toFixed(1)}M</b><span>{financials.perMw.toFixed(2)}M per MW</span></article><article><small>Contingency reserve</small><b>${financials.reserve.toFixed(1)}M</b><span>Project-type risk allowance</span></article><article><small>Indicative land screen</small><b>${financials.landScreen.toFixed(1)}M</b><span>Area-based placeholder; verify local comps</span></article><article><small>Planning range</small><b>${financials.low.toFixed(1)}–${financials.high.toFixed(1)}M</b><span>Before grid upgrade, finance, tax, and permits</span></article></div></section>

    <section className="facts"><article><p className="kicker">LIVE WEATHER</p><b>{weather ? `${weather.temperature.toFixed(1)}°C` : "—"}</b><small>{weather ? `${weather.wind.toFixed(0)} km/h wind · ${weather.gusts.toFixed(0)} km/h gusts · observed ${weather.updated}` : "Waiting for live weather"}</small></article><article><p className="kicker">TERRAIN</p><b>{elevation === null ? "—" : `${elevation} m`}</b><small>Elevation at the selected point. Survey-grade terrain and flood review remain required.</small></article><article><p className="kicker">REALITY CHECK</p><b>Public-data screen</b><small>OSM infrastructure, weather, and terrain are useful leads—not proof of grid capacity, zoning, ownership, permits, or environmental clearance.</small></article></section>

    <aside className="assistant-bar"><div><p className="kicker">PROJECT ASSISTANT</p><b>Adjust the screen in plain English.</b></div><div className="messages">{messages.slice(-4).map((message, index) => <p className={message.role} key={index}>{message.text}</p>)}</div><div className="assistant-input"><input value={assistantInput} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); sendAssistant(); } }} onChange={(e) => setAssistantInput(e.target.value)} placeholder="e.g. 300 MW wind, grid first" /><button type="button" aria-label="Send parameter request" onClick={sendAssistant}>→</button></div></aside>

    <footer>Sources used in this screen: OpenStreetMap / Overpass public map data, Open-Meteo weather and elevation, and reverse geocoding. Confirm every shortlist with the relevant utility, authority, landowner, engineering survey, and legal counsel.</footer>
  </main>;
}
