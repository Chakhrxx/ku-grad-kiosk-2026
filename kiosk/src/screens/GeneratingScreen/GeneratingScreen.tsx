import { Screen, Spinner } from '@/components'
import { useI18n } from '@/hooks/useI18n'
import { useKiosk } from '@/hooks/useKiosk'

/** The VIEW_W×VIEW_H viewfinder's shape, which the dressed preview has. */
const PREVIEW_ASPECT = '554 / 680'

/**
 * While the photo is made. In gen mode the visitor already dressed (still in the room) shows as soon as it is
 * ready, so the wait for the scene to go on has something to look at; the finished photo replaces it.
 */
export function GeneratingScreen() {
  const { t } = useI18n()
  const { preview } = useKiosk()

  if (!preview)
    return (
      <Screen align="centered" className="gap-10">
        <Spinner />
        <p className="text-xl font-semibold text-primary">{t.generating}</p>
      </Screen>
    )

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
