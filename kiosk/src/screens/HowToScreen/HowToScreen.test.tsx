import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DECLINED_TIMEOUT_MS, STEP_REVEAL_STAGGER_MS } from '@/config'
import { I18nProvider } from '@/context/I18nProvider'
import { KioskContext, type KioskValue } from '@/context/KioskContext'
import { HowToScreen } from './HowToScreen'

function renderHowTo(consentDeclined: boolean) {
  const reset = vi.fn()
  const value = { step: 'howto', consentDeclined, reset, goTo: vi.fn() } as unknown as KioskValue
  render(
    <I18nProvider>
      <KioskContext value={value}>
        <HowToScreen />
      </KioskContext>
    </I18nProvider>,
  )
  return reset
}

describe('HowToScreen', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows Next only once every step is in', () => {
    renderHowTo(false)
    expect(screen.queryByRole('button', { name: 'ถัดไป' })).toBeNull()
    act(() => vi.advanceTimersByTime(7 * STEP_REVEAL_STAGGER_MS + 2000))
    expect(screen.getByRole('button', { name: 'ถัดไป' })).toBeInTheDocument()
  })

  it('after "Don\'t allow", goes home only when left untouched', () => {
    const reset = renderHowTo(true)
    act(() => vi.advanceTimersByTime(DECLINED_TIMEOUT_MS - 1000))
    expect(reset).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1000))
    expect(reset).toHaveBeenCalled()
  })
})
