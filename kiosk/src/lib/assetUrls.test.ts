import { describe, expect, it } from 'vitest'
import { catalogImageUrls } from './assetUrls'

describe('catalogImageUrls', () => {
  it('lists faculty tiles per degree, the others outfits, and every background', () => {
    const urls = catalogImageUrls({
      levels: [
        { id: 'bachelor', th: '', en: '' },
        { id: 'others', th: '', en: '' },
      ],
      faculties: [{ id: 'engineering', th: '', en: '' }],
      others: [{ id: 'mohom', th: '', en: '' }],
      backgrounds: [{ id: 'rice-field', th: '', en: '' }],
    })
    expect(urls).toEqual([
      '/assets/tiles/bachelor/engineering.png',
      '/assets/tiles/others/mohom.png',
      '/assets/backgrounds/rice-field.jpg',
    ])
  })
})
