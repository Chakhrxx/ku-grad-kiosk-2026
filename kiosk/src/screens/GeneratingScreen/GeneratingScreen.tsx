import { Screen, Spinner } from '@/components'
import { useI18n } from '@/hooks/useI18n'

export function GeneratingScreen() {
  const { t } = useI18n()
  return (
    <Screen align="centered" className="gap-10">
      <Spinner />
      <p className="text-xl font-semibold text-primary">{t.generating}</p>
    </Screen>
  )
}
