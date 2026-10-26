import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { IconButton } from './IconButton'

const meta = {
  title: 'Components/IconButton',
  component: IconButton,
  args: { icon: 'back', label: 'Back', onClick: fn() },
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Back: Story = {}

export const Home: Story = {
  args: { icon: 'home', label: 'Home' },
}

export const Close: Story = {
  args: { icon: 'close', label: 'Close' },
}
