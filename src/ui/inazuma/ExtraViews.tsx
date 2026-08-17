// Pantallas de apoyo del modo: estadísticas de la partida, álbum de fichados y
// el tutorial de entrada.
import { useEffect, useState } from 'react'
import { Button, Card, ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { useInazuma } from '@/state/inazumaStore'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { getPlayerBase, PLAYERS, startingSquad } from '@/data/inazuma/players'
import { getTeam, TEAM_BY_ID, TEAMS, getSaga, SAGAS, REGIONS, type RegionId, type SagaId } from '@/data/inazuma/teams'
import { loadMeta } from '@/persistence/db'
import type { PlayerStats } from '@/engine/inazuma/types'

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

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-4 pb-6 flex flex-col gap-3">
        {pichichi ? (
          <Card className="p-3 border-amber-500/50" style={{ background: 'linear-gradient(120deg,#f59e0b22,rgba(30,41,59,.7) 60%)' }}>
            <div className="text-[10px] uppercase tracking-widest text-amber-300">Pichichi</div>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-amber-500/40 bg-slate-800 grid place-items-center shrink-0">
                <ImgFallback
                  src={portraitUrl(pichichi.p.baseId)}
                  className="w-full h-full object-cover object-top"
                  fallback={<Icon name="crest" className="w-6 h-6 text-slate-400" />}
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
        <Icon name="album" className="w-5 h-5 text-amber-300" />
        <div className="font-extrabold text-sm">Álbum de fichajes</div>
        <span className="ml-auto text-[11px] font-bold text-amber-300 tabular-nums">
          {owned.size}/{PLAYERS.length}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-4 pb-6 flex flex-col gap-3">
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
                            className="w-full h-full object-cover object-top"
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
    icon: 'map',
    title: 'Un mapa, no un torneo',
    body: 'Avanzas por casillas unidas por caminos. Solo puedes ir a las conectadas con la tuya, así que elegir ruta importa: lo que dejas atrás no vuelve. Al final de cada tramo te espera un instituto.',
  },
  {
    icon: 'ball',
    title: 'Pachangas: nivel a cambio de piernas',
    body: 'Los partidillos de barrio son tu fuente de nivel. Se juegan en cinco toques, pero CANSAN. La decisión del modo es esa: subir de nivel o llegar entero al instituto.',
  },
  {
    icon: 'fire',
    title: 'Fuego ▶ Bosque ▶ Aire ▶ Montaña ▶ Fuego',
    body: 'Ciclo cerrado, sin elemento dominante. La ventaja se gana eligiendo quién juega y a quién le pasas el balón, no fichando «al mejor».',
  },
  {
    icon: 'bolt',
    title: 'Los PT son gasolina',
    body: 'Cada jugador tiene su depósito de PT. Lanzar una supertécnica cuesta los PT que pone en su ficha y se descuentan al usarla; sin saldo solo te queda el tiro sencillo. El depósito lo marca el aguante, y se rellena comiendo en el Rai Rai, con bebidas y al superar cada instituto.',
  },
  {
    icon: 'bolt',
    title: 'Ruptura y Supervibración',
    body: 'Encadenar jugadas buenas llena la barra de Ruptura. Al llenarse puedes activar la SUPERVIBRACIÓN: tres acciones sin gastar PT y con la potencia multiplicada. Una vez por barra, así que elige bien el momento.',
  },
  {
    icon: 'bench',
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
        <Icon name={page.icon} className="w-16 h-16 mx-auto mb-3 text-amber-300" />
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

/**
 * Marca el tutorial como visto. Con `seen = false` se olvida, que es lo que usa
 * el botón «volver a ver el tutorial» de los ajustes.
 */
export function markOnboarded(seen = true): void {
  try {
    if (seen) localStorage.setItem(ONBOARD_KEY, '1')
    else localStorage.removeItem(ONBOARD_KEY)
  } catch { /* da igual */ }
}

// ---------------------------------------------------------------------------
// Once rival (se usa en la previa del partido)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Elección de instituto
// ---------------------------------------------------------------------------

/**
 * Con qué instituto juegas. No es solo el escudo: cambia tu plantilla inicial
 * y, como tu equipo SALE del cuadro, también contra quién te enfrentas.
 */
const DIFFICULTIES = [
  { id: 'normal', label: 'Normal', desc: 'El Football Frontier tal cual.' },
  { id: 'dificil', label: 'Difícil', desc: 'Todos los rivales +6 niveles.' },
  { id: 'leyenda', label: 'Leyenda', desc: '+12 niveles. Para campeones.' },
] as const

export function TeamSelectView() {
  const { newTournament, goTo } = useInazuma()
  // Modalidades de la partida: se eligen ANTES de tocar un instituto.
  const [saga, setSaga] = useState<SagaId>('ff')
  const [difficulty, setDifficulty] = useState<'normal' | 'dificil' | 'leyenda'>('normal')
  const [randomSquad, setRandomSquad] = useState(false)
  // De qué juegos sale la gente y qué se desordena.
  const [pools, setPools] = useState<RegionId[]>([])
  const [random, setRandom] = useState<{ plantillas?: boolean; cuadro?: boolean }>({})
  // Identidad del equipo del bombo: nombre libre y CUALQUIER escudo.
  const [customName, setCustomName] = useState('')
  const [customCrest, setCustomCrest] = useState<string | null>(null)
  const begin = (teamId: string) => {
    const crest = customCrest ?? teamId
    void newTournament(teamId, {
      difficulty,
      randomSquad,
      saga,
      // Sin nombre escrito, el equipo se llama como el escudo elegido.
      customName: randomSquad ? (customName.trim() || getTeam(crest).name) : undefined,
      customCrest: randomSquad ? crest : undefined,
      pools,
      random,
    })
  }
  const sagaInfo = getSaga(saga)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="safe-top shrink-0 border-b border-slate-800 bg-slate-900/90 px-3 py-2">
        <div className="font-extrabold text-sm">Elige saga y equipo</div>
        <div className="text-[11px] text-slate-400">
          Cambia con quién empiezas y a quién te enfrentas: el que descartas entra en el cuadro.
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-4 pb-6 flex flex-col gap-3">
        {/* LA SAGA: la «región» del roguelike. Cambia el cuadro entero, los
            equipos jugables y el pool de fichajes. */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Saga</div>
          <div className="flex gap-1.5">
            {SAGAS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSaga(s.id)}
                className={`flex-1 rounded-xl border py-1.5 px-1 text-[11px] font-bold leading-tight transition active:scale-95 ${
                  saga === s.id
                    ? 'border-sky-500/70 bg-sky-500/15 text-sky-200'
                    : 'border-slate-700 bg-slate-800/60 text-slate-400'
                }`}
              >
                {s.id === 'ff' ? 'Football Frontier'
                  : s.id === 'alius' ? 'Academia Alius'
                    : s.id === 'ffi' ? 'FF Internacional' : 'Victory Road'}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">{sagaInfo.desc}</p>
        </div>

        {/* DE QUÉ JUEGOS SALE LA GENTE. Multiselección: puedes jugar el
            Football Frontier fichando gente del Mundial y de Victory Road.
            Sin marcar nada, cada saga trae la suya. */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">
            Jugadores de estos juegos
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {REGIONS.map((r) => {
              const on = pools.includes(r.id)
              return (
                <button
                  key={r.id}
                  onClick={() => setPools(on ? pools.filter((x) => x !== r.id) : [...pools, r.id])}
                  className={`rounded-xl border py-1.5 px-2 text-[11px] font-bold leading-tight text-left transition active:scale-95 ${
                    on ? 'border-emerald-500/70 bg-emerald-500/15 text-emerald-200'
                      : 'border-slate-700 bg-slate-800/60 text-slate-400'
                  }`}
                >
                  {r.name}
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {pools.length
              ? 'El ojeador, los fichajes y las recompensas solo traerán gente de lo marcado.'
              : 'Sin marcar nada: cada saga trae a los suyos, como siempre.'}
          </p>
        </div>

        {/* RANDOMIZADOR: caos a la carta, bandera a bandera. */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Randomizador</div>
          <div className="flex flex-col gap-1.5">
            {([
              { k: 'plantillas' as const, t: 'Plantillas rivales al azar', d: 'Cada instituto sale con un once sorteado. Su escudo y su dificultad no cambian: no sabes con quién juega.' },
              { k: 'cuadro' as const, t: 'Cuadro mezclado', d: 'Los institutos del torneo salen de cualquiera de los juegos marcados arriba, ordenados por dificultad.' },
            ]).map(({ k, t, d }) => (
              <button
                key={k}
                onClick={() => setRandom({ ...random, [k]: !random[k] })}
                className={`rounded-xl border px-2.5 py-2 text-left transition active:scale-[0.99] ${
                  random[k] ? 'border-fuchsia-500/70 bg-fuchsia-500/15' : 'border-slate-700 bg-slate-800/60'
                }`}
              >
                <span className={`block text-[12px] font-bold ${random[k] ? 'text-fuchsia-200' : 'text-slate-300'}`}>
                  {t}
                </span>
                <span className="block text-[10px] text-slate-500 leading-snug">{d}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Modalidades: dificultad y plantilla del bombo. */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Dificultad</div>
          <div className="flex gap-1.5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.id}
                onClick={() => setDifficulty(d.id)}
                className={`flex-1 rounded-xl border py-1.5 text-[12px] font-bold transition active:scale-95 ${
                  difficulty === d.id
                    ? 'border-amber-500/70 bg-amber-500/15 text-amber-200'
                    : 'border-slate-700 bg-slate-800/60 text-slate-400'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {DIFFICULTIES.find((d) => d.id === difficulty)!.desc}
          </p>
          <button
            onClick={() => setRandomSquad(!randomSquad)}
            className={`mt-2 w-full rounded-xl border px-3 py-2 text-left text-[12px] font-bold transition active:scale-[0.99] ${
              randomSquad
                ? 'border-fuchsia-500/70 bg-fuchsia-500/15 text-fuchsia-200'
                : 'border-slate-700 bg-slate-800/60 text-slate-400'
            }`}
          >
            🎲 Plantilla del bombo {randomSquad ? '· ACTIVADA' : ''}
            <span className="block text-[10px] font-normal text-slate-500">
              14 jugadores al azar de TODO el catálogo (2 porteros, 4-4-4). Todos de rareza Normal, como manda el rogue.
            </span>
          </button>

          {/* Con el bombo activo, el equipo es TUYO: bautízalo y elige escudo.
              Con un valor por defecto para los ansiosos («FC Bombo»). */}
          {randomSquad && (
            <div className="mt-2 rounded-xl border border-fuchsia-500/30 bg-slate-900/50 p-2">
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value.slice(0, 24))}
                placeholder={`${getTeam(customCrest ?? 'raimon').name} (ponle nombre)`}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-2 py-1.5 text-[13px] font-bold placeholder:text-slate-600 outline-none focus:border-fuchsia-500/60"
              />
              {/* Con escudo elegido faltaba un botón para ARRANCAR: tocar un
                  instituto de abajo también vale (elige tu hueco del cuadro),
                  pero este empieza ya con el cuadro estándar de la saga. */}
              <Button
                variant="primary"
                full
                className="mt-2"
                onClick={() => begin(sagaInfo.playable[0])}
              >
                ¡Empezar con este equipo!
              </Button>
              <p className="mt-1 text-[9px] text-slate-500">
                O toca un instituto de abajo para ocupar SU hueco del cuadro (cambia a quién te enfrentas).
              </p>
              <div className="mt-2 text-[10px] uppercase tracking-widest text-slate-500">Escudo</div>
              <div className="mt-1 grid grid-cols-8 gap-1.5">
                {TEAMS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setCustomCrest(t.id)}
                    className={`aspect-square grid place-items-center rounded-lg border transition active:scale-95 ${
                      customCrest === t.id ? 'border-fuchsia-400 bg-fuchsia-500/15' : 'border-slate-700/60 bg-slate-800/50'
                    }`}
                    title={t.name}
                  >
                    <ImgFallback
                      src={`${import.meta.env.BASE_URL}inazuma/teams/${t.id}.png`}
                      className="w-6 h-6 object-contain"
                      fallback={<span className="text-[9px] font-extrabold" style={{ color: t.color }}>{t.name[0]}</span>}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* TODOS los equipos con entidad son jugables (no solo los tres de la
            saga): primero los protagonistas de la saga, luego el resto de su
            cuadro, y después todos los demás. Con la Plantilla del bombo
            activada, el elegido pone escudo/hueco y el once sale del azar. */}
        <div className="text-[11px] uppercase tracking-widest text-slate-500 -mb-1">
          Elige tu equipo · {randomSquad ? 'plantilla del BOMBO' : 'plantilla OFICIAL'}
        </div>
        {[
          ...sagaInfo.playable,
          ...sagaInfo.teams.filter((id) => !sagaInfo.playable.includes(id)),
          ...TEAMS.map((t) => t.id).filter((id) => !sagaInfo.teams.includes(id) && !sagaInfo.playable.includes(id)),
        ].map((id) => {
          const team = getTeam(id)
          const squad = startingSquad(id).map((pid) => getPlayerBase(pid))
          // Los nombres GRANDES de esa plantilla (peso en la serie, no rareza).
          const stars = squad.filter((p) => p.fame >= 4)
          const info = ELEMENT_INFO[team.element]
          return (
            <Card
              key={id}
              className="p-3"
              onClick={() => begin(id)}
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
                    <span className="text-[10px] inline-flex items-center gap-1" style={{ color: info.color }}>
                      <Icon name={info.icon} className="w-3 h-3" />{info.label}
                    </span>
                    <span className="text-[10px] text-slate-500">·  {squad.length} jugadores</span>
                  </div>
                </div>
              </div>

              {team.taunt && <p className="text-[11px] italic text-slate-400 mt-2">«{team.taunt}»</p>}

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
                          className="w-full h-full object-cover object-top"
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
