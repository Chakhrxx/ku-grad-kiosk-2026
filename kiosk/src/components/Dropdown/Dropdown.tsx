import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

export interface DropdownOption<T extends string> {
  id: T
  label: string
  /** A second, smaller line under the label in the menu. */
  hint?: string
}

export interface DropdownProps<T extends string> {
  /** Small caption above the picked option on the key; also the menu's accessible name. */
  caption: string
  options: DropdownOption<T>[]
  value: T
  onChange: (id: T) => void
  className?: string
}

/**
 * A raised 3D key (the same as Pill's) showing the picked option; tapping it floats a card of options below.
 * The picked one is filled teal with a tick. Closes on a pick, a tap outside, or Escape.
 */
export function Dropdown<T extends string>({ caption, options, value, onChange, className }: DropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const current = options.find((o) => o.id === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-14 w-64 items-center gap-3 rounded-pill pr-4 pl-6 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary',
          'bg-linear-to-b from-white to-[#e6efee] shadow-key transition-[translate,box-shadow] duration-100',
          'active:translate-y-1 active:shadow-key-pressed',
          open && 'translate-y-1 shadow-key-pressed ring-2 ring-primary',
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-[11px] font-semibold tracking-[0.14em] text-ink-muted uppercase">{caption}</span>
          <span className="truncate text-button font-bold text-primary">{current?.label}</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={cn(
            'size-5 shrink-0 fill-none stroke-primary stroke-[2.5] transition-transform duration-200 [stroke-linecap:round] [stroke-linejoin:round]',
            open && 'rotate-180',
          )}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={caption}
          className="absolute top-full right-0 z-20 mt-4 flex w-84 origin-top-right animate-menu-in flex-col gap-1 rounded-card bg-surface p-2 shadow-card motion-reduce:animate-none"
        >
          {options.map((o) => {
            const picked = o.id === value
            return (
              <button
                key={o.id}
                type="button"
                role="menuitemradio"
                aria-checked={picked}
                onClick={() => {
                  onChange(o.id)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-tile px-4 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary',
                  picked ? 'bg-primary text-on-selected' : 'text-primary active:bg-primary-soft',
                )}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-button font-bold">{o.label}</span>
                  {o.hint && (
                    <span className={cn('text-label leading-snug', picked ? 'text-on-primary' : 'text-ink-muted')}>
                      {o.hint}
                    </span>
                  )}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                    picked ? 'border-on-selected bg-on-selected' : 'border-disabled-label',
                  )}
                >
                  {picked && (
                    <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-primary stroke-3 [stroke-linecap:round] [stroke-linejoin:round]">
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
