// Vendored from Leaflet.PixiOverlay v1.9.5
// https://github.com/manubb/Leaflet.PixiOverlay
// Copyright (c) Manuel Baclet <mbaclet@gmail.com>
// License: MIT
//
// Modifications for react-leaflet-pixi-overlay:
// - converted to an ES module (no UMD wrapper, no global L.PixiOverlay registration)
// - dropped the Leaflet < 1.0 compatibility branch (this package requires leaflet >= 1.7)
// - PixiJS v8 support: async autoDetectRenderer, renderer.canvas instead of
//   renderer.view, PIXI.isWebGLSupported instead of PIXI.utils.isWebGLSupported,
//   numeric major-version parsing instead of string comparison
// - added whenReady() so consumers can wait for the (possibly async) renderer
// - v8 resolution fix: the degraded-drawing-buffer correction in _update
//   compares gl.drawingBufferWidth (physical px) with renderer.width, which is
//   physical on PixiJS <= 7 but LOGICAL on v8 — on v8 it silently multiplied
//   the renderer resolution by the device pixel ratio (4x pixels on retina).
//   The correction now only runs on PixiJS <= 7.
// - update-after-interrupted-zoom fix: _update used to silently drop the event
//   when it arrived while map._animatingZoom was still set (rapid wheel/trackpad
//   zooms interleave moveend with the next animation). If that was the LAST
//   event of the gesture, the overlay stayed frozen at a stale view — markers
//   appeared shifted until the next pan/resize. _update now retries on the next
//   animation frame until the animation flag clears, and getEvents also maps
//   zoomend -> _update as a deterministic catch-up.

import L from "leaflet";
import * as PIXI from "pixi.js";

const PIXI_MAJOR = parseInt(PIXI.VERSION, 10) || 0;

// Accessor for exports that only exist on some PixiJS majors (settings/utils
// are v5-v7 only, isWebGLSupported is v8 only). The indirection keeps
// bundlers from emitting "not exported" warnings for the other majors.
function pixiExport(name) {
  return PIXI[name];
}

// PixiJS v5-v7 print a console banner and abort on weak WebGL implementations
// (e.g. software rasterizers in CI) unless told otherwise. Both knobs are gone in v8.
const settings = pixiExport("settings");
const utils = pixiExport("utils");
if (settings) {
  settings.FAIL_IF_MAJOR_PERFORMANCE_CAVEAT = false;
}
if (utils && typeof utils.skipHello === "function") {
  utils.skipHello();
}

const round = L.Point.prototype._round;
const no_round = function () {
  return this;
};

function isWebGLSupported() {
  const v8Check = pixiExport("isWebGLSupported");
  if (typeof v8Check === "function") {
    return v8Check();
  }
  if (utils && typeof utils.isWebGLSupported === "function") {
    return utils.isWebGLSupported();
  }
  return true;
}

function getCanvas(renderer) {
  return renderer.canvas || renderer.view;
}

// v8 returns a Promise, v5-v7 return the renderer synchronously.
function createRenderer(options) {
  return Promise.resolve(PIXI.autoDetectRenderer(Object.assign({}, options)));
}

function setEventSystem(renderer, destroyInteractionManager, autoPreventDefault) {
  const eventSystem = PIXI_MAJOR < 7 ? renderer.plugins.interaction : renderer.events;
  if (!eventSystem) return;
  if (destroyInteractionManager) {
    eventSystem.destroy();
  } else if (!autoPreventDefault) {
    eventSystem.autoPreventDefault = false;
  }
}

function projectionZoom(map) {
  const maxZoom = map.getMaxZoom();
  const minZoom = map.getMinZoom();
  if (maxZoom === Infinity) return minZoom + 8;

  return (maxZoom + minZoom) / 2;
}

const PixiOverlayLayer = L.Layer.extend({
  options: {
    // @option padding: Number = 0.1
    // How much to extend the clip area around the map view (relative to its size)
    padding: 0.1,
    // @option forceCanvas: Boolean = false
    // Force use of a 2d-canvas (ignored on PixiJS v8, which has no canvas renderer)
    forceCanvas: false,
    // @option doubleBuffering: Boolean = false
    // Help to prevent flicker when refreshing display on some devices (e.g. iOS)
    doubleBuffering: false,
    // @option resolution: Number
    // Resolution of the renderer canvas
    resolution: L.Browser.retina ? 2 : 1,
    // @option projectionZoom(map: map): Number
    // return the layer projection zoom level
    projectionZoom: projectionZoom,
    // @option destroyInteractionManager: Boolean = false
    // Destroy PIXI EventSystem
    destroyInteractionManager: false,
    // @option autoPreventDefault: Boolean = true
    // Customize PIXI EventSystem autoPreventDefault property
    autoPreventDefault: true,
    // @option preserveDrawingBuffer: Boolean = false
    // Enables drawing buffer preservation
    preserveDrawingBuffer: false,
    // @option clearBeforeRender: Boolean = true
    // Clear the canvas before the new render pass
    clearBeforeRender: true,
    // @option shouldRedrawOnMove(e: moveEvent): Boolean
    // filter move events that should trigger a layer redraw
    shouldRedrawOnMove: function () {
      return false;
    },
  },

  initialize: function (drawCallback, pixiContainer, options) {
    L.setOptions(this, options);
    L.stamp(this);
    this._drawCallback = drawCallback;
    this._pixiContainer = pixiContainer;
    this._rendererReady = false;
    this._readyCallbacks = [];
    this._destroyed = false;
    this._rendererOptions = {
      resolution: this.options.resolution,
      antialias: true,
      preserveDrawingBuffer: this.options.preserveDrawingBuffer,
      clearBeforeRender: this.options.clearBeforeRender,
    };

    if (PIXI_MAJOR < 6) {
      this._rendererOptions.transparent = true;
    } else {
      this._rendererOptions.backgroundAlpha = 0;
    }
    if (PIXI_MAJOR < 8) {
      this._rendererOptions.forceCanvas = this.options.forceCanvas;
    }

    this._doubleBuffering =
      isWebGLSupported() && !this.options.forceCanvas && this.options.doubleBuffering;
  },

  _whenRendererReady: function (callback) {
    if (this._rendererReady) {
      callback();
    } else {
      this._readyCallbacks.push(callback);
    }
  },

  // @method whenReady(callback: Function): this
  // Runs callback once the renderer exists (immediately on PixiJS <= 7,
  // after async renderer init on PixiJS 8).
  whenReady: function (callback) {
    this._whenRendererReady(callback);
    return this;
  },

  _createRenderers: function () {
    const layer = this;
    const pending = [createRenderer(this._rendererOptions)];
    if (this._doubleBuffering) {
      pending.push(createRenderer(this._rendererOptions));
    }
    return Promise.all(pending).then(function (renderers) {
      if (layer._destroyed) {
        renderers.forEach(function (renderer) {
          renderer.destroy(true);
        });
        return;
      }
      layer._renderer = renderers[0];
      setEventSystem(
        layer._renderer,
        layer.options.destroyInteractionManager,
        layer.options.autoPreventDefault,
      );
      layer._container.appendChild(getCanvas(layer._renderer));
      if (layer._doubleBuffering) {
        layer._auxRenderer = renderers[1];
        setEventSystem(
          layer._auxRenderer,
          layer.options.destroyInteractionManager,
          layer.options.autoPreventDefault,
        );
        layer._container.appendChild(getCanvas(layer._auxRenderer));
        getCanvas(layer._renderer).style.position = "absolute";
        getCanvas(layer._auxRenderer).style.position = "absolute";
      }
      layer._rendererReady = true;
      const callbacks = layer._readyCallbacks;
      layer._readyCallbacks = [];
      callbacks.forEach(function (callback) {
        callback();
      });
    });
  },

  onAdd: function () {
    if (!this._container) {
      const container = (this._container = L.DomUtil.create(
        "div",
        "leaflet-pixi-overlay",
      ));
      container.style.position = "absolute";
      if (this._zoomAnimated) {
        L.DomUtil.addClass(container, "leaflet-zoom-animated");
      }
      this._createRenderers().catch(function (error) {
        console.error("react-leaflet-pixi-overlay: renderer creation failed", error);
      });
    }
    this.getPane().appendChild(this._container);

    const map = this._map;
    this._initialZoom = this.options.projectionZoom(map);
    this._wgsOrigin = L.latLng([0, 0]);
    this._wgsInitialShift = map.project(this._wgsOrigin, this._initialZoom);
    this._mapInitialZoom = map.getZoom();
    const _layer = this;

    this.utils = {
      latLngToLayerPoint: function (latLng, zoom) {
        zoom = zoom === undefined ? _layer._initialZoom : zoom;
        return map.project(L.latLng(latLng), zoom);
      },
      layerPointToLatLng: function (point, zoom) {
        zoom = zoom === undefined ? _layer._initialZoom : zoom;
        return map.unproject(L.point(point), zoom);
      },
      getScale: function (zoom) {
        if (zoom === undefined)
          return map.getZoomScale(map.getZoom(), _layer._initialZoom);
        return map.getZoomScale(zoom, _layer._initialZoom);
      },
      getRenderer: function () {
        return _layer._renderer;
      },
      getContainer: function () {
        return _layer._pixiContainer;
      },
      getMap: function () {
        return _layer._map;
      },
    };
    this._whenRendererReady(function () {
      if (_layer._map && !_layer._destroyed) {
        _layer._update({ type: "add" });
      }
    });
  },

  onRemove: function () {
    this._cancelUpdateRetry();
    L.DomUtil.remove(this._container);
  },

  getEvents: function () {
    const events = {
      zoom: this._onZoom,
      move: this._onMove,
      moveend: this._update,
      zoomend: this._update,
    };
    if (this._zoomAnimated) {
      events.zoomanim = this._onAnimZoom;
    }
    return events;
  },

  _onZoom: function () {
    this._updateTransform(this._map.getCenter(), this._map.getZoom());
  },

  _onAnimZoom: function (e) {
    this._updateTransform(e.center, e.zoom);
  },

  _onMove: function (e) {
    if (this.options.shouldRedrawOnMove(e)) {
      this._update(e);
    }
  },

  _updateTransform: function (center, zoom) {
    if (this._zoom === undefined || !this._center) {
      return;
    }
    const scale = this._map.getZoomScale(zoom, this._zoom),
      viewHalf = this._map.getSize().multiplyBy(0.5 + this.options.padding),
      currentCenterPoint = this._map.project(this._center, zoom),
      topLeftOffset = viewHalf
        .multiplyBy(-scale)
        .add(currentCenterPoint)
        .subtract(this._map._getNewPixelOrigin(center, zoom));

    if (L.Browser.any3d) {
      L.DomUtil.setTransform(this._container, topLeftOffset, scale);
    } else {
      L.DomUtil.setPosition(this._container, topLeftOffset);
    }
  },

  _redraw: function (offset, e) {
    this._disableLeafletRounding();
    const scale = this._map.getZoomScale(this._zoom, this._initialZoom),
      shift = this._map
        .latLngToLayerPoint(this._wgsOrigin)
        ._subtract(this._wgsInitialShift.multiplyBy(scale))
        ._subtract(offset);
    this._pixiContainer.scale.set(scale);
    this._pixiContainer.position.set(shift.x, shift.y);
    this._drawCallback(this.utils, e);
    this._enableLeafletRounding();
  },

  _scheduleUpdateRetry: function (e) {
    if (this._updateRetryFrame) return;
    const layer = this;
    this._updateRetryFrame = L.Util.requestAnimFrame(function () {
      layer._updateRetryFrame = null;
      layer._update(e);
    });
  },

  _cancelUpdateRetry: function () {
    if (this._updateRetryFrame) {
      L.Util.cancelAnimFrame(this._updateRetryFrame);
      this._updateRetryFrame = null;
    }
  },

  _update: function (e) {
    if (!this._rendererReady || !this._map || this._destroyed) {
      this._cancelUpdateRetry();
      return;
    }
    if (this._map._animatingZoom && this._bounds) {
      // Never drop the update: if the zoom animation is still running (or the
      // flag is stale), poll each frame until it clears, then do the real work.
      this._scheduleUpdateRetry(e);
      return;
    }
    this._cancelUpdateRetry();

    // Update pixel bounds of renderer container
    const p = this.options.padding,
      mapSize = this._map.getSize(),
      min = this._map.containerPointToLayerPoint(mapSize.multiplyBy(-p)).round();

    this._bounds = new L.Bounds(min, min.add(mapSize.multiplyBy(1 + p * 2)).round());
    this._center = this._map.getCenter();
    this._zoom = this._map.getZoom();

    if (this._doubleBuffering) {
      const currentRenderer = this._renderer;
      this._renderer = this._auxRenderer;
      this._auxRenderer = currentRenderer;
    }

    const view = getCanvas(this._renderer);
    const b = this._bounds,
      container = this._container,
      size = b.getSize();

    if (
      !this._renderer.size ||
      this._renderer.size.x !== size.x ||
      this._renderer.size.y !== size.y
    ) {
      if (this._renderer.gl) {
        this._renderer.resolution = this.options.resolution;
        if (this._renderer.rootRenderTarget) {
          this._renderer.rootRenderTarget.resolution = this.options.resolution;
        }
      }
      this._renderer.resize(size.x, size.y);
      view.style.width = size.x + "px";
      view.style.height = size.y + "px";
      // Degraded-drawing-buffer correction (GPU clamped the requested canvas
      // size). Only valid on PixiJS <= 7, where renderer.width is in physical
      // pixels; on v8 renderer.width is logical, so the comparison would
      // multiply the resolution by the device pixel ratio on every resize.
      if (PIXI_MAJOR < 8 && this._renderer.gl) {
        const gl = this._renderer.gl;
        if (gl.drawingBufferWidth !== this._renderer.width) {
          const resolution =
            (this.options.resolution * gl.drawingBufferWidth) / this._renderer.width;
          this._renderer.resolution = resolution;
          if (this._renderer.rootRenderTarget) {
            this._renderer.rootRenderTarget.resolution = resolution;
          }
          this._renderer.resize(size.x, size.y);
        }
      }
      this._renderer.size = size;
    }

    if (this._doubleBuffering) {
      const self = this;
      requestAnimationFrame(function () {
        if (self._destroyed || !self._map) return;
        self._redraw(b.min, e);
        if (self._renderer.gl) {
          self._renderer.gl.finish();
        }
        view.style.visibility = "visible";
        getCanvas(self._auxRenderer).style.visibility = "hidden";
        L.DomUtil.setPosition(container, b.min);
      });
    } else {
      this._redraw(b.min, e);
      L.DomUtil.setPosition(container, b.min);
    }
  },

  _disableLeafletRounding: function () {
    L.Point.prototype._round = no_round;
  },

  _enableLeafletRounding: function () {
    L.Point.prototype._round = round;
  },

  // @method redraw(data?: any): this
  // Redraw the layer (runs the draw callback).
  redraw: function (data) {
    if (this._map && this._rendererReady) {
      this._disableLeafletRounding();
      this._drawCallback(this.utils, data);
      this._enableLeafletRounding();
    }
    return this;
  },

  _destroy: function () {
    this._cancelUpdateRetry();
    const layer = this;
    this._whenRendererReady(function () {
      if (layer._renderer) {
        layer._renderer.destroy(true);
        layer._renderer = null;
      }
      if (layer._auxRenderer) {
        layer._auxRenderer.destroy(true);
        layer._auxRenderer = null;
      }
    });
    this._destroyed = true;
  },

  // @method destroy(): void
  // Remove the layer from its map and free the renderer(s).
  destroy: function () {
    this.remove();
    this._destroy();
  },
});

// @factory createPixiOverlayLayer(drawCallback: Function, pixiContainer: PIXI.Container, options?: Object)
// Returns a layer instance, or null when the browser does not support canvas.
export function createPixiOverlayLayer(drawCallback, pixiContainer, options) {
  return L.Browser.canvas
    ? new PixiOverlayLayer(drawCallback, pixiContainer, options)
    : null;
}
