import { useEffect, useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button } from '@/ui/components/kit'
import { APP_VERSION } from '@/version'
import { CHANGELOG } from '@/data/changelog'
import AccountModal from '@/ui/components/AccountModal'
import Sprite from '@/ui/components/Sprite'
import Icon from '@/ui/components/Icon'
import { SonoroWave } from '@/ui/components/SonoroBadge'
import RunTeamModal from '@/ui/components/RunTeamModal'
import { formatDuration } from '@/ui/components/RunTimer'
import { ACHIEVEMENT_BY_ID } from '@/data/achievements'
import { dailyChallenge } from '@/engine/run/daily'
import { STARTERS_BY_GEN } from '@/data/starters'
import { GENERATIONS } from '@/data/generations'
import { getSpecies } from '@/data'
import { loadCyber, loadInazuma, loadMeta, type BestRun } from '@/persistence/db'
import { setInazumaEntry } from '@/state/inazumaStore'
import TypeBadge from '@/ui/components/TypeBadge'
import { layerName } from '@/engine/inazuma/tournament'

/** Fecha local (YYYY-MM-DD) de un timestamp, igual que `dailyChallenge`. */
function localDateStr(ms: number): string {
  const dt = new Date(ms)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

/**
 * Tarjeta de JUEGO del hub. La pantalla de inicio tiene dos niveles a
 * propósito: arriba los juegos (que son experiencias independientes, cada una
 * con su propia partida guardada) y abajo los menús. Antes era una pila de seis
 * botones donde convivían «Liga Pokémon» y «Ajustes» como si fueran lo mismo, y
 * no escalaba: cada modo nuevo alargaba la lista.
 */
function GameCard({
  title, subtitle, accent, icon, badge, locked, onClick, wide,
}: {
  title: string
  subtitle: string
  accent: string
  icon: React.ReactNode
  /** Texto del estado (p. ej. «Continuar · Kanto»). Resalta la tarjeta. */
  badge?: string | null
  locked?: boolean
  onClick: () => void
  wide?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border p-3 text-left transition active:scale-[0.97] ${
        wide ? 'col-span-2' : ''
      } ${badge ? 'border-emerald-500/50' : 'border-slate-700/70'} ${locked ? 'opacity-60' : ''}`}
      style={{ background: `linear-gradient(140deg, ${accent}2e, rgba(15,23,42,0.85) 62%)` }}
    >
      <div className="flex items-start gap-2">
        <span className="shrink-0">{icon}</span>
        {locked && <Icon name="lock" className="w-3.5 h-3.5 text-slate-400 ml-auto shrink-0" />}
      </div>
      <div className="mt-1.5 font-extrabold text-[13px] leading-tight">{title}</div>
      <div className="text-[10px] text-slate-400 leading-snug">{subtitle}</div>
      {badge && (
        <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 text-[9px] font-bold text-emerald-200">
          <Icon name="play" className="w-2.5 h-2.5" /> {badge}
        </div>
      )}
    </button>
  )
}

/** Botón pequeño de la barra de menús (Pokédex, Récords, Ajustes…). */
function MenuButton({ icon, label, onClick, locked }: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  locked?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl border border-slate-700/70 bg-slate-800/60 py-2 transition active:scale-95 ${
        locked ? 'opacity-60' : ''
      }`}
    >
      <span className="relative">
        {icon}
        {locked && <Icon name="lock" className="w-2.5 h-2.5 text-slate-400 absolute -right-1.5 -top-1" />}
      </span>
      <span className="text-[9px] text-slate-400 leading-none">{label}</span>
    </button>
  )
}

export default function HomeScreen() {
  const { navigate, hasSavedRun, resumeRun, cloudUser, pet, newAchievements, clearNewAchievements, startRun, totalWins, hasSavedLeague, resumeLeague } = useGame()
  const [account, setAccount] = useState(false)
  const [dailyOpen, setDailyOpen] = useState(false)
  const [newsOpen, setNewsOpen] = useState(false)
  const [dailyWins, setDailyWins] = useState<BestRun[]>([])
  const [viewRun, setViewRun] = useState<BestRun | null>(null)
  const [leagueLocked, setLeagueLocked] = useState(false)
  const [storyLocked, setStoryLocked] = useState(false)
  // Estado de los otros dos juegos, para que su tarjeta diga si hay partida
  // empezada sin tener que entrar a mirar.
  const [inazumaRound, setInazumaRound] = useState<string | null>(null)
  const [hasCyber, setHasCyber] = useState(false)
  const today = dailyChallenge().date
  // Portada en DOS niveles: eliges universo y dentro está todo lo suyo.
  const [section, setSection] = useState<null | 'pokemon' | 'inazuma'>(null)
  useEffect(() => {
    void loadInazuma().then((s) => setInazumaRound(s ? `Continuar · ${layerName(s.layer, s.teamId, s.saga)}` : null))
    void loadCyber().then((s) => setHasCyber(!!s))
  }, [])
  // Carga las runs con las que ya ganaste el reto de HOY (al abrir el modal).
  // Incluye una detección retroactiva: partidas ganadas hoy con la misma región e
  // inicial que el reto (para victorias anteriores a la etiqueta `daily`).
  useEffect(() => {
    if (!dailyOpen) return
    const d = dailyChallenge()
    const dRegion = GENERATIONS.find((g) => g.gen === d.gen)?.region
    const dStarters = STARTERS_BY_GEN[d.gen] ?? STARTERS_BY_GEN[1]
    const dStarter = dStarters[d.seed % dStarters.length]
    void loadMeta().then((m) => setDailyWins((m.bestRuns ?? []).filter((r) => r.won && (
      r.daily === today ||
      (!r.daily && r.region === dRegion && r.starterId === dStarter && localDateStr(r.date) === today)
    ))))
  }, [dailyOpen, today])
  return (
    // `justify-center`, no `justify-between`: al pasar la cabecera a `shrink-0`
    // para el hub, el `between` separaba logo y tarjetas a los dos extremos y
    // en pantallas altas quedaba medio móvil de vacío en medio.
    <div className="flex flex-col flex-1 items-center justify-center p-6 safe-top safe-bottom relative overflow-y-auto no-scrollbar">
      {/* Botón de nube / cuenta (arriba, centrado) */}
      <button
        onClick={() => setAccount(true)}
        className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-bold active:scale-95 transition max-w-[80%] ${cloudUser ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' : 'border-slate-700 bg-slate-800/80 text-slate-300'}`}
        aria-label="Cuenta en la nube"
      >
        <Icon name="cloud" className="w-4 h-4 shrink-0" /> <span className="truncate">{cloudUser ? cloudUser.email : 'Iniciar sesión'}</span>
      </button>

      <div className="flex flex-col items-center gap-1 mt-9 shrink-0">
        <img src={`${import.meta.env.BASE_URL}pokerogue.png`} alt="Pokémon Roguelike" className="w-44 max-w-[60%] object-contain animate-float drop-shadow-xl" draggable={false} />
        {pet != null && <Sprite speciesId={pet} className="w-12 h-12 object-contain -mt-1" />}
      </div>

      <div className="w-full flex flex-col gap-2.5 max-w-sm mt-3">
        {section === null && (
          <>
            <GameCard
              wide
              title="Pokémon"
              subtitle="PokéRogue, Modo Historia, Liga, Pokédex, Cyber…"
              accent="#ef4444"
              icon={<Icon name="pokeball" className="w-7 h-7 text-red-400" />}
              badge={hasSavedRun ? 'Run en curso' : null}
              onClick={() => setSection('pokemon')}
            />
            <GameCard
              wide
              title="Inazuma Eleven"
              subtitle="Inazuma Rogue, álbum de cromos y opciones"
              accent="#f59e0b"
              icon={<span className="text-2xl leading-none">⚽</span>}
              badge={inazumaRound}
              onClick={() => setSection('inazuma')}
            />
            <div className="grid grid-cols-3 gap-2 mt-0.5">
              <MenuButton icon={<Icon name="achievement" className="w-5 h-5" />} label="Logros" onClick={() => navigate('achievements')} />
              <MenuButton icon={<Icon name="wrench" className="w-5 h-5" />} label="Ajustes" onClick={() => navigate('settings')} />
              <MenuButton icon={<Icon name="scroll" className="w-5 h-5" />} label="Novedades" onClick={() => setNewsOpen(true)} />
            </div>
          </>
        )}

        {section !== null && (
          <button onClick={() => setSection(null)} className="flex items-center gap-1.5 text-[12px] text-slate-400 active:scale-95">
            ← Volver
          </button>
        )}

        {section === 'pokemon' && <>
        {/* --- SECCIÓN POKÉMON: todo lo del universo Pokémon, junto. --- */}
        <div className="text-[10px] uppercase tracking-widest text-red-400/80 px-0.5">Pokémon</div>
        <div className="grid grid-cols-2 gap-2.5">
          <GameCard
            title="PokéRogue"
            subtitle="Roguelike autobattler por las 9 regiones"
            accent="#ef4444"
            icon={<Icon name="pokeball" className="w-7 h-7 text-red-400" />}
            badge={hasSavedRun ? 'Continuar' : null}
            onClick={() => (hasSavedRun ? void resumeRun() : navigate('genSelect'))}
          />
          <GameCard
            title="Modo Historia"
            subtitle="La conspiración de Mistery Island, en 6 capítulos"
            accent="#a855f7"
            icon={<SonoroWave className="w-7 h-7 text-fuchsia-300" />}
            locked={!cloudUser}
            onClick={() => { if (cloudUser) navigate('story'); else setStoryLocked(true) }}
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <MenuButton
            icon={<Icon name="liga" className="w-5 h-5" />}
            label="Liga"
            locked={totalWins === 0}
            onClick={() => { if (totalWins > 0) { if (hasSavedLeague) void resumeLeague(); else navigate('leagueSetup') } else setLeagueLocked(true) }}
          />
          <MenuButton icon={<Icon name="dailycal" className="w-5 h-5" />} label="Reto diario" onClick={() => setDailyOpen(true)} />
          <MenuButton icon={<Icon name="pokedex" className="w-5 h-5" />} label="Pokédex" onClick={() => navigate('pokedex')} />
          <MenuButton icon={<Icon name="records" className="w-5 h-5" />} label="Récords" onClick={() => navigate('records')} />
        </div>

        <div className="grid grid-cols-4 gap-2">
          <MenuButton icon={<span className="text-xl leading-none">🕹️</span>} label={hasCyber ? 'Cyber ·' : 'Cyber'} onClick={() => navigate('cyber')} />
        </div>
        </>}

        {section === 'inazuma' && <>
        {/* --- SECCIÓN INAZUMA ELEVEN --- */}
        <div className="text-[10px] uppercase tracking-widest text-amber-400/80 px-0.5 mt-1">Inazuma Eleven</div>
        <div className="grid grid-cols-2 gap-2.5">
          <GameCard
            title="Inazuma Rogue"
            subtitle="Roguelite de fútbol: gana el Football Frontier"
            accent="#f59e0b"
            icon={<span className="text-2xl leading-none">⚽</span>}
            badge={inazumaRound}
            onClick={() => navigate('inazuma')}
          />
          <div className="grid grid-rows-2 gap-2">
            <MenuButton
              icon={<Icon name="pokedex" className="w-5 h-5" />}
              label="Álbum de cromos"
              onClick={() => { setInazumaEntry('album'); navigate('inazuma') }}
            />
            <MenuButton
              icon={<Icon name="gear" className="w-5 h-5" />}
              label="Opciones"
              onClick={() => { setInazumaEntry('title'); navigate('inazuma') }}
            />
          </div>
        </div>

        </>}

        <button
          onClick={() => setNewsOpen(true)}
          className="mx-auto flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 active:scale-95 transition"
        >
          <Icon name="scroll" className="w-3.5 h-3.5" /> Novedades · <span className="text-slate-600">{APP_VERSION}</span>
        </button>
      </div>

      {account && <AccountModal onClose={() => setAccount(false)} />}

      {/* Novedades: cambios de las últimas 3 versiones */}
      {newsOpen && (
        <div className="absolute inset-0 z-[75] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={() => setNewsOpen(false)}>
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-4 animate-pop-in max-h-[85%] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="text-center shrink-0">
              <Icon name="scroll" className="w-8 h-8 mx-auto text-slate-200" />
              <div className="font-extrabold text-lg">Novedades</div>
              <p className="text-[11px] text-slate-400">Lo que hemos tocado en las últimas versiones</p>
            </div>
            <div className="mt-3 overflow-y-auto no-scrollbar flex flex-col gap-4 pr-1">
              {CHANGELOG.slice(0, 3).map((e) => (
                <div key={e.version}>
                  <div className="flex items-baseline gap-2">
                    <span className="font-extrabold text-red-400">{e.version}</span>
                    <span className="text-sm font-bold text-slate-200">{e.title}</span>
                    <span className="text-[10px] text-slate-500 ml-auto">{e.date}</span>
                  </div>
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {e.changes.map((c, i) => (
                      <li key={i} className="flex gap-2 text-[12px] text-slate-300 leading-snug">
                        <span className="text-red-400/70 shrink-0">›</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <Button variant="primary" full className="mt-3 shrink-0" onClick={() => setNewsOpen(false)}>Entendido</Button>
          </div>
        </div>
      )}

      {/* Reto diario: info + inicial fijo, igual para todos */}
      {dailyOpen && (() => {
        const d = dailyChallenge()
        const region = GENERATIONS.find((g) => g.gen === d.gen)?.region ?? 'Kanto'
        const starters = STARTERS_BY_GEN[d.gen] ?? STARTERS_BY_GEN[1]
        const starterId = starters[d.seed % starters.length]
        const sp = getSpecies(starterId)
        const playDaily = () => { setDailyOpen(false); startRun({ gen: d.gen, pools: [d.gen], random: false, starterId, difficulty: 'normal', seed: d.seed, daily: d.date }) }
        const won = dailyWins.length > 0
        return (
          <div className="absolute inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={() => setDailyOpen(false)}>
            <div className="w-full max-w-sm rounded-3xl border border-fuchsia-500/50 bg-slate-900 p-4 animate-pop-in text-center" onClick={(e) => e.stopPropagation()}>
              <Icon name="dailycal" className="w-9 h-9 mx-auto text-fuchsia-300" />
              <div className="font-extrabold text-fuchsia-300 text-lg">Reto diario · {d.date}</div>

              {won ? (
                <>
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 px-3 py-2 text-sm mt-2 mb-1 inline-flex items-center gap-1.5 justify-center w-full">
                    <Icon name="check" className="w-4 h-4 text-emerald-400" /> <b>¡Ya completaste el reto de hoy!</b>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">{dailyWins.length === 1 ? 'Lo conseguiste con esta partida' : 'Lo conseguiste con estas partidas'} (toca para ver el equipo):</p>
                  <div className="flex flex-col gap-2 mb-3">
                    {dailyWins.map((r, i) => (
                      <button key={i} onClick={() => setViewRun(r)} className="flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-800/60 p-2 active:scale-[0.98] transition">
                        <div className="flex items-center gap-1">
                          {(r.team ?? []).slice(0, 6).map((m) => <Sprite key={m.uid} speciesId={m.speciesId} shiny={m.shiny} className="w-7 h-7 object-contain" />)}
                        </div>
                        <span className="text-emerald-300 font-bold text-sm whitespace-nowrap shrink-0">⏱ {formatDuration(r.durationMs)} ›</span>
                      </button>
                    ))}
                  </div>
                  <Button variant="primary" full onClick={playDaily}><span className="inline-flex items-center justify-center gap-1.5"><Icon name="refresh" className="w-4 h-4" /> Volver a jugar</span></Button>
                  <button className="text-xs text-slate-500 mt-2" onClick={() => setDailyOpen(false)}>Cerrar</button>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-300 mt-1">El <b>mismo desafío para todo el mundo hoy</b>: misma región, mismo mapa (semilla fija) y mismo inicial. Dificultad <b>Normal</b>. ¡Compite por el mejor tiempo en el ranking «Hoy»!</p>
                  <div className="my-3 flex items-center justify-center gap-3 rounded-2xl bg-slate-800 p-3">
                    <Sprite speciesId={starterId} className="w-16 h-16 object-contain" />
                    <div className="text-left">
                      <div className="text-[11px] text-slate-400 uppercase tracking-wide">Región {region}</div>
                      <div className="font-bold">{sp.displayName}</div>
                      <div className="flex gap-1 mt-0.5">{sp.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
                    </div>
                  </div>
                  <Button variant="primary" full onClick={playDaily}>¡Aceptar el reto!</Button>
                  <button className="text-xs text-slate-500 mt-2" onClick={() => setDailyOpen(false)}>Ahora no</button>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {/* Detalle del equipo de una partida diaria ganada */}
      {viewRun && <RunTeamModal run={viewRun} onClose={() => setViewRun(null)} />}

      {/* Liga bloqueada: explicación */}
      {leagueLocked && (
        <div className="absolute inset-0 z-[75] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={() => setLeagueLocked(false)}>
          <div className="w-full max-w-sm rounded-3xl border border-amber-500/50 bg-slate-900 p-4 animate-pop-in text-center" onClick={(e) => e.stopPropagation()}>
            <Icon name="liga" className="w-12 h-12 mx-auto" />
            <div className="font-extrabold text-amber-300 text-lg mt-1 inline-flex items-center gap-1.5 justify-center"><Icon name="lock" className="w-4 h-4" /> Liga Pokémon</div>
            <p className="text-sm text-slate-300 mt-2">
              Un <b>torneo de 32 entrenadores</b> (fase de grupos + eliminatorias) contra líderes, Alto Mando,
              campeones y personajes del anime. Eliges uno de tus <b>equipos campeones</b> y compites con él a nivel 100.
            </p>
            <div className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm mt-3 inline-flex items-center gap-1.5 justify-center w-full">
              <Icon name="lock" className="w-4 h-4 shrink-0 text-slate-400" /> Necesitas <b>ganar al menos 1 partida</b> para desbloquearla.
            </div>
            <Button variant="primary" full className="mt-3" onClick={() => setLeagueLocked(false)}>Entendido</Button>
          </div>
        </div>
      )}

      {/* Modo Historia bloqueado: requiere sesión */}
      {storyLocked && (
        <div className="absolute inset-0 z-[75] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={() => setStoryLocked(false)}>
          <div className="w-full max-w-sm rounded-3xl border border-fuchsia-500/50 bg-slate-900 p-4 animate-pop-in text-center" onClick={(e) => e.stopPropagation()}>
            <SonoroWave className="w-12 h-12 mx-auto text-fuchsia-300" />
            <div className="font-extrabold text-fuchsia-300 text-lg mt-1 inline-flex items-center gap-1.5 justify-center"><Icon name="lock" className="w-4 h-4" /> Modo Historia</div>
            <p className="text-sm text-slate-300 mt-2">Desentraña la conspiración de <b>Mistery Island</b> y el origen del tipo Sonoro, capítulo a capítulo. Tu progreso se guarda en tu cuenta.</p>
            <div className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm mt-3 inline-flex items-center gap-1.5 justify-center w-full">
              <Icon name="cloud" className="w-4 h-4 shrink-0 text-slate-400" /> Necesitas <b>iniciar sesión</b> para jugarlo.
            </div>
            <Button variant="primary" full className="mt-3" onClick={() => { setStoryLocked(false); setAccount(true) }}>Iniciar sesión</Button>
          </div>
        </div>
      )}

      {/* Aviso de logros recién conseguidos */}
      {newAchievements.length > 0 && (
        <div className="absolute inset-0 z-[80] bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={clearNewAchievements}>
          <div className="w-full max-w-xs rounded-3xl border border-amber-500/50 bg-slate-900 p-4 text-center animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <Icon name="party" className="w-8 h-8 mx-auto mb-1 text-amber-300" />
            <div className="font-extrabold text-amber-300 mb-2">¡Logro{newAchievements.length > 1 ? 's' : ''} desbloqueado{newAchievements.length > 1 ? 's' : ''}!</div>
            <div className="flex flex-col gap-1.5">
              {newAchievements.map((id) => {
                const a = ACHIEVEMENT_BY_ID.get(id)
                return (
                  <div key={id} className="flex items-center gap-2.5 text-left bg-slate-800 rounded-xl px-3 py-2">
                    <Icon name={a?.icon ?? 'achievement'} className="w-7 h-7 shrink-0 text-amber-300" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold">{a?.title ?? id}</div>
                      <div className="text-[11px] text-slate-400">{a?.desc ?? ''}</div>
                    </div>
                  </div>
                )
              })}
            </div>
            <Button variant="primary" full className="mt-3" onClick={clearNewAchievements}>¡Genial!</Button>
          </div>
        </div>
      )}
    </div>
  )
}
