"use client";

import { ComponentType, useEffect, useState } from "react";

type Coordinates = { lat: number; lng: number };
type Candidate = { id: string; name: string; lat: number; lng: number; selectedScore: number };
type MapProps = {
  coordinates: Coordinates; mapLayer: "street" | "satellite"; candidates: Candidate[]; activeCandidate: number;
  onCandidateSelect: (index: number) => void; projectName: string; zoom: number; radius: number;
  drawMode: boolean; areaPoints: Coordinates[]; onAreaChange: (points: Coordinates[]) => void;
};

export default function MapPanel(props: MapProps) {
  const [MapComponent, setMapComponent] = useState<ComponentType<MapProps> | null>(null);

  useEffect(() => {
    let active = true;
    void import("./LiveMap").then((module) => {
      if (active) setMapComponent(() => module.default);
    });
    return () => { active = false; };
  }, []);

  if (MapComponent) return <MapComponent {...props} />;
  return <div className="map-fallback" aria-live="polite"><p>Loading map, candidate circles, and {props.mapLayer === "satellite" ? "satellite" : "street"} tiles…</p></div>;
}
