const CLICK_TOLERANCE_PX = 5;

interface XY {
  x: number;
  y: number;
}

/** Minimal event-emitter surface shared by PIXI display objects v5-v8. */
export interface InteractiveSprite {
  on(event: string, handler: (event?: unknown) => void): unknown;
  interactive?: boolean;
  eventMode?: string;
  cursor?: string;
  buttonMode?: boolean;
}

/**
 * PIXI pools and mutates pointer events (event.global / event.data.global is
 * updated in place between events), so the point MUST be copied — storing the
 * reference would make every start/end comparison see identical coordinates.
 */
export function getEventPoint(event: unknown): XY | null {
  const e = event as {
    global?: XY;
    data?: { global?: XY };
  } | null;
  const point = e?.global ?? e?.data?.global;
  if (!point) return null;
  return { x: point.x, y: point.y };
}

export function getDistance(start: XY, end: XY): number {
  const x = end.x - start.x;
  const y = end.y - start.y;
  return Math.sqrt(x * x + y * y);
}

export function makeSpriteInteractive(
  sprite: InteractiveSprite,
  showPointerCursor: boolean,
): void {
  sprite.interactive = true;
  sprite.eventMode = "static";

  if (showPointerCursor) {
    sprite.cursor = "pointer";
    sprite.buttonMode = true;
  }
}

/**
 * Click binding with drag tolerance: a pointerup further than a few pixels
 * from its pointerdown is a map drag that happened to start on the marker,
 * not a click.
 */
export function bindSpriteClick(sprite: InteractiveSprite, onClick: () => void): void {
  let pointerStart: XY | null = null;

  sprite.on("pointerdown", (event) => {
    pointerStart = getEventPoint(event);
  });

  sprite.on("pointerup", (event) => {
    const pointerEnd = getEventPoint(event);
    const isClick =
      !pointerStart ||
      !pointerEnd ||
      getDistance(pointerStart, pointerEnd) <= CLICK_TOLERANCE_PX;

    pointerStart = null;

    if (isClick) {
      onClick();
    }
  });

  sprite.on("pointerupoutside", () => {
    pointerStart = null;
  });

  sprite.on("pointercancel", () => {
    pointerStart = null;
  });
}
