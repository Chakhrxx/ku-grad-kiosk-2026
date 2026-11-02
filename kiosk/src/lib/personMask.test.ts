import { describe, expect, it } from 'vitest'
import { personOpacity } from './personMask'

describe('personOpacity', () => {
  it('gives a still photo the same solid person and clear background in one go', () => {
    expect(personOpacity(1 - 0.7)).toBe(1)
    expect(personOpacity(1 - 0.15)).toBe(0)
  })
})
