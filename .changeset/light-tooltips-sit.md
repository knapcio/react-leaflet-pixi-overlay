---
"react-leaflet-pixi-overlay": patch
---

Tooltips now default to `direction: "top"`, centered above the marker.

Leaflet's default `direction: "auto"` anchors the tooltip beside the point,
and combined with the default `[0, -35]` offset it floated detached at the
marker's upper left/right. Set `tooltipOptions.direction` to restore any other
placement.
