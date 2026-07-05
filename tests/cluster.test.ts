import { describe, expect, it } from "vitest";
import {
  buildClusterIndex,
  clusterDisplayItems,
  getItemTextureKey,
  getItemTextureSource,
  markerDisplayItems,
  toLatLng,
} from "../src/cluster";
import type { PixiOverlayMarker } from "../src/types";

const WORLD: [number, number, number, number] = [-180, -90, 180, 90];

function makeMarkers(count: number, spread = 0): PixiOverlayMarker[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    position: [50 + i * spread, 10 + i * spread] as [number, number],
    iconColor: "red",
  }));
}

describe("toLatLng", () => {
  it("accepts [lat, lng] arrays and {lat, lng} objects", () => {
    expect(toLatLng([1, 2])).toEqual([1, 2]);
    expect(toLatLng({ lat: 3, lng: 4 })).toEqual([3, 4]);
    expect(toLatLng(undefined as never)).toBeNull();
  });
});

describe("markerDisplayItems", () => {
  it("wraps markers with namespaced ids", () => {
    const items = markerDisplayItems(makeMarkers(2));
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ type: "marker", id: "marker:0" });
  });
});

describe("clusterDisplayItems", () => {
  it("collapses co-located markers into one cluster with the right count", () => {
    const markers = makeMarkers(100);
    const index = buildClusterIndex(markers);
    const items = clusterDisplayItems(markers, index, WORLD, 3);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: "cluster", count: 100, label: "100" });
  });

  it("returns individual markers when they are far apart", () => {
    const markers = makeMarkers(3, 10);
    const index = buildClusterIndex(markers);
    const items = clusterDisplayItems(markers, index, WORLD, 10);

    expect(items.filter((item) => item.type === "marker")).toHaveLength(3);
  });

  it("maps cluster leaves back to the original marker objects", () => {
    const markers = makeMarkers(3, 10);
    const index = buildClusterIndex(markers);
    const items = clusterDisplayItems(markers, index, WORLD, 10);

    const first = items.find(
      (item) => item.type === "marker" && item.marker === markers[0],
    );
    expect(first).toBeTruthy();
  });

  it("respects the bbox filter", () => {
    const markers = makeMarkers(3, 10); // at lat 50, 60, 70
    const index = buildClusterIndex(markers);
    const items = clusterDisplayItems(markers, index, [0, 45, 20, 55], 10);

    expect(items).toHaveLength(1);
  });
});

describe("item texture helpers", () => {
  it("gives clusters their own namespaced texture key and svg source", () => {
    const markers = makeMarkers(100);
    const index = buildClusterIndex(markers);
    const [item] = clusterDisplayItems(markers, index, WORLD, 3);

    expect(getItemTextureKey(item)).toBe("cluster:large:100");
    expect(getItemTextureSource(item)).toContain("data:image/svg+xml");
  });
});
