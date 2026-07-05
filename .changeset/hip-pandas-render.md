---
"react-leaflet-pixi-overlay": patch
---

Fix the renderer resolution being multiplied by the device pixel ratio on PixiJS v8.

The vendored layer's degraded-drawing-buffer correction compares
`gl.drawingBufferWidth` with `renderer.width`, which is physical pixels on
PixiJS <= 7 but logical pixels on v8 — so on v8 every resize silently doubled
the intended resolution (4x the pixels on retina displays). The correction now
only runs on PixiJS <= 7.
