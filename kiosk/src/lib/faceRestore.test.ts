import { describe, expect, it } from 'vitest'
import { faceBox, fitFace, meanColor, squareAround, tintGain } from './faceRestore'

/** A width×height grid scoring 1 inside the box and 0 elsewhere. */
function grid(width: number, height: number, box: { x: number; y: number; w: number; h: number }) {
  const score = new Float32Array(width * height)
  for (let y = box.y; y < box.y + box.h; y++) for (let x = box.x; x < box.x + box.w; x++) score[y * width + x] = 1
  return score
}

describe('faceBox', () => {
  it('finds the face and ignores a few stray pixels far away', () => {
    const score = grid(100, 100, { x: 40, y: 20, w: 20, h: 25 })
    score[99 * 100 + 99] = 1 // one stray pixel in the corner
    expect(faceBox(score, 100)).toEqual({ x: 40, y: 20, w: 20, h: 25 })
  })

  it('reports no face when hardly any pixel scores', () => {
    expect(faceBox(grid(100, 100, { x: 0, y: 0, w: 3, h: 3 }), 100)).toBeNull()
  })
})

describe('fitFace', () => {
  const real = { x: 100, y: 100, w: 50, h: 70 }

  it('matches width, centre and chin, so a cap hiding the forehead does not shrink the face', () => {
    const dressed = { x: 104, y: 120, w: 50, h: 54 } // same width, forehead under the cap, chin 4px lower
    const fit = fitFace(real, dressed)!
    expect(fit.scale).toBe(1)
    expect(125 * fit.scale + fit.dx).toBe(129) // real centre lands on the dressed centre
    expect(170 * fit.scale + fit.dy).toBe(174) // real chin lands on the dressed chin
  })

  it('refuses a head of a very different size or somewhere else', () => {
    expect(fitFace(real, { ...real, w: 100 })).toBeNull()
    expect(fitFace(real, { ...real, x: 300 })).toBeNull()
  })
})

describe('squareAround', () => {
  it('keeps the centre and uses the longer side', () => {
    expect(squareAround({ x: 10, y: 10, w: 20, h: 40 }, 2)).toEqual({ x: -20, y: -10, w: 80, h: 80 })
  })
})

describe('meanColor and tintGain', () => {
  it('averages only the face pixels and tints within limits', () => {
    const rgba = new Uint8ClampedArray([200, 100, 50, 255, 0, 0, 0, 255])
    expect(meanColor(rgba, new Float32Array([1, 0]))).toEqual([200, 100, 50])
    expect(meanColor(rgba, new Float32Array([0, 0]))).toBeNull()
    expect(tintGain([100, 100, 100], [120, 100, 10])).toEqual([1.2, 1, 1 / 1.6])
  })
})
