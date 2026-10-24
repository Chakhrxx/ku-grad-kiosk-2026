import { Button, Screen } from '@/components'
import { useI18n } from '@/hooks/useI18n'
import { useKiosk } from '@/hooks/useKiosk'
import { cn } from '@/lib/cn'
import { getSolution, SOLUTIONS } from '@/lib/solution'
import type { PhotoResult } from '@/types'
import { KioskHeader } from '../shared/KioskHeader'

export function ResultScreen() {
  const { t, name } = useI18n()
  const { result, alternate, outfit, canRetake, goTo, reset } = useKiosk()
  if (!result) return null
  // ponytail: test-only, while the solutions are compared; delete with the dropdown on the home screen
  const solution = getSolution()
  const solutionLabel = SOLUTIONS.find((o) => o.id === solution)?.label ?? solution
  const batch = solution === 'vton-batch'

  return (
    <Screen
      header={<KioskHeader title={t.result.title} />}
      footer={
        <>
          {canRetake && (
            <Button variant="secondary" onClick={() => goTo('camera')}>
              {t.actions.retake}
            </Button>
          )}
          <Button variant="secondary" onClick={reset}>
            {t.actions.home}
          </Button>
        </>
      }
    >
      {alternate ? (
        // two, each with its own QR, so the visitor keeps whichever they like. vton-batch: on the scene and without
        // it (no cut-out, so every detail of the gown); vton-live: in the middle of the scene and where they stood
        <div className="flex gap-6">
          <Photo photo={result} label={batch ? t.result.withScene : t.result.centred} solution={solutionLabel} small />
          <Photo photo={alternate} label={batch ? t.result.noScene : t.result.asShot} solution={solutionLabel} small />
        </div>
      ) : (
        <Photo photo={result} solution={solutionLabel} />
      )}
      {outfit && <p className="text-title font-bold text-primary">{name(outfit)}</p>}
      <p className="-mt-3 text-xs font-medium text-primary">{t.result.caption}</p>
      {alternate ? (
        <p className="max-w-110 text-center text-xs leading-snug font-bold text-primary">{t.result.scan}</p>
      ) : (
        <div className="flex items-center gap-5">
          <img src={result.qr} alt="QR code" className="size-35 rounded-xl bg-white p-2" />
          <p className="max-w-55 text-xs leading-snug font-bold text-primary">{t.result.scan}</p>
        </div>
      )}
    </Screen>
  )
}

/** One finished photo, tagged with the solution that made it; two-up (`small`) it has its label and QR under it. */
function Photo({ photo, label, solution, small }: { photo: PhotoResult; label?: string; solution: string; small?: boolean }) {
  return (
    <figure className="flex flex-col items-center gap-3">
      <div className="relative">
        <img
          src={photo.image}
          alt=""
          className={cn('aspect-2/3 rounded-card bg-primary-soft object-cover shadow-lg', small ? 'h-102' : 'h-150')}
        />
        {/* which solution made this photo, so test shots can be told apart */}
        <p className="absolute right-3 bottom-3 flex items-center gap-2 rounded-pill bg-primary/85 px-4 py-1.5 text-label font-semibold text-on-selected shadow-md backdrop-blur-sm">
          <span className="text-[11px] tracking-[0.14em] text-on-primary/80 uppercase">Test</span>
          {solution}
        </p>
      </div>
      {label && <figcaption className="text-base font-bold text-primary">{label}</figcaption>}
      {small && <img src={photo.qr} alt={`QR code: ${label}`} className="size-28 rounded-xl bg-white p-2" />}
    </figure>
  )
}
