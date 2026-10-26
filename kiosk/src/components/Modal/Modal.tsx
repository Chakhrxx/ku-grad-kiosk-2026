import { useId, type ReactNode } from 'react'
import { IconButton } from '../IconButton/IconButton'

export interface ModalProps {
  title: string
  /** Shows a close × when set. */
  onClose?: () => void
  closeLabel?: string
  /** Pinned to the bottom of the sheet, e.g. the NEXT button. */
  footer?: ReactNode
  children: ReactNode
}

/** Sheet over a blurred scrim, as used by the PDPA consent. */
export function Modal({ title, onClose, closeLabel = 'Close', footer, children }: ModalProps) {
  const titleId = useId()
  return (
    <div className="absolute inset-0 grid animate-scrim-in place-items-center bg-scrim backdrop-blur-[2px] motion-reduce:animate-none">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex min-h-180 w-138.75 animate-sheet-in flex-col rounded-modal motion-reduce:animate-none bg-surface px-16.5 pt-18 pb-16.75"
      >
        {onClose && (
          <IconButton icon="close" label={closeLabel} onClick={onClose} className="absolute top-7 right-7" />
        )}
        <h2 id={titleId} className="text-center text-xl font-black text-primary">
          {title}
        </h2>
        <div className="mt-12.5 flex flex-col gap-6 pr-8 text-lg leading-6 text-ink">{children}</div>
        {footer && <div className="mt-auto flex flex-col items-center gap-9 pt-8">{footer}</div>}
      </div>
    </div>
  )
}
