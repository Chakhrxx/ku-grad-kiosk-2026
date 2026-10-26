import { cn } from '@/lib/cn'

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      role="progressbar"
      aria-busy="true"
      className={cn('size-24 animate-spin rounded-full border-8 border-primary-soft border-t-primary', className)}
    />
  )
}
