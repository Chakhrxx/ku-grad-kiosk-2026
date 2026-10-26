import bgUrl from '@/assets/sounds/bg.m4a'
import countdownUrl from '@/assets/sounds/countdown.m4a'
import shutterUrl from '@/assets/sounds/shutter.m4a'
import { BG_VOLUME } from '@/config'

const cues = { countdown: new Audio(countdownUrl), shutter: new Audio(shutterUrl) }
const bg = Object.assign(new Audio(bgUrl), { loop: true, volume: BG_VOLUME })

/** Play a cue from its start. If the browser refuses (no touch yet), the kiosk carries on silently. */
export function playSound(name: keyof typeof cues) {
  const cue = cues[name]
  cue.currentTime = 0
  cue.play().catch(() => {})
}

/** Background music, looped. Chrome only lets sound start from a touch, so main.tsx calls this on each one. */
export function startBackgroundMusic() {
  if (bg.paused) bg.play().catch(() => {})
}
