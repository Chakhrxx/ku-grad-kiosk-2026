import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { dressPhoto, matteOf, saveSteps, upscaleOf } from '@/api/client'
import { Screen, ShutterButton } from '@/components'
import { COUNTDOWN_SECONDS, PHOTO_HEIGHT, PHOTO_WIDTH } from '@/config'
import { useCamera } from '@/hooks/useCamera'
import { useCountdown } from '@/hooks/useCountdown'
import { useI18n } from '@/hooks/useI18n'
import { useKiosk } from '@/hooks/useKiosk'
import {
  compositePhoto,
  keepSharpScene,
  loadSegmenter,
  personBox,
  restoreFace,
  useLiveBackground,
} from '@/hooks/useLiveBackground'
import { TRYON_CAMERA, useTryOnStream } from '@/hooks/useTryOnStream'
import { backgroundUrl } from '@/lib/assetUrls'
import { clipOf, frameOf, recordCanvas } from '@/lib/clip'
import { cn } from '@/lib/cn'
import {
  drawHeaderFade,
  drawPhotoHeader,
  photoDate,
  PLACE_HEADER,
  UNIVERSITY_HEADER,
} from '@/lib/photoHeader'
import { getSolution } from '@/lib/solution'
import { KioskHeader } from '../shared/KioskHeader'

/** The viewfinder inside the corner brackets, in design px (Figma camera frame). */
const VIEW_W = 554
const VIEW_H = 680
/** vton-live: the viewfinder is the photo's own 2:3 shape, so it shows the photo as it will be, header and all. */
const PHOTO_VIEW_W = Math.round((VIEW_H * PHOTO_WIDTH) / PHOTO_HEIGHT)
const STAGE_W = 720 // the design frame's width, to centre the viewfinder in
/**
 * vton-live: the header's white on the 9:16 scene, behind the visitor: solid from the very top (above the photo's
 * 2:3 middle too, which is cut off later), fading in where the photo's header ends. No scene shows above it, so
 * the clip has no hard edge for the try-on model to smudge into a line.
 */
function fadeInPhoto(ctx: CanvasRenderingContext2D) {
  const { width, height } = ctx.canvas
  const top = (height - (width * PHOTO_HEIGHT) / PHOTO_WIDTH) / 2
  ctx.save()
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, top)
  ctx.translate(0, top)
  drawHeaderFade(ctx)
  ctx.restore()
}
/** If the visitor is still not on the scene when the countdown ends, give up after this long. */
const SCENE_WAIT_MS = 15_000
/** vton-batch: as sharp as the camera goes (the Femto Bolt does 4K): the visitor's face in the photo is the camera's. */
const STILL_CAMERA: MediaTrackConstraints = { width: { ideal: 3840 }, height: { ideal: 2160 } }
/** vton-live: cut out onto the scene every frame, so 1080p, sharp enough for the still and light enough to keep up. */
const LIVE_CAMERA: MediaTrackConstraints = { width: { ideal: 1920 }, height: { ideal: 1080 } }
/** The try-on model's input and output size; the shot goes to it scaled down to this. */
const MODEL_SIZE = [720, 1280]
/** It works in 9:16 (and gives back 720x1280), so the shot sent to it has that shape, grey where it runs off the view. */
const SHOT_ASPECT = 9 / 16
const VIEW_ASPECT = VIEW_W / VIEW_H
const BAND_GREY = '#808080'
/** vton-batch: the dressed still goes to the server's matting model at this width (it works at 1024 anyway). */
const MATTE_WIDTH = 1080
/** vton-live: the scene picture kept for the photo is 9:16 at the photo's width, the photo its middle. */
const SCENE_HEIGHT = Math.round((PHOTO_WIDTH * 16) / 9)
const NUMBERS = Array.from({ length: COUNTDOWN_SECONDS }, (_, i) => COUNTDOWN_SECONDS - i) // 8, 7, … 1

/**
 * The camera opens on arrival so visitors see themselves; then the Decart try-on stream dresses them and the
 * browser cuts them out onto the chosen campus scene, live. The shutter unlocks once they are on the scene; it
 * starts the countdown, and the photo is that scene at the end of it: already finished, the server only adds
 * the frame.
 *
 * The ways picked on the home screen while they are compared (lib/solution):
 *
 * vton-batch: the viewfinder is the plain camera (a live cut-out flickered and dropped arms and legs), and at the
 * end of the countdown the camera's own frame goes, as a still clip, to the try-on model's batch job; the dressed
 * visitor then gets their real face back and is cut out onto the scene for the photo.
 *
 * vton-live: the visitor sees themselves on the scene live, and a second of that picture goes to the batch job:
 * it comes back with the scene, so the scene goes back sharp, then the real face and the header.
 */
export function CameraScreen() {
  const { t } = useI18n()
  const { catalog, session, level, item, background, shoot, showPreview, fail } = useKiosk()
  const scene = catalog?.backgrounds.find((b) => b.id === background)
  // the place name on the photo is always Thai, as in the design; the KU scene has its own title and header
  const title = scene?.photo_title ?? scene?.th ?? ''
  const header = scene?.photo_title ? UNIVERSITY_HEADER : PLACE_HEADER
  const [live, setLive] = useState(false) // the camera picture is showing
  const [dressed, setDressed] = useState(false) // the picture in the gown is arriving
  const [solution] = useState(getSolution) // fixed for this visit, so the stream never starts midway
  const liveScene = solution === 'vton-live' // on the scene live in the viewfinder, a second of it to the model
  const gen = solution === 'vton-batch' // a still goes to the model at the shutter
  const [holding, setHolding] = useState(false) // vton-live: recording the second after the countdown
  // ponytail: the camera must be mounted upright; a rotated camera would need its frames turned before streaming
  const camera = liveScene ? LIVE_CAMERA : gen ? STILL_CAMERA : TRYON_CAMERA
  const { videoRef, stream } = useCamera(true, () => fail('camera'), camera)
  const dressedRef = useTryOnStream({
    camera: stream,
    session,
    level,
    item,
    onError: () => fail('ai'),
    enabled: solution === 'stream',
  })
  const {
    canvasRef: sceneRef,
    ready: sceneReady,
    readyNow: sceneReadyNow,
    capture: captureScene,
    still: sceneStill,
  } = useLiveBackground(
    liveScene ? videoRef : dressedRef,
    backgroundUrl(background),
    liveScene ? live : !gen && dressed,
    scene?.subject_shift,
    !liveScene, // vton-live records the canvas, so it stays the right way round; CSS mirrors it on screen
    liveScene ? fadeInPhoto : undefined, // the photo's fade behind them, live, as it will be in the photo
  )
  const viewW = liveScene ? PHOTO_VIEW_W : VIEW_W
  // vton-live: the photo's header (logo, place, date) over the viewfinder, drawn once; the fade is in the scene
  const headerRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = headerRef.current
    if (liveScene && canvas) void drawPhotoHeader(canvas.getContext('2d')!, header, title, photoDate(), { fade: false })
  }, [liveScene, header, title])
  // ponytail: no live scene for vton-batch; bring back useLiveBackground(videoRef, …, live) once the cut-out holds steady
  // vton-batch still cuts the dressed photo out, so the shutter waits for the segmenter: no paid dressing it can't use
  const [segmenterReady, setSegmenterReady] = useState(false)
  const segmenterFailed = useEffectEvent(() => fail('ai'))
  useEffect(() => {
    if (gen) loadSegmenter().then(() => setSegmenterReady(true), () => segmenterFailed())
  }, [gen])

  // Timings in the browser console, next to the [try-on] ones: how long the visitor waits at each step
  const [openedAt] = useState(() => performance.now())
  useEffect(() => {
    if (sceneReady) console.info(`[photo] on the scene ${secondsSince(openedAt)} after the camera screen opened`)
  }, [sceneReady, openedAt])

  // The countdown also buys time for the stream to connect; if the scene still isn't there, wait for it,
  // so the photo is always the visitor in the gown on the campus
  const whenOnScene = async () => {
    const deadline = performance.now() + SCENE_WAIT_MS
    while (!sceneReadyNow.current) {
      if (performance.now() > deadline) throw new Error('try-on scene never arrived')
      await new Promise((r) => setTimeout(r, 100))
    }
  }
  // the model's frame is compressed 720p: the server's upscaler sharpens it; as it is if that fails
  const sharpened = async (frame: ImageBitmap) => {
    const t = performance.now()
    try {
      const sharp = await createImageBitmap(await upscaleOf(await jpegOf(asCanvas(frame), 0.95), session))
      console.info(`[photo] sharpened in ${secondsSince(t)}`)
      return sharp
    } catch (e) {
      console.error('upscale failed, using the frame as it is', e)
      return frame
    }
  }

  // the visitor cut out by the server's matting model, which keeps the gown's details; undefined (the kiosk's own
  // segmenter cuts them out instead) if that fails
  const matteFor = (image: HTMLCanvasElement) =>
    jpegOf(sizedTo(image, MATTE_WIDTH))
      .then((jpeg) => matteOf(jpeg, session))
      .then((b) => createImageBitmap(b))
      .catch((e) => {
        console.error('matte failed, cutting out in the kiosk', e)
        return undefined
      })

  // vton-live: a clip of the visitor on the scene to the try-on model's batch job; the scene comes back with them,
  // soft, so it goes back sharp from `onScene`, then the face from it and the header. Two photos, for comparing:
  // in the middle of the scene (cut out and put on it again), and where they stood, as they saw it
  const dressOnScene = async (onScene: HTMLCanvasElement, clip: Blob): Promise<[Blob, Blob]> => {
    const t1 = performance.now()
    const dressing = await dressPhoto(clip, { session, level, item, solution })
    const dressedFrame = await sharpened(await frameOf(dressing.photo))
    const t2 = performance.now()
    // the model's 720p video softens everything: the scene goes back sharp, then the face from the camera
    const sharp = await keepSharpScene(onScene, dressedFrame, await matteFor(asCanvas(dressedFrame))).catch((e) => {
      console.error('sharp scene failed', e)
      return dressedFrame
    })
    const restored = await restoreFace(onScene, sharp instanceof HTMLCanvasElement ? await createImageBitmap(sharp) : sharp).catch(
      (e) => {
        console.error('face restore failed', e)
        return sharp
      },
    )
    const { steps } = dressing
    const photo = photoSlice(restored)
    const t3 = performance.now()
    const finish = (ctx: CanvasRenderingContext2D) => drawPhotoHeader(ctx, header, title, photoDate(), { fade: false })
    const centred = compositePhoto(photo, backgroundUrl(background), finish, scene?.subject_shift, {
      behind: drawHeaderFade,
      matte: await matteFor(photo),
    })
    const asShot = asCanvas(photo, true) // a copy: the centred one still cuts the visitor out of `photo`
    await finish(asShot.getContext('2d')!) // its fade is in the scene already, behind them
    const photos = await Promise.all([centred, jpegOf(asShot)])
    if (steps) saveSteps(steps, photos) // debug: result1 in the middle, result2 where they stood
    console.info(
      `[photo] dressed in ${secondsSince(t1, t2)}, scene and face back in ${secondsSince(t2, t3)}, both photos in ${secondsSince(t3)}`,
    )
    return photos
  }

  const makePhoto = async (video: HTMLVideoElement) => {
    const t0 = performance.now()
    console.info(`[photo] camera ${video.videoWidth}x${video.videoHeight}`)
    const view = grabView(video)
    // the room doesn't matter (the visitor goes onto the scene), so the model gets them filling its whole 9:16
    // frame: about twice the pixels across for the gown and face that the whole viewfinder in grey bands gave it
    const { canvas: shot, rect } = aroundVisitor(view, await personBox(view).catch(() => null))
    // the try-on model takes video only, so a still clip goes, and a frame of the dressed one comes back
    const dressing = await dressPhoto(await clipOf(modelSized(shot)), { session, level, item, solution })
    const dressedShot = await sharpened(await frameOf(dressing.photo))
    const t1 = performance.now()
    // the model redraws the face as someone else; a failed restore still leaves a photo in the gown
    const restored = await restoreFace(shot, dressedShot).catch((e) => {
      console.error('face restore failed', e)
      return dressedShot
    })
    const t2 = performance.now()
    const dressed = asCanvas(restored)
    const { steps } = dressing
    dressed.toBlob((b) => b && showPreview(b), 'image/jpeg', 0.9) // in the room: shown while the scene goes on
    // cut out of the room by the server's matting model, which keeps the gown's details
    const matte = await matteFor(dressed)
    const t3 = performance.now()
    const finish = (ctx: CanvasRenderingContext2D) => drawPhotoHeader(ctx, header, title, photoDate(), { fade: false })
    // two photos, the visitor picks one: on the scene, and in the room as the camera saw them, with no cut-out to
    // lose the gown's details
    const room = inTheRoom(dressed, rect, view)
    await finish(room.getContext('2d')!)
    const photo = await Promise.all([
      compositePhoto(dressed, backgroundUrl(background), finish, scene?.subject_shift, { behind: drawHeaderFade, matte }),
      jpegOf(room),
    ])
    if (steps) saveSteps(steps, photo) // debug: result1 on the scene, result2 in the room
    console.info(
      `[photo] dressed in ${secondsSince(t0, t1)}, face in ${secondsSince(t1, t2)}, cut out in ${secondsSince(t2, t3)}, put on the scene in ${secondsSince(t3)}`,
    )
    return photo
  }

  const { count, start } = useCountdown(COUNTDOWN_SECONDS, async () => {
    if (liveScene) {
      // the sharp still and the second of video are both taken here, before the screen (and the scene) closes
      try {
        // the header's fade behind the visitor, where the photo's top will be; keepSharpScene keeps it off them
        const onScene = sceneStill(PHOTO_WIDTH, SCENE_HEIGHT, fadeInPhoto)
        setHolding(true)
        const clip = await recordCanvas(sceneRef.current!)
        shoot(dressOnScene(onScene, clip))
      } catch (e) {
        console.error('scene capture failed', e)
        fail('ai')
      }
      return
    }
    if (gen) {
      // the shot is grabbed right away, before the screen (and the camera) closes for the generating screen
      if (videoRef.current) shoot(makePhoto(videoRef.current))
      else fail('camera')
      return
    }
    try {
      const t0 = performance.now()
      await whenOnScene()
      const t1 = performance.now()
      const photo = await captureScene((ctx) => drawPhotoHeader(ctx, header, title, photoDate()))
      console.info(`[photo] countdown over: waited ${secondsSince(t0, t1)} for the scene, captured in ${secondsSince(t1)}`)
      shoot(photo)
    } catch (e) {
      console.error('capture failed', e)
      fail('ai')
    }
  })
  const counting = count !== null
  // "Let's Play !" and the shutter only once the visitor stands on the scene in the gown, so nobody shoots early;
  // vton-batch makes the photo from the camera itself, so there it needs the camera and the segmenter
  const canShoot = gen ? live && segmenterReady : sceneReady // vton-live: once they are on the scene
  const phase = canShoot ? 'play' : 'getReady'

  return (
    <Screen header={<KioskHeader title={t.camera.title} back="preview" showHome />}>
      <p className="mt-7.5 text-lg font-semibold text-primary">{t.camera.subtitle}</p>

      {/* Viewfinder inside corner brackets. The raw camera shows first (mirrored like a selfie) and feeds the
          try-on stream; the dressed video is hidden, only the source for the scene canvas the visitor sees. */}
      <div
        className="absolute top-84 overflow-hidden rounded-[18px]"
        style={{ width: viewW, height: VIEW_H, left: (STAGE_W - viewW) / 2 }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onPlaying={() => setLive(true)}
          className={cn(
            'absolute inset-0 size-full -scale-x-100 object-cover transition-opacity duration-500',
            live ? 'opacity-100' : 'opacity-0',
          )}
        />

        <video ref={dressedRef} autoPlay muted playsInline onPlaying={() => setDressed(true)} className="hidden" />
        {/* vton-live: the scene in the try-on model's 9:16 shape, unmirrored for recording, mirrored here by CSS */}
        <canvas
          ref={sceneRef}
          width={liveScene ? MODEL_SIZE[0] : VIEW_W * 1.5}
          height={liveScene ? MODEL_SIZE[1] : VIEW_H * 1.5}
          className={cn(
            'absolute inset-0 size-full transition-opacity duration-700',
            liveScene && '-scale-x-100 object-cover',
            sceneReady ? 'opacity-100' : 'opacity-0',
          )}
        />
        {liveScene && (
          <canvas
            ref={headerRef}
            width={PHOTO_WIDTH}
            height={PHOTO_HEIGHT}
            aria-hidden="true"
            className={cn('pointer-events-none absolute inset-0 size-full', sceneReady ? 'opacity-100' : 'opacity-0')}
          />
        )}
        {holding && (
          <p className="absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 animate-breathe rounded-pill bg-white/85 px-7 py-3 text-2xl font-black text-primary motion-reduce:animate-none">
            {t.camera.hold}
          </p>
        )}
        {solution === 'stream' && live && !sceneReady && (
          <p className="absolute inset-x-0 bottom-5 mx-auto w-fit animate-breathe rounded-pill bg-white/85 px-5 py-2 text-base font-semibold text-primary motion-reduce:animate-none">
            {t.camera.dressing}
          </p>
        )}
        {counting && <div className="absolute inset-0 bg-primary/25" />}
        {/* inside the viewfinder, so numbers past its edges are clipped rather than drifting over the header */}
        {counting && <CountdownDrum count={count} />}
      </div>
      <CornerBrackets width={viewW} />

      {/* keyed by phase, so each new phase replays its entrance; once the numbers roll they speak for themselves */}
      {!counting && !holding && (
        <p
          key={phase}
          className={cn(
            'absolute z-10 text-[32px] font-black text-primary drop-shadow-[0_1px_6px_rgb(255_255_255/0.7)] motion-reduce:animate-none',
            liveScene ? 'top-112' : 'top-98', // vton-live: below the photo header shown in the viewfinder
            phase === 'getReady' ? 'animate-breathe' : 'animate-pop-in',
          )}
        >
          {t.camera[phase]}
        </p>
      )}

      {/* where to stand, only until the camera picture appears */}
      {!live && <Silhouette />}

      <div className="absolute bottom-12.5 size-28.75">
        {phase === 'play' && (
          // ripples spreading from it, like rings on water
          <>
            <span aria-hidden="true" className="absolute inset-0 animate-call rounded-full border-3 border-white motion-reduce:animate-none" />
            <span aria-hidden="true" className="absolute inset-0 animate-call rounded-full border-2 border-white [animation-delay:1.1s] motion-reduce:animate-none" />
          </>
        )}
        {/* hidden, not just greyed out, while the gown goes on, so nobody reaches for it early */}
        {canShoot && (
          <ShutterButton
            label={t.camera.shutter}
            onClick={start}
            disabled={counting || holding}
            className="relative animate-sheet-in motion-reduce:animate-none"
          />
        )}
      </div>
    </Screen>
  )
}

const secondsSince = (from: number, to = performance.now()) => `${((to - from) / 1000).toFixed(1)}s`

/**
 * vton-batch: the camera's current frame, unmirrored, at the camera's full resolution: exactly what the viewfinder
 * shows (the camera's middle at full height). Drawn at once, before the screen (and the camera) closes.
 */
function grabView(video: HTMLVideoElement) {
  const h = video.videoHeight
  const w = Math.min(video.videoWidth, Math.round(h * VIEW_ASPECT))
  const canvas = document.createElement('canvas')
  Object.assign(canvas, { width: w, height: h })
  canvas.getContext('2d')!.drawImage(video, (video.videoWidth - w) / 2, 0, w, h, 0, 0, w, h)
  return canvas
}

/** Room around the visitor in the crop sent to the try-on model, as a share of their height: cap, sleeves, feet. */
const CROP_MARGIN = 0.06

/**
 * The try-on model's 9:16 frame cut out of `view` around the visitor (`box`), at the camera's resolution, grey
 * where it runs past the view's edges; the view's middle at full height when nobody was found.
 */
function aroundVisitor(view: HTMLCanvasElement, box: { x: number; y: number; w: number; h: number } | null) {
  const m = box ? box.h * CROP_MARGIN : 0
  let h = box ? box.h + 2 * m : view.height
  let w = h * SHOT_ASPECT
  if (box && box.w + 2 * m > w) [w, h] = [box.w + 2 * m, (box.w + 2 * m) / SHOT_ASPECT] // arms out wide
  const cx = box ? box.x + box.w / 2 : view.width / 2
  const cy = box ? box.y + box.h / 2 : view.height / 2
  const canvas = document.createElement('canvas')
  Object.assign(canvas, { width: Math.round(w), height: Math.round(h) })
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = BAND_GREY
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const rect = { x: cx - w / 2, y: cy - h / 2, w, h }
  ctx.drawImage(view, rect.x, rect.y, w, h, 0, 0, canvas.width, canvas.height)
  return { canvas, rect }
}

/**
 * `image` (made from aroundVisitor's crop, `scale` times its px) put back where the crop came from, on a clear
 * canvas the view's shape at that scale: the visitor where they stood, nothing elsewhere.
 */
/** Where the visitor's crop starts down the room photo: below the header, so it never covers their cap. */
const ROOM_TOP = 0.13
/** How much of the dressed crop's edges fades into the room around it, so no seam shows. */
const ROOM_FEATHER = 0.06

/**
 * No scene: the visitor dressed, in the room where they stood, at the photo's 2:3. The dressed crop fills the height
 * below the header; the camera's own picture of the room fills in beside and above it, the crop's edges faded in.
 */
function inTheRoom(dressed: HTMLCanvasElement, rect: { x: number; y: number; w: number; h: number }, view: HTMLCanvasElement) {
  const canvas = document.createElement('canvas')
  Object.assign(canvas, { width: PHOTO_WIDTH, height: PHOTO_HEIGHT })
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  const top = ROOM_TOP * PHOTO_HEIGHT
  // view px to photo px: the crop the full height below the header, or larger when the visitor stood so close that
  // the room at that size would be narrower than the photo (white down both sides); then their feet go off the bottom
  const k = Math.max((PHOTO_HEIGHT - top) / rect.h, PHOTO_WIDTH / view.width)
  // the photo's left edge, in view px: centred on the visitor, but kept on the room so neither side runs past it
  const left = Math.min(Math.max(0, rect.x + rect.w / 2 - PHOTO_WIDTH / k / 2), view.width - PHOTO_WIDTH / k)
  ctx.fillStyle = '#fff' // above the camera's top edge, under the header
  ctx.fillRect(0, 0, PHOTO_WIDTH, PHOTO_HEIGHT)
  ctx.drawImage(view, -left * k, top - rect.y * k, view.width * k, view.height * k)

  const soft = asCanvas(dressed, true)
  const s = soft.getContext('2d')!
  s.globalCompositeOperation = 'destination-in'
  const sides = s.createLinearGradient(0, 0, soft.width, 0)
  sides.addColorStop(0, 'rgba(0, 0, 0, 0)')
  sides.addColorStop(ROOM_FEATHER, '#000')
  sides.addColorStop(1 - ROOM_FEATHER, '#000')
  sides.addColorStop(1, 'rgba(0, 0, 0, 0)')
  s.fillStyle = sides
  s.fillRect(0, 0, soft.width, soft.height)
  const topEdge = s.createLinearGradient(0, 0, 0, soft.height)
  topEdge.addColorStop(0, 'rgba(0, 0, 0, 0)')
  topEdge.addColorStop(ROOM_FEATHER, '#000')
  s.fillStyle = topEdge
  s.fillRect(0, 0, soft.width, soft.height)
  ctx.drawImage(soft, (rect.x - left) * k, top, rect.w * k, rect.h * k)
  return canvas
}

/** A bitmap or canvas as a canvas; `copy` always draws a new one. */
function asCanvas(image: ImageBitmap | HTMLCanvasElement, copy = false) {
  if (image instanceof HTMLCanvasElement && !copy) return image
  const canvas = document.createElement('canvas')
  Object.assign(canvas, { width: image.width, height: image.height })
  canvas.getContext('2d')!.drawImage(image, 0, 0)
  return canvas
}

/** The shot scaled down to the try-on model's size: it gives back 720p whatever it is sent. */
function modelSized(shot: HTMLCanvasElement) {
  const canvas = document.createElement('canvas')
  Object.assign(canvas, { width: MODEL_SIZE[0], height: MODEL_SIZE[1] })
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(shot, 0, 0, canvas.width, canvas.height)
  return canvas
}

/** `image` scaled to `width` (no larger), keeping its shape. */
function sizedTo(image: HTMLCanvasElement, width: number) {
  if (image.width <= width) return image
  const canvas = document.createElement('canvas')
  Object.assign(canvas, { width, height: Math.round((image.height * width) / image.width) })
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas
}

const jpegOf = (canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> =>
  new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('shot failed'))), 'image/jpeg', quality),
  )

/** vton-live: the photo out of the dressed 9:16 scene picture, its 2:3 middle at the photo's size. */
function photoSlice(image: ImageBitmap | HTMLCanvasElement) {
  const canvas = document.createElement('canvas')
  Object.assign(canvas, { width: PHOTO_WIDTH, height: PHOTO_HEIGHT })
  const h = (image.width * PHOTO_HEIGHT) / PHOTO_WIDTH
  canvas.getContext('2d')!.drawImage(image, 0, (image.height - h) / 2, image.width, h, 0, 0, PHOTO_WIDTH, PHOTO_HEIGHT)
  return canvas
}

/** Four rounded corner brackets around the viewfinder, as in the design. */
function CornerBrackets({ width }: { width: number }) {
  // a little way out from the viewfinder, corners rounded to match, so they frame it rather than read as its torn edge
  const gap = 12
  const arm = 'absolute size-35 border-primary'
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{ top: 336 - gap, width: width + 2 * gap, height: VIEW_H + 2 * gap, left: (STAGE_W - width) / 2 - gap }}
    >
      <div className={cn(arm, 'top-0 left-0 rounded-tl-[30px] border-t-2 border-l-2')} />
      <div className={cn(arm, 'top-0 right-0 rounded-tr-[30px] border-t-2 border-r-2')} />
      <div className={cn(arm, 'bottom-0 left-0 rounded-bl-[30px] border-b-2 border-l-2')} />
      <div className={cn(arm, 'right-0 bottom-0 rounded-br-[30px] border-r-2 border-b-2')} />
    </div>
  )
}

/** Head-and-shoulders outline showing where to stand while the camera starts. */
function Silhouette() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 242 294"
      className="pointer-events-none absolute top-137.5 w-60.5 animate-breathe fill-none stroke-primary stroke-2 motion-reduce:animate-none"
    >
      <circle cx="121" cy="87" r="86" />
      <path d="M1 294a120 120 0 0 1 240 0" />
    </svg>
  )
}

/**
 * Countdown numbers on a turning drum. Only the current one is white; its neighbours are a pale solid teal
 * (#cde9e7, measured on the Figma frame), the ones beyond a faint tint of it.
 */
// Measured on the Figma countdown frame: the current number sits 264px below the viewfinder's top edge;
// neighbours are 204px and 370px away, at 66% and 49% size
const DRUM_CENTER = 264
const DRUM_OFFSET = [0, 204, 370, 520]
const DRUM_SCALE = [1, 0.66, 0.49, 0.4]

function CountdownDrum({ count }: { count: number }) {
  return (
    <div aria-live="assertive" className="pointer-events-none absolute inset-x-0 h-0" style={{ top: DRUM_CENTER }}>
      {NUMBERS.map((n) => {
        const k = count - n // 0 = now, 1 = next (below), -1 = just passed (above)
        const a = Math.min(Math.abs(k), 3)
        return (
          <span
            key={n}
            aria-hidden={k !== 0}
            className="absolute left-1/2 text-[260px] leading-none font-black transition-[transform,opacity,color] duration-500 ease-[cubic-bezier(0.45,0,0.2,1)]"
            style={{
              transform: `translate(-50%, -50%) translateY(${Math.sign(k) * DRUM_OFFSET[a]}px) scale(${DRUM_SCALE[a]})`,
              color: a === 0 ? '#ffffff' : '#cde9e7',
              opacity: a <= 1 ? 1 : a === 2 ? 0.2 : 0, // only two neighbours each side, as in the design
              textShadow: a === 0 ? '0 2px 6px rgb(0 60 57 / 0.35)' : undefined,
            }}
          >
            {n}
          </span>
        )
      })}
    </div>
  )
}
