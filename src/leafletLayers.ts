import L from "leaflet";
import type {
  Map as LeafletMap,
  Popup,
  PopupOptions,
  Tooltip,
  TooltipOptions,
} from "leaflet";
import type { MutableRefObject } from "react";
import type {
  PixiOverlayMarker,
  PixiOverlayMarkerContent,
  PixiOverlayMarkerId,
} from "./types";

export interface PopupData {
  id: PixiOverlayMarkerId;
  offset: [number, number];
  position: PixiOverlayMarker["position"];
  content: PixiOverlayMarkerContent;
  onClick?: PixiOverlayMarker["onClick"];
  popupOptions: PopupOptions;
}

export interface TooltipData {
  id: PixiOverlayMarkerId;
  offset: [number, number];
  position: PixiOverlayMarker["position"];
  content: PixiOverlayMarkerContent;
  tooltipOptions: TooltipOptions;
}

export function getPopupData(marker: PixiOverlayMarker): PopupData | null {
  if (marker.popup == null) return null;
  return {
    id: marker.id,
    offset: marker.popupOffset || [0, -35],
    position: marker.position,
    content: marker.popup,
    onClick: marker.onClick,
    popupOptions: marker.popupOptions || {},
  };
}

export function getTooltipData(marker: PixiOverlayMarker): TooltipData | null {
  if (marker.tooltip == null) return null;
  return {
    id: marker.id,
    offset: marker.tooltipOffset || [0, -35],
    position: marker.position,
    content: marker.tooltip,
    tooltipOptions: marker.tooltipOptions || {},
  };
}

/** User-supplied options win over our defaults (e.g. popupOptions.autoClose). */
export function buildPopupOptions(data: PopupData): PopupOptions {
  return {
    offset: data.offset,
    autoClose: false,
    ...data.popupOptions,
  };
}

export function buildTooltipOptions(data: TooltipData): TooltipOptions {
  return {
    offset: data.offset,
    ...data.tooltipOptions,
  };
}

/** Content Leaflet can take as-is; everything else goes through a React portal. */
export function isLeafletRenderable(
  content: PixiOverlayMarkerContent,
): content is string | HTMLElement {
  if (typeof content === "string") return true;
  return typeof HTMLElement !== "undefined" && content instanceof HTMLElement;
}

export interface OpenedLayer<T> {
  layer: T;
  /** Set when the content is a React node; render a portal into it. */
  portalElement: HTMLElement | null;
}

export function openPopup(map: LeafletMap, data: PopupData): OpenedLayer<Popup> {
  const popup = L.popup(buildPopupOptions(data)).setLatLng(data.position);
  let portalElement: HTMLElement | null = null;

  if (isLeafletRenderable(data.content)) {
    popup.setContent(data.content);
  } else {
    portalElement = document.createElement("div");
    popup.setContent(portalElement);
  }

  popup.addTo(map);
  return { layer: popup, portalElement };
}

export function openTooltip(map: LeafletMap, data: TooltipData): OpenedLayer<Tooltip> {
  const tooltip = L.tooltip(buildTooltipOptions(data)).setLatLng(data.position);
  let portalElement: HTMLElement | null = null;

  if (isLeafletRenderable(data.content)) {
    tooltip.setContent(data.content);
  } else {
    portalElement = document.createElement("div");
    tooltip.setContent(portalElement);
  }

  tooltip.addTo(map);
  return { layer: tooltip, portalElement };
}

export function removeLayerRef(
  map: LeafletMap,
  layerRef: MutableRefObject<Popup | Tooltip | null>,
): void {
  const layer = layerRef.current;
  if (!layer) return;
  layerRef.current = null;

  if (map.hasLayer(layer)) {
    map.removeLayer(layer);
  } else {
    layer.remove();
  }
}
