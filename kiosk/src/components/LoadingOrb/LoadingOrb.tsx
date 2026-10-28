import { useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

/** The space the orb takes in the layout, and the canvas it is drawn on, which reaches past it on every side so that
 * nothing is cut off at a frame: the ribbons and the far dots fade out toward its edge instead. */
const BOX = 520
const SIZE = 720
const DPR = 2
const R = 150 // the orb's radius, in px
const FOCAL = 6 * R
const DOTS = 1700
const GOLDEN = Math.PI * (3 - Math.sqrt(5))

/** The same dots every time (a small seeded random), so the orb is the same orb on every visit. */
function seeded(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const random = seeded(7)
/** A size mostly small, now and then big: like plankton in the light, not a grid of equal dots. */
const sizeOf = () => 0.6 + 2.6 * random() ** 3

/** One dot on the unit sphere (Fibonacci spiral: evenly spread): its latitude, angle around, size and own breathing. */
const SPHERE = Array.from({ length: DOTS }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / DOTS
  return { y, lat: Math.asin(y), around: i * GOLDEN, size: sizeOf(), phase: random() * Math.PI * 2 }
})

/**
 * Wavy ribbons of dots wound round the orb, like the white ribbon of the background: each a closed curve that swings
 * in and out and up and down as a wave runs along it, tipped at its own angle and turning its own way.
 */
const RIBBONS = [
  { tilt: 0.5, node: 0, waves: 3, out: 0.3, rise: 0.3, speed: 0.9, spin: 0.25, dots: 150 },
  { tilt: -0.7, node: 2.1, waves: 4, out: 0.24, rise: 0.38, speed: -1.2, spin: -0.18, dots: 170 },
  { tilt: 1.15, node: 4.0, waves: 2, out: 0.34, rise: 0.26, speed: 0.7, spin: 0.12, dots: 130 },
]

/**
 * A waiting animation, nothing to touch: a sphere of dots of every size whose surface rolls with waves (crests bigger and
 * brighter, troughs small and faint) while it turns, wound about by wavy ribbons of dots. White, like the lines of the background it floats on; depth by size and shade.
 */
export function LoadingOrb({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0) // set, not scaled: a second run of this effect (StrictMode) must not scale again
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    const draw = (t: number) => {
      ctx.clearRect(0, 0, SIZE, SIZE)
      const cx = SIZE / 2
      const cy = SIZE / 2
      const yaw = t * 0.32
      const tilt = 0.38 + Math.sin(t * 0.4) * 0.08
      const [cosY, sinY, cosT, sinT] = [Math.cos(yaw), Math.sin(yaw), Math.cos(tilt), Math.sin(tilt)]

      // every dot of the orb and of the ribbons, as [screen x, screen y, depth 0 (far) to 1 (near), size, lift 0 (faint) to 1 (opaque)]
      const dots: [number, number, number, number, number][] = []
      const place = (x: number, y: number, z: number, size: number, lift = 1) => {
        const x1 = x * cosY + z * sinY
        const z1 = -x * sinY + z * cosY
        const y2 = y * cosT - z1 * sinT
        const z2 = y * sinT + z1 * cosT
        const s = FOCAL / (FOCAL - z2)
        dots.push([cx + x1 * s, cy + y2 * s, Math.min(1, Math.max(0, (z2 / (R * 2) + 1) / 2)), size * s, lift])
      }

      for (const d of SPHERE) {
        // waves roll over the surface: one running round it, one from pole to pole, one bigger and slower; where they
        // meet a crest the dot stands out, bigger and brighter, and in a trough it sinks back, small and faint
        const w =
          0.55 * Math.sin(3 * d.around + t * 1.4 + d.lat * 2) +
          0.3 * Math.sin(5 * d.lat - t * 2) +
          0.35 * Math.sin(2 * d.around - 4 * d.lat + t * 0.8)
        const swell = 1 + 0.11 * w
        const ring = Math.sqrt(1 - d.y * d.y)
        const breathe = 0.85 + 0.3 * Math.sin(t * 1.6 + d.phase)
        place(
          Math.cos(d.around) * ring * R * swell,
          d.y * R * swell,
          Math.sin(d.around) * ring * R * swell,
          d.size * breathe * (1 + 0.45 * w),
          // opaque on a crest, nearly gone in a trough, with a slow twinkle of its own on top
          Math.min(1, Math.max(0, 0.5 + 0.42 * w)) * (0.8 + 0.2 * Math.sin(t * 2.4 + d.phase)),
        )
      }
      for (const r of RIBBONS) {
        const [ct, st, cn, sn] = [Math.cos(r.tilt), Math.sin(r.tilt), Math.cos(r.node), Math.sin(r.node)]
        for (let i = 0; i < r.dots; i++) {
          const a = (i / r.dots) * Math.PI * 2 + t * r.spin
          const w = Math.sin(r.waves * a - t * r.speed) // the wave running along the ribbon
          const radius = R * (1.45 + r.out * w)
          const [x0, z0] = [Math.cos(a) * radius, Math.sin(a) * radius]
          const y = R * r.rise * Math.sin(r.waves * a - t * r.speed + 1.2) // up and down a quarter-wave behind it
          // tipped by its tilt, turned to its own node
          const [y1, z1] = [y * ct - z0 * st, y * st + z0 * ct]
          place(x0 * cn + z1 * sn, y1, -x0 * sn + z1 * cn, 1.2 + 1.5 * (0.5 + 0.5 * w), 0.5 + 0.5 * w)
        }
      }

      const breath = 0.82 + 0.18 * Math.sin(t * 0.9) // the whole orb brightens and dims, slowly
      dots.sort((a, b) => a[2] - b[2]) // far first, so the near ones sit on top
      for (const [x, y, depth, size, lift] of dots) {
        // white like the lines of the background: pale and faint far away, bright and solid near; fading out toward the
        // canvas's edge, so a ring passing close never ends in a cut
        const away = Math.hypot(x - cx, y - cy) / (SIZE / 2)
        const edge = Math.min(1, Math.max(0, (1 - away) / 0.18))
        ctx.fillStyle = `rgba(255, 255, 255, ${(0.2 + 0.75 * depth) * (0.12 + 0.88 * lift) * breath * edge})`
        ctx.beginPath()
        ctx.arc(x, y, size * (0.55 + 0.9 * depth), 0, Math.PI * 2)
        ctx.fill()
      }
    }

    if (still) {
      draw(2)
      return
    }
    let raf = 0
    const frame = (ms: number) => {
      raf = requestAnimationFrame(frame)
      draw(ms / 1000)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className={cn('relative', className)} style={{ width: BOX, height: BOX }}>
      <canvas
        ref={canvasRef}
        width={SIZE * DPR}
        height={SIZE * DPR}
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{ width: SIZE, height: SIZE, left: (BOX - SIZE) / 2, top: (BOX - SIZE) / 2 }}
      />
    </div>
  )
}
