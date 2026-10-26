import { describe, expect, it } from 'vitest'
import { cardPose, ringOffset } from './carousel'

describe('ringOffset', () => {
  it('places neighbours either side of the focused card, wrapping around the ends', () => {
    expect([0, 1, 2, 3].map((i) => ringOffset(i, 0, 4))).toEqual([0, 1, 2, -1])
    expect([0, 1, 2, 3].map((i) => ringOffset(i, 3, 4))).toEqual([1, 2, -1, 0])
  })
})

describe('cardPose', () => {
  it('centre card is flat and in front; neighbours turn in, shrink and sit behind', () => {
    expect(cardPose(0)).toMatchObject({ x: 0, rotateY: -0, scale: 1, opacity: 1 })
    const right = cardPose(1)
    expect(right.x).toBeGreaterThan(0)
    expect(right.rotateY).toBeLessThan(0)
    expect(right.scale).toBeLessThan(1)
    expect(right.z).toBeLessThan(cardPose(0).z)
  })

  it('changes continuously while dragging, with no jump halfway', () => {
    for (const k of ['x', 'z', 'rotateY', 'scale', 'opacity'] as const) {
      for (const o of [0.5, 1, 1.5]) {
        expect(Math.abs(cardPose(o + 0.01)[k] - cardPose(o - 0.01)[k])).toBeLessThan(5)
      }
    }
  })

  it('cards two slots away are hidden', () => {
    expect(cardPose(2).opacity).toBe(0)
  })
})
