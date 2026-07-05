import { useMemo, useState } from "react";
import { MapContainer } from "react-leaflet";
import PixiOverlay from "react-leaflet-pixi-overlay";
import type { PixiOverlayMarker } from "react-leaflet-pixi-overlay";
import { OsmTiles } from "./tiles";

const CENTER: [number, number] = [51.5079, -0.0877];

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
      </MapContainer>
      <div className="status" data-testid="status">
        {selected ? `selected: ${selected}` : "click a marker"}
      </div>
    </>
  );
};

export default BasicDemo;
