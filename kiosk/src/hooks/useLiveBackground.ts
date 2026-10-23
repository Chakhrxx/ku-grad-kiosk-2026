import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { PHOTO_HEIGHT, PHOTO_WIDTH } from '@/config'
import { personOpacity, updatePersonAlpha } from '@/lib/personMask'

// Self-hosted (kiosk/public/mediapipe), so the kiosk never depends on a CDN being reachable.
// selfie_multiclass splits a person into hair, skin, clothes and accessories, so the graduation cap stays in.
const WASM = '/mediapipe'
const MODEL = '/mediapipe/selfie_multiclass_256x256.tflite'
const BACKGROUND_CLASS = 0
/** Portrait crop of the stream that gets segmented: the viewfinder's shape, wider than the 9:16 photo. */
const CROP_ASPECT = 554 / 680

let segmenter: Promise<ImageSegmenter> | undefined
/** One segmenter for the life of the page; loading it takes a moment, so it is reused across visitors. */
export function loadSegmenter() {
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

/** Write per-pixel person opacity into `mask`'s alpha channel, resizing it to the segmenter's output. */
function putMask(mask: HTMLCanvasElement, alpha: Float32Array, width: number, height: number) {
  const pixels = new ImageData(width, height)
  for (let i = 0; i < alpha.length; i++) pixels.data[i * 4 + 3] = alpha[i] * 255
  if (mask.width !== width || mask.height !== height) Object.assign(mask, { width, height })
  mask.getContext('2d')!.putImageData(pixels, 0, 0)
}

/**
 * Cut the visitor out of `source` live and draw them on the campus background into the returned canvas,
 * like a video call's virtual background, so they can pose on the scene before the photo.
 *
 * Each frame, the portrait middle of the (landscape) stream is copied to `frame` and segmented there, so the
 * model sees the visitor large rather than a small figure in a wide picture.
 *
 * `shift` moves the visitor right by that fraction of the width, for scenes with art on the left.
 */
export function useLiveBackground(
  source: RefObject<HTMLVideoElement | null>,
  backgroundSrc: string,
  enabled: boolean,
  shift = 0,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let raf = 0
    let closed = false
    const bg = new Image()
    bg.src = backgroundSrc
    const frame = document.createElement('canvas')
    const mask = document.createElement('canvas')
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
            putMask(mask, updatePersonAlpha(confidence.getAsFloat32Array(), alpha), width, height)
          }
          result.close()

          draw(canvas.getContext('2d')!, canvas.width, canvas.height, frame, mask, bg, true, shift)
          setReady(true)
        }
        tick()
      })
      .catch((e) => console.error('live background failed', e))

    return () => {
      closed = true
      cancelAnimationFrame(raf)
    }
  }, [enabled, backgroundSrc, source, shift])

  return { canvasRef, ready }
}

/**
 * The photo from one still (the visitor already dressed): cut out onto the campus background at full size,
 * unmirrored; `finish` draws on top (the header).
 */
export async function compositePhoto(
  image: ImageBitmap,
  backgroundSrc: string,
  finish: (ctx: CanvasRenderingContext2D) => Promise<void>,
  shift = 0,
): Promise<Blob> {
  const bg = new Image()
  bg.src = backgroundSrc
  const [seg] = await Promise.all([loadSegmenter(), bg.decode()])
  const frame = document.createElement('canvas')
  Object.assign(frame, { width: image.width, height: image.height })
  frame.getContext('2d')!.drawImage(image, 0, 0)

  const mask = document.createElement('canvas')
  const result = seg.segmentForVideo(frame, performance.now())
  const confidence = result.confidenceMasks?.[BACKGROUND_CLASS]
  if (!confidence) throw new Error('no person mask')
  putMask(mask, confidence.getAsFloat32Array().map(personOpacity), confidence.width, confidence.height)
  result.close()

  const canvas = document.createElement('canvas')
  Object.assign(canvas, { width: PHOTO_WIDTH, height: PHOTO_HEIGHT })
  const ctx = canvas.getContext('2d')!
  draw(ctx, canvas.width, canvas.height, frame, mask, bg, false, shift)
  await finish(ctx)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('capture failed'))), 'image/jpeg', 0.92),
  )
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
  shift: number,
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
  ctx.translate(shift * W, 0) // to the right on screen too: the scene is never mirrored
  if (mirror) {
    ctx.translate(W, 0)
    ctx.scale(-1, 1) // a selfie view for posing; the background itself stays the right way round
  }
  ctx.drawImage(person, 0, 0)
  ctx.restore()
}
