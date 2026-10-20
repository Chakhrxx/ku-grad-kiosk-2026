import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface PanelProps {
  /** Heading at the top of the panel; omit for none. */
  title?: string
  className?: string
  children: ReactNode
}

/** Frosted glass panel below the choices; runs down behind the Next button, as in the design. */
export function Panel({ title, className, children }: PanelProps) {
  return (
    <section
      className={cn(
        'absolute top-89.25 right-7.5 bottom-7.25 left-7.5 flex flex-col items-center rounded-[28px] pt-10.5',
        'bg-white/45 shadow-[0_8px_30px_rgb(0_60_57/0.12)] ring-1 ring-white/70 backdrop-blur-[2px]',
        className,
      )}
    >
      {title && <p className="text-xl font-semibold text-primary">{title}</p>}
      {children}
    </section>
  )
}
