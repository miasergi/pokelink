// El combate, contado. El motor va por delante generando el log y esta vista
// lo REVELA a su ritmo (ver el ticker de `dragonStore`), así que se lee como
// una retransmisión y no como un volcado. Tú solo apareces en los momentos
// clave: la jugada de cada asalto, el choque de rayos y el relevo.
import { useEffect, useRef } from 'react'
import Icon from '@/ui/components/Icon'
import { getTechnique } from '@/data/dragon/techniques'
import { getSaga } from '@/data/dragon/sagas'
import { ally, foe, oddsStars } from '@/engine/dragon/battle'
import { useDragon } from '@/state/dragonStore'
import type { Battle, BattleEvent, DecisionOption } from '@/engine/dragon/types'
import { CombatantPanel, hpColor, MiniFighter, sceneBg } from './Bits'
import { DragonFXLayer, useDragonFX } from './DragonFX'

/** Traduce un evento del motor a la línea que lee el jugador. */
function eventText(b: Battle, e: BattleEvent): string | null {
  const who = (uid: string) =>
    [...b.allies, ...b.enemies].find((c) => c.uid === uid)?.name ?? '?'
  switch (e.t) {
    case 'action':
      switch (e.kind) {
        case 'golpe': return `${who(e.uid)} entra al cuerpo a cuerpo.`
        case 'tecnica': return `¡${who(e.uid)} usa ${e.name}!`
        case 'cargar': return `${who(e.uid)} concentra su ki…`
        case 'guardia': return `${who(e.uid)} se cubre.`
        case 'objeto': return `${who(e.uid)} usa ${e.name}.`
        default: return null
      }
    case 'damage':
      return `${who(e.uid)} encaja ${e.amount}${e.crit ? ' — ¡crítico!' : ''}${
        e.eff && e.eff > 1.1 ? ' (le viene fatal)' : ''
      }`
    case 'heal': return `${who(e.uid)} recupera ${e.amount} PS.`
    case 'transform': return `¡${who(e.uid)} se transforma en ${e.name}!`
    case 'formEnd': return `${who(e.uid)} no aguanta más y pierde la transformación.`
    case 'stun': return `${who(e.uid)} está aturdido y pierde el turno.`
    case 'clash':
      return e.winner === 'empate'
        ? '¡Los dos rayos chocan y estallan a la vez!'
        : `¡El choque lo gana ${e.winner === 'aliado' ? 'tu luchador' : 'el rival'}!`
    case 'faint': return `${who(e.uid)} ya no puede seguir.`
    case 'switch': return `¡Adelante, ${e.name}!`
    case 'buff': return e.text
    case 'end': return e.win ? '¡Victoria!' : 'Derrota…'
    case 'text': return e.text
    default: return null
  }
}

const DESTACADO = /Victoria|Derrota|se transforma|choque|estalla de rabia|no había enseñado|vuelve a ponerse/

/** Cómo pinta una jugada, de un vistazo. Mismo lenguaje que el mapa. */
function Stars({ n }: { n: 1 | 2 | 3 }) {
  const color = n === 3 ? '#4ade80' : n === 2 ? '#fbbf24' : '#f87171'
  return (
    <span className="inline-flex items-center shrink-0">
      {[1, 2, 3].map((i) => (
        <Icon
          key={i}
          name="star"
          className="w-2.5 h-2.5"
          style={{ color, opacity: i <= n ? 1 : 0.22 }}
        />
      ))}
    </span>
  )
}

function OptionButton({ o, onPick, ki }: { o: DecisionOption; onPick: () => void; ki: number }) {
  const caro = (o.cost ?? 0) > ki
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={o.disabled || caro}
      className="w-full text-left rounded-xl bg-slate-800/90 active:bg-slate-700 px-3 py-2 disabled:opacity-35"
      style={{ boxShadow: o.tag === 'LÍMITE' ? 'inset 0 0 0 1.5px #fde047' : 'inset 0 0 0 1px #ffffff12' }}
    >
      <div className="flex items-center gap-2">
        <span className={`font-bold text-[13.5px] flex-1 truncate ${o.tag === 'LÍMITE' ? 'text-amber-300' : ''}`}>
          {o.label}
        </span>
        {o.tag && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 tracking-wide">
            {o.tag}
          </span>
        )}
        {!!o.cost && (
          <span className={`text-[11px] tabular-nums ${caro ? 'text-red-400' : 'text-sky-300'}`}>{o.cost} ki</span>
        )}
        <Stars n={oddsStars(o.chance)} />
      </div>
      {o.desc && <div className="text-[10.5px] text-slate-400 leading-tight mt-0.5">{o.desc}</div>}
    </button>
  )
}

export default function BattleView() {
  const {
    save, battle, revealed, playing, speed,
    decide, togglePlaying, setSpeed, toggleAuto, finishBattle,
  } = useDragon()
  const logRef = useRef<HTMLDivElement>(null)

  // `scrollTo` va con `?.` porque jsdom (los tests de humo) no lo implementa en
  // elementos y tumbaría el montaje entero por una animación cosmética.
  useEffect(() => {
    const el = logRef.current
    el?.scrollTo?.({ top: el.scrollHeight, behavior: 'smooth' })
  }, [revealed])

  // EL ESPECTÁCULO. Se engancha al último evento revelado, así que la imagen va
  // clavada al texto que se acaba de leer. Va aquí arriba porque es un hook: no
  // puede quedar detrás del `return null` de más abajo.
  const fx = useDragonFX(battle, revealed)

  if (!save || !battle) return null
  const me = ally(battle)
  const enemy = foe(battle)
  const saga = getSaga(save.saga)
  // Solo lo YA contado: el motor va por delante y no se puede destripar.
  const lines = battle.log
    .slice(0, revealed)
    .map((e) => eventText(battle, e))
    .filter(Boolean) as string[]
  const banco = battle.allies.filter((c) => c.uid !== me.uid && !c.fainted && c.hp > 0)
  const bancoRival = battle.enemies.filter((c) => c.uid !== enemy.uid && !c.fainted && c.hp > 0)
  const d = battle.phase === 'decision' ? battle.decision : null
  const contando = revealed < battle.log.length
  const rivalTech = d?.rivalTech ? getTechnique(d.rivalTech) : undefined

  return (
    <div className="flex flex-col flex-1 min-h-0 relative overflow-hidden" style={{ background: sceneBg(battle.scene) }}>
      {/* Todo el combate va dentro de este envoltorio para que la SACUDIDA lo
          mueva entero (los efectos, que son la capa de fuera, se quedan
          quietos: si temblaran también, el golpe no se notaría). */}
      <div className="flex flex-col flex-1 min-h-0" style={fx.shakeStyle}>
        <div className="px-3 py-2 flex items-center gap-1.5 border-b border-slate-800/80 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-slate-400 truncate">{saga.name}</div>
            <div className="font-bold text-sm truncate">{battle.title}</div>
          </div>
          <button
            type="button"
            onClick={() => setSpeed(speed > 260 ? 150 : 420)}
            className="text-[11px] px-2 py-1 rounded-lg bg-slate-800 text-slate-300"
          >
            {speed > 260 ? '×1' : '×2'}
          </button>
          <button
            type="button"
            onClick={togglePlaying}
            className="text-[11px] px-2 py-1 rounded-lg bg-slate-800 text-slate-300"
          >
            {playing ? 'Pausa' : 'Seguir'}
          </button>
          <button
            type="button"
            onClick={toggleAuto}
            className={`text-[11px] px-2 py-1 rounded-lg ${battle.auto ? 'bg-amber-500 text-slate-900 font-bold' : 'bg-slate-800 text-slate-300'}`}
          >
            Auto
          </button>
        </div>

        {/* Rival */}
        <div className="px-3 pt-3">
          <CombatantPanel c={enemy} saga={save.saga} enemy />
          {(bancoRival.length > 0 || (battle.phases?.length ?? 0) > 0) && (
            <div className="flex items-center justify-end gap-1.5 mt-1">
              {battle.phases && battle.phases.length > 0 && (
                <span className="text-[10px] text-slate-500">
                  Fase {battle.bossPhase + 1} de {battle.phases.length + 1}
                </span>
              )}
              {bancoRival.map((c) => <MiniFighter key={c.uid} c={c} />)}
            </div>
          )}
        </div>

        {/* Retransmisión */}
        <div ref={logRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 my-1 space-y-1 text-[12.5px] leading-snug">
          {lines.slice(-40).map((l, i) => (
            <div
              key={`${i}-${l}`}
              className={
                DESTACADO.test(l) ? 'text-amber-300 font-semibold'
                  : /encaja|ya no puede/.test(l) ? 'text-slate-400'
                    : 'text-slate-200'
              }
            >
              {l}
            </div>
          ))}
        </div>

        {/* Tú */}
        <div className="px-3 pb-2">
          <CombatantPanel c={me} saga={save.saga} />
          {banco.length > 0 && (
            <div className="flex gap-1.5 mt-2">
              {banco.map((c) => (
                <div key={c.uid} className="flex-1 rounded-lg bg-slate-800/60 px-2 py-1">
                  <div className="text-[10px] font-semibold truncate">{c.name}</div>
                  <div className="w-full rounded-full bg-slate-900 overflow-hidden" style={{ height: 4 }}>
                    <div
                      className="h-full transition-all duration-300"
                      style={{ width: `${(c.hp / c.hpMax) * 100}%`, background: hpColor(c.hp / c.hpMax) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pie: o el final, o el momento clave, o el relato corriendo */}
        <div className="px-3 pb-3 shrink-0">
          {battle.over && !contando ? (
            <button
              type="button"
              onClick={finishBattle}
              className="w-full rounded-xl py-3 font-bold bg-amber-500 text-slate-900 active:bg-amber-400"
            >
              Continuar
            </button>
          ) : d && !contando ? (
            <div className="space-y-1.5">
              <div className="flex items-baseline gap-2 px-0.5">
                <span className="font-black text-[13px] text-amber-300 shrink-0">{d.headline}</span>
                {d.desc && <span className="text-[10.5px] text-slate-400 flex-1 leading-tight">{d.desc}</span>}
              </div>
              {rivalTech && (
                <div className="text-[11px] text-sky-300 px-0.5">
                  El rival viene con {rivalTech.name}.
                </div>
              )}
              <div className="max-h-56 overflow-y-auto space-y-1.5">
                {d.options.map((o) => (
                  <OptionButton key={o.id} o={o} ki={me.ki} onPick={() => decide(o.id)} />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-[12px] text-slate-500 py-3">
              {battle.auto ? 'Piloto automático…' : playing ? '…' : 'En pausa'}
            </div>
          )}
        </div>
      </div>

      {/* Los efectos, por encima de todo y SIN capturar toques: mientras una
          explosión está en pantalla el combate sigue y se puede decidir. */}
      <DragonFXLayer fx={fx} />
    </div>
  )
}
