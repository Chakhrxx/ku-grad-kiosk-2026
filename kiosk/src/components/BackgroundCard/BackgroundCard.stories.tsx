import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { BackgroundCard } from './BackgroundCard'

const meta = {
  title: 'Components/BackgroundCard',
  component: BackgroundCard,
  args: { label: 'ถนนดอกชมพูพันธุ์ทิพย์', imageSrc: '/assets/backgrounds/chomphu-road.jpg', onSelect: fn() },
} satisfies Meta<typeof BackgroundCard>

export default meta
type Story = StoryObj<typeof meta>

/** Shows the photo when it exists, otherwise the place name. */
export const Default: Story = {}
