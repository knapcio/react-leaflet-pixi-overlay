import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, useMap } from "react-leaflet";
import PixiOverlay from "react-leaflet-pixi-overlay";
import type { PixiOverlayMarker } from "react-leaflet-pixi-overlay";
import { OsmTiles } from "./tiles";

const CENTER: [number, number] = [51.5079, -0.0877];

const DEBUG = new URLSearchParams(window.location.search).has("debug");

// SVG on purpose (even though the map prefers canvas): the reference dots must
// not share a rendering pipeline with anything canvas-based
const debugRenderer = DEBUG ? L.svg({ padding: 0.1 }) : undefined;

/**
 * ?debug=1 diagnostics: overlays Leaflet-native SVG dots at every marker
 * position (ground truth independent of the Pixi canvas) and a live readout of
 * the overlay's internal transform vs what it should be. Screenshot this when
 * the pins drift.
 */
const DebugPanel = () => {
  const map = useMap();
  const [text, setText] = useState("collecting…");

  useEffect(() => {
    const collect = () => {
      try {
        type AnyLayer = {
          _pixiContainer?: {
            scale: { x: number };
            position: { x: number; y: number };
          };
          _renderer?: { resolution?: number };
          _bounds?: { min: { x: number; y: number } };
          _initialZoom?: number;
          _wgsOrigin?: import("leaflet").LatLngExpression;
          _wgsInitialShift?: { x: number; y: number };
        };
        const anyMap = map as unknown as {
          _layers: Record<string, AnyLayer>;
          _animatingZoom?: boolean;
        };
        const layer = Object.values(anyMap._layers).find((l) => l._pixiContainer);
        if (!layer?._pixiContainer) {
          setText("pixi layer not found");
          return;
        }
        const c = layer._pixiContainer;
        const expScale = map.getZoomScale(map.getZoom(), layer._initialZoom!);
        const o = map.latLngToLayerPoint(layer._wgsOrigin!);
        const bMin = layer._bounds?.min ?? { x: 0, y: 0 };
        const expX = o.x - layer._wgsInitialShift!.x * expScale - bMin.x;
        const expY = o.y - layer._wgsInitialShift!.y * expScale - bMin.y;
        const canvas = document.querySelector(
          ".leaflet-pixi-overlay canvas",
        ) as HTMLCanvasElement | null;
        const wrap = canvas?.parentElement;
        const rect = canvas?.getBoundingClientRect();
        const mapRect = map.getContainer().getBoundingClientRect();
        const lines = [
          `zoom=${map.getZoom()} animating=${String(anyMap._animatingZoom ?? false)}`,
          `dpr=${window.devicePixelRatio} vv=${window.visualViewport?.scale ?? "?"}`,
          `res=${layer._renderer?.resolution ?? "?"} initialZoom=${layer._initialZoom}`,
          `scaleErr=${(c.scale.x - expScale).toExponential(2)}`,
          `posErr=(${(c.position.x - expX).toFixed(1)}, ${(c.position.y - expY).toFixed(1)})`,
          `canvas attr=(${canvas?.width},${canvas?.height}) css=(${canvas?.style.width},${canvas?.style.height})`,
          `canvas rect=(${rect?.width.toFixed(0)},${rect?.height.toFixed(0)}) offsetInMap=(${rect && mapRect ? (rect.left - mapRect.left).toFixed(1) : "?"},${rect && mapRect ? (rect.top - mapRect.top).toFixed(1) : "?"})`,
          `bounds.min=(${bMin.x},${bMin.y}) wrapTransform=${wrap?.style.transform || "none"}`,
          `mapSize=(${map.getSize().x},${map.getSize().y}) rect=(${mapRect.width.toFixed(0)},${mapRect.height.toFixed(0)})`,
        ];
        setText(lines.join("\n"));
      } catch (error) {
        setText(String(error));
      }
    };
    collect();
    const timer = window.setInterval(collect, 500);
    return () => window.clearInterval(timer);
  }, [map]);

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        zIndex: 10000,
        background: "rgba(0,0,0,.8)",
        color: "#0f0",
        font: "11px/1.5 monospace",
        padding: "8px 10px",
        whiteSpace: "pre",
        pointerEvents: "none",
        borderRadius: 6,
      }}
      data-testid="debug-panel"
    >
      {text}
    </div>
  );
};

const InteractivePopup = () => {
  const [count, setCount] = useState(0);
  return (
    <div className="popup-card">
      <strong>London Bridge</strong>
      <p>This popup is real React — state and handlers work.</p>
      <button data-testid="popup-button" onClick={() => setCount((c) => c + 1)}>
        Clicked {count} times
      </button>
    </div>
  );
};

const BasicDemo = () => {
  const [selected, setSelected] = useState<string | number | null>(null);

  const markers = useMemo<PixiOverlayMarker[]>(
    () => [
      {
        id: "london-bridge",
        position: CENTER,
        iconColor: "#2563eb",
        popup: <InteractivePopup />,
        tooltip: "London Bridge",
        onClick: (id) => setSelected(id),
      },
      {
        id: "st-pauls",
        position: [51.5138, -0.0984],
        iconColor: "red",
        popup: "St Paul's Cathedral",
        tooltip: "St Paul's Cathedral",
        onClick: (id) => setSelected(id),
      },
      {
        id: "tower-bridge",
        position: [51.5055, -0.0754],
        iconColor: "green",
        popup: "Tower Bridge",
        tooltip: "Tower Bridge",
        onClick: (id) => setSelected(id),
      },
      {
        id: "rotated",
        position: [51.5033, -0.1195],
        iconColor: "#9333ea",
        angle: 45,
        scale: 1.25,
        tooltip: "Rotated & scaled",
        onMouseOver: (id) => console.log("hover", id),
      },
    ],
    [],
  );

  return (
    <>
      <MapContainer center={CENTER} zoom={14} minZoom={3} maxZoom={19} preferCanvas>
        <OsmTiles />
        <PixiOverlay markers={markers} />
        {DEBUG
          ? markers.map((marker) => (
              <CircleMarker
                key={marker.id}
                center={marker.position as [number, number]}
                radius={5}
                renderer={debugRenderer}
                pathOptions={{ color: "#ff00ff", weight: 2, fillOpacity: 0.4 }}
              />
            ))
          : null}
        {DEBUG ? <DebugPanel /> : null}
      </MapContainer>
      <div className="status" data-testid="status">
        {selected ? `selected: ${selected}` : "click a marker"}
      </div>
    </>
  );
};

export default BasicDemo;
