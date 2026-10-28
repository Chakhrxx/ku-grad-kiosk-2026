import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { Button } from '../Button/Button'
import { Modal } from './Modal'

const meta = {
  title: 'Components/Modal',
  component: Modal,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="relative h-320 w-180"><Story /></div>],
  args: {
    title: 'Consent to the Collection, Use and Disclosure of Personal Data',
    onClose: fn(),
    children: <p>Your photo is kept for 7 days, then deleted automatically.</p>,
  },
} satisfies Meta<typeof Modal>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithFooter: Story = {
  args: { footer: <Button>Next</Button> },
}
