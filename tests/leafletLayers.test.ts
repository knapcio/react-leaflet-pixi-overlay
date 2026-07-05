import { describe, expect, it } from "vitest";
import {
  buildPopupOptions,
  buildTooltipOptions,
  getPopupData,
  getTooltipData,
  isLeafletRenderable,
} from "../src/leafletLayers";
import type { PixiOverlayMarker } from "../src/types";

const baseMarker: PixiOverlayMarker = {
  id: "m1",
  position: [10, 20],
  iconColor: "blue",
};

describe("getPopupData / getTooltipData", () => {
  it("returns null when there is no content", () => {
    expect(getPopupData(baseMarker)).toBeNull();
    expect(getTooltipData(baseMarker)).toBeNull();
  });

  it("applies default offsets", () => {
    expect(getPopupData({ ...baseMarker, popup: "hi" })?.offset).toEqual([0, -35]);
    expect(getTooltipData({ ...baseMarker, tooltip: "hi" })?.offset).toEqual([0, -35]);
  });

  it("returns a fresh object on every call (never a cached reference)", () => {
    const marker = { ...baseMarker, popup: "hi" };
    expect(getPopupData(marker)).not.toBe(getPopupData(marker));
  });
});

describe("buildPopupOptions", () => {
  // regression: { autoClose: false } used to be spread AFTER the user's
  // popupOptions, silently overriding it
  it("lets user popupOptions override the autoClose default", () => {
    const data = getPopupData({
      ...baseMarker,
      popup: "hi",
      popupOptions: { autoClose: true },
    })!;
    expect(buildPopupOptions(data).autoClose).toBe(true);
  });

  it("defaults autoClose to false", () => {
    const data = getPopupData({ ...baseMarker, popup: "hi" })!;
    expect(buildPopupOptions(data).autoClose).toBe(false);
  });

  it("lets user options override the offset", () => {
    const data = getPopupData({
      ...baseMarker,
      popup: "hi",
      popupOffset: [1, 2],
      popupOptions: { offset: [9, 9] },
    })!;
    expect(buildPopupOptions(data).offset).toEqual([9, 9]);
  });
});

describe("buildTooltipOptions", () => {
  // regression: without an explicit direction, Leaflet's "auto" put the
  // tooltip beside the pin, where the -35px lift left it floating detached
  it("defaults direction to top so the tooltip sits above the pin", () => {
    const data = getTooltipData({ ...baseMarker, tooltip: "hi" })!;
    expect(buildTooltipOptions(data)).toMatchObject({
      offset: [0, -35],
      direction: "top",
    });
  });

  it("merges user tooltip options over defaults", () => {
    const data = getTooltipData({
      ...baseMarker,
      tooltip: "hi",
      tooltipOptions: { direction: "right", offset: [9, 9] },
    })!;
    expect(buildTooltipOptions(data)).toMatchObject({
      direction: "right",
      offset: [9, 9],
    });
  });
});

describe("isLeafletRenderable", () => {
  it("accepts strings and dom elements, rejects react nodes", () => {
    expect(isLeafletRenderable("hello")).toBe(true);
    expect(isLeafletRenderable(document.createElement("div"))).toBe(true);
    expect(isLeafletRenderable({ type: "div", props: {} } as never)).toBe(false);
    expect(isLeafletRenderable(42 as never)).toBe(false);
  });
});
