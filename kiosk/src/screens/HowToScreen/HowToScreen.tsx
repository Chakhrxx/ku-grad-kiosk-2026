import { useEffect, useState } from 'react'
import { Button, Screen, StepIcon, type StepIconName } from '@/components'
import {
  DECLINED_TIMEOUT_MS,
  STEP_ICON_IN_MS,
  STEP_PART_IN_DURATION_MS,
  STEP_REVEAL_DURATION_MS,
  STEP_REVEAL_STAGGER_MS,
  STEP_TEXT_IN_MS,
} from '@/config'
import { useI18n } from '@/hooks/useI18n'
import { useIdleTimer } from '@/hooks/useIdleTimer'
import { useKiosk } from '@/hooks/useKiosk'
import { cn } from '@/lib/cn'
import type { HowToStep } from '@/types'
import { KioskHeader } from '../shared/KioskHeader'

/** One icon per step, in step order (the Figma icons, redrawn so they move). */
const STEP_ICONS: StepIconName[] = ['start', 'instructions', 'pdpa', 'degree', 'background', 'photo', 'result']

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Each card's last part in: the second text line, after the title. */
const CARD_DONE_MS = Math.max(STEP_REVEAL_DURATION_MS, STEP_TEXT_IN_MS + 120 + STEP_PART_IN_DURATION_MS)

/**
 * Steps float up one after another; Next appears once the last has settled, so people see them all first.
 * Back here after "Don't allow", Next opens the consent again; untouched for DECLINED_TIMEOUT_MS, it's home.
 */
export function HowToScreen() {
  const { t } = useI18n()
  const { goTo, step, consentDeclined, reset } = useKiosk()
  useIdleTimer(consentDeclined && step === 'howto', DECLINED_TIMEOUT_MS, reset)
  const steps = t.howTo.steps
  const [revealed, setRevealed] = useState(prefersReducedMotion)

  useEffect(() => {
    if (revealed) return
    const id = setTimeout(() => setRevealed(true), (steps.length - 1) * STEP_REVEAL_STAGGER_MS + CARD_DONE_MS)
    return () => clearTimeout(id)
  }, [revealed, steps.length])

  return (
    <Screen
      header={<KioskHeader title={t.howTo.title} back="home" showHome />}
      footer={
        // not there at all until every step is in: nothing to tap early
        revealed && (
          <Button onClick={() => goTo('pdpa')} className="animate-sheet-in motion-reduce:animate-none">
            {t.actions.next}
          </Button>
        )
      }
    >
      <ol className="mt-15 flex flex-col gap-3.25">
        {steps.map((step, i) => (
          <StepCard key={step.title} step={step} icon={STEP_ICONS[i]} delayMs={i * STEP_REVEAL_STAGGER_MS} />
        ))}
      </ol>
    </Screen>
  )
}

interface StepCardProps {
  step: HowToStep
  icon: StepIconName
  delayMs: number
}

function StepCard({ step, icon, delayMs }: StepCardProps) {
  // the card floats up, then its icon pops in, then its title and text slide in, one after the other
  const after = (ms: number) => ({ animationDelay: `${delayMs + ms}ms` })
  return (
    <li
      style={{ animationDelay: `${delayMs}ms`, animationDuration: `${STEP_REVEAL_DURATION_MS}ms` }}
      className="flex w-131 animate-step-in items-center gap-8 rounded-card bg-linear-to-b from-white to-primary-soft px-6 py-5.25 shadow-card motion-reduce:animate-none"
    >
      {/* the icon may be taller than this slot; it overflows it rather than stretch the card, as in the design */}
      <div style={after(STEP_ICON_IN_MS)} className="flex h-11 w-14 flex-none animate-icon-in items-center justify-center motion-reduce:animate-none">
        <StepIcon name={icon} delayMs={delayMs + STEP_ICON_IN_MS} className="size-13" />
      </div>
      <div className="flex flex-col gap-1 text-left">
        <b style={after(STEP_TEXT_IN_MS)} className="animate-text-in text-button leading-5 font-semibold text-primary motion-reduce:animate-none">
          {step.title}
        </b>
        {typeof step.body === 'string' ? (
          <p style={after(STEP_TEXT_IN_MS + 120)} className="animate-text-in text-sm leading-5 font-light text-ink motion-reduce:animate-none">
            {step.body}
          </p>
        ) : (
          <ul
            style={after(STEP_TEXT_IN_MS + 120)}
            className={cn('animate-text-in text-sm leading-5 font-light text-ink motion-reduce:animate-none', step.bulleted && 'list-disc pl-5')}
          >
            {step.body.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}
