import type {
  LatLng,
  LatLngExpression,
  Map as LeafletMap,
  Point,
  PopupOptions,
  TooltipOptions,
} from "leaflet";
import type { ReactNode } from "react";

export type PixiOverlayMarkerId = string | number;

/**
 * Popup/tooltip content. Strings and HTMLElements are handed to Leaflet
 * directly; any other ReactNode is rendered through a React portal, so
 * interactive JSX (state, event handlers) works inside popups.
 */
export type PixiOverlayMarkerContent = string | HTMLElement | ReactNode;

export interface PixiOverlayMarker {
  /** Unique marker id. */
  id: PixiOverlayMarkerId;
  /** Marker position, e.g. `[lat, lng]`. */
  position: LatLngExpression;
  /** Any valid CSS color; used for the built-in pin icon. Required unless customIcon is set. */
  iconColor?: string;
  /** SVG markup for a custom icon (must declare width/height attributes). */
  customIcon?: string;
  /** Texture cache id for customIcon; markers sharing an iconId share a texture. */
  iconId?: string;
  popup?: PixiOverlayMarkerContent;
  /** Open this marker's popup automatically (one marker at a time). */
  popupOpen?: boolean;
  /** `[x, y]` popup offset. Defaults to `[0, -35]`. */
  popupOffset?: [number, number];
  popupOptions?: PopupOptions;
  /**
   * Fired with the marker id when the marker is clicked, and with `null`
   * when the user closes the marker's popup.
   */
  onClick?: (id: PixiOverlayMarkerId | null) => void;
  /** Fired with the marker id when the pointer enters the marker. */
  onMouseOver?: (id: PixiOverlayMarkerId) => void;
  /** Fired with the marker id when the pointer leaves the marker. */
  onMouseOut?: (id: PixiOverlayMarkerId) => void;
  tooltip?: PixiOverlayMarkerContent;
  /** `[x, y]` tooltip offset. Defaults to `[0, -35]`. */
  tooltipOffset?: [number, number];
  tooltipOptions?: TooltipOptions;
  /** Sprite anchor, defaults to `[0.5, 1]` (bottom center — pin tip). */
  markerSpriteAnchor?: [number, number];
  /** Rotation in degrees. */
  angle?: number;
  /** Extra scale factor on top of the automatic zoom-invariant scaling. Defaults to 1. */
  scale?: number;
  /** Sprite opacity, 0-1. Defaults to 1. */
  alpha?: number;
  /** Stacking order among markers (higher renders on top). Defaults to 0. */
  zIndex?: number;
}

/** Subset of supercluster options. */
export interface PixiOverlayClusterOptions {
  /** Cluster radius in pixels. Default 60. */
  radius?: number;
  /** Maximum zoom at which points are clustered. Default 16. */
  maxZoom?: number;
  /** Minimum number of points to form a cluster. Default 2. */
  minPoints?: number;
}

export interface PixiOverlayUtils {
  latLngToLayerPoint(latLng: LatLngExpression, zoom?: number): Point;
  layerPointToLatLng(point: Point | [number, number], zoom?: number): LatLng;
  getScale(zoom?: number): number;
  /** The PixiJS renderer (type depends on the installed pixi.js version). */
  getRenderer(): unknown;
  /** The root PIXI.Container of the overlay. */
  getContainer(): unknown;
  getMap(): LeafletMap;
}

export interface PixiOverlayClusterClickEvent {
  /** Cluster position as `[lat, lng]`. */
  position: [number, number];
  /** Number of markers in the cluster. */
  count: number;
  /** Zoom level at which the cluster expands into its children. */
  expansionZoom: number;
}

export interface PixiOverlayProps {
  markers?: PixiOverlayMarker[];
  /**
   * Cluster markers with supercluster. Pass `true` for defaults or an
   * options object to tune radius/maxZoom/minPoints.
   */
  cluster?: boolean | PixiOverlayClusterOptions;
  /**
   * Called when a cluster is clicked. Return `false` to prevent the default
   * zoom-to-expansion behavior.
   */
  onClusterClick?: (event: PixiOverlayClusterClickEvent) => boolean | void;
  /**
   * Escape hatch for drawing arbitrary PixiJS content (polylines, polygons,
   * heatmaps...). Called on every redraw, after markers are drawn and before
   * the frame is rendered. Draw into `utils.getContainer()`; anything you add
   * there is NOT auto-scaled, so divide stroke widths by `utils.getScale()`
   * if you want zoom-invariant strokes.
   */
  onDraw?: (utils: PixiOverlayUtils, event?: unknown) => void;
}
