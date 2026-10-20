import { describe, expect, it } from 'vitest'
import { MESH_COLS, MESH_ROWS, meshPoint, PINCH, ribbonY, smoothCurve, WAVE_SPEED } from './waves'

describe('smoothCurve', () => {
  const curve = smoothCurve([
    [0, 0],
    [10, 10],
    [20, 0],
  ])

  it('passes through every point', () => {
    expect(curve(0)).toBe(0)
    expect(curve(10)).toBeCloseTo(10)
    expect(curve(20)).toBe(0)
  })

  it('clamps outside the ends', () => {
    expect(curve(-5)).toBe(0)
    expect(curve(99)).toBe(0)
  })
})

describe('ribbon', () => {
  const height = (x: number, seconds = 0) => Math.abs(ribbonY(x, 1, seconds) - ribbonY(x, 0, seconds))
  const turn = 1 / (WAVE_SPEED * 0.28) // seconds per full turn

  it('at rest, folds edge-on beside the CTA and opens wide at the crests, like the Figma frame', () => {
    expect(height(PINCH[0])).toBeLessThan(1)
    expect(height(170)).toBeGreaterThan(120)
    expect(height(720)).toBeGreaterThan(300)
  })

  it('spins like a DNA strand: the fold travels along the ribbon and the edges swap sides', () => {
    expect(height(PINCH[0], turn / 4)).toBeGreaterThan(100) // a quarter turn later it faces the viewer
    const edgeOrder = (x: number) => Math.sign(ribbonY(x, 1, 0) - ribbonY(x, 0, 0))
    expect(edgeOrder(PINCH[0] - 100)).toBe(-edgeOrder(PINCH[0] + 100)) // twisted through the fold
  })

  it('lifts every line near a touch the same way, so the ribbon bends instead of tearing', () => {
    const touch = { x: 170, y: ribbonY(170, 0.5, 0), strength: 1 }
    expect(ribbonY(170, 0, 0, touch)).toBeLessThan(ribbonY(170, 0, 0))
    expect(ribbonY(170, 1, 0, touch)).toBeLessThan(ribbonY(170, 1, 0))
    expect(ribbonY(700, 0.5, 0, touch)).toBeCloseTo(ribbonY(700, 0.5, 0), 0) // far away: untouched
  })
})

describe('dotted surface', () => {
  const rowYs = (row: number, seconds: number) =>
    Array.from({ length: MESH_COLS }, (_, col) => meshPoint(col, row, seconds).y)
  const front = MESH_ROWS - 1

  it('recedes in perspective: back rows higher and denser than front rows', () => {
    const at = (row: number, col: number) => meshPoint(col, row, 0)
    expect(at(0, 60).y).toBeLessThan(at(front, 60).y)
    expect(at(0, 60).y).toBeGreaterThan(260)
    expect(at(front, 60).y).toBeLessThan(540)
    const gap = (row: number) => at(row, 61).x - at(row, 60).x
    expect(gap(0)).toBeCloseTo(gap(front)) // every row spans the screen with the same dot count…
    expect(at(0, 0).x).toBeLessThan(0) // …and reaches past both edges
    expect(at(0, MESH_COLS - 1).x).toBeGreaterThan(720)
  })

  it('ripples travel to the right', () => {
    const before = rowYs(front, 0)
    const after = rowYs(front, 0.6)
    const mismatch = (lag: number) => {
      let sum = 0
      for (let i = 10; i < MESH_COLS - 10; i++) sum += (after[i + lag] - before[i]) ** 2
      return sum
    }
    const lags = Array.from({ length: 13 }, (_, i) => i - 6)
    const best = lags.reduce((a, b) => (mismatch(b) < mismatch(a) ? b : a))
    expect(best).toBeGreaterThan(0)
  })

  it('bends each row differently, so it reads as a surface rather than parallel copies', () => {
    const shape = (row: number) => {
      const ys = rowYs(row, 0)
      const mean = ys.reduce((a, b) => a + b) / ys.length
      return ys.map((y) => y - mean)
    }
    const diff = shape(8).reduce((sum, y, i) => sum + Math.abs(y - shape(30)[i]), 0) / MESH_COLS
    expect(diff).toBeGreaterThan(2)
  })
})
