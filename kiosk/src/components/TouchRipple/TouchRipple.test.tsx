import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TouchRipple } from './TouchRipple'

describe('TouchRipple', () => {
  it('puts a ring where the screen is touched, and takes it away when it has spread', () => {
    render(<TouchRipple />)
    fireEvent.pointerDown(window, { clientX: 120, clientY: 340 })
    const ring = document.querySelector<HTMLElement>('.animate-touch-ripple')!
    expect(ring.style.left).toBe('120px')
    expect(ring.style.top).toBe('340px')
    fireEvent.animationEnd(ring)
    expect(document.querySelector('.animate-touch-ripple')).toBeNull()
  })
})
