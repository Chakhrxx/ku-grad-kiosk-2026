import { createContext } from 'react'
import type { Messages } from '@/i18n'
import type { CatalogItem, Lang } from '@/types'

export interface I18nValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Messages
  /** A catalog entry's name in the current language. */
  name: (item: CatalogItem) => string
}

export const I18nContext = createContext<I18nValue | null>(null)
