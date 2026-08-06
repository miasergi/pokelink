import { useMemo, useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, TopBar } from '@/ui/components/kit'
import { STARTERS_BY_GEN } from '@/data/starters'
import { getSpecies, threeStageStarterPool, basePoolFor, encounterPoolFor } from '@/data'
import Sprite from '@/ui/components/Sprite'
import TypeBadge from '@/ui/components/TypeBadge'
import { typeGradient, TYPE_ES } from '@/ui/theme/types'
import TypeIcon from '@/ui/components/TypeIcon'
import SpeciesSearchModal from '@/ui/components/SpeciesSearchModal'
import { DIFFS } from '@/ui/components/RunOptions'
import type { Difficulty, RandomFlags } from '@/engine/run/types'
import type { PokemonType, SpeciesData } from '@/types'

export default function StarterSelectScreen() {
  const { back, screen, startRun } = useGame()
  const gen = (screen.params?.gen as number) ?? 1
  const pools = (screen.params?.pools as number[] | undefined) ?? [gen]
  const random = (screen.params?.random as boolean | undefined) ?? false
  const randomFlags = screen.params?.randomFlags as RandomFlags | undefined
  const monotype = screen.params?.monotype as PokemonType | undefined
  const daily = screen.params?.daily as string | undefined
  const dailySeed = screen.params?.seed as number | undefined
  const sonoro = screen.params?.sonoro as boolean | undefined
  // Dificultad y tope se eligen en la pantalla ANTERIOR (RunOptions). El Reto
  // diario los ignora: es el mismo mapa para todos y el ranking debe compararse.
  const difficulty = (screen.params?.difficulty as Difficulty | undefined) ?? 'normal'
  const freeLevel = (screen.params?.freeLevel as boolean | undefined) ?? false
  const lives = (screen.params?.lives as number | undefined) ?? 2
  // Selecciona hasta `n` ids distintos de un pool (aleatorio).
  const pickDistinct = (pool: SpeciesData[], n: number): number[] => {
    const picks: number[] = []
    const used = new Set<number>()
    while (picks.length < n && used.size < pool.length) {
      const sp = pool[Math.floor(Math.random() * pool.length)]
      if (used.has(sp.id)) continue
      used.add(sp.id)
      picks.push(sp.id)
    }
    return picks
  }
  const starters = useMemo(() => {
    // Monolocke: iniciales del TIPO elegido (preferiblemente con 3 etapas).
    if (monotype) {
      const set = new Set(pools)
      const byType = (s: SpeciesData) => s.types.includes(monotype)
      let pool = threeStageStarterPool().filter((s) => set.has(s.generation) && byType(s))
      if (pool.length < 3) pool = threeStageStarterPool().filter(byType)
      if (pool.length < 1) pool = basePoolFor(pools).filter(byType)
      if (pool.length < 1) pool = basePoolFor([]).filter(byType)
      const picks = pickDistinct(pool, 3)
      return picks.length ? picks : (STARTERS_BY_GEN[gen] ?? STARTERS_BY_GEN[1])
    }
    // Iniciales random (3 etapas) SOLO de las regiones elegidas.
    if (!randomFlags?.starters) return STARTERS_BY_GEN[gen] ?? STARTERS_BY_GEN[1]
    const set = new Set(pools)
    let pool = threeStageStarterPool().filter((s) => set.has(s.generation))
    if (pool.length < 3) pool = threeStageStarterPool() // respaldo si hay muy pocos
    return pickDistinct(pool, 3)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monotype, randomFlags?.starters, gen, pools.join(',')])
  const [selected, setSelected] = useState<number | null>(null)
  const [searching, setSearching] = useState(false)
  // Inicial elegido a mano con el buscador (se muestra junto a los tres de serie).
  const [custom, setCustom] = useState<number | null>(null)

  // Pool del buscador: CUALQUIER Pokémon no legendario de las regiones elegidas.
  // Se probó limitarlo a formas base y era frustrante: buscar "Pikachu" en Kanto
  // no daba nada (evoluciona de Pichu, que es de Johto). Si el jugador se toma
  // la molestia de buscar uno concreto, que lo encuentre; elegir uno ya
  // evolucionado es cosa suya. En Monolocke se respeta el tipo.
  const searchPool = useMemo(() => {
    const all = encounterPoolFor(pools).filter((s) => !s.isMega)
    const byType = monotype ? all.filter((s) => s.types.includes(monotype)) : all
    return byType.length ? byType : all
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pools.join(','), monotype])

  // Los tres de serie + el buscado (si no estaba ya).
  const shown = custom !== null && !starters.includes(custom) ? [...starters, custom] : starters

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title={monotype
          ? <span className="inline-flex items-center gap-1">Inicial · Mono <TypeIcon type={monotype} />{TYPE_ES[monotype]}</span>
          : 'Elige tu inicial'}
        left={<Button variant="ghost" onClick={back}>‹</Button>}
      />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar">
        {monotype && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 px-3 py-2 text-sm">
            🔒 <b className="inline-flex items-center gap-1">Monolocke de tipo <TypeIcon type={monotype} />{TYPE_ES[monotype]}</b> — solo podrás llevar Pokémon de este tipo (inicial, capturas, intercambios y eventos).
          </div>
        )}
        {shown.map((id) => {
          const sp = getSpecies(id)
          const isSel = selected === id
          return (
            <div
              key={id}
              onClick={() => setSelected(id)}
              className={`rounded-2xl p-3 border-2 transition active:scale-[0.99] ${
                isSel ? 'border-red-400 ring-2 ring-red-400/30' : 'border-slate-700/60'
              }`}
              // Velo oscuro sobre el degradado del tipo: con tipos claros
              // (Eléctrico, Hielo, Hada) el texto blanco de las estadísticas se
              // perdía. Ahora que el buscador da acceso a CUALQUIER Pokémon,
              // esos tipos salen a menudo.
              style={{ background: isSel ? `linear-gradient(rgba(2,6,23,0.45), rgba(2,6,23,0.45)), ${typeGradient(sp.types)}` : 'rgba(15,23,42,0.6)' }}
            >
              {(() => {
                const phys = sp.baseStats.atk >= sp.baseStats.spa
                return (
                  <div className="flex items-center gap-3">
                    <Sprite speciesId={id} className="w-24 h-24 object-contain drop-shadow-lg" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-extrabold text-xl">{sp.displayName}</div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-200">{phys ? 'Físico' : 'Especial'}</span>
                      </div>
                      <div className="flex gap-1 mt-1">
                        {sp.types.map((t) => (
                          <TypeBadge key={t} type={t} />
                        ))}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                        <Stat label="PS" v={sp.baseStats.hp} />
                        <Stat label={phys ? 'Ataque (Físico)' : 'Ataque (Especial)'} v={phys ? sp.baseStats.atk : sp.baseStats.spa} />
                        <Stat label="Defensa" v={sp.baseStats.def} />
                        <Stat label="Def. Esp." v={sp.baseStats.spd} />
                        <Stat label="Velocidad" v={sp.baseStats.spe} />
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )
        })}
        {/* Buscador: elegir un Pokémon concreto en vez de los tres de serie. */}
        <button
          onClick={() => setSearching(true)}
          className="rounded-2xl border-2 border-dashed border-slate-600 py-3 text-sm font-bold text-slate-300 active:scale-[0.99]"
        >
          🔍 Buscar otro Pokémon…
          <div className="text-[11px] font-normal text-slate-500 mt-0.5">
            Escribe su nombre o su nº de Pokédex
          </div>
        </button>

        {/* Recordatorio de lo ya elegido en la pantalla anterior. */}
        {daily ? (
          <div className="mt-1 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/40 px-3 py-2 text-sm">
            🗓️ <b>Reto diario {daily}</b> — misma región y mapa para todo el mundo hoy. Dificultad Normal.
          </div>
        ) : (
          <button
            onClick={back}
            className="mt-1 rounded-xl bg-slate-800/60 border border-slate-700 px-3 py-2 text-left active:scale-[0.99]"
          >
            <div className="text-[11px] text-slate-400">Configuración de la partida · toca para cambiar</div>
            <div className="text-sm font-bold">
              {DIFFS.find((d) => d.id === difficulty)?.label}
              <span className="text-slate-500 mx-1.5">·</span>
              {freeLevel ? 'Nivel libre' : 'Con tope de nivel'}
            </div>
          </button>
        )}
      </div>

      {searching && (
        <SpeciesSearchModal
          pool={searchPool}
          title={monotype ? `Inicial de tipo ${TYPE_ES[monotype]}` : 'Elige tu inicial'}
          onPick={(id) => { setCustom(id); setSelected(id); setSearching(false) }}
          onClose={() => setSearching(false)}
        />
      )}
      <div className="p-4 safe-bottom">
        <Button
          full
          variant="primary"
          disabled={selected === null}
          onClick={() => selected !== null && startRun(daily
            // El Reto diario es el MISMO para todo el mundo: ni dificultad ni
            // tope de nivel se tocan, o el ranking dejaría de ser comparable.
            ? { gen, pools: [gen], random: false, starterId: selected, difficulty: 'normal', seed: dailySeed, daily }
            : { gen, pools, random, randomFlags, monotype, sonoro, starterId: selected, difficulty, freeLevel, lives })}
        >
          {selected !== null ? `¡Empezar con ${getSpecies(selected).displayName}!` : 'Selecciona un inicial'}
        </Button>
      </div>
    </div>
  )
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-300/80">{label}</span>
      <span className="font-bold tabular-nums">{v}</span>
    </div>
  )
}
