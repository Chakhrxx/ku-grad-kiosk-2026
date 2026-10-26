import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, getCatalog } from './client'

const respond = (status: number, body: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }))

describe('api client', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns the JSON body on success', async () => {
    respond(200, { levels: [] })
    await expect(getCatalog()).resolves.toEqual({ levels: [] })
  })

  it('maps a failed fetch to a network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(getCatalog()).rejects.toEqual(new ApiError('network'))
  })

  it('maps no_person from the backend', async () => {
    respond(422, { detail: 'no_person' })
    await expect(getCatalog()).rejects.toMatchObject({ code: 'no_person' })
  })

  it('maps any other failure to ai', async () => {
    respond(502, { detail: 'ai_failed' })
    await expect(getCatalog()).rejects.toMatchObject({ code: 'ai' })
  })
})
