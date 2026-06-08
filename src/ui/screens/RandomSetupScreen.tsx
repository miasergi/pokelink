import { useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, Card, TopBar } from '@/ui/components/kit'
import { GENERATIONS, getGeneration } from '@/data/generations'
import { TYPE_ES } from '@/ui/theme/types'
import TypeIcon from '@/ui/components/TypeIcon'
import Icon from '@/ui/components/Icon'
import type { PokemonType } from '@/types'
import type { RandomFlags } from '@/engine/run/types'

interface RolledConfig {
  gen: number
  pools: number[]
  random: boolean
  randomFlags?: RandomFlags
  monotype?: PokemonType
}

const RANDOM_LABELS: { key: keyof RandomFlags; label: string }[] = [
  { key: 'starters', label: 'Iniciales y capturables' },
  { key: 'wild', label: 'Salvajes' },
  { key: 'trainers', label: 'Entrenadores y jefes' },
  { key: 'elite', label: 'Alto Mando' },
]

/** Genera una configuración de partida COMPLETAMENTE al azar. */
function rollConfig(): RolledConfig {
  const ready = GENERATIONS.filter((g) => g.rostersReady)
  const gen = ready[Math.floor(Math.random() * ready.length)].gen
  // Pokémon: siempre la región elegida; cada otra región entra con ~35%.
  const pools = new Set<number>([gen])
  for (const g of ready) if (g.gen !== gen && Math.random() < 0.35) pools.add(g.gen)
  // Modo Random (~55%): randomiza categorías sueltas (al menos una).
  let random = false
  let randomFlags: RandomFlags | undefined
  if (Math.random() < 0.55) {
    random = true
    randomFlags = { starters: Math.random() < 0.5, wild: Math.random() < 0.5, trainers: Math.random() < 0.5, elite: Math.random() < 0.5 }
    if (!randomFlags.starters && !randomFlags.wild && !randomFlags.trainers && !randomFlags.elite) randomFlags.wild = true
  }
  // Monolocke (~30%): un tipo al azar.
  let monotype: PokemonType | undefined
  if (Math.random() < 0.3) {
    const types = Object.keys(TYPE_ES) as PokemonType[]
    monotype = types[Math.floor(Math.random() * types.length)]
  }
  return { gen, pools: [...pools].sort((a, b) => a - b), random, randomFlags, monotype }
}

export default function RandomSetupScreen() {
  const { navigate, back } = useGame()
  const [cfg, setCfg] = useState<RolledConfig>(rollConfig)
  const region = getGeneration(cfg.gen).region
  const poolNames = cfg.pools.map((g) => getGeneration(g).region)
  const onCats = cfg.randomFlags ? RANDOM_LABELS.filter((c) => cfg.randomFlags![c.key]) : []

  return (
    <div className="flex flex-col flex-1">
      <TopBar title={<span className="inline-flex items-center gap-2"><Icon name="dadoballs" className="w-8 h-5" /> Modo Sorpresa</span>} left={<Button variant="ghost" onClick={back}>‹</Button>} />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 no-scrollbar">
        <p className="text-slate-300 text-sm text-center">Configuración generada al azar. Decide si empezar, volver a tirar el dado o salir.</p>

        <Card className="p-3.5 flex flex-col gap-3">
          <Row label="Región (jefes y estructura)">
            <span className="font-bold" style={{ color: getGeneration(cfg.gen).accent }}>{region}</span>
          </Row>
          <Row label="Pokémon de">
            <span>{poolNames.join(', ')}</span>
          </Row>
          <Row label="Modo Random">
            {cfg.random
              ? <div className="flex flex-wrap gap-1 justify-end">{onCats.map((c) => <span key={c.key} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-200">{c.label}</span>)}</div>
              : <span className="text-slate-400">No</span>}
          </Row>
          <Row label="Monolocke">
            {cfg.monotype
              ? <span className="inline-flex items-center gap-1 font-bold text-emerald-300"><TypeIcon type={cfg.monotype} /> {TYPE_ES[cfg.monotype]}</span>
              : <span className="text-slate-400">No</span>}
          </Row>
        </Card>
      </div>

      <div className="p-4 safe-bottom flex flex-col gap-2">
        <Button full variant="primary" onClick={() => navigate('starterSelect', { gen: cfg.gen, pools: cfg.pools, random: cfg.random, randomFlags: cfg.randomFlags, monotype: cfg.monotype })}>
          Empezar ›
        </Button>
        <Button full variant="secondary" onClick={() => setCfg(rollConfig())}><span className="inline-flex items-center justify-center gap-2"><Icon name="dadoballs" className="w-8 h-5" /> Volver a tirar</span></Button>
        <Button full variant="ghost" onClick={back}>Salir</Button>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-slate-400 shrink-0">{label}</span>
      <div className="min-w-0 text-right">{children}</div>
    </div>
  )
}
