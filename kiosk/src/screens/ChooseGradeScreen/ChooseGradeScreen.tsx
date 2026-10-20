import { Button, FacultyTile, Panel, Pill, Screen } from '@/components'
import { useI18n } from '@/hooks/useI18n'
import { useKiosk } from '@/hooks/useKiosk'
import { DEFAULT_LEVEL } from '@/config'
import { tileUrl } from '@/lib/assetUrls'
import { KioskHeader } from '../shared/KioskHeader'

/** Tiles float up one after another, again whenever the degree changes and the gowns swap. */
const TILE_STAGGER_MS = 120
const TILE_RISE_MS = 900

export function ChooseGradeScreen() {
  const { t, name } = useI18n()
  const { catalog, level, item, selectLevel, selectItem, goTo } = useKiosk()
  if (!catalog) return null

  const outfits = level === 'others' ? catalog.others : catalog.faculties
  const gownLevel = level || DEFAULT_LEVEL

  return (
    <Screen
      header={<KioskHeader title={t.grade.title} back="howto" showHome />}
      footer={
        <Button disabled={!level || !item} onClick={() => goTo('preview')}>
          {t.actions.next}
        </Button>
      }
    >
      <div className="mt-7.5 flex flex-col items-center">
        <p className="text-xl font-semibold text-primary">{t.grade.degreePrompt}</p>
        <div className="mt-7.5 flex gap-4.25">
          {catalog.levels.map((l) => (
            <Pill key={l.id} variant="degree" selected={level === l.id} onClick={() => selectLevel(l.id)}>
              {name(l)}
            </Pill>
          ))}
        </div>
      </div>

      <Panel title={t.grade.facultyPrompt}>
        <div key={gownLevel} className="mt-14.5 grid grid-cols-2 gap-x-18.75 gap-y-7">
          {outfits.map((f, i) => (
            <div
              key={f.id}
              className="animate-step-in motion-reduce:animate-none"
              style={{ animationDelay: `${i * TILE_STAGGER_MS}ms`, animationDuration: `${TILE_RISE_MS}ms` }}
            >
              <FacultyTile
                label={name(f)}
                imageSrc={tileUrl(gownLevel, f.id)}
                selected={item === f.id}
                onSelect={() => selectItem(f.id)}
              />
            </div>
          ))}
        </div>
      </Panel>
    </Screen>
  )
}
