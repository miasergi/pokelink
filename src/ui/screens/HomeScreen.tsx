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
import { play } from '@/utils/sfx'
import { forceUpdate } from '@/utils/appUpdate'
import { STARTERS_BY_GEN } from '@/data/starters'
import { GENERATIONS } from '@/data/generations'
import { getSpecies } from '@/data'
import { loadDragon, loadInazuma, loadMeta, type BestRun } from '@/persistence/db'
import { setInazumaEntry } from '@/state/inazumaStore'
import { dragonSummary } from '@/state/dragonStore'
import TypeBadge from '@/ui/components/TypeBadge'
import { layerName } from '@/engine/inazuma/tournament'

/** Fecha local (YYYY-MM-DD) de un timestamp, igual que `dailyChallenge`. */
function localDateStr(ms: number): string {
  const dt = new Date(ms)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

/**
 * PORTADA de un juego en el hub, estilo consola: arte a sangre, el logo
 * encima, el estado de tu partida y UN solo botón. Un toque = jugar. Los
 * accesos secundarios van en chips debajo — nada de pilas de botones.
 */
function CoverCard({ art, logo, alt, title, color, status, cta, onPlay }: {
  art: string
  /** El LOGO del juego, arriba (como siempre). */
  logo: string
  alt: string
  /** El TÍTULO, abajo en el sitio del subtítulo. */
  title: string
  color: string
  status: string
  cta: string
  onPlay: () => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { play('confirm'); onPlay() }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { play('confirm'); onPlay() } }}
      className="relative w-full overflow-hidden rounded-3xl border cursor-pointer select-none transition active:scale-[0.985]"
      style={{ borderColor: `${color}55`, boxShadow: `0 20px 44px -20px ${color}88` }}
    >
      <img src={art} alt="" aria-hidden draggable={false} className="absolute inset-0 w-full h-full object-cover" />
      {/* Velo: legibilidad abajo, el arte respira arriba, y un aliento del
          color del juego en el borde superior. */}
      <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(2,6,23,.95) 6%, rgba(2,6,23,.55) 46%, rgba(2,6,23,.12) 78%, ${color}26 100%)` }} />
      <div className="relative h-44 p-4 flex flex-col justify-between">
        <img src={logo} alt={alt} draggable={false} className="h-12 self-start object-contain drop-shadow-[0_5px_16px_rgba(0,0,0,.85)]" />
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            {/* El TÍTULO va aquí, donde estaba el subtítulo. */}
            <div className="text-[13px] uppercase tracking-wide font-black" style={{ color, textShadow: '0 2px 8px rgba(0,0,0,.8)' }}>{title}</div>
            <div className="text-[11px] font-bold text-slate-100 truncate">{status}</div>
          </div>
          <span
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-black uppercase tracking-wide text-slate-950"
            style={{ background: color, boxShadow: `0 6px 18px -4px ${color}` }}
          >
            <Icon name="play" className="w-3.5 h-3.5" /> {cta}
          </span>
        </div>
      </div>
    </div>
  )
}

/** Acceso secundario bajo cada portada (Pokédex, Liga, Álbum…). */
function Chip({ icon, label, onClick, locked }: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  locked?: boolean
}) {
  return (
    <button
      onClick={() => { play(locked ? 'error' : 'tap'); onClick() }}
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border border-slate-700/70 bg-slate-900/85 px-3 py-1.5 text-[11px] font-bold text-slate-300 transition active:scale-95 ${locked ? 'opacity-60' : ''}`}
    >
      {icon}
      {label}
      {locked && <Icon name="lock" className="w-3 h-3 text-slate-500" />}
    </button>
  )
}

export default function HomeScreen() {
  const { navigate, hasSavedRun, resumeRun, cloudUser, pet, newAchievements, clearNewAchievements, startRun, totalWins, hasSavedLeague, resumeLeague } = useGame()
  const [account, setAccount] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [dailyOpen, setDailyOpen] = useState(false)
  const [newsOpen, setNewsOpen] = useState(false)
  const [dailyWins, setDailyWins] = useState<BestRun[]>([])
  const [viewRun, setViewRun] = useState<BestRun | null>(null)
  const [leagueLocked, setLeagueLocked] = useState(false)
  const [storyLocked, setStoryLocked] = useState(false)
  // Estado de los otros dos juegos, para que su tarjeta diga si hay partida
  // empezada sin tener que entrar a mirar.
  const [inazumaRound, setInazumaRound] = useState<string | null>(null)
  const [dragonRun, setDragonRun] = useState<string | null>(null)
  const today = dailyChallenge().date
  useEffect(() => {
    void loadInazuma().then((s) => setInazumaRound(s ? `Continuar · ${layerName(s.layer, s.teamId, s.saga)}` : null))
    void loadDragon().then((s) => setDragonRun(s && !s.finished ? dragonSummary(s) : null))
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
    <div className="flex flex-col flex-1 p-5 safe-top safe-bottom relative overflow-y-auto no-scrollbar">
      {/* Cabecera compacta: la marca a la izquierda, tu cuenta a la derecha. */}
      <div className="flex items-center justify-between gap-2 shrink-0 mb-4 mt-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] uppercase tracking-[0.3em] font-extrabold text-slate-400">Sala de juegos</span>
          {pet != null && <Sprite speciesId={pet} className="w-8 h-8 object-contain" />}
        </div>
        <button
          onClick={() => setAccount(true)}
          className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold active:scale-95 transition max-w-[48%] ${cloudUser ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300' : 'border-slate-700 bg-slate-800/80 text-slate-300'}`}
          aria-label="Cuenta en la nube"
        >
          <Icon name="cloud" className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{cloudUser ? cloudUser.email : 'Iniciar sesión'}</span>
        </button>
      </div>

      <div className="w-full max-w-sm mx-auto flex flex-col gap-2.5 my-auto">
        {/* ---- DESPEDIDA DE ÓSCAR (evento: 12 y 13 de septiembre) ----
             Va la primera A PROPÓSITO: durante esa semana es lo único que la
             cuadrilla va a abrir aquí. Cuando pase, se quita y punto. */}
        <CoverCard
          art={`${import.meta.env.BASE_URL}covers/despedida-cover.svg`}
          logo={`${import.meta.env.BASE_URL}despedida/logo.svg`}
          alt="Despedida de Óscar"
          title="Despedida de Óscar"
          color="#f472b6"
          status="12 y 13 sept · retos, puntos y premios"
          cta="Entrar"
          onPlay={() => navigate('despedida')}
        />

        {/* ---- POKÉMON ---- */}
        <CoverCard
          art={`${import.meta.env.BASE_URL}covers/pokemon-cover.jpg`}
          logo={`${import.meta.env.BASE_URL}pokerogue.png`}
          alt="PokéRogue"
          title="Pokémon Roguelike"
          color="#f87171"
          status={hasSavedRun ? 'Run en curso' : 'Nueva aventura por las 9 regiones'}
          cta={hasSavedRun ? 'Continuar' : 'Jugar'}
          onPlay={() => (hasSavedRun ? void resumeRun() : navigate('genSelect'))}
        />
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <Chip icon={<SonoroWave className="w-3.5 h-3.5 text-fuchsia-300" />} label="Historia" locked={!cloudUser} onClick={() => { if (cloudUser) navigate('story'); else setStoryLocked(true) }} />
          <Chip icon={<Icon name="liga" className="w-3.5 h-3.5 text-amber-300" />} label="Liga" locked={totalWins === 0} onClick={() => { if (totalWins > 0) { if (hasSavedLeague) void resumeLeague(); else navigate('leagueSetup') } else setLeagueLocked(true) }} />
          <Chip icon={<Icon name="dailycal" className="w-3.5 h-3.5 text-fuchsia-300" />} label="Reto diario" onClick={() => setDailyOpen(true)} />
          <Chip icon={<Icon name="pokedex" className="w-3.5 h-3.5 text-red-300" />} label="Pokédex" onClick={() => navigate('pokedex')} />
          <Chip icon={<Icon name="records" className="w-3.5 h-3.5 text-sky-300" />} label="Récords" onClick={() => navigate('records')} />
          <Chip icon={<Icon name="dice" className="w-3.5 h-3.5 text-cyan-300" />} label="Cyber" onClick={() => navigate('cyber')} />
        </div>

        {/* ---- INAZUMA ELEVEN ---- */}
        <CoverCard
          art={`${import.meta.env.BASE_URL}covers/inazuma-cover.jpg`}
          logo={`${import.meta.env.BASE_URL}inazuma/logo.png`}
          alt="Inazuma Eleven"
          title="Inazuma Eleven Roguelike"
          color="#fbbf24"
          status={inazumaRound ? inazumaRound.replace('Continuar · ', '') : 'Nuevo asalto al Football Frontier'}
          cta={inazumaRound ? 'Continuar' : 'Jugar'}
          // DIRECTO al grano: con partida, al mapa; sin ella, al configurador
          // (la portada del modo era un doble paso que sobraba).
          onPlay={() => { setInazumaEntry(inazumaRound ? 'map' : 'teamSelect'); navigate('inazuma') }}
        />
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <Chip icon={<Icon name="album" className="w-3.5 h-3.5 text-amber-300" />} label="Álbum de cromos" onClick={() => { setInazumaEntry('album'); navigate('inazuma') }} />
          <Chip icon={<Icon name="gear" className="w-3.5 h-3.5 text-slate-400" />} label="Opciones" onClick={() => { setInazumaEntry('title'); navigate('inazuma') }} />
        </div>

        {/* ---- DRAGON BALL ROGUE ---- */}
        <CoverCard
          art={`${import.meta.env.BASE_URL}covers/dragon-cover.jpg`}
          logo={`${import.meta.env.BASE_URL}dragon/logo.png`}
          alt="Dragon Ball Rogue"
          title="Dragon Ball Rogue"
          color="#f97316"
          status={dragonRun ?? 'Cuatro sagas, una sola vida'}
          cta={dragonRun ? 'Continuar' : 'Jugar'}
          onPlay={() => navigate('dragon')}
        />

        {/* ---- LA PREVIA (juegos de beber) ---- */}
        <CoverCard
          art={`${import.meta.env.BASE_URL}covers/party-cover.svg`}
          logo={`${import.meta.env.BASE_URL}party/logo.svg`}
          alt="La Previa"
          title="Juegos de previa"
          color="#f472b6"
          status="Ruleta, Yo Nunca, Botella, Rey de Copas y Ocalimocho"
          cta="Jugar"
          onPlay={() => navigate('party')}
        />

        {/* ---- Menú transversal, discreto. ---- */}
        <div className="flex items-center justify-center gap-1.5 mt-2 flex-wrap">
          <Chip icon={<Icon name="achievement" className="w-3.5 h-3.5 text-amber-300" />} label="Logros" onClick={() => navigate('achievements')} />
          <Chip icon={<Icon name="wrench" className="w-3.5 h-3.5 text-slate-400" />} label="Ajustes" onClick={() => navigate('settings')} />
          <Chip icon={<Icon name="scroll" className="w-3.5 h-3.5 text-slate-400" />} label={`Novedades · ${APP_VERSION}`} onClick={() => setNewsOpen(true)} />
          {/* Para quien no sabe de cachés: un toque y el juego queda al día
              (limpia el service worker y las cachés; los saves no se tocan). */}
          <Chip
            icon={<Icon name="refresh" className={`w-3.5 h-3.5 ${updating ? 'animate-spin text-emerald-300' : 'text-emerald-400'}`} />}
            label={updating ? 'Actualizando…' : 'Actualizar'}
            onClick={() => { if (!updating) { setUpdating(true); void forceUpdate() } }}
          />
        </div>
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
