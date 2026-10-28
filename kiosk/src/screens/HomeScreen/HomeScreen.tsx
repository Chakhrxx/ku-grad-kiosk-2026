import { useEffect, useState } from 'react'
import flagGb from '@/assets/flags/gb.png'
import flagTh from '@/assets/flags/th.png'
import kuLogo from '@/assets/ku-logo.png'
import { Button, Dropdown, Pill, Screen } from '@/components'
import { HOME_ENGAGED_IDLE_MS } from '@/config'
import { useI18n } from '@/hooks/useI18n'
import { useIdleTimer } from '@/hooks/useIdleTimer'
import { en } from '@/i18n/en'
import { th } from '@/i18n/th'
import { useKiosk } from '@/hooks/useKiosk'
import { cn } from '@/lib/cn'
import { getSolution, setSolution, SOLUTION_PICKER, SOLUTIONS } from '@/lib/solution'
import type { Lang } from '@/types'

const LANGUAGES: { id: Lang; label: string; flag: string }[] = [
  { id: 'th', label: 'THAILAND', flag: flagTh },
  { id: 'en', label: 'ENGLISH', flag: flagGb },
]

const DRIFT = 'animate-drift motion-reduce:animate-none'
// in turn: the logo, then the name, then the tagline, each one's tide out before the next comes in
const driftAfter = (order: number) => ({ animationDelay: `${order * 4.5}s` })

/**
 * With nobody there the screen is all motion (the waves, a tide washing over the logo and text) with only "tap the screen"
 * inviting a tap, no buttons in the way; the first touch anywhere stills the logo and text and brings in the language
 * keys and Start. Left alone again, they go and the invitation and the breathing come back.
 */
export function HomeScreen() {
  const { t, lang, setLang } = useI18n()
  const { start } = useKiosk()
  const [engaged, setEngaged] = useState(false)
  useEffect(() => {
    const engage = () => setEngaged(true)
    addEventListener('pointerdown', engage)
    return () => removeEventListener('pointerdown', engage)
  }, [])
  useIdleTimer(engaged, HOME_ENGAGED_IDLE_MS, () => setEngaged(false))
  const [solution, pickSolution] = useState(getSolution)
  // the tide comes in only while nobody is there, still once someone is reading them
  const drift = engaged ? '' : DRIFT

  return (
    <Screen
      footer={
        // Start drifts in after both language keys
        engaged && (
          <Button onClick={start} className="animate-home-in [animation-delay:700ms] motion-reduce:animate-none">
            {t.home.start}
          </Button>
        )
      }
    >
      {/* ponytail: test-only switch while stream and gen are compared; delete with the losing solution */}
      {SOLUTION_PICKER && (
        <Dropdown
          caption="Solution · test"
          options={SOLUTIONS}
          value={solution}
          onChange={(next) => {
            setSolution(next)
            pickSolution(next)
          }}
          className="absolute top-8 right-10 z-10"
        />
      )}
      <div className="flex flex-col items-center text-center text-primary">
        {/* a white silhouette behind the logo, so under the tide it pales like foam instead of letting the dots through */}
        <div className="relative mt-29 w-60">
          <img src={kuLogo} alt="" className="absolute inset-0 w-full brightness-0 invert" />
          <img src={kuLogo} alt="Kasetsart University" style={driftAfter(0)} className={cn(drift, 'relative w-full')} />
        </div>
        <p style={driftAfter(1)} className={cn(drift, 'mt-10 text-[22px] leading-[33px] font-semibold')}>
          {t.home.university}
          <br />
          {/* nowrap: the browser's Thai dictionary would otherwise be free to split วิทยาเขต|กำแพงแสน */}
          <span className="whitespace-nowrap">{t.home.campus}</span>
        </p>
        <p style={driftAfter(2)} className={cn(drift, 'mt-51 max-w-123 text-lg leading-8 whitespace-pre-line')}>
          {t.home.tagline}
        </p>
        {/* one fixed-height slot for the invitation or the language keys, so the tagline above never jumps */}
        <div className="mt-20 flex h-32 items-center justify-center">
          {engaged ? (
            <div className="flex gap-14">
              {/* the keys drift in one after the other, then Start */}
              {LANGUAGES.map(({ id, label, flag }, i) => (
                <Pill
                  key={id}
                  variant="lang"
                  selected={lang === id}
                  onClick={() => setLang(id)}
                  style={{ animationDelay: `${i * 350}ms` }}
                  className="animate-home-in motion-reduce:animate-none"
                >
                  <img src={flag} alt="" className="size-9 rounded-full object-cover" />
                  {label}
                </Pill>
              ))}
            </div>
          ) : (
            <TapInvitation />
          )}
        </div>
      </div>
    </Screen>
  )
}

/** "Tap the screen" in both languages, fading out and back. */
function TapInvitation() {
  return (
    <div className="flex animate-home-in flex-col items-center text-primary motion-reduce:animate-none">
      <p className="flex animate-tap-breathe flex-col items-center leading-tight motion-reduce:animate-none">
        <span className="text-xl font-medium tracking-wide">{th.home.tapToBegin}</span>
        <span className="mt-1 text-sm tracking-[0.18em] text-primary/70 uppercase">{en.home.tapToBegin}</span>
      </p>
    </div>
  )
}
