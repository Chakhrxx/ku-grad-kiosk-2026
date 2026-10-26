import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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
  it('shows only the spinner until the dressed preview is ready', () => {
    renderWith()
    expect(screen.getByText('กำลังสร้างรูป…')).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
  })

  it('shows the visitor already dressed while the scene goes on', () => {
    renderWith('blob:dressed')
    expect(document.querySelector('img')).toHaveAttribute('src', 'blob:dressed')
    expect(screen.getByText('กำลังใส่ฉากหลัง…')).toBeInTheDocument()
  })
})
