import type { Catalog } from '@/types'

/** Where catalog-driven images live on the backend (see backend/assets/README.md). */
export const tileUrl = (level: string, id: string) => `/assets/tiles/${level}/${id}.png`
export const backgroundUrl = (id: string) => `/assets/backgrounds/${id}.jpg`

/** Every image the choose-grade and preview screens will show. */
export function catalogImageUrls(catalog: Catalog): string[] {
  const tiles = catalog.levels.flatMap((level) =>
    (level.id === 'others' ? catalog.others : catalog.faculties).map((f) => tileUrl(level.id, f.id)),
  )
  return [...tiles, ...catalog.backgrounds.map((b) => backgroundUrl(b.id))]
}

/** Warm the browser cache so screens show their images without a visible load. Missing files are ignored. */
export function preloadImages(urls: string[]) {
  for (const url of urls) new Image().src = url
}
