import type { Preview } from '@storybook/react-vite'
import '../src/styles/global.css'

const preview: Preview = {
  parameters: {
    layout: 'centered',
    backgrounds: { options: { kiosk: { name: 'Kiosk', value: '#ffffff' } }, initialGlobals: { backgrounds: { value: 'kiosk' } } },
  },
}

export default preview
