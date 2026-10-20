import { useMemo, useState, type ReactNode } from 'react'
import { messages } from '@/i18n'
import type { Lang } from '@/types'
import { I18nContext, type I18nValue } from './I18nContext'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('th')

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t: messages[lang], name: (item) => item[lang] }),
    [lang],
  )

  return <I18nContext value={value}>{children}</I18nContext>
}
