import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HOME_ENGAGED_IDLE_MS } from '@/config'
import { I18nProvider } from '@/context/I18nProvider'
import { KioskContext, type KioskValue } from '@/context/KioskContext'
import { HomeScreen } from './HomeScreen'

const renderHome = () =>
  render(
    <I18nProvider>
      <KioskContext value={{ start: vi.fn() } as unknown as KioskValue}>
        <HomeScreen />
      </KioskContext>
    </I18nProvider>,
  )

describe('HomeScreen', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('invites a tap with no buttons in the way, then brings in the language keys and Start', () => {
    renderHome()
    expect(screen.getByText('แตะที่หน้าจอเพื่อเริ่ม')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'เริ่มกันเลย' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'ENGLISH' })).toBeNull()

    act(() => void fireEvent.pointerDown(window))
    expect(screen.getByRole('button', { name: 'เริ่มกันเลย' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ENGLISH' })).toBeInTheDocument()
    expect(screen.queryByText('แตะที่หน้าจอเพื่อเริ่ม')).toBeNull()
  })

  it('takes Start away again when left alone', () => {
    renderHome()
    act(() => void fireEvent.pointerDown(window))
    act(() => vi.advanceTimersByTime(HOME_ENGAGED_IDLE_MS))
    expect(screen.queryByRole('button', { name: 'เริ่มกันเลย' })).toBeNull()
  })
})
