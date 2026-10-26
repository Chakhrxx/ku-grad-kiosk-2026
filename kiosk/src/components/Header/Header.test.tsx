import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Header } from './Header'

describe('Header', () => {
  it('shows no navigation without handlers', () => {
    render(<Header title="How to Join" />)
    expect(screen.getByRole('heading', { name: 'How to Join' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('wires back and home', async () => {
    const onBack = vi.fn()
    const onHome = vi.fn()
    render(<Header title="Choose" onBack={onBack} onHome={onHome} backLabel="ย้อนกลับ" homeLabel="หน้าแรก" />)
    await userEvent.click(screen.getByRole('button', { name: 'ย้อนกลับ' }))
    await userEvent.click(screen.getByRole('button', { name: 'หน้าแรก' }))
    expect(onBack).toHaveBeenCalledOnce()
    expect(onHome).toHaveBeenCalledOnce()
  })
})
