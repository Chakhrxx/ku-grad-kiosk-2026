import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FacultyTile } from './FacultyTile'

describe('FacultyTile', () => {
  it('calls onSelect when tapped', async () => {
    const onSelect = vi.fn()
    render(<FacultyTile label="Faculty of Engineering" onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: 'Faculty of Engineering' }))
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('hides the image when the asset is missing', () => {
    const { container } = render(<FacultyTile label="Engineering" imageSrc="/missing.png" onSelect={() => {}} />)
    const img = container.querySelector('img')!
    fireEvent.error(img)
    expect(img).toHaveStyle({ visibility: 'hidden' })
  })
})
