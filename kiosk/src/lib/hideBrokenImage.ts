import type { SyntheticEvent } from 'react'

/** Assets arrive later; a missing file disappears instead of showing a broken-image icon. */
export function hideBrokenImage(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.visibility = 'hidden'
}
