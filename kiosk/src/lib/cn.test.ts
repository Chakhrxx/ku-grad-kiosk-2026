import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('keeps a font-size token next to a text color', () => {
    expect(cn('text-title', 'text-primary')).toBe('text-title text-primary')
  })

  it('lets a later class override an earlier one', () => {
    expect(cn('w-68', 'w-46.75')).toBe('w-46.75')
  })

  it('swaps one shadow token for another instead of keeping both', () => {
    expect(cn('shadow-key', 'shadow-key-pressed')).toBe('shadow-key-pressed')
  })

  it('skips falsy values', () => {
    expect(cn('a', false, undefined, 'b')).toBe('a b')
  })
})
