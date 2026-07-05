import { useCallback, useMemo, useRef } from "react";
import { MapContainer } from "react-leaflet";
import * as PIXI from "pixi.js";
import PixiOverlay from "react-leaflet-pixi-overlay";
import type { PixiOverlayMarker, PixiOverlayUtils } from "react-leaflet-pixi-overlay";
import { OsmTiles } from "./tiles";

// A tour through some European capitals, drawn with PIXI.Graphics via onDraw.
const ROUTE: Array<[number, number]> = [
  [51.505, -0.09], // London
  [48.8566, 2.3522], // Paris
  [50.8503, 4.3517], // Brussels
  [52.37, 4.8952], // Amsterdam
  [52.52, 13.405], // Berlin
  [50.0755, 14.4378], // Prague
  [48.2082, 16.3738], // Vienna
];

const DrawDemo = () => {
  const graphicsRef = useRef<PIXI.Graphics | null>(null);

  const markers = useMemo<PixiOverlayMarker[]>(
    () =>
      ROUTE.map((position, i) => ({
        id: i,
        position,
        iconColor: i === 0 || i === ROUTE.length - 1 ? "#dc2626" : "#2563eb",
        tooltip: `Stop ${i + 1}`,
        zIndex: 1,
      })),
    [],
  );

  const handleDraw = useCallback((utils: PixiOverlayUtils) => {
    const container = utils.getContainer() as PIXI.Container;
    const scale = utils.getScale();

    let graphics = graphicsRef.current;
    if (!graphics || graphics.destroyed) {
      graphics = new PIXI.Graphics();
      graphicsRef.current = graphics;
      container.addChildAt(graphics, 0);
    }

    graphics.clear();
    ROUTE.forEach((latLng, i) => {
      const point = utils.latLngToLayerPoint(latLng);
      if (i === 0) graphics.moveTo(point.x, point.y);
      else graphics.lineTo(point.x, point.y);
    });
    // divide by scale so the stroke keeps its on-screen width across zooms
    graphics.stroke({ width: 3 / scale, color: 0x2563eb, alpha: 0.8 });
  }, []);

  return (
    <>
      <MapContainer center={[50.5, 7]} zoom={6} minZoom={3} maxZoom={19} preferCanvas>
        <OsmTiles />
        <PixiOverlay markers={markers} onDraw={handleDraw} />
      </MapContainer>
      <div className="status" data-testid="status">
        route drawn with PIXI.Graphics through onDraw
      </div>
    </>
  );
};

export default DrawDemo;
