import flagGb from '@/assets/flags/gb.png'
import flagTh from '@/assets/flags/th.png'
import kuLogo from '@/assets/ku-logo.png'
import { Button, Pill, Screen } from '@/components'
import { useI18n } from '@/hooks/useI18n'
import { useKiosk } from '@/hooks/useKiosk'
import type { Lang } from '@/types'

const LANGUAGES: { id: Lang; label: string; flag: string }[] = [
  { id: 'th', label: 'THAILAND', flag: flagTh },
  { id: 'en', label: 'ENGLISH', flag: flagGb },
]

export function HomeScreen() {
  const { t, lang, setLang } = useI18n()
  const { start } = useKiosk()

  return (
    <Screen
      footer={
        <Button onClick={start}>{t.home.start}</Button>
      }
    >
      <div className="flex flex-col items-center text-center text-primary">
        <img src={kuLogo} alt="Kasetsart University" className="mt-29 w-60" />
        <p className="mt-10 text-[22px] leading-[33px] font-semibold">
          {t.home.university}
          <br />
          {t.home.campus}
        </p>
        <p className="mt-51 max-w-123 text-lg leading-8 whitespace-pre-line">{t.home.tagline}</p>
        <div className="mt-28 flex gap-14">
          {LANGUAGES.map(({ id, label, flag }) => (
            <Pill key={id} variant="lang" selected={lang === id} onClick={() => setLang(id)}>
              <img src={flag} alt="" className="size-9 rounded-full object-cover" />
              {label}
            </Pill>
          ))}
        </div>
      </div>
    </Screen>
  )
}
