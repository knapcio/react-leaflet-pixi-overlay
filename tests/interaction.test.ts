import { describe, expect, it, vi } from "vitest";
import {
  bindSpriteClick,
  getDistance,
  getEventPoint,
  makeSpriteInteractive,
} from "../src/interaction";

function fakeSprite() {
  const handlers = new Map<string, Array<(event?: unknown) => void>>();
  return {
    on(event: string, handler: (event?: unknown) => void) {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
      return this;
    },
    emit(event: string, payload?: unknown) {
      for (const handler of handlers.get(event) ?? []) handler(payload);
    },
  };
}

describe("getEventPoint", () => {
  it("copies the point instead of keeping a live reference", () => {
    const global = { x: 10, y: 20 };
    const point = getEventPoint({ global });
    global.x = 999;
    expect(point).toEqual({ x: 10, y: 20 });
  });

  it("falls back to event.data.global (pixi v5/v6)", () => {
    expect(getEventPoint({ data: { global: { x: 1, y: 2 } } })).toEqual({ x: 1, y: 2 });
  });

  it("returns null for events without a position", () => {
    expect(getEventPoint({})).toBeNull();
    expect(getEventPoint(null)).toBeNull();
  });
});

describe("bindSpriteClick", () => {
  // regression: PIXI pools and mutates event.global between events; storing
  // the reference made every drag look like a click
  it("treats a drag as a drag even when pixi mutates the pooled point", () => {
    const sprite = fakeSprite();
    const onClick = vi.fn();
    bindSpriteClick(sprite, onClick);

    const pooled = { global: { x: 0, y: 0 } };
    sprite.emit("pointerdown", pooled);
    // simulate PIXI mutating the same pooled event object during the drag
    pooled.global.x = 200;
    pooled.global.y = 150;
    sprite.emit("pointerup", pooled);

    expect(onClick).not.toHaveBeenCalled();
  });

  it("fires for a genuine click (movement within tolerance)", () => {
    const sprite = fakeSprite();
    const onClick = vi.fn();
    bindSpriteClick(sprite, onClick);

    sprite.emit("pointerdown", { global: { x: 10, y: 10 } });
    sprite.emit("pointerup", { global: { x: 12, y: 11 } });

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("resets on pointerupoutside and pointercancel", () => {
    const sprite = fakeSprite();
    const onClick = vi.fn();
    bindSpriteClick(sprite, onClick);

    sprite.emit("pointerdown", { global: { x: 0, y: 0 } });
    sprite.emit("pointercancel");
    // pointerup with no recorded start is treated as a click (parity with
    // pointer events that never delivered a down on the sprite)
    sprite.emit("pointerup", { global: { x: 500, y: 500 } });
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("getDistance", () => {
  it("computes euclidean distance", () => {
    expect(getDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe("makeSpriteInteractive", () => {
  it("sets interactivity flags for old and new pixi versions", () => {
    const sprite: Record<string, unknown> = { on: () => sprite };
    makeSpriteInteractive(sprite as never, true);
    expect(sprite.interactive).toBe(true);
    expect(sprite.eventMode).toBe("static");
    expect(sprite.cursor).toBe("pointer");
  });
});
