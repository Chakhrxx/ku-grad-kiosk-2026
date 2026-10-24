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

/**
 * A one-second clip of the visitor dressed in the chosen outfit by the server's try-on model (an MP4 back), and,
 * when the server keeps debug steps (SAVE_STEPS), the folder they went to.
 */
export async function dressPhoto(
  clip: Blob,
  fields: { session: string; level: string; item: string; solution: string }, // solution: for the debug folders
) {
  const body = new FormData()
  body.append('photo', clip, 'shot.mp4')
  for (const [key, value] of Object.entries(fields)) body.append(key, value)
  let res: Response
  try {
    res = await fetch('/api/dress', { method: 'POST', body })
  } catch {
    throw new ApiError('network')
  }
  if (!res.ok) throw new ApiError('ai')
  return { photo: await res.blob(), steps: res.headers.get('X-Steps') }
}

/** The dressed visitor cut out of `photo` by the server's matting model: a PNG whose alpha is the visitor. */
export async function matteOf(photo: Blob, session: string): Promise<Blob> {
  const body = new FormData()
  body.append('photo', photo, 'dressed.jpg')
  body.append('session', session)
  const res = await fetch('/api/matte', { method: 'POST', body })
  if (!res.ok) throw new ApiError('ai')
  return res.blob()
}

/** The try-on model's dressed frame made sharper (and ×4) by the server's upscaler, as JPEG. */
export async function upscaleOf(frame: Blob, session: string): Promise<Blob> {
  const body = new FormData()
  body.append('photo', frame, 'frame.jpg')
  body.append('session', session)
  const res = await fetch('/api/upscale', { method: 'POST', body })
  if (!res.ok) throw new ApiError('ai')
  return res.blob()
}

/** Debug: the finished photos (result1.jpg, result2.jpg) into that dressing's steps folder. Never fails the photo. */
export function saveSteps(folder: string, photos: Blob[]) {
  photos.forEach((photo, i) => {
    const body = new FormData()
    body.append('name', `result${i + 1}.jpg`)
    body.append('photo', photo, `result${i + 1}.jpg`)
    void fetch(`/api/steps/${folder}`, { method: 'POST', body }).catch(() => {}) // "preview-bg/03", as the server named it
  })
}

/** The finished photo (visitor in the gown, on the campus background); the server adds the frame and QR. */
export function generatePhoto(photo: Blob, fields: GenerateRequest) {
  const body = new FormData()
  body.append('photo', photo, 'photo.jpg')
  for (const [key, value] of Object.entries(fields)) body.append(key, value)
  return request<PhotoResult>('/api/generate', { method: 'POST', body })
}
