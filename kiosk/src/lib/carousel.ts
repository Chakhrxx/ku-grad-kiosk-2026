/** Signed distance from `focus` to `index` on a ring of `count` items: -1 is just left, 1 just right. */
export function ringOffset(index: number, focus: number, count: number): number {
  let d = (((index - focus) % count) + count) % count
  if (d > count / 2) d -= count
  return d
}

/** Distance between neighbouring cards, in px; also how far a drag must go to move one card. */
export const CARD_SPACING = 240

export interface CardPose {
  x: number
  /** Depth toward the viewer: the centre card is nearest, so cards pass behind each other as they move. */
  z: number
  rotateY: number
  scale: number
  opacity: number
}

/**
 * Coverflow pose for a card `o` slots from the centre; `o` may be fractional while dragging, so every
 * value changes continuously. Neighbours turn in and shrink; cards beyond them fade away behind.
 */
export function cardPose(o: number): CardPose {
  const a = Math.abs(o)
  const side = Math.sign(o)
  const near = Math.min(a, 1)
  const beyond = Math.max(0, Math.min(a, 2) - 1)
  return {
    x: side * (near * CARD_SPACING + beyond * 90),
    // all at or in front of the stage plane (centre nearest), so every card stays tappable; a card pushed
    // behind the plane would be hidden from taps by the page around it
    z: (2 - Math.min(a, 2)) * 110,
    rotateY: -Math.max(-1, Math.min(1, o)) * 28,
    scale: 1 - 0.45 * near - 0.15 * beyond,
    opacity: a <= 1 ? 1 : Math.max(0, 2 - a),
  }
}
