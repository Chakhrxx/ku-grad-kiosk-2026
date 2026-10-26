import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { playTap, startBackgroundMusic } from './lib/sound'
import './styles/global.css'

// kiosk: no long-press menu
addEventListener('contextmenu', (e) => e.preventDefault())
// on every lift, not once: a touch only lets sound play from pointerup, and a refused try must not be the last
addEventListener('pointerup', startBackgroundMusic)
// a drop for every button, in one place; capture, so a button that stops the click still sounds
addEventListener('click', (e) => (e.target as Element).closest?.('button:not([data-silent])') && playTap(), true)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
