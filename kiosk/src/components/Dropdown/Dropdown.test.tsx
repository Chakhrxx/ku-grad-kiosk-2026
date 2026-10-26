import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Dropdown } from './Dropdown'

const options = [
  { id: 'stream', label: 'Live stream', hint: 'Live try-on' },
  { id: 'gen', label: 'Image gen', hint: 'Image model' },
] as const

const setup = () => {
  const onChange = vi.fn()
  render(<Dropdown caption="Solution" options={[...options]} value="stream" onChange={onChange} />)
  return { onChange, key: screen.getByRole('button', { name: /Solution/ }) }
}

describe('Dropdown', () => {
  it('shows the picked option, opens on tap, and closes after a pick', () => {
    const { onChange, key } = setup()
    expect(key).toHaveTextContent('Live stream')
    expect(screen.queryByRole('menu')).toBeNull()

    fireEvent.click(key)
    expect(key).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menuitemradio', { name: /Live stream/ })).toHaveAttribute('aria-checked', 'true')

    fireEvent.click(screen.getByRole('menuitemradio', { name: /Image gen/ }))
    expect(onChange).toHaveBeenCalledWith('gen')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('closes on Escape and on a tap outside without picking', () => {
    const { onChange, key } = setup()
    fireEvent.click(key)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()

    fireEvent.click(key)
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('menu')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })
})
