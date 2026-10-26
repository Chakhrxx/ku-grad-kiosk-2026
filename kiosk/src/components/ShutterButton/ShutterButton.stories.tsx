import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ShutterButton } from './ShutterButton'

const meta = {
  title: 'Components/ShutterButton',
  component: ShutterButton,
  parameters: { backgrounds: { initialGlobals: { backgrounds: { value: 'kiosk' } } } },
  args: { label: 'Take photo', onClick: fn() },
} satisfies Meta<typeof ShutterButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Disabled: Story = {
  args: { disabled: true },
}
