import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import * as PIXI from "pixi.js";
import { useMap } from "react-leaflet";
import type { Popup, Tooltip } from "leaflet";
import {
  buildClusterIndex,
  clusterDisplayItems,
  getItemTextureKey,
  markerDisplayItems,
  toLatLng,
  type DisplayItem,
} from "./cluster";
import {
  areTexturesCached,
  collectTextureRequests,
  getTextureForItem,
  loadTextures,
} from "./textures";
import {
  bindSpriteClick,
  makeSpriteInteractive,
  type InteractiveSprite,
} from "./interaction";
import {
  getPopupData,
  getTooltipData,
  openPopup,
  openTooltip,
  removeLayerRef,
  type PopupData,
  type TooltipData,
} from "./leafletLayers";
import { createPixiOverlayLayer } from "./vendor/pixiOverlayLayer";
import type { PixiOverlayLayerInstance } from "./vendor/pixiOverlayLayer";
import type { PixiOverlayMarkerId, PixiOverlayProps } from "./types";

type AnySprite = PIXI.Sprite & { _rlpoBaseScale?: number };

interface SpriteRecord {
  sprite: AnySprite;
  textureKey: string;
  texture: unknown;
}

interface OverlayHandle {
  layer: PixiOverlayLayerInstance;
  markersContainer: PIXI.Container;
  spriteMap: Map<string, SpriteRecord>;
}

interface PortalTarget {
  element: HTMLElement;
  content: ReactNode;
}

const PixiOverlay = ({
  markers = [],
  cluster = false,
  onClusterClick,
  onDraw,
}: PixiOverlayProps) => {
  const map = useMap();

  const [overlay, setOverlay] = useState<OverlayHandle | null>(null);
  const [openedPopupData, setOpenedPopupData] = useState<PopupData | null>(null);
  const [openedTooltipData, setOpenedTooltipData] = useState<TooltipData | null>(null);
  const [popupPortal, setPopupPortal] = useState<PortalTarget | null>(null);
  const [tooltipPortal, setTooltipPortal] = useState<PortalTarget | null>(null);
  const [readySignature, setReadySignature] = useState("");
  const [viewVersion, setViewVersion] = useState(0);

  const popupRef = useRef<Popup | null>(null);
  const tooltipRef = useRef<Tooltip | null>(null);
  const autoOpenedIdRef = useRef<PixiOverlayMarkerId | null>(null);
  const onDrawRef = useRef(onDraw);
  onDrawRef.current = onDraw;
  const onClusterClickRef = useRef(onClusterClick);
  onClusterClickRef.current = onClusterClick;

  const clusterEnabled = Boolean(cluster);
  const clusterOptions = typeof cluster === "object" ? cluster : undefined;
  const clusterOptionsKey = JSON.stringify(clusterOptions ?? null);

  // ---- overlay layer lifecycle -------------------------------------------

  useEffect(() => {
    let cancelled = false;
    let handle: OverlayHandle | null = null;

    // whenReady also covers maps whose view (center/zoom) is set only after
    // mount; the overlay is created as soon as the view exists.
    map.whenReady(() => {
      if (cancelled) return;

      const root = new PIXI.Container();
      const markersContainer = new PIXI.Container();
      markersContainer.sortableChildren = true;
      root.addChild(markersContainer);

      const layer = createPixiOverlayLayer((utils, event) => {
        const scale = utils.getScale();
        for (const child of markersContainer.children as AnySprite[]) {
          child.scale.set((child._rlpoBaseScale ?? 1) / scale);
        }
        onDrawRef.current?.(utils, event);
        (utils.getRenderer() as { render(container: unknown): void }).render(
          utils.getContainer(),
        );
      }, root);

      if (!layer) {
        console.error(
          "react-leaflet-pixi-overlay: this browser does not support canvas rendering",
        );
        return;
      }

      handle = { layer, markersContainer, spriteMap: new Map() };
      layer.addTo(map);
      layer.whenReady(() => {
        if (!cancelled) setOverlay(handle);
      });
    });

    return () => {
      cancelled = true;
      setOverlay(null);
      if (handle) {
        handle.spriteMap.clear();
        handle.markersContainer.removeChildren();
        handle.layer.destroy();
      }
    };
  }, [map]);

  // ---- clustering ---------------------------------------------------------

  useEffect(() => {
    if (!clusterEnabled) return;
    const bump = () => setViewVersion((version) => version + 1);
    map.on("moveend zoomend", bump);
    return () => {
      map.off("moveend zoomend", bump);
    };
  }, [map, clusterEnabled]);

  const clusterIndex = useMemo(() => {
    if (!clusterEnabled) return null;
    return buildClusterIndex(markers, clusterOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, clusterEnabled, clusterOptionsKey]);

  const displayItems = useMemo<DisplayItem[]>(() => {
    if (!clusterIndex) return markerDisplayItems(markers);
    if (map.getZoom() === undefined) return [];
    const bounds = map.getBounds().pad(0.2);
    return clusterDisplayItems(
      markers,
      clusterIndex,
      [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      map.getZoom(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, clusterIndex, map, viewVersion, overlay]);

  // ---- texture loading ----------------------------------------------------

  const textureRequests = useMemo(
    () => collectTextureRequests(displayItems),
    [displayItems],
  );
  const textureSignature = useMemo(
    () => textureRequests.map((request) => request.key).join(""),
    [textureRequests],
  );
  const texturesReady =
    textureRequests.length === 0 ||
    readySignature === textureSignature ||
    areTexturesCached(textureRequests);

  useEffect(() => {
    if (areTexturesCached(textureRequests)) {
      setReadySignature(textureSignature);
      return;
    }
    let cancelled = false;
    loadTextures(textureRequests)
      .catch((error) => {
        if (!cancelled) {
          console.error(
            "react-leaflet-pixi-overlay: failed to load marker icons",
            error,
          );
        }
      })
      .then(() => {
        if (!cancelled) setReadySignature(textureSignature);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textureSignature]);

  // ---- sprite sync (incremental diff by item id) --------------------------

  useEffect(() => {
    if (!overlay || !texturesReady) return;

    const { layer, markersContainer, spriteMap } = overlay;
    const utils = layer.utils;
    const seen = new Set<string>();

    for (const item of displayItems) {
      const texture = getTextureForItem(item);
      if (!texture) continue;

      const latLng = toLatLng(
        item.type === "marker" ? item.marker.position : item.position,
      );
      if (!latLng) continue;

      const textureKey = `${item.type}:${String(getItemTextureKey(item))}`;
      let record = spriteMap.get(item.id);

      if (record && (record.textureKey !== textureKey || record.texture !== texture)) {
        markersContainer.removeChild(record.sprite);
        record.sprite.destroy();
        spriteMap.delete(item.id);
        record = undefined;
      }

      let sprite: AnySprite;
      if (record) {
        sprite = record.sprite;
        sprite.removeAllListeners();
      } else {
        sprite = PIXI.Sprite.from(texture as never) as AnySprite;
        markersContainer.addChild(sprite);
        spriteMap.set(item.id, { sprite, textureKey, texture });
      }

      const point = utils.latLngToLayerPoint(latLng);
      sprite.x = point.x;
      sprite.y = point.y;

      if (item.type === "marker") {
        const marker = item.marker;
        const anchor = marker.markerSpriteAnchor || [0.5, 1];
        sprite.anchor.set(anchor[0], anchor[1]);
        sprite.angle = marker.angle ?? 0;
        sprite.alpha = marker.alpha ?? 1;
        sprite.zIndex = marker.zIndex ?? 0;
        sprite._rlpoBaseScale = marker.scale ?? 1;

        const popupData = getPopupData(marker);
        const tooltipData = getTooltipData(marker);
        const clickable = Boolean(popupData || marker.onClick);
        const hoverable = Boolean(
          tooltipData || marker.onMouseOver || marker.onMouseOut,
        );

        if (clickable || hoverable) {
          makeSpriteInteractive(sprite as InteractiveSprite, clickable);
        }

        if (clickable) {
          bindSpriteClick(sprite as InteractiveSprite, () => {
            if (popupData) {
              // fresh object per click so re-opening after a user close
              // is never bailed out by Object.is equality
              setOpenedPopupData(getPopupData(marker));
            }
            marker.onClick?.(marker.id);
          });
        }

        if (hoverable) {
          sprite.on("pointerover", () => {
            if (tooltipData) setOpenedTooltipData(getTooltipData(marker));
            marker.onMouseOver?.(marker.id);
          });
          sprite.on("pointerout", () => {
            if (tooltipData) setOpenedTooltipData(null);
            marker.onMouseOut?.(marker.id);
          });
        }
      } else {
        sprite.anchor.set(0.5, 0.5);
        sprite.angle = 0;
        sprite.alpha = 1;
        sprite.zIndex = 1;
        sprite._rlpoBaseScale = 1;

        makeSpriteInteractive(sprite as InteractiveSprite, true);
        const index = clusterIndex;
        bindSpriteClick(sprite as InteractiveSprite, () => {
          if (!index) return;
          let expansionZoom = index.getClusterExpansionZoom(item.clusterId);
          const maxZoom = map.getMaxZoom();
          if (Number.isFinite(maxZoom)) {
            expansionZoom = Math.min(expansionZoom, maxZoom);
          }
          const proceed = onClusterClickRef.current?.({
            position: item.position,
            count: item.count,
            expansionZoom,
          });
          if (proceed === false) return;
          map.setView(item.position, expansionZoom, { animate: true });
        });
      }

      seen.add(item.id);
    }

    for (const [id, record] of spriteMap) {
      if (!seen.has(id)) {
        markersContainer.removeChild(record.sprite);
        record.sprite.destroy();
        spriteMap.delete(id);
      }
    }

    // popupOpen auto-open: once per marker id, so a user's dismissal is not
    // overridden on every markers identity change
    const autoItem = displayItems.find(
      (item): item is Extract<DisplayItem, { type: "marker" }> =>
        item.type === "marker" &&
        Boolean(item.marker.popupOpen) &&
        item.marker.popup != null,
    );
    if (autoItem) {
      if (autoOpenedIdRef.current !== autoItem.marker.id) {
        autoOpenedIdRef.current = autoItem.marker.id;
        setOpenedPopupData(getPopupData(autoItem.marker));
      }
    } else {
      autoOpenedIdRef.current = null;
    }

    layer.redraw();
  }, [overlay, displayItems, texturesReady, clusterIndex, map]);

  // ---- popup --------------------------------------------------------------

  useEffect(() => {
    if (!openedPopupData) return;

    let popup: Popup | null = null;

    // Fires only for user-initiated closes (the X button, a later map
    // click...): our own teardown detaches this handler first, so
    // programmatic removal never emits a spurious onClick(null).
    const handleUserClose = () => {
      popupRef.current = null;
      setOpenedPopupData(null);
      openedPopupData.onClick?.(null);
    };

    // Deferred one tick: when the popup was opened by a marker click, that
    // click's browser 'click' event is still in flight, and Leaflet's
    // preclick (closeOnClick) would close the popup in the same gesture.
    const timer = window.setTimeout(() => {
      const opened = openPopup(map, openedPopupData);
      popup = opened.layer;
      popupRef.current = popup;
      if (opened.portalElement) {
        // portalElement is only created for content Leaflet can't take
        // as-is, i.e. React nodes
        setPopupPortal({
          element: opened.portalElement,
          content: openedPopupData.content as ReactNode,
        });
      }
      popup.on("remove", handleUserClose);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      popup?.off("remove", handleUserClose);
      setPopupPortal(null);
      removeLayerRef(map, popupRef);
    };
  }, [openedPopupData, map]);

  // ---- tooltip -------------------------------------------------------------

  useEffect(() => {
    if (!openedTooltipData) return;
    if (openedPopupData && openedPopupData.id === openedTooltipData.id) return;

    const { layer: tooltip, portalElement } = openTooltip(map, openedTooltipData);
    tooltipRef.current = tooltip;
    if (portalElement) {
      setTooltipPortal({
        element: portalElement,
        content: openedTooltipData.content as ReactNode,
      });
    }

    return () => {
      setTooltipPortal(null);
      removeLayerRef(map, tooltipRef);
    };
  }, [openedTooltipData, openedPopupData, map]);

  // Re-measure popup/tooltip after portal content mounts.
  useEffect(() => {
    if (popupPortal) popupRef.current?.update();
  }, [popupPortal]);
  useEffect(() => {
    if (tooltipPortal) tooltipRef.current?.update();
  }, [tooltipPortal]);

  return (
    <>
      {popupPortal ? createPortal(popupPortal.content, popupPortal.element) : null}
      {tooltipPortal
        ? createPortal(tooltipPortal.content, tooltipPortal.element)
        : null}
    </>
  );
};

export default PixiOverlay;
