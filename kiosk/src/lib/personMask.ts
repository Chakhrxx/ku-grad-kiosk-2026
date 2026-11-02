/**
 * Turn the segmenter's per-pixel background confidence into the person's opacity: fully solid where it is
 * fairly sure it is the person (dark gowns score low, and a plain 1 - background would leave them see-through),
 * and a narrow soft band at the edge.
 */
export const EDGE_LOW = 0.3 // person score at or below: background
export const EDGE_HIGH = 0.6 // at or above: solid person

/** One pixel's person opacity (0..1) from its background score. */
export function personOpacity(background: number): number {
  const t = Math.min(1, Math.max(0, (1 - background - EDGE_LOW) / (EDGE_HIGH - EDGE_LOW)))
  return t * t * (3 - 2 * t)
}

