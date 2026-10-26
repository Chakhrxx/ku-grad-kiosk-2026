import { describe, expect, it } from 'vitest'
import { photoDate } from './photoHeader'

describe('photoDate', () => {
  it('is the day in Thailand, written out as in the design', () => {
    expect(photoDate(new Date('2026-09-25T10:00:00+07:00'))).toBe('25 September 2026')
    expect(photoDate(new Date('2026-09-25T18:30:00Z'))).toBe('26 September 2026') // already the 26th in Bangkok
  })
})
