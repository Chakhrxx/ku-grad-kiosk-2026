import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * The How to Join step icons, redrawn from the Figma ones as line art so their parts can move: a gentle loop each,
 * after the card has floated in (`delayMs`). Motions are CSS (global.css, `.step-icon`), so reduced motion stops them.
 */
export type StepIconName = 'start' | 'instructions' | 'pdpa' | 'degree' | 'background' | 'photo' | 'result'

const ICONS: Record<StepIconName, ReactNode> = {
  // a finger tapping the screen, rings spreading from the tap
  start: (
    <>
      <circle className="si-ripple fill-primary/15" cx="19" cy="11" r="6" />
      <circle className="si-ripple si-later" cx="19" cy="11" r="6" />
      <path
        className="si-press"
        d="M16 27V11a3 3 0 0 1 6 0v12m0-3a3 3 0 0 1 6 0v3m0-2a3 3 0 0 1 6 0v2m0-1a3 3 0 0 1 6 0v8c0 8-5 13-12 13h-3c-4 0-7-2-9-6l-6-9a3 3 0 0 1 5-3l3 4"
      />
    </>
  ),
  // the instructions writing themselves, then play
  instructions: (
    <>
      {[10, 17, 24].map((y, i) => (
        <path key={y} className="si-write" style={{ animationDelay: `calc(var(--si-delay) + ${i * 0.12}s)` }} pathLength={1} d={`M5 ${y}h38`} />
      ))}
      {[31, 38].map((y, i) => (
        <path key={y} className="si-write" style={{ animationDelay: `calc(var(--si-delay) + ${(i + 3) * 0.12}s)` }} pathLength={1} d={`M5 ${y}h22`} />
      ))}
      <path className="si-play" d="M34 30l9 6-9 6z" />
    </>
  ),
  // the form, and its shield ticking
  pdpa: (
    <>
      <rect x="7" y="7" width="25" height="35" rx="3" />
      <path d="M14 7V5.5A1.5 1.5 0 0 1 15.5 4h8A1.5 1.5 0 0 1 25 5.5V7" />
      <circle cx="19.5" cy="17" r="4" />
      <path d="M13 28a6.5 6.5 0 0 1 13 0M12 33h10M12 37h7" />
      <g className="si-pop">
        <path className="fill-surface" d="M35 24l9 3.5v6.5c0 5.5-4 8.5-9 10-5-1.5-9-4.5-9-10v-6.5z" />
        <path className="si-tick" pathLength={1} d="M31 34l3 3 5.5-5.5" />
      </g>
    </>
  ),
  // the mortarboard bobbing, its tassel swinging
  degree: (
    <g className="si-bob">
      <path d="M3 18L24 9l21 9-21 9z" />
      <path d="M12 22v8c0 3 5 6 12 6s12-3 12-6v-8" />
      <path d="M24 18l13 4" />
      <g className="si-swing">
        <path d="M37 22v12" />
        <rect className="fill-current" x="35.5" y="34" width="3" height="7" rx="1" />
      </g>
    </g>
  ),
  // a picture with a person on a backdrop, sparkling
  background: (
    <>
      <rect x="6" y="9" width="36" height="30" rx="2" />
      <circle className="si-glow" cx="34" cy="17" r="3" />
      <path d="M22 39l9-10 11 10" />
      <circle cx="18" cy="23" r="4.5" />
      <path d="M9 39c0-6 4-9.5 9-9.5s9 3.5 9 9.5" />
      <path className="si-twinkle" d="M6 .5q.8 3.7 4.5 4.5Q6.8 5.8 6 9.5 5.2 5.8 1.5 5 5.2 4.2 6 .5z" />
      <path d="M9 44h6M19 44h14" />
    </>
  ),
  // the camera snapping, a photo fanning out behind it
  photo: (
    <>
      <g className="si-fan">
        <rect x="7" y="5" width="22" height="16" rx="2" />
        <path d="M10 18l5-5 4 4 3-3 4 4" />
      </g>
      <g className="si-snap">
        <path className="fill-surface" d="M10 22a4 4 0 0 1 4-4h4l3-4h10l3 4h4a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z" />
        <circle cx="26" cy="30" r="7" />
        <circle className="si-shutter" cx="26" cy="30" r="3.5" />
        <circle className="fill-current" cx="37" cy="23" r="1" />
      </g>
      <path className="si-flash" d="M43 9l3-3M44 14h4M39 6V2" />
    </>
  ),
  // a phone scanning the QR code
  result: (
    <>
      {[
        [3, 7],
        [3, 19],
        [11, 13],
      ].map(([x, y], i) => (
        <rect
          key={i}
          className="si-blink"
          style={{ animationDelay: `calc(var(--si-delay) + ${i * 0.4}s)` }}
          x={x}
          y={y}
          width={i === 2 ? 4 : 6}
          height={i === 2 ? 4 : 6}
          rx="1"
        />
      ))}
      <rect x="19" y="3" width="20" height="36" rx="3" />
      <path d="M23 11V8h3M35 11V8h-3M23 31v3h3M35 31v3h-3" />
      <path className="si-scan" d="M23 12h12" />
      {/* the hand holding it: fingers over the right edge, the wrist below */}
      <path className="fill-surface" d="M39 23c2.5-.5 5 1 5 3.5V36c0 3-1.5 5.5-4 7v3h-6v-4.5" />
      <path d="M39 28h-2M39 32.5h-2M33 46h9" />
    </>
  ),
}

export interface StepIconProps {
  name: StepIconName
  /** When to start moving: once the card has floated in. */
  delayMs?: number
  className?: string
}

export function StepIcon({ name, delayMs = 0, className }: StepIconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{ '--si-delay': `${delayMs}ms` } as CSSProperties}
      className={cn(
        // overflow-visible: the tap's rings spread past the 48×48 box
        'step-icon size-12 overflow-visible fill-none stroke-current stroke-[1.8] text-primary [stroke-linecap:round] [stroke-linejoin:round]',
        className,
      )}
    >
      {ICONS[name]}
    </svg>
  )
}
