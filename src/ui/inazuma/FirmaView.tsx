// CASILLA DE FIRMA: un jugador despierta la siguiente supertécnica de SU
// cadena característica (Mark Evans: Mano Celestial → Infinita → Demoníaca).
//
// Es la fuente principal de supertécnicas del modo desde que el equipo empieza
// sin ninguna: aquí se decide a quién le toca crecer, que es una decisión de
// verdad porque la casilla se gasta.
import { useInazuma } from '@/state/inazumaStore'
import { Button } from '@/ui/components/kit'
import { signatureNext } from '@/engine/inazuma/game'
import { getPlayerBase } from '@/data/inazuma/players'
import { PlayerRow } from '@/ui/inazuma/PlayerCard'
import { Pic, TechniqueBadge } from '@/ui/inazuma/Glyphs'

export default function FirmaView() {
  const { save, resolveFirma, goTo } = useInazuma()
  if (!save) return null

  const candidates = save.roster
    .map((p) => ({ p, next: signatureNext(p) }))
    .filter((x) => x.next)
  const done = save.roster.filter((p) => !signatureNext(p))

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="safe-top shrink-0 border-b border-slate-800 bg-slate-900/90 px-3 py-2 flex items-center gap-2">
        <Pic name="node-firma" className="w-5 h-5" />
        <div className="font-extrabold text-sm">Entrenamiento especial</div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2">
        <p className="text-[12px] text-slate-400">
          Elige quién despierta <b className="text-slate-200">su</b> supertécnica. Cada jugador tiene su
          propia cadena y solo puede seguirla en orden.
        </p>

        {candidates.map(({ p, next }) => (
          <div key={p.uid} className="flex items-stretch gap-1.5">
            <PlayerRow player={p} className="flex-1 min-w-0" onClick={() => resolveFirma(p.uid)} />
            {/* Lo que despertaría, con su imagen: elegir a ciegas no es elegir. */}
            <button
              onClick={() => resolveFirma(p.uid)}
              className="shrink-0 flex items-center gap-1.5 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 px-2 active:scale-95 transition"
              title={next!.name}
            >
              <TechniqueBadge tech={next!} size={30} />
              <span className="max-w-[72px] truncate text-[10px] font-bold text-fuchsia-200">{next!.name}</span>
            </button>
          </div>
        ))}
        {!candidates.length && (
          <div className="text-center text-slate-500 text-sm py-8">
            Toda la plantilla ha despertado ya su cadena completa.
          </div>
        )}

        {done.length > 0 && candidates.length > 0 && (
          <p className="text-[10px] text-slate-600">
            {done.length === 1
              ? `${getPlayerBase(done[0].baseId).name} ya tiene su cadena completa.`
              : `${done.length} jugadores ya tienen su cadena completa.`}
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-2 safe-bottom">
        <Button variant="ghost" full onClick={() => goTo('map')}>Dejarlo para otro día</Button>
      </div>
    </div>
  )
}
