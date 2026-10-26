import bgUrl from '@/assets/sounds/bg.m4a'
import countdownUrl from '@/assets/sounds/countdown.m4a'
import shutterUrl from '@/assets/sounds/shutter.m4a'
import { BG_VOLUME, TAP_VOLUME } from '@/config'

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

let audio: AudioContext | undefined

/**
 * A button's tap: a water drop, a sine gliding up and gone in a tenth of a second.
 * ponytail: synthesized until there is a recorded one; swap for a cue like the others then.
 */
export function playTap() {
  audio ??= new AudioContext() // made on a tap, so the browser lets it run
  const t = audio.currentTime
  const drop = audio.createOscillator()
  const level = audio.createGain()
  drop.frequency.setValueAtTime(500, t)
  drop.frequency.exponentialRampToValueAtTime(1300, t + 0.07)
  level.gain.setValueAtTime(0.0001, t)
  level.gain.exponentialRampToValueAtTime(TAP_VOLUME, t + 0.01)
  level.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
  drop.connect(level).connect(audio.destination)
  drop.start(t)
  drop.stop(t + 0.1)
}
