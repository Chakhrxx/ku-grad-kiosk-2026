import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Testing Library only auto-cleans when vitest globals are on; we import explicitly instead
afterEach(cleanup)

// jsdom has no media playback
HTMLMediaElement.prototype.play = () => Promise.resolve()
