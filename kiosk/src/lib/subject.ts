import type { Box } from './faceRestore'

/**
 * Where the visitor stands in a gen photo, as shares of its height, measured on the design's sample photo
 * (a graduate full length in the middle of the road): head here, feet here.
 */
// ponytail: one placement for every scene; move these into catalog.json per background if a scene's road differs
export const SUBJECT_HEAD = 0.335
export const SUBJECT_FEET = 0.83
/** A body reaching this low (share of the photo height) was cut off by the camera: it has no feet to stand on. */
const CUT_OFF = 0.98
/** The most a cut-out is enlarged; past this its low resolution shows. */
const MAX_GROW = 1.6

export interface Placement {
  scale: number
  dx: number
  dy: number
}

/**
 * How to scale and move the visitor so they stand in the scene like the sample, whatever their distance from the
 * camera: `body` is their box in photo px as the still would land unplaced (W×H photo). Centred, head and feet on
 * their lines; a body cut off by the camera keeps its cut edge on the photo's bottom edge, head on the line.
 */
export function placeSubject(body: Box, W: number, H: number): Placement {
  const bottom = body.y + body.h
  const cutOff = bottom >= H * CUT_OFF
  const floor = cutOff ? H : SUBJECT_FEET * H
  const scale = Math.min(MAX_GROW, (floor - SUBJECT_HEAD * H) / body.h)
  return { scale, dx: W / 2 - scale * (body.x + body.w / 2), dy: floor - scale * bottom }
}
