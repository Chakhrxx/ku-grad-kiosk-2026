import { useEffect, useEffectEvent } from 'react'

/** Call `onIdle` after `timeoutMs` with no touch, while `active`. */
export function useIdleTimer(active: boolean, timeoutMs: number, onIdle: () => void) {
  const fire = useEffectEvent(onIdle)

  useEffect(() => {
    if (!active) return
    let timer = setTimeout(fire, timeoutMs)
    const restart = () => {
      clearTimeout(timer)
      timer = setTimeout(fire, timeoutMs)
    }
    addEventListener('pointerdown', restart)
    return () => {
      clearTimeout(timer)
      removeEventListener('pointerdown', restart)
    }
  }, [active, timeoutMs])
}
