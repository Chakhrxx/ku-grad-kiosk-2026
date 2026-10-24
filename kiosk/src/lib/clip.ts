/**
 * Decart's try-on model (Lucy VTON) takes video only, so the vton-batch solution sends it the shot as a short,
 * still MP4 clip and reads one frame back out of the dressed clip it returns.
 */

/** How long the still clip runs: enough frames for the model, small enough to upload in a moment. */
const CLIP_MS = 1000
const CLIP_FPS = 30
/** MP4 (H.264) as Decart asks for; Chrome records it since version 126. */
const MP4_TYPES = ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4']

/** `still` as a CLIP_MS MP4 clip at its own size (keep it 9:16, one of the model's shapes). */
export function clipOf(still: HTMLCanvasElement): Promise<Blob> {
  const canvas = Object.assign(document.createElement('canvas'), { width: still.width, height: still.height })
  const ctx = canvas.getContext('2d')!
  return record(canvas, () => ctx.drawImage(still, 0, 0)) // repainted, so the stream keeps producing frames of it
}

/** CLIP_MS of a canvas something else keeps drawing on (vton-live: the scene in the viewfinder), as MP4. */
export const recordCanvas = (canvas: HTMLCanvasElement) => record(canvas)

async function record(canvas: HTMLCanvasElement, paint?: () => void): Promise<Blob> {
  const type = MP4_TYPES.find((t) => MediaRecorder.isTypeSupported(t))
  if (!type) throw new Error('this browser cannot record MP4')
  const stream = canvas.captureStream(CLIP_FPS)
  // a high bitrate: the encoder starts soft and the model should get the still as sharp as it was
  const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 25_000_000 })
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => chunks.push(e.data)
  const stopped = new Promise((resolve) => (recorder.onstop = resolve))
  recorder.start()
  const until = performance.now() + CLIP_MS
  while (performance.now() < until) {
    paint?.()
    await new Promise((r) => requestAnimationFrame(r))
  }
  recorder.stop()
  await stopped
  stream.getTracks().forEach((t) => t.stop())
  return new Blob(chunks, { type: 'video/mp4' })
}

/** The middle frame of a video, as a bitmap at the video's size. */
export async function frameOf(video: Blob): Promise<ImageBitmap> {
  const el = Object.assign(document.createElement('video'), { muted: true, playsInline: true, preload: 'auto' })
  el.src = URL.createObjectURL(video)
  try {
    await new Promise((resolve, reject) => {
      el.onloadeddata = resolve
      el.onerror = () => reject(new Error('dressed video unreadable'))
    })
    const middle = Number.isFinite(el.duration) ? el.duration / 2 : 0
    if (middle > 0) {
      // a video that breaks mid-way fires error, not seeked: without this the generating screen would wait forever
      await new Promise((resolve, reject) => {
        el.onseeked = resolve
        el.onerror = () => reject(new Error('dressed video unreadable'))
        el.currentTime = middle
      })
    }
    return await createImageBitmap(el)
  } finally {
    URL.revokeObjectURL(el.src)
  }
}
