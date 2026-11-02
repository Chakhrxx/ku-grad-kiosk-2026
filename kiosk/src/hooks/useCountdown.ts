import { useEffect, useEffectEvent, useState } from 'react'

/** Count down from `seconds` once started, then call `onDone`. `count` is null until started. */
export function useCountdown(seconds: number, onDone: () => void) {
  const [count, setCount] = useState<number | null>(null)
  const done = useEffectEvent(onDone)

  useEffect(() => {
    if (count === null) return
    if (count === 0) {
      done() // the shutter goes as "1" ends; the photo is the camera's, so the fading number is never in it
      return
    }
    const id = setTimeout(() => setCount(count - 1), 1000)
    return () => clearTimeout(id)
  }, [count])

  return { count, start: () => setCount(seconds) }
}
