import type { Meta, StoryObj } from '@storybook/react-vite'
import { I18nProvider } from '@/context/I18nProvider'
import { KioskContext, type KioskValue } from '@/context/KioskContext'
import { GeneratingScreen } from './GeneratingScreen'

const meta = {
  title: 'Screens/GeneratingScreen',
  component: GeneratingScreen,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <I18nProvider>
        <KioskContext value={{ background: 'chomphu-road' } as unknown as KioskValue}>
          <div className="relative h-320 w-180 bg-kiosk">
            <Story />
          </div>
        </KioskContext>
      </I18nProvider>
    ),
  ],
} satisfies Meta<typeof GeneratingScreen>

export default meta
type Story = StoryObj<typeof meta>

/** The waiting screen: the orb turns on its own, nothing to touch. */
export const Default: Story = {}
