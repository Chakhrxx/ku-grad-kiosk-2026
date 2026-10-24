import { useId } from 'react'
import { cn } from '@/lib/cn'

export interface ShutterButtonProps {
  /** Accessible name, since the button has no text. */
  label: string
  onClick: () => void
  disabled?: boolean
  className?: string
}

// ponytail: drawn aperture in the design's colours; swap for the shutter icon exported from Figma
// Aperture: each side of a small central hexagon runs on out to the rim, like overlapping blades
const HEX = Array.from({ length: 6 }, (_, k) => {
  const a = (k * Math.PI) / 3 + Math.PI / 6
  return [50 + 13 * Math.cos(a), 50 + 13 * Math.sin(a)]
})
const BLADES = HEX.map(([x1, y1], k) => {
  const [nx, ny] = HEX[(k + 1) % 6]
  const len = Math.hypot(nx - x1, ny - y1)
  const [dx, dy] = [(nx - x1) / len, (ny - y1) / len]
  // distance along the edge's direction from the hexagon vertex to the rim (radius 41 around the centre)
  const [px, py] = [x1 - 50, y1 - 50]
  const b = px * dx + py * dy
  const t = -b + Math.sqrt(b * b - (px * px + py * py - 41 * 41))
  return { x1, y1, x2: x1 + dx * t, y2: y1 + dy * t }
})

/** Four waves across a 200-wide strip, so sliding it one wave (50) along loops seamlessly. */
const WAVE = 'M0 60Q12.5 53 25 60T50 60T75 60T100 60T125 60T150 60T175 60T200 60V100H0Z'

/**
 * The round camera shutter: a white ring around teal aperture blades turning slowly like a whirlpool, over water
 * whose waves roll across the lower half; sinks when pressed.
 */
export function ShutterButton({ label, onClick, disabled = false, className }: ShutterButtonProps) {
  const clip = useId()
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'size-28.75 rounded-full drop-shadow-[0_6px_10px_rgb(0_60_57/0.25)] transition-transform duration-150',
        'active:scale-95 disabled:opacity-50',
        className,
      )}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true" className="size-full">
        <clipPath id={clip}>
          <circle cx="50" cy="50" r="45" />
        </clipPath>
        <circle cx="50" cy="50" r="45" fill="#6fadaa" />
        <g clipPath={`url(#${clip})`}>
          <path d={WAVE} fill="#3f9692" className="animate-shutter-wave motion-reduce:animate-none" />
        </g>
        <g style={{ transformOrigin: '50px 50px' }} className="animate-shutter-turn motion-reduce:animate-none">
          {BLADES.map((l, i) => (
            <line key={i} {...l} stroke="white" strokeWidth="3" />
          ))}
        </g>
        <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="7" />
      </svg>
    </button>
  )
}
