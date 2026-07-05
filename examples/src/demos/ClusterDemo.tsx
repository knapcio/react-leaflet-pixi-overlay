import { useMemo, useState } from "react";
import { MapContainer } from "react-leaflet";
import PixiOverlay from "react-leaflet-pixi-overlay";
import type { PixiOverlayMarker } from "react-leaflet-pixi-overlay";
import { OsmTiles } from "./tiles";

const MARKER_COUNT = 20_000;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ClusterDemo = () => {
  const [lastCluster, setLastCluster] = useState<string | null>(null);

  const markers = useMemo<PixiOverlayMarker[]>(() => {
    const random = mulberry32(7);
    return Array.from({ length: MARKER_COUNT }, (_, i) => ({
      id: i,
      position: [40 + random() * 15, -5 + random() * 25] as [number, number],
      iconColor: "#2563eb",
      popup: `Marker #${i}`,
    }));
  }, []);

  return (
    <>
      <MapContainer center={[47.5, 7.5]} zoom={5} minZoom={3} maxZoom={19} preferCanvas>
        <OsmTiles />
        <PixiOverlay
          markers={markers}
          cluster={{ radius: 70, maxZoom: 15 }}
          onClusterClick={({ count, expansionZoom }) => {
            setLastCluster(`cluster of ${count} → zoom ${expansionZoom}`);
          }}
        />
      </MapContainer>
      <div className="status" data-testid="status">
        {MARKER_COUNT.toLocaleString()} markers, clustered
        {lastCluster ? ` — ${lastCluster}` : ""}
      </div>
    </>
  );
};

export default ClusterDemo;
