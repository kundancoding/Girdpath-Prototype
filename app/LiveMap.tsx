"use client";

import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Coordinates = { lat: number; lng: number };
type Candidate = { id: string; name: string; lat: number; lng: number; selectedScore: number };
type Props = { coordinates: Coordinates; mapLayer: "street" | "satellite"; candidates: Candidate[]; activeCandidate: number; onCandidateSelect: (index: number) => void; projectName: string; zoom: number; radius: number; drawMode: boolean; areaPoints: Coordinates[]; onAreaChange: (points: Coordinates[]) => void };

const layers = {
  street: { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "&copy; OpenStreetMap contributors" },
  satellite: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "Tiles &copy; Esri" },
};

function MapFocus({ coordinates, zoom }: { coordinates: Coordinates; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.flyTo([coordinates.lat, coordinates.lng], zoom, { duration: .55 }); }, [coordinates, map, zoom]);
  return null;
}
function AreaDrawer({ enabled, points, onAreaChange }: { enabled: boolean; points: Coordinates[]; onAreaChange: (points: Coordinates[]) => void }) {
  useMapEvents({ click(event) { if (enabled) onAreaChange([...points, { lat: event.latlng.lat, lng: event.latlng.lng }]); } });
  return null;
}

export default function LiveMap({ coordinates, mapLayer, candidates, activeCandidate, onCandidateSelect, projectName, zoom, radius, drawMode, areaPoints, onAreaChange }: Props) {
  return <MapContainer center={[coordinates.lat, coordinates.lng]} zoom={zoom} scrollWheelZoom className="real-map" aria-label="Interactive site selection map">
    <TileLayer url={layers[mapLayer].url} attribution={layers[mapLayer].attribution} maxZoom={19} />
    <MapFocus coordinates={coordinates} zoom={zoom} />
    <AreaDrawer enabled={drawMode} points={areaPoints} onAreaChange={onAreaChange} />
    {areaPoints.length >= 3 && <Polygon positions={areaPoints.map((point) => [point.lat, point.lng])} pathOptions={{ color: "#111", fillColor: "#111", fillOpacity: .08, weight: 1.5, dashArray: "4 5" }} />}
    {candidates.map((candidate, index) => <Circle key={candidate.id} center={[candidate.lat, candidate.lng]} radius={index === activeCandidate ? radius * 1.12 : radius} pathOptions={{ color: "#111", fillColor: "#111", fillOpacity: index === activeCandidate ? .17 : .07, weight: index === activeCandidate ? 2 : 1 }} eventHandlers={{ click: () => onCandidateSelect(index) }} />)}
    {candidates.map((candidate, index) => <CircleMarker key={`${candidate.id}-point`} center={[candidate.lat, candidate.lng]} radius={index === activeCandidate ? 8 : 6} pathOptions={{ color: "#fff", fillColor: "#111", fillOpacity: 1, weight: 2 }} eventHandlers={{ click: () => onCandidateSelect(index) }}><Tooltip direction="top" offset={[0, -8]} opacity={1}>{candidate.name} - {candidate.selectedScore ? `${candidate.selectedScore}/100` : "check evidence"}</Tooltip></CircleMarker>)}
    <CircleMarker center={[coordinates.lat, coordinates.lng]} radius={6} pathOptions={{ color: "#111", fillColor: "#fff", fillOpacity: 1, weight: 2 }}><Tooltip permanent direction="bottom" offset={[0, 10]}>{projectName}</Tooltip></CircleMarker>
  </MapContainer>;
}
