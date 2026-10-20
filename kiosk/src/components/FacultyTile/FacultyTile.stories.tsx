import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { FacultyTile } from './FacultyTile'

const meta = {
  title: 'Components/FacultyTile',
  component: FacultyTile,
  args: { label: 'Faculty of Engineering', selected: false, onSelect: fn() },
} satisfies Meta<typeof FacultyTile>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Selected: Story = {
  args: { selected: true },
}

export const LongThaiName: Story = {
  args: { label: 'คณะศึกษาศาสตร์และพัฒนศาสตร์' },
}

export const MissingImage: Story = {
  args: { imageSrc: '/does-not-exist.png' },
}
