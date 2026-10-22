/** Design frame from Figma; the stage scales it to the real screen. */
export const DESIGN_WIDTH = 720
export const DESIGN_HEIGHT = 1280

/** Back to home after this long untouched. */
export const IDLE_TIMEOUT_MS = 60_000

/** First photo + 2 retakes. Every shot is a paid AI call. */
export const MAX_SHOTS = 3

export const COUNTDOWN_SECONDS = 5

/** Degree whose gowns the faculty tiles show before one is picked, as in the design. */
export const DEFAULT_LEVEL = 'bachelor'

/**
 * How to Join: each card takes STEP_REVEAL_DURATION_MS to float up and starts STEP_REVEAL_STAGGER_MS after
 * the previous one, overlapping so they flow up as a cascade; NEXT unlocks once the last has settled.
 */
export const STEP_REVEAL_STAGGER_MS = 350
export const STEP_REVEAL_DURATION_MS = 1000


/** The finished photo: 2:3, a 4×6" print, as in the design. */
export const PHOTO_WIDTH = 1080
export const PHOTO_HEIGHT = 1620
