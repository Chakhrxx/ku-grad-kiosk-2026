import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { Button } from './Button'

const meta = {
  title: 'Components/Button',
  component: Button,
  args: { children: 'Next', onClick: fn() },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {}

export const PrimaryDisabled: Story = {
  args: { disabled: true },
}

export const Secondary: Story = {
  args: { variant: 'secondary', children: 'RETAKE' },
}

export const Thai: Story = {
  args: { children: 'แตะเพื่อเริ่ม' },
}
