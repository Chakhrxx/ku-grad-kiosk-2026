import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { PHOTO_HEIGHT, PHOTO_WIDTH } from '@/config'
import { type Box, faceBox, fitFace, meanColor, scaleBox, squareAround, tintGain } from '@/lib/faceRestore'
import { personOpacity, updatePersonAlpha } from '@/lib/personMask'
import { type Placement, placeSubject } from '@/lib/subject'

// Self-hosted (kiosk/public/mediapipe), so the kiosk never depends on a CDN being reachable.
// selfie_multiclass splits a person into hair, skin, clothes and accessories, so the graduation cap stays in.
const WASM = '/mediapipe'
const MODEL = '/mediapipe/selfie_multiclass_256x256.tflite'
// selfie_multiclass classes: 0 background, 1 hair, 2 body skin, 3 face skin, 4 clothes, 5 others (accessories)
const BACKGROUND_CLASS = 0
const HAIR_CLASS = 1
const BODY_SKIN_CLASS = 2
const FACE_CLASS = 3
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
 * like a video call's virtual background. `capture()` renders one full-size, unmirrored photo of it.
 *
 * Each frame, the portrait middle of the (landscape) stream is copied to `frame` and segmented there, so the
 * model sees the visitor large rather than a small figure in a wide picture; `frame` and `mask` then always
 * belong to the same moment, for both the live view and the photo.
 *
 * `shift` moves the visitor right by that fraction of the width, for scenes with art on the left. `mirror: false`
 * keeps the canvas the right way round, for recording it (vton-live mirrors it on screen with CSS instead), and
 * `behind` is drawn on the scene before the visitor each frame (vton-live: the photo header's fade).
 */
export function useLiveBackground(
  source: RefObject<HTMLVideoElement | null>,
  backgroundSrc: string,
  enabled: boolean,
  shift = 0,
  mirror = true,
  behind?: (ctx: CanvasRenderingContext2D) => void,
) {
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

    // once per new camera frame where the browser can tell (requestVideoFrameCallback): no frame segmented twice or
    // skipped, and drawn in step with the camera; otherwise every display frame, skipping the unchanged ones
    let frameCall = 0
    let calledOn: HTMLVideoElement | null = null
    loadSegmenter()
      .then((seg) => {
        const tick = () => {
          if (closed) return
          const next = source.current
          if (next && 'requestVideoFrameCallback' in next) {
            calledOn = next
            frameCall = next.requestVideoFrameCallback(tick)
          } else raf = requestAnimationFrame(tick)
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

          draw(canvas.getContext('2d')!, canvas.width, canvas.height, frame, mask, bg, mirror, shift, { behind })
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
      calledOn?.cancelVideoFrameCallback(frameCall)
    }
  }, [enabled, backgroundSrc, source, shift, mirror, behind])

  /**
   * This moment of the scene at `width`×`height`, the background crisp and the visitor unmirrored; `behind` is drawn
   * on the scene before the visitor (the header's fade, so it never washes their head out).
   */
  const still = (width = PHOTO_WIDTH, height = PHOTO_HEIGHT, behind?: (ctx: CanvasRenderingContext2D) => void) => {
    const frame = frameRef.current
    const mask = maskRef.current
    const bg = backgroundRef.current
    if (!frame || !mask || !bg || !readyNow.current) throw new Error('live background not ready')
    const canvas = canvasOf(width, height)
    draw(canvas.getContext('2d')!, width, height, frame, mask, bg, false, shift, { behind })
    return canvas
  }

  /** The photo: full size, the background crisp and the visitor unmirrored; `finish` draws on top (the header). */
  const capture = async (finish?: (ctx: CanvasRenderingContext2D) => Promise<void>): Promise<Blob> => {
    const canvas = still()
    const ctx = canvas.getContext('2d')!
    await finish?.(ctx)
    return new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('capture failed'))), 'image/jpeg', 0.92),
    )
  }

  return { canvasRef, ready, readyNow, capture, still }
}

/** Options for a still on the scene: what goes between the scene and the visitor, and how they are cut out. */
interface StillLayout {
  /** Drawn on the scene before the visitor (the header's fade, so it doesn't wash their head out). */
  behind?: (ctx: CanvasRenderingContext2D) => void
  /**
   * The visitor already cut out finely (the server's matting model, as alpha at any size of the still's shape);
   * without it the kiosk's own segmenter does it, losing the gown's sleeves, tassels and cap corners.
   */
  matte?: ImageBitmap
  /** false: the visitor stays where the camera saw them (the still on the photo's bottom edge, full width). */
  centre?: boolean
}

/**
 * One still (the visitor dressed by the try-on model) cut out onto the campus background, unmirrored, at the
 * photo's size.
 *
 * The visitor is placed like the design's sample, whatever their distance from the camera: full length in the
 * middle of the scene, head and feet on fixed lines (lib/subject). The cut-out edge is pulled in a little: the
 * segmenter works at low resolution, so its soft edge carries the room's wall around the gown as a pale outline.
 */
async function composeScene(
  image: ImageBitmap | HTMLCanvasElement,
  backgroundSrc: string,
  shift = 0,
  { behind, matte, centre = true }: StillLayout = {},
): Promise<HTMLCanvasElement> {
  const bg = new Image()
  bg.src = backgroundSrc
  const [seg] = await Promise.all([loadSegmenter(), bg.decode()])
  const content = canvasOf(image.width, image.height)
  content.getContext('2d')!.drawImage(image, 0, 0)

  let tight: HTMLCanvasElement
  let body: Box | null = null
  if (matte) {
    // the matting model cuts out whatever stands out, not only people: a scene's big logo too. Only what is near the
    // person the kiosk's segmenter sees is kept, its coarse mask grown well past them so tassels and sleeves stay
    const near = segmentStill(seg, content).tight
    tight = canvasOf(matte.width, matte.height)
    const t = tight.getContext('2d')!
    t.drawImage(matte, 0, 0)
    t.globalCompositeOperation = 'destination-in'
    t.drawImage(grow(near, Math.max(2, near.width / 20)), 0, 0, tight.width, tight.height)
    body = boxOfAlpha(tight, image.width)
  } else {
    ;({ tight, body } = segmentStill(seg, content))
  }

  // the still and its mask padded to the photo's shape (empty, so the scene shows): a wide still on the bottom edge,
  // a tall one (vton-batch's 9:16 crop around the visitor) in the middle
  const W = PHOTO_WIDTH
  const H = PHOTO_HEIGHT
  const fullWidth = Math.max(image.width, Math.round((image.height * W) / H))
  const fullHeight = Math.max(image.height, Math.round((image.width * H) / W))
  const left = (fullWidth - image.width) / 2
  const lift = fullHeight - image.height
  const still = canvasOf(fullWidth, fullHeight)
  still.getContext('2d')!.drawImage(content, left, lift)
  const km = tight.width / image.width // still px to mask px
  const mask = canvasOf(Math.round(fullWidth * km), Math.round(fullHeight * km))
  mask.getContext('2d')!.drawImage(tight, left * km, lift * km, image.width * km, image.height * km)

  const canvas = canvasOf(W, H)
  const ctx = canvas.getContext('2d')!
  const k = H / fullHeight // still px to photo px
  const place = centre && body ? placeSubject(scaleBox(body, k, k, left * k, lift * k), W, H) : undefined
  draw(ctx, W, H, still, mask, bg, false, shift, { behind, place })
  return canvas
}

/** The photo from one dressed still: on the scene (composeScene), `finish` on top (the header), as JPEG. */
export async function compositePhoto(
  image: ImageBitmap | HTMLCanvasElement,
  backgroundSrc: string,
  finish: (ctx: CanvasRenderingContext2D) => Promise<void>,
  shift = 0,
  layout: StillLayout = {},
): Promise<Blob> {
  const canvas = await composeScene(image, backgroundSrc, shift, layout)
  await finish(canvas.getContext('2d')!)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('capture failed'))), 'image/jpeg', 0.92),
  )
}

// ponytail: plain alpha blend; add colour matching to the scene if people look pasted-on
let personCanvas: OffscreenCanvas | undefined
/** The canvas the visitor is cut out on, cleared: one kept and reused, not a new one every frame. */
function personLayer(W: number, H: number) {
  if (personCanvas?.width !== W || personCanvas.height !== H) personCanvas = new OffscreenCanvas(W, H)
  const p = personCanvas.getContext('2d')!
  p.setTransform(1, 0, 0, 1, 0, 0)
  p.globalCompositeOperation = 'source-over'
  p.clearRect(0, 0, W, H)
  return personCanvas
}

function draw(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  frame: HTMLCanvasElement,
  mask: HTMLCanvasElement,
  bg: HTMLImageElement,
  mirror: boolean,
  shift: number,
  { behind, place }: { behind?: (ctx: CanvasRenderingContext2D) => void; place?: Placement } = {},
) {
  // the visitor: the segmented frame, keeping only where the mask says "person" (frame and mask share geometry).
  // A picture taller than the photo (vton-live's 9:16) has them in its photo-shaped middle, as large as the photo
  // will show them, not blown up to its full height; above and below is scene only, cut off later.
  const areaH = Math.min(H, Math.round((W * PHOTO_HEIGHT) / PHOTO_WIDTH))
  const areaY = (H - areaH) / 2
  const person = personLayer(W, H)
  const p = person.getContext('2d')!
  // high-quality resampling, and only once: placed (moved and scaled) as it is drawn, not scaled again after
  p.imageSmoothingQuality = 'high'
  if (place) {
    p.translate(place.dx, place.dy)
    p.scale(place.scale, place.scale)
  }
  const v = cover(frame.width, frame.height, W, areaH)
  p.drawImage(frame, v.sx, v.sy, v.sw, v.sh, 0, areaY, W, areaH)
  p.globalCompositeOperation = 'destination-in'
  const kx = mask.width / frame.width
  const ky = mask.height / frame.height
  p.drawImage(mask, v.sx * kx, v.sy * ky, v.sw * kx, v.sh * ky, 0, areaY, W, areaH)

  if (bg.complete && bg.naturalWidth) {
    const b = cover(bg.naturalWidth, bg.naturalHeight, W, H)
    ctx.drawImage(bg, b.sx, b.sy, b.sw, b.sh, 0, 0, W, H)
  } else {
    ctx.clearRect(0, 0, W, H)
  }
  behind?.(ctx)
  ctx.save()
  ctx.translate(shift * W, 0) // to the right on screen too: the scene is never mirrored
  if (mirror) {
    ctx.translate(W, 0)
    ctx.scale(-1, 1) // a selfie view for posing; the background itself stays the right way round
  }
  ctx.drawImage(person, 0, 0)
  ctx.restore()
}

/** The kiosk's own cut-out of a still: one pass of the segmenter, the edge pulled in a little; the box in still px. */
function segmentStill(seg: ImageSegmenter, still: HTMLCanvasElement) {
  const soft = document.createElement('canvas')
  let body: Box | null = null
  const result = seg.segmentForVideo(still, performance.now())
  try {
    const confidence = result.confidenceMasks?.[BACKGROUND_CLASS]
    if (!confidence) throw new Error('no person mask')
    const background = confidence.getAsFloat32Array()
    body = faceBox(background.map((b) => 1 - b), confidence.width, 0.6, 0.002) // the person, a few stray pixels off
    if (body) body = scaleBox(body, still.width / confidence.width, still.height / confidence.height)
    putMask(soft, background.map(personOpacity), confidence.width, confidence.height)
  } finally {
    result.close()
  }
  // pulled in by under a pixel of a 720-wide still: enough to drop the room's wall from the edge, not so much that
  // thin things (tassel cords, cap corners, fingers) go with it
  return { tight: invert(grow(invert(soft), Math.max(1, soft.width / 900))), body }
}

/** Where a mask's alpha is fairly surely the visitor, as a box in px of a still `width` wide. */
function boxOfAlpha(mask: HTMLCanvasElement, width: number) {
  const w = 270 // plenty for a box
  const h = Math.round((mask.height * w) / mask.width)
  const grid = canvasOf(w, h)
  const g = grid.getContext('2d')!
  g.drawImage(mask, 0, 0, w, h)
  const px = g.getImageData(0, 0, w, h).data
  const score = new Float32Array(w * h)
  for (let i = 0; i < score.length; i++) score[i] = px[i * 4 + 3] / 255
  const box = faceBox(score, w, 0.6, 0.002)
  return box && scaleBox(box, width / w, width / w)
}

/** How far a colour may move between the scene and the model's copy of it before it counts as changed (0..255). */
const CHANGE_LOW = 36
const CHANGE_HIGH = 56

/**
 * Where `after` clearly differs from `before` (same framing), as alpha on a `width`×`height` grid: both softened a
 * little so compression noise doesn't count, then specks a pixel wide dropped (an opening).
 */
function changed(before: CanvasImageSource, after: CanvasImageSource, width: number, height: number) {
  const pixels = (source: CanvasImageSource) => {
    const c = canvasOf(width, height)
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.filter = 'blur(1px)'
    ctx.drawImage(source, 0, 0, width, height)
    return ctx.getImageData(0, 0, width, height).data
  }
  const a = pixels(before)
  const b = pixels(after)
  const out = new ImageData(width, height)
  for (let i = 0; i < a.length; i += 4) {
    const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]))
    const t = Math.min(1, Math.max(0, (d - CHANGE_LOW) / (CHANGE_HIGH - CHANGE_LOW)))
    out.data[i + 3] = t * 255
  }
  const mask = canvasOf(width, height)
  mask.getContext('2d')!.putImageData(out, 0, 0)
  return grow(invert(grow(invert(mask), 1)), 1)
}

/** Where the visitor stands in `image`, as a box in its px (one rough pass of the segmenter); null if nobody. */
export async function personBox(image: HTMLCanvasElement): Promise<Box | null> {
  const seg = await loadSegmenter()
  const size = [Math.min(720, image.width), Math.round((Math.min(720, image.width) * image.height) / image.width)]
  const [scores] = segment(seg, image, { x: 0, y: 0, w: image.width, h: image.height }, size, [BACKGROUND_CLASS]).scores
  const box = faceBox(scores.score.map((b) => 1 - b), scores.width, 0.5, 0.002)
  return box && scaleBox(box, image.width / scores.width, image.height / scores.height)
}

/** Faces are segmented again in a crop this size, so the face fills the model's input instead of a few pixels. */
const FACE_CROP = 384
/** That crop, in face sizes around the face: room for the cap and the chin while still close up. */
const FACE_CROP_FACTOR = 2.2

interface Scores {
  score: Float32Array
  width: number
  height: number
}

const canvasOf = (width: number, height: number) => Object.assign(document.createElement('canvas'), { width, height })

/** The segmenter's scores for `classes` over `rect` of `source`, drawn at `size` first; also that drawn canvas. */
function segment(seg: ImageSegmenter, source: CanvasImageSource, rect: Box, size: number[], classes: number[]) {
  const input = canvasOf(size[0], size[1])
  input.getContext('2d')!.drawImage(source, rect.x, rect.y, rect.w, rect.h, 0, 0, size[0], size[1])
  const result = seg.segmentForVideo(input, performance.now())
  try {
    const scores = classes.map((k): Scores => {
      const mask = result.confidenceMasks?.[k]
      if (!mask) throw new Error(`no mask for class ${k}`)
      return { score: mask.getAsFloat32Array().slice(), width: mask.width, height: mask.height }
    })
    return { input, scores }
  } finally {
    result.close()
  }
}

/** A class's scores (or the higher of two, same grid) as a soft alpha canvas on their grid. */
function alphaOf(a: Scores, b?: Scores) {
  const { width, height } = a
  const alpha = new Float32Array(width * height)
  for (let i = 0; i < alpha.length; i++) alpha[i] = personOpacity(1 - (b ? Math.max(a.score[i], b.score[i]) : a.score[i]))
  const canvas = canvasOf(width, height)
  putMask(canvas, alpha, width, height)
  return canvas
}

/** `canvas`'s pixels on the grid of `scores` (the segmenter may answer at its own size). */
function pixelsOn(canvas: HTMLCanvasElement, { width, height }: Scores) {
  const grid = width === canvas.width && height === canvas.height ? canvas : canvasOf(width, height)
  if (grid !== canvas) grid.getContext('2d')!.drawImage(canvas, 0, 0, width, height)
  return grid.getContext('2d')!.getImageData(0, 0, width, height).data
}

/** Where `scores` say face, as a box in the pixels of the `rect` they were taken over. */
function faceIn(scores: Scores, rect: Box) {
  const box = faceBox(scores.score, scores.width)
  return box && scaleBox(box, rect.w / scores.width, rect.h / scores.height, rect.x, rect.y)
}

/** `mask` grown by about `r` px: blurred, then its alpha pushed back up. */
function grow(mask: HTMLCanvasElement, r: number) {
  const out = canvasOf(mask.width, mask.height)
  const ctx = out.getContext('2d')!
  ctx.filter = `blur(${r}px)`
  ctx.drawImage(mask, 0, 0)
  ctx.filter = 'none'
  for (let i = 0; i < 3; i++) ctx.drawImage(out, 0, 0) // alpha a becomes 1 - (1 - a)^8
  return out
}

/** `mask` turned inside out: solid where it was clear. */
function invert(mask: HTMLCanvasElement) {
  const out = canvasOf(mask.width, mask.height)
  const ctx = out.getContext('2d')!
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.drawImage(mask, 0, 0)
  return out
}

/** `mask` with small holes (eyes, mouth) filled but its outline kept: grown, then shrunk back (a closing). */
const closeHoles = (mask: HTMLCanvasElement, r: number) => invert(grow(invert(grow(mask, r)), r))

/**
 * The try-on model's dressed photo with the visitor's own face put back: its 720p video leaves a small face soft
 * (and Decart's image model, tried first, redrew it as someone else). The real face (from the camera shot, same 9:16 framing) is segmented close up in both
 * pictures, moved and scaled onto the dressed head, and pasted only where both are face, so the cap stays on top,
 * with a feathered edge. The dressed skin (neck, hands) is tinted to the visitor's first, so the face matches it.
 * The result is at the shot's size, not the model's 720p: the real face keeps all the camera's detail.
 * Returns the dressed photo unchanged when either face can't be found or they don't line up.
 */
export async function restoreFace(
  shot: HTMLCanvasElement,
  dressed: ImageBitmap,
): Promise<ImageBitmap | HTMLCanvasElement> {
  const seg = await loadSegmenter()
  const { width: W, height: H } = shot
  const whole = { x: 0, y: 0, w: W, h: H }
  const real = shot
  const big = canvasOf(W, H)
  big.getContext('2d')!.drawImage(dressed, 0, 0, W, H) // the same 9:16 shape, so this only scales
  const rough = [dressed.width, dressed.height] // finding the faces needs no more than the model's size

  const [realRough] = segment(seg, real, whole, rough, [FACE_CLASS]).scores
  const [dressedRough, dressedBody] = segment(seg, big, whole, rough, [FACE_CLASS, BODY_SKIN_CLASS]).scores
  const realAround = faceIn(realRough, whole)
  const dressedAround = faceIn(dressedRough, whole)
  if (!realAround || !dressedAround) {
    console.info('[photo] face not restored: no face found', { real: !!realAround, dressed: !!dressedAround })
    return dressed
  }

  const realCrop = squareAround(realAround, FACE_CROP_FACTOR)
  const dressedCrop = squareAround(dressedAround, FACE_CROP_FACTOR)
  const realClose = segment(seg, real, realCrop, [FACE_CROP, FACE_CROP], [FACE_CLASS, HAIR_CLASS])
  const dressedClose = segment(seg, big, dressedCrop, [FACE_CROP, FACE_CROP], [FACE_CLASS])
  const realFace = faceIn(realClose.scores[0], realCrop)
  const dressedFace = faceIn(dressedClose.scores[0], dressedCrop)
  const fit = realFace && dressedFace && fitFace(realFace, dressedFace)
  if (!fit) {
    console.info('[photo] face not restored: the faces do not line up', { realFace, dressedFace })
    return dressed
  }

  const out = canvasOf(W, H)
  const ctx = out.getContext('2d')!
  ctx.drawImage(big, 0, 0)

  // the dressed skin tinted to the visitor's, so their face doesn't sit on someone else's neck and hands
  const realColor = meanColor(pixelsOn(realClose.input, realClose.scores[0]), realClose.scores[0].score)
  const dressedColor = meanColor(pixelsOn(dressedClose.input, dressedClose.scores[0]), dressedClose.scores[0].score)
  if (realColor && dressedColor) {
    const [gr, gg, gb] = tintGain(dressedColor, realColor)
    const tinted = canvasOf(W, H)
    const t = tinted.getContext('2d')!
    t.drawImage(big, 0, 0)
    const pixels = t.getImageData(0, 0, W, H)
    for (let i = 0; i < pixels.data.length; i += 4) {
      pixels.data[i] *= gr
      pixels.data[i + 1] *= gg
      pixels.data[i + 2] *= gb
    }
    t.putImageData(pixels, 0, 0)
    t.globalCompositeOperation = 'destination-in'
    t.drawImage(alphaOf(dressedRough, dressedBody), 0, 0, W, H)
    ctx.drawImage(tinted, 0, 0)
  }

  // where to paste: the real face moved onto the dressed one, cut to where the dressed picture is face too, and
  // never the real hair (a fringe would hang out from under the cap)
  const holes = FACE_CROP * 0.03 // on the crop grids: about a twelfth of the face
  const where = canvasOf(W, H)
  const w = where.getContext('2d')!
  w.setTransform(fit.scale, 0, 0, fit.scale, fit.dx, fit.dy)
  w.drawImage(closeHoles(alphaOf(realClose.scores[0]), holes), realCrop.x, realCrop.y, realCrop.w, realCrop.h)
  w.globalCompositeOperation = 'destination-out'
  w.drawImage(grow(alphaOf(realClose.scores[1]), holes / 2), realCrop.x, realCrop.y, realCrop.w, realCrop.h) // stray strands too
  w.resetTransform()
  w.globalCompositeOperation = 'destination-in'
  w.drawImage(closeHoles(alphaOf(dressedClose.scores[0]), holes), dressedCrop.x, dressedCrop.y, dressedCrop.w, dressedCrop.h)

  // ponytail: plain feathered paste; Poisson blending if the seam still shows under strong side light
  const face = canvasOf(W, H)
  const f = face.getContext('2d')!
  f.filter = `blur(${Math.max(1.5, dressedFace.w * 0.04)}px)`
  f.drawImage(where, 0, 0)
  f.filter = 'none'
  f.globalCompositeOperation = 'source-in'
  f.setTransform(fit.scale, 0, 0, fit.scale, fit.dx, fit.dy)
  f.drawImage(real, 0, 0)
  ctx.drawImage(face, 0, 0)
  console.info(`[photo] face restored: scale ${fit.scale.toFixed(2)}, moved ${fit.dx.toFixed(0)},${fit.dy.toFixed(0)}px`)
  return out
}

/**
 * vton-live: the try-on model sends the whole picture back as compressed 720p video, so the scene, which it
 * should not touch at all, comes back soft. Put the sharp scene back everywhere that is not the visitor (in
 * either picture, so a gown wider than their clothes stays the model's), with a feathered edge.
 */
export async function keepSharpScene(
  sharp: HTMLCanvasElement,
  dressed: ImageBitmap | HTMLCanvasElement,
  matte?: ImageBitmap,
) {
  const seg = await loadSegmenter()
  const { width: W, height: H } = sharp
  const whole = { x: 0, y: 0, w: W, h: H }
  const size = [Math.round(W / 2), Math.round(H / 2)] // the segmenter's grid is coarser than this anyway
  const [before] = segment(seg, sharp, whole, size, [BACKGROUND_CLASS]).scores
  // person = not background, in either picture
  const person = (s: Scores): Scores => ({ ...s, score: s.score.map((b) => 1 - b) })
  let visitor: HTMLCanvasElement
  if (matte) {
    // the dressed visitor as the server's matting model cut them out (finer than the kiosk's segmenter), and
    // whatever the model clearly changed: the scene was there before, so that is what it added. A tassel hanging
    // against the header's white is lost to both segmenters, but not to the difference
    visitor = alphaOf(person(before))
    const v = visitor.getContext('2d')!
    v.drawImage(matte, 0, 0, visitor.width, visitor.height)
    v.drawImage(changed(sharp, dressed, visitor.width, visitor.height), 0, 0)
  } else {
    const after = segment(seg, dressed, { x: 0, y: 0, w: dressed.width, h: dressed.height }, size, [BACKGROUND_CLASS])
    // only just past the edge: further out it takes in the model's own shadows, dark patches on the sharp ground
    visitor = grow(alphaOf(person(before), person(after.scores[0])), Math.max(1, size[0] / 360))
  }

  const out = canvasOf(W, H)
  const ctx = out.getContext('2d')!
  ctx.drawImage(sharp, 0, 0)
  const layer = canvasOf(W, H)
  const l = layer.getContext('2d')!
  l.filter = `blur(${matte ? 1.5 : Math.max(2, W / 270)}px)` // the matte's edge is fine already: a wide blur fades cords
  l.drawImage(visitor, 0, 0, W, H)
  l.filter = 'none'
  l.globalCompositeOperation = 'source-in'
  l.drawImage(dressed, 0, 0, W, H)
  ctx.drawImage(layer, 0, 0)
  return out
}
