import type { Meta, StoryObj } from '@storybook/react-vite'
import { Stage } from '../Stage/Stage'
import { Panel } from './Panel'

const meta = {
  title: 'Layout/Panel',
  component: Panel,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div className="h-screen bg-black">
        <Stage>
          <Story />
        </Stage>
      </div>
    ),
  ],
  args: { title: 'Your success story is from..', children: <p className="mt-8 text-ink-muted">Panel content</p> },
} satisfies Meta<typeof Panel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
