import Supercluster from "supercluster";
import {
  formatClusterLabel,
  getClusterIcon,
  getClusterSizeClass,
  getMarkerTextureKey,
  getMarkerTextureSource,
  type ClusterSizeClass,
} from "./icons";
import type { PixiOverlayClusterOptions, PixiOverlayMarker } from "./types";

export type DisplayItem =
  | { type: "marker"; id: string; marker: PixiOverlayMarker }
  | {
      type: "cluster";
      id: string;
      clusterId: number;
      position: [number, number];
      count: number;
      label: string;
      sizeClass: ClusterSizeClass;
    };

interface MarkerFeatureProps {
  markerIndex: number;
}

export type ClusterIndex = Supercluster<MarkerFeatureProps>;

/** Accepts the LatLngExpression shapes we support without depending on Leaflet. */
export function toLatLng(
  position: PixiOverlayMarker["position"],
): [number, number] | null {
  if (Array.isArray(position)) {
    const [lat, lng] = position;
    return typeof lat === "number" && typeof lng === "number" ? [lat, lng] : null;
  }
  if (
    position &&
    typeof (position as { lat: number }).lat === "number" &&
    typeof (position as { lng: number }).lng === "number"
  ) {
    return [(position as { lat: number }).lat, (position as { lng: number }).lng];
  }
  return null;
}

export function buildClusterIndex(
  markers: PixiOverlayMarker[],
  options?: PixiOverlayClusterOptions,
): ClusterIndex {
  const index = new Supercluster<MarkerFeatureProps>({
    radius: 60,
    maxZoom: 16,
    ...options,
  });
  index.load(
    markers.flatMap((marker, markerIndex) => {
      const latLng = toLatLng(marker.position);
      if (!latLng) return [];
      return [
        {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [latLng[1], latLng[0]] as [number, number],
          },
          properties: { markerIndex },
        },
      ];
    }),
  );
  return index;
}

export function markerDisplayItems(markers: PixiOverlayMarker[]): DisplayItem[] {
  return markers.map((marker) => ({
    type: "marker",
    id: `marker:${marker.id}`,
    marker,
  }));
}

/**
 * Resolve the currently visible clusters/points for the given viewport.
 * bbox is `[west, south, east, north]`.
 */
export function clusterDisplayItems(
  markers: PixiOverlayMarker[],
  index: ClusterIndex,
  bbox: [number, number, number, number],
  zoom: number,
): DisplayItem[] {
  const clamped: [number, number, number, number] = [
    Math.max(-180, bbox[0]),
    Math.max(-90, bbox[1]),
    Math.min(180, bbox[2]),
    Math.min(90, bbox[3]),
  ];
  return index.getClusters(clamped, Math.round(zoom)).map((feature) => {
    const [lng, lat] = feature.geometry.coordinates as [number, number];
    if (feature.properties && "cluster" in feature.properties) {
      const count = (feature.properties as { point_count: number }).point_count;
      const clusterId = (feature.properties as { cluster_id: number }).cluster_id;
      return {
        type: "cluster",
        id: `cluster:${clusterId}`,
        clusterId,
        position: [lat, lng],
        count,
        label: formatClusterLabel(count),
        sizeClass: getClusterSizeClass(count),
      };
    }
    const marker = markers[(feature.properties as MarkerFeatureProps).markerIndex];
    return { type: "marker", id: `marker:${marker.id}`, marker };
  });
}

export function getItemTextureKey(item: DisplayItem): string | null {
  if (item.type === "cluster") {
    return `cluster:${item.sizeClass}:${item.label}`;
  }
  return getMarkerTextureKey(item.marker);
}

export function getItemTextureSource(item: DisplayItem): string | null {
  if (item.type === "cluster") {
    return getClusterIcon(item.label, item.sizeClass);
  }
  return getMarkerTextureSource(item.marker);
}
