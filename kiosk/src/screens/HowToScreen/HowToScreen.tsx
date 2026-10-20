import { useEffect, useState } from 'react'
import stepBackground from '@/assets/icons/step-background.png'
import stepDegree from '@/assets/icons/step-degree.png'
import stepInstructions from '@/assets/icons/step-instructions.png'
import stepPdpa from '@/assets/icons/step-pdpa.png'
import stepPhoto from '@/assets/icons/step-photo.png'
import stepResult from '@/assets/icons/step-result.png'
import stepStart from '@/assets/icons/step-start.png'
import { Button, Screen } from '@/components'
import { STEP_REVEAL_DURATION_MS, STEP_REVEAL_STAGGER_MS } from '@/config'
import { useI18n } from '@/hooks/useI18n'
import { useKiosk } from '@/hooks/useKiosk'
import { cn } from '@/lib/cn'
import type { HowToStep } from '@/types'
import { KioskHeader } from '../shared/KioskHeader'

/** One icon per step, in step order, with its height in the Figma How to Join frame. */
const STEP_ICONS = [
  { src: stepStart, height: 51 },
  { src: stepInstructions, height: 37 },
  { src: stepPdpa, height: 47 },
  { src: stepDegree, height: 55 },
  { src: stepBackground, height: 40 },
  { src: stepPhoto, height: 40 },
  { src: stepResult, height: 42 },
]

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Steps float up one after another; Next pops in once the last has settled, so people see them all first. */
export function HowToScreen() {
  const { t } = useI18n()
  const { goTo } = useKiosk()
  const steps = t.howTo.steps
  const [revealed, setRevealed] = useState(prefersReducedMotion)

  useEffect(() => {
    if (revealed) return
    const id = setTimeout(() => setRevealed(true), (steps.length - 1) * STEP_REVEAL_STAGGER_MS + STEP_REVEAL_DURATION_MS)
    return () => clearTimeout(id)
  }, [revealed, steps.length])

  return (
    <Screen
      header={<KioskHeader title={t.howTo.title} back="home" showHome />}
      footer={
        <Button disabled={!revealed} onClick={() => goTo('pdpa')} className={cn(revealed && 'animate-pop motion-reduce:animate-none')}>
          {t.actions.next}
        </Button>
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
  icon: { src: string; height: number }
  delayMs: number
}

function StepCard({ step, icon, delayMs }: StepCardProps) {
  return (
    <li
      style={{ animationDelay: `${delayMs}ms`, animationDuration: `${STEP_REVEAL_DURATION_MS}ms` }}
      className="flex w-131 animate-step-in items-center gap-8 rounded-card bg-linear-to-b from-white to-primary-soft px-6 py-5.25 shadow-card motion-reduce:animate-none"
    >
      {/* Icons may be taller than this slot; they overflow it rather than stretch the card, as in the design */}
      <div className="flex h-11 w-14 flex-none items-center justify-center">
        <img src={icon.src} alt="" style={{ height: icon.height }} className="w-auto max-w-none" />
      </div>
      <div className="flex flex-col gap-1 text-left">
        <b className="text-button leading-5 font-semibold text-primary">{step.title}</b>
        {typeof step.body === 'string' ? (
          <p className="text-sm leading-5 font-light text-ink">{step.body}</p>
        ) : (
          <ul className={cn('text-sm leading-5 font-light text-ink', step.bulleted && 'list-disc pl-5')}>
            {step.body.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}
