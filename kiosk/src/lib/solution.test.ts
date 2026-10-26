import { describe, expect, it } from 'vitest'
import { getSolution, setSolution } from './solution'

describe('solution', () => {
  it('falls back to the menu when the remembered pick is no longer offered', () => {
    localStorage.setItem('ku-kiosk-solution', 'gen') // picked before the image model left the menu
    expect(getSolution()).toBe('vton-batch')
    setSolution('vton-live')
    expect(localStorage.getItem('ku-kiosk-solution')).toBe('vton-live')
  })
})
