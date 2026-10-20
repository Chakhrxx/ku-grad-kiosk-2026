import { useRef, useState, type CSSProperties } from 'react'
import { BackgroundCard, Button, Panel, Pill, Screen } from '@/components'
import { useI18n } from '@/hooks/useI18n'
import { useKiosk } from '@/hooks/useKiosk'
import { backgroundUrl } from '@/lib/assetUrls'
import { CARD_SPACING, cardPose, ringOffset } from '@/lib/carousel'
import { KioskHeader } from '../shared/KioskHeader'

/** Release past this many px to move one card; a shorter drag springs back. */
const SWIPE_PX = 50
/** Movement past this is a drag, not a tap. */
const TAP_SLOP_PX = 8

/** Must match the perspective-[…] on the carousel below. */
const PERSPECTIVE = 1000

function cardStyle(o: number, dragging: boolean): CSSProperties {
  const p = cardPose(o)
  // Bringing a card nearer also enlarges it; scale position and size back so only the depth order changes
  const k = (PERSPECTIVE - p.z) / PERSPECTIVE
  return {
    transform: `translateX(calc(-50% + ${p.x * k}px)) translateZ(${p.z}px) rotateY(${p.rotateY}deg) scale(${p.scale * k})`,
    opacity: p.opacity,
    // side cards slightly blurred and dimmed so the centre one stands out
    filter: `blur(${2.5 * Math.min(Math.abs(o), 1)}px) brightness(${1 - 0.12 * Math.min(Math.abs(o), 1)}) saturate(${1 - 0.2 * Math.min(Math.abs(o), 1)})`,
    pointerEvents: p.opacity === 0 ? 'none' : undefined,
    // follow the finger exactly while dragging; glide (ease in and out) when settling
    transition: dragging ? 'none' : 'transform 650ms cubic-bezier(0.45, 0, 0.2, 1), opacity 650ms ease, filter 650ms ease',
  }
}

/** The stage is CSS-scaled to the screen; finger movement is in screen px, the layout in design px. */
function scaleOf(el: Element): number {
  return el.getBoundingClientRect().width / (el as HTMLElement).offsetWidth || 1
}

export function PreviewScreen() {
  const { t, name } = useI18n()
  const { catalog, background, selectBackground, goTo } = useKiosk()
  const backgrounds = catalog?.backgrounds ?? []
  const [focus, setFocus] = useState(() => Math.max(0, backgrounds.findIndex((b) => b.id === background)))
  const dragFrom = useRef<number | null>(null)
  const [drag, setDrag] = useState(0) // px the finger has moved during the current drag
  const [dragging, setDragging] = useState(false)
  const swiped = useRef(false)
  if (!catalog) return null
  // The centre card is always the pick, so the first backdrop is chosen before anything is tapped
  const picked = backgrounds[focus]?.id

  // Bringing a backdrop to the centre (tap its card, its name, or swipe) also picks it
  const show = (index: number) => {
    const i = (index + backgrounds.length) % backgrounds.length
    setFocus(i)
    selectBackground(backgrounds[i].id)
  }

  return (
    <Screen
      header={<KioskHeader title={t.preview.title} back="grade" showHome />}
      footer={
        <Button
          disabled={!picked}
          onClick={() => {
            selectBackground(picked)
            goTo('camera')
          }}
        >
          {t.actions.next}
        </Button>
      }
    >
      <div className="mt-7.5 flex flex-col items-center">
        <p className="text-xl font-semibold text-primary">{t.preview.subtitle}</p>
        <div className="mt-7.5 flex gap-4.25">
          {backgrounds.map((b, i) => (
            <Pill key={b.id} variant="place" selected={picked === b.id} onClick={() => show(i)}>
              {name(b)}
            </Pill>
          ))}
        </div>
      </div>

      <Panel>
        <div
          className="absolute inset-x-0 top-23 h-119.25 touch-pan-y perspective-[1000px] transform-3d"
          onPointerDown={(e) => {
            dragFrom.current = e.clientX
            swiped.current = false
            setDragging(true)
          }}
          onPointerMove={(e) => {
            if (dragFrom.current === null) return
            const dx = (e.clientX - dragFrom.current) / scaleOf(e.currentTarget)
            if (Math.abs(dx) > TAP_SLOP_PX && !swiped.current) {
              swiped.current = true
              // capture only once it is really a drag: capturing on touch-down would send a tap's click to
              // this container instead of the card that was tapped
              e.currentTarget.setPointerCapture?.(e.pointerId)
            }
            setDrag(Math.max(-CARD_SPACING, Math.min(CARD_SPACING, dx)))
          }}
          onPointerUp={(e) => {
            if (dragFrom.current === null) return
            const dx = (e.clientX - dragFrom.current) / scaleOf(e.currentTarget)
            dragFrom.current = null
            setDragging(false)
            setDrag(0)
            if (Math.abs(dx) > SWIPE_PX) {
              swiped.current = true
              show(focus + (dx < 0 ? 1 : -1))
            }
          }}
          onPointerCancel={() => {
            dragFrom.current = null
            setDragging(false)
            setDrag(0)
          }}
          // a drag ends with a click on whichever card was under the finger; that click is not a pick
          onClickCapture={(e) => {
            if (swiped.current) e.stopPropagation()
            swiped.current = false
          }}
        >
          {backgrounds.map((b, i) => {
            let d = ringOffset(i, focus, backgrounds.length)
            // the card straight across the ring comes in on whichever side the finger is opening
            if (d === backgrounds.length / 2 && drag > 0) d = -d
            return (
              <BackgroundCard
                key={b.id}
                label={name(b)}
                imageSrc={backgroundUrl(b.id)}
                selected={picked === b.id}
                onSelect={() => show(i)}
                className="absolute top-0 left-1/2"
                style={cardStyle(d + drag / CARD_SPACING, dragging)}
              />
            )
          })}
        </div>
      </Panel>
    </Screen>
  )
}
