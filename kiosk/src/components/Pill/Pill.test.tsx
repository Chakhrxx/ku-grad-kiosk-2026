import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Pill } from './Pill'

describe('Pill', () => {
  it('exposes its selected state to assistive tech', () => {
    render(
      <>
        <Pill variant="degree" selected>Master's</Pill>
        <Pill variant="degree">Doctoral</Pill>
      </>,
    )
    expect(screen.getByRole('button', { name: "Master's" })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Doctoral' })).toHaveAttribute('aria-pressed', 'false')
  })
})
