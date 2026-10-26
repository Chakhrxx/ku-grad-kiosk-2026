import { useEffect, useState } from 'react'

/** Scale that fits a width × height design frame inside the window. */
export function useScale(width: number, height: number) {
  const fit = () => Math.min(innerWidth / width, innerHeight / height)
  const [scale, setScale] = useState(fit)

  useEffect(() => {
    const onResize = () => setScale(Math.min(innerWidth / width, innerHeight / height))
    addEventListener('resize', onResize)
    return () => removeEventListener('resize', onResize)
  }, [width, height])

  return scale
}
