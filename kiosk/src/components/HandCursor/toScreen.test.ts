import { describe, expect, it } from 'vitest'
import { toScreen } from './toScreen'

describe('toScreen', () => {
  const at = (x: number, y: number) => toScreen({ x, y }, 16 / 9, 1080, 1920)
  it('puts the middle of the picture in the middle of the screen', () => {
    expect(at(0.5, 0.5)).toEqual({ x: 540, y: 960 })
  })
  it('is mirrored: a hand on the camera-left half of the picture is on the screen-right half', () => {
    expect(at(0.45, 0.5).x).toBeGreaterThan(540)
  })
  it('reaches every edge before the picture does, and stays on the screen', () => {
    expect(at(0.5, 0.05).y).toBe(0)
    expect(at(0.5, 0.95).y).toBe(1920)
    expect(at(0, 0.5).x).toBeGreaterThanOrEqual(0)
    expect(at(1, 0.5).x).toBeLessThanOrEqual(1080)
  })
})
