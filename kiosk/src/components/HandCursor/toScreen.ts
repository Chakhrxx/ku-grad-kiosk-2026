/** Index fingertip in the camera's frame (0..1, camera's own left/right) to a point on a W×H screen, or null off it. */
export interface Point {
  x: number
  y: number
}

/** The share of the picture, round the middle, that reaches the whole screen: arms need not stretch to the edges. */
const ACTIVE_ZONE = 0.7

/**
 * The camera is wider than the portrait screen, so the screen's shape is cut from its middle (full height) first;
 * the picture is mirrored, so raising a hand to the right of the screen moves the cursor right.
 */
export function toScreen(tip: Point, camAspect: number, W: number, H: number): Point {
  const cropW = Math.min(1, W / H / camAspect) // share of the camera's width the screen's shape covers
  const u = (1 - tip.x - (1 - cropW) / 2) / cropW // mirrored, across the screen's shape
  const zone = (v: number) => Math.min(1, Math.max(0, (v - (1 - ACTIVE_ZONE) / 2) / ACTIVE_ZONE))
  return { x: zone(u) * W, y: zone(tip.y) * H }
}
