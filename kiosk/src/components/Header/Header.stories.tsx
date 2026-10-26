import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { Header } from './Header'

const meta = {
  title: 'Components/Header',
  component: Header,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="w-180"><Story /></div>],
  args: { title: 'Which Faculty Represents Your Success', subtitle: 'Choose your faculty' },
} satisfies Meta<typeof Header>

export default meta
type Story = StoryObj<typeof meta>

export const TitleOnly: Story = {
  args: { subtitle: undefined, title: 'How to Join' },
}

export const WithNavigation: Story = {
  args: { onBack: fn(), onHome: fn() },
}
