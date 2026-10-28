import { useState } from 'react'
import { Button, Modal, Pill } from '@/components'
import { useI18n } from '@/hooks/useI18n'
import { useKiosk } from '@/hooks/useKiosk'

/**
 * Consent over the How to Join screen. Next unlocks only once Allow is picked;
 * Don't allow ends the session at once, before the camera ever opens.
 */
export function PdpaModal() {
  const { t } = useI18n()
  const { answerConsent } = useKiosk()
  const [allowed, setAllowed] = useState(false)

  return (
    <Modal
      title={t.pdpa.title}
      footer={
        <>
          <div className="flex gap-6.5">
            <Pill variant="choice" onClick={() => answerConsent(false)}>
              {t.pdpa.no}
            </Pill>
            <Pill variant="choice" selected={allowed} onClick={() => setAllowed(true)}>
              {t.pdpa.yes}
            </Pill>
          </div>
          <Button disabled={!allowed} onClick={() => answerConsent(true)} className="h-11.25 w-66">
            {t.actions.next}
          </Button>
        </>
      }
    >
      <Paragraphs text={t.pdpa.intro} />
      <ul className="list-disc space-y-1 pl-6 leading-[1.1]">
        {t.pdpa.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <Paragraphs text={`${t.pdpa.processor}\n${t.pdpa.retention}`} />
    </Modal>
  )
}

/** One <p> per line, so a copy deck can break paragraphs with \n. */
function Paragraphs({ text }: { text: string }) {
  return text.split('\n').map((line) => <p key={line} className="indent-8">{line}</p>)
}
