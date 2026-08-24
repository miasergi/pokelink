// OCALIMOCHO: el Juego de la Oca bebedor. Tablero serpenteante de 63
// casillas, dado animado y una carta por casilla con su regla. El motor puro
// vive en `engine/party/oca.ts`; aquí solo hay turnos y presentación.
import { useEffect, useRef, useState } from 'react'
import { OCA_COLORS, resolveMove, squareAt, walkPath, type OcaMove } from '@/engine/party/oca'
import { PartyHeader } from '@/ui/party/partyKit'
import Icon from '@/ui/components/Icon'
import { play } from '@/utils/sfx'

/** Tinte de fondo por tipo de casilla, para leer el tablero de un vistazo. */
const KIND_TINT: Record<string, string> = {
  oca: 'rgba(74,222,128,.18)',
  puente: 'rgba(56,189,248,.18)',
  posada: 'rgba(251,191,36,.18)',
  dados: 'rgba(167,139,250,.2)',
  pozo: 'rgba(148,163,184,.15)',
  laberinto: 'rgba(232,121,249,.18)',
  carcel: 'rgba(148,163,184,.22)',
  muerte: 'rgba(248,113,113,.22)',
  meta: 'rgba(251,191,36,.3)',
}

export default function OcaView({ players, onBack }: { players: string[]; onBack: () => void }) {
  const n = players.length
  const [positions, setPositions] = useState<number[]>(() => players.map(() => 0))
  const [skips, setSkips] = useState<number[]>(() => players.map(() => 0))
  const [current, setCurrent] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'rolling' | 'moving' | 'card' | 'jump' | 'won'>('idle')
  const [dieFace, setDieFace] = useState(1)
  const [move, setMove] = useState<OcaMove | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
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
              De oca a oca y bebe porque te toca. Necesitáis <b>al menos 2 jugadores</b>:
              apuntad a la cuadrilla desde la portada de La Previa.
            </p>
            <button onClick={() => { play('back'); onBack() }} className="mt-4 w-full rounded-2xl bg-violet-500 text-white font-extrabold py-3 active:scale-[0.98] transition">Volver</button>
          </div>
        </div>
      </div>
    )
  }

  const roll = () => {
    if (phase !== 'idle') return
    play('confirm')
    setPhase('rolling')
    setNotice(null)
    let ticks = 0
    clearInterval(rollTimer.current)
    rollTimer.current = setInterval(() => {
      ticks++
      setDieFace(1 + Math.floor(Math.random() * 6))
      if (ticks >= 10) {
        clearInterval(rollTimer.current)
        const die = 1 + Math.floor(Math.random() * 6)
        setDieFace(die)
        const m = resolveMove(positions[current], die)
        setMove(m)
        // PASEO casilla a casilla hasta donde caes (con rebote si te pasas);
        // la carta de la casilla se enseña al TERMINAR de andar.
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
    }, 90)
  }

  /** Cierra el turno: suma castigos, salta a quien pierde turno y pasa la vez. */
  const finishTurn = (m: OcaMove) => {
    if (m.won) { setPhase('won'); return }
    if (m.extraRoll) { setPhase('idle'); setMove(null); return }
    // Pasa el turno saltándose a quien esté en la posada/pozo/cárcel. Los
    // turnos que pierde el jugador ACTUAL se suman aquí mismo, sobre `skips`.
    const skipped: string[] = []
    const s = skips.map((x, i) => (i === current ? x + m.skipTurns : x))
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
    setMove(null)
  }

  const closeCard = () => {
    if (!move || phase !== 'card') return
    play('select')
    const landing = move.path[0]
    if (move.final !== landing) {
      // Salto especial (oca, puente, dados, laberinto, muerte): la ficha da
      // el BRINCO al cerrar la carta, y medio segundo después sigue el juego.
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
    setCurrent(0)
    setPhase('idle')
    setMove(null)
    setNotice(null)
  }

  // Tablero serpenteante: 9 filas × 7 columnas, filas impares invertidas.
  const rows: number[][] = []
  for (let r = 0; r < 9; r++) {
    const row = Array.from({ length: 7 }, (_, c) => r * 7 + c + 1)
    rows.push(r % 2 === 1 ? row.reverse() : row)
  }

  const color = OCA_COLORS[current % OCA_COLORS.length]
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PartyHeader title="Ocalimocho" emoji="🦆" onBack={onBack} right={
        <button onClick={restart} aria-label="Reiniciar partida" className="w-9 h-9 grid place-items-center rounded-full border border-slate-700 bg-slate-800/80 text-slate-400 active:scale-95 transition">
          <Icon name="refresh" className="w-4 h-4" />
        </button>
      } />
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 flex flex-col gap-3 max-w-sm w-full mx-auto">
        {/* Tablero */}
        <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-1.5">
          {rows.map((row, r) => (
            <div key={r} className="grid grid-cols-7 gap-1 mb-1 last:mb-0">
              {row.map((idx) => {
                const sq = squareAt(idx)
                const here = positions.map((p, i) => (p === idx ? i : -1)).filter((i) => i >= 0)
                // La casilla que está PISANDO la ficha en movimiento se
                // enciende con el color del jugador, para seguirla con el ojo.
                const walking = (phase === 'moving' || phase === 'jump' || phase === 'card') && positions[current] === idx
                return (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-md border grid place-items-center transition-shadow"
                    style={{
                      background: KIND_TINT[sq.kind] ?? 'rgba(30,41,59,.5)',
                      borderColor: walking ? color : 'rgb(30,41,59)',
                      boxShadow: walking ? `0 0 10px 1px ${color}aa` : undefined,
                    }}
                  >
                    <span className="absolute top-0 left-0.5 text-[7px] font-bold text-slate-500">{idx}</span>
                    <span className="text-[13px] leading-none">{sq.kind === 'normal' ? '' : sq.emoji}</span>
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

        {/* Aviso de turnos perdidos */}
        {notice && <div className="text-center text-[12px] font-bold text-amber-300 animate-pop-in">{notice}</div>}

        {/* Turno actual + dado */}
        <div className="rounded-2xl border px-4 py-3 flex items-center justify-between gap-3" style={{ borderColor: `${color}66`, background: `${color}14` }}>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide font-bold text-slate-400">Turno de</div>
            <div className="font-extrabold text-lg truncate" style={{ color }}>{players[current]}</div>
            <div className="text-[11px] text-slate-400">Casilla {positions[current] || 'salida'}</div>
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
          {phase === 'rolling' ? 'Rodando…' : phase === 'moving' ? 'Andando…' : phase === 'jump' ? '¡Salto!' : '🎲 Tirar el dado'}
        </button>

        {/* Marcador compacto */}
        <div className="flex flex-wrap justify-center gap-1.5 pb-2">
          {players.map((p, i) => (
            <span key={i} className={`inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/70 px-2 py-0.5 text-[10px] font-bold ${i === current ? 'text-slate-100' : 'text-slate-400'}`}>
              <span className="w-2 h-2 rounded-full" style={{ background: OCA_COLORS[i % OCA_COLORS.length] }} />
              {p} · {positions[i] || 0}{skips[i] > 0 ? ` · ⏳${skips[i]}` : ''}
            </span>
          ))}
        </div>
      </div>

      {/* Carta de la casilla donde caes */}
      {phase === 'card' && move && (
        <div className="absolute inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={closeCard}>
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-5 animate-pop-in text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-5xl mb-1">{move.square.emoji}</div>
            <div className="font-extrabold text-xl">{move.square.title}</div>
            <div className="text-[11px] text-slate-500 font-bold mb-2">
              {players[current]} · dado {dieFace} · casilla {move.square.idx}
              {move.bounced ? ' (¡rebote!)' : ''}
              {move.final !== move.square.idx ? ` → ${move.final}` : ''}
            </div>
            <p className="text-sm text-slate-200">{move.square.rule}</p>
            <button
              onClick={closeCard}
              className="mt-4 w-full rounded-xl bg-violet-500 text-white font-extrabold py-3 active:scale-[0.98] transition"
            >
              {move.won ? '¡Victoria!' : move.extraRoll ? '¡Vuelvo a tirar!' : 'Siguiente turno'}
            </button>
          </div>
        </div>
      )}

      {/* Victoria */}
      {phase === 'won' && (
        <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-sm rounded-3xl border border-amber-500/60 bg-slate-900 p-6 animate-pop-in text-center">
            <div className="text-6xl mb-2">🏆</div>
            <div className="font-extrabold text-2xl mb-1" style={{ color }}>{players[current]} gana</div>
            <p className="text-sm text-slate-300 mb-5">El resto del grupo bebe 3 en su honor. De oca a oca… y la previa está hecha.</p>
            <button onClick={restart} className="w-full rounded-2xl bg-amber-500 text-slate-950 font-extrabold py-4 text-lg active:scale-[0.98] transition">Revancha</button>
            <button onClick={() => { play('back'); onBack() }} className="mt-2 text-sm text-slate-500">Volver a los juegos</button>
          </div>
        </div>
      )}
    </div>
  )
}
