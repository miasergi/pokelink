// El combate. Reproduce `battle.log` como narración y ofrece las cinco
// decisiones del turno; los momentos gordos (choque de rayos, relevo tras una
// caída) salen como overlay para que no se confundan con un turno normal.
import { useEffect, useRef, useState } from 'react'
import { getTechnique } from '@/data/dragon/techniques'
import { getForm } from '@/data/dragon/transformations'
import { getItem } from '@/data/dragon/items'
import { getSaga } from '@/data/dragon/sagas'
import { affordableTechs, ally, availableForms, foe, PUSH_OPTIONS } from '@/engine/dragon/battle'
import { useDragon } from '@/state/dragonStore'
import type { Battle, BattleEvent } from '@/engine/dragon/types'
import { Bar, CombatantPanel, KI_COLOR, sceneBg } from './Bits'

/** Traduce un evento del motor a la línea que lee el jugador. */
function eventText(b: Battle, e: BattleEvent): string | null {
  const who = (uid: string) =>
    [...b.allies, ...b.enemies].find((c) => c.uid === uid)?.name ?? '?'
  switch (e.t) {
    case 'action':
      switch (e.kind) {
        case 'golpe': return `${who(e.uid)} ataca cuerpo a cuerpo.`
        case 'tecnica': return `¡${who(e.uid)} usa ${e.name}!`
        case 'cargar': return `${who(e.uid)} concentra su ki…`
        case 'guardia': return `${who(e.uid)} se cubre.`
        case 'objeto': return `${who(e.uid)} usa ${e.name}.`
        default: return null
      }
    case 'damage':
      return `${who(e.uid)} recibe ${e.amount}${e.crit ? ' — ¡golpe crítico!' : ''}${
        e.eff && e.eff > 1.1 ? ' (le viene fatal)' : ''
      }`
    case 'heal': return `${who(e.uid)} recupera ${e.amount} PS.`
    case 'transform': return `¡${who(e.uid)} se transforma en ${e.name}!`
    case 'formEnd': return `${who(e.uid)} no aguanta más y pierde la transformación.`
    case 'stun': return `${who(e.uid)} está aturdido y pierde el turno.`
    case 'clash':
      return e.winner === 'empate'
        ? '¡Los dos rayos chocan y estallan a la vez!'
        : `¡El choque de rayos lo gana ${e.winner === 'aliado' ? 'tu luchador' : 'el rival'}!`
    case 'faint': return `${who(e.uid)} ya no puede seguir.`
    case 'switch': return `¡Adelante, ${e.name}!`
    case 'buff': return e.text
    case 'end': return e.win ? '¡Victoria!' : 'Derrota…'
    case 'text': return e.text
    default: return null
  }
}

function ActionButton({ label, sub, onClick, disabled, accent }: {
  label: string
  sub?: string
  onClick: () => void
  disabled?: boolean
  accent?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex-1 min-w-0 rounded-xl px-2 py-2.5 text-center bg-slate-800 active:bg-slate-700 disabled:opacity-35 transition-colors"
      style={{ boxShadow: accent ? `inset 0 0 0 1.5px ${accent}` : 'inset 0 0 0 1px #ffffff12' }}
    >
      <div className="text-[13px] font-bold truncate">{label}</div>
      {sub && <div className="text-[10px] text-slate-400 truncate">{sub}</div>}
    </button>
  )
}

export default function BattleView() {
  const { save, battle, act, clash, relay, toggleAuto, finishBattle } = useDragon()
  const [tab, setTab] = useState<'main' | 'tecnicas' | 'formas' | 'objetos'>('main')
  const logRef = useRef<HTMLDivElement>(null)

  // El log crece por abajo: hay que seguirlo o te pierdes lo que acaba de pasar.
  // `scrollTo` va con `?.` porque jsdom (los tests de humo) no lo implementa en
  // elementos y tumbaría el montaje entero por una animación cosmética.
  useEffect(() => {
    const el = logRef.current
    el?.scrollTo?.({ top: el.scrollHeight, behavior: 'smooth' })
  }, [battle?.log.length])

  // Al volver al menú principal de acciones cada vez que toca decidir, para no
  // dejar al jugador mirando una pestaña de técnicas de hace dos turnos.
  useEffect(() => {
    if (battle?.pending?.kind === 'accion') setTab('main')
  }, [battle?.turn, battle?.pending?.kind])

  if (!save || !battle) return null
  const me = ally(battle)
  const enemy = foe(battle)
  const saga = getSaga(save.saga)
  const lines = battle.log.map((e) => eventText(battle, e)).filter(Boolean) as string[]
  const banco = battle.allies.filter((c) => c.uid !== me.uid && !c.fainted && c.hp > 0)
  const techs = affordableTechs(me)
  const formas = availableForms(me)
  const bolsa = Object.entries(battle.bag).filter(([, n]) => n > 0)

  const decidiendo = battle.pending?.kind === 'accion'

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: sceneBg(battle.scene) }}>
      <div className="px-3 py-2 flex items-center gap-2 border-b border-slate-800/80 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-slate-400 truncate">{saga.name}</div>
          <div className="font-bold text-sm truncate">{battle.title}</div>
        </div>
        <span className="text-[11px] text-slate-400 tabular-nums">Turno {battle.turn}</span>
        <button
          type="button"
          onClick={toggleAuto}
          className={`text-[11px] px-2 py-1 rounded-lg ${battle.auto ? 'bg-amber-500 text-slate-900 font-bold' : 'bg-slate-800 text-slate-300'}`}
        >
          Auto
        </button>
      </div>

      {/* Rival arriba, como en cualquier combate por turnos. */}
      <div className="px-3 pt-3">
        <CombatantPanel c={enemy} saga={save.saga} enemy />
        {battle.phases && battle.phases.length > 0 && (
          <div className="text-[10px] text-slate-500 text-right mt-1">
            Fase {battle.phase + 1} de {battle.phases.length + 1}
          </div>
        )}
      </div>

      {/* Narración */}
      <div
        ref={logRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-3 my-2 space-y-1 text-[12.5px] leading-snug"
      >
        {lines.slice(-40).map((l, i) => (
          <div
            key={`${i}-${l}`}
            className={
              /¡Victoria|Derrota|se transforma|choque de rayos|estalla de rabia/.test(l)
                ? 'text-amber-300 font-semibold'
                : /recibe|ya no puede/.test(l)
                  ? 'text-slate-400'
                  : 'text-slate-200'
            }
          >
            {l}
          </div>
        ))}
      </div>

      {/* Tu luchador y el banquillo */}
      <div className="px-3 pb-2">
        <CombatantPanel c={me} saga={save.saga} />
        {banco.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {banco.map((c) => (
              <div key={c.uid} className="flex-1 rounded-lg bg-slate-800/60 px-2 py-1">
                <div className="text-[10px] font-semibold truncate">{c.name}</div>
                <Bar value={c.hp} max={c.hpMax} color={KI_COLOR} height={4} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botonera */}
      <div className="px-3 pb-3 shrink-0">
        {battle.over ? (
          <button
            type="button"
            onClick={finishBattle}
            className="w-full rounded-xl py-3 font-bold bg-amber-500 text-slate-900 active:bg-amber-400"
          >
            Continuar
          </button>
        ) : !decidiendo ? (
          <div className="text-center text-[12px] text-slate-500 py-3">
            {battle.auto ? 'Piloto automático…' : 'Resolviendo…'}
          </div>
        ) : tab === 'main' ? (
          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              <ActionButton label="Golpear" sub={`+20 ki`} onClick={() => act({ kind: 'golpe' })} accent="#f97316" />
              <ActionButton
                label="Técnica"
                sub={techs.length ? `${techs.length} disponibles` : 'sin ki'}
                onClick={() => setTab('tecnicas')}
                disabled={!techs.length}
                accent="#0ea5e9"
              />
            </div>
            <div className="flex gap-1.5">
              <ActionButton label="Cargar ki" sub="+45, quedas expuesto" onClick={() => act({ kind: 'cargar' })} />
              <ActionButton label="Guardia" sub="-58 % daño, +22 ki" onClick={() => act({ kind: 'guardia' })} />
            </div>
            <div className="flex gap-1.5">
              <ActionButton
                label="Transformar"
                sub={formas.length ? `${formas.length} disponible(s)` : me.forms.length ? 'sin ki' : 'ninguna aún'}
                onClick={() => setTab('formas')}
                disabled={!formas.length}
                accent="#fde047"
              />
              <ActionButton
                label="Objeto"
                sub={bolsa.length ? `${bolsa.length} en la bolsa` : 'vacía'}
                onClick={() => setTab('objetos')}
                disabled={!bolsa.length}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setTab('main')}
              className="text-[11px] text-slate-400 px-1"
            >
              ‹ Volver
            </button>
            <div className="max-h-44 overflow-y-auto space-y-1.5">
              {tab === 'tecnicas' && techs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => act({ kind: 'tecnica', id: t.id })}
                  className="w-full text-left rounded-xl bg-slate-800 active:bg-slate-700 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[13px] flex-1 truncate">{t.name}</span>
                    <span className="text-[11px] text-sky-300 tabular-nums">{t.cost} ki</span>
                    {t.power > 0 && <span className="text-[11px] text-orange-300 tabular-nums">{t.power}</span>}
                  </div>
                  <div className="text-[10.5px] text-slate-400 leading-tight mt-0.5">{t.desc}</div>
                </button>
              ))}
              {tab === 'formas' && formas.map((id) => {
                const f = getForm(id)!
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => act({ kind: 'transformar', id })}
                    className="w-full text-left rounded-xl bg-slate-800 active:bg-slate-700 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[13px] flex-1 truncate text-amber-300">{f.name}</span>
                      <span className="text-[11px] text-sky-300 tabular-nums">{f.cost} ki</span>
                      <span className="text-[10px] text-slate-400 tabular-nums">-{f.upkeep}/turno</span>
                    </div>
                    <div className="text-[10.5px] text-slate-400 leading-tight mt-0.5">{f.desc}</div>
                  </button>
                )
              })}
              {tab === 'objetos' && bolsa.map(([id, n]) => {
                const it = getItem(id)
                if (!it) return null
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => act({ kind: 'objeto', id })}
                    className="w-full text-left rounded-xl bg-slate-800 active:bg-slate-700 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[13px] flex-1 truncate">{it.name}</span>
                      <span className="text-[11px] text-slate-400">×{n}</span>
                    </div>
                    <div className="text-[10.5px] text-slate-400 leading-tight mt-0.5">{it.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ---- CHOQUE DE RAYOS: el momento estrella, con su propio overlay ---- */}
      {battle.pending?.kind === 'choque' && (
        <div className="absolute inset-0 z-30 grid place-items-center p-4" style={{ background: '#020617e0' }}>
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-4" style={{ boxShadow: '0 0 0 1.5px #38bdf8, 0 0 40px #0ea5e955' }}>
            <div className="text-center">
              <div className="text-[11px] uppercase tracking-widest text-sky-300">Choque de rayos</div>
              <div className="font-black text-lg mt-1 leading-tight">
                {getTechnique(battle.pending.myTech)?.name}
                <span className="text-slate-500"> vs </span>
                {getTechnique(battle.pending.enemyTech)?.name}
              </div>
              <p className="text-[12px] text-slate-400 mt-2">
                Los dos rayos se han encontrado. Puedes quemar ki extra para empujar:
                el que gana el pulso se lleva el impacto entero.
              </p>
            </div>
            <div className="flex gap-1.5 mt-4">
              {PUSH_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => clash(p)}
                  disabled={p > me.ki}
                  className="flex-1 rounded-xl py-3 font-bold bg-slate-800 active:bg-slate-700 disabled:opacity-30"
                  style={{ boxShadow: p ? 'inset 0 0 0 1.5px #0ea5e9' : 'inset 0 0 0 1px #ffffff12' }}
                >
                  <div className="text-[15px]">{p === 0 ? 'Aguantar' : `+${p}`}</div>
                  <div className="text-[10px] text-slate-400">{p === 0 ? 'sin gastar' : 'ki extra'}</div>
                </button>
              ))}
            </div>
            <div className="mt-3">
              <Bar value={me.ki} max={me.kiMax} color={KI_COLOR} height={6} label="Tu ki" />
            </div>
          </div>
        </div>
      )}

      {/* ---- RELEVO tras una caída ---- */}
      {battle.pending?.kind === 'relevo' && (
        <div className="absolute inset-0 z-30 grid place-items-center p-4" style={{ background: '#020617e0' }}>
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-4" style={{ boxShadow: '0 0 0 1.5px #f87171' }}>
            <div className="font-black text-lg text-center">¿Quién sale ahora?</div>
            <p className="text-[12px] text-slate-400 text-center mt-1">
              El que entre lo hará furioso: con el ki lleno y pegando más fuerte.
            </p>
            <div className="space-y-1.5 mt-3">
              {battle.allies.filter((c) => !c.fainted && c.hp > 0).map((c) => (
                <button
                  key={c.uid}
                  type="button"
                  onClick={() => relay(c.uid)}
                  className="w-full flex items-center gap-2 rounded-xl bg-slate-800 active:bg-slate-700 px-3 py-2"
                >
                  <span className="font-bold text-[13px] flex-1 text-left truncate">{c.name}</span>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {Math.round(c.hp)}/{c.hpMax} PS
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
