// Pachanga: la tanda rápida de mano a mano. Una pantalla, cinco toques.
// Deliberadamente MUY distinta del partido de jefe (que es una retransmisión de
// 90 minutos): aquí se ve todo de golpe y se resuelve en segundos.
import { Button } from '@/ui/components/kit'
import { useInazuma } from '@/state/inazumaStore'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import Odds from '@/ui/inazuma/Odds'
import { Mugshot } from '@/ui/inazuma/MatchView'
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
          <span className="text-[12px] font-bold text-rose-300 truncate max-w-[9rem]">{pachanga.mine.name}</span>
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
            <span className="absolute right-10 top-1/2 -translate-y-1/2 text-base">⚽</span>
          </div>
        </div>
      )}

      {/* Rondas jugadas */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 flex flex-col justify-end gap-1.5">
        {/* Al empezar no hay nada que contar y quedaba media pantalla vacía. */}
        {!pachanga.rounds.length && (
          <p className="m-auto text-center text-[11px] text-slate-600 max-w-[16rem]">
            Cinco rondas alternando tiro y parada. El primero que saque {PACHANGA_TARGET} se la lleva;
            si acabáis igualados, muerte súbita.
          </p>
        )}
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
            {pending.mine ? 'Mano a mano' : 'Te la juegan'}
          </div>
          {/* Cara a cara con retratos: quién tira y quién para. Con nombres
              sueltos no había forma de saber a quién estabas mirando. */}
          <div className="mb-2 flex items-center gap-2">
            <Mugshot actor={pending.shooter} name={pending.shooter.name} />
            <div className="text-center px-1">
              <div className="text-[10px] font-extrabold text-slate-500">⚽</div>
              <div className="text-[9px] text-slate-500 whitespace-nowrap">
                {pending.mine ? 'tiras' : 'paras'}
              </div>
            </div>
            <Mugshot actor={pending.keeper} name={pending.keeper.name} right />
          </div>
          <div className="flex flex-col gap-1.5 max-h-[36svh] overflow-y-auto no-scrollbar">
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
