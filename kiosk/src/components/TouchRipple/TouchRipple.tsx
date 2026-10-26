import { useEffect } from 'react'

/** Ring size in screen px at its widest: just past the pressed cursor, a hint rather than a splash. */
const SIZE = 46

/**
 * A ring spreading from wherever the screen is touched (or clicked), over everything: on a touchscreen there is
 * no hover, so every tap answers at once. Drawn straight into the DOM, not React state, so taps never re-render.
 */
export function TouchRipple() {
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const onDown = (e: PointerEvent) => {
      const ring = document.createElement('span')
      ring.setAttribute('aria-hidden', 'true')
      ring.className =
        'pointer-events-none fixed z-[9999] animate-touch-ripple rounded-full border-2 border-primary/70 bg-primary/10 shadow-[0_0_0_2px_rgb(255_255_255/0.6)]'
      Object.assign(ring.style, { left: `${e.clientX}px`, top: `${e.clientY}px`, width: `${SIZE}px`, height: `${SIZE}px` })
      ring.addEventListener('animationend', () => ring.remove())
      document.body.append(ring)
    }
    window.addEventListener('pointerdown', onDown, { passive: true })
    return () => window.removeEventListener('pointerdown', onDown)
  }, [])
  return null
}
