/** Design frame from Figma; the stage scales it to the real screen. */
export const DESIGN_WIDTH = 720
export const DESIGN_HEIGHT = 1280

/** Back to home after this long untouched. */
export const IDLE_TIMEOUT_MS = 60_000
/** Home touched, then left alone this long: Start goes again, leaving the screen to its motion. */
export const HOME_ENGAGED_IDLE_MS = 20_000
/** After "Don't allow" on the consent, How to Join waits this long untouched (for Next again) before going home. */
export const DECLINED_TIMEOUT_MS = 10_000

/** First photo + 2 retakes. Every shot is a paid AI call. */
export const MAX_SHOTS = 3

export const COUNTDOWN_SECONDS = 5

/** Background music level (0–1) under the countdown and shutter; tune on site to the room and speakers. */
export const BG_VOLUME = 0.5

/** Degree whose gowns the faculty tiles show before one is picked, as in the design. */
export const DEFAULT_LEVEL = 'bachelor'

/**
 * How to Join: each card takes STEP_REVEAL_DURATION_MS to float up and starts STEP_REVEAL_STAGGER_MS after
 * the previous one, overlapping so they flow up as a cascade. Inside it the icon bobs up STEP_ICON_IN_MS after
 * the card starts, then the title and text slide in from STEP_TEXT_IN_MS; NEXT unlocks once the last text is in.
 */
export const STEP_REVEAL_STAGGER_MS = 600
export const STEP_REVEAL_DURATION_MS = 1300
export const STEP_ICON_IN_MS = 400
export const STEP_TEXT_IN_MS = 700
/** How long the icon's bob and the text's drift each take (global.css icon-in, text-in). */
export const STEP_PART_IN_DURATION_MS = 750


/** The finished photo: 2:3, a 4×6" print, as in the design. */
export const PHOTO_WIDTH = 1080
export const PHOTO_HEIGHT = 1620
