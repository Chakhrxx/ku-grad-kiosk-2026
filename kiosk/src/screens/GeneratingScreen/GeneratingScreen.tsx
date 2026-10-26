import { useEffect, useState } from 'react'
import { Screen, Spinner } from '@/components'
import { useI18n } from '@/hooks/useI18n'
import { useKiosk } from '@/hooks/useKiosk'

/** The VIEW_W×VIEW_H viewfinder's shape, which the dressed preview has. */
const PREVIEW_ASPECT = '554 / 680'
/** How long each line of the waiting text stays before the next. */
const LINE_MS = 3500
/** Two waves across a 400-wide strip, so sliding it half its width loops seamlessly. */
const WAVE = 'M0 20Q50 4 100 20T200 20T300 20T400 20V40H0Z'

/**
 * While the photo is made. In gen mode the visitor already dressed (still in the room) shows as soon as it is
 * ready, so the wait for the scene to go on has something to look at; the finished photo replaces it.
 */
export function GeneratingScreen() {
  const { t } = useI18n()
  const { preview } = useKiosk()
  const [line, setLine] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setLine((n) => n + 1), LINE_MS)
    return () => clearInterval(id)
  }, [])

  if (!preview) {
    const text = t.generating[line % t.generating.length]
    return (
      <Screen align="centered" className="gap-10">
        <WaterLoader label={text} />
        {/* keyed, so each new line drifts in */}
        <p key={line} className="animate-text-in text-xl font-semibold text-primary motion-reduce:animate-none">
          {text}
        </p>
      </Screen>
    )
  }

  return (
    <Screen align="centered">
      <figure
        className="relative w-115 animate-sheet-in overflow-hidden rounded-card shadow-card motion-reduce:animate-none"
        style={{ aspectRatio: PREVIEW_ASPECT }}
      >
        <img src={preview} alt="" className="size-full object-cover" />
        <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-linear-to-t from-primary/85 to-transparent px-6 pt-20 pb-6">
          <Spinner className="size-7 border-4 border-white/40 border-t-white" />
          <span className="text-lg font-semibold text-on-selected">{t.generatingScene}</span>
        </figcaption>
      </figure>
    </Screen>
  )
}

/**
 * A round bottle slowly filling with sea water, waves rolling on its surface: it rises quickly at first, then ever
 * more slowly, so there is always movement without ever claiming to be done.
 */
function WaterLoader({ label }: { label: string }) {
  return (
    <div
      role="progressbar"
      aria-busy="true"
      aria-label={label}
      className="relative size-64 overflow-hidden rounded-full bg-white/35 shadow-[0_0_48px_10px_rgb(255_255_255/0.55)] ring-1 ring-white/70"
    >
      <div className="absolute inset-0 animate-water-fill motion-reduce:translate-y-1/2 motion-reduce:animate-none">
        {/* a paler swell behind, rolling slower, and the water's own surface in front */}
        <svg
          viewBox="0 0 400 40"
          preserveAspectRatio="none"
          className="absolute bottom-full left-0 h-11 w-[200%] animate-wave-roll fill-[#2a8a83]/35 [animation-delay:-1.3s] [animation-duration:5s] motion-reduce:animate-none"
        >
          <path d={WAVE} />
        </svg>
        <svg
          viewBox="0 0 400 40"
          preserveAspectRatio="none"
          className="absolute bottom-[calc(100%-1px)] left-0 h-8 w-[200%] animate-wave-roll fill-[#2a8a83] motion-reduce:animate-none"
        >
          <path d={WAVE} />
        </svg>
        {/* lighter at the surface, deeper below, like the sea */}
        <div className="size-full bg-linear-to-b from-[#2a8a83] to-primary" />
      </div>
    </div>
  )
}
