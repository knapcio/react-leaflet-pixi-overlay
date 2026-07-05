import type { Layer, LatLngExpression, Map as LeafletMap, Point } from "leaflet";
import type { PixiOverlayUtils } from "../types";

export interface PixiOverlayLayerOptions {
  padding?: number;
  forceCanvas?: boolean;
  doubleBuffering?: boolean;
  resolution?: number;
  projectionZoom?: (map: LeafletMap) => number;
  destroyInteractionManager?: boolean;
  autoPreventDefault?: boolean;
  preserveDrawingBuffer?: boolean;
  clearBeforeRender?: boolean;
  shouldRedrawOnMove?: (e: unknown) => boolean;
}

export interface PixiOverlayLayerInstance extends Layer {
  utils: PixiOverlayUtils;
  redraw(data?: unknown): this;
  whenReady(callback: () => void): this;
  destroy(): void;
}

export function createPixiOverlayLayer(
  drawCallback: (utils: PixiOverlayUtils, event?: unknown) => void,
  pixiContainer: unknown,
  options?: PixiOverlayLayerOptions,
): PixiOverlayLayerInstance | null;
