import type { PixiOverlayMarker } from "./types";

export function escapeHtmlAttribute(value: string): string {
  return String(value).replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

export function encodeSvgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function getDefaultIcon(color: string): string {
  const safeColor = escapeHtmlAttribute(color);
  const svgIcon = `<svg style="-webkit-filter: drop-shadow(1px 1px 1px rgba(0,0,0,.4));filter: drop-shadow(1px 1px 1px rgba(0,0,0,.4));" xmlns="http://www.w3.org/2000/svg" fill="${safeColor}" width="36" height="36" viewBox="0 0 24 24"><path d="M12 0c-4.198 0-8 3.403-8 7.602 0 6.243 6.377 6.903 8 16.398 1.623-9.495 8-10.155 8-16.398C20 3.403 16.199 0 12 0zm0 11c-1.657 0-3-1.343-3-3s1.342-3 3-3 3 1.343 3 3-1.343 3-3 3z"/></svg>`;

  return encodeSvgDataUri(svgIcon);
}

/**
 * Texture cache key for a marker. Namespaced per icon kind so a customIcon
 * marker can never collide with a default-icon marker that shares its color,
 * and a customIcon without an iconId still gets a usable (content-derived) key.
 */
export function getMarkerTextureKey(marker: PixiOverlayMarker): string | null {
  if (marker.customIcon) {
    return marker.iconId != null
      ? `icon:${marker.iconId}`
      : `custom:${marker.customIcon}`;
  }
  if (marker.iconColor) {
    return `color:${marker.iconColor}`;
  }
  return null;
}

export function getMarkerTextureSource(marker: PixiOverlayMarker): string | null {
  if (marker.customIcon) {
    return encodeSvgDataUri(marker.customIcon);
  }
  if (marker.iconColor) {
    return getDefaultIcon(marker.iconColor);
  }
  return null;
}

export type ClusterSizeClass = "small" | "medium" | "large";

const CLUSTER_STYLES: Record<
  ClusterSizeClass,
  { radius: number; fill: string; ring: string; font: number }
> = {
  small: { radius: 20, fill: "#61a941", ring: "rgba(110,180,70,.5)", font: 12 },
  medium: { radius: 24, fill: "#f0a034", ring: "rgba(240,170,60,.5)", font: 13 },
  large: { radius: 28, fill: "#e35d43", ring: "rgba(230,100,70,.5)", font: 14 },
};

export function getClusterSizeClass(count: number): ClusterSizeClass {
  if (count < 10) return "small";
  if (count < 100) return "medium";
  return "large";
}

export function formatClusterLabel(count: number): string {
  if (count < 1000) return String(count);
  if (count < 10000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${Math.round(count / 1000)}k`;
}

export function getClusterIcon(label: string, sizeClass: ClusterSizeClass): string {
  const { radius, fill, ring, font } = CLUSTER_STYLES[sizeClass];
  const size = radius * 2;
  const safeLabel = escapeHtmlAttribute(label);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="${ring}"/><circle cx="${radius}" cy="${radius}" r="${radius - 5}" fill="${fill}"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="Helvetica, Arial, sans-serif" font-size="${font}" font-weight="bold" fill="#fff">${safeLabel}</text></svg>`;
  return encodeSvgDataUri(svg);
}
