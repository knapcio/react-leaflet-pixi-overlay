# react-leaflet-pixi-overlay

## 4.0.0

### Major Changes

- [`9dee3af`](https://github.com/knapcio/react-leaflet-pixi-overlay/commit/9dee3af74a389977a11d784e8a8d462ea13b5962) Thanks [@knapcio](https://github.com/knapcio)! - Modernized rewrite of the library.

  **Breaking changes**

  - `pixi.js` is now a peer dependency — install it alongside this package (`npm i pixi.js`). npm 7+ installs peers automatically; yarn classic and pnpm users must add it explicitly.
  - Package is published as dual ESM + CJS built from TypeScript (`dist/`); the old Babel `build/` entry is gone.
  - Markers with `popupOpen: true` now auto-open once per marker id instead of re-opening on every re-render, and `onClick(null)` only fires when the _user_ closes a popup.

  **New features**

  - PixiJS v8 support (v5 through v8 are now supported) via a vendored, patched Leaflet.PixiOverlay layer — the `leaflet-pixi-overlay` dependency is gone.
  - Marker clustering: `<PixiOverlay cluster />` (powered by supercluster), with `onClusterClick` and tunable radius/maxZoom/minPoints.
  - React popups/tooltips: pass JSX as `popup`/`tooltip` — rendered via portals, so state and event handlers work inside them.
  - Custom drawing escape hatch: `onDraw={(utils) => ...}` for polylines, polygons, heatmaps and other PixiJS content.
  - New marker options: `scale`, `alpha`, `zIndex`, `onMouseOver`, `onMouseOut`.
  - Incremental sprite diffing by marker id — updating a large marker set no longer rebuilds every sprite.

  **Fixes**

  - Marker clicks are no longer triggered by map drags that start on a marker (PIXI's pooled pointer events were defeating the drag tolerance).
  - Popups re-open reliably after being closed by the user.
  - Texture cache keys are namespaced, so a `customIcon` marker sharing an `iconColor` with another marker no longer silently disappears.
  - User-supplied `popupOptions` (e.g. `autoClose`) are no longer overridden.
  - The overlay now initializes correctly when the map view is set after mount (previously it never rendered).
  - `leaflet` peer range widened back to `>=1.7.1`.
