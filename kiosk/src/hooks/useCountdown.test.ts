import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCountdown } from './useCountdown'

describe('useCountdown', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('counts 5 → 0 one second at a time, and calls onDone once as it reaches 0', () => {
    const onDone = vi.fn()
    const { result } = renderHook(() => useCountdown(5, onDone))
    expect(result.current.count).toBeNull()

    act(() => result.current.start())
    expect(result.current.count).toBe(5)

    for (const expected of [4, 3, 2, 1]) {
      act(() => vi.advanceTimersByTime(1000))
      expect(result.current.count).toBe(expected)
      expect(onDone).not.toHaveBeenCalled()
    }
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.count).toBe(0)
    expect(onDone).toHaveBeenCalledOnce() // no wait after "1"
    act(() => vi.advanceTimersByTime(5000))
    expect(onDone).toHaveBeenCalledOnce()
  })
})
