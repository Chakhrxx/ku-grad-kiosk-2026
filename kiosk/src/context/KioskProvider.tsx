import { useEffect, useState, type ReactNode } from 'react'
import { errorCodeOf, generatePhoto, getCatalog, giveConsent } from '@/api/client'
import { DEFAULT_LEVEL, IDLE_TIMEOUT_MS, MAX_SHOTS, RESULT_IDLE_MS } from '@/config'
import { useI18n } from '@/hooks/useI18n'
import { useIdleTimer } from '@/hooks/useIdleTimer'
import { loadSegmenter } from '@/hooks/useLiveBackground'
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
  const [alternate, setAlternate] = useState<PhotoResult>()
  const [error, setError] = useState<ErrorCode>('ai')
  const [preview, setPreview] = useState<string>()
  const [consentDeclined, setConsentDeclined] = useState(false)
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]) // each one freed once replaced

  /** End the session and forget everything about this visitor. */
  const reset = () => {
    setStep('home')
    setSession('')
    setLevel('')
    setItem('')
    setBackground('')
    setShots(0)
    setResult(undefined)
    setAlternate(undefined)
    setPreview(undefined)
    setConsentDeclined(false)
  }

  const fail = (code: ErrorCode) => {
    setError(code)
    setStep('error')
  }

  useIdleTimer(step !== 'home' && step !== 'generating', step === 'result' ? RESULT_IDLE_MS : IDLE_TIMEOUT_MS, reset)

  const start = async () => {
    try {
      if (!catalog) {
        const loaded = await getCatalog()
        setCatalog(loaded)
        preloadImages(catalogImageUrls(loaded)) // ready before the visitor reaches those screens
      }
      void loadSegmenter().catch(() => {}) // ~10 MB, slow through a tunnel; the camera screen reports a failure
    } catch (e) {
      return fail(errorCodeOf(e))
    }
    setSession(crypto.randomUUID())
    setStep('howto')
  }

  const answerConsent = async (agreed: boolean) => {
    if (!agreed) {
      // no consent: the camera never opens, but they stay on How to Join and may tap Next to think again
      setConsentDeclined(true)
      return setStep('howto')
    }
    setConsentDeclined(false)
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

  const shoot = async (photo: Blob | Promise<Blob | [Blob, Blob]>) => {
    setStep('generating')
    setShots((n) => n + 1)
    setPreview(undefined) // not the last shot's
    try {
      const ready = await photo
      const [main, other] = Array.isArray(ready) ? ready : [ready]
      const t0 = performance.now()
      const fields = { session, level, item, background }
      const [stored, storedOther] = await Promise.all([
        generatePhoto(main, fields),
        other ? generatePhoto(other, fields) : undefined,
      ])
      setResult(stored)
      setAlternate(storedOther)
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
    alternate,
    preview,
    error,
    canRetake: shots < MAX_SHOTS,
    consentDeclined,
    start,
    goTo: setStep,
    answerConsent,
    selectLevel,
    selectItem,
    selectBackground: setBackground,
    session,
    shoot,
    showPreview: (photo) => setPreview(URL.createObjectURL(photo)),
    fail,
    retry: () => setStep(background ? 'camera' : 'home'),
    reset,
  }

  return <KioskContext value={value}>{children}</KioskContext>
}
