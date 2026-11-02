import { Button, Screen } from '@/components'
import { useI18n } from '@/hooks/useI18n'
import { useKiosk } from '@/hooks/useKiosk'
import { cn } from '@/lib/cn'
import type { PhotoResult } from '@/types'
import { KioskHeader } from '../shared/KioskHeader'

export function ResultScreen() {
  const { t, name } = useI18n()
  const { result, alternate, outfit, canRetake, goTo, reset } = useKiosk()
  if (!result) return null

  return (
    <Screen
      header={<KioskHeader title={t.result.title} />}
      align="centered"
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
        // two, each with its own QR, so the visitor keeps whichever they like: on the scene, and without it (no
        // cut-out, so every detail of the gown)
        <div className="flex gap-6">
          <Photo photo={result} small />
          <Photo photo={alternate} small />
        </div>
      ) : (
        <Photo photo={result} />
      )}
      {outfit && <p className="text-title font-bold text-primary">{name(outfit)}</p>}
      <p className="-mt-3 text-xs font-medium text-primary">{t.result.caption}</p>
      {alternate ? (
        <p className="max-w-110 text-center text-xs leading-snug font-bold text-primary">{t.result.scan}</p>
      ) : (
        <div className="flex items-center gap-5">
          <img src={result.qr} alt={t.result.qr} className="size-35 rounded-xl bg-white p-2" />
          <p className="max-w-55 text-xs leading-snug font-bold text-primary">{t.result.scan}</p>
        </div>
      )}
    </Screen>
  )
}

/** One finished photo; two-up (`small`) it has its QR under it. */
function Photo({ photo, small }: { photo: PhotoResult; small?: boolean }) {
  const { t } = useI18n()
  return (
    <figure className="flex flex-col items-center gap-3">
      <img
        src={photo.image}
        alt=""
        className={cn('aspect-2/3 rounded-card bg-primary-soft object-cover shadow-lg', small ? 'h-102' : 'h-150')}
      />
      {small && <img src={photo.qr} alt={t.result.qr} className="size-28 rounded-xl bg-white p-2" />}
    </figure>
  )
}
