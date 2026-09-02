// Pantallas de apoyo del modo: estadísticas de la partida, álbum de fichados y
// el tutorial de entrada.
import { useEffect, useRef, useState } from 'react'
import { Button, Card, ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { useInazuma } from '@/state/inazumaStore'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import { ELEMENT_ICON } from '@/ui/inazuma/Glyphs'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { getPlayerBase, PLAYERS } from '@/data/inazuma/players'
import { TEAM_BY_ID, TEAMS, getSaga, SAGAS, REGIONS, regionOfTeam, type RegionId, type SagaId } from '@/data/inazuma/teams'
import { STARTERS_BY_SAGA } from '@/data/inazuma/starters'
import { uniqueByName } from '@/engine/inazuma/rewards'
import { loadMeta } from '@/persistence/db'
import { useCromo } from '@/ui/inazuma/CromoCard'
import type { Element as InazumaElement, InazumaSave, PlayerStats, RandomFlags } from '@/engine/inazuma/types'

// ---------------------------------------------------------------------------
// Estadísticas de la partida
// ---------------------------------------------------------------------------

const EMPTY: PlayerStats = { goals: 0, saves: 0, duelsWon: 0, duelsLost: 0, matches: 0 }

/**
 * El CUERPO de las estadísticas (pichichi + tabla desplegable por jugador),
 * compartido entre la vista de Estadísticas del mapa y el CIERRE del torneo:
 * al perder se merecen los MISMOS datos que al ganar.
 */
export function StatsBoard({ save }: { save: InazumaSave }) {
  // Ficha DESPLEGABLE: toca una fila y ves sus números completos y las
  // supertécnicas que usó (con cuántas veces salieron bien).
  const [open, setOpen] = useState<string | null>(null)

  // TODOS los que vistieron la camiseta: la plantilla actual Y los ya
  // TRASPASADOS (sus stats guardan el baseId precisamente para esto).
  const enPlantilla = new Set(save.roster.map((p) => p.uid))
  const rows = [
    ...save.roster.map((p) => ({ uid: p.uid, baseId: p.baseId, vendido: false, s: save.playerStats[p.uid] ?? EMPTY })),
    ...Object.entries(save.playerStats)
      .filter(([uid, s]) => !enPlantilla.has(uid) && s.baseId)
      .map(([uid, s]) => ({ uid, baseId: s.baseId!, vendido: true, s })),
  ].sort((a, b) => b.s.goals - a.s.goals || b.s.duelsWon - a.s.duelsWon)
  const pichichi = rows.filter((r) => r.s.goals > 0)[0]
  const totalGoals = rows.reduce((a, r) => a + r.s.goals, 0)

  return (
    <>
        {pichichi ? (
          <Card className="p-3 border-amber-500/50" style={{ background: 'linear-gradient(120deg,#f59e0b22,rgba(30,41,59,.7) 60%)' }}>
            <div className="text-[10px] uppercase tracking-widest text-amber-300">Pichichi</div>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-amber-500/40 bg-slate-800 grid place-items-center shrink-0">
                <ImgFallback
                  src={portraitUrl(pichichi.baseId)}
                  className="w-full h-full object-cover object-top"
                  fallback={<Icon name="crest" className="w-6 h-6 text-slate-400" />}
                />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold">{getPlayerBase(pichichi.baseId).name}</div>
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
          {rows.map(({ uid, baseId, vendido, s }) => {
            const base = getPlayerBase(baseId)
            const total = s.duelsWon + s.duelsLost
            const expanded = open === uid
            const techs = Object.entries(s.techs ?? {}).sort((a, b) => b[1] - a[1])
            return (
              <div key={uid} className={`border-t border-slate-800 ${vendido ? 'opacity-70' : ''}`}>
                <button
                  onClick={() => setOpen(expanded ? null : uid)}
                  className="w-full grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 py-1.5 items-center text-left active:bg-slate-800/40"
                >
                  <span className="text-[12px] font-bold truncate">
                    {base.name}
                    <span className="text-[9px] text-slate-500 ml-1">{base.position}</span>
                    {vendido && <span className="text-[8px] uppercase tracking-wide text-rose-300/80 ml-1">traspasado</span>}
                  </span>
                  <span className="w-8 text-right text-[12px] tabular-nums font-bold text-emerald-300">{s.goals || '·'}</span>
                  <span className="w-8 text-right text-[12px] tabular-nums text-sky-300">{s.saves || '·'}</span>
                  <span className="w-12 text-right text-[11px] tabular-nums text-slate-400">
                    {total ? `${Math.round((s.duelsWon / total) * 100)}%` : '·'}
                  </span>
                </button>
                {expanded && (
                  <div className="px-2 pb-2 text-[11px] text-slate-300 bg-slate-900/40">
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
                      <span><b className="text-slate-200">{s.matches}</b> partidos</span>
                      <span><b className="text-slate-200">{s.minutes ?? 0}</b> min</span>
                      <span>duelos <b className="text-emerald-300">{s.duelsWon}</b>–<b className="text-rose-300">{s.duelsLost}</b></span>
                      <span><b className="text-emerald-300">{s.goals}</b> goles</span>
                      <span><b className="text-amber-300">{s.assists ?? 0}</b> asist.</span>
                      <span><b className="text-sky-300">{s.saves}</b> paradas</span>
                      <span><b className="text-rose-300">{s.injuries ?? 0}</b> lesiones</span>
                    </div>
                    {techs.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {techs.map(([name, n]) => (
                          <span key={name} className="rounded-full border border-slate-700 bg-slate-800/70 px-1.5 py-0.5 text-[9px] font-bold text-amber-200">
                            {name} ×{n}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-1 text-[9px] text-slate-600">Sin supertécnicas ganadoras registradas aún.</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-slate-600">
          «Duelos» es el porcentaje de mano a mano ganados, tirando y defendiendo.
        </p>
    </>
  )
}

export function StatsView() {
  const { save, goTo } = useInazuma()
  if (!save) return null

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
        <StatsBoard save={save} />
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
                      // Tocar un cromo CONSEGUIDO lo abre en grande (CromoCard).
                      onClick={has ? () => useCromo.getState().open(p.id) : undefined}
                      className={`rounded-xl border p-1 text-center ${has ? 'cursor-pointer active:scale-95 transition' : ''}`}
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
    title: 'La Táctica especial',
    body: 'Encadenar jugadas buenas llena la barra de Táctica especial. Al llenarse puedes ENCENDER la táctica de tu club: durante unas acciones cambia cómo se resuelve el partido. Las nuevas se compran en la tienda.',
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
  // Modalidades de la partida.
  const [saga, setSaga] = useState<SagaId>('ff')
  const [difficulty, setDifficulty] = useState<'normal' | 'dificil' | 'leyenda'>('normal')
  // De qué juegos sale la gente y qué se desordena. Por defecto, LA SAGA
  // ELEGIDA (sigue al selector hasta que toques las épocas a mano).
  const [pools, setPools] = useState<RegionId[]>(['ff'])
  const poolsTouched = useRef(false)
  useEffect(() => {
    if (!poolsTouched.current) setPools([saga as RegionId])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saga])
  const [random, setRandom] = useState<RandomFlags>({})
  // TU CLUB: lo fundas tú — nombre libre y CUALQUIER escudo.
  const [customName, setCustomName] = useState('')
  const [customCrest, setCustomCrest] = useState<string | null>(null)
  // TU INICIAL: el único jugador con el que arrancas. Tres canónicos por
  // saga + «Buscar» (cualquiera del catálogo de las épocas elegidas).
  const [starterId, setStarterId] = useState<string>(STARTERS_BY_SAGA.ff[0])
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  useEffect(() => {
    // Al cambiar de saga, si tu inicial era uno de los canónicos de la otra,
    // salta al primero de la nueva (una elección de Buscar se respeta).
    const all = Object.values(STARTERS_BY_SAGA).flat()
    if (all.includes(starterId) && !STARTERS_BY_SAGA[saga].includes(starterId)) {
      setStarterId(STARTERS_BY_SAGA[saga][0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saga])
  const begin = () => {
    void newTournament('raimon', {
      difficulty,
      saga,
      starterId,
      // Sin nombre escrito NO se manda nada: `createSave` bautiza al club con
      // el nombre del instituto del escudo (aquí se colaba «Nuevo Raimon»).
      customName: customName.trim() || undefined,
      customCrest: customCrest ?? 'raimon',
      pools,
      random,
    })
  }
  const sagaInfo = getSaga(saga)
  // Catálogo del BUSCAR: las épocas marcadas (o la de la saga), sin clones.
  const searchEras = new Set<RegionId>(pools.length ? pools : [saga as RegionId])
  const searchPool = uniqueByName(PLAYERS.filter((pl) => searchEras.has(regionOfTeam(pl.team))))
  const q = query.trim().toLowerCase()
  const results = q
    ? searchPool.filter((pl) => pl.name.toLowerCase().includes(q)).slice(0, 24)
    : searchPool.filter((pl) => pl.fame >= 4).slice(0, 24)

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
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Juego</div>
          {/* LAS CUATRO CARÁTULAS. Se elige de un vistazo, como en la estantería:
              la portada dice mucho más que «Academia Alius». */}
          <div className="grid grid-cols-4 gap-1.5">
            {SAGAS.map((sg) => (
              <button
                key={sg.id}
                onClick={() => setSaga(sg.id)}
                className={`rounded-xl border overflow-hidden transition active:scale-95 ${
                  saga === sg.id
                    ? 'border-sky-400 ring-2 ring-sky-400/50'
                    : 'border-slate-700 opacity-65'
                }`}
              >
                <ImgFallback
                  src={`${import.meta.env.BASE_URL}inazuma/sagas/${sg.id}.png`}
                  alt={sg.name}
                  className="w-full aspect-[3/4] object-cover"
                  fallback={
                    <span className="grid place-items-center w-full aspect-[3/4] bg-slate-900 text-[9px] font-bold text-slate-400 px-1 text-center">
                      {sg.name}
                    </span>
                  }
                />
                <span className={`block text-[9px] font-bold leading-tight py-1 px-0.5 ${
                  saga === sg.id ? 'text-sky-200 bg-sky-500/15' : 'text-slate-400'
                }`}>
                  {sg.name}
                </span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">{sagaInfo.desc}</p>
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
                  onClick={() => { poolsTouched.current = true; setPools(on ? pools.filter((x) => x !== r.id) : [...pools, r.id]) }}
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
              { k: 'inicial' as const, t: 'Tu inicial al azar', d: 'Arrancas con un jugador sorteado de las épocas marcadas, y el ojeador solo trae 3 al azar (sin canon del club ni Fichaje personalizado).' },
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
          {/* MONOTIPO (como en Pokémon): con los jugadores al azar, todo lo
              que entre en tu club puede limitarse a UN elemento. */}
          {random.inicial && (
            <div className="mt-2 rounded-xl border border-slate-700 bg-slate-900/40 p-2">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Reto monotipo</div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setRandom({ ...random, monotipo: undefined })}
                  className={`rounded-lg border px-2 py-1.5 text-[11px] font-bold transition active:scale-95 ${
                    !random.monotipo ? 'border-fuchsia-500/70 bg-fuchsia-500/15 text-fuchsia-200' : 'border-slate-700 bg-slate-800/60 text-slate-400'
                  }`}
                >
                  Libre
                </button>
                {(['fuego', 'bosque', 'aire', 'montana'] as InazumaElement[]).map((el) => (
                  <button
                    key={el}
                    onClick={() => setRandom({ ...random, monotipo: random.monotipo === el ? undefined : el })}
                    title={ELEMENT_INFO[el].label}
                    className={`grid place-items-center w-9 h-9 rounded-lg border transition active:scale-95 ${
                      random.monotipo === el ? 'border-fuchsia-500/70 bg-fuchsia-500/15' : 'border-slate-700 bg-slate-800/60 opacity-75'
                    }`}
                  >
                    <Icon name={ELEMENT_ICON[el]} className="w-5 h-5" style={{ color: ELEMENT_INFO[el].color }} />
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-slate-500 mt-1 leading-snug">
                Inicial, ojeador, regalos e intercambios: SOLO jugadores de ese elemento. Los rivales no cambian.
              </p>
            </div>
          )}
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
        </div>

        {/* TU INICIAL: como el de Pokémon — empiezas con UNO y a reclutar. */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Tu inicial</div>
          {/* Con «Tu inicial al azar» no hay nada que elegir: se sortea. */}
          {random.inicial ? (
            <div className="rounded-xl border border-fuchsia-500/50 bg-fuchsia-500/10 px-3 py-2.5 text-[12px] text-fuchsia-200 font-bold">
              Se sortea al empezar
              <span className="block text-[10px] text-slate-400 font-normal leading-snug">
                Cualquiera del catálogo de las épocas marcadas. Lo descubres al fundar el club.
              </span>
            </div>
          ) : (<>
          <div className="grid grid-cols-4 gap-1.5">
            {STARTERS_BY_SAGA[saga].map((id) => {
              const b = getPlayerBase(id)
              const info = ELEMENT_INFO[b.element]
              const on = starterId === id
              return (
                <button
                  key={id}
                  onClick={() => { setStarterId(id); setSearching(false) }}
                  className={`rounded-xl border overflow-hidden transition active:scale-95 ${
                    on ? 'border-amber-400 ring-2 ring-amber-400/50' : 'border-slate-700 opacity-70'
                  }`}
                >
                  <ImgFallback
                    src={portraitUrl(b.id)}
                    alt={b.name}
                    className="w-full aspect-square object-cover object-top bg-slate-900"
                    fallback={<span className="grid place-items-center w-full aspect-square bg-slate-900 text-lg font-extrabold">{b.name[0]}</span>}
                  />
                  <span className={`block text-[9px] font-bold leading-tight py-1 px-0.5 ${on ? 'text-amber-200 bg-amber-500/15' : 'text-slate-400'}`}>
                    {b.name.split(' ')[0]}
                    <span className="mt-0.5 flex items-center justify-center gap-1 text-[8px] font-normal" style={{ color: info.color }}>
                      {b.position}
                      <Icon name={ELEMENT_ICON[b.element]} className="w-2.5 h-2.5" />
                    </span>
                  </span>
                </button>
              )
            })}
            <button
              onClick={() => setSearching(!searching)}
              className={`rounded-xl border grid place-items-center transition active:scale-95 ${
                searching || !STARTERS_BY_SAGA[saga].includes(starterId)
                  ? 'border-sky-400 ring-2 ring-sky-400/40 bg-sky-500/10' : 'border-slate-700 bg-slate-800/60'
              }`}
            >
              <Icon name="magnifier" className="w-6 h-6 text-sky-300" />
              <span className="text-[9px] font-bold text-sky-200">Buscar</span>
            </button>
          </div>
          {/* El elegido por BUSCAR, confirmado a la vista. */}
          {!STARTERS_BY_SAGA[saga].includes(starterId) && (() => {
            const b = getPlayerBase(starterId)
            return (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-2 py-1.5">
                <span className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 grid place-items-center shrink-0">
                  <ImgFallback src={portraitUrl(b.id)} className="w-full h-full object-cover object-top" fallback={<span className="text-[10px] font-bold">{b.name[0]}</span>} />
                </span>
                <div className="text-[12px] font-bold">{b.name} <span className="text-[10px] text-slate-400 font-normal">{b.position} · {TEAM_BY_ID.get(b.team)?.name ?? 'Resto del mundo'}</span></div>
              </div>
            )
          })()}
          {searching && (
            <div className="mt-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Busca a cualquiera del catálogo…"
                className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-2 py-1.5 text-[13px] placeholder:text-slate-600 outline-none focus:border-sky-500/60"
              />
              <div className="mt-1.5 max-h-52 overflow-y-auto no-scrollbar flex flex-col gap-1">
                {results.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => { setStarterId(b.id); setSearching(false) }}
                    className="flex items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-800/60 px-2 py-1 text-left active:scale-[0.99]"
                  >
                    <span className="w-7 h-7 rounded-full overflow-hidden bg-slate-900 grid place-items-center shrink-0">
                      <ImgFallback src={portraitUrl(b.id)} className="w-full h-full object-cover object-top" fallback={<span className="text-[9px] font-bold">{b.name[0]}</span>} />
                    </span>
                    <span className="text-[12px] font-bold truncate">{b.name}</span>
                    <span className="ml-auto text-[10px] text-slate-500 shrink-0">{b.position} · {TEAM_BY_ID.get(b.team)?.name ?? 'Resto del mundo'}</span>
                  </button>
                ))}
                {!results.length && <p className="text-[11px] text-slate-500 px-1 py-2">Nadie con ese nombre en las épocas marcadas.</p>}
              </div>
            </div>
          )}
          </>)}
          <p className="text-[10px] text-slate-500 mt-1.5">
            Empiezas SOLO con él (y el brazalete de capitán). Al resto los reclutas por el camino: ojeadores, rivales caídos, intercambios…
          </p>
        </div>

        {/* TU CLUB: nombre y escudo, siempre tuyos. */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Tu club</div>
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value.slice(0, 24))}
            placeholder="Nombre del club (vacío = el del escudo)"
            className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-2 py-1.5 text-[13px] font-bold placeholder:text-slate-600 outline-none focus:border-amber-500/60"
          />
          <div className="mt-2 text-[10px] uppercase tracking-widest text-slate-500">Tu equipo (escudo)</div>
          <p className="text-[9px] text-slate-500 mt-0.5">
            El escudo DEFINE tu club: el ojeador siempre te ofrecerá a un canon de este equipo.
          </p>
          {/* CON NOMBRE bajo cada escudo: 60 escudos sin rótulo eran un
              «adivina el emblema». Y el elegido, cantado en grande debajo. */}
          <div className="mt-1 grid grid-cols-6 gap-1.5">
            {TEAMS.map((t) => (
              <button
                key={t.id}
                onClick={() => setCustomCrest(t.id)}
                className={`flex flex-col items-center gap-0.5 rounded-lg border px-0.5 py-1 transition active:scale-95 ${
                  (customCrest ?? 'raimon') === t.id ? 'border-amber-400 bg-amber-500/15' : 'border-slate-700/60 bg-slate-800/50'
                }`}
                title={t.name}
              >
                <ImgFallback
                  src={`${import.meta.env.BASE_URL}inazuma/teams/${t.id}.png`}
                  className="w-7 h-7 object-contain"
                  fallback={<span className="text-[10px] font-extrabold" style={{ color: t.color }}>{t.name[0]}</span>}
                />
                <span className="w-full truncate text-center text-[7px] leading-tight text-slate-400">
                  {t.name.replace(/^Instituto /, '')}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-center text-[11px] font-bold text-amber-200">
            {TEAM_BY_ID.get(customCrest ?? 'raimon')?.name}
          </p>
        </div>

        <Button variant="primary" full onClick={begin}>
          ¡Fundar el club y a la calle!
        </Button>
        <p className="text-[10px] text-slate-500 -mt-1 text-center">
          El primer tramo es fútbol callejero: recluta un CINCO antes del primer instituto.
        </p>
      </div>

      <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-2 safe-bottom">
        <Button variant="ghost" full onClick={() => goTo('title')}>Atrás</Button>
      </div>
    </div>
  )
}
