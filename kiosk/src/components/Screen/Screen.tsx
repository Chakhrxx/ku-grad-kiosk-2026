import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface ScreenProps {
  header?: ReactNode
  /** Pinned 76px above the bottom edge, where the design puts the main CTA. */
  footer?: ReactNode
  /** centered = content in the middle of the screen (home, status screens). */
  align?: 'top' | 'centered'
  className?: string
  children?: ReactNode
}

/** Full-frame layout every screen sits in. */
export function Screen({ header, footer, align = 'top', className, children }: ScreenProps) {
  return (
    <section className={cn('absolute inset-0 flex flex-col items-center', className)}>
      {header}
      <div className={cn('flex w-full flex-1 flex-col items-center gap-6 pt-6 pb-40', align === 'centered' && 'justify-center')}>
        {children}
      </div>
      {footer && <div className="absolute bottom-19 flex justify-center gap-6">{footer}</div>}
    </section>
  )
}
