import { describe, expect, it } from "vitest";
import {
  escapeHtmlAttribute,
  formatClusterLabel,
  getClusterSizeClass,
  getDefaultIcon,
  getMarkerTextureKey,
  getMarkerTextureSource,
} from "../src/icons";

describe("escapeHtmlAttribute", () => {
  it("escapes html-sensitive characters", () => {
    expect(escapeHtmlAttribute(`red" onload="alert(1)`)).toBe(
      "red&quot; onload=&quot;alert(1)",
    );
    expect(escapeHtmlAttribute("<&>'")).toBe("&lt;&amp;&gt;&#39;");
  });
});

describe("getDefaultIcon", () => {
  it("embeds the (escaped) color in a data uri", () => {
    const uri = getDefaultIcon("red");
    expect(uri.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(uri)).toContain('fill="red"');
  });
});

describe("getMarkerTextureKey", () => {
  // regression: a customIcon marker sharing iconColor with a default-icon
  // marker must NOT collide in the texture cache
  it("namespaces custom icons away from color icons", () => {
    const colorKey = getMarkerTextureKey({ id: 1, position: [0, 0], iconColor: "red" });
    const customKey = getMarkerTextureKey({
      id: 2,
      position: [0, 0],
      iconColor: "red",
      customIcon: "<svg width='1' height='1'></svg>",
    });
    expect(colorKey).not.toBe(customKey);
  });

  // regression: customIcon without iconId or iconColor must still get a key
  it("derives a key from customIcon content when no iconId is given", () => {
    const key = getMarkerTextureKey({
      id: 1,
      position: [0, 0],
      customIcon: "<svg width='1' height='1'></svg>",
    });
    expect(key).toBeTruthy();
  });

  it("uses iconId when provided", () => {
    const marker = {
      id: 1,
      position: [0, 0] as [number, number],
      customIcon: "<svg width='1' height='1'></svg>",
      iconId: "pin",
    };
    expect(getMarkerTextureKey(marker)).toBe("icon:pin");
  });

  it("returns null when the marker has no icon information", () => {
    expect(getMarkerTextureKey({ id: 1, position: [0, 0] })).toBeNull();
    expect(getMarkerTextureSource({ id: 1, position: [0, 0] })).toBeNull();
  });
});

describe("cluster icon helpers", () => {
  it("classifies cluster sizes", () => {
    expect(getClusterSizeClass(2)).toBe("small");
    expect(getClusterSizeClass(10)).toBe("medium");
    expect(getClusterSizeClass(150)).toBe("large");
  });

  it("formats labels compactly", () => {
    expect(formatClusterLabel(7)).toBe("7");
    expect(formatClusterLabel(999)).toBe("999");
    expect(formatClusterLabel(1200)).toBe("1.2k");
    expect(formatClusterLabel(2000)).toBe("2k");
    expect(formatClusterLabel(25000)).toBe("25k");
  });
});
