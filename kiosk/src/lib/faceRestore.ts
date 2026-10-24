/**
 * The arithmetic behind putting the visitor's real face back on the try-on model's dressed photo (its 720p video
 * leaves a small face soft). The canvas work lives in useLiveBackground's restoreFace.
 */

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Pixels on a mask grid the face must cover; fewer means no face was found. */
export const MIN_FACE_PIXELS = 40
/** Share of face pixels trimmed off each edge of the box, so a few stray pixels can't stretch it. */
const TRIM = 0.02
/** How far the dressed face may differ in size from the real one before pasting would look wrong. */
export const MAX_SCALE_CHANGE = 1.4
/** How much the dressed photo's skin may be tinted towards the visitor's (per channel, either way). */
export const MAX_TINT = 1.6

/**
 * Where `score` (one value per pixel of a `width`-wide grid) is above `min`, as a box; null if hardly anywhere.
 * `trim` is the share of those pixels left off each edge.
 */
export function faceBox(score: Float32Array, width: number, min = 0.5, trim = TRIM): Box | null {
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i < score.length; i++) {
    if (score[i] > min) {
      xs.push(i % width)
      ys.push(Math.floor(i / width))
    }
  }
  if (xs.length < MIN_FACE_PIXELS) return null
  const span = (v: number[]) => {
    v.sort((a, b) => a - b)
    const k = Math.floor(v.length * trim)
    return [v[k], v[v.length - 1 - k] + 1]
  }
  const [x0, x1] = span(xs)
  const [y0, y1] = span(ys)
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** A box on a grid scaled (and moved by an offset) into image pixels. */
export const scaleBox = (b: Box, kx: number, ky: number, ox = 0, oy = 0): Box => ({
  x: ox + b.x * kx,
  y: oy + b.y * ky,
  w: b.w * kx,
  h: b.h * ky,
})

/** A square around a box, `factor` times its longer side, on the same centre. */
export function squareAround(b: Box, factor: number): Box {
  const side = Math.max(b.w, b.h) * factor
  return { x: b.x + b.w / 2 - side / 2, y: b.y + b.h / 2 - side / 2, w: side, h: side }
}

export interface Fit {
  scale: number
  dx: number
  dy: number
}

/**
 * How to move and scale the real face (`from`) onto the dressed one (`to`): same width, centred, and the chins
 * level. Width and chin, not height, because the graduation cap hides the forehead in the dressed photo.
 * Null when the two are too different in size or place to be the same head.
 */
export function fitFace(from: Box, to: Box): Fit | null {
  const scale = to.w / from.w
  if (scale > MAX_SCALE_CHANGE || scale < 1 / MAX_SCALE_CHANGE) return null
  const [fromX, fromChin] = [from.x + from.w / 2, from.y + from.h]
  const [toX, toChin] = [to.x + to.w / 2, to.y + to.h]
  if (Math.hypot(toX - fromX, toChin - fromChin) > to.w) return null // more than a face apart: not the same head
  return { scale, dx: toX - fromX * scale, dy: toChin - fromChin * scale }
}

/** Mean colour of `rgba` pixels where `score` (same grid) is above `min`; null if none. */
export function meanColor(rgba: Uint8ClampedArray, score: Float32Array, min = 0.5): [number, number, number] | null {
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let i = 0; i < score.length; i++) {
    if (score[i] <= min) continue
    r += rgba[i * 4]
    g += rgba[i * 4 + 1]
    b += rgba[i * 4 + 2]
    n++
  }
  return n ? [r / n, g / n, b / n] : null
}

/** Per-channel gain that brings the dressed skin colour `from` to the visitor's `to`, within MAX_TINT. */
export function tintGain(from: [number, number, number], to: [number, number, number]): [number, number, number] {
  const gain = (a: number, b: number) => Math.min(MAX_TINT, Math.max(1 / MAX_TINT, b / Math.max(a, 1)))
  return [gain(from[0], to[0]), gain(from[1], to[1]), gain(from[2], to[2])]
}
