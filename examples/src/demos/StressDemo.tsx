import { useMemo, useState } from "react";
import { MapContainer } from "react-leaflet";
import PixiOverlay from "react-leaflet-pixi-overlay";
import type { PixiOverlayMarker } from "react-leaflet-pixi-overlay";
import { OsmTiles } from "./tiles";

const MARKER_COUNT = 10_000;
const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed"];

// deterministic PRNG so every visit (and the e2e run) sees the same map
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const StressDemo = () => {
  const [clicked, setClicked] = useState<string | number | null>(null);

  const markers = useMemo<PixiOverlayMarker[]>(() => {
    const random = mulberry32(42);
    return Array.from({ length: MARKER_COUNT }, (_, i) => ({
      id: i,
      // roughly continental Europe
      position: [44 + random() * 10, -1 + random() * 20] as [number, number],
      iconColor: COLORS[i % COLORS.length],
      tooltip: `Marker #${i}`,
      onClick: (id: string | number | null) => setClicked(id),
    }));
  }, []);

  return (
    <>
      <MapContainer center={[49, 9]} zoom={5} minZoom={3} maxZoom={19} preferCanvas>
        <OsmTiles />
        <PixiOverlay markers={markers} />
      </MapContainer>
      <div className="status" data-testid="status">
        {MARKER_COUNT.toLocaleString()} markers
        {clicked !== null ? ` — clicked #${clicked}` : ""}
      </div>
    </>
  );
};

export default StressDemo;
