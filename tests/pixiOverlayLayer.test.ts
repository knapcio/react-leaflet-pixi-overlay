import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import L from "leaflet";
import { createPixiOverlayLayer } from "../src/vendor/pixiOverlayLayer";

// createPixiOverlayLayer bails out when the environment reports no canvas
// support (jsdom); the layer under test never touches a real canvas here.
const browser = L.Browser as unknown as Record<string, boolean>;

interface FakeLayer {
  _update(e?: unknown): void;
  _redraw(offset: unknown, e?: unknown): void;
  _cancelUpdateRetry(): void;
  getEvents(): Record<string, unknown>;
  [key: string]: unknown;
}

function createTestLayer(drawCallback: () => void) {
  const pixiContainer = {
    scale: { set: vi.fn() },
    position: { set: vi.fn() },
  };
  const layer = createPixiOverlayLayer(
    drawCallback,
    pixiContainer,
  ) as unknown as FakeLayer;

  const map = {
    _animatingZoom: false,
    getSize: () => L.point(100, 100),
    containerPointToLayerPoint: (p: L.Point) => p,
    getCenter: () => L.latLng(0, 0),
    getZoom: () => 5,
    getZoomScale: () => 1,
    latLngToLayerPoint: () => L.point(0, 0),
  };

  layer._map = map;
  layer._rendererReady = true;
  layer._container = document.createElement("div");
  layer._renderer = {
    resolution: 1,
    resize: vi.fn(),
    canvas: { style: {} },
  };
  layer._initialZoom = 5;
  layer._wgsOrigin = L.latLng(0, 0);
  layer._wgsInitialShift = L.point(0, 0);
  layer._pixiContainer = pixiContainer;
  // an existing render (the guard only skips when _bounds is set)
  layer._bounds = new L.Bounds(L.point(0, 0), L.point(100, 100));

  return { layer, map };
}

describe("pixiOverlayLayer _update during zoom animation", () => {
  let hadCanvas: boolean;
  let rafQueue: Array<() => void>;

  beforeEach(() => {
    hadCanvas = browser.canvas;
    browser.canvas = true;
    rafQueue = [];
    vi.spyOn(L.Util, "requestAnimFrame").mockImplementation(((fn: () => void) => {
      rafQueue.push(fn);
      return rafQueue.length;
    }) as never);
    vi.spyOn(L.Util, "cancelAnimFrame").mockImplementation((() => {}) as never);
  });

  afterEach(() => {
    browser.canvas = hadCanvas;
    vi.restoreAllMocks();
  });

  it("retries a skipped update until the zoom animation flag clears", () => {
    const draw = vi.fn();
    const { layer, map } = createTestLayer(draw);

    // regression: an _update arriving mid-animation used to be dropped for
    // good, leaving the overlay frozen at a stale view when it was the last
    // event of a zoom gesture
    map._animatingZoom = true;
    layer._update({ type: "moveend" });
    expect(draw).not.toHaveBeenCalled();
    expect(rafQueue).toHaveLength(1);

    // still animating on the next frame: keeps polling, still no draw
    rafQueue.shift()!();
    expect(draw).not.toHaveBeenCalled();
    expect(rafQueue).toHaveLength(1);

    map._animatingZoom = false;
    rafQueue.shift()!();
    expect(draw).toHaveBeenCalledTimes(1);
    expect(rafQueue).toHaveLength(0);
  });

  it("does not stack retries for multiple skipped updates", () => {
    const { layer, map } = createTestLayer(vi.fn());
    map._animatingZoom = true;
    layer._update();
    layer._update();
    layer._update();
    expect(rafQueue).toHaveLength(1);
  });

  it("stops retrying once destroyed", () => {
    const draw = vi.fn();
    const { layer, map } = createTestLayer(draw);
    map._animatingZoom = true;
    layer._update();
    expect(rafQueue).toHaveLength(1);

    layer._destroyed = true;
    map._animatingZoom = false;
    rafQueue.shift()!();
    expect(draw).not.toHaveBeenCalled();
    expect(rafQueue).toHaveLength(0);
  });

  it("registers zoomend as a catch-up update", () => {
    const { layer } = createTestLayer(vi.fn());
    const events = layer.getEvents();
    expect(events.zoomend).toBe(layer._update);
    expect(events.moveend).toBe(layer._update);
  });
});
