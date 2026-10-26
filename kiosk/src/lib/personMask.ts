/**
 * Turn the segmenter's per-pixel background confidence into the person's opacity: fully solid where it is
 * fairly sure it is the person (dark gowns score low, and a plain 1 - background would leave them see-through),
 * a narrow soft band at the edge, and blended with the previous frame so parts don't flicker in and out.
 * The blend is one-sided: where the person moves in they show almost at once, so a moving arm or the leading edge
 * is never cut off; where they move away they fade over a few frames, so a one-frame dropout doesn't flicker.
 */
export const EDGE_LOW = 0.3 // person score at or below: background
export const EDGE_HIGH = 0.6 // at or above: solid person
export const KEEP = 0.45 // share of the previous frame kept where the person fades, to steady flicker
export const RISE_KEEP = 0.15 // and where they appear: little, so the cut-out keeps up with movement

/** One pixel's person opacity (0..1) from its background score, with no previous frame to blend with. */
export function personOpacity(background: number): number {
  const t = Math.min(1, Math.max(0, (1 - background - EDGE_LOW) / (EDGE_HIGH - EDGE_LOW)))
  return t * t * (3 - 2 * t)
}

/** Update `alpha` (0..1, one value per pixel, kept between frames) in place from this frame's background scores. */
export function updatePersonAlpha(background: Float32Array, alpha: Float32Array): Float32Array {
  for (let i = 0; i < background.length; i++) {
    const next = personOpacity(background[i])
    const keep = next > alpha[i] ? RISE_KEEP : KEEP
    alpha[i] = keep * alpha[i] + (1 - keep) * next
  }
  return alpha
}
