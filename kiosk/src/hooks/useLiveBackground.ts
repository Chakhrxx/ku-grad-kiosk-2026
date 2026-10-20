import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { updatePersonAlpha } from '@/lib/personMask'

// Self-hosted (kiosk/public/mediapipe), so the kiosk never depends on a CDN being reachable.
// selfie_multiclass splits a person into hair, skin, clothes and accessories, so the graduation cap stays in.
const WASM = '/mediapipe'
const MODEL = '/mediapipe/selfie_multiclass_256x256.tflite'
const BACKGROUND_CLASS = 0
/** Portrait crop of the stream that gets segmented: the viewfinder's shape, wider than the 9:16 photo. */
const CROP_ASPECT = 554 / 680

let segmenter: Promise<ImageSegmenter> | undefined
/** One segmenter for the life of the page; loading it takes a moment, so it is reused across visitors. */
function loadSegmenter() {
  segmenter ??= FilesetResolver.forVisionTasks(WASM).then((files) =>
    ImageSegmenter.createFromOptions(files, {
      baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      outputConfidenceMasks: true,
      outputCategoryMask: false,
    }),
  )
  return segmenter
}

/** Centre crop of a w×h source to the aspect of W×H, full height or full width. */
function cover(w: number, h: number, W: number, H: number) {
  const scale = Math.max(W / w, H / h)
  const cw = W / scale
  const ch = H / scale
  return { sx: (w - cw) / 2, sy: (h - ch) / 2, sw: cw, sh: ch }
}

/**
 * Cut the visitor out of `source` live and draw them on the campus background into the returned canvas,
 * like a video call's virtual background. `capture()` renders one full-size, unmirrored photo of it.
 *
 * Each frame, the portrait middle of the (landscape) stream is copied to `frame` and segmented there, so the
 * model sees the visitor large rather than a small figure in a wide picture; `frame` and `mask` then always
 * belong to the same moment, for both the live view and the photo.
 */
export function useLiveBackground(source: RefObject<HTMLVideoElement | null>, backgroundSrc: string, enabled: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<HTMLCanvasElement | null>(null)
  const maskRef = useRef<HTMLCanvasElement | null>(null)
  const backgroundRef = useRef<HTMLImageElement | null>(null)
  const [ready, setReady] = useState(false)
  const readyNow = useRef(false)

  useEffect(() => {
    if (!enabled) return
    let raf = 0
    let closed = false
    const bg = new Image()
    bg.src = backgroundSrc
    backgroundRef.current = bg
    const frame = document.createElement('canvas')
    const mask = document.createElement('canvas')
    frameRef.current = frame
    maskRef.current = mask
    let alpha = new Float32Array(0)
    let lastTime = -1

    loadSegmenter()
      .then((seg) => {
        const tick = () => {
          if (closed) return
          raf = requestAnimationFrame(tick)
          const video = source.current
          const canvas = canvasRef.current
          if (!video || !canvas || video.readyState < 2 || video.currentTime === lastTime) return
          lastTime = video.currentTime

          // portrait middle of the stream, full height
          const h = video.videoHeight
          const w = Math.min(video.videoWidth, Math.round(h * CROP_ASPECT))
          if (frame.width !== w || frame.height !== h) Object.assign(frame, { width: w, height: h })
          frame.getContext('2d')!.drawImage(video, (video.videoWidth - w) / 2, 0, w, h, 0, 0, w, h)

          const result = seg.segmentForVideo(frame, performance.now())
          const confidence = result.confidenceMasks?.[BACKGROUND_CLASS]
          if (confidence) {
            const { width, height } = confidence
            if (alpha.length !== width * height) alpha = new Float32Array(width * height)
            updatePersonAlpha(confidence.getAsFloat32Array(), alpha)
            const pixels = new ImageData(width, height)
            for (let i = 0; i < alpha.length; i++) pixels.data[i * 4 + 3] = alpha[i] * 255
            if (mask.width !== width || mask.height !== height) Object.assign(mask, { width, height })
            mask.getContext('2d')!.putImageData(pixels, 0, 0)
          }
          result.close()

          draw(canvas.getContext('2d')!, canvas.width, canvas.height, frame, mask, bg, true)
          if (!readyNow.current) {
            readyNow.current = true
            setReady(true)
          }
        }
        tick()
      })
      .catch((e) => console.error('live background failed', e))

    return () => {
      closed = true
      cancelAnimationFrame(raf)
    }
  }, [enabled, backgroundSrc, source])

  /** The photo: 1080×1920, the background crisp and the visitor unmirrored. */
  const capture = (): Promise<Blob> => {
    const frame = frameRef.current
    const mask = maskRef.current
    const bg = backgroundRef.current
    if (!frame || !mask || !bg || !readyNow.current) return Promise.reject(new Error('live background not ready'))
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1920
    draw(canvas.getContext('2d')!, canvas.width, canvas.height, frame, mask, bg, false)
    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('capture failed'))), 'image/jpeg', 0.92),
    )
  }

  return { canvasRef, ready, readyNow, capture }
}

// ponytail: plain alpha blend; add colour matching to the scene if people look pasted-on
function draw(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  frame: HTMLCanvasElement,
  mask: HTMLCanvasElement,
  bg: HTMLImageElement,
  mirror: boolean,
) {
  // the visitor: the segmented frame, keeping only where the mask says "person" (frame and mask share geometry)
  const person = new OffscreenCanvas(W, H)
  const p = person.getContext('2d')!
  const v = cover(frame.width, frame.height, W, H)
  p.drawImage(frame, v.sx, v.sy, v.sw, v.sh, 0, 0, W, H)
  p.globalCompositeOperation = 'destination-in'
  p.imageSmoothingQuality = 'high'
  const kx = mask.width / frame.width
  const ky = mask.height / frame.height
  p.drawImage(mask, v.sx * kx, v.sy * ky, v.sw * kx, v.sh * ky, 0, 0, W, H)

  if (bg.complete && bg.naturalWidth) {
    const b = cover(bg.naturalWidth, bg.naturalHeight, W, H)
    ctx.drawImage(bg, b.sx, b.sy, b.sw, b.sh, 0, 0, W, H)
  } else {
    ctx.clearRect(0, 0, W, H)
  }
  ctx.save()
  if (mirror) {
    ctx.translate(W, 0)
    ctx.scale(-1, 1) // a selfie view for posing; the background itself stays the right way round
  }
  ctx.drawImage(person, 0, 0)
  ctx.restore()
}
