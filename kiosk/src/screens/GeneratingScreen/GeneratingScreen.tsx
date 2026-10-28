import { useEffect, useState } from 'react'
import { LoadingOrb, Screen } from '@/components'
import { useI18n } from '@/hooks/useI18n'
import { useKiosk } from '@/hooks/useKiosk'

/** How long each line of the waiting text stays before the next. */
const LINE_MS = 3500

/**
 * While the photo is made: a turning orb of dots, with a line of waiting text under it that changes every few
 * seconds (and once the visitor is dressed, in gen mode, the finished photo replaces this screen soon after).
 */
export function GeneratingScreen() {
  const { t } = useI18n()
  const { preview } = useKiosk()
  const [line, setLine] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setLine((n) => n + 1), LINE_MS)
    return () => clearInterval(id)
  }, [])

  const text = preview ? t.generatingScene : t.generating[line % t.generating.length]
  return (
    <Screen>
      {/* the orb's middle at about y 660 of the 1280: on the teal below the white top, clear of the ribbon at the bottom */}
      <LoadingOrb className="mt-94" />
      {/* keyed, so each new line drifts in */}
      <p
        key={text}
        role="progressbar"
        aria-busy="true"
        className="animate-text-in text-xl font-semibold text-primary motion-reduce:animate-none"
      >
        {text}
      </p>
    </Screen>
  )
}
