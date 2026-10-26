import { createDecartClient, models, type RealTimeClient } from '@decartai/sdk'
import { useEffect, useEffectEvent, useMemo, useRef } from 'react'
import { getRealtimeToken, gownUrl } from '@/api/client'

export const TRYON_MODEL = models.realtime('lucy-vton-latest')

/** Camera constraints the try-on model expects. */
export const TRYON_CAMERA: MediaTrackConstraints = {
  width: { ideal: TRYON_MODEL.width },
  height: { ideal: TRYON_MODEL.height },
  frameRate: typeof TRYON_MODEL.fps === 'number' ? { ideal: TRYON_MODEL.fps } : TRYON_MODEL.fps,
}

// Decart's VTON guide: a "substitute" prompt plus a clean garment reference, with enhance off.
// Gowns get the gown wording; the "others" outfits (uniforms, Mo Hom) must follow their reference as-is.
const GOWN_PROMPT =
  'Substitute the current outfit with the full-length black academic graduation gown from the reference image: ' +
  'a loose pleated robe falling below the knees, wide bell sleeves to the wrists, closed at the front, ' +
  'with the exact collar, sash and tassel colours of the reference, and the black graduation cap with its tassel ' +
  'on the head. Keep the face, hair and pose unchanged.'
const OUTFIT_PROMPT =
  'Substitute the current outfit with exactly the outfit in the reference image, same cut, colours and details. ' +
  'Keep the face, hair and pose unchanged.'

export const tryOnPrompt = (level: string) => (level === 'others' ? OUTFIT_PROMPT : GOWN_PROMPT)

interface TryOn {
  /** The visitor's camera stream; null until it is open. */
  camera: MediaStream | null
  session: string
  level: string
  item: string
  onError: () => void
  /** false: no stream and nothing fetched for it, for the image-model mode. */
  enabled?: boolean
}

/** Log how long each step of opening the try-on stream takes (browser console). */
function stopwatch() {
  const t0 = performance.now()
  return (step: string) => console.info(`[try-on] ${step} at ${((performance.now() - t0) / 1000).toFixed(1)}s`)
}

/**
 * Stream the camera through Decart's realtime try-on and play the dressed result into the returned video ref.
 * Connected only while the hook is mounted with a camera, since the stream is billed per second.
 * The gown reference and the first token are fetched as soon as the screen opens, alongside the camera, not after it.
 */
export function useTryOnStream({ camera, session, level, item, onError, enabled = true }: TryOn) {
  const outputRef = useRef<HTMLVideoElement>(null)
  const handleError = useEffectEvent(onError)
  const gown = useMemo(
    () =>
      enabled
        ? fetch(gownUrl(level, item), { cache: 'no-store' }).then((res) => {
            if (!res.ok) throw new Error(`gown reference ${res.status}`)
            return res.blob()
          })
        : undefined,
    [enabled, level, item],
  )
  // ponytail: the token lives 60s and the camera opens in a second or two; later calls (reconnects) mint a fresh one
  const token = useMemo(() => (enabled ? getRealtimeToken(session) : undefined), [enabled, session])
  // a failed prefetch is reported when the stream needs it, not as an unhandled rejection now
  useEffect(() => void gown?.catch(() => {}), [gown])
  useEffect(() => void token?.catch(() => {}), [token])

  useEffect(() => {
    if (!camera || !gown) return
    let rt: RealTimeClient | undefined
    let closed = false
    const lap = stopwatch()
    let prefetched: Promise<string> | undefined = token
    const client = createDecartClient({
      apiKeyProvider: async () => {
        const key = await (prefetched ?? getRealtimeToken(session))
        prefetched = undefined
        lap('token ready')
        return key
      },
    })

    ;(async () => {
      try {
        const image = await gown
        lap('gown reference ready')
        rt = await client.realtime.connect(camera, {
          model: TRYON_MODEL,
          mirror: false, // the screen mirrors the preview itself; the photo stays unmirrored
          initialState: { prompt: { text: tryOnPrompt(level), enhance: false }, image },
          onQueuePosition: (q) => lap(`waiting in Decart's queue: ${JSON.stringify(q)}`),
          onRemoteStream: (dressed) => {
            lap('dressed stream arrived')
            if (outputRef.current) outputRef.current.srcObject = dressed
          },
        })
        lap('connected')
        if (closed) rt.disconnect()
      } catch (e) {
        console.error('try-on stream failed', e)
        if (!closed) handleError()
      }
    })()

    return () => {
      closed = true
      rt?.disconnect() // stop billing as soon as the camera screen closes
    }
  }, [camera, session, level, gown, token])

  return outputRef
}
