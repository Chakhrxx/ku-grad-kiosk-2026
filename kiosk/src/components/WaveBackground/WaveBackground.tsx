import { useEffect, useRef } from 'react'
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '@/config'
import { cn } from '@/lib/cn'
import { MESH_COLS, MESH_ROWS, meshPoint, ribbonY, type Touch } from '@/lib/waves'

const LINES = 26
const TOUCH_FADE_S = 1.5 // a tap's lift fades out over this long

export interface WaveBackgroundProps {
  /** Flowing motion; off draws one still frame. Reduced-motion settings also get a still frame. */
  animated?: boolean
  /** Lines lift where the visitor taps. */
  interactive?: boolean
  className?: string
}

/** White wave lines drawn on a canvas behind the screen content. */
export function WaveBackground({ animated = true, interactive = true, className }: WaveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const touch: Touch = { x: 0, y: 0, strength: 0 }
    const still = !animated || (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
    let time = 0

    // Draw at the canvas's on-screen size (the stage is CSS-scaled) so lines stay crisp
    const fit = () => {
      const ratio = (canvas.getBoundingClientRect().width / DESIGN_WIDTH) * devicePixelRatio
      canvas.width = DESIGN_WIDTH * ratio
      canvas.height = DESIGN_HEIGHT * ratio
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      draw(ctx, time, touch)
    }
    fit()
    addEventListener('resize', fit)

    // Every display frame, so the motion stays smooth; strength fades by elapsed time, not frame count
    let raf = 0
    const frame = (ms: number) => {
      raf = requestAnimationFrame(frame)
      const dt = ms / 1000 - time
      time = ms / 1000
      touch.strength = Math.max(0, touch.strength - dt / TOUCH_FADE_S)
      draw(ctx, time, touch)
    }
    if (!still) raf = requestAnimationFrame(frame)

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      touch.x = ((e.clientX - rect.left) / rect.width) * DESIGN_WIDTH
      touch.y = ((e.clientY - rect.top) / rect.height) * DESIGN_HEIGHT
      touch.strength = 1
    }
    if (interactive && !still) addEventListener('pointerdown', onPointer)

    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', fit)
      removeEventListener('pointerdown', onPointer)
    }
  }, [animated, interactive])

  return <canvas ref={canvasRef} aria-hidden="true" className={cn('pointer-events-none absolute inset-0 size-full', className)} />
}

function draw(ctx: CanvasRenderingContext2D, time: number, touch: Touch) {
  ctx.clearRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT)

  // Dotted 3D surface behind the logo, in the muted teal of the lower background:
  // back rows small and faint, front rows bigger and stronger, so it reads as a sheet in perspective
  ctx.fillStyle = '#88bab8'
  for (let row = 0; row < MESH_ROWS; row++) {
    for (let col = 0; col < MESH_COLS; col++) {
      const { x, y, near } = meshPoint(col, row, time, touch)
      const size = 1 + 1.8 * near
      ctx.globalAlpha = 0.06 + 0.24 * near
      ctx.fillRect(x - size / 2, y - size / 2, size, size)
    }
  }
  ctx.globalAlpha = 1

  // Silk ribbon, drawn additively: wherever lines crowd together (the pinch, the fold at the bottom-left,
  // the steep sweep on the right) their light adds up into a bright streak, as in the design.
  // Each line three times: a broad bloom, a soft halo, then the line itself.
  ctx.globalCompositeOperation = 'lighter'
  for (const [width, alpha] of [
    [14, 0.03],
    [6, 0.07],
    [1.8, 0.5],
  ]) {
    ctx.lineWidth = width
    ctx.strokeStyle = `rgb(255 255 255 / ${alpha})`
    for (let i = 0; i < LINES; i++) {
      const t = i / (LINES - 1)
      ctx.beginPath()
      for (let x = -40; x <= DESIGN_WIDTH + 40; x += 8) {
        const y = ribbonY(x, t, time, touch)
        if (x === -40) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  }
  ctx.globalCompositeOperation = 'source-over'
}
