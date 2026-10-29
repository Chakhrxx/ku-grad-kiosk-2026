import { useEffect, useRef } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { type Point, toScreen } from './toScreen'

const WASM = '/mediapipe'
const MODEL = '/mediapipe/hand_landmarker.task'
const INDEX_TIP = 8
/** Hovering on something tappable this long taps it. */
const DWELL_MS = 900
/** After a tap the next one waits this much longer, so a button under the cursor on the next screen isn't tapped by accident. */
const AFTER_TAP_MS = 800
/** Without a hand this long the cursor goes and the next hand is a new visitor. */
const LOST_MS = 600
/** How much of each new reading the cursor takes; less is steadier, more is quicker. */
const SMOOTH = 0.35
const TAPPABLE = "button:not(:disabled), [role='button'], [role='menuitemradio'], a"
/** Half the box the cursor is drawn in: the size of the pressed-looking dot the mouse cursor swells into (88px). */
const RADIUS = 44
const CIRCLE = 2 * Math.PI * 40

/**
 * For a kiosk with no touch and no mouse: the camera finds the visitor's index finger and a cursor follows it; holding
 * it over a button for a moment taps it (a ring fills round the cursor meanwhile, DWELL_MS). Raising a hand also wakes the
 * home screen, as the first touch does. Frames stay on the machine: nothing is recorded or sent.
 * `?hand=0` in the address turns it off.
 */
// ponytail: dwell only, no swipe or pinch; a hand-driven swipe for the backdrop carousel if visitors ask for it
export function HandCursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<SVGCircleElement>(null)
  const idle = useRef<SVGGElement>(null)
  const lit = useRef<SVGGElement>(null)

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia || new URLSearchParams(location.search).get('hand') === '0') return
    let stopped = false
    let stream: MediaStream | undefined
    let frame = 0
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true

    const show = (at: Point | null, progress = 0, over = false) => {
      const d = dot.current
      if (!d) return
      d.style.opacity = at ? '1' : '0'
      // the same two looks as the mouse cursor in global.css: a plain dot, swelling into a lit one over a button
      document.documentElement.toggleAttribute('data-hand', !!at)
      idle.current?.setAttribute('opacity', over ? '0' : '1')
      lit.current?.setAttribute('opacity', over ? '1' : '0')
      if (at) d.style.transform = `translate(${at.x - RADIUS}px, ${at.y - RADIUS}px)`
      ring.current?.setAttribute('stroke-dashoffset', String(CIRCLE * (1 - progress)))
    }

    const tap = (el: Element, at: Point) => {
      const init = { bubbles: true, cancelable: true, clientX: at.x, clientY: at.y, pointerType: 'touch', isPrimary: true }
      el.dispatchEvent(new PointerEvent('pointerdown', init))
      el.dispatchEvent(new PointerEvent('pointerup', init))
      ;(el as HTMLElement).click()
    }

    const run = async () => {
      const [files, s] = await Promise.all([
        FilesetResolver.forVisionTasks(WASM),
        navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }),
      ])
      stream = s
      if (stopped) return s.getTracks().forEach((t) => t.stop())
      // CPU: the scenes and the segmenter already use the GPU's WebGL, and one hand at 30 fps is light for the CPU
      const landmarker = await HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL, delegate: 'CPU' },
        runningMode: 'VIDEO',
        numHands: 1,
      })
      video.srcObject = s
      await video.play()

      let cursor: Point | null = null
      let lastSeen = 0
      let lastVideoTime = -1
      let target: Element | null = null
      let since = 0
      const loop = () => {
        if (stopped) return
        frame = requestAnimationFrame(loop)
        const now = performance.now()
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime
          const tip = landmarker.detectForVideo(video, now).landmarks[0]?.[INDEX_TIP]
          if (tip) {
            const to = toScreen(tip, video.videoWidth / video.videoHeight, innerWidth, innerHeight)
            if (!cursor) {
              window.dispatchEvent(new PointerEvent('pointerdown')) // a new hand wakes the home screen
              cursor = to
            } else cursor = { x: cursor.x + (to.x - cursor.x) * SMOOTH, y: cursor.y + (to.y - cursor.y) * SMOOTH }
            lastSeen = now
          }
        }
        if (cursor && now - lastSeen > LOST_MS) {
          cursor = null
          target = null
          show(null)
          return
        }
        if (!cursor) return
        const under = document.elementFromPoint(cursor.x, cursor.y)?.closest(TAPPABLE) ?? null
        if (under !== target) {
          target = under
          since = now
        }
        const progress = target ? Math.max(0, (now - since) / DWELL_MS) : 0
        if (target && progress >= 1) {
          tap(target, cursor)
          target = null // the next tap needs a fresh hover, and a little longer
          since = now + AFTER_TAP_MS
        }
        show(cursor, Math.min(1, progress), !!target)
      }
      loop()
    }
    run().catch((e) => console.error('hand cursor off', e))

    return () => {
      stopped = true
      cancelAnimationFrame(frame)
      stream?.getTracks().forEach((t) => t.stop())
      document.documentElement.removeAttribute('data-hand')
    }
  }, [])

  return (
    <div
      ref={dot}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[10000] opacity-0"
      style={{ width: RADIUS * 2, height: RADIUS * 2 }}
    >
      <svg width={RADIUS * 2} height={RADIUS * 2} viewBox="0 0 88 88">
        <defs>
          <radialGradient id="hand-h">
            <stop offset="0.55" stopColor="#006c67" stopOpacity="0.22" />
            <stop offset="1" stopColor="#006c67" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hand-f">
            <stop offset="0" stopColor="#0b8a83" stopOpacity="0.75" />
            <stop offset="1" stopColor="#006c67" stopOpacity="0.3" />
          </radialGradient>
          <filter id="hand-s" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#003c39" floodOpacity="0.3" />
          </filter>
        </defs>
        <g ref={idle} transform="translate(16 16) scale(2)">
          <circle cx="14" cy="14" r="13" fill="url(#hand-h)" />
          <circle cx="14" cy="14" r="8" fill="rgb(255 255 255 / 0.4)" stroke="#006c67" strokeWidth="1.6" />
          <circle cx="14" cy="14" r="2.6" fill="#006c67" />
        </g>
        <g ref={lit} opacity="0" transform="scale(2)">
          <g filter="url(#hand-s)">
            <circle cx="22" cy="22" r="15" fill="url(#hand-f)" stroke="#fff" strokeWidth="2.2" />
          </g>
          <circle cx="22" cy="22" r="16.6" fill="none" stroke="#006c67" strokeOpacity="0.55" strokeWidth="1" />
          <circle cx="22" cy="22" r="3.6" fill="#fff" />
        </g>
        <circle
          ref={ring}
          cx="44"
          cy="44"
          r="40"
          fill="none"
          stroke="#006c67"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRCLE}
          strokeDashoffset={CIRCLE}
          transform="rotate(-90 44 44)"
        />
      </svg>
    </div>
  )
}
