import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useIdleTimer } from './useIdleTimer'

describe('useIdleTimer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('fires after the timeout with no touch', () => {
    const onIdle = vi.fn()
    renderHook(() => useIdleTimer(true, 60_000, onIdle))
    vi.advanceTimersByTime(59_999)
    expect(onIdle).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onIdle).toHaveBeenCalledOnce()
  })

  it('restarts on every touch', () => {
    const onIdle = vi.fn()
    renderHook(() => useIdleTimer(true, 60_000, onIdle))
    vi.advanceTimersByTime(50_000)
    dispatchEvent(new Event('pointerdown'))
    vi.advanceTimersByTime(50_000)
    expect(onIdle).not.toHaveBeenCalled()
  })

  it('does nothing while inactive', () => {
    const onIdle = vi.fn()
    renderHook(() => useIdleTimer(false, 60_000, onIdle))
    vi.advanceTimersByTime(120_000)
    expect(onIdle).not.toHaveBeenCalled()
  })
})
