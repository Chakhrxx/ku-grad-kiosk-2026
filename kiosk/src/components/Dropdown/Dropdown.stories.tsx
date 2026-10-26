import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { getSolution, SOLUTIONS } from '@/lib/solution'
import { Dropdown } from './Dropdown'

const meta = {
  title: 'Components/Dropdown',
  component: Dropdown,
} satisfies Meta<typeof Dropdown>

export default meta
type Story = StoryObj<typeof meta>

function SolutionSwitch() {
  const [value, setValue] = useState(getSolution)
  return (
    <div className="flex h-80 justify-end p-6">
      <Dropdown caption="Solution · test" options={SOLUTIONS} value={value} onChange={setValue} />
    </div>
  )
}

/** The home screen's solution switch; tap it to open the menu. */
export const SolutionPicker: Story = {
  args: { caption: 'Solution · test', options: SOLUTIONS, value: 'stream', onChange: () => {} },
  render: () => <SolutionSwitch />,
}
