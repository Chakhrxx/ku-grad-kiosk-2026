import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { KioskContext, type KioskValue } from '@/context/KioskContext'
import { I18nProvider } from '@/context/I18nProvider'
import { PreviewScreen } from './PreviewScreen'

const backgrounds = ['eucalyptus-tunnel', 'chomphu-road', 'rice-field', 'ku'].map((id) => ({ id, th: id, en: id }))

function renderPreview() {
  const selectBackground = vi.fn()
  const goTo = vi.fn()
  const value = {
    catalog: { levels: [], faculties: [], others: [], backgrounds },
    background: '',
    selectBackground,
    goTo,
    reset: vi.fn(),
  } as unknown as KioskValue
  render(
    <I18nProvider>
      <KioskContext value={value}>
        <PreviewScreen />
      </KioskContext>
    </I18nProvider>,
  )
  return selectBackground
}

describe('PreviewScreen carousel', () => {
  it('the first backdrop is picked by default, so Next works straight away', () => {
    const select = renderPreview()
    fireEvent.click(screen.getByRole('button', { name: 'ถัดไป' }))
    expect(select).toHaveBeenLastCalledWith('eucalyptus-tunnel')
  })

  it('a swipe left brings the next backdrop to the centre, ignoring the click that ends it', () => {
    const select = renderPreview()
    const centre = screen.getAllByRole('button', { name: 'eucalyptus-tunnel' }).at(-1)! // the card, after its pill
    fireEvent.pointerDown(centre, { clientX: 500 })
    fireEvent.pointerUp(centre, { clientX: 300 })
    fireEvent.click(centre)
    expect(select.mock.calls).toEqual([['chomphu-road']])
  })

  it('a swipe right from the first wraps to the last', () => {
    const select = renderPreview()
    const centre = screen.getAllByRole('button', { name: 'eucalyptus-tunnel' }).at(-1)!
    fireEvent.pointerDown(centre, { clientX: 300 })
    fireEvent.pointerUp(centre, { clientX: 500 })
    expect(select).toHaveBeenLastCalledWith('ku')
  })
})
