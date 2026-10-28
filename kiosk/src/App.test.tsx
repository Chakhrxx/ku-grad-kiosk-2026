import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/api/client'
import App from './App'

vi.mock('@/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/client')>()),
  getCatalog: vi.fn(),
  giveConsent: vi.fn(),
  generatePhoto: vi.fn(),
}))

const catalog = {
  levels: [
    { id: 'bachelor', th: 'ปริญญาตรี', en: "Bachelor's" },
    { id: 'master', th: 'ปริญญาโท', en: "Master's" },
  ],
  faculties: [{ id: 'engineering', th: 'คณะวิศวกรรมศาสตร์', en: 'Faculty of Engineering' }],
  others: [],
  backgrounds: [{ id: 'rice-field', th: 'ทุ่งข้าวสรรพสี', en: 'Colorful Rice Field' }],
}

async function startAndOpenConsent() {
  render(<App />)
  await userEvent.click(screen.getByText('แตะที่หน้าจอเพื่อเริ่ม')) // the keys wait for a first touch
  await userEvent.click(await screen.findByRole('button', { name: 'ENGLISH' }))
  await userEvent.click(screen.getByRole('button', { name: "Let's start" }))
  await userEvent.click(await screen.findByRole('button', { name: 'Next' }))
  return screen.getByRole('dialog', { name: 'Consent to the Collection, Use and Disclosure of Personal Data' })
}

const prefersReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: reduce }) as unknown as typeof window.matchMedia
}

describe('kiosk flow', () => {
  beforeEach(() => {
    prefersReducedMotion(true) // How to Join shows every step at once, so the flow tests needn't wait
    vi.mocked(api.getCatalog).mockResolvedValue(catalog)
    vi.mocked(api.giveConsent).mockResolvedValue({ ok: true })
  })

  it('declining consent records nothing and stays on How to Join, where Next opens the consent again', async () => {
    await startAndOpenConsent()
    expect(screen.getAllByRole('button', { name: 'Next' }).at(-1)).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Decline' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(api.giveConsent).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('dialog', { name: 'Consent to the Collection, Use and Disclosure of Personal Data' })).toBeInTheDocument()
  })

  it('agreeing records consent for this session and opens degree & faculty', async () => {
    const dialog = await startAndOpenConsent()
    const next = screen.getAllByRole('button', { name: 'Next' }).at(-1)!
    expect(next).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))
    await userEvent.click(next)

    expect(await screen.findByRole('heading', { name: 'Which Faculty Represents Your Success' })).toBeInTheDocument()
    expect(dialog).not.toBeInTheDocument()
    expect(api.giveConsent).toHaveBeenCalledWith(expect.stringMatching(/^[0-9a-f-]{36}$/), 'en')
  })

  it('NEXT on degree & faculty unlocks only once both are picked', async () => {
    await startAndOpenConsent()
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))
    await userEvent.click(screen.getAllByRole('button', { name: 'Next' }).at(-1)!)

    const next = await screen.findByRole('button', { name: 'Next' })
    expect(next).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: "Bachelor's" }))
    expect(next).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Faculty of Engineering' }))
    expect(next).toBeEnabled()
  })

  it('How to Join shows Next only after every step has appeared', async () => {
    prefersReducedMotion(false)
    render(<App />)
    await userEvent.click(screen.getByText('แตะที่หน้าจอเพื่อเริ่ม')) // the keys wait for a first touch
    await userEvent.click(await screen.findByRole('button', { name: 'ENGLISH' }))
    await userEvent.click(screen.getByRole('button', { name: "Let's start" }))

    await waitFor(() => expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(7))
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
    expect(await screen.findByRole('button', { name: 'Next' }, { timeout: 8000 })).toBeEnabled()
  }, 12_000)

  it('picking a faculty before a degree selects the bachelor degree shown on the tiles', async () => {
    await startAndOpenConsent()
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))
    await userEvent.click(screen.getAllByRole('button', { name: 'Next' }).at(-1)!)

    await userEvent.click(await screen.findByRole('button', { name: 'Faculty of Engineering' }))
    expect(screen.getByRole('button', { name: "Bachelor's" })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('switching degree clears the faculty picked for the previous one', async () => {
    await startAndOpenConsent()
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))
    await userEvent.click(screen.getAllByRole('button', { name: 'Next' }).at(-1)!)

    await userEvent.click(await screen.findByRole('button', { name: "Bachelor's" }))
    const engineering = screen.getByRole('button', { name: 'Faculty of Engineering' })
    await userEvent.click(engineering)
    expect(engineering).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: "Master's" }))
    expect(screen.getByRole('button', { name: 'Faculty of Engineering' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('shows the network error when the catalog cannot load', async () => {
    vi.mocked(api.getCatalog).mockRejectedValue(new api.ApiError('network'))
    render(<App />)
    await userEvent.click(screen.getByText('แตะที่หน้าจอเพื่อเริ่ม')) // Start waits for a first touch
    await userEvent.click(await screen.findByRole('button', { name: 'เริ่มกันเลย' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('อินเทอร์เน็ตขัดข้อง')
  })
})
