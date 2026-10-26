import type { ReactNode } from 'react'
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '@/config'
import { useScale } from '@/hooks/useScale'
import { WaveBackground } from '../WaveBackground/WaveBackground'

/**
 * The 720 × 1280 design frame, scaled to fit the real screen. The animated waves live here, behind every
 * screen, so they are the background everywhere and keep flowing across screen changes.
 */
export function Stage({ children }: { children: ReactNode }) {
  const scale = useScale(DESIGN_WIDTH, DESIGN_HEIGHT)
  return (
    <div
      className="absolute top-1/2 left-1/2 h-320 w-180 overflow-hidden bg-kiosk font-sans"
      style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
    >
      <WaveBackground />
      {children}
    </div>
  )
}
