import { describe, expect, it } from 'vitest'
import { placeSubject, SUBJECT_FEET, SUBJECT_HEAD } from './subject'

const W = 1080
const H = 1620
const land = (b: { x: number; y: number; w: number; h: number }, p: ReturnType<typeof placeSubject>) => ({
  head: (b.y * p.scale + p.dy) / H,
  feet: ((b.y + b.h) * p.scale + p.dy) / H,
  centre: ((b.x + b.w / 2) * p.scale + p.dx) / W,
})

describe('placeSubject', () => {
  it('stands a full-length visitor on the feet line, head on the head line, in the middle', () => {
    const body = { x: 100, y: 200, w: 300, h: 1300 } // close to the camera, off to the left
    const at = land(body, placeSubject(body, W, H))
    expect(at.head).toBeCloseTo(SUBJECT_HEAD)
    expect(at.feet).toBeCloseTo(SUBJECT_FEET)
    expect(at.centre).toBeCloseTo(0.5)
  })

  it('keeps a body the camera cut off on the bottom edge, head still on the line', () => {
    const body = { x: 300, y: 300, w: 500, h: 1320 } // reaches the bottom of the shot
    const at = land(body, placeSubject(body, W, H))
    expect(at.head).toBeCloseTo(SUBJECT_HEAD)
    expect(at.feet).toBeCloseTo(1)
  })

  it('does not blow a far-away visitor up past what the cut-out can take', () => {
    expect(placeSubject({ x: 500, y: 900, w: 80, h: 300 }, W, H).scale).toBe(1.6)
  })
})
