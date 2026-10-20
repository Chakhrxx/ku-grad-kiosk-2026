import { Header } from '@/components'
import { useI18n } from '@/hooks/useI18n'
import { useKiosk } from '@/hooks/useKiosk'
import type { Step } from '@/types'

export interface KioskHeaderProps {
  title: string
  subtitle?: string
  /** Step the back chevron goes to; no chevron when omitted. */
  back?: Step
  /** Show the home icon, which ends the session. */
  showHome?: boolean
  className?: string
}

/** Header wired to the kiosk flow and the current language. */
export function KioskHeader({ title, subtitle, back, showHome = false, className }: KioskHeaderProps) {
  const { t } = useI18n()
  const { goTo, reset } = useKiosk()
  return (
    <Header
      title={title}
      subtitle={subtitle}
      onBack={back && (() => goTo(back))}
      onHome={showHome ? reset : undefined}
      backLabel={t.actions.back}
      homeLabel={t.actions.home}
      className={className}
    />
  )
}
