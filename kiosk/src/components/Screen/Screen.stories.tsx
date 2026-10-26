import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../Button/Button'
import { Header } from '../Header/Header'
import { Stage } from '../Stage/Stage'
import { Screen } from './Screen'

const meta = {
  title: 'Layout/Screen',
  component: Screen,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="h-screen bg-black"><Stage><Story /></Stage></div>],
  args: {
    header: <Header title="How to Join" />,
    footer: <Button>Next</Button>,
    children: <p className="text-primary">Screen content</p>,
  },
} satisfies Meta<typeof Screen>

export default meta
type Story = StoryObj<typeof meta>

export const Top: Story = {}

export const Centered: Story = {
  args: { align: 'centered', header: undefined },
}
