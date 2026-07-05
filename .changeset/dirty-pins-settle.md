---
"react-leaflet-pixi-overlay": patch
---

Fix markers freezing at a stale position after an interrupted zoom animation.

When a `moveend` arrived while Leaflet still had `map._animatingZoom` set (easy
to hit with rapid mouse-wheel or trackpad zooming), the overlay dropped that
update. If it was the last event of the gesture, the Pixi canvas stayed frozen
at the previous view and markers appeared shifted from their coordinates until
the next pan or resize. The overlay now retries the skipped update every
animation frame until the zoom animation ends, and also updates on `zoomend` as
a deterministic catch-up.
