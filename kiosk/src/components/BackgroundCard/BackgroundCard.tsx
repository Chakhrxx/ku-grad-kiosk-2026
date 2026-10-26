import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import { hideBrokenImage } from '@/lib/hideBrokenImage'

export interface BackgroundCardProps {
  label: string
  imageSrc: string
  selected?: boolean
  onSelect: () => void
  className?: string
  /** Position in the carousel, set by the screen. */
  style?: CSSProperties
}

/** A campus backdrop photo card. Until the photo exists, its name shows on a pale card instead. */
export function BackgroundCard({ label, imageSrc, selected = false, onSelect, className, style }: BackgroundCardProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      style={style}
      className={cn(
        'relative h-119.25 w-83.75 overflow-hidden rounded-card bg-primary-soft shadow-[0_10px_30px_rgb(0_60_57/0.25)]',
        className,
      )}
    >
      <span className="absolute inset-0 grid place-items-center p-6 text-lg font-semibold text-primary">{label}</span>
      <img src={imageSrc} alt="" onError={hideBrokenImage} className="relative size-full object-cover" />
    </button>
  )
}
