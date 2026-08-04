"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import MapPanel from "./MapPanel";

type Coordinates = { lat: number; lng: number };
type Scope = "local" | "city" | "regional" | "state" | "country";
type Layer = "street" | "satellite";
type Priority = "Balanced" | "Grid access" | "Environmental fit" | "Permitting speed" | "Economics";
type LocationChoice = { id: number; name: string; latitude: number; longitude: number; admin1?: string; country?: string; country_code?: string };
type Weather = { temperature: number; wind: number; gusts: number; precipitation: number; updated: string };
type CandidatePoint = Coordinates & { id: string; name?: string; landUse?: string; source: "mapped" | "screening" };
type Evidence = { power: number; transport: number; mappedLand: number; protectedAreas: number; wetlands: number; elevation: number | null; weather: Weather | null; checked: boolean; sources?: string[] };
type Message = { role: "assistant" | "user"; text: string };

const fallback: Coordinates = { lat: 30.2672, lng: -97.7431 };
const scopeSettings: Record<Scope, { offset: number; zoom: number; radius: number; label: string }> = {
  local: { offset: 0.014, zoom: 13, radius: 1100, label: "local 15 km screen" },
  city: { offset: 0.09, zoom: 10, radius: 5500, label: "city screen" },
  regional: { offset: 0.38, zoom: 8, radius: 18000, label: "regional screen" },
  state: { offset: 1.15, zoom: 6, radius: 58000, label: "state / province screen" },
  country: { offset: 3.8, zoom: 4, radius: 190000, label: "country lens" },
};
const screenPattern: Record<Scope, Array<[number, number]>> = {
  local: [[-.36,-.42],[-.1,.46],[.38,-.3],[.44,.34],[0,0],[-.48,.08],[.1,-.54],[.56,.02]],
  city: [[-.8,-.55],[-.48,.6],[.12,-.78],[.62,-.32],[.74,.42],[-.08,.02],[.3,.8],[-.82,.1]],
  regional: [[-.9,-.62],[-.56,.72],[.04,-.92],[.58,-.58],[.86,.24],[-.12,.05],[.38,.9],[-.82,.05]],
  state: [[-.92,-.72],[-.65,.64],[-.12,-.9],[.44,-.64],[.86,-.08],[.68,.68],[.06,.92],[-.72,.12]],
  country: [[-.9,-.8],[-.72,.6],[-.2,-.92],[.34,-.72],[.84,-.2],[.7,.62],[.04,.92],[-.58,.04]],
};
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const mapLink = (point: Coordinates) => `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`;

async function searchLocations(query: string): Promise<LocationChoice[]> {
  const response = await fetch(`/api/location-search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error("Location lookup is unavailable.");
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
  const [coordinates, setCoordinates] = useState<Coordinates>(fallback);
  const [locationName, setLocationName] = useState("Austin");
  const [countryCode, setCountryCode] = useState("US");
  const [scope, setScope] = useState<Scope>("city");
  const [layer, setLayer] = useState<Layer>("street");
  const [drawMode, setDrawMode] = useState(false);
  const [areaPoints, setAreaPoints] = useState<Coordinates[]>([]);
  const [mappedLeads, setMappedLeads] = useState<CandidatePoint[]>([]);
  const [leadStatus, setLeadStatus] = useState("Finding mapped land-use leads around the selected place.");
  const [evidence, setEvidence] = useState<Record<string, Evidence>>({});
  const [sourceStatus, setSourceStatus] = useState("Choose an area to check real public map, terrain, and weather evidence.");
  const [activeId, setActiveId] = useState("");
  const [compareId, setCompareId] = useState("");
  const [briefBusy, setBriefBusy] = useState(false);
  const [briefSummary, setBriefSummary] = useState("");
  const [assistantInput, setAssistantInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", text: "Tell me the objective in plain English. I can adjust the inputs and ranking lens." }]);

  const projectMw = Math.max(1, Number(capacity) || 1);
  const acres = Math.max(1, Number(landAcres) || 1);
  const scopeConfig = scopeSettings[scope];
  const weights = priority === "Grid access" ? [0.44, 0.17, 0.16, 0.12, 0.11] : priority === "Environmental fit" ? [0.16, 0.44, 0.18, 0.12, 0.1] : priority === "Permitting speed" ? [0.16, 0.16, 0.46, 0.12, 0.1] : priority === "Economics" ? [0.2, 0.17, 0.16, 0.17, 0.3] : [0.27, 0.23, 0.22, 0.16, 0.12];

  const screeningPoints = useMemo<CandidatePoint[]>(() => {
    const bounds = areaPoints.length >= 3 ? { minLat: Math.min(...areaPoints.map((point) => point.lat)), maxLat: Math.max(...areaPoints.map((point) => point.lat)), minLng: Math.min(...areaPoints.map((point) => point.lng)), maxLng: Math.max(...areaPoints.map((point) => point.lng)) } : null;
    const longitudeScale = 1 / Math.max(.28, Math.cos(coordinates.lat * Math.PI / 180));
    return screenPattern[scope].map(([north, east], index) => {
      const lat = bounds ? bounds.minLat + (bounds.maxLat - bounds.minLat) * ((north + 1) / 2) : coordinates.lat + north * scopeConfig.offset;
      const lng = bounds ? bounds.minLng + (bounds.maxLng - bounds.minLng) * ((east + 1) / 2) : coordinates.lng + east * scopeConfig.offset * longitudeScale;
      return { id: `screen-${scope}-${index}-${lat.toFixed(4)}-${lng.toFixed(4)}`, lat, lng, name: "Screening point", source: "screening" };
    });
  }, [areaPoints, coordinates, scope, scopeConfig.offset]);
  const candidatePoints = areaPoints.length >= 3 || mappedLeads.length === 0 ? screeningPoints : mappedLeads;

  useEffect(() => {
    if (areaPoints.length >= 3) {
      setMappedLeads([]);
      setLeadStatus("Boundary mode uses your drawn area. Every point remains unverified until it is checked.");
      return;
    }
    let active = true;
    const controller = new AbortController();
    setMappedLeads([]);
    setLeadStatus(`Finding mapped land-use leads for the ${scopeConfig.label}.`);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/candidate-search?lat=${coordinates.lat}&lng=${coordinates.lng}&scope=${scope}`, { signal: controller.signal });
        const data = await response.json() as { candidates?: CandidatePoint[]; source?: string; cappedRadiusM?: number };
        if (!active) return;
        const leads = Array.isArray(data.candidates) ? data.candidates.filter((lead) => Number.isFinite(lead.lat) && Number.isFinite(lead.lng) && Boolean(lead.id)) : [];
        setMappedLeads(leads);
        const coverage = data.cappedRadiusM ? ` within ${Math.round(data.cappedRadiusM / 1000)} km of the selected point` : "";
        setLeadStatus(leads.length ? `${leads.length} real mapped land-use leads found${coverage} via ${data.source || "public map data"}.` : "No mapped land-use lead was returned. Clearly-labelled screening points are shown instead.");
      } catch (error) {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) setLeadStatus("Mapped-area discovery is unavailable. Clearly-labelled screening points are shown instead.");
      }
    }, 180);
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [areaPoints.length, coordinates.lat, coordinates.lng, scope, scopeConfig.label]);

  useEffect(() => {
    if (!candidatePoints.some((point) => point.id === activeId)) setActiveId(candidatePoints[0]?.id || "");
    if (!candidatePoints.some((point) => point.id === compareId)) setCompareId(candidatePoints[1]?.id || candidatePoints[0]?.id || "");
  }, [activeId, candidatePoints, compareId]);

  async function verifyCandidate(point: CandidatePoint, force = false) {
    if (evidence[point.id]?.checked && !force) return;
    const cacheKey = `gridpath-evidence-${point.id}`;
    if (!force) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) { setEvidence((current) => ({ ...current, [point.id]: JSON.parse(cached) as Evidence })); setSourceStatus("Reused this location's public evidence from this session."); return; }
    }
    setSourceStatus(`Checking public map, terrain, and weather evidence near ${point.name || "this area"}...`);
    try {
      const response = await fetch(`/api/candidate-evidence?lat=${point.lat}&lng=${point.lng}`);
      const data = await response.json() as Partial<Evidence> & { error?: string };
      if (!response.ok || !data.checked) throw new Error(data.error || "Evidence response failed");
      const result: Evidence = { power: Number(data.power || 0), transport: Number(data.transport || 0), mappedLand: Number(data.mappedLand || 0), protectedAreas: Number(data.protectedAreas || 0), wetlands: Number(data.wetlands || 0), elevation: typeof data.elevation === "number" ? data.elevation : null, weather: data.weather ?? null, checked: true, sources: data.sources };
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
      setEvidence((current) => ({ ...current, [point.id]: result }));
      setSourceStatus("Public map, terrain, and current-weather evidence is ready for the selected area.");
    } catch { setSourceStatus("Public evidence is unavailable right now. This area stays unverified and is not ranked."); }
  }

  async function verifyAll() {
    setSourceStatus("Checking visible candidates one at a time so the public map service stays responsive...");
    for (const point of candidatePoints) await verifyCandidate(point);
    setSourceStatus("Candidate checks complete. The comparison uses the collected evidence, not placeholder values.");
  }

  const candidates = useMemo(() => {
    const landRatio = projectType === "Data center" ? 1.6 : projectType === "Transmission line" ? 4 : projectType === "Nuclear power plant" ? .12 : projectType === "Wind" ? .35 : 3.3;
    const scalePenalty = Math.max(0, projectMw - acres / landRatio) * .11;
    const policyPressure = projectType === "Nuclear power plant" ? 22 : projectType === "Transmission line" ? 13 : 8;
    return candidatePoints.map((point) => {
      const signal = evidence[point.id];
      const checked = Boolean(signal?.checked);
      const weather = signal?.weather;
      const heatPenalty = weather ? Math.max(0, weather.temperature - 30) * 1.3 : 0;
      const windPenalty = weather ? Math.max(0, weather.gusts - 45) * .4 : 0;
      const terrainPenalty = signal?.elevation === null || signal?.elevation === undefined ? 0 : Math.min(10, Math.abs(signal.elevation) / 240);
      const grid = checked ? clamp(22 + signal.power * 11 + signal.transport * 3 + (gridNeed === "High" ? 8 : 0)) : 0;
      const environment = checked ? clamp(92 - signal.protectedAreas * 28 - signal.wetlands * 18 - heatPenalty - windPenalty - terrainPenalty - (waterNeed === "High" ? 10 : waterNeed === "Medium" ? 5 : 1)) : 0;
      const policy = checked ? clamp(82 - policyPressure - signal.protectedAreas * 24 - signal.wetlands * 12 - (schedule === "Fast-track" ? 12 : schedule === "Standard" ? 6 : 1) - (riskTolerance === "Conservative" ? 5 : 0)) : 0;
      const landFit = checked ? clamp(35 + signal.mappedLand * 12 - signal.protectedAreas * 25 - signal.wetlands * 15 - scalePenalty) : 0;
      const economics = checked ? clamp(28 + signal.power * 9 + signal.transport * 3 + signal.mappedLand * 6 - signal.protectedAreas * 12 - Math.max(0, projectMw - 250) * .025 - Math.max(0, 180 - Number(budget || 250)) * .04) : 0;
      const composite = checked ? clamp(grid * weights[0] + environment * weights[1] + policy * weights[2] + landFit * weights[3] + economics * weights[4]) : 0;
      return { ...point, signal, checked, grid, environment, policy, landFit, economics, composite };
    }).sort((a, b) => Number(b.checked) - Number(a.checked) || b.composite - a.composite);
  }, [acres, budget, candidatePoints, evidence, gridNeed, projectMw, projectType, riskTolerance, schedule, waterNeed, weights]);

  const activeIndex = Math.max(0, candidates.findIndex((candidate) => candidate.id === activeId));
  const selected = candidates[activeIndex] ?? candidates[0];
  const compared = candidates.find((candidate) => candidate.id === compareId && candidate.id !== selected?.id) ?? candidates.find((candidate) => candidate.id !== selected?.id) ?? selected;
  const verified = candidates.filter((candidate) => candidate.checked);
  const shortlist = (verified.length ? verified : candidates).slice(0, 3);
  const projectWeights = `grid ${Math.round(weights[0] * 100)}%, environmental ${Math.round(weights[1] * 100)}%, policy ${Math.round(weights[2] * 100)}%, land ${Math.round(weights[3] * 100)}%, economics ${Math.round(weights[4] * 100)}%`;
  const financials = useMemo(() => {
    const capex = Math.max(0, Number(budget) || 0);
    const reserveRate = projectType === "Nuclear power plant" || projectType === "Transmission line" ? .22 : .14;
    return { capex, reserve: capex * reserveRate, low: capex * .9, high: capex * (1 + reserveRate), perMw: capex / projectMw };
  }, [budget, projectMw, projectType]);
  const legalArea = countryCode === "IN" ? "India - state and local authority review" : countryCode === "US" ? "United States - state and local authority review" : countryCode ? `${countryCode} - local authority review` : "Jurisdiction not yet resolved";
  const legalCheck = projectType === "Nuclear power plant" ? "Nuclear siting, safety, environmental, water, and land approvals" : projectType === "Transmission line" ? "Route, easement, right-of-way, and environmental review" : "Land-use, environmental, grid, and project-permit review";
  const gridDocs = countryCode === "IN" ? ["Confirm whether the proposal connects through DISCOM, STU, CTU, SLDC, and the relevant SERC/CERC route.", "Prepare technical one-line, protection, metering, and preliminary load-flow / fault-level inputs.", "Provide land-right evidence, route survey, environmental approvals, and grid-connectivity application."] : countryCode === "US" ? ["Identify the serving utility and applicable ISO/RTO interconnection tariff before choosing a queue path.", "Prepare site control, one-line, generator data, protection package, and facilities-study inputs.", "Confirm local land use, environmental review, utility easements, and permit route."] : ["Identify the serving utility, grid operator, and governing interconnection code for the exact jurisdiction.", "Prepare technical single-line, requested capacity, protection, metering, and grid-impact inputs.", "Confirm land, environmental, construction, and local authority approvals."];

  const compareRows = selected && compared ? [
    ["Weighted screen", selected.checked ? `${selected.composite}/100` : "Awaiting evidence", compared.checked ? `${compared.composite}/100` : "Awaiting evidence", selected.checked && compared.checked ? (selected.composite === compared.composite ? "Even" : selected.composite > compared.composite ? "Location A" : "Location B") : "Verify both"],
    ["Mapped grid assets (5 km)", selected.checked ? `${selected.signal?.power}` : "Not checked", compared.checked ? `${compared.signal?.power}` : "Not checked", selected.checked && compared.checked ? (selected.signal!.power === compared.signal!.power ? "Even" : selected.signal!.power > compared.signal!.power ? "Location A" : "Location B") : "Verify both"],
    ["Primary road / rail features (5 km)", selected.checked ? `${selected.signal?.transport}` : "Not checked", compared.checked ? `${compared.signal?.transport}` : "Not checked", selected.checked && compared.checked ? (selected.signal!.transport === compared.signal!.transport ? "Even" : selected.signal!.transport > compared.signal!.transport ? "Location A" : "Location B") : "Verify both"],
    ["Mapped industrial / brownfield / farm uses", selected.checked ? `${selected.signal?.mappedLand}` : "Not checked", compared.checked ? `${compared.signal?.mappedLand}` : "Not checked", selected.checked && compared.checked ? (selected.signal!.mappedLand === compared.signal!.mappedLand ? "Even" : selected.signal!.mappedLand > compared.signal!.mappedLand ? "Location A" : "Location B") : "Verify both"],
    ["Protected / wetland tags (5 km)", selected.checked ? `${selected.signal?.protectedAreas} / ${selected.signal?.wetlands}` : "Not checked", compared.checked ? `${compared.signal?.protectedAreas} / ${compared.signal?.wetlands}` : "Not checked", selected.checked && compared.checked ? ((selected.signal!.protectedAreas + selected.signal!.wetlands) === (compared.signal!.protectedAreas + compared.signal!.wetlands) ? "Even" : (selected.signal!.protectedAreas + selected.signal!.wetlands) < (compared.signal!.protectedAreas + compared.signal!.wetlands) ? "Location A" : "Location B") : "Verify both"],
    ["Elevation", selected.checked ? `${selected.signal?.elevation ?? "Unavailable"} m` : "Not checked", compared.checked ? `${compared.signal?.elevation ?? "Unavailable"} m` : "Not checked", "Context only"],
    ["Current weather", selected.signal?.weather ? `${selected.signal.weather.temperature.toFixed(1)} C, ${selected.signal.weather.gusts.toFixed(0)} km/h gusts` : "Not checked", compared.signal?.weather ? `${compared.signal.weather.temperature.toFixed(1)} C, ${compared.signal.weather.gusts.toFixed(0)} km/h gusts` : "Not checked", "Context only"],
    ["Land title, parcel price & grid capacity", "No connected authoritative feed", "No connected authoritative feed", "Registry / utility required"],
  ] as const : [];
  const comparisonSummary = !selected || !compared ? "Choose two areas to compare." : !selected.checked || !compared.checked ? "Run the public evidence check for both locations before drawing a recommendation." : `${selected.composite === compared.composite ? "Neither location has a scoring edge" : selected.composite > compared.composite ? `${selected.name || "Location A"} leads this screen` : `${compared.name || "Location B"} leads this screen`} under the current rubric. This is a transparent screening result, not an optimization proof or permit decision.`;

  function chooseLocation(choice: LocationChoice) {
    setCoordinates({ lat: choice.latitude, lng: choice.longitude });
    setLocationName(choice.name);
    setCountryCode(choice.country_code || "");
    setSearch(choice.name);
    setChoices([]);
    setShowChoices(false);
    setLocationStatus(`${choice.name} selected. Mapped-area discovery has started.`);
    setEvidence({});
    setActiveId("");
    setCompareId("");
  }

  async function searchForLocation() {
    const direct = search.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (direct) {
      const point = { lat: Number(direct[1]), lng: Number(direct[2]) };
      if (Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180) { setLocationStatus("Those coordinates are outside the valid latitude / longitude range."); return; }
      setCoordinates(point); setLocationName("Selected point"); setChoices([]); setShowChoices(false); setLocationStatus("Coordinates selected. Mapped-area discovery has started."); setEvidence({}); return;
    }
    if (search.trim().length < 2) { setLocationStatus("Enter at least two characters, or a latitude and longitude."); return; }
    setFinding(true);
    try {
      const request = ++locationSearchRequest.current;
      const results = await searchLocations(search.trim());
      if (request === locationSearchRequest.current) { setChoices(results); setShowChoices(true); setLocationStatus(results.length ? "Choose the exact place from the matches below." : "No matching place found. Try city, state, country, or coordinates."); }
    } catch { setLocationStatus("Location service is unavailable. Please retry."); }
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
    if (/fast|urgent|quick/.test(lower)) { setSchedule("Fast-track"); changes.push("fast-track schedule"); }
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
        const slides = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
        text = (await Promise.all(slides.map(async (name) => (await zip.file(name)?.async("string") || "").replace(/<[^>]+>/g, " ")))).join(" ");
      } else if (/\.(md|txt)$/i.test(file.name)) text = await file.text();
      else throw new Error("Use a .md, .txt, or .pptx file.");
      const changes = applyText(text);
      setBriefSummary(changes.length ? `Read ${file.name}: ${changes.join(" - ")}` : `Read ${file.name}. Add any project requirements that should drive the screen.`);
    } catch (error) { setBriefSummary(error instanceof Error ? error.message : "That file could not be read."); }
    finally { setBriefBusy(false); }
  }
  function onDrop(event: DragEvent<HTMLLabelElement>) { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void handleBrief(file); }
  function onFileChange(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (file) void handleBrief(file); }
  function sendAssistant() {
    const text = assistantInput.trim();
    if (!text) return;
    const changes = applyText(text);
    setMessages((items) => [...items, { role: "user", text }, { role: "assistant", text: changes.length ? `Updated: ${changes.join(" - ")}. Any verified scores now recalculate.` : "Try a project type, MW, acres, budget, or say which lens matters most." }]);
    setAssistantInput("");
  }

  return <main className="map-app">
    <header className="topbar"><a className="brand" href="#workspace"><span className="brand-mark" aria-hidden="true">GP</span><span>GRIDPATH</span></a><div className="top-meta">PUBLIC DATA SCREEN - NOT A PERMIT OR INVESTMENT DECISION</div></header>
    <section className="intro" id="workspace"><div><p className="kicker">SITE SELECTION</p><h1>Make the location decision simpler.</h1><p>Find real map leads, inspect the evidence, then compare two locations without hiding the unknowns.</p></div><button className="black-button" type="button" onClick={() => selected && void verifyCandidate(selected, true)}>Refresh selected evidence</button></section>

    <section className="brief-strip"><div><p className="kicker">START WITH A BRIEF</p><h2>Skip the form if you already have the story.</h2></div><label className="dropzone" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><input type="file" accept=".md,.txt,.pptx" onChange={onFileChange} />{briefBusy ? "Reading brief..." : "Drop a .md or .pptx here, or browse"}<small>{briefSummary || "The file is read in this browser only to prefill project assumptions."}</small></label></section>
    <section className="inputs"><label>Company<input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Company name" /></label><label>Project<input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Project name" /></label><label>Technology<select value={projectType} onChange={(event) => setProjectType(event.target.value)}>{["Solar + storage","Utility solar","Battery storage","Wind","Nuclear power plant","Gas / thermal plant","Green hydrogen","Data center","Transmission line","Manufacturing / industrial","Geothermal"].map((item) => <option key={item}>{item}</option>)}</select></label><label>Capacity (MW)<input value={capacity} inputMode="decimal" onChange={(event) => setCapacity(event.target.value)} /></label><label>Land (acres)<input value={landAcres} inputMode="decimal" onChange={(event) => setLandAcres(event.target.value)} /></label></section>

    <section className="location-card"><div><p className="kicker">LOCATION</p><h2>Where do you want to build?</h2><p>{locationName} - {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}</p></div><div className="location-form"><div className="location-picker"><input value={search} onFocus={() => choices.length > 0 && setShowChoices(true)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchForLocation(); } }} onChange={(event) => { setSearch(event.target.value); setChoices([]); setShowChoices(false); setLocationStatus(""); }} placeholder="City, state, country, or coordinates" aria-label="Location search" />{showChoices && choices.length > 0 && <div className="location-options"><strong>DO YOU MEAN...</strong>{choices.map((choice) => <div className="location-choice" key={`${choice.id}-${choice.latitude}-${choice.longitude}`}><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseLocation(choice)}><b>{choice.name}</b><small>{[choice.admin1, choice.country].filter(Boolean).join(", ")} - {choice.latitude.toFixed(4)}, {choice.longitude.toFixed(4)}</small></button><a href={mapLink({ lat: choice.latitude, lng: choice.longitude })} target="_blank" rel="noreferrer">Maps -&gt;</a></div>)}</div>}<small className="location-status" aria-live="polite">{locationStatus}</small></div><button type="button" className="black-button" disabled={finding} onClick={() => void searchForLocation()}>{finding ? "Finding..." : "Search locations"}</button></div></section>

    <section className="requirements"><span>WHAT MATTERS MOST</span><select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>{["Balanced","Grid access","Environmental fit","Permitting speed","Economics"].map((item) => <option key={item}>{item}</option>)}</select><label>Grid<select value={gridNeed} onChange={(event) => setGridNeed(event.target.value)}><option>High</option><option>Medium</option><option>Low</option></select></label><label>Water<select value={waterNeed} onChange={(event) => setWaterNeed(event.target.value)}><option>Low</option><option>Medium</option><option>High</option></select></label><label>Schedule<select value={schedule} onChange={(event) => setSchedule(event.target.value)}><option>Fast-track</option><option>Standard</option><option>Flexible</option></select></label><label>Risk<select value={riskTolerance} onChange={(event) => setRiskTolerance(event.target.value)}><option>Conservative</option><option>Balanced</option><option>Opportunistic</option></select></label><label>Budget ($M)<input value={budget} onChange={(event) => setBudget(event.target.value)} /></label></section>
    <section className="scope-row"><span>SCREENING AREA</span>{(["local","city","regional","state","country"] as Scope[]).map((item) => <button type="button" className={scope === item ? "active" : ""} key={item} onClick={() => { setScope(item); setEvidence({}); setActiveId(""); setCompareId(""); }}>{item === "local" ? "Local" : item === "regional" ? "Regional" : item === "state" ? "State / province" : item}</button>)}<small>{scopeConfig.label}</small></section>

    <section className="workspace"><aside className="map-controls"><p className="kicker">MAP MODE</p><div className="button-pair"><button type="button" className={layer === "street" ? "active" : ""} onClick={() => setLayer("street")}>Map</button><button type="button" className={layer === "satellite" ? "active" : ""} onClick={() => setLayer("satellite")}>Satellite</button></div><button type="button" className={drawMode ? "outline-button active" : "outline-button"} onClick={() => setDrawMode((current) => !current)}>{drawMode ? "Click map to set boundary" : "Draw build area"}</button><button type="button" className="text-button" onClick={() => { setAreaPoints([]); setDrawMode(false); }}>Clear boundary</button><button type="button" className="black-button evidence-button" onClick={() => void verifyAll()}>Check displayed areas</button><small>{areaPoints.length >= 3 ? `${areaPoints.length} points define your boundary.` : leadStatus}</small><hr/><p className="source-note">{sourceStatus}</p></aside>
      <div className="map-frame"><MapPanel coordinates={coordinates} mapLayer={layer} candidates={candidates.map((candidate) => ({ name: candidate.name || "Screening point", id: candidate.id, lat: candidate.lat, lng: candidate.lng, selectedScore: candidate.checked ? candidate.composite : 0 }))} activeCandidate={activeIndex} onCandidateSelect={(index) => { const candidate = candidates[index]; if (candidate) { setActiveId(candidate.id); void verifyCandidate(candidate); } }} projectName={projectName || company || "Project focus"} zoom={scopeConfig.zoom} radius={scopeConfig.radius} drawMode={drawMode} areaPoints={areaPoints} onAreaChange={setAreaPoints}/><div className="map-caption">Real map leads: OSM land-use discovery. Evidence: OSM assets + Open-Meteo terrain/weather.</div></div>
      <aside className="candidate-panel"><div><p className="kicker">CANDIDATE AREAS</p><h2>Evidence before confidence.</h2></div><div className="candidate-list">{candidates.map((candidate, index) => <div className={candidate.id === selected?.id ? "candidate-row active" : "candidate-row"} key={candidate.id}><button type="button" className="candidate" onClick={() => { setActiveId(candidate.id); void verifyCandidate(candidate); }}><span>{index + 1}</span><div><b>{candidate.name || "Screening point"}</b><small>{candidate.lat.toFixed(4)}, {candidate.lng.toFixed(4)} - {candidate.source === "mapped" ? candidate.landUse || "mapped lead" : "unverified point"}</small></div><strong>{candidate.checked ? candidate.composite : "check"}</strong></button><a href={mapLink(candidate)} target="_blank" rel="noreferrer">Maps -&gt;</a></div>)}</div>{selected && <div className="evidence"><b>{selected.name || "Screening point"}</b><small>{selected.checked ? `${selected.signal?.power} mapped grid assets, ${selected.signal?.transport} primary road/rail features, ${selected.signal?.protectedAreas} protected tags, and ${selected.signal?.wetlands} wetland tags within 5 km.` : "Not checked. It is not being ranked as a validated recommendation."}</small><small>{selected.checked ? "Sources: OpenStreetMap / Overpass and Open-Meteo. Grid capacity, title, permits, and price are not inferred." : "Click it or use Check displayed areas."}</small></div>}</aside>
    </section>

    <section className="compare-review"><div><p className="kicker">TWO-LOCATION COMPARISON</p><h2>Compare evidence, not just scores.</h2><p>Both sides use the same public-data query window and the same published project rubric.</p><small className="rubric">Current weights: {projectWeights}.</small></div>{selected && compared && <div className="compare-workspace"><div className="compare-controls"><label>Location A<select value={selected.id} onChange={(event) => { setActiveId(event.target.value); const candidate = candidates.find((item) => item.id === event.target.value); if (candidate) void verifyCandidate(candidate); }}>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name || "Screening point"} - {candidate.lat.toFixed(3)}, {candidate.lng.toFixed(3)}</option>)}</select></label><label>Location B<select value={compared.id} onChange={(event) => { setCompareId(event.target.value); const candidate = candidates.find((item) => item.id === event.target.value); if (candidate) void verifyCandidate(candidate); }}>{candidates.filter((candidate) => candidate.id !== selected.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name || "Screening point"} - {candidate.lat.toFixed(3)}, {candidate.lng.toFixed(3)}</option>)}</select></label></div><div className="table-wrap"><table className="comparison-table"><thead><tr><th>Evidence / decision item</th><th>{selected.name || "Location A"}</th><th>{compared.name || "Location B"}</th><th>Reading</th></tr></thead><tbody>{compareRows.map(([metric, first, second, edge]) => <tr key={metric}><td>{metric}</td><td>{first}</td><td>{second}</td><td>{edge}</td></tr>)}</tbody></table></div><p className="comparison-summary">{comparisonSummary}</p></div>}</section>

    <section className="shortlist"><div><p className="kicker">DECISION SHORTLIST</p><h2>{verified.length ? "Evidence-backed leading areas" : "No evidence-backed ranking yet"}</h2><p>{verified.length ? `Ranked under ${priority.toLowerCase()} after public evidence checks.` : "Check the displayed areas before treating any location as a shortlist."}</p></div><ol>{shortlist.map((candidate, index) => <li key={candidate.id}><span>0{index + 1}</span><div><b>{candidate.name || "Screening point"}</b><small>{candidate.lat.toFixed(4)}, {candidate.lng.toFixed(4)} - {candidate.checked ? `grid ${candidate.grid}, environment ${candidate.environment}, policy ${candidate.policy}` : "awaiting evidence"}</small></div><strong>{candidate.checked ? `${candidate.composite}/100` : "check"}</strong></li>)}</ol></section>

    <section className="legal-review"><div><p className="kicker">LEGAL, LAND & PRICE REVIEW</p><h2>What the public sources do not prove.</h2><p>The app reports public map signals and explicitly marks title, law, grid capacity, permit status, and price as unresolved where no authoritative feed is connected.</p></div><div className="table-wrap"><table><thead><tr><th>Location</th><th>Legal area</th><th>Public evidence</th><th>Legal / land review</th><th>Ownership, price & capacity</th></tr></thead><tbody>{shortlist.map((candidate) => <tr key={candidate.id}><td><b>{candidate.name || "Screening point"}</b><small>{candidate.lat.toFixed(4)}, {candidate.lng.toFixed(4)}</small></td><td>{legalArea}</td><td>{candidate.checked ? `${candidate.signal?.power} mapped power assets; ${candidate.signal?.protectedAreas} protected and ${candidate.signal?.wetlands} wetland tags within 5 km.` : "No verified public evidence yet."}</td><td>{legalCheck}. Confirm exact zoning, protected-area boundary, environmental permits, and local jurisdiction with the competent authority.</td><td><b>Not connected</b><small>Official parcel registry / title search, valuation or broker comps, utility interconnection study, and published tariff are required.</small></td></tr>)}</tbody></table></div></section>

    <section className="connection-review"><div><p className="kicker">GRID CONNECTION DOCUMENTATION</p><h2>What a real connection process needs.</h2><p>Public proximity is only a lead. The utility or grid operator determines actual capacity, queue position, network upgrades, timeline, and cost.</p></div><div><p className="kicker">TECHNICAL PACKET</p><ul>{gridDocs.map((document) => <li key={document}>{document}</li>)}</ul><small>Exact rules change by utility, voltage, project type, and jurisdiction. This is a planning checklist, not a filing.</small></div></section>

    <section className="financial-review"><div><p className="kicker">FINANCIAL PRICE ANALYSIS</p><h2>Transparent early cost screen.</h2><p>The budget-based planning range is separate from site-specific costs. The app no longer invents land prices or connection quotes from a country or coordinate.</p></div><div className="financial-grid"><article><small>Input CAPEX</small><b>${financials.capex.toFixed(1)}M</b><span>${financials.perMw.toFixed(2)}M per MW from your inputs</span></article><article><small>Contingency reserve</small><b>${financials.reserve.toFixed(1)}M</b><span>Project-type planning allowance</span></article><article><small>Planning range</small><b>${financials.low.toFixed(1)}-${financials.high.toFixed(1)}M</b><span>Before land, interconnection, tax, financing, and permits</span></article><article><small>Site-specific price evidence</small><b>Not connected</b><span>Requires a parcel / market-price feed and a utility study</span></article></div></section>

    <section className="facts"><article><p className="kicker">SELECTED WEATHER</p><b>{selected?.signal?.weather ? `${selected.signal.weather.temperature.toFixed(1)} C` : "Not checked"}</b><small>{selected?.signal?.weather ? `${selected.signal.weather.wind.toFixed(0)} km/h wind - ${selected.signal.weather.gusts.toFixed(0)} km/h gusts - observed ${selected.signal.weather.updated}` : "Current weather is loaded with an area evidence check."}</small></article><article><p className="kicker">SELECTED TERRAIN</p><b>{selected?.signal?.elevation === null || selected?.signal?.elevation === undefined ? "Not checked" : `${selected.signal.elevation} m`}</b><small>Open-Meteo elevation is a terrain lead. Survey-grade terrain and flood review remain required.</small></article><article><p className="kicker">UNCERTAINTY</p><b>{selected?.checked ? "Known gaps remain" : "Evidence pending"}</b><small>OSM can be incomplete. Do not infer title, zoning, capacity, permits, or market price from public feature counts.</small></article></section>

    <aside className="assistant-bar"><div><p className="kicker">PROJECT ASSISTANT</p><b>Adjust the screen in plain English.</b></div><div className="messages">{messages.slice(-4).map((message, index) => <p className={message.role} key={index}>{message.text}</p>)}</div><div className="assistant-input"><input value={assistantInput} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); sendAssistant(); } }} onChange={(event) => setAssistantInput(event.target.value)} placeholder="e.g. 300 MW wind, grid first" /><button type="button" aria-label="Send parameter request" onClick={sendAssistant}>-&gt;</button></div></aside>
    <footer>Sources: OpenStreetMap / Overpass public map data and Open-Meteo current weather and elevation. Confirm every shortlist with the relevant utility, authority, landowner, engineering survey, official registry, and counsel.</footer>
  </main>;
}
