import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SHOWN_MS, showMouseWhileMoving } from './mouseCursor'

const move = (pointerType: string) => window.dispatchEvent(Object.assign(new Event('pointermove'), { pointerType }))

describe('showMouseWhileMoving', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows the mouse while it moves and hides it once it stops', () => {
    const stop = showMouseWhileMoving()
    const shown = () => document.documentElement.hasAttribute('data-mouse')
    expect(shown()).toBe(false)
    move('mouse')
    expect(shown()).toBe(true)
    vi.advanceTimersByTime(SHOWN_MS - 1)
    move('mouse') // still moving: the clock starts again
    vi.advanceTimersByTime(SHOWN_MS - 1)
    expect(shown()).toBe(true)
    vi.advanceTimersByTime(1)
    expect(shown()).toBe(false)
    move('touch') // a finger, or the hand cursor
    expect(shown()).toBe(false)
    stop()
  })
})
