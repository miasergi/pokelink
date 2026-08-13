// CASILLA DE FIRMA: un jugador despierta la siguiente supertécnica de SU
// cadena característica (Mark Evans: Mano Celestial → Infinita → Demoníaca).
//
// Es la fuente principal de supertécnicas del modo desde que el equipo empieza
// sin ninguna: aquí se decide a quién le toca crecer, que es una decisión de
// verdad porque la casilla se gasta.
//
// Y cuando una cadena ya está COMPLETA, el entrenamiento no se desperdicia:
// ese jugador puede en su lugar MEJORAR una técnica ya despertada (+25 % de
// potencia por nivel, como la Mejora de la tienda).
import { useInazuma } from '@/state/inazumaStore'
import { Button } from '@/ui/components/kit'
import { signatureNext } from '@/engine/inazuma/game'
import { canUpgradeTechnique, techLevel } from '@/engine/inazuma/roster'
import { getTechnique } from '@/data/inazuma/techniques'
import { PlayerRow } from '@/ui/inazuma/PlayerCard'
import { Pic, TechniqueBadge } from '@/ui/inazuma/Glyphs'

export default function FirmaView() {
  const { save, resolveFirma, resolveFirmaUpgrade, skipNode, goTo } = useInazuma()
  if (!save) return null

  const candidates = save.roster
    .map((p) => ({ p, next: signatureNext(p) }))
    .filter((x) => x.next)
  // Cadena completa PERO con una técnica mejorable: la otra forma de crecer.
  const upgraders = save.roster
    .filter((p) => !signatureNext(p))
    .map((p) => ({ p, up: p.techniques.find((t) => canUpgradeTechnique(p, t)) }))
    .filter((x) => x.up)
  const nothing = !candidates.length && !upgraders.length

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="safe-top shrink-0 border-b border-slate-800 bg-slate-900/90 px-3 py-2 flex items-center gap-2">
        <Pic name="node-firma" className="w-5 h-5" />
        <div className="font-extrabold text-sm">Entrenamiento especial</div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-4 pb-6 flex flex-col gap-2">
        {candidates.length > 0 && (
          <>
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
          </>
        )}

        {upgraders.length > 0 && (
          <>
            <p className="text-[12px] text-slate-400 mt-2">
              {candidates.length
                ? 'O mejora una técnica de quien ya completó su cadena (+25 % de potencia):'
                : 'Toda la plantilla despertó su cadena: el entrenamiento sirve para MEJORAR una técnica (+25 % de potencia).'}
            </p>
            {upgraders.map(({ p, up }) => {
              const t = getTechnique(up!)
              if (!t) return null
              return (
                <div key={p.uid} className="flex items-stretch gap-1.5">
                  <PlayerRow player={p} className="flex-1 min-w-0" onClick={() => resolveFirmaUpgrade(p.uid)} />
                  <button
                    onClick={() => resolveFirmaUpgrade(p.uid)}
                    className="shrink-0 flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2 active:scale-95 transition"
                    title={t.name}
                  >
                    <TechniqueBadge tech={t} size={30} />
                    <span className="max-w-[86px] text-[10px] font-bold text-amber-200 leading-tight">
                      <span className="block truncate">{t.name}</span>
                      <span className="text-slate-400">nv.{techLevel(p, up!)} → {techLevel(p, up!) + 1}</span>
                    </span>
                  </button>
                </div>
              )
            })}
          </>
        )}

        {nothing && (
          <div className="text-center text-slate-500 text-sm py-8">
            Toda la plantilla tiene su cadena completa y sus técnicas al máximo.
            No queda nada que entrenar aquí.
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-2 safe-bottom">
        {/* Si no hay NADA que hacer, el botón consume la casilla: antes se
            quedaba en un callejón sin salida que no dejaba seguir la ruta. */}
        {nothing
          ? <Button variant="primary" full onClick={skipNode}>Pasar de largo</Button>
          : <Button variant="ghost" full onClick={() => goTo('map')}>Dejarlo para otro día</Button>}
      </div>
    </div>
  )
}
