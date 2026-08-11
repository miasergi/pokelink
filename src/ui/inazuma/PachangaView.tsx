// Pachanga: la tanda rápida de mano a mano. Una pantalla, cinco toques.
// Deliberadamente MUY distinta del partido de jefe (que es una retransmisión de
// 90 minutos): aquí se ve todo de golpe y se resuelve en segundos.
import { Button } from '@/ui/components/kit'
import { useInazuma } from '@/state/inazumaStore'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import Odds from '@/ui/inazuma/Odds'
import { PACHANGA_MAX_ROUNDS, PACHANGA_TARGET } from '@/engine/inazuma/pachanga'

export default function PachangaView() {
  const { pachanga, pachangaShoot, finishPachanga } = useInazuma()
  if (!pachanga) return null
  const [mine, theirs] = pachanga.goals
  const done = pachanga.phase === 'finished'
  const pending = pachanga.pending

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Marcador */}
      <div className="safe-top shrink-0 border-b border-slate-800 bg-slate-900/90 px-3 py-2 text-center">
        <div className="text-[10px] uppercase tracking-widest text-slate-500">Pachanga · primero a {PACHANGA_TARGET}</div>
        <div className="flex items-center justify-center gap-3 mt-0.5">
          <span className="text-[12px] font-bold text-rose-300">Raimon</span>
          <span className="text-2xl font-extrabold tabular-nums">{mine} – {theirs}</span>
          <span className="text-[12px] font-bold text-slate-400 truncate max-w-[9rem]">{pachanga.rivalName}</span>
        </div>
        {/* Marcadores de ronda */}
        <div className="flex justify-center gap-1.5 mt-1.5">
          {Array.from({ length: PACHANGA_MAX_ROUNDS }, (_, i) => {
            const r = pachanga.rounds[i]
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

      {/* Rondas jugadas */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 flex flex-col justify-end gap-1.5">
        {pachanga.rounds.map((r) => (
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
              {r.scored ? '⚽ ' : '🧤 '}{r.text}
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
              ? 'Los que han jugado suben de nivel. Y todos vuelven más cansados.'
              : 'Nadie sube de nivel, pero el desgaste os lo lleváis igual.'}
          </p>
          <Button variant="primary" full onClick={finishPachanga}>Volver al mapa</Button>
        </div>
      ) : pending && pachanga.phase === 'decision' ? (
        <div className="shrink-0 border-t border-amber-500/40 bg-slate-900 p-3 safe-bottom animate-pop-in">
          <div className="text-sm font-extrabold text-amber-200">
            {pending.mine ? `${pending.shooter.name} ante el portero` : `Para ${pending.shooter.name}`}
          </div>
          <div className="text-[11px] text-slate-400 mb-2">
            {pending.mine
              ? <>Enfrente: <b className="text-slate-200">{pending.keeper.name}</b> <span style={{ color: ELEMENT_INFO[pending.keeper.element].color }}>{ELEMENT_INFO[pending.keeper.element].glyph}</span></>
              : <><b className="text-slate-200">{pending.keeper.name}</b> bajo palos</>}
          </div>
          <div className="flex flex-col gap-1.5 max-h-[40vh] overflow-y-auto no-scrollbar">
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
