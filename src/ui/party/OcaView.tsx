// OCALIMOCHO: el Juego de la Oca bebedor, edición tablero clásico de bar.
// Tablero verde fieltro con marco de madera, casillas COLOREADAS por
// categoría (ocas, a beber, duelos, laberinto, cárcel, zona cultural…),
// hoja de reglas consultable, paseo animado de la ficha y cartas con
// mecánica propia: duelo de dados interactivo, fianza a dos dados y
// escape del laberinto sacando 5 o 6. El motor puro vive en
// `engine/party/oca.ts`; aquí solo hay turnos y presentación.
import { useEffect, useRef, useState } from 'react'
import {
  CULTURAL_CATEGORIES, LABERINTO_ESCAPE, OCA_COLORS, resolveMove, squareAt,
  walkPath, type OcaKind, type OcaMove,
} from '@/engine/party/oca'
import { PartyHeader } from '@/ui/party/partyKit'
import Icon from '@/ui/components/Icon'
import { play } from '@/utils/sfx'

/** Color de cada categoría (casilla, carta y leyenda beben de aquí). */
const KIND_COLOR: Record<OcaKind, string> = {
  normal: '#94a3b8',
  oca: '#4ade80',
  beber: '#fbbf24',
  duelo: '#38bdf8',
  laberinto: '#2dd4bf',
  carcel: '#a1a1aa',
  posada: '#e2e8f0',
  regla: '#a78bfa',
  cultural: '#fb7185',
  hipnosis: '#e879f9',
  patinazo: '#fb923c',
  muerte: '#ef4444',
  meta: '#facc15',
}

/** Hoja de REGLAS (como la columna del tablero clásico). */
const LEGEND: Array<{ kind: OcaKind; emoji: string; title: string; text: string }> = [
  { kind: 'oca', emoji: '🦆', title: 'Ocas (cada 8)', text: 'Bebe 1 al grito de «¡de ocho en ocho y bebo calimocho!», salta a la siguiente oca y vuelve a tirar.' },
  { kind: 'beber', emoji: '🍺', title: '¡A beber! ×N', text: 'Reparte los tragos marcados entre quien quieras.' },
  { kind: 'duelo', emoji: '🎲', title: 'Duelo de dados', text: 'Reta a alguien: un dado cada uno, el que saque menos bebe 2 (empate: 1 y 1).' },
  { kind: 'laberinto', emoji: '🌀', title: 'Laberinto', text: `Atrapado hasta sacar ${LABERINTO_ESCAPE} o 6 (y avanzas eso). Cada fallo, bebe 1.` },
  { kind: 'carcel', emoji: '⛓️', title: 'Cárcel', text: 'Fianza a dos dados: bebes la mitad de la suma, repartes el resto y pierdes 1 turno.' },
  { kind: 'posada', emoji: '🛡️', title: 'Posada del Abstemio', text: 'Nadie puede mandarte beber hasta tu próximo turno.' },
  { kind: 'regla', emoji: '📜', title: 'Regla puñetera', text: 'Pon una norma bebedora; dura hasta que alguien pise otra REGLA.' },
  { kind: 'cultural', emoji: '🧠', title: 'Zona cultural', text: 'Categoría al azar: respuestas por turnos, el que falle o repita bebe 2.' },
  { kind: 'hipnosis', emoji: '😵‍💫', title: 'Hipnosis', text: 'Hasta tu próximo turno, la mitad de lo que mandes beber… lo bebes tú.' },
  { kind: 'patinazo', emoji: '🫠', title: 'Patinazo', text: 'Resbalas hacia atrás (42→12, 57→31) y bebes 2.' },
  { kind: 'muerte', emoji: '💀', title: 'La Muerte (60)', text: 'De vuelta a la salida y bebe 3.' },
  { kind: 'normal', emoji: '👓', title: 'Casillas temáticas', text: 'Cada una con su cachondeo: gafas, bandos, trabalenguas… Leed y cumplid.' },
]

function d6() { return 1 + Math.floor(Math.random() * 6) }

export default function OcaView({ players, onBack }: { players: string[]; onBack: () => void }) {
  const n = players.length
  const [positions, setPositions] = useState<number[]>(() => players.map(() => 0))
  const [skips, setSkips] = useState<number[]>(() => players.map(() => 0))
  const [trapped, setTrapped] = useState<boolean[]>(() => players.map(() => false))
  const [current, setCurrent] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'rolling' | 'moving' | 'card' | 'jump' | 'won'>('idle')
  const [dieFace, setDieFace] = useState(1)
  const [move, setMove] = useState<OcaMove | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [legend, setLegend] = useState(false)
  // Extras de las cartas con mecánica propia:
  const [fianza, setFianza] = useState<[number, number] | null>(null)
  const [cultural, setCultural] = useState<string | null>(null)
  const [duelDice, setDuelDice] = useState<{ rival: number; mine: number; theirs: number } | null>(null)
  const rollTimer = useRef<ReturnType<typeof setInterval>>()
  const stepTimer = useRef<ReturnType<typeof setInterval>>()
  const hopTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => {
    clearInterval(rollTimer.current)
    clearInterval(stepTimer.current)
    clearTimeout(hopTimer.current)
  }, [])

  if (n < 2) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <PartyHeader title="Ocalimocho" emoji="🦆" onBack={onBack} />
        <div className="flex-1 grid place-items-center p-5 text-center">
          <div className="max-w-sm">
            <div className="text-5xl mb-3">🦆</div>
            <p className="text-sm text-slate-300">
              De ocho en ocho y bebo calimocho. Necesitáis <b>al menos 2 jugadores</b>:
              apuntad a la cuadrilla desde la portada de La Previa.
            </p>
            <button onClick={() => { play('back'); onBack() }} className="mt-4 w-full rounded-2xl bg-violet-500 text-white font-extrabold py-3 active:scale-[0.98] transition">Volver</button>
          </div>
        </div>
      </div>
    )
  }

  /** Cierra el turno: suma castigos y pasa la vez saltando turnos perdidos. */
  const finishTurn = (m: OcaMove) => {
    if (m.won) { setPhase('won'); return }
    if (m.trap) setTrapped((t) => t.map((x, i) => (i === current ? true : x)))
    if (m.extraRoll) { setPhase('idle'); setMove(null); return }
    advanceTurn(skips.map((x, i) => (i === current ? x + m.skipTurns : x)))
    setMove(null)
  }

  const advanceTurn = (s: number[]) => {
    const skipped: string[] = []
    let next = (current + 1) % n
    while (s[next] > 0) {
      s[next]--
      skipped.push(`${players[next]} pierde el turno 🍺`)
      next = (next + 1) % n
    }
    setSkips(s)
    setCurrent(next)
    setNotice(skipped.length ? skipped.join(' · ') : null)
    setPhase('idle')
  }

  /** Paseo casilla a casilla y carta al llegar (la animación de v6.60). */
  const startWalk = (die: number) => {
    const m = resolveMove(positions[current], die)
    setMove(m)
    // Prepara los extras de la carta ANTES de andar, para que al abrirse ya
    // estén listos (fianza tirada, categoría elegida, duelo por decidir).
    setFianza(m.square.kind === 'carcel' ? [d6(), d6()] : null)
    setCultural(m.square.kind === 'cultural' ? CULTURAL_CATEGORIES[Math.floor(Math.random() * CULTURAL_CATEGORIES.length)] : null)
    setDuelDice(null)
    const steps = walkPath(positions[current], die)
    setPhase('moving')
    let si = 0
    clearInterval(stepTimer.current)
    stepTimer.current = setInterval(() => {
      const dest = steps[si]
      setPositions((p) => p.map((x, i) => (i === current ? dest : x)))
      play('tap')
      si++
      if (si >= steps.length) {
        clearInterval(stepTimer.current)
        play(m.won ? 'victory' : m.square.kind === 'muerte' ? 'defeat' : m.square.kind === 'normal' ? 'select' : 'levelup')
        setPhase('card')
      }
    }, 280)
  }

  const roll = () => {
    if (phase !== 'idle') return
    play('confirm')
    setPhase('rolling')
    setNotice(null)
    const inMaze = trapped[current]
    let ticks = 0
    clearInterval(rollTimer.current)
    rollTimer.current = setInterval(() => {
      ticks++
      setDieFace(d6())
      if (ticks >= 10) {
        clearInterval(rollTimer.current)
        const die = d6()
        setDieFace(die)
        if (inMaze) {
          if (die >= LABERINTO_ESCAPE) {
            // ¡Fuera! El mismo dado que te libera es el que te mueve.
            play('levelup')
            setTrapped((t) => t.map((x, i) => (i === current ? false : x)))
            setNotice(`¡${players[current]} escapa del laberinto con un ${die}! 🌀`)
            startWalk(die)
          } else {
            play('error')
            setNotice(`${players[current]} sigue perdido en el laberinto (sacó ${die}): bebe 1 🌀`)
            advanceTurn([...skips])
          }
          return
        }
        startWalk(die)
      }
    }, 90)
  }

  const runDuel = (rival: number) => {
    play('confirm')
    let mine = d6()
    let theirs = d6()
    setDuelDice({ rival, mine, theirs })
    play(mine === theirs ? 'select' : mine > theirs ? 'levelup' : 'error')
  }

  const closeCard = () => {
    if (!move || phase !== 'card') return
    // El duelo hay que jugarlo antes de pasar página.
    if (move.square.kind === 'duelo' && !duelDice) { play('error'); return }
    play('select')
    const landing = move.path[0]
    if (move.final !== landing) {
      // Salto especial (oca, patinazo, muerte): la ficha da el BRINCO al
      // cerrar la carta, y medio segundo después sigue el juego.
      setPhase('jump')
      hopTimer.current = setTimeout(() => {
        setPositions((p) => p.map((x, i) => (i === current ? move.final : x)))
        play(move.square.kind === 'muerte' ? 'defeat' : 'levelup')
        hopTimer.current = setTimeout(() => finishTurn(move), 500)
      }, 150)
      return
    }
    finishTurn(move)
  }

  const restart = () => {
    play('confirm')
    clearInterval(rollTimer.current)
    clearInterval(stepTimer.current)
    clearTimeout(hopTimer.current)
    setPositions(players.map(() => 0))
    setSkips(players.map(() => 0))
    setTrapped(players.map(() => false))
    setCurrent(0)
    setPhase('idle')
    setMove(null)
    setNotice(null)
    setDuelDice(null)
  }

  // Tablero serpenteante: 9 filas × 7 columnas, filas impares invertidas.
  const rows: number[][] = []
  for (let r = 0; r < 9; r++) {
    const row = Array.from({ length: 7 }, (_, c) => r * 7 + c + 1)
    rows.push(r % 2 === 1 ? row.reverse() : row)
  }

  const color = OCA_COLORS[current % OCA_COLORS.length]
  const cardColor = move ? KIND_COLOR[move.square.kind] : '#a78bfa'
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PartyHeader title="Ocalimocho" emoji="🦆" onBack={onBack} right={
        <div className="flex gap-1.5">
          <button onClick={() => { play('tap'); setLegend(true) }} aria-label="Ver las reglas" className="w-9 h-9 grid place-items-center rounded-full border border-slate-700 bg-slate-800/80 text-slate-300 active:scale-95 transition">
            <Icon name="question" className="w-4 h-4" />
          </button>
          <button onClick={restart} aria-label="Reiniciar partida" className="w-9 h-9 grid place-items-center rounded-full border border-slate-700 bg-slate-800/80 text-slate-400 active:scale-95 transition">
            <Icon name="refresh" className="w-4 h-4" />
          </button>
        </div>
      } />
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-3 max-w-sm w-full mx-auto">
        {/* Tablero: fieltro verde con marco de madera, como el de bar. */}
        <div
          className="rounded-2xl p-2"
          style={{
            background: 'linear-gradient(145deg, #78350f, #451a03)',
            boxShadow: 'inset 0 2px 6px rgba(255,255,255,.15), 0 14px 30px -14px rgba(0,0,0,.8)',
          }}
        >
          <div
            className="rounded-xl p-1.5"
            style={{ background: 'radial-gradient(120% 100% at 50% 0%, #166534, #14532d 55%, #052e16)' }}
          >
            {rows.map((row, r) => (
              <div key={r} className="grid grid-cols-7 gap-1 mb-1 last:mb-0">
                {row.map((idx) => {
                  const sq = squareAt(idx)
                  const kc = KIND_COLOR[sq.kind]
                  const here = positions.map((p, i) => (p === idx ? i : -1)).filter((i) => i >= 0)
                  // La casilla que está PISANDO la ficha en movimiento se
                  // enciende con el color del jugador, para seguirla con el ojo.
                  const walking = (phase === 'moving' || phase === 'jump' || phase === 'card') && positions[current] === idx
                  return (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-md grid place-items-center transition-shadow"
                      style={{
                        background: sq.kind === 'normal' ? 'rgba(2,6,23,.45)' : `${kc}2e`,
                        border: `1px solid ${walking ? color : sq.kind === 'normal' ? 'rgba(148,163,184,.25)' : `${kc}66`}`,
                        boxShadow: walking ? `0 0 10px 1px ${color}aa` : sq.kind === 'meta' ? `0 0 8px ${kc}88` : undefined,
                      }}
                    >
                      <span className="absolute top-0 left-0.5 text-[7px] font-bold" style={{ color: sq.kind === 'normal' ? 'rgb(100,116,139)' : kc }}>{idx}</span>
                      {sq.kind === 'beber' && <span className="absolute top-0 right-0.5 text-[7px] font-black" style={{ color: kc }}>×{sq.x}</span>}
                      <span className="text-[13px] leading-none">{sq.emoji}</span>
                      {here.length > 0 && (
                        <div className="absolute bottom-0.5 inset-x-0 flex justify-center gap-0.5">
                          {here.map((i) => (
                            <span
                              key={i}
                              className={`rounded-full border border-slate-950 ${i === current && walking ? 'w-2.5 h-2.5 animate-pulse' : 'w-2 h-2'}`}
                              style={{ background: OCA_COLORS[i % OCA_COLORS.length] }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Aviso de turnos perdidos / laberinto */}
        {notice && <div className="text-center text-[12px] font-bold text-amber-300 animate-pop-in">{notice}</div>}

        {/* Turno actual + dado */}
        <div className="rounded-2xl border px-4 py-3 flex items-center justify-between gap-3" style={{ borderColor: `${color}66`, background: `${color}14` }}>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide font-bold text-slate-400">Turno de</div>
            <div className="font-extrabold text-lg truncate" style={{ color }}>{players[current]}{trapped[current] ? ' 🌀' : ''}</div>
            <div className="text-[11px] text-slate-400">{trapped[current] ? `Atrapado: necesita ${LABERINTO_ESCAPE} o 6` : `Casilla ${positions[current] || 'salida'}`}</div>
          </div>
          <div className="shrink-0 w-14 h-14 rounded-xl bg-slate-50 text-slate-900 grid place-items-center text-3xl font-black shadow-lg select-none">
            {phase === 'rolling' ? <span className="animate-pulse">{dieFace}</span> : dieFace}
          </div>
        </div>

        <button
          onClick={roll}
          disabled={phase !== 'idle'}
          className="w-full rounded-2xl text-slate-950 font-extrabold py-4 text-lg active:scale-[0.98] transition disabled:opacity-50"
          style={{ background: color, boxShadow: `0 10px 24px -8px ${color}` }}
        >
          {phase === 'rolling' ? 'Rodando…'
            : phase === 'moving' ? 'Andando…'
            : phase === 'jump' ? '¡Salto!'
            : trapped[current] ? '🌀 Intentar escapar' : '🎲 Tirar el dado'}
        </button>

        {/* Marcador compacto */}
        <div className="flex flex-wrap justify-center gap-1.5 pb-2">
          {players.map((p, i) => (
            <span key={i} className={`inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/70 px-2 py-0.5 text-[10px] font-bold ${i === current ? 'text-slate-100' : 'text-slate-400'}`}>
              <span className="w-2 h-2 rounded-full" style={{ background: OCA_COLORS[i % OCA_COLORS.length] }} />
              {p} · {positions[i] || 0}{skips[i] > 0 ? ` · ⏳${skips[i]}` : ''}{trapped[i] ? ' · 🌀' : ''}
            </span>
          ))}
        </div>
      </div>

      {/* Carta de la casilla donde caes, teñida con su categoría */}
      {phase === 'card' && move && (
        <div className="absolute inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={closeCard}>
          <div
            className="w-full max-w-sm rounded-3xl border bg-slate-900 p-5 animate-pop-in text-center"
            style={{ borderColor: `${cardColor}88`, boxShadow: `0 18px 44px -16px ${cardColor}88` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl mb-1">{move.square.emoji}</div>
            <div className="font-extrabold text-xl" style={{ color: cardColor }}>{move.square.title}</div>
            <div className="text-[11px] text-slate-500 font-bold mb-2">
              {players[current]} · dado {dieFace} · casilla {move.square.idx}
              {move.bounced ? ' (¡rebote!)' : ''}
              {move.final !== move.square.idx ? ` → ${move.final}` : ''}
            </div>
            <p className="text-sm text-slate-200">{move.square.rule}</p>

            {/* Fianza de la cárcel: dos dados ya tirados */}
            {move.square.kind === 'carcel' && fianza && (
              <div className="mt-3 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm">
                <span className="text-2xl font-black tracking-wider">🎲 {fianza[0]} + {fianza[1]}</span>
                <div className="text-slate-300 mt-0.5">
                  Fianza de <b>{fianza[0] + fianza[1]}</b>: bebes <b>{Math.ceil((fianza[0] + fianza[1]) / 2)}</b> y repartes <b>{Math.floor((fianza[0] + fianza[1]) / 2)}</b>.
                </div>
              </div>
            )}

            {/* Categoría de la zona cultural */}
            {move.square.kind === 'cultural' && cultural && (
              <div className="mt-3 rounded-xl border px-3 py-2.5" style={{ borderColor: `${cardColor}66`, background: `${cardColor}14` }}>
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Categoría</div>
                <div className="font-extrabold text-lg" style={{ color: cardColor }}>{cultural}</div>
                <div className="text-[11px] text-slate-400">Empieza {players[current]} y seguís en orden.</div>
              </div>
            )}

            {/* Duelo de dados: elige rival y se resuelve aquí mismo */}
            {move.square.kind === 'duelo' && (
              duelDice ? (
                <div className="mt-3 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 animate-pop-in">
                  <div className="flex items-center justify-center gap-3 text-lg font-black">
                    <span style={{ color }}>{players[current]} 🎲{duelDice.mine}</span>
                    <span className="text-slate-500 text-sm">vs</span>
                    <span style={{ color: OCA_COLORS[duelDice.rival % OCA_COLORS.length] }}>{players[duelDice.rival]} 🎲{duelDice.theirs}</span>
                  </div>
                  <div className="text-sm text-slate-200 mt-1 font-bold">
                    {duelDice.mine === duelDice.theirs
                      ? '¡Empate! Bebéis 1 los dos. 🍻'
                      : `${duelDice.mine < duelDice.theirs ? players[current] : players[duelDice.rival]} pierde y bebe 2. 🍺`}
                  </div>
                </div>
              ) : (
                <div className="mt-3">
                  <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">Elige a tu rival</div>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {players.map((p, i) => i !== current && (
                      <button
                        key={i}
                        onClick={() => runDuel(i)}
                        className="rounded-full border px-3 py-1.5 text-[12px] font-bold active:scale-95 transition"
                        style={{ borderColor: `${OCA_COLORS[i % OCA_COLORS.length]}88`, background: `${OCA_COLORS[i % OCA_COLORS.length]}1a`, color: OCA_COLORS[i % OCA_COLORS.length] }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )
            )}

            <button
              onClick={closeCard}
              disabled={move.square.kind === 'duelo' && !duelDice}
              className="mt-4 w-full rounded-xl text-slate-950 font-extrabold py-3 active:scale-[0.98] transition disabled:opacity-40"
              style={{ background: cardColor }}
            >
              {move.won ? '¡Victoria!'
                : move.square.kind === 'duelo' && !duelDice ? 'Primero, el duelo'
                : move.extraRoll ? '¡Vuelvo a tirar!'
                : move.final !== move.square.idx ? '¡Allá voy!' : 'Siguiente turno'}
            </button>
          </div>
        </div>
      )}

      {/* Hoja de REGLAS, como la columna lateral del tablero de toda la vida */}
      {legend && (
        <div className="absolute inset-0 z-[75] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={() => setLegend(false)}>
          <div className="w-full max-w-sm max-h-[85%] rounded-3xl border border-amber-500/40 bg-slate-900 p-4 animate-pop-in flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="text-center shrink-0 mb-2">
              <div className="text-3xl">📖</div>
              <div className="font-extrabold text-lg text-amber-300">Reglas del Ocalimocho</div>
              <p className="text-[11px] text-slate-400">Llega a la 63 («¡vete a dormirla!») antes que nadie. Rebote si te pasas.</p>
            </div>
            <div className="overflow-y-auto no-scrollbar flex flex-col gap-1.5 pr-1">
              {LEGEND.map((l) => (
                <div key={l.title} className="flex gap-2.5 items-start rounded-xl px-3 py-2" style={{ background: `${KIND_COLOR[l.kind]}12`, border: `1px solid ${KIND_COLOR[l.kind]}33` }}>
                  <span className="text-lg shrink-0">{l.emoji}</span>
                  <div className="min-w-0">
                    <div className="text-[12px] font-extrabold" style={{ color: KIND_COLOR[l.kind] }}>{l.title}</div>
                    <div className="text-[11px] text-slate-300 leading-snug">{l.text}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => { play('confirm'); setLegend(false) }} className="mt-3 shrink-0 w-full rounded-xl bg-amber-500 text-slate-950 font-extrabold py-3 active:scale-[0.98] transition">¡A jugar!</button>
          </div>
        </div>
      )}

      {/* Victoria */}
      {phase === 'won' && (
        <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-sm rounded-3xl border border-amber-500/60 bg-slate-900 p-6 animate-pop-in text-center">
            <div className="text-6xl mb-2">🏆</div>
            <div className="font-extrabold text-2xl mb-1" style={{ color }}>{players[current]} se va a dormirla</div>
            <p className="text-sm text-slate-300 mb-5">Reparte lo que le quede en el vaso y el grupo bebe 3 en su honor. De ocho en ocho… y la previa está hecha.</p>
            <button onClick={restart} className="w-full rounded-2xl bg-amber-500 text-slate-950 font-extrabold py-4 text-lg active:scale-[0.98] transition">Revancha</button>
            <button onClick={() => { play('back'); onBack() }} className="mt-2 text-sm text-slate-500">Volver a los juegos</button>
          </div>
        </div>
      )}
    </div>
  )
}
