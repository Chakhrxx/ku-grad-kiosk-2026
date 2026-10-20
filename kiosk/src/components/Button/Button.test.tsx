import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('calls onClick when tapped', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>NEXT</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'NEXT' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not fire while disabled', async () => {
    const onClick = vi.fn()
    render(<Button disabled onClick={onClick}>NEXT</Button>)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is a plain button, not a form submit', () => {
    render(<Button>NEXT</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})
