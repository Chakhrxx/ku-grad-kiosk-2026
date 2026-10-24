import { describe, expect, it } from 'vitest'
import { personOpacity, updatePersonAlpha } from './personMask'

const settle = (score: number, frames = 6) => {
  const alpha = new Float32Array(1)
  for (let i = 0; i < frames; i++) updatePersonAlpha(new Float32Array([1 - score]), alpha)
  return alpha[0]
}

describe('updatePersonAlpha', () => {
  it('makes a fairly confident person fully solid, not see-through', () => {
    expect(settle(0.7)).toBeGreaterThan(0.98) // a dark gown the model is only 70% sure of
  })

  it('drops clear background to nothing', () => {
    expect(settle(0.15)).toBeLessThan(0.01)
  })

  it('rides out a one-frame dropout instead of flickering away', () => {
    const alpha = new Float32Array([1])
    updatePersonAlpha(new Float32Array([1]), alpha) // this frame says "background"
    expect(alpha[0]).toBeGreaterThan(0.4)
  })
})

describe('personOpacity', () => {
  it('gives a still photo the same solid person and clear background in one go', () => {
    expect(personOpacity(1 - 0.7)).toBe(1)
    expect(personOpacity(1 - 0.15)).toBe(0)
  })
})
