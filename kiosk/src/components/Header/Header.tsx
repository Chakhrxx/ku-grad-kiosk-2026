import { cn } from '@/lib/cn'
import { IconButton } from '../IconButton/IconButton'

export interface HeaderProps {
  title: string
  subtitle?: string
  /** Shows the back chevron (top left) when set. */
  onBack?: () => void
  /** Shows the home icon (top right) when set. */
  onHome?: () => void
  backLabel?: string
  homeLabel?: string
  className?: string
}

export function Header({ title, subtitle, onBack, onHome, backLabel = 'Back', homeLabel = 'Home', className }: HeaderProps) {
  return (
    <header className={cn('relative w-full px-30 pt-27.5 text-center', className)}>
      {onBack && <IconButton icon="back" label={backLabel} onClick={onBack} className="absolute top-11 left-11" />}
      {onHome && <IconButton icon="home" label={homeLabel} onClick={onHome} className="absolute top-11 right-11" />}
      <h1 className="text-title leading-tight font-black text-primary">{title}</h1>
      {subtitle && <p className="mt-3 text-subtitle font-semibold text-primary">{subtitle}</p>}
    </header>
  )
}
