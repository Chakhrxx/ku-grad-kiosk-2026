/**
 * Which way the camera screen dresses the visitor, picked on the home screen while the ways are being compared.
 * Both send Decart's try-on model (Lucy VTON) a one-second clip as a batch job:
 * `vton-batch` = a still of the camera at the shutter; the dressed visitor is then cut out onto the scene,
 * `vton-live` = the visitor sees themselves on the scene live, and a second of that picture is what goes.
 * `stream` (the live try-on stream) is off the menu; its code stays.
 * Remembered per kiosk browser, so it survives visitors and reloads.
 */
export type Solution = 'stream' | 'vton-batch' | 'vton-live'

export const SOLUTIONS: { id: Solution; label: string; hint: string }[] = [
  { id: 'vton-batch', label: 'Lucy VTON · batch', hint: 'โมเดลลองชุดโดยตรง ส่งเป็นคลิปสั้นแล้วรอผล' },
  { id: 'vton-live', label: 'Lucy VTON · พรีวิวบนฉาก', hint: 'เห็นตัวเองบนฉากตอนโพสท่า แล้วส่งภาพนั้นให้ VTON ใส่ชุด' },
]

const KEY = 'ku-kiosk-solution'
let current: Solution | undefined // still holds the pick when storage is blocked

/** The remembered pick while it is still on the menu, otherwise the menu's first. */
export function getSolution(): Solution {
  const offered = (s: unknown): s is Solution => SOLUTIONS.some((o) => o.id === s)
  if (offered(current)) return current
  try {
    const saved = localStorage.getItem(KEY)
    if (offered(saved)) return saved
  } catch {
    // storage blocked: the default
  }
  return SOLUTIONS[0].id
}

export function setSolution(solution: Solution) {
  current = solution
  try {
    localStorage.setItem(KEY, solution)
  } catch {
    // storage blocked: remembered until the page reloads
  }
}
