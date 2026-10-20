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
  error: ErrorCode
  canRetake: boolean

  start: () => void
  goTo: (step: Step) => void
  answerConsent: (agreed: boolean) => void
  selectLevel: (id: string) => void
  selectItem: (id: string) => void
  selectBackground: (id: string) => void
  /** Current visitor's session id (for the try-on stream token). */
  session: string
  /** The finished photo from the camera screen. */
  shoot: (photo: Blob) => void
  fail: (code: ErrorCode) => void
  retry: () => void
  reset: () => void
}

export const KioskContext = createContext<KioskValue | null>(null)
