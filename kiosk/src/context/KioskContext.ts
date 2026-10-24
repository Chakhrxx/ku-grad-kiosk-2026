import { createContext } from 'react'
import type { Catalog, CatalogItem, ErrorCode, PhotoResult, Step } from '@/types'

/** One visitor's walk through the kiosk: what they picked and where they are. */
export interface KioskValue {
  step: Step
  catalog?: Catalog
  level: string
  item: string
  background: string
  /** The faculty or outfit picked, for display. */
  outfit?: CatalogItem
  result?: PhotoResult
  /** vton-batch: the same visitor where they really stood (`result` has them in the middle of the scene). */
  alternate?: PhotoResult
  /** Gen mode: the visitor already dressed (still in the room), shown while the scene goes on; an object URL. */
  preview?: string
  error: ErrorCode
  canRetake: boolean
  /** The visitor said "Don't allow" and is back on How to Join, free to tap Next again. */
  consentDeclined: boolean

  start: () => void
  goTo: (step: Step) => void
  answerConsent: (agreed: boolean) => void
  selectLevel: (id: string) => void
  selectItem: (id: string) => void
  selectBackground: (id: string) => void
  /** Current visitor's session id (for the try-on stream token). */
  session: string
  /**
   * The finished photo from the camera screen (or two: in the middle of the scene, then where they really stood);
   * a promise shows the generating screen while it is made.
   */
  shoot: (photo: Blob | Promise<Blob | [Blob, Blob]>) => void
  /** Show `photo` on the generating screen until the finished one is ready. */
  showPreview: (photo: Blob) => void
  fail: (code: ErrorCode) => void
  retry: () => void
  reset: () => void
}

export const KioskContext = createContext<KioskValue | null>(null)
