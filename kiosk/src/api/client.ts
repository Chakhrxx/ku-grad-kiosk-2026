import type { Catalog, ErrorCode, GenerateRequest, PhotoResult } from '@/types'

export class ApiError extends Error {
  code: ErrorCode

  constructor(code: ErrorCode) {
    super(code)
    this.code = code
  }
}

export const errorCodeOf = (e: unknown): ErrorCode => (e instanceof ApiError ? e.code : 'ai')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, init)
  } catch {
    throw new ApiError('network')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body.detail === 'no_person' ? 'no_person' : 'ai')
  }
  return res.json()
}

export function getCatalog() {
  return request<Catalog>('/api/catalog')
}

export function giveConsent(session: string, lang: string) {
  return request('/api/consent', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ session, lang }),
  })
}

/** Short-lived Decart client token for the try-on stream (the real key never reaches the browser). */
export async function getRealtimeToken(session: string): Promise<string> {
  const { apiKey } = await request<{ apiKey: string }>('/api/realtime-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ session }),
  })
  return apiKey
}

export const gownUrl = (level: string, item: string) => `/api/gown/${level}/${item}`

/** The visitor's camera photo dressed in the chosen outfit by the server's image model (about 15 s). */
export async function dressPhoto(photo: Blob, fields: { session: string; level: string; item: string }) {
  const body = new FormData()
  body.append('photo', photo, 'photo.jpg')
  for (const [key, value] of Object.entries(fields)) body.append(key, value)
  let res: Response
  try {
    res = await fetch('/api/dress', { method: 'POST', body })
  } catch {
    throw new ApiError('network')
  }
  if (!res.ok) throw new ApiError('ai')
  return res.blob()
}

/** The finished photo (visitor in the gown, on the campus background); the server adds the frame and QR. */
export function generatePhoto(photo: Blob, fields: GenerateRequest) {
  const body = new FormData()
  body.append('photo', photo, 'photo.jpg')
  for (const [key, value] of Object.entries(fields)) body.append(key, value)
  return request<PhotoResult>('/api/generate', { method: 'POST', body })
}
