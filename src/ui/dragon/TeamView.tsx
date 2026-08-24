// Pantalla de EQUIPO: quién llevas, cómo está y qué lleva encima.
//
// Se parece a la del roguelike Pokémon y a la plantilla de Inazuma a propósito:
// una fila por luchador con su retrato y sus barras, HUECOS VACÍOS para los que
// faltan —así el tope de equipo se ve sin que nadie lo explique— y el detalle
// del seleccionado debajo.
//
// La bolsa va separada en EQUIPABLES y CONSUMIBLES, con lo que hace cada objeto
// escrito en números: era imposible saber qué era cada cosa.
import { useState } from 'react'
import Icon from '@/ui/components/Icon'
import { getItem, itemEffect, itemFamily, itemIcon, itemVerb, type Item } from '@/data/dragon/items'
import { getTechnique } from '@/data/dragon/techniques'
import { getForm } from '@/data/dragon/transformations'
import { bondsFor, getTrait, TRAIT_BY_FIGHTER } from '@/data/dragon/personalities'
import { getSaga } from '@/data/dragon/sagas'
import { avgLevel, TEAM_MAX } from '@/engine/dragon/run'
import { effStats, fighterMaxHp, fighterPL, itemLevel, toCombatant } from '@/engine/dragon/roster'
import { useDragon } from '@/state/dragonStore'
import type { Fighter, StatKey } from '@/engine/dragon/types'
import { Avatar, Bar, Header, hpColor, Scouter } from './Bits'

const STAT_ROWS: { k: StatKey; label: string; icon: string }[] = [
  { k: 'poder', label: 'Poder', icon: 'swords' },
  { k: 'ki', label: 'Ki', icon: 'spark' },
  { k: 'defensa', label: 'Defensa', icon: 'scales' },
  { k: 'velocidad', label: 'Velocidad', icon: 'fastForward' },
  { k: 'aguante', label: 'Aguante', icon: 'heal' },
]

/** Fila de un luchador. La misma lectura que un equipo Pokémon: cara + barras. */
function TeamSlot({ f, saga, selected, onClick }: {
  f: Fighter
  saga: number
  selected: boolean
  onClick: () => void
}) {
  const max = fighterMaxHp(f)
  const ko = f.hp <= 0
  const item = f.item ? getItem(f.item) : undefined
  const lvl = itemLevel(f)
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 rounded-2xl p-2.5 text-left transition ${
        selected ? 'bg-slate-700/70' : 'bg-slate-800/60'
      } active:scale-[0.99] ${ko ? 'opacity-50' : ''}`}
      style={{ boxShadow: selected ? `inset 0 0 0 2px ${f.color}` : 'inset 0 0 0 1px #ffffff10' }}
    >
      <Avatar name={f.name} color={f.color} size={46} baseId={f.baseId} form={f.forms.length ? f.forms[0] : undefined} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-[13.5px] truncate">{f.name}</span>
          <span className="text-[10px] text-slate-400 shrink-0">Nv.{f.level}</span>
          {f.zenkai > 1 && (
            <span className="text-[9px] text-orange-300 shrink-0" title="Zenkai acumulado">
              Zenkai ×{f.zenkai.toFixed(2)}
            </span>
          )}
        </div>
        <div className="mt-1">
          <Bar value={Math.max(0, f.hp)} max={max} color={hpColor(f.hp / max)} height={8} />
        </div>
        <div className="flex items-center gap-1.5 mt-1 min-w-0">
          <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
            {Math.max(0, Math.round(f.hp))}/{max}
          </span>
          {item ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-sky-300 truncate">
              <Icon name={itemIcon(item)} className="w-3 h-3 shrink-0" />
              {item.name}{lvl > 0 && ` +${lvl}`}
            </span>
          ) : (
            <span className="text-[10px] text-slate-500">sin objeto</span>
          )}
          {ko && <span className="text-[10px] text-red-400 shrink-0">K.O.</span>}
        </div>
      </div>
      <Scouter pl={fighterPL(f, getSaga(saga).plScale)} compact />
    </button>
  )
}

/** Hueco libre. Existe para que el tope de equipo se vea sin explicarlo. */
function EmptySlot() {
  return (
    <div
      className="w-full flex items-center gap-2.5 rounded-2xl p-2.5 border border-dashed border-slate-700"
      style={{ minHeight: 70 }}
    >
      <span className="grid place-items-center rounded-xl bg-slate-800/50" style={{ width: 46, height: 46 }}>
        <Icon name="plus" className="w-5 h-5 text-slate-600" />
      </span>
      <span className="text-[12px] text-slate-500">Hueco libre · busca aliados por el mapa</span>
    </div>
  )
}

export default function TeamView() {
  const { save, closeTeam, equip, useField } = useDragon()
  const [sel, setSel] = useState<string | null>(null)
  const [tab, setTab] = useState<'equipo' | 'bolsa'>('equipo')
  if (!save) return null

  const elegido = save.team.find((f) => f.uid === sel) ?? save.team[0] ?? null
  const huecos = Math.max(0, TEAM_MAX - save.team.length)
  const bolsa = Object.entries(save.bag)
    .map(([id, n]) => ({ it: getItem(id), n }))
    .filter((x): x is { it: Item; n: number } => !!x.it && x.n > 0)
  const equipables = bolsa.filter((x) => x.it.kind === 'equipo')
  const consumibles = bolsa.filter((x) => x.it.kind === 'uso')

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header
        title="Tu equipo"
        sub={`${save.team.length} de ${TEAM_MAX} luchadores · nivel medio ${avgLevel(save)}`}
        onBack={closeTeam}
        right={
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 tabular-nums shrink-0">
            <Icon name="coin" className="w-3 h-3" />{save.zeni}
          </span>
        }
      />

      <div className="flex gap-1.5 px-3 pt-2 shrink-0">
        {(['equipo', 'bolsa'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-xl py-2 text-[12.5px] font-bold transition ${
              tab === t ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-300'
            }`}
          >
            {t === 'equipo' ? 'Luchadores' : `Bolsa (${bolsa.reduce((a, x) => a + x.n, 0)})`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
        {tab === 'equipo' ? (
          <>
            {save.team.map((f) => (
              <TeamSlot
                key={f.uid}
                f={f}
                saga={save.saga}
                selected={elegido?.uid === f.uid}
                onClick={() => setSel(f.uid)}
              />
            ))}
            {Array.from({ length: huecos }, (_, i) => <EmptySlot key={`hueco-${i}`} />)}

            {elegido && <FighterDetail f={elegido} save={save} onEquip={equip} onUse={useField} equipables={equipables} />}
          </>
        ) : (
          <>
            <BagSection
              titulo="Equipables"
              vacio="Nada que ponerse todavía. Se compran en las tiendas del mapa."
              items={equipables}
              save={save}
            />
            <BagSection
              titulo="Consumibles"
              vacio="Sin consumibles. Llevar una semilla encima salva runs."
              items={consumibles}
              save={save}
            />
          </>
        )}
      </div>
    </div>
  )
}

/** Ficha completa del seleccionado: atributos, carácter, vínculos y equipo. */
function FighterDetail({ f, save, onEquip, onUse, equipables }: {
  f: Fighter
  save: NonNullable<ReturnType<typeof useDragon.getState>['save']>
  onEquip: (uid: string, itemId?: string) => void
  onUse: (itemId: string, uid: string) => void
  equipables: { it: Item; n: number }[]
}) {
  const c = toCombatant(f, save.team.map((x) => x.baseId))
  const s = effStats(c)
  const rasgo = getTrait(TRAIT_BY_FIGHTER[f.baseId] ?? '')
  const vinculos = bondsFor(f.baseId, save.team.map((x) => x.baseId))
  const item = f.item ? getItem(f.item) : undefined
  const lvl = itemLevel(f)
  const curas = Object.entries(save.bag)
    .map(([id, n]) => ({ it: getItem(id), n }))
    .filter((x): x is { it: Item; n: number } => !!x.it && x.it.kind === 'uso' && !!x.it.field && x.n > 0)
  const max = Math.max(...STAT_ROWS.map((r) => s[r.k]))

  return (
    <div className="rounded-2xl bg-slate-900/80 p-3 space-y-3" style={{ boxShadow: `inset 0 0 0 1px ${f.color}44` }}>
      <div className="flex items-center gap-2.5">
        <Avatar name={f.name} color={f.color} size={56} baseId={f.baseId} />
        <div className="min-w-0">
          <div className="font-extrabold text-[15px] leading-tight">{f.name}</div>
          <div className="text-[11px] text-slate-400 capitalize">{f.style} · {f.lineage}</div>
        </div>
      </div>

      {/* Atributos con barra: se comparan de un vistazo */}
      <div className="space-y-1">
        {STAT_ROWS.map((r) => (
          <div key={r.k} className="flex items-center gap-2">
            <Icon name={r.icon} className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="text-[10.5px] text-slate-400 w-16 shrink-0">{r.label}</span>
            <div className="flex-1 rounded-full bg-slate-800 overflow-hidden" style={{ height: 6 }}>
              <div className="h-full rounded-full" style={{ width: `${(s[r.k] / max) * 100}%`, background: f.color }} />
            </div>
            <span className="text-[10.5px] tabular-nums text-slate-300 w-8 text-right shrink-0">
              {Math.round(s[r.k])}
            </span>
          </div>
        ))}
      </div>

      {rasgo && (
        <div className="rounded-xl bg-purple-500/10 px-2.5 py-1.5" style={{ boxShadow: 'inset 0 0 0 1px #a78bfa44' }}>
          <div className="text-[11px] font-bold text-purple-300">{rasgo.name}</div>
          <div className="text-[10.5px] text-slate-400 leading-snug">{rasgo.desc}</div>
        </div>
      )}

      {vinculos.map((v) => (
        <div key={v.name} className="rounded-xl bg-emerald-500/10 px-2.5 py-1.5" style={{ boxShadow: 'inset 0 0 0 1px #34d39944' }}>
          <div className="text-[11px] font-bold text-emerald-300">{v.name}</div>
          <div className="text-[10.5px] text-slate-400 leading-snug">{v.desc}</div>
        </div>
      ))}

      <div>
        <div className="text-[10.5px] text-slate-500 mb-1">Técnicas</div>
        <div className="flex flex-wrap gap-1">
          {f.techniques.map((t) => {
            const tec = getTechnique(t)
            if (!tec) return null
            const nivel = f.techLevels?.[t] ?? 0
            return (
              <span key={t} className="text-[10.5px] rounded-lg bg-slate-800 px-2 py-0.5">
                {tec.name}{nivel > 0 && <b className="text-amber-300"> V{nivel + 1}</b>}
                <span className="text-sky-300"> · {tec.cost} ki</span>
              </span>
            )
          })}
        </div>
      </div>

      {!!f.forms.length && (
        <div>
          <div className="text-[10.5px] text-slate-500 mb-1">Transformaciones despertadas</div>
          <div className="flex flex-wrap gap-1">
            {f.forms.map((id) => (
              <span key={id} className="text-[10.5px] rounded-lg bg-amber-500/15 text-amber-200 px-2 py-0.5">
                {getForm(id)?.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Objeto: qué lleva y qué puede ponerse */}
      <div>
        <div className="text-[10.5px] text-slate-500 mb-1">Objeto equipado</div>
        {/* Lo PUESTO va en ámbar y se quita de un toque; lo disponible, en
            gris con «Equipar ›». Es la misma gramática que usa Inazuma, para
            que no haya que aprenderse dos lenguajes distintos. */}
        <div className="flex flex-col gap-1.5">
          {item ? (
            <button
              type="button"
              onClick={() => onEquip(f.uid, undefined)}
              className="flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 px-2 py-1.5 text-left active:scale-[0.99] transition"
            >
              <Icon name={itemIcon(item)} className="w-5 h-5 text-amber-300 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-bold text-amber-200">
                  {item.name}{lvl > 0 && <span className="text-emerald-300"> +{lvl}</span>} · puesto
                </span>
                <span className="block text-[10px] text-slate-400 leading-snug">
                  {itemEffect(item).join(' · ')}
                </span>
              </span>
              <span className="shrink-0 text-[10px] font-bold text-rose-300">Quitar ✕</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-600">No lleva nada.</span>
          )}
          {equipables.map(({ it, n }) => (
            <button
              key={it.id}
              type="button"
              onClick={() => onEquip(f.uid, it.id)}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-2 py-1.5 text-left active:scale-[0.99] transition"
            >
              <Icon name={itemIcon(it)} className="w-5 h-5 text-slate-300 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-bold">{it.name} <span className="text-slate-500">×{n}</span></span>
                <span className="block text-[10px] text-emerald-300 leading-snug">{itemEffect(it).join(' · ')}</span>
              </span>
              <span className="shrink-0 text-[10px] font-bold text-emerald-300">Equipar ›</span>
            </button>
          ))}
          {!equipables.length && !item && (
            <span className="text-[11px] text-slate-600">Nada en la bolsa que ponerse.</span>
          )}
        </div>
      </div>

      {!!curas.length && (
        <div>
          <div className="text-[10.5px] text-slate-500 mb-1">Usar ahora</div>
          <div className="flex flex-wrap gap-1">
            {curas.map(({ it, n }) => (
              <button
                key={it.id}
                type="button"
                onClick={() => onUse(it.id, f.uid)}
                className="inline-flex items-center gap-1 text-[10.5px] px-2 py-1 rounded-lg bg-emerald-900/60 active:bg-emerald-800"
              >
                <Icon name={itemIcon(it)} className="w-3 h-3" />
                {it.name} ×{n}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Un bloque de la bolsa. El título ya dice si se lleva puesto o se gasta. */
function BagSection({ titulo, vacio, items, save }: {
  titulo: string
  vacio: string
  items: { it: Item; n: number }[]
  save: NonNullable<ReturnType<typeof useDragon.getState>['save']>
}) {
  const familia = items[0] ? itemFamily(items[0].it) : null
  return (
    <div>
      <div className="flex items-baseline gap-2 px-0.5 mb-1.5">
        <span className="text-[12.5px] font-bold" style={{ color: familia?.color ?? '#94a3b8' }}>{titulo}</span>
        {familia && <span className="text-[10.5px] text-slate-500">{familia.hint}</span>}
      </div>
      {items.length === 0 ? (
        <div className="text-[11.5px] text-slate-500 rounded-xl border border-dashed border-slate-700 px-3 py-3">
          {vacio}
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map(({ it, n }) => {
            const quien = save.team.find((f) => f.item === it.id)
            return (
              <div
                key={it.id}
                className="flex items-start gap-2.5 rounded-xl bg-slate-800/70 p-2.5"
                style={{ boxShadow: `inset 0 0 0 1px ${itemFamily(it).color}33` }}
              >
                <span
                  className="grid place-items-center rounded-xl shrink-0"
                  style={{ width: 36, height: 36, background: `${itemFamily(it).color}22` }}
                >
                  <Icon name={itemIcon(it)} className="w-4.5 h-4.5" style={{ color: itemFamily(it).color }} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12.5px] font-bold truncate flex-1">{it.name}</span>
                    <span className="text-[10.5px] text-slate-400 shrink-0">×{n}</span>
                    <span className="text-[10px] font-bold text-emerald-300 shrink-0">{itemVerb(it)}</span>
                  </div>
                  <div className="text-[11px] text-emerald-300 leading-snug">{itemEffect(it).join(' · ')}</div>
                  <div className="text-[10.5px] text-slate-500 leading-snug">{it.desc}</div>
                  {quien && (
                    <div className="text-[10px] text-amber-300 mt-0.5 inline-flex items-center gap-1">
                      <Icon name="check" className="w-3 h-3" />Lo lleva {quien.name}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
