/** The mouse cursor shows only this long after the mouse last moved (over a button it always shows, global.css). */
export const SHOWN_MS = 1500

/** Mark the page `data-mouse` while a real mouse moves; returns the cleanup. */
export function showMouseWhileMoving(root: HTMLElement = document.documentElement) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return // a finger or the hand cursor's taps are not a mouse
    root.setAttribute('data-mouse', '')
    clearTimeout(timer)
    timer = setTimeout(() => root.removeAttribute('data-mouse'), SHOWN_MS)
  }
  window.addEventListener('pointermove', onMove, { passive: true })
  return () => {
    window.removeEventListener('pointermove', onMove)
    clearTimeout(timer)
    root.removeAttribute('data-mouse')
  }
}
