import { describe, expect, it, vi } from 'vitest'

vi.mock('@decartai/sdk', () => ({
  models: { realtime: () => ({ width: 1280, height: 720, fps: 30 }) },
  createDecartClient: vi.fn(),
}))

const { tryOnPrompt } = await import('./useTryOnStream')

describe('tryOnPrompt', () => {
  it('asks for a graduation gown and cap for the degree levels', () => {
    for (const level of ['bachelor', 'master', 'doctoral']) {
      expect(tryOnPrompt(level)).toMatch(/graduation gown/)
      expect(tryOnPrompt(level)).toMatch(/cap/)
    }
  })

  it('copies the reference as-is for uniforms and Mo Hom, never a gown', () => {
    expect(tryOnPrompt('others')).not.toMatch(/gown/)
    expect(tryOnPrompt('others')).toMatch(/exactly the outfit in the reference/)
  })
})
