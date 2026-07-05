import * as PIXI from "pixi.js";
import { getItemTextureKey, getItemTextureSource, type DisplayItem } from "./cluster";

export interface TextureRequest {
  key: string;
  source: string;
}

interface CacheEntry {
  source: string;
  texture: unknown;
}

const textureCache = new Map<string, CacheEntry>();
const texturePromises = new Map<string, Promise<unknown>>();
const warnedKeys = new Set<string>();

export function collectTextureRequests(items: DisplayItem[]): TextureRequest[] {
  const requests = new Map<string, string>();
  for (const item of items) {
    const key = getItemTextureKey(item);
    const source = getItemTextureSource(item);
    if (!key || !source || requests.has(key)) continue;
    requests.set(key, source);
  }
  return Array.from(requests, ([key, source]) => ({ key, source }));
}

export function isTextureCached({ key, source }: TextureRequest): boolean {
  const cached = textureCache.get(key);
  return Boolean(cached && cached.source === source);
}

export function areTexturesCached(requests: TextureRequest[]): boolean {
  return requests.every(isTextureCached);
}

/**
 * Texture for a display item, or null when it has not been loaded (yet).
 * When the cached texture was loaded from a different source under the same
 * key (e.g. two different customIcons sharing an iconId), the cached texture
 * is still returned — with a one-time console warning — rather than silently
 * dropping the marker.
 */
export function getTextureForItem(item: DisplayItem): unknown {
  const key = getItemTextureKey(item);
  const source = getItemTextureSource(item);
  if (!key || !source) return null;
  const cached = textureCache.get(key);
  if (!cached) return null;
  if (cached.source !== source && !warnedKeys.has(key)) {
    warnedKeys.add(key);
    console.warn(
      `react-leaflet-pixi-overlay: markers with the same iconId ("${key}") use different icons; the first one wins. Give each distinct icon its own iconId.`,
    );
  }
  return cached.texture;
}

export function loadTextures(requests: TextureRequest[]): Promise<unknown[]> {
  return Promise.all(requests.map(ensureTexture));
}

function ensureTexture({ key, source }: TextureRequest): Promise<unknown> {
  if (isTextureCached({ key, source })) {
    return Promise.resolve(textureCache.get(key)!.texture);
  }

  const promiseKey = `${key}:${source}`;
  const pending = texturePromises.get(promiseKey);
  if (pending) return pending;

  const promise = loadTexture(source)
    .then((texture) => {
      textureCache.set(key, { source, texture });
      texturePromises.delete(promiseKey);
      return texture;
    })
    .catch((error) => {
      texturePromises.delete(promiseKey);
      throw error;
    });

  texturePromises.set(promiseKey, promise);
  return promise;
}

/**
 * Decode the image ourselves and hand the loaded element to PIXI. This has
 * deterministic completion on every PixiJS major (5-8) — unlike Texture.from
 * on a URL (silent late pop-in, removed for URLs in v8) or Assets.load on a
 * data: URI (extension-based format detection is unreliable across versions).
 */
function loadTexture(source: string): Promise<unknown> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("react-leaflet-pixi-overlay: failed to load marker icon"));
    image.src = source;
  }).then((image) => PIXI.Texture.from(image as never));
}
