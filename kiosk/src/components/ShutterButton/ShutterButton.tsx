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

/** The round camera shutter: a white ring around teal aperture blades, sinking when pressed. */
export function ShutterButton({ label, onClick, disabled = false, className }: ShutterButtonProps) {
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
        <circle cx="50" cy="50" r="45" fill="#6fadaa" stroke="white" strokeWidth="7" />
        {BLADES.map((l, i) => (
          <line key={i} {...l} stroke="white" strokeWidth="3" />
        ))}
      </svg>
    </button>
  )
}
