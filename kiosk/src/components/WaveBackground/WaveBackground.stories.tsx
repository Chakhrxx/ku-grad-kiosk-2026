import type { Meta, StoryObj } from '@storybook/react-vite'
import { Stage } from '../Stage/Stage'
import { WaveBackground } from './WaveBackground'

const meta = {
  title: 'Components/WaveBackground',
  component: WaveBackground,
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
} satisfies Meta<typeof WaveBackground>

export default meta
type Story = StoryObj<typeof meta>

/** Flows on its own; tap to lift the lines. */
export const Animated: Story = {}

export const Still: Story = {
  args: { animated: false },
}
