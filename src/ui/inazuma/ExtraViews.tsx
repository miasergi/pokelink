// Pantallas de apoyo del modo: estadísticas de la partida, álbum de fichados y
// el tutorial de entrada.
import { useEffect, useState } from 'react'
import { Button, Card, ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { useInazuma } from '@/state/inazumaStore'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { getPlayerBase, PLAYERS, startingSquad } from '@/data/inazuma/players'
import { getSpirit } from '@/data/inazuma/spirits'
import { getTeam, TEAM_BY_ID, PLAYABLE_TEAMS } from '@/data/inazuma/teams'
import { loadMeta } from '@/persistence/db'
import { rivalStartingXI } from '@/engine/inazuma/roster'
import type { PlayerBase, PlayerStats } from '@/engine/inazuma/types'

// ---------------------------------------------------------------------------
// Estadísticas de la partida
// ---------------------------------------------------------------------------

const EMPTY: PlayerStats = { goals: 0, saves: 0, duelsWon: 0, duelsLost: 0, matches: 0 }

export function StatsView() {
  const { save, goTo } = useInazuma()
  if (!save) return null

  const rows = save.roster
    .map((p) => ({ p, s: save.playerStats[p.uid] ?? EMPTY }))
    .sort((a, b) => b.s.goals - a.s.goals || b.s.duelsWon - a.s.duelsWon)
  const pichichi = rows.filter((r) => r.s.goals > 0)[0]
  const totalGoals = rows.reduce((a, r) => a + r.s.goals, 0)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="safe-top shrink-0 border-b border-slate-800 bg-slate-900/90 px-3 py-2 flex items-center gap-2">
        <Icon name="chartUp" className="w-5 h-5 text-emerald-300" />
        <div className="font-extrabold text-sm">Estadísticas</div>
        <span className="ml-auto text-[11px] text-slate-400 tabular-nums">
          {save.record[0]}V {save.record[1]}E {save.record[2]}D
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 flex flex-col gap-3">
        {pichichi ? (
          <Card className="p-3 border-amber-500/50" style={{ background: 'linear-gradient(120deg,#f59e0b22,rgba(30,41,59,.7) 60%)' }}>
            <div className="text-[10px] uppercase tracking-widest text-amber-300">Pichichi</div>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-amber-500/40 bg-slate-800 grid place-items-center shrink-0">
                <ImgFallback
                  src={portraitUrl(pichichi.p.baseId)}
                  className="w-full h-full object-cover"
                  fallback={<span className="text-lg">⚽</span>}
                />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold">{getPlayerBase(pichichi.p.baseId).name}</div>
                <div className="text-[11px] text-slate-400">
                  {pichichi.s.goals} {pichichi.s.goals === 1 ? 'gol' : 'goles'} de los {totalGoals} del equipo
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <div className="text-center text-[12px] text-slate-500 py-4">
            Todavía no habéis marcado. Las estadísticas se llenan jugando.
          </div>
        )}

        <div className="text-[11px] uppercase tracking-widest text-slate-500">Toda la plantilla</div>
        <div className="rounded-xl border border-slate-700/60 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 py-1.5 bg-slate-800/70 text-[9px] uppercase tracking-wide text-slate-500">
            <span>Jugador</span><span className="w-8 text-right">Gol</span>
            <span className="w-8 text-right">Par</span><span className="w-12 text-right">Duelos</span>
          </div>
          {rows.map(({ p, s }) => {
            const base = getPlayerBase(p.baseId)
            const total = s.duelsWon + s.duelsLost
            return (
              <div key={p.uid} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 py-1.5 border-t border-slate-800 items-center">
                <span className="text-[12px] font-bold truncate">
                  {base.name}
                  <span className="text-[9px] text-slate-500 ml-1">{base.position}</span>
                </span>
                <span className="w-8 text-right text-[12px] tabular-nums font-bold text-emerald-300">{s.goals || '·'}</span>
                <span className="w-8 text-right text-[12px] tabular-nums text-sky-300">{s.saves || '·'}</span>
                <span className="w-12 text-right text-[11px] tabular-nums text-slate-400">
                  {total ? `${Math.round((s.duelsWon / total) * 100)}%` : '·'}
                </span>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-slate-600">
          «Duelos» es el porcentaje de mano a mano ganados, tirando y defendiendo.
        </p>
      </div>

      <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-2 safe-bottom">
        <Button variant="primary" full onClick={() => goTo('map')}>Volver al mapa</Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Álbum de fichados (meta-progresión entre partidas)
// ---------------------------------------------------------------------------

export function AlbumView() {
  const { goTo, save } = useInazuma()
  const [signed, setSigned] = useState<Set<string>>(new Set())

  useEffect(() => {
    void loadMeta().then((m) => setSigned(new Set(m.inazumaSigned ?? [])))
  }, [])

  // Los que llevas AHORA también cuentan como vistos, aunque la meta se guarde
  // al final: si no, verías huecos de jugadores que tienes en la plantilla.
  const owned = new Set([...signed, ...(save?.roster ?? []).map((p) => p.baseId)])
  const byTeam = new Map<string, typeof PLAYERS>()
  for (const p of PLAYERS) {
    if (!byTeam.has(p.team)) byTeam.set(p.team, [])
    byTeam.get(p.team)!.push(p)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="safe-top shrink-0 border-b border-slate-800 bg-slate-900/90 px-3 py-2 flex items-center gap-2">
        <Icon name="pokedex" className="w-5 h-5" />
        <div className="font-extrabold text-sm">Álbum de fichajes</div>
        <span className="ml-auto text-[11px] font-bold text-amber-300 tabular-nums">
          {owned.size}/{PLAYERS.length}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 flex flex-col gap-3">
        <p className="text-[11px] text-slate-500">
          Todos los jugadores que has llegado a tener en plantilla, entre todas tus partidas.
        </p>
        {[...byTeam.entries()].map(([teamId, list]) => {
          const team = TEAM_BY_ID.get(teamId)
          const got = list.filter((p) => owned.has(p.id)).length
          return (
            <div key={teamId}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[11px] uppercase tracking-widest text-slate-500">
                  {team?.name ?? 'Agentes libres'}
                </span>
                <span className="text-[10px] text-slate-600 tabular-nums">{got}/{list.length}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {list.map((p) => {
                  const has = owned.has(p.id)
                  const info = ELEMENT_INFO[p.element]
                  return (
                    <div
                      key={p.id}
                      className="rounded-xl border p-1 text-center"
                      style={{
                        borderColor: has ? `${info.color}55` : '#1e293b',
                        background: has ? `${info.color}14` : 'rgba(15,23,42,.5)',
                      }}
                    >
                      <div className="w-full aspect-square rounded-lg overflow-hidden bg-slate-800 grid place-items-center">
                        {has ? (
                          <ImgFallback
                            src={portraitUrl(p.id)}
                            className="w-full h-full object-cover"
                            fallback={<span className="text-[10px] font-bold" style={{ color: info.color }}>{p.name[0]}</span>}
                          />
                        ) : (
                          <span className="text-slate-700 text-lg">?</span>
                        )}
                      </div>
                      <div className={`text-[8px] leading-tight mt-0.5 truncate ${has ? 'text-slate-300' : 'text-slate-700'}`}>
                        {has ? p.name : '???'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-2 safe-bottom">
        <Button variant="primary" full onClick={() => goTo('title')}>Volver</Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tutorial
// ---------------------------------------------------------------------------

const ONBOARD_KEY = 'inazuma:onboarded'

const PAGES = [
  {
    icon: '🗺️',
    title: 'Un mapa, no un torneo',
    body: 'Avanzas por casillas unidas por caminos. Solo puedes ir a las conectadas con la tuya, así que elegir ruta importa: lo que dejas atrás no vuelve. Al final de cada tramo te espera un instituto.',
  },
  {
    icon: '⚽',
    title: 'Pachangas: nivel a cambio de piernas',
    body: 'Los partidillos de barrio son tu fuente de nivel. Se juegan en cinco toques, pero CANSAN. La decisión del modo es esa: subir de nivel o llegar entero al instituto.',
  },
  {
    icon: '🔥',
    title: 'Fuego ▶ Bosque ▶ Aire ▶ Montaña ▶ Fuego',
    body: 'Ciclo cerrado, sin elemento dominante. La ventaja se gana eligiendo quién juega y a quién le pasas el balón, no fichando «al mejor».',
  },
  {
    icon: '⚡',
    title: 'Los PT son gasolina',
    body: 'Cada jugador tiene su depósito de PT. Lanzar una supertécnica cuesta los PT que pone en su ficha y se descuentan al usarla; sin saldo solo te queda el tiro sencillo. El depósito lo marca el aguante, y se rellena comiendo en el Rai Rai, con bebidas y al superar cada instituto.',
  },
  {
    icon: '💥',
    title: 'Ruptura y Espíritus',
    body: 'Encadenar jugadas buenas llena la barra de Ruptura. Gástala en tres acciones gratis (Supervibración) o en un único duelo brutal (Espíritu Guerrero). Una cosa o la otra, y una vez por partido.',
  },
  {
    icon: '🛌',
    title: 'El banquillo no es un castigo',
    body: 'Jugar 90 minutos desgasta, y por debajo del 40 % de aguante se rinde peor. Los suplentes suben de nivel igual que los titulares y llegan frescos: rotar sale gratis.',
  },
]

export function InazumaOnboarding({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const page = PAGES[i]
  const last = i === PAGES.length - 1

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/95 backdrop-blur-sm grid place-items-center p-5">
      <div className="w-full max-w-sm text-center">
        <div className="text-6xl mb-3">{page.icon}</div>
        <h2 className="text-xl font-extrabold text-amber-300">{page.title}</h2>
        <p className="text-sm text-slate-300 mt-2 leading-relaxed">{page.body}</p>

        <div className="flex justify-center gap-1.5 my-5">
          {PAGES.map((_, k) => (
            <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-5 bg-amber-400' : 'w-1.5 bg-slate-700'}`} />
          ))}
        </div>

        <Button variant="primary" full onClick={() => (last ? onClose() : setI(i + 1))}>
          {last ? '¡A jugar!' : 'Siguiente'}
        </Button>
        {!last && (
          <button className="text-xs text-slate-500 mt-3" onClick={onClose}>Saltar tutorial</button>
        )}
      </div>
    </div>
  )
}

/** ¿Toca enseñar el tutorial? */
export function shouldShowOnboarding(): boolean {
  try {
    return typeof localStorage !== 'undefined' && !localStorage.getItem(ONBOARD_KEY)
  } catch {
    return false
  }
}

export function markOnboarded(): void {
  try { localStorage.setItem(ONBOARD_KEY, '1') } catch { /* da igual */ }
}

// ---------------------------------------------------------------------------
// Once rival (se usa en la previa del partido)
// ---------------------------------------------------------------------------

/**
 * El once rival EN FORMATO ALINEACIÓN, no como lista: antes de un partido
 * oficial lo que quieres ver es por dónde te van a hacer daño (de qué elemento
 * es su delantera, quién lleva Espíritu), y eso se lee en el campo, no en una
 * columna de nombres.
 *
 * Son los MISMOS once que monta el motor (`rivalStartingXI`), no los once
 * primeros de la plantilla: si aquí se enseñara otra cosa, la previa mentiría.
 */
export function RivalLineup({ teamId, level }: { teamId: string; level: number }) {
  const xi = rivalStartingXI(teamId)
  const line = (pos: string) => xi.filter((p) => p.position === pos)
  const rows: { pos: string; label: string }[] = [
    { pos: 'DEL', label: 'Ataque' },
    { pos: 'MED', label: 'Centro' },
    { pos: 'DEF', label: 'Defensa' },
    { pos: 'POR', label: 'Portería' },
  ]

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] uppercase tracking-widest text-slate-500">
        Su once · nivel {level}
      </div>

      <div
        className="relative rounded-2xl border border-emerald-900/60 overflow-hidden"
        style={{ background: 'repeating-linear-gradient(180deg,#14532d22 0 26px,#16653422 26px 52px), #0b2a1a' }}
      >
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-x-5 top-2 bottom-2 border-2 border-white/10 rounded-lg" />
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 w-14 h-14 -mt-7 border-2 border-white/10 rounded-full" />
          <div className="absolute inset-x-5 top-1/2 h-0 border-t-2 border-white/10" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-2 w-24 h-8 border-2 border-white/10 rounded-sm" />
        </div>

        <div className="relative p-2.5 flex flex-col gap-2">
          {rows.map(({ pos, label }) => {
            const men = line(pos)
            if (!men.length) return null
            return (
              <div key={pos}>
                <div className="text-[8px] uppercase tracking-widest text-emerald-200/40 text-center mb-1">{label}</div>
                <div className="flex justify-center gap-1.5 flex-wrap">
                  {men.map((b) => <RivalChip key={b.id} base={b} />)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {xi.length < 11 && (
        <p className="text-[10px] text-slate-600">
          Completan el once con jugadores de relleno, más flojos que estos.
        </p>
      )}
    </div>
  )
}

function RivalChip({ base }: { base: PlayerBase }) {
  const info = ELEMENT_INFO[base.element]
  const spirit = getSpirit(base.spirit)
  return (
    <div className="w-[52px] shrink-0 flex flex-col items-center">
      <div className="relative">
        <div
          className="w-11 h-11 rounded-xl overflow-hidden border-2 grid place-items-center"
          style={{ borderColor: `${info.color}88`, background: `${info.color}22` }}
        >
          <ImgFallback
            src={portraitUrl(base.id)}
            className="w-full h-full object-cover"
            alt={base.name}
            fallback={<span className="text-[11px] font-extrabold" style={{ color: info.color }}>{base.name[0]}</span>}
          />
        </div>
        <span
          className="absolute -top-1 -left-1 grid place-items-center w-4 h-4 rounded-full text-[9px] border border-black/40"
          style={{ background: info.color, color: '#0f172a' }}
          title={info.label}
        >
          {info.glyph}
        </span>
        {spirit && (
          <span className="absolute -bottom-1 -right-1 text-[10px] leading-none" title={spirit.name}>👹</span>
        )}
      </div>
      <div className="text-[8px] leading-tight truncate w-full text-center text-slate-300 mt-0.5">
        {base.name.split(' ')[0]}
      </div>
      <div className="text-[7px] leading-none text-amber-300/70">{'★'.repeat(base.rarity)}</div>
    </div>
  )
}


// ---------------------------------------------------------------------------
// Elección de instituto
// ---------------------------------------------------------------------------

/**
 * Con qué instituto juegas. No es solo el escudo: cambia tu plantilla inicial
 * y, como tu equipo SALE del cuadro, también contra quién te enfrentas.
 */
export function TeamSelectView() {
  const { newTournament, goTo } = useInazuma()

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="safe-top shrink-0 border-b border-slate-800 bg-slate-900/90 px-3 py-2">
        <div className="font-extrabold text-sm">Elige instituto</div>
        <div className="text-[11px] text-slate-400">
          Cambia con quién empiezas y a quién te enfrentas: el que descartas entra en el cuadro.
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 flex flex-col gap-3">
        {PLAYABLE_TEAMS.map((id) => {
          const team = getTeam(id)
          const squad = startingSquad(id).map((pid) => getPlayerBase(pid))
          const stars = squad.filter((p) => p.rarity >= 4)
          const info = ELEMENT_INFO[team.element]
          return (
            <Card
              key={id}
              className="p-3"
              onClick={() => void newTournament(id)}
              style={{ background: `linear-gradient(130deg, ${team.color}2e, rgba(15,23,42,.9) 62%)` }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-11 h-11 shrink-0 grid place-items-center rounded-xl overflow-hidden border"
                  style={{ borderColor: `${team.color}66`, background: `${team.color}22` }}
                >
                  <ImgFallback
                    src={`${import.meta.env.BASE_URL}inazuma/teams/${id}.png`}
                    className="w-full h-full object-contain"
                    fallback={<span className="font-extrabold" style={{ color: team.color }}>{team.name[0]}</span>}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold text-sm leading-tight">{team.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px]" style={{ color: info.color }}>{info.glyph} {info.label}</span>
                    <span className="text-[10px] text-slate-500">·  {squad.length} jugadores</span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] italic text-slate-400 mt-2">«{team.taunt}»</p>

              {stars.length > 0 && (
                <div className="mt-2 flex gap-1.5 flex-wrap">
                  {stars.slice(0, 4).map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/70 px-1.5 py-0.5 text-[10px]"
                    >
                      <span className="w-4 h-4 rounded-full overflow-hidden bg-slate-700 grid place-items-center">
                        <ImgFallback
                          src={portraitUrl(p.id)}
                          className="w-full h-full object-cover"
                          fallback={<span className="text-[7px]">{p.name[0]}</span>}
                        />
                      </span>
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-2 safe-bottom">
        <Button variant="ghost" full onClick={() => goTo('title')}>Atrás</Button>
      </div>
    </div>
  )
}
