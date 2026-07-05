# react-leaflet-pixi-overlay

[![CI](https://github.com/knapcio/react-leaflet-pixi-overlay/actions/workflows/ci.yml/badge.svg)](https://github.com/knapcio/react-leaflet-pixi-overlay/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/react-leaflet-pixi-overlay)](https://www.npmjs.com/package/react-leaflet-pixi-overlay)

High-performance marker rendering for [react-leaflet](https://react-leaflet.js.org/), powered by WebGL through [PixiJS](https://pixijs.com/) and the
[Leaflet.PixiOverlay](https://github.com/manubb/Leaflet.PixiOverlay) plugin.
Render **tens of thousands of markers** smoothly where DOM-based markers give up.

**[Live demo](https://knapcio.github.io/react-leaflet-pixi-overlay/)** — basic usage, a 10k-marker stress test, clustering, and custom PixiJS drawing.

## Features

- 🚀 WebGL marker rendering — 10k+ markers at interactive framerates
- 🎨 PixiJS **v5 through v8** supported
- 🧲 Built-in marker **clustering** (supercluster)
- ⚛️ **React popups & tooltips** — pass JSX, state and event handlers just work
- 🖌️ `onDraw` escape hatch for arbitrary PixiJS content (polylines, polygons, heatmaps…)
- 📦 Ships ESM + CJS with TypeScript types

## Installation

Use whichever package manager your app already uses. Pick one:

**npm**

```sh
npm install react-leaflet-pixi-overlay leaflet pixi.js react react-dom react-leaflet
```

**Yarn**

```sh
yarn add react-leaflet-pixi-overlay leaflet pixi.js react react-dom react-leaflet
```

**pnpm**

```sh
pnpm add react-leaflet-pixi-overlay leaflet pixi.js react react-dom react-leaflet
```

> `leaflet`, `pixi.js`, `react`, `react-dom`, and `react-leaflet` are peer dependencies. If your app already has compatible versions installed, keep those and add only the missing packages.

## Compatibility

| react-leaflet | react | pixi.js | react-leaflet-pixi-overlay |
| ------------- | ----- | ------- | -------------------------- |
| v5.x          | v19.x | v5–v8   | v4.x                       |
| v4.x          | v18.x | v5–v8   | v4.x                       |
| v3.x          | v17.x | v5–v8   | v3.x–v4.x                  |
| v2.x          | v16.x | v4–v5   | v1.x                       |

## Quick start

```jsx
import { MapContainer, TileLayer } from "react-leaflet";
import PixiOverlay from "react-leaflet-pixi-overlay";
import "leaflet/dist/leaflet.css";

const App = () => {
  const markers = [
    {
      id: "melbourne",
      position: [-37.814, 144.96332],
      iconColor: "red",
      popup: <strong>Any JSX works here</strong>,
      tooltip: "Hey!",
      onClick: (id) => console.log("clicked", id),
    },
  ];

  return (
    <MapContainer
      center={[-37.814, 144.96332]}
      zoom={13} // initial zoom is required
      minZoom={3}
      maxZoom={19}
      preferCanvas
      style={{ height: "100vh" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <PixiOverlay markers={markers} />
    </MapContainer>
  );
};
```

## `<PixiOverlay>` props

| Prop             | Type                                           | Description                                                                                                                |
| ---------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `markers`        | `PixiOverlayMarker[]`                          | The markers to render (see below).                                                                                         |
| `cluster`        | `boolean \| { radius?, maxZoom?, minPoints? }` | Cluster markers with supercluster. `true` for defaults, or tune the options.                                               |
| `onClusterClick` | `(event) => boolean \| void`                   | Called with `{ position, count, expansionZoom }` when a cluster is clicked. Return `false` to prevent the default zoom-in. |
| `onDraw`         | `(utils, event?) => void`                      | Draw arbitrary PixiJS content on every redraw. See [Custom drawing](#custom-drawing).                                      |

## Marker options

| Option               | Required |                                                                                          Comment |
| -------------------- | :------: | -----------------------------------------------------------------------------------------------: |
| `id`                 |   yes    |                                                               String or number; unique marker id |
| `position`           |   yes    |                                                                   `[lat, lng]` or `{ lat, lng }` |
| `iconColor`          |  yes/no  |                                         Any valid CSS color; required unless `customIcon` is set |
| `customIcon`         |    no    |                                 SVG string for a custom icon (must have width/height attributes) |
| `iconId`             |    no    |                   Texture cache id for `customIcon`; markers sharing an `iconId` share a texture |
| `popup`              |    no    |                                                            String, HTMLElement, or **ReactNode** |
| `popupOpen`          |    no    |                                    Open this marker's popup automatically (one marker at a time) |
| `popupOffset`        |    no    |                                                              `[x, y]` offset, default `[0, -35]` |
| `popupOptions`       |    no    |                                                                           `Leaflet.PopupOptions` |
| `onClick`            |    no    | `(id) => void`; fired with the marker id on click and with `null` when the user closes the popup |
| `onMouseOver`        |    no    |                                                       `(id) => void`; pointer entered the marker |
| `onMouseOut`         |    no    |                                                          `(id) => void`; pointer left the marker |
| `tooltip`            |    no    |                                                            String, HTMLElement, or **ReactNode** |
| `tooltipOffset`      |    no    |                                                              `[x, y]` offset, default `[0, -35]` |
| `tooltipOptions`     |    no    |                                                                         `Leaflet.TooltipOptions` |
| `markerSpriteAnchor` |    no    |                                          Sprite anchor, default `[0.5, 1]` (pin tip at position) |
| `angle`              |    no    |                                                                              Rotation in degrees |
| `scale`              |    no    |                              Extra scale factor on top of the zoom-invariant scaling (default 1) |
| `alpha`              |    no    |                                                                          Opacity 0–1 (default 1) |
| `zIndex`             |    no    |                                                  Stacking order among markers (higher is on top) |

## Clustering

```jsx
<PixiOverlay
  markers={markers}
  cluster={{ radius: 70, maxZoom: 15 }}
  onClusterClick={({ count, expansionZoom }) =>
    console.log(`cluster of ${count}, expands at zoom ${expansionZoom}`)
  }
/>
```

Clicking a cluster zooms to its expansion zoom by default; return `false` from
`onClusterClick` to handle it yourself.

## React popups and tooltips

`popup` and `tooltip` accept any ReactNode. Content is rendered through a
portal, so hooks, state, and event handlers work inside it — no more
`renderToString`:

```jsx
const markers = [
  {
    id: "1",
    position: [51.505, -0.09],
    iconColor: "blue",
    popup: <MyInteractivePopup />,
  },
];
```

Strings and HTMLElements are passed to Leaflet directly, as before.

## Custom icons

```jsx
const markers = [
  {
    id: "someIDUniqueToMarker",
    position: [51.505, -0.09],
    iconId: "pin-shadow", // texture cache key, shared across markers
    customIcon:
      '<svg xmlns="http://www.w3.org/2000/svg" fill="red" width="36" height="36" viewBox="0 0 24 24"><path d="M12 0c-4.198 0-8 3.403-8 7.602 0 6.243 6.377 6.903 8 16.398 1.623-9.495 8-10.155 8-16.398 0-4.199-3.801-7.602-8-7.602zm0 11c-1.657 0-3-1.343-3-3s1.342-3 3-3 3 1.343 3 3-1.343 3-3 3z"/></svg>',
  },
];
```

## Custom drawing

Draw any PixiJS content (routes, polygons, heat layers…) into the overlay:

```jsx
import * as PIXI from "pixi.js";

const graphics = new PIXI.Graphics();

<PixiOverlay
  markers={markers}
  onDraw={(utils) => {
    const container = utils.getContainer();
    if (!graphics.parent) container.addChildAt(graphics, 0);

    const scale = utils.getScale();
    const a = utils.latLngToLayerPoint([51.5, -0.09]);
    const b = utils.latLngToLayerPoint([48.85, 2.35]);
    graphics.clear();
    graphics.moveTo(a.x, a.y);
    graphics.lineTo(b.x, b.y);
    // divide by scale to keep the on-screen stroke width constant across zooms
    graphics.stroke({ width: 3 / scale, color: 0x2563eb }); // pixi v8 API
  }}
/>;
```

`utils` exposes `latLngToLayerPoint`, `layerPointToLatLng`, `getScale`,
`getRenderer`, `getContainer`, and `getMap`. Content you add is not
auto-scaled — divide stroke widths by `getScale()` for zoom-invariant lines.

## Migrating from v3/v4

- **Install `pixi.js` yourself** — it moved from `dependencies` to `peerDependencies` so you control the version (v5–v8).
- The package now ships compiled ESM **and** CJS from `dist/`; deep imports of `build/PixiOverlay.js` no longer exist.
- `popupOpen: true` opens the popup once per marker id instead of re-opening on every render, and `onClick(null)` fires only when the user closes the popup.
- Everything else is backward compatible; `renderToString` popups keep working, but plain JSX is now preferred.

## Contributing

PRs are welcome! Fork the repo and point PRs at `master`.

```sh
yarn install
yarn test        # vitest unit tests
yarn typecheck   # tsc
yarn build       # tsup → dist/
yarn verify      # all of the above + npm pack check

# demo app / e2e
cd examples
yarn install
yarn dev         # vite dev server
yarn e2e         # playwright tests (needs: yarn playwright install chromium)
```

Releases are automated with [changesets](https://github.com/changesets/changesets):
add a changeset to your PR (`npx changeset`), and a release PR is opened
automatically when it lands on `master`. Publishing requires the `NPM_TOKEN`
repository secret.

## License

[MIT](./LICENSE). Bundles a modified copy of
[Leaflet.PixiOverlay](https://github.com/manubb/Leaflet.PixiOverlay) (MIT,
© Manuel Baclet) in `src/vendor/`.
