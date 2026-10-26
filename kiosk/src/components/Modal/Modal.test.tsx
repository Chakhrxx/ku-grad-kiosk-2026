import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('is a dialog named by its title', () => {
    render(<Modal title="PDPA Consent" onClose={() => {}}>body</Modal>)
    expect(screen.getByRole('dialog', { name: 'PDPA Consent' })).toHaveAttribute('aria-modal', 'true')
  })

  it('closes from the × button', async () => {
    const onClose = vi.fn()
    render(<Modal title="PDPA" onClose={onClose} closeLabel="ปิด">body</Modal>)
    await userEvent.click(screen.getByRole('button', { name: 'ปิด' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders the footer', () => {
    render(<Modal title="PDPA" onClose={() => {}} footer={<button>NEXT</button>}>body</Modal>)
    expect(screen.getByRole('button', { name: 'NEXT' })).toBeInTheDocument()
  })
})
