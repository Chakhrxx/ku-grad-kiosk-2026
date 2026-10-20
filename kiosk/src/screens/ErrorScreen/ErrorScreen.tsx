import { Button, Screen } from '@/components'
import { useI18n } from '@/hooks/useI18n'
import { useKiosk } from '@/hooks/useKiosk'

export function ErrorScreen() {
  const { t } = useI18n()
  const { error, retry, reset } = useKiosk()

  return (
    <Screen
      align="centered"
      footer={
        <>
          <Button variant="secondary" onClick={retry}>
            {t.actions.tryAgain}
          </Button>
          <Button variant="secondary" onClick={reset}>
            {t.actions.home}
          </Button>
        </>
      }
    >
      <p role="alert" className="max-w-140 text-center text-xl font-semibold text-primary">
        {t.errors[error]}
      </p>
    </Screen>
  )
}
