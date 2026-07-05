import { useMemo, useState } from "react";
import { MapContainer } from "react-leaflet";
import PixiOverlay from "react-leaflet-pixi-overlay";
import type { PixiOverlayMarker } from "react-leaflet-pixi-overlay";
import { OsmTiles } from "./tiles";

const CENTER: [number, number] = [51.505, -0.09];

const InteractivePopup = () => {
  const [count, setCount] = useState(0);
  return (
    <div className="popup-card">
      <strong>London</strong>
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
        id: "center",
        position: CENTER,
        iconColor: "#2563eb",
        popup: <InteractivePopup />,
        tooltip: "Click me!",
        onClick: (id) => setSelected(id),
      },
      {
        id: "red",
        position: [51.51, -0.1],
        iconColor: "red",
        popup: "A plain string popup",
        tooltip: "Red marker",
        onClick: (id) => setSelected(id),
      },
      {
        id: "rotated",
        position: [51.5, -0.075],
        iconColor: "green",
        angle: 45,
        scale: 1.4,
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
