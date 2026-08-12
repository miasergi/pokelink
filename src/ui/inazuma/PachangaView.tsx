// Pachanga: la tanda rápida de mano a mano. Una pantalla, cinco toques.
// Deliberadamente MUY distinta del partido de jefe (que es una retransmisión de
// 90 minutos): aquí se ve todo de golpe y se resuelve en segundos.
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/ui/components/kit'
import { Crest, KindIcon, Pic } from '@/ui/inazuma/Glyphs'
import { useInazuma } from '@/state/inazumaStore'
import { useSettings } from '@/state/settingsStore'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import Odds from '@/ui/inazuma/Odds'
import { Mugshot } from '@/ui/inazuma/MatchView'
import { PACHANGA_MAX_ROUNDS, PACHANGA_TARGET } from '@/engine/inazuma/pachanga'
import DuelStage, { type StageData } from '@/ui/inazuma/DuelStage'
import GoalOverlay from '@/ui/inazuma/GoalOverlay'
import { play } from '@/utils/sfx'

export default function PachangaView() {
  const { pachanga, pachangaShoot, pachangaAutoShoot, finishPachanga, save } = useInazuma()
  const auto = useSettings((s) => s.inazumaMode) === 'auto'
  const [stage, setStage] = useState<StageData | null>(null)
  const [gol, setGol] = useState<{ scorer: string; mine: boolean; key: number; teamId?: string } | null>(null)
  // Rondas ya CONTADAS en pantalla. El motor resuelve la ronda al instante,
  // pero aquí no existe hasta que el escenario del duelo la ha narrado: sin
  // esto, el marcador se movía (y la siguiente decisión aparecía) antes de
  // ver el tiro — el spoiler que se reportó.
  const [shown, setShown] = useState(() => pachanga?.rounds.length ?? 0)
  // Ronda ya ESCENIFICADA. La pachanga cambia de identidad con cada `set` del
  // store, y con ella en las deps el efecto re-montaba el MISMO duelo (se veía
  // doble) y de paso mataba el timer del desenlace. El mismo guard que en el
  // partido: cada ronda pisa el escenario UNA vez.
  const staged = useRef(shown)

  useEffect(() => {
    if (!pachanga) return
    const rounds = pachanga.rounds
    if (rounds.length <= shown || staged.current > shown) return
    staged.current = shown + 1
    const next = rounds[shown]
    const all = [pachanga.mine, pachanga.theirs]
      .flatMap((s) => [s.keeper, ...s.defs, ...s.mids, ...s.fwds])
    const baseOf = (name: string) => all.find((a) => a.name === name)?.baseId
    setStage({
      key: shown + 1,
      attacker: { name: next.shooter, baseId: baseOf(next.shooter), techName: next.technique },
      defender: { name: next.keeper, baseId: baseOf(next.keeper), techName: next.counter },
      attackerWins: next.scored,
      attackerMine: next.mine,
      kind: 'tiro',
    })
    // El desenlace se CONSUMA cuando el escenario llega a su sello (~1.75 s):
    // entonces sí — marcador, sonido y, si hay gol, la celebración. SIN
    // cleanup: el guard de arriba garantiza un único timer por ronda, y
    // limpiarlo en re-renders era justo lo que lo mataba a medias.
    setTimeout(() => {
      setShown(shown + 1)
      play(next.scored ? 'gol' : 'parada')
      if (next.scored) {
        setGol({
          scorer: next.shooter,
          mine: next.mine,
          key: shown + 1,
          teamId: next.mine ? save?.teamId ?? 'raimon' : undefined,
        })
      }
    }, 1750)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pachanga?.rounds.length, shown])

  // Modo AUTO: cuando la pantalla está al día y hay decisión, el banquillo
  // tira/para solo tras una pausa para que se pueda seguir la tanda.
  const decisionUp = !!pachanga && pachanga.phase === 'decision'
    && shown >= pachanga.rounds.length && !gol && !stage
  useEffect(() => {
    if (!auto || !decisionUp) return
    const t = setTimeout(() => pachangaAutoShoot(), 900)
    return () => clearTimeout(t)
  }, [auto, decisionUp, pachangaAutoShoot])

  if (!pachanga) return null
  const revealed = pachanga.rounds.slice(0, shown)
  const mine = revealed.filter((r) => r.scored && r.mine).length
  const theirs = revealed.filter((r) => r.scored && !r.mine).length
  // El partido no «existe» del todo hasta contar la última ronda y su gol.
  const caughtUp = shown >= pachanga.rounds.length && !gol
  const done = pachanga.phase === 'finished' && caughtUp
  const pending = caughtUp ? pachanga.pending : null

  return (
    <div className="relative flex flex-col flex-1 min-h-0">
      <DuelStage stage={stage} onDone={() => setStage(null)} />
      {gol && (
        <GoalOverlay key={gol.key} scorer={gol.scorer} mine={gol.mine} teamId={gol.teamId} onDone={() => setGol(null)} />
      )}
      {/* Marcador */}
      <div className="safe-top shrink-0 border-b border-slate-800 bg-slate-900/90 px-3 py-2 text-center">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">Pachanga · primero a {PACHANGA_TARGET}</div>
        <div className="flex items-center justify-center gap-3 mt-0.5">
          <span className="inline-flex items-center gap-1 min-w-0">
            <Crest teamId={save?.teamId ?? 'raimon'} className="w-4 h-4" />
            <span className="text-[12px] font-bold text-rose-300 truncate max-w-[8rem]">{pachanga.mine.name}</span>
          </span>
          <span className="text-2xl font-extrabold tabular-nums">{mine} – {theirs}</span>
          <span className="text-[12px] font-bold text-slate-400 truncate max-w-[9rem]">{pachanga.rivalName}</span>
        </div>
        {/* Marcadores de ronda */}
        <div className="flex justify-center gap-1.5 mt-1.5">
          {Array.from({ length: PACHANGA_MAX_ROUNDS }, (_, i) => {
            const r = revealed[i]
            return (
              <span
                key={i}
                className={`w-6 h-1.5 rounded-full ${
                  !r ? 'bg-slate-700'
                    : r.scored
                      ? (r.mine ? 'bg-emerald-500' : 'bg-rose-500')
                      : 'bg-slate-600'
                }`}
              />
            )
          })}
        </div>
      </div>

      {/* El campo, en pequeño: la portería y quién se planta delante. */}
      {pending && pachanga.phase === 'decision' && (
        <div className="shrink-0 px-3 pt-2">
          <div
            className="relative rounded-xl border border-emerald-900/70 overflow-hidden"
            style={{ height: 'clamp(56px, 10svh, 72px)', background: 'repeating-linear-gradient(90deg,#14532d 0 26px,#166534 26px 52px)' }}
          >
            <div className="absolute inset-1 border border-white/25 rounded-sm" />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 border border-white/25" style={{ width: 26, height: 46 }} />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/70" style={{ width: 4, height: 30 }} />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold text-white/80">
              {pending.mine ? `${pending.shooter.name} avanza…` : `${pending.shooter.name} se planta delante…`}
            </div>
            <Pic name="ball" className="absolute right-10 top-1/2 -translate-y-1/2 w-5 h-5" />
          </div>
        </div>
      )}

      {/* Rondas jugadas */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col justify-end gap-1.5">
        {/* Al empezar no hay nada que contar y quedaba media pantalla vacía. */}
        {!revealed.length && (
          <p className="m-auto text-center text-[11px] text-slate-600 max-w-[16rem]">
            Cinco rondas alternando tiro y parada. El primero que saque {PACHANGA_TARGET} se la lleva;
            si acabáis igualados, muerte súbita.
          </p>
        )}
        {revealed.map((r) => (
          <div
            key={r.index}
            className={`rounded-xl border px-3 py-2 animate-pop-in ${
              r.scored
                ? (r.mine ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-rose-500/50 bg-rose-500/10')
                : 'border-slate-700 bg-slate-800/50'
            }`}
          >
            <div className="text-[9px] uppercase tracking-widest text-slate-500">
              Ronda {r.index + 1} · {r.mine ? 'tiras tú' : 'tiran ellos'}
            </div>
            <div className="text-[12px] text-slate-200 leading-snug">
              <Pic
                name={r.scored ? 'ball' : 'glove'}
                className="w-3.5 h-3.5 inline-block mr-1 align-[-3px]"
              />
              {r.text}
            </div>
          </div>
        ))}
      </div>

      {/* Decisión o cierre */}
      {done ? (
        <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-3 safe-bottom">
          <div className={`text-center font-extrabold mb-2 ${pachanga.result === 'win' ? 'text-emerald-300' : 'text-rose-300'}`}>
            {pachanga.result === 'win' ? '¡Pachanga ganada!' : 'Pachanga perdida'}
          </div>
          <p className="text-[11px] text-slate-400 text-center mb-2">
            {pachanga.result === 'win'
              ? 'Los que han jugado suben de nivel. Y todo el once vuelve más cansado.'
              : 'Nadie sube de nivel y la derrota pasa factura: todo el once vuelve fundido.'}
          </p>
          <Button variant="primary" full onClick={finishPachanga}>Volver al mapa</Button>
        </div>
      ) : pending && pachanga.phase === 'decision' && auto ? (
        <div className="shrink-0 border-t border-slate-800 bg-slate-900 p-3 safe-bottom">
          <div className="text-center text-[11px] text-slate-400 animate-pulse">
            El banquillo decide (modo auto)…
          </div>
        </div>
      ) : pending && pachanga.phase === 'decision' ? (
        <div className="shrink-0 border-t border-amber-500/40 bg-slate-900 p-3 safe-bottom animate-pop-in">
          <div className="text-sm font-extrabold text-amber-200">
            {pending.mine ? 'Mano a mano' : 'Te la juegan'}
          </div>
          {/* Parando tú, el tiro que viene SE VE VENIR: es la elección
              determinista del rival, la misma con la que se calculan las
              estrellas. Así se sabe si merece gastar una parada cara. */}
          {!pending.mine && pending.rivalTech !== undefined && (
            <div
              className="mt-1 mb-1 flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1"
              style={pending.rivalTechElement ? { borderColor: `${ELEMENT_INFO[pending.rivalTechElement].color}88` } : undefined}
            >
              <KindIcon kind="tiro" className="w-3.5 h-3.5 shrink-0 text-rose-300" />
              <span className="text-[11px] text-slate-300 min-w-0 truncate">
                {pending.rivalTech ? (
                  <>
                    {pending.shooter.name} arma{' '}
                    <b style={pending.rivalTechElement ? { color: ELEMENT_INFO[pending.rivalTechElement].color } : undefined}>
                      ¡{pending.rivalTech}!
                    </b>
                  </>
                ) : (
                  <>{pending.shooter.name} llega sin técnica.</>
                )}
              </span>
            </div>
          )}
          {/* Cara a cara con retratos: quién tira y quién para. Con nombres
              sueltos no había forma de saber a quién estabas mirando. */}
          <div className="mb-2 flex items-center gap-2">
            <Mugshot actor={pending.shooter} name={pending.shooter.name} />
            <div className="text-center px-1">
              <Pic name="ball" className="w-4 h-4 mx-auto opacity-70" />
              <div className="text-[9px] text-slate-500 whitespace-nowrap">
                {pending.mine ? 'tiras' : 'paras'}
              </div>
            </div>
            <Mugshot actor={pending.keeper} name={pending.keeper.name} right />
          </div>
          <div className="flex flex-col gap-1.5 max-h-[36svh] overflow-y-auto">
            {pachanga.options.map((o) => {
              const el = o.element ? ELEMENT_INFO[o.element] : null
              return (
                <button
                  key={o.id}
                  onClick={() => !o.disabled && pachangaShoot(o.id)}
                  disabled={!!o.disabled}
                  className="w-full flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-left transition active:scale-[0.98] disabled:opacity-40"
                  style={el ? { borderColor: `${el.color}66` } : undefined}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[13px] truncate" style={el ? { color: el.color } : undefined}>{o.label}</div>
                    <div className="text-[10px] text-slate-400">{o.disabled ?? o.detail}</div>
                  </div>
                  <Odds option={o} />
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
