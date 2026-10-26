import type { Meta, StoryObj } from '@storybook/react-vite'
import { StepIcon, type StepIconName } from './StepIcon'

const meta = {
  title: 'Components/StepIcon',
  component: StepIcon,
  args: { name: 'start' },
} satisfies Meta<typeof StepIcon>

export default meta
type Story = StoryObj<typeof meta>

const NAMES: StepIconName[] = ['start', 'instructions', 'pdpa', 'degree', 'background', 'photo', 'result']

/** All seven, moving, as on the How to Join screen. */
export const All: Story = {
  render: () => (
    <div className="flex gap-8 rounded-card bg-linear-to-b from-white to-primary-soft p-8">
      {NAMES.map((name) => (
        <StepIcon key={name} name={name} className="size-16" />
      ))}
    </div>
  ),
}
