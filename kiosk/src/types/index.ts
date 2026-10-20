export type Lang = 'th' | 'en'

export type Step =
  | 'home'
  | 'howto'
  | 'pdpa'
  | 'grade'
  | 'preview'
  | 'camera'
  | 'generating'
  | 'result'
  | 'error'

export type ErrorCode = 'network' | 'ai' | 'no_person' | 'camera'

export interface HowToStep {
  title: string
  /** One paragraph, or several lines. */
  body: string | string[]
  /** Show `body` lines as a bulleted list. */
  bulleted?: boolean
}

export interface CatalogItem {
  id: string
  th: string
  en: string
}

export interface Catalog {
  levels: CatalogItem[]
  faculties: CatalogItem[]
  others: CatalogItem[]
  backgrounds: CatalogItem[]
}

export interface GenerateRequest {
  session: string
  level: string
  item: string
  background: string
}

export interface PhotoResult {
  id: string
  image: string
  url: string
  qr: string
}
