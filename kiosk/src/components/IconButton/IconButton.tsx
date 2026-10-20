import backIcon from '@/assets/icons/back.png'
import homeIcon from '@/assets/icons/home.png'
import { cn } from '@/lib/cn'

/** Icons exported from Figma, at their size in the design. */
const images = {
  back: { src: backIcon, className: 'h-9.75' },
  home: { src: homeIcon, className: 'size-8.75' },
}

// ponytail: no Figma export for the close × yet, so it stays a drawn line icon
const paths = {
  close: 'M5 5l14 14M19 5 5 19',
}

export interface IconButtonProps {
  icon: keyof typeof images | keyof typeof paths
  /** Accessible name, since the button has no text. */
  label: string
  onClick: () => void
  className?: string
}

export function IconButton({ icon, label, onClick, className }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn('flex size-11 items-center justify-center', className)}
    >
      {icon === 'close' ? (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-full fill-none stroke-primary stroke-2 [stroke-linecap:round] [stroke-linejoin:round] [&_path]:[vector-effect:non-scaling-stroke]"
        >
          <path d={paths[icon]} />
        </svg>
      ) : (
        <img src={images[icon].src} alt="" className={cn('w-auto', images[icon].className)} />
      )}
    </button>
  )
}
