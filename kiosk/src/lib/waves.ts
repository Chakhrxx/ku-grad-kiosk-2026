/**
 * Geometry for the home-screen wave lines, traced from the Figma home frame (720 × 1280):
 * a silk ribbon rising from the bottom-left, pinching beside the CTA, then sweeping up to the right,
 * plus a faint dotted band behind the logo. Pure functions so the shape can be tested without a canvas.
 */

export type Point = readonly [x: number, y: number]

/** Smooth curve through points sorted by x (cubic Hermite, Catmull-Rom tangents). Clamped outside the ends. */
export function smoothCurve(points: Point[]): (x: number) => number {
  const n = points.length
  const slope = (j: number) => {
    const a = points[Math.max(j - 1, 0)]
    const b = points[Math.min(j + 1, n - 1)]
    return (b[1] - a[1]) / (b[0] - a[0])
  }
  return (x) => {
    if (x <= points[0][0]) return points[0][1]
    if (x >= points[n - 1][0]) return points[n - 1][1]
    let i = 0
    while (x > points[i + 1][0]) i++
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    const h = x1 - x0
    const u = (x - x0) / h
    const u2 = u * u
    const u3 = u2 * u
    return (
      (2 * u3 - 3 * u2 + 1) * y0 +
      (u3 - 2 * u2 + u) * slope(i) * h +
      (-2 * u3 + 3 * u2) * y1 +
      (u3 - u2) * slope(i + 1) * h
    )
  }
}

/** Axis the ribbon twists around: up over the bottom-left, down beside the CTA, then up to the top-right. */
export const ribbonAxis = smoothCurve([
  [-40, 1270],
  [0, 1240],
  [170, 1135],
  [330, 1150],
  [480, 1175],
  [600, 1060],
  [720, 940],
  [770, 885],
])

/** Half the ribbon's width when it faces the viewer: narrow on the left, fanning wide to the right. */
export const ribbonHalfWidth = smoothCurve([
  [-40, 40],
  [170, 80],
  [330, 70],
  [480, 70],
  [600, 130],
  [720, 180],
  [770, 190],
])

/** Where the ribbon turns edge-on at rest: beside the right end of the CTA, as in the design. */
export const PINCH: Point = [480, ribbonAxis(480)]

/** Distance along the ribbon for half a turn: puts the other edge-on fold at the bottom-left, as in the design. */
const HALF_TURN_PX = 450

/** Turns per second at WAVE_SPEED 1. */
const SPIN = 0.28

/** One knob for how fast the ribbon spins: lower is calmer. */
export const WAVE_SPEED = 0.18

export interface Touch {
  x: number
  y: number
  /** 1 right after a touch, decaying to 0. */
  strength: number
}

/**
 * y of ribbon line `t` (0 = one edge, 1 = the other) at `x`, `seconds` into the animation.
 * The ribbon is a flat sheet twisted along its length, spinning around its axis like a DNA strand:
 * where it turns edge-on every line meets in one bright fold, and the folds travel as it spins.
 */
export function ribbonY(x: number, t: number, seconds: number, touch?: Touch): number {
  const spin = seconds * WAVE_SPEED * SPIN * 2 * Math.PI
  const twist = (Math.PI * (x - PINCH[0])) / HALF_TURN_PX + Math.PI / 2 - spin
  let y = ribbonAxis(x) + (2 * t - 1) * ribbonHalfWidth(x) * Math.cos(twist)
  if (touch && touch.strength > 0.01) y += pushAway(x, y, touch)
  return y
}

/**
 * Dotted surface behind the logo, as in the design: a grid of dots on a rippling 3D sheet seen in
 * perspective. Back rows sit higher with smaller, denser dots; front rows lower with bigger, sparser ones.
 * Ripples travel right across the sheet, so every row bends differently while it stays one surface.
 */
export const MESH_ROWS = 40
export const MESH_COLS = 120

/** Overall speed of the dotted surface: lower is calmer. */
export const MESH_SPEED = 1

const SCREEN_W = 720
const FOCAL = 600
const CAMERA_HEIGHT = 0.9
const HORIZON_Y = 210 // with the depths below, puts the back row near y 300 and the front row near y 480
const FAR_Z = 6
const NEAR_Z = 2
const TILT = 0.04 // the band rises gently to the right, as in the design

export interface MeshPoint {
  x: number
  y: number
  /** 0 = back row, 1 = front row. */
  near: number
}

/** Height of the sheet at world position (wx, z): two ripples travelling right plus a slow swell. */
function sheetHeight(wx: number, z: number, t: number): number {
  return (
    0.09 * Math.sin(1.4 * wx - 0.9 * t + 0.8 * z) +
    0.05 * Math.sin(2.1 * wx - 0.5 * t - 1.3 * z) +
    0.035 * Math.cos(1.7 * z - 0.7 * t)
  )
}

/** Dot `col` of row `row` (0 = back), `seconds` into the animation, projected onto the screen. */
export function meshPoint(col: number, row: number, seconds: number, touch?: Touch): MeshPoint {
  const near = row / (MESH_ROWS - 1)
  const z = FAR_Z + (NEAR_Z - FAR_Z) * near
  const scale = FOCAL / z
  // Each row spans the full screen width, so back rows pack their dots closer together
  const halfSpan = (SCREEN_W / 2 + 20) / scale
  const wx = ((2 * col) / (MESH_COLS - 1) - 1) * halfSpan
  const x = SCREEN_W / 2 + wx * scale
  let y = HORIZON_Y + (CAMERA_HEIGHT - sheetHeight(wx, z, seconds * MESH_SPEED)) * scale - (x - SCREEN_W / 2) * TILT
  if (touch && touch.strength > 0.01) y += pushAway(x, y, touch) * 0.6
  return { x, y, near }
}

/** Lift lines near a finger, like picking up silk: one direction, so the ribbon bends instead of tearing. */
function pushAway(x: number, y: number, { x: px, y: py, strength }: Touch): number {
  const dx = x - px
  const dy = y - py
  const falloff = Math.exp(-(dx * dx) / (2 * 110 * 110) - (dy * dy) / (2 * 220 * 220))
  return -60 * strength * falloff
}
