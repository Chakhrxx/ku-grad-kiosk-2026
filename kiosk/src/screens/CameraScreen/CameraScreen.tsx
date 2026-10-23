import { useEffect, useState } from 'react'
import { dressPhoto } from '@/api/client'
import { Screen, ShutterButton } from '@/components'
import { COUNTDOWN_SECONDS } from '@/config'
import { useCamera } from '@/hooks/useCamera'
import { useCountdown } from '@/hooks/useCountdown'
import { useI18n } from '@/hooks/useI18n'
import { useKiosk } from '@/hooks/useKiosk'
import { compositePhoto, useLiveBackground } from '@/hooks/useLiveBackground'
import { backgroundUrl } from '@/lib/assetUrls'
import { cn } from '@/lib/cn'
import { drawPhotoHeader, photoDate, PLACE_HEADER, UNIVERSITY_HEADER } from '@/lib/photoHeader'
import { KioskHeader } from '../shared/KioskHeader'

/** The viewfinder inside the corner brackets, in design px (Figma camera frame). */
const VIEW_W = 554
const VIEW_H = 680
/** As sharp as the webcam goes; the photo is a portrait slice of it. */
const CAMERA: MediaTrackConstraints = { width: { ideal: 1920 }, height: { ideal: 1080 } }
/** Decart's image model returns 720x1280, so the shot sent to it is cut to the same shape (it would crop otherwise). */
const SHOT_ASPECT = 9 / 16
const NUMBERS = Array.from({ length: COUNTDOWN_SECONDS }, (_, i) => COUNTDOWN_SECONDS - i) // 5, 4, 3, 2, 1

/**
 * The camera opens on arrival and the browser cuts the visitor out onto the chosen campus scene, live, so they
 * can pose. The shutter starts the countdown; at its end the camera's own frame goes to the server's image
 * model to be dressed (sharper than a live try-on stream, and billed per photo, not per second), and the dressed
 * visitor is cut out onto the scene again for the photo.
 */
export function CameraScreen() {
  const { t } = useI18n()
  const { catalog, session, level, item, background, shoot, fail } = useKiosk()
  const scene = catalog?.backgrounds.find((b) => b.id === background)
  // the place name on the photo is always Thai, as in the design; the KU scene has its own title and header
  const title = scene?.photo_title ?? scene?.th ?? ''
  const header = scene?.photo_title ? UNIVERSITY_HEADER : PLACE_HEADER
  const [live, setLive] = useState(false) // the camera picture is showing
  // ponytail: the camera must be mounted upright; a rotated camera would need its frames turned first
  const { videoRef } = useCamera(true, () => fail('camera'), CAMERA)
  const { canvasRef: sceneRef, ready: sceneReady } = useLiveBackground(
    videoRef,
    backgroundUrl(background),
    live,
    scene?.subject_shift,
  )

  // Timings in the browser console: how long the visitor waits at each step
  const [openedAt] = useState(() => performance.now())
  useEffect(() => {
    if (sceneReady) console.info(`[photo] on the scene ${secondsSince(openedAt)} after the camera screen opened`)
  }, [sceneReady, openedAt])

  const makePhoto = async (video: HTMLVideoElement) => {
    const t0 = performance.now()
    console.info(`[photo] camera ${video.videoWidth}x${video.videoHeight}`)
    const dressed = await dressPhoto(await grabShot(video), { session, level, item })
    const t1 = performance.now()
    const photo = await compositePhoto(
      await createImageBitmap(dressed),
      backgroundUrl(background),
      (ctx) => drawPhotoHeader(ctx, header, title, photoDate()),
      scene?.subject_shift,
    )
    console.info(`[photo] dressed in ${secondsSince(t0, t1)}, put on the scene in ${secondsSince(t1)}`)
    return photo
  }
  const { count, start } = useCountdown(COUNTDOWN_SECONDS, () => {
    if (videoRef.current) shoot(makePhoto(videoRef.current))
    else fail('camera')
  })
  const counting = count !== null
  // The photo is made from the camera itself, so the shutter needs only the camera; the scene is a preview
  const phase = live ? 'play' : 'getReady'

  return (
    <Screen header={<KioskHeader title={t.camera.title} back="preview" showHome />}>
      <p className="mt-7.5 text-lg font-semibold text-primary">{t.camera.subtitle}</p>

      {/* Viewfinder inside corner brackets. The raw camera shows first (mirrored like a selfie), then the scene
          canvas with the visitor cut out onto it covers it. */}
      <div className="absolute top-84 left-20.75 overflow-hidden rounded-[18px]" style={{ width: VIEW_W, height: VIEW_H }}>
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
        <canvas
          ref={sceneRef}
          width={VIEW_W * 1.5}
          height={VIEW_H * 1.5}
          className={cn(
            'absolute inset-0 size-full transition-opacity duration-700',
            sceneReady ? 'opacity-100' : 'opacity-0',
          )}
        />
        {counting && <div className="absolute inset-0 bg-primary/25" />}
        {/* inside the viewfinder, so numbers past its edges are clipped rather than drifting over the header */}
        {counting && <CountdownDrum count={count} />}
      </div>
      <CornerBrackets />

      {/* keyed by phase, so each new phase replays its entrance; once the numbers roll they speak for themselves */}
      {!counting && (
        <p
          key={phase}
          className={cn(
            'absolute top-98 z-10 text-[32px] font-black text-primary drop-shadow-[0_1px_6px_rgb(255_255_255/0.7)] motion-reduce:animate-none',
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
          <span aria-hidden="true" className="absolute inset-0 animate-call rounded-full border-4 border-white motion-reduce:animate-none" />
        )}
        {/* hidden, not just greyed out, until the camera is up, so nobody reaches for it early */}
        {live && (
          <ShutterButton
            label={t.camera.shutter}
            onClick={start}
            disabled={counting}
            className="relative animate-pop-in motion-reduce:animate-none"
          />
        )}
      </div>
    </Screen>
  )
}

const secondsSince = (from: number, to = performance.now()) => `${((to - from) / 1000).toFixed(1)}s`

/** The camera's current frame, its portrait middle at full height, unmirrored, as JPEG. */
function grabShot(video: HTMLVideoElement): Promise<Blob> {
  const h = video.videoHeight
  const w = Math.min(video.videoWidth, Math.round(h * SHOT_ASPECT))
  const canvas = document.createElement('canvas')
  Object.assign(canvas, { width: w, height: h })
  canvas.getContext('2d')!.drawImage(video, (video.videoWidth - w) / 2, 0, w, h, 0, 0, w, h)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('shot failed'))), 'image/jpeg', 0.92),
  )
}

/** Four rounded corner brackets around the viewfinder, as in the design. */
function CornerBrackets() {
  const arm = 'absolute size-35 border-primary'
  return (
    <div aria-hidden="true" className="pointer-events-none absolute top-84 left-20.75" style={{ width: VIEW_W, height: VIEW_H }}>
      <div className={cn(arm, 'top-0 left-0 rounded-tl-[10px] border-t-2 border-l-2')} />
      <div className={cn(arm, 'top-0 right-0 rounded-tr-[10px] border-t-2 border-r-2')} />
      <div className={cn(arm, 'bottom-0 left-0 rounded-bl-[10px] border-b-2 border-l-2')} />
      <div className={cn(arm, 'right-0 bottom-0 rounded-br-[10px] border-r-2 border-b-2')} />
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
