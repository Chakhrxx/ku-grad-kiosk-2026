import { useState, type ReactNode } from 'react'
import { errorCodeOf, generatePhoto, getCatalog, giveConsent } from '@/api/client'
import { DEFAULT_LEVEL, IDLE_TIMEOUT_MS, MAX_SHOTS } from '@/config'
import { useI18n } from '@/hooks/useI18n'
import { useIdleTimer } from '@/hooks/useIdleTimer'
import { catalogImageUrls, preloadImages } from '@/lib/assetUrls'
import type { Catalog, ErrorCode, PhotoResult, Step } from '@/types'
import { KioskContext, type KioskValue } from './KioskContext'

export function KioskProvider({ children }: { children: ReactNode }) {
  const { lang } = useI18n()
  const [step, setStep] = useState<Step>('home')
  const [catalog, setCatalog] = useState<Catalog>()
  const [session, setSession] = useState('')
  const [level, setLevel] = useState('')
  const [item, setItem] = useState('')
  const [background, setBackground] = useState('')
  const [shots, setShots] = useState(0)
  const [result, setResult] = useState<PhotoResult>()
  const [error, setError] = useState<ErrorCode>('ai')

  /** End the session and forget everything about this visitor. */
  const reset = () => {
    setStep('home')
    setSession('')
    setLevel('')
    setItem('')
    setBackground('')
    setShots(0)
    setResult(undefined)
  }

  const fail = (code: ErrorCode) => {
    setError(code)
    setStep('error')
  }

  useIdleTimer(step !== 'home' && step !== 'generating', IDLE_TIMEOUT_MS, reset)

  const start = async () => {
    try {
      if (!catalog) {
        const loaded = await getCatalog()
        setCatalog(loaded)
        preloadImages(catalogImageUrls(loaded)) // ready before the visitor reaches those screens
      }
    } catch (e) {
      return fail(errorCodeOf(e))
    }
    setSession(crypto.randomUUID())
    setStep('howto')
  }

  const answerConsent = async (agreed: boolean) => {
    if (!agreed) return reset() // no consent: the camera never opens
    try {
      await giveConsent(session, lang)
      setStep('grade')
    } catch (e) {
      fail(errorCodeOf(e))
    }
  }

  const selectLevel = (id: string) => {
    // A different degree means different gowns, so the visitor picks the faculty again for it
    if (id !== level) setItem('')
    setLevel(id)
  }

  // Before a degree is picked the tiles show the bachelor gowns, so picking a faculty then means bachelor
  const selectItem = (id: string) => {
    if (!level) setLevel(DEFAULT_LEVEL)
    setItem(id)
  }

  const shoot = async (photo: Blob) => {
    setStep('generating')
    setShots((n) => n + 1)
    try {
      const t0 = performance.now()
      setResult(await generatePhoto(photo, { session, level, item, background }))
      console.info(`[photo] uploaded and finished in ${((performance.now() - t0) / 1000).toFixed(1)}s`)
      setStep('result')
    } catch (e) {
      fail(errorCodeOf(e))
    }
  }

  const outfits = level === 'others' ? catalog?.others : catalog?.faculties

  const value: KioskValue = {
    step,
    catalog,
    level,
    item,
    background,
    outfit: outfits?.find((x) => x.id === item),
    result,
    error,
    canRetake: shots < MAX_SHOTS,
    start,
    goTo: setStep,
    answerConsent,
    selectLevel,
    selectItem,
    selectBackground: setBackground,
    session,
    shoot,
    fail,
    retry: () => setStep(background ? 'camera' : 'home'),
    reset,
  }

  return <KioskContext value={value}>{children}</KioskContext>
}
