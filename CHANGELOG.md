# react-leaflet-pixi-overlay

## 4.0.3

### Patch Changes

- [`d1709ab`](https://github.com/knapcio/react-leaflet-pixi-overlay/commit/d1709ab73d4ef783672bf4b2efa3accf7353b649) Thanks [@knapcio](https://github.com/knapcio)! - Tooltips now default to `direction: "top"`, centered above the marker.

  Leaflet's default `direction: "auto"` anchors the tooltip beside the point,
  and combined with the default `[0, -35]` offset it floated detached at the
  marker's upper left/right. Set `tooltipOptions.direction` to restore any other
  placement.

## 4.0.2

### Patch Changes

- [`ee4d284`](https://github.com/knapcio/react-leaflet-pixi-overlay/commit/ee4d284d3f6d3f0c6427381bad2f948abf452bc9) Thanks [@knapcio](https://github.com/knapcio)! - Fix the renderer resolution being multiplied by the device pixel ratio on PixiJS v8.

  The vendored layer's degraded-drawing-buffer correction compares
  `gl.drawingBufferWidth` with `renderer.width`, which is physical pixels on
  PixiJS <= 7 but logical pixels on v8 — so on v8 every resize silently doubled
  the intended resolution (4x the pixels on retina displays). The correction now
  only runs on PixiJS <= 7.

## 4.0.1

### Patch Changes

- [`9623519`](https://github.com/knapcio/react-leaflet-pixi-overlay/commit/96235192b3e2a16be1ffc0c6da1cfdaa3d909e1a) Thanks [@knapcio](https://github.com/knapcio)! - Fix markers freezing at a stale position after an interrupted zoom animation.

  When a `moveend` arrived while Leaflet still had `map._animatingZoom` set (easy
  to hit with rapid mouse-wheel or trackpad zooming), the overlay dropped that
  update. If it was the last event of the gesture, the Pixi canvas stayed frozen
  at the previous view and markers appeared shifted from their coordinates until
  the next pan or resize. The overlay now retries the skipped update every
  animation frame until the zoom animation ends, and also updates on `zoomend` as
  a deterministic catch-up.

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
