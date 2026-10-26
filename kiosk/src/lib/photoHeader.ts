import kuLogo from '@/assets/ku-logo.png'

type Text = { font: string; x: number; y: number }
/** Where everything in the header goes, in px of a 1080-wide photo (text at its baseline, the date right-aligned). */
export interface HeaderLayout {
  logo: { x: number; y: number; height: number }
  title: Text
  campus: Text
  date: Text
}

// Measured on the design's result photos
/** The campus scenes: the Thai place name beside the logo, the date level with it. */
export const PLACE_HEADER: HeaderLayout = {
  logo: { x: 42, y: 47, height: 124 },
  title: { font: '700 48px "Noto Sans Thai", sans-serif', x: 184, y: 89 },
  campus: { font: '400 25px Inter, sans-serif', x: 184, y: 134 },
  date: { font: '300 24px Inter, sans-serif', x: 1022, y: 76 },
}
/** The KU scene: KASETSART UNIVERSITY, a larger logo, the date small above. */
export const UNIVERSITY_HEADER: HeaderLayout = {
  logo: { x: 60, y: 58, height: 130 },
  title: { font: '600 43px Inter, sans-serif', x: 209, y: 108 },
  campus: { font: '300 27px Inter, sans-serif', x: 208, y: 150 },
  date: { font: '300 18px Inter, sans-serif', x: 1036, y: 55 },
}
const COLOR = '#006c67'
/** Solid white down to here, then fading into the scene by FADE_END. */
const WHITE_END = 170
const FADE_END = 640
/** Without the full fade, the white still eases out over this much, so it never cuts across the scene in a line. */
const FEATHER = 36

let logo: Promise<HTMLImageElement> | undefined
function loadLogo() {
  logo ??= (async () => {
    const img = new Image()
    img.src = kuLogo
    await img.decode()
    return img
  })()
  return logo
}

/** "25 September 2026", the day in Thailand. */
export const photoDate = (d = new Date()) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok' }).format(d)

/**
 * The header's white, solid under it and fading into the scene; drawn under the visitor so their head stays clear.
 * Solid from the very top, not just from where the fade starts: a scene showing above it would leave a hard edge
 * that the try-on model smudges into a coloured line just under the header.
 */
export function drawHeaderFade(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.scale(ctx.canvas.width / 1080, ctx.canvas.width / 1080)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, 1080, WHITE_END)
  const fade = ctx.createLinearGradient(0, WHITE_END, 0, FADE_END)
  fade.addColorStop(0, 'rgba(255, 255, 255, 1)')
  fade.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = fade
  ctx.fillRect(0, WHITE_END, 1080, FADE_END - WHITE_END)
  ctx.restore()
}

/**
 * The photo's header: white fading into the scene, KU logo, title (the place), campus and date.
 * `fade: false` leaves the fade out, for a photo that drew it under the visitor already (drawHeaderFade).
 */
export async function drawPhotoHeader(
  ctx: CanvasRenderingContext2D,
  layout: HeaderLayout,
  title: string,
  date: string,
  { fade = true } = {},
) {
  const { logo: at, title: t, campus: c, date: d } = layout
  const [img] = await Promise.all([
    loadLogo(),
    document.fonts.load(t.font, title),
    document.fonts.load(c.font),
    document.fonts.load(d.font, date),
  ])
  ctx.save()
  ctx.scale(ctx.canvas.width / 1080, ctx.canvas.width / 1080)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, 1080, WHITE_END)
  if (!fade) {
    const feather = ctx.createLinearGradient(0, WHITE_END, 0, WHITE_END + FEATHER)
    feather.addColorStop(0, 'rgba(255, 255, 255, 1)')
    feather.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = feather
    ctx.fillRect(0, WHITE_END, 1080, FEATHER)
  }
  ctx.restore()
  if (fade) drawHeaderFade(ctx)
  ctx.save()
  ctx.scale(ctx.canvas.width / 1080, ctx.canvas.width / 1080)

  ctx.drawImage(img, at.x, at.y, (at.height * img.naturalWidth) / img.naturalHeight, at.height)
  ctx.fillStyle = COLOR
  ctx.textBaseline = 'alphabetic'
  ctx.font = t.font
  ctx.fillText(title, t.x, t.y, 600) // squeezed rather than running into the date
  ctx.font = c.font
  ctx.fillText('KAMPHAENG SAEN CAMPUS', c.x, c.y)
  ctx.font = d.font
  ctx.textAlign = 'right'
  ctx.fillText(date, d.x, d.y)
  ctx.restore()
}
