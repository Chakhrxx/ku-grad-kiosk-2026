import { Button, Screen } from '@/components'
import { useI18n } from '@/hooks/useI18n'
import { useKiosk } from '@/hooks/useKiosk'
import { KioskHeader } from '../shared/KioskHeader'

export function ResultScreen() {
  const { t, name } = useI18n()
  const { result, outfit, canRetake, goTo, reset } = useKiosk()
  if (!result) return null

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
      <img src={result.image} alt="" className="aspect-9/16 h-150 rounded-card bg-primary-soft object-cover shadow-lg" />
      {outfit && <p className="text-title font-bold text-primary">{name(outfit)}</p>}
      <p className="-mt-3 text-xs font-medium text-primary">{t.result.caption}</p>
      <div className="flex items-center gap-5">
        <img src={result.qr} alt="QR code" className="size-35 rounded-xl bg-white p-2" />
        <p className="max-w-55 text-xs leading-snug font-bold text-primary">{t.result.scan}</p>
      </div>
    </Screen>
  )
}
