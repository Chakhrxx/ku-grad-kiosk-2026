import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { KioskContext, type KioskValue } from '@/context/KioskContext'
import { I18nProvider } from '@/context/I18nProvider'
import { GeneratingScreen } from './GeneratingScreen'

function renderWith(preview?: string) {
  render(
    <I18nProvider>
      <KioskContext value={{ preview } as unknown as KioskValue}>
        <GeneratingScreen />
      </KioskContext>
    </I18nProvider>,
  )
}

describe('GeneratingScreen', () => {
  it('shows the waiting line, and no picture, until the dressed preview is ready', () => {
    renderWith()
    expect(screen.getByText('กำลังสร้างรูป…')).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
  })

  it('changes its line once the visitor is dressed and the scene goes on', () => {
    renderWith('blob:dressed')
    expect(screen.getByText('กำลังเตรียมภาพของคุณ…')).toBeInTheDocument()
  })

  it('walks through its lines once and stays on the last, without looping', () => {
    vi.useFakeTimers()
    renderWith()
    act(() => void vi.advanceTimersByTime(6000 * 10))
    expect(screen.getByText('กำลังเก็บรายละเอียดให้คมชัด…')).toBeInTheDocument()
    vi.useRealTimers()
  })
})
