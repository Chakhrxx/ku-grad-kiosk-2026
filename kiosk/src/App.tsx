import { Stage } from '@/components'
import { I18nProvider } from '@/context/I18nProvider'
import { KioskProvider } from '@/context/KioskProvider'
import { useKiosk } from '@/hooks/useKiosk'
import {
  CameraScreen,
  ChooseGradeScreen,
  ErrorScreen,
  GeneratingScreen,
  HomeScreen,
  HowToScreen,
  PdpaModal,
  PreviewScreen,
  ResultScreen,
} from '@/screens'

function CurrentScreen() {
  const { step } = useKiosk()
  switch (step) {
    case 'home':
      return <HomeScreen />
    case 'howto':
    case 'pdpa':
      // the same How to Join instance under the consent, so its cards don't replay behind the modal
      return (
        <>
          <HowToScreen />
          {step === 'pdpa' && <PdpaModal />}
        </>
      )
    case 'grade':
      return <ChooseGradeScreen />
    case 'preview':
      return <PreviewScreen />
    case 'camera':
      return <CameraScreen />
    case 'generating':
      return <GeneratingScreen />
    case 'result':
      return <ResultScreen />
    case 'error':
      return <ErrorScreen />
  }
}

export default function App() {
  return (
    <I18nProvider>
      <KioskProvider>
        <Stage>
          <CurrentScreen />
        </Stage>
      </KioskProvider>
    </I18nProvider>
  )
}
