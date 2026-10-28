import { useEffect, useEffectEvent, useState } from 'react'

const FADE_MS = 600

/** Count down from `seconds` once started, then call `onDone`. `count` is null until started. */
export function useCountdown(seconds: number, onDone: () => void) {
  const [count, setCount] = useState<number | null>(null)
  const done = useEffectEvent(onDone)

  useEffect(() => {
    if (count === null) return
    if (count === 0) {
      // the last number has faded out (its 500ms, plus a beat) before the shutter goes
      const id = setTimeout(done, FADE_MS)
      return () => clearTimeout(id)
    }
    const id = setTimeout(() => setCount(count - 1), 1000)
    return () => clearTimeout(id)
  }, [count])

  return { count, start: () => setCount(seconds) }
}
