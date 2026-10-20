import { cn } from '@/lib/cn'
import { hideBrokenImage } from '@/lib/hideBrokenImage'

export interface FacultyTileProps {
  label: string
  /** Person-in-gown PNG; hidden when missing. */
  imageSrc?: string
  selected?: boolean
  onSelect: () => void
}

/**
 * A raised 3D tile with the gowned figures standing on it, taller than the tile as in the design.
 * Picked, it sinks and turns teal while the figures pop slightly, never reaching the tile above.
 */
export function FacultyTile({ label, imageSrc, selected = false, onSelect }: FacultyTileProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        'relative flex h-24.25 w-58.75 items-center rounded-tile pr-2.5 pl-22.5 text-left text-label leading-tight',
        'bg-linear-to-b from-white to-[#eaf2f1] text-ink-muted shadow-key transition-[translate,box-shadow] duration-150',
        'active:translate-y-1 active:shadow-key-pressed',
        selected && 'translate-y-1 bg-primary bg-none text-on-selected shadow-key-pressed',
      )}
    >
      {imageSrc && (
        <img
          key={imageSrc}
          src={imageSrc}
          alt=""
          onError={hideBrokenImage}
          className={cn(
            'absolute bottom-1.5 left-3 h-27 w-auto max-w-none origin-bottom',
            'transition-[scale,translate] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
            // a small pop that stays clear of the tile above (rows are 28px apart)
            selected && 'scale-106',
          )}
        />
      )}
      <span>{label}</span>
    </button>
  )
}
