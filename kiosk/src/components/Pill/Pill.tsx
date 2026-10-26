import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

// A raised white 3D key that sinks when pressed
const key3d = cn(
  'bg-linear-to-b from-white to-[#e6efee] text-primary shadow-key transition-[translate,box-shadow] duration-100',
  'active:translate-y-1 active:shadow-key-pressed',
)

const variants = {
  // a language switch eases over instead of snapping: the old key rises as the new one sinks in
  lang: cn('flex h-12.75 w-36.5 items-center gap-3 pl-2 text-button', key3d, 'duration-250 ease-out'),
  degree: cn('h-12 w-32.75 text-lg font-medium', key3d),
  place: cn('h-14 w-37.5 px-4 text-sm leading-tight font-medium', key3d),
  choice: cn('h-11.25 w-29.75 text-button', key3d),
}

// A picked key stays pressed in: the language key gains a ring, the others fill teal
const selectedStyles = {
  lang: 'translate-y-1 shadow-key-pressed ring-2 ring-primary',
  degree: 'translate-y-1 bg-primary bg-none text-on-selected shadow-key-pressed',
  place: 'translate-y-1 bg-primary bg-none text-on-selected shadow-key-pressed',
  choice: 'translate-y-1 bg-primary bg-none text-on-selected shadow-key-pressed',
}

export interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** lang = THAI / ENGLISH, degree = Bachelor's…, place = campus backdrop, choice = PDPA Allow / Don't allow. */
  variant: keyof typeof variants
  selected?: boolean
}

/** A toggle in a group: one is selected at a time. Unselected labels use ink-muted, not Figma's failing greys. */
export function Pill({ variant, selected = false, type = 'button', className, ...props }: PillProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        'rounded-pill bg-surface-raised font-semibold text-ink-muted shadow-tile',
        variants[variant],
        selected && selectedStyles[variant],
        className,
      )}
      {...props}
    />
  )
}
