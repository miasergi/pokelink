// Vistas del modo fuera del partido: título, mapa del torneo, previa, vestuario
// (plantilla), tienda, cartas de recompensa y pantallas de cierre.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Card, ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { useInazuma } from '@/state/inazumaStore'
import { useSettings } from '@/state/settingsStore'
import { PlayerCard, PlayerRow, ElementChip, Meter, portraitUrl, staminaColor, StatGrid } from '@/ui/inazuma/PlayerCard'
import MapBoard, { NodePreview } from '@/ui/inazuma/MapBoard'
import SquadBar from '@/ui/inazuma/SquadBar'
import PitchView from '@/ui/inazuma/PitchView'
import LineupBoard from '@/ui/inazuma/LineupBoard'
import CompareSheet, { type CompareBlock } from '@/ui/inazuma/CompareSheet'
import { MedalHint } from '@/ui/inazuma/BagView'
import { StatsBoard } from '@/ui/inazuma/ExtraViews'
import { FORMATIONS, getFormation } from '@/data/inazuma/formations'
import { ELEMENT_INFO, elementMultiplier } from '@/engine/inazuma/elements'
import { CoinPrice, CoinText, ComboMark, Crest, ELEMENT_ICON, ElementIcon, ItemIcon, Pic, rarityBorder, rarityCardStyle, TechIcons, TechniqueBadge, useTechSheet } from '@/ui/inazuma/Glyphs'
import { SettingsButton } from '@/ui/inazuma/SettingsSheet'
import { GuideButton } from '@/ui/inazuma/GuideSheet'
import {
  buildLineup, canUpgradeTechnique, effectiveStats, lineupError, ptMax, RARITY_LABEL, rarityOf,
  realTechniquePower, rivalArmbandBaseId, rivalKnownTechniques, rivalPreviewStats, rivalRarityMap, rivalStartingXI, scaleStats,
  rivalBench, slotRole, techLevel, techniqueCostFor, techniquePower, transferValue,
} from '@/engine/inazuma/roster'
import SignatureChain from '@/ui/inazuma/SignatureChain'
import { SQUAD_SIZE } from '@/engine/inazuma/types'
import type { Element as InazumaElement } from '@/engine/inazuma/types'

import { availableNextNodes, layerName, mapSegments, segmentForLayer } from '@/engine/inazuma/tournament'
import { getTeam, TEAM_BY_ID, teamDisplay } from '@/data/inazuma/teams'
import { COMBOS } from '@/data/inazuma/combos'
import { tacticEffectLines, tacticFitsHint, getTactic, TACTICS, TACTIC_PRICE } from '@/data/inazuma/tactics'
import { loadMeta } from '@/persistence/db'
import { shareText } from '@/utils/share'
import { getPlayerBase, TEAM_NAMES } from '@/data/inazuma/players'
import { getTechnique } from '@/data/inazuma/techniques'
import { getItem, stockFor } from '@/data/inazuma/items'
import { bossIndexForLayer } from '@/engine/inazuma/tournament'
import { ROSTER_MAX, type InazumaSave, type PlayerInstance, type TournamentNode } from '@/engine/inazuma/types'

// ---------------------------------------------------------------------------
// Título
// ---------------------------------------------------------------------------

export function TitleView() {
  const { hasSave, save, continueTournament, abandonTournament, exitInazuma, goTo } = useInazuma()
  const [confirm, setConfirm] = useState(false)
  // EL SALÓN DE LA FAMA: las runs CAMPEONAS guardadas en la meta (como el
  // hall del modo Pokémon). Base de futuros torneos entre tus equipos.
  const [hall, setHall] = useState<null | NonNullable<Awaited<ReturnType<typeof loadMeta>>['inazumaTeams']>>(null)
  const [hallOpen, setHallOpen] = useState(false)
  const [hallSel, setHallSel] = useState<number | null>(null)
  const openHall = () => {
    setHallOpen(true)
    void loadMeta().then((m) => setHall((m.inazumaTeams ?? []).filter((t) => t.result === 'campeon').reverse()))
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-between p-6 safe-top safe-bottom">
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
        {/* El logo REAL del juego (bajado de la wiki con los escudos); si no
            cargara, el título de texto de siempre sigue debajo. */}
        <ImgFallback
          src={`${import.meta.env.BASE_URL}inazuma/logo.png`}
          alt="Inazuma Eleven"
          className="w-56 max-w-[70vw] animate-float drop-shadow-[0_0_18px_rgba(251,191,36,0.35)]"
          fallback={<Pic name="ball" className="w-16 h-16 animate-float" />}
        />
        <h1 className="text-2xl font-extrabold tracking-tight -mt-1">
          <span className="text-amber-400">ROGUE</span>
        </h1>
        <p className="text-slate-400 text-sm max-w-[17rem]">
          Coge al Raimon, cruza el <b className="text-slate-200">Football Frontier</b> y levanta
          el título. Ocho eliminatorias, una sola derrota y a casa.
        </p>
        <div className="flex flex-wrap justify-center gap-1.5 mt-1">
          {(['fuego', 'bosque', 'aire', 'montana'] as const).map((e) => <ElementChip key={e} element={e} />)}
        </div>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        {hasSave && save && (
          <>
            <Button variant="success" full onClick={continueTournament}>
              <span className="inline-flex items-center justify-center gap-1.5">
                <Icon name="play" className="w-4 h-4" />
                Continuar · {layerName(save.layer, save.teamId, save.saga)}
              </span>
            </Button>
            <div className="text-center text-[11px] text-slate-500">
              {save.record[0]}V {save.record[1]}E {save.record[2]}D · {save.roster.length} jugadores · <CoinPrice amount={save.coins} coin="w-3 h-3" />
            </div>
          </>
        )}
        <Button variant="primary" full onClick={() => (hasSave ? setConfirm(true) : goTo('teamSelect'))}>
          {hasSave ? 'Empezar torneo nuevo' : '¡Empezar el Football Frontier!'}
        </Button>
        <Button variant="secondary" full onClick={() => goTo('album')}>
          <span className="inline-flex items-center justify-center gap-1.5">
            <Icon name="pokedex" className="w-4 h-4" /> Álbum de fichajes
          </span>
        </Button>
        <Button variant="secondary" full onClick={openHall}>
          <span className="inline-flex items-center justify-center gap-1.5">
            <Icon name="trophy" className="w-4 h-4 text-amber-300" /> Salón de la fama
          </span>
        </Button>
        <Button variant="ghost" full onClick={exitInazuma}>Volver al inicio</Button>
      </div>

      {hallOpen && (
        <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-sm grid place-items-center p-4" onClick={() => { setHallOpen(false); setHallSel(null) }}>
          <div className="w-full max-w-sm rounded-3xl border border-amber-500/50 bg-slate-900 p-4 max-h-[86svh] flex flex-col animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="text-center shrink-0">
              <Icon name="trophy" className="w-9 h-9 mx-auto text-amber-300" />
              <div className="font-extrabold text-amber-300 text-lg">Salón de la fama</div>
              <p className="text-[11px] text-slate-400">Tus equipos campeones del Football Frontier.</p>
            </div>
            <div className="mt-3 flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-2">
              {hall == null && <div className="text-center text-[11px] text-slate-500 py-6">Cargando…</div>}
              {hall != null && hall.length === 0 && (
                <div className="text-center text-[12px] text-slate-500 py-6">
                  Aún no hay campeones. El primero que levante el título entra aquí para siempre.
                </div>
              )}
              {(hall ?? []).map((t, i) => {
                const sel = hallSel === i
                return (
                  <button
                    key={t.finishedAt}
                    onClick={() => setHallSel(sel ? null : i)}
                    className={`rounded-2xl border p-2.5 text-left transition active:scale-[0.99] ${sel ? 'border-amber-500/60 bg-amber-500/10' : 'border-slate-700 bg-slate-800/50'}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-9 h-9 shrink-0 grid place-items-center rounded-xl overflow-hidden border border-amber-500/40 bg-slate-900">
                        <ImgFallback
                          src={`${import.meta.env.BASE_URL}inazuma/teams/${t.crest ?? t.teamId}.png`}
                          className="w-full h-full object-contain"
                          fallback={<Icon name="trophy" className="w-5 h-5 text-amber-300" />}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-extrabold truncate">{t.name ?? 'Mi club'}</div>
                        <div className="text-[10px] text-slate-400 tabular-nums">
                          {new Date(t.finishedAt).toLocaleDateString('es-ES')} · {t.record[0]}V {t.record[1]}E {t.record[2]}D · {t.goalsFor}-{t.goalsAgainst}
                        </div>
                      </div>
                      <Icon name="trophy" className="w-4 h-4 text-amber-300 shrink-0" />
                    </div>
                    {sel && (
                      <div className="mt-2 flex flex-col gap-1">
                        {[...t.roster]
                          .sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0) || (b.duelsWon ?? 0) - (a.duelsWon ?? 0))
                          .map((p, k) => (
                            <div key={k} className="flex items-center gap-2 rounded-lg bg-slate-900/60 px-1.5 py-1">
                              <span
                                className="w-7 h-7 shrink-0 rounded-full overflow-hidden border-2 grid place-items-center bg-slate-900"
                                style={{ borderColor: (p.rarity ?? 1) === 4 ? 'transparent' : rarityBorder(p.rarity ?? 1) }}
                              >
                                <ImgFallback
                                  src={portraitUrl(p.baseId)}
                                  className="w-full h-full object-cover object-top"
                                  fallback={<span className="text-[8px] font-bold">{getPlayerBase(p.baseId).name.slice(0, 2)}</span>}
                                />
                              </span>
                              <span className="min-w-0 flex-1 text-[11px] font-bold truncate">
                                {getPlayerBase(p.baseId).name}
                                <span className="ml-1 text-[9px] text-slate-500 font-normal">Nv.{p.level}{p.bond ? ` · vínculo +${p.bond}%` : ''}</span>
                              </span>
                              <span className="shrink-0 text-[9px] tabular-nums text-slate-400">
                                {(p.goals ?? 0) > 0 && <b className="text-emerald-300">{p.goals}G </b>}
                                {(p.saves ?? 0) > 0 && <b className="text-sky-300">{p.saves}P </b>}
                                {(p.duelsWon ?? 0)}-{(p.duelsLost ?? 0)}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <Button variant="primary" full className="mt-3 shrink-0" onClick={() => { setHallOpen(false); setHallSel(null) }}>Cerrar</Button>
          </div>
        </div>
      )}

      {confirm && (
        <div className="absolute inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={() => setConfirm(false)}>
          <div className="w-full max-w-xs rounded-3xl border border-rose-500/50 bg-slate-900 p-4 text-center animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <Icon name="warning" className="w-9 h-9 mx-auto text-rose-300" />
            <div className="font-extrabold text-rose-300 mt-1">¿Borrar el torneo actual?</div>
            <p className="text-sm text-slate-300 mt-2">Solo se guarda una partida. Empezar de cero borra la plantilla y el progreso.</p>
            <Button variant="danger" full className="mt-3" onClick={() => { setConfirm(false); void abandonTournament().then(() => goTo('teamSelect')) }}>
              Sí, empezar de cero
            </Button>
            <button className="text-xs text-slate-500 mt-2" onClick={() => setConfirm(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mapa del torneo
// ---------------------------------------------------------------------------

/**
 * Mapa del tramo actual: las capas que quedan hasta el próximo instituto, con
 * las casillas de cada una. Se pinta UNA PANTALLA POR TRAMO, igual que el mapa
 * del roguelike Pokémon.
 */
export function MapView() {
  const { save, chooseNode, goTo, resumePausedMatch } = useInazuma()
  const skipNodeInfo = useSettings((s) => s.skipNodeInfo)
  const [preview, setPreview] = useState<TournamentNode | null>(null)
  if (!save) return null
  const segs = mapSegments(save.map)
  const seg = segmentForLayer(segs, save.layer)
  const reachable = new Set(availableNextNodes(save.map, save.currentNodeId).map((n) => n.id))

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SaveHeader save={save} />
      <div className="relative shrink-0 overflow-hidden border-b border-slate-800/70">
        {/* EL ESCENARIO del tramo: un fondo de los propios juegos, DE LA SAGA
            que juegas (la ribera en la clásica, la caravana en Alius, Liocott
            en el FFI, el Camino Sagrado en GO, lo virtual en VR), con un
            gradiente para que el texto siga leyéndose. Si falta, gradiente. */}
        <img
          src={`${import.meta.env.BASE_URL}inazuma/zones/${save.saga ?? 'ff'}-${Math.min(7, seg.index)}.png`}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover object-center opacity-45 select-none pointer-events-none"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-slate-950/85 pointer-events-none" />
        <div className="relative px-3 pt-2 pb-1.5">
        <SegmentProgress segs={segs} current={seg.index} />
        <div className="flex items-center gap-2 mt-2">
          <TeamCrest teamId={seg.boss?.teamId} size={30} />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-slate-300/90">{seg.name}</div>
            <div className="font-extrabold text-[13px] leading-tight truncate">
              Camino a {seg.boss ? getTeam(seg.boss.teamId ?? '').name : 'la final'}
            </div>
          </div>
          <span className="ml-auto text-[10px] text-slate-400 tabular-nums shrink-0">
            {seg.index + 1}/8
          </span>
        </div>
        </div>
      </div>

      {save.pausedMatch && (
        <button
          onClick={resumePausedMatch}
          className="mx-3 mt-2 shrink-0 rounded-xl border border-emerald-500/60 bg-emerald-500/15 px-3 py-2 text-left active:scale-[0.98] transition"
        >
          <div className="text-[10px] uppercase tracking-widest text-emerald-300">Partido a medias</div>
          <div className="text-[12px] font-bold text-slate-100">
            Retomar el descanso · {save.pausedMatch.match.home.goals}-{save.pausedMatch.match.away.goals}
          </div>
        </button>
      )}

      {/* Con «entrar directo» activado, tocar una casilla ALCANZABLE entra
          sin pasar por la ventana informativa. Las inalcanzables la abren
          igual (explica por qué no se puede). */}
      <MapBoard save={save} onPick={(n) => (skipNodeInfo && reachable.has(n.id) ? chooseNode(n.id) : setPreview(n))} />

      {/* LA PLANTILLA A LA VISTA: el cinco, el banquillo y los huecos por
          reclutar — con drag & drop, como la barra del equipo Pokémon. */}
      <SquadBar />

      <BottomBar onSquad={() => goTo('squad')} onBag={() => goTo('bag')} />

      {preview && (
        <NodePreview
          node={preview}
          save={save}
          canEnter={reachable.has(preview.id) && !preview.cleared}
          onEnter={() => { const id = preview.id; setPreview(null); chooseNode(id) }}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}

function SegmentProgress({ segs, current }: { segs: { index: number }[]; current: number }) {
  return (
    <div className="flex items-center gap-1">
      {segs.map((s) => (
        <div
          key={s.index}
          className={`flex-1 h-1.5 rounded-full ${
            s.index < current ? 'bg-emerald-500' : s.index === current ? 'bg-amber-400' : 'bg-slate-700'
          }`}
        />
      ))}
    </div>
  )
}

/**
 * Escudo del instituto. Igual que los retratos: si el PNG no está (o falla la
 * descarga), se pinta un escudo generado con la inicial sobre el color del
 * equipo, y la pantalla no se rompe.
 */
export function TeamCrest({ teamId, size = 32 }: { teamId?: string; size?: number }) {
  if (!teamId) return null
  const team = TEAM_BY_ID.get(teamId)
  if (!team) return null
  return (
    <span
      className="shrink-0 grid place-items-center rounded-lg overflow-hidden border"
      style={{ width: size, height: size, borderColor: `${team.color}66`, background: `${team.color}22` }}
    >
      <ImgFallback
        src={`${import.meta.env.BASE_URL}inazuma/teams/${teamId}.png`}
        className="w-full h-full object-contain"
        alt={team.name}
        fallback={
          <span className="font-extrabold" style={{ color: team.color, fontSize: size * 0.45 }}>
            {team.name.replace(/^(Instituto|Royal)\s+/i, '')[0]}
          </span>
        }
      />
    </span>
  )
}

function SaveHeader({ save }: { save: InazumaSave }) {
  // El nombre y el color salen del instituto ELEGIDO, con su ESCUDO delante.
  // Todo lleva `min-w-0` + `truncate`: en pantallas estrechas el nombre cede
  // sitio antes de chocar con el dinero o el engranaje.
  const team = TEAM_BY_ID.get(save.teamId ?? 'raimon')
  const display = teamDisplay(save)
  return (
    <div
      className="shrink-0 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-2.5 pb-1.5 flex items-center gap-2"
      style={{ paddingTop: 'max(0.55rem, env(safe-area-inset-top))' }}
    >
      <span
        className="w-8 h-8 shrink-0 grid place-items-center rounded-lg border overflow-hidden"
        style={{ borderColor: `${team?.color ?? '#e11d48'}66`, background: `${team?.color ?? '#e11d48'}18` }}
      >
        <ImgFallback
          src={`${import.meta.env.BASE_URL}inazuma/teams/${display.crestId}.png`}
          className="w-7 h-7 object-contain"
          alt=""
          fallback={<span className="w-2.5 h-5 rounded-sm" style={{ background: team?.color ?? '#e11d48' }} />}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-extrabold text-[13px] leading-tight truncate">{display.name}</div>
        <div className="text-[10px] text-slate-400 tabular-nums truncate">
          {save.record[0]}V {save.record[1]}E {save.record[2]}D · {save.goalsFor}:{save.goalsAgainst}
          {/* La saga y la dificultad, si no son las de siempre. */}
          {save.saga && save.saga !== 'ff' && (
            <span className="text-sky-300"> · {save.saga === 'alius' ? 'Alius' : 'FFI'}</span>
          )}
          {save.difficulty && save.difficulty !== 'normal' && (
            <span className="text-rose-300"> · {save.difficulty === 'leyenda' ? 'Leyenda' : 'Difícil'}</span>
          )}
        </div>
      </div>
      <span className="text-[13px] font-bold text-amber-300 tabular-nums shrink-0">
        <CoinPrice amount={save.coins} />
      </span>
      <GuideButton />
      <SettingsButton />
    </div>
  )
}

function BottomBar({ onSquad }: { onSquad: () => void; onBag?: () => void }) {
  // UN solo botón: GESTIONAR (el vestuario de siempre, con la mochila dentro).
  // El botón «Mochila» duplicaba destino y se pidió fuera.
  return (
    <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-2 safe-bottom flex gap-2">
      <Button variant="secondary" full onClick={onSquad}>
        <span className="inline-flex items-center justify-center gap-1.5"><Icon name="people" className="w-4 h-4" /> Gestionar</span>
      </Button>
      {/* El «volver a inicio» vivía aquí y se pulsaba sin querer: fuera.
          Salir del modo queda en ajustes. */}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Previa del partido
// ---------------------------------------------------------------------------

export function PreviewView() {
  const { save, matchNode, confirmMatch, goTo } = useInazuma()
  // Ficha abierta al tocar una ficha de cualquiera de las dos alineaciones.
  const [inspect, setInspect] = useState<CompareBlock | null>(null)
  const [compare, setCompare] = useState<CompareBlock | null>(null)
  // BLINDAJE anti doble-toque: el segundo tap de un doble toque caía justo
  // donde aparece «Comparar» y abría el comparador sin querer.
  const inspectAt = useRef(0)
  useEffect(() => { if (inspect) inspectAt.current = Date.now() }, [inspect])
  if (!save || !matchNode) return null
  const team = getTeam(matchNode.teamId ?? 'occult')
  // En una pachanga el rival es el equipo de barrio de la casilla, NO el
  // instituto del tramo: ese solo presta su elemento para el aviso táctico.
  // Enseñar «Instituto Occult» en una pachanga contra la «Peña del parque» era
  // la incoherencia más gorda de la previa.
  const isBoss = matchNode.kind === 'jefe' || matchNode.kind === 'final'
  const rivalName = isBoss ? team.name : matchNode.title
  const lineup = buildLineup(save.roster, save.lineup)
  const err = lineupError(save.roster, save.lineup, save.formation)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SaveHeader save={save} />
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-4 pb-6 flex flex-col gap-3">
        <div
          className="rounded-2xl border border-slate-700 p-4 text-center"
          style={{ background: `linear-gradient(150deg, ${team.color}33, rgba(15,23,42,0.9) 60%)` }}
        >
          <div className="text-[11px] uppercase tracking-widest text-slate-400">{matchNode.subtitle}</div>
          <div className="flex items-center justify-center gap-2 mt-1">
            {isBoss && <Crest teamId={matchNode.teamId} className="w-7 h-7" />}
            <span className="text-xl font-extrabold">{rivalName}</span>
          </div>
          <div className="mt-1.5 flex justify-center"><ElementChip element={team.element} /></div>
          {isBoss
            ? <p className="text-[12px] italic text-slate-400 mt-2">«{team.taunt}»</p>
            : <p className="text-[12px] text-slate-500 mt-2"><CoinText text={matchNode.reward ?? ''} coin="w-3 h-3" /></p>}
        </div>

        {/* Aviso de emparejamiento elemental: es LA decisión táctica del modo */}
        <MatchupHint teamElement={team.element} lineup={lineup?.all ?? []} />

        {/* Su once, en el MISMO formato de campo que el tuyo, y clicable. */}
        {matchNode.teamId && (matchNode.kind === 'jefe' || matchNode.kind === 'final') && (
          <>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-slate-500">
              <Crest teamId={matchNode.teamId} className="w-4 h-4" />
              Su once · nivel {matchNode.level ?? 10}
            </div>
            <LineupBoard
              chips={rivalStartingXI(matchNode.teamId).map((b) => ({
                key: b.id,
                name: b.name,
                baseId: b.id,
                element: b.element,
                role: b.position,
                position: b.position,
                // Rareza según el PLAN del partido: los cracks del rival se
                // llevan los tramos altos (3 platas en el primero… final
                // multicolor entera).
                rarity: rivalRarityMap(matchNode.teamId!, bossIndexForLayer(matchNode.layer)).get(b.id) ?? 1,
                level: matchNode.level ?? 10,
                // El CAPITÁN canónico luce su Brazalete en la previa.
                itemId: b.id === rivalArmbandBaseId(matchNode.teamId!) ? 'brazalete-capitan' : undefined,
              }))}
              onTap={(c) => {
                const b = getPlayerBase(c.baseId)
                const r = rivalRarityMap(matchNode.teamId!, bossIndexForLayer(matchNode.layer)).get(b.id) ?? 1
                const lvl = matchNode.level ?? 10
                const stats = rivalPreviewStats(b, matchNode.teamId!, lvl, r)
                setInspect({
                  name: b.name,
                  baseId: b.id,
                  position: b.position,
                  element: b.element,
                  level: lvl,
                  rarity: r,
                  stats,
                  // Con qué sale al campo: depósito lleno y SUS técnicas
                  // conocidas (cadena por nivel y rareza, extra si es crack).
                  pt: Math.round(28 + stats.aguante * 0.7),
                  ptMax: Math.round(28 + stats.aguante * 0.7),
                  stamina: 100,
                  techniques: rivalKnownTechniques(b, lvl, r, true),
                })
              }}
            />
            {/* SU BANQUILLO: exactamente los que pueden entrar al descanso
                (`rivalBench` — la MISMA lista que usa el motor del partido). */}
            <BenchStrip
              players={rivalBench(matchNode.teamId).map((b) => ({
                baseId: b.id, name: b.name, position: b.position, element: b.element,
                level: matchNode.level ?? save.layer * 7,
                rarity: rivalRarityMap(matchNode.teamId!, bossIndexForLayer(matchNode.layer)).get(b.id) ?? 1,
              }))}
            />
          </>
        )}

        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-slate-500">
          <Crest teamId={teamDisplay(save).crestId} className="w-4 h-4" />
          Tu once · {getFormation(save.formation).name}
        </div>
        <LineupBoard
          chips={(lineup?.all ?? []).map((p, i) => {
            const b = getPlayerBase(p.baseId)
            return {
              key: p.uid,
              name: b.name,
              baseId: b.id,
              element: b.element,
              role: slotRole(save.formation, i),
              position: b.position,
              level: p.level,
              rarity: rarityOf(p),
              stamina: p.stamina,
              pt: p.pt,
              ptMax: ptMax(p),
              itemId: p.item,
            }
          })}
          onTap={(c) => {
            const p = save.roster.find((x) => x.uid === c.key)
            if (!p) return
            const b = getPlayerBase(p.baseId)
            setInspect({
              name: b.name,
              baseId: b.id,
              position: b.position,
              element: b.element,
              level: p.level,
              rarity: rarityOf(p),
              stats: effectiveStats(p),
              pt: p.pt,
              ptMax: ptMax(p),
              stamina: p.stamina,
              techniques: p.techniques,
            })
          }}
        />
        {/* TU BANQUILLO, también a la vista en la previa. */}
        <BenchStrip
          players={save.roster
            .filter((p) => !(lineup?.all ?? []).some((x) => x.uid === p.uid))
            .map((p) => {
              const b = getPlayerBase(p.baseId)
              return { baseId: b.id, name: b.name, position: b.position, element: b.element, level: p.level, rarity: rarityOf(p) }
            })}
        />
      </div>

      {/* Ficha del jugador tocado (tuyo o rival), con comparador. */}
      {inspect && !compare && (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={() => setInspect(null)}>
          <div className="relative w-full max-w-xs rounded-3xl border border-slate-700 bg-slate-900 p-4 animate-pop-in" onClick={(e) => e.stopPropagation()}>
            {/* X arriba, como todo lo informativo: el botón de abajo estorbaba. */}
            <button
              onClick={() => setInspect(null)}
              className="absolute top-2 right-2 grid place-items-center w-7 h-7 rounded-lg border border-slate-700 bg-slate-800/70 text-slate-400 active:scale-95"
            >
              <Icon name="x" className="w-4 h-4" />
            </button>
            <InspectCard block={inspect} />
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" full onClick={() => { if (Date.now() - inspectAt.current > 350) setCompare(inspect) }}>
                <span className="inline-flex items-center justify-center gap-1.5">
                  <Icon name="scales" className="w-4 h-4" /> Comparar
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}
      {compare && <CompareSheet a={compare} onClose={() => { setCompare(null); setInspect(null) }} />}
      <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-3 safe-bottom flex flex-col gap-2">
        {err && <div className="text-[11px] text-rose-300 text-center">{err}</div>}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => goTo('squad')}>Gestionar</Button>
          <Button variant="primary" full disabled={!!err} onClick={confirmMatch}>¡Saltar al campo!</Button>
        </div>
        {/* Sin «volver al cuadro»: entrar en la casilla es comprometerse. */}
      </div>
    </div>
  )
}

/** Ficha compacta de un jugador CUALQUIERA (tuyo o rival) con sus atributos. */
function InspectCard({ block }: { block: CompareBlock }) {
  const info = ELEMENT_INFO[block.element]
  return (
    <div className="rounded-2xl p-2" style={rarityCardStyle(block.rarity)}>
      <div className="flex items-center gap-2.5">
        <span className="w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 bg-slate-800" style={{ borderColor: rarityBorder(block.rarity) }}>
          <ImgFallback
            src={portraitUrl(block.baseId)}
            className="w-full h-full object-cover object-top"
            alt={block.name}
            fallback={<span className="grid place-items-center w-full h-full text-base font-extrabold" style={{ color: info.color }}>
              {block.name.slice(0, 2).toUpperCase()}
            </span>}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-sm truncate">{block.name}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            {block.position} · Nv.{block.level}
            <ElementIcon element={block.element} className="w-3 h-3" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color: rarityBorder(block.rarity) }}>
              {RARITY_LABEL[block.rarity]}
            </span>
          </div>
        </div>
      </div>
      {/* Sus depósitos, si se conocen: con qué llega al duelo. */}
      {block.pt != null && block.ptMax != null && (
        <div className="mt-2 flex flex-col gap-0.5">
          <Meter value={block.pt} max={block.ptMax} color="#38bdf8" label="PT" />
          {block.stamina != null && (
            <Meter value={block.stamina} max={100} color={staminaColor(block.stamina)} label="AGU" />
          )}
        </div>
      )}
      <div className="mt-2.5">
        <StatGrid stats={block.stats} />
      </div>
      {/* Las técnicas que puede USAR, con su clase y coste. */}
      {(block.techniques?.length ?? 0) > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {block.techniques!.map((id) => {
            const t = getTechnique(id)
            if (!t) return null
            const ti = ELEMENT_INFO[t.element]
            return (
              <span
                key={id}
                onClick={() => useTechSheet.getState().open(t)}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold border cursor-pointer active:scale-95 transition"
                style={{ color: ti.color, borderColor: `${ti.color}55`, background: `${ti.color}14` }}
              >
                <TechIcons tech={t} className="w-2.5 h-2.5" />
                {t.name} <span className="opacity-60">{t.power} pot. · {t.cost} PT</span>
                {/* POTENCIA REAL también en los rivales: sus stats × técnica. */}
                <span className="inline-flex items-center gap-0.5 font-extrabold text-emerald-300">
                  <Icon name="swords" className="w-2.5 h-2.5" /> {(() => {
                    const st = block.stats
                    const stat = t.kind === 'tiro' ? st.tiro
                      : t.kind === 'parada' ? st.defensa
                        : t.kind === 'regate' ? st.control * 0.6 + st.fisico * 0.4
                          : st.defensa * 0.7 + st.fisico * 0.3
                    return Math.round(stat * (1 + (t.power / 100) * 1.5))
                  })()}
                </span>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}


function MatchupHint({ teamElement, lineup }: { teamElement: keyof typeof ELEMENT_INFO; lineup: PlayerInstance[] }) {
  const good = lineup.filter((p) => elementMultiplier(getPlayerBase(p.baseId).element, teamElement) > 1).length
  const bad = lineup.filter((p) => elementMultiplier(getPlayerBase(p.baseId).element, teamElement) < 1).length
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-[11px] text-slate-300">
      <b>{good}</b> de tus titulares tienen ventaja elemental y <b>{bad}</b> la tienen en contra.
      {bad > good && <span className="text-amber-300"> Cámbialos en el vestuario si puedes.</span>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vestuario (plantilla)
// ---------------------------------------------------------------------------

export function SquadView() {
  const {
    save, toggleStarter, goTo, equip, useConsumable, release,
    pendingTarget, applyToPlayer, cancelTarget, swapPlayers, placeAt, armTactic,
  } = useInazuma()
  const [detail, setDetail] = useState<string | null>(null)
  const [tab, setTab] = useState<'campo' | 'lista'>('campo')
  // Modo MOVER: el jugador elegido en su ficha espera un destino en el campo.
  const [moveFor, setMoveFor] = useState<string | null>(null)
  if (!save) return null

  const starters = save.lineup
    .map((u) => save.roster.find((p) => p.uid === u))
    .filter((p): p is PlayerInstance => !!p)
  const bench = save.roster.filter((p) => !save.lineup.includes(p.uid))
  const err = lineupError(save.roster, save.lineup, save.formation)
  const target = pendingTarget

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SaveHeader save={save} />
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-4 pb-6 flex flex-col gap-2">
        {target && (
          <div className="rounded-xl border border-amber-500/50 bg-amber-500/15 px-3 py-2 text-[12px] text-amber-100">
            <b>{target.title}</b> — elige a quién aplicárselo.
            <button className="ml-2 underline text-amber-300" onClick={cancelTarget}>cancelar</button>
          </div>
        )}

        <FormationPicker />

        {/* Campo o lista. El campo es la vista natural; la lista sigue ahí para
            equipar, traspasar y ver detalles con más sitio. */}
        <div className="flex gap-1.5">
          {(['campo', 'lista'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-xl border py-1.5 text-[12px] font-bold transition active:scale-95 ${
                tab === t ? 'border-amber-500/70 bg-amber-500/15 text-amber-200' : 'border-slate-700 bg-slate-800/60 text-slate-400'
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon name={t === 'campo' ? 'ball' : 'clipboard'} className="w-4 h-4" />
                {t === 'campo' ? 'Alineación' : 'Lista'}
              </span>
            </button>
          ))}
        </div>

        {err && <div className="text-[11px] text-rose-300">{err}</div>}

        {/* FILOSOFÍAS: aquí se ARMA la que llevas al partido. La armada se
            ENCIENDE durante el juego cuando su barra se llena. PLEGABLE: el
            vestuario estaba
            creciendo y estas secciones se consultan, no se miran siempre. */}
        {!!(save.tactics ?? []).length && (
          <Foldout
            icon={<Icon name="flame" className="w-3.5 h-3.5 text-amber-300" />}
            title="Táctica especial"
            summary={getTactic(save.armedTactic ?? save.tactics![0])?.name ?? '—'}
          >
          <div className="rounded-b-2xl border-x border-b border-slate-700 bg-slate-800/50 p-2.5">
            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">
              Toca una para ARMARLA
            </div>
            <div className="flex flex-col gap-1.5">
              {(save.tactics ?? []).map((id) => {
                const t = getTactic(id)
                if (!t) return null
                const armed = (save.armedTactic ?? save.tactics?.[0]) === id
                const lines = tacticEffectLines(t)
                const hint = tacticFitsHint(t)
                return (
                  <button
                    key={id}
                    onClick={() => armTactic(id)}
                    className={`rounded-xl border p-2 text-left transition active:scale-[0.99] ${
                      armed ? 'ring-1' : 'opacity-55 grayscale'
                    }`}
                    style={{ borderColor: `${t.color}66`, background: `${t.color}12`, ...(armed ? { boxShadow: `0 0 12px ${t.color}44` } : {}) }}
                  >
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide" style={{ color: t.color }}>
                      <Icon name={t.icon} className="w-3.5 h-3.5" />
                      {t.name}
                      {armed && <span className="rounded-full bg-slate-950/70 border px-1.5 text-[8px]" style={{ borderColor: `${t.color}66` }}>ARMADA</span>}
                    </span>
                    {/* QUÉ HACE, línea a línea — antes solo se veía el nombre. */}
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {lines.map((l, i) => (
                        <li key={i} className="text-[10px] text-slate-300 leading-snug flex gap-1">
                          <span style={{ color: t.color }}>›</span>{l}
                        </li>
                      ))}
                    </ul>
                    {hint && <p className="mt-0.5 text-[9px] text-slate-500 italic">{hint}</p>}
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-slate-500 mt-1 leading-snug">
              La ARMADA se enciende en pleno partido: cuando su barra llega a
              100, en tu siguiente jugada clave te sale el botón para encenderla.
              Las nuevas se COMPRAN en la tienda — ya no se regalan.
            </p>
          </div>
          </Foldout>
        )}

        <ComboPartnersCard />

        {tab === 'campo' && (
          <PitchView
            save={save}
            onSwap={swapPlayers}
            onPlace={placeAt}
            onTap={(uid) => (target ? applyToPlayer(uid) : setDetail(uid))}
            selected={moveFor}
            onSelectDone={() => setMoveFor(null)}
          />
        )}

        {tab === 'lista' && <>
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-widest text-slate-500">Once titular · {starters.length}/11</span>
          {err && <span className="text-[10px] text-rose-300">{err}</span>}
        </div>
        {/* El botón de rotación va COMO HERMANO de la fila, no dentro: la fila
            ya es un <button> y anidarlos es HTML inválido. */}
        <div className="flex flex-col gap-1.5">
          {starters.map((p) => (
            <div key={p.uid} className="flex items-stretch gap-1.5">
              <PlayerRow
                player={p}
                className="flex-1 min-w-0"
                onClick={() => (target ? applyToPlayer(p.uid) : setDetail(p.uid))}
              />
              <button
                onClick={() => toggleStarter(p.uid)}
                className="shrink-0 w-16 rounded-xl border border-slate-600 bg-slate-800/50 text-[10px] text-slate-400 active:scale-95 transition"
              >
                banquillo
              </button>
            </div>
          ))}
        </div>

        <div className="text-[11px] uppercase tracking-widest text-slate-500 mt-2">
          Banquillo · {bench.length} (máx. {ROSTER_MAX} en plantilla)
        </div>
        <p className="text-[10px] text-slate-600 -mt-1">
          Los suplentes suben de nivel igual que los titulares y llegan <b>frescos</b>: rotar no te penaliza.
        </p>
        <div className="flex flex-col gap-1.5">
          {bench.map((p) => (
            <div key={p.uid} className="flex items-stretch gap-1.5">
              <PlayerRow
                player={p}
                dimmed
                className="flex-1 min-w-0"
                onClick={() => (target ? applyToPlayer(p.uid) : setDetail(p.uid))}
              />
              <button
                onClick={() => toggleStarter(p.uid)}
                className="shrink-0 w-16 rounded-xl border border-emerald-600/60 bg-emerald-500/10 text-[10px] text-emerald-300 active:scale-95 transition"
              >
                al once
              </button>
            </div>
          ))}
          {!bench.length && <div className="text-[11px] text-slate-600">Sin suplentes. Ficha en el ojeador.</div>}
        </div>

        </>}

        <BagPanel save={save} onUse={useConsumable} onEquip={equip} />
      </div>

      <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-2 safe-bottom flex gap-2">
        <Button variant="secondary" onClick={() => goTo('stats')}>
          <span className="inline-flex items-center gap-1.5"><Icon name="chartUp" className="w-4 h-4" /> Stats</span>
        </Button>
        <Button variant="primary" full onClick={() => goTo('map')}>Listo</Button>
      </div>

      {detail && (
        <PlayerDetail
          player={save.roster.find((p) => p.uid === detail)!}
          bag={save.bag}
          onClose={() => setDetail(null)}
          onEquip={(item) => equip(detail, item)}
          blocked={save.roster.length <= SQUAD_SIZE}
          onRelease={() => { release(detail); setDetail(null) }}
        />
      )}
    </div>
  )
}

/**
 * Manuales de supertécnica a la venta. Van a la MOCHILA, no a un jugador: se
 * enseñan luego a quien encaje por demarcación y elemento.
 */
// (La venta de supertécnicas sueltas se retiró: la cadena manda.)

/** Selector de formación. Cambia el once y las líneas que exige el motor. */
function FormationPicker() {
  const { save, setFormation } = useInazuma()
  if (!save) return null
  const current = getFormation(save.formation)
  return (
    <div>
      <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-1.5">Formación</div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {FORMATIONS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFormation(f.id)}
            className={`shrink-0 rounded-xl border px-3 py-1.5 text-[12px] font-bold transition active:scale-95 ${
              f.id === current.id
                ? 'border-amber-500/70 bg-amber-500/15 text-amber-200'
                : 'border-slate-700 bg-slate-800/60 text-slate-400'
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-slate-500 mt-1">{current.desc}</p>
    </div>
  )
}

/**
 * Tira compacta de BANQUILLO para la previa. Cada suplente enseña LO MISMO que
 * un titular del tablero: retrato con su rareza, nombre, demarcación, tipo
 * elemental y nivel — sin eso no había forma de saber a quién tienes en
 * reserva sin entrar a la ficha.
 */
function BenchStrip({ players }: {
  players: { baseId: string; name: string; position: string; element: InazumaElement; level: number; rarity: number }[]
}) {
  if (!players.length) return null
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-widest text-slate-600 mb-1">Banquillo</div>
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {players.map((p) => {
          const info = ELEMENT_INFO[p.element]
          return (
            <div key={p.baseId} className="shrink-0 w-[50px] flex flex-col items-center">
              <div
                className={`relative w-9 h-9 rounded-lg overflow-hidden grid place-items-center bg-slate-800 ${p.rarity === 4 ? '' : 'border-2'}`}
                style={p.rarity === 4 ? undefined : { borderColor: rarityBorder(p.rarity) }}
              >
                <ImgFallback
                  src={portraitUrl(p.baseId)}
                  className="w-full h-full object-cover object-top"
                  alt={p.name}
                  fallback={<span className="text-[9px] font-extrabold">{p.name.slice(0, 2).toUpperCase()}</span>}
                />
                {p.rarity === 4 && <span className="mc-ring rounded-lg" />}
              </div>
              <span className="text-[8px] text-slate-300 truncate w-full text-center leading-tight mt-0.5">{p.name.split(' ')[0]}</span>
              <div className="flex items-center justify-center gap-0.5 text-[7px] leading-none text-slate-400">
                <span className="font-extrabold text-slate-300">{p.position}</span>
                <Icon name={ELEMENT_ICON[p.element]} className="w-2 h-2" style={{ color: info.color }} />
                Nv.{p.level}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BagPanel({
  save, onUse, onEquip,
}: {
  save: InazumaSave
  onUse: (itemId: string, uid: string, choiceId?: string) => void
  onEquip: (uid: string, itemId: string | undefined) => void
}) {
  const [use, setUse] = useState<string | null>(null)
  // Mejora con varias técnicas mejorables: segundo paso, elegir CUÁL.
  const [mejoraFor, setMejoraFor] = useState<string | null>(null)
  if (!save.bag.length) return null
  return (
    <>
      {/* La mochila EN DOS ESTANTES: lo que se USA (consumibles) y lo que se
          EQUIPA — mezclados no se distinguía qué era cada cosa. Con IMAGEN y
          QUÉ HACE; duplicados agrupados con ×N. */}
      {(() => {
        const grouped = [...new Map(save.bag.map((id) => [id, save.bag.filter((x) => x === id).length]))]
          .map(([id, count]) => ({ id, count, item: getItem(id) }))
          .filter((x): x is { id: string; count: number; item: NonNullable<ReturnType<typeof getItem>> } => !!x.item)
        const equipables = grouped.filter(({ item }) => item.kind === 'equipo' || item.kind === 'raro')
        const consumibles = grouped.filter(({ item }) => item.kind !== 'equipo' && item.kind !== 'raro')
        const fila = ({ id, count, item }: (typeof grouped)[number]) => (
          <button
            key={id}
            // El FICHAJE ESTRELLA no se «da a un jugador»: abre su buscador de
            // catálogo en la mochila completa (aquí salía tu propia plantilla).
            onClick={() => {
              if (id === 'fichaje-estrella') {
                useInazuma.setState({ fichajeAutoOpen: true })
                useInazuma.getState().goTo('bag')
                return
              }
              setUse(id)
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-2 py-1.5 text-left active:scale-[0.99] transition"
          >
            <ItemIcon itemId={id} className="w-6 h-6 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-bold">
                {item.name}
                {count > 1 && <span className="ml-1.5 text-[11px] font-extrabold text-amber-300">×{count}</span>}
              </span>
              <span className="block text-[10px] text-slate-400 leading-snug">{item.desc}</span>
            </span>
            <span className="shrink-0 text-[10px] font-bold text-emerald-300">
              {item.kind === 'equipo' || item.kind === 'raro' ? 'Equipar ›' : 'Usar ›'}
            </span>
          </button>
        )
        return (
          <>
            {consumibles.length > 0 && (
              <>
                <div className="text-[11px] uppercase tracking-widest text-slate-500 mt-2">Mochila · Consumibles</div>
                <div className="flex flex-col gap-1.5">{consumibles.map(fila)}</div>
              </>
            )}
            {equipables.length > 0 && (
              <>
                <div className="text-[11px] uppercase tracking-widest text-slate-500 mt-2">Mochila · Equipables</div>
                <div className="flex flex-col gap-1.5">{equipables.map(fila)}</div>
              </>
            )}
          </>
        )
      })()}
      {use && (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={() => { setUse(null); setMejoraFor(null) }}>
          <div className="relative w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-4 max-h-[82svh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => { setUse(null); setMejoraFor(null) }}
              className="absolute top-2 right-2 z-10 grid place-items-center w-7 h-7 rounded-lg border border-slate-700 bg-slate-800/70 text-slate-400 active:scale-95"
            >
              <Icon name="x" className="w-4 h-4" />
            </button>
            {mejoraFor ? (() => {
              const p = save.roster.find((x) => x.uid === mejoraFor)
              if (!p) return null
              const ups = p.techniques.filter((t) => canUpgradeTechnique(p, t))
              return (
                <>
                  <div className="font-extrabold text-center">¿Qué técnica mejora?</div>
                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-1.5 mt-2">
                    {ups.map((id) => {
                      const t = getTechnique(id)
                      if (!t) return null
                      return (
                        <button
                          key={id}
                          onClick={() => { onUse('mejora', p.uid, id); setMejoraFor(null); setUse(null) }}
                          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-2 py-1.5 text-left active:scale-[0.98] transition"
                        >
                          <TechniqueBadge tech={t} size={36} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-bold">{t.name}</span>
                            <span className="block text-[10px] text-slate-400">V{techLevel(p, id) + 1} → V{techLevel(p, id) + 2}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )
            })() : (
              <>
                <div className="font-extrabold text-center">{getItem(use)?.name}</div>
                <p className="text-[11px] text-slate-400 text-center mb-2">{getItem(use)?.desc}</p>
                <div className="text-[11px] text-slate-500 mb-1">¿A quién?</div>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-1.5">
                  {save.roster.map((p) => (
                    <PlayerRow
                      key={p.uid}
                      player={p}
                      // Su objeto actual a la vista (y con la medalla, la
                      // rareza actual → siguiente y el coste explicado).
                      right={use === 'medalla-rareza'
                        ? <MedalHint player={p} have={save.bag.filter((x) => x === 'medalla-rareza').length} />
                        : p.item ? <ItemIcon itemId={p.item} className="w-4 h-4 opacity-80" /> : undefined}
                      onClick={() => {
                        const k = getItem(use)?.kind
                        if (k === 'equipo' || k === 'raro') { onEquip(p.uid, use); setUse(null); return }
                        if (use === 'mejora' && p.techniques.filter((t) => canUpgradeTechnique(p, t)).length >= 1) {
                          setMejoraFor(p.uid)
                          return
                        }
                        onUse(use, p.uid)
                        // ABIERTO mientras queden unidades: dar tres pociones
                        // seguidas ya no exige tres viajes por el menú.
                        if (save.bag.filter((x) => x === use).length <= 1) setUse(null)
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function PlayerDetail({
  player, bag, blocked, onClose, onEquip, onRelease,
}: {
  player: PlayerInstance
  bag: string[]
  /** true si la plantilla está en el mínimo y no se puede traspasar a nadie. */
  blocked?: boolean
  onClose: () => void
  onEquip: (itemId: string | undefined) => void
  onRelease: () => void
}) {
  const base = getPlayerBase(player.baseId)
  // Los RAROS también se equipan: son la versión cara del equipamiento, y
  // dejarlos fuera del filtro los convertía en pisapapeles.
  const gear = bag.filter((id) => { const k = getItem(id)?.kind; return k === 'equipo' || k === 'raro' })
  const fee = transferValue(base, player.level)
  const [confirmSale, setConfirmSale] = useState(false)
  const [compareWith, setCompareWith] = useState<CompareBlock | null>(null)
  // El segundo tap de un DOBLE TOQUE sobre la lista caía en «Comparar» de la
  // ficha recién abierta y comparaba sin querer: los primeros 350 ms no valen.
  const openedAt = useRef(Date.now())
  return (
    <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-3 max-h-[86svh] overflow-y-auto overscroll-contain" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 grid place-items-center w-7 h-7 rounded-lg border border-slate-700 bg-slate-800/70 text-slate-400 active:scale-95"
        >
          <Icon name="x" className="w-4 h-4" />
        </button>
        <PlayerCard player={player} />

        {/* EL VÍNCULO del inicial: el cariño, con número. Crece +1 % a todo
            por partido jugado (tope 15). Solo lo tiene tu primer fichaje. */}
        {player.bond != null && (
          <div className="mt-2 flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5">
            <Icon name="flame" className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="text-[11px] text-amber-200 font-bold">
              Vínculo del inicial: +{player.bond}% a todo
            </span>
            <span className="ml-auto text-[9px] text-amber-300/70">{player.bond >= 15 ? 'MÁXIMO' : '+1% por partido'}</span>
          </div>
        )}

        {/* SUPERTÉCNICAS: una sola lista con su CADENA entera. Las que ya
            tiene, con su potencia y coste reales; y a continuación las que le
            quedan, con lo que le falta para despertarlas (nivel y rareza).
            Antes eran dos apartados que decían casi lo mismo, y encima con
            una parrafada explicando PT y aguante que ya nos sabemos. */}
        <div className="mt-3 text-[11px] uppercase tracking-widest text-slate-500">Cadena de supertécnicas</div>
        <div className="mt-1">
          {/* UN solo formato de cadena en todo el modo (ver SignatureChain). */}
          <SignatureChain baseId={player.baseId} player={player} />
          {/* Lo aprendido FUERA de la cadena (manuales, regalos del mapa). */}
          {(() => {
            const chain = getPlayerBase(player.baseId).signature ?? []
            const extras = player.techniques.filter((id) => !chain.includes(id))
            if (!extras.length) return null
            return (
              <>
                <div className="mt-1.5 text-[9px] uppercase tracking-widest text-slate-600">Aprendidas fuera de la cadena</div>
                <div className="flex flex-col gap-1 mt-1">
                  {extras.map((id) => {
                    const t = getTechnique(id)
                    if (!t) return null
                    const info = ELEMENT_INFO[t.element]
                    return (
                      <div
                        key={id}
                        onClick={() => useTechSheet.getState().open(t, player)}
                        className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-1.5 cursor-pointer active:scale-[0.99] transition"
                      >
                        <TechniqueBadge tech={t} size={30} holder={player} />
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <TechIcons tech={t} className="w-3.5 h-3.5" />
                          <span className="font-bold text-[12px]" style={{ color: info.color }}>
                            {t.name}
                            {techLevel(player, id) > 0 && <span className="ml-1 text-amber-300">V{techLevel(player, id) + 1}</span>}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {techniquePower(player, t)} pot. · {techniqueCostFor(player, t)} PT
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-emerald-300">
                            <Icon name="swords" className="w-2.5 h-2.5" /> {realTechniquePower(player, t)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>

        <div className="mt-3 text-[11px] uppercase tracking-widest text-slate-500">Equipamiento</div>
        {/* Con icono y QUÉ HACE cada pieza, al estilo PokéRogue: lo puesto se
            ve (y se quita con un toque), y lo de la mochila se equipa igual. */}
        <div className="flex flex-col gap-1.5 mt-1">
          {player.item && (
            <button
              onClick={() => onEquip(undefined)}
              className="flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 px-2 py-1.5 text-left active:scale-[0.99] transition"
            >
              <ItemIcon itemId={player.item} className="w-6 h-6 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-bold text-amber-200">{getItem(player.item)?.name} · puesto</span>
                <span className="block text-[10px] text-slate-400 leading-snug">{getItem(player.item)?.desc}</span>
              </span>
              <span className="shrink-0 text-[10px] font-bold text-rose-300">Quitar ✕</span>
            </button>
          )}
          {gear.map((id, i) => (
            <button
              key={`${id}-${i}`}
              onClick={() => onEquip(id)}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-2 py-1.5 text-left active:scale-[0.99] transition"
            >
              <ItemIcon itemId={id} className="w-6 h-6 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-bold">{getItem(id)?.name}</span>
                <span className="block text-[10px] text-slate-400 leading-snug">{getItem(id)?.desc}</span>
              </span>
              <span className="shrink-0 text-[10px] font-bold text-emerald-300">Equipar ›</span>
            </button>
          ))}
          {!gear.length && !player.item && <span className="text-[11px] text-slate-600">Nada en la mochila.</span>}
        </div>

        {/* Rotar desde AQUÍ: la ficha se abre igual desde la lista y desde el
            campo, así que las dos vistas hacen exactamente lo mismo. */}
        {/* Mover y rotar se hacen con drag&drop en el campo: aquí solo
            queda lo que NO se puede arrastrar (comparar y vender). */}
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" full onClick={() => { if (Date.now() - openedAt.current <= 350) return; setCompareWith({
            name: base.name,
            baseId: base.id,
            position: base.position,
            element: base.element,
            level: player.level,
            rarity: rarityOf(player),
            stats: effectiveStats(player),
          }) }}>
            <span className="inline-flex items-center justify-center gap-1.5">
              <Icon name="scales" className="w-4 h-4" /> Comparar
            </span>
          </Button>
        </div>
        {compareWith && <CompareSheet a={compareWith} onClose={() => setCompareWith(null)} />}

        <div className="mt-2 flex gap-2">
          {/* Vender pide CONFIRMACIÓN: es irreversible. Se ve QUÉ te llevas:
              el importe y la Medalla de talento. */}
          {!blocked && !confirmSale && (
            <Button variant="danger" full onClick={() => setConfirmSale(true)}>
              <span className="inline-flex items-center justify-center gap-1.5">
                Vender · <CoinPrice amount={fee} coin="w-3 h-3" /> + {rarityOf(player)}×
                <ItemIcon itemId="medalla-rareza" className="w-4 h-4" />
              </span>
            </Button>
          )}
        </div>
        {confirmSale && (
          <div className="mt-2 rounded-xl border border-rose-600/60 bg-rose-500/10 p-3">
            <p className="text-[12px] text-rose-200 mb-2">
              ¿Seguro? {base.name} se va para siempre. Te llevas{' '}
              <b><CoinPrice amount={fee} coin="w-3 h-3" /></b> y{' '}
              <b className="inline-flex items-center gap-1">
                {rarityOf(player)}× <ItemIcon itemId="medalla-rareza" className="w-3.5 h-3.5" /> Medalla de talento
              </b>{' '}(una por rareza).
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" full onClick={() => setConfirmSale(false)}>Se queda</Button>
              <Button variant="danger" full onClick={onRelease}>Vender</Button>
            </div>
          </div>
        )}

        {/* `getTeam` LANZA con un id desconocido, así que aquí se consulta el
            mapa directamente: una ficha de jugador no debe poder tumbar la UI. */}
        <div className="text-[10px] text-slate-600 text-center mt-1 flex items-center justify-center gap-1">
          {base.team === 'libre'
            ? 'Agente libre'
            : (
              <>
                <Crest teamId={base.team} className="w-3.5 h-3.5" />
                Fichado del {TEAM_BY_ID.get(base.team)?.name ?? TEAM_NAMES[base.team] ?? base.team}
              </>
            )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tienda
// ---------------------------------------------------------------------------

export function ShopView() {
  const { save, buy, buyTactic, goTo, matchNode } = useInazuma()
  if (!save) return null
  const isRaiRai = matchNode?.kind === 'rairai'
  const progress = bossIndexForLayer(save.layer)
  const stock = stockFor(isRaiRai ? 'rairai' : 'tienda', progress)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SaveHeader save={save} />

      <div className="shrink-0 px-3 pt-3">
        <div
          className="rounded-2xl border p-3"
          style={{
            borderColor: isRaiRai ? '#f472b666' : '#fcd34d66',
            background: isRaiRai
              ? 'linear-gradient(130deg,#f472b622,rgba(15,23,42,.9) 60%)'
              : 'linear-gradient(130deg,#fcd34d22,rgba(15,23,42,.9) 60%)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <Icon name={isRaiRai ? 'ramen' : 'cart'} className="w-8 h-8" style={{ color: isRaiRai ? '#f472b6' : '#fcd34d' }} />
            <div className="min-w-0">
              <div className="font-extrabold text-base leading-tight">
                {isRaiRai ? 'Restaurante Rai Rai' : 'Tienda de deportes'}
              </div>
              <div className="text-[11px] text-slate-400">
                {isRaiRai
                  ? 'La plantilla ya ha comido: aguante y PT al máximo. ¿Algo para llevar?'
                  : 'Equipamiento, brebajes y manuales. El material bueno se paga.'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-4 pb-6 flex flex-col gap-2">
        {/* Las supertécnicas sueltas ya no se venden: cada jugador aprende
            las de SU cadena. La Mejora y el Manual avanzado siguen en stock. */}

        {/* TÁCTICAS ESPECIALES en venta: empiezas con la canónica de tu club
            y las demás se compran aquí (ya no se regalan al ganar). Rotan
            con el avance: dos por visita, sin repetir las que ya tienes. */}
        {!isRaiRai && (() => {
          const owned = new Set(save.tactics ?? [])
          const pool = TACTICS.filter((t) => !owned.has(t.id))
          const enVenta = pool.length <= 2 ? pool : [0, 1].map((i) => pool[(save.layer + i * 3) % pool.length])
            .filter((t, i, a) => a.indexOf(t) === i)
          if (!enVenta.length) return null
          return (
            <>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">Tácticas especiales</div>
              {enVenta.map((t) => {
                const afford = save.coins >= TACTIC_PRICE
                return (
                  <Card key={t.id} className={`p-3 ${afford ? '' : 'opacity-50'}`} onClick={afford ? () => buyTactic(t.id) : undefined}>
                    <div className="flex items-center gap-2.5">
                      <span className="grid place-items-center w-8 h-8 shrink-0 rounded-lg border" style={{ borderColor: `${t.color}88`, background: `${t.color}1a` }}>
                        <Icon name={t.icon} className="w-4.5 h-4.5" style={{ color: t.color }} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm" style={{ color: t.color }}>{t.name}</div>
                        <div className="text-[11px] text-slate-400">{t.desc}</div>
                      </div>
                      <span className="text-sm font-extrabold text-amber-300 tabular-nums shrink-0">
                        <CoinPrice amount={TACTIC_PRICE} />
                      </span>
                    </div>
                  </Card>
                )
              })}
              <div className="h-1" />
            </>
          )
        })()}

        {!isRaiRai && progress < 7 && (
          <p className="text-[10px] text-slate-600">
            El escaparate crece con cada instituto que tumbas: el material caro llega más adelante.
          </p>
        )}

        {stock.map((item) => {
          const afford = save.coins >= item.price
          // CUÁNTOS tienes ya (mochila + equipados): para saber si merece la
          // pena comprar más — comprabas a ciegas.
          const owned = save.bag.filter((x) => x === item.id).length
            + save.roster.filter((p) => p.item === item.id).length
          return (
            <Card key={item.id} className={`p-3 ${afford ? '' : 'opacity-50'}`} onClick={afford ? () => buy(item.id) : undefined}>
              <div className="flex items-center gap-2.5">
                <ItemIcon itemId={item.id} className="w-6 h-6 shrink-0 text-slate-300" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm">
                    {item.name}
                    {owned > 0 && (
                      <span className="ml-1.5 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-300 align-middle">
                        tienes ×{owned}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">{item.desc}</div>
                </div>
                <span className="text-sm font-extrabold text-amber-300 tabular-nums shrink-0">
                  <CoinPrice amount={item.price} />
                </span>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-2 safe-bottom flex gap-2">
        <Button variant="secondary" onClick={() => goTo('squad')}>Gestionar</Button>
        <Button variant="primary" full onClick={() => goTo('map')}>
          {isRaiRai ? 'Salir del Rai Rai' : 'Salir de la tienda'}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cartas de recompensa
// ---------------------------------------------------------------------------

export function DraftView() {
  const { save, draft, draftPicks, draftFromMatch, pickDraft } = useInazuma()
  // Comparar un FICHAJE con tu gente ANTES de decidir (sin fichar por ello).
  const [compareWith, setCompareWith] = useState<CompareBlock | null>(null)
  if (!save) return null
  // El marcador SOLO cuando el draft viene de un partido: en la casilla de
  // objeto salía el resultado del último partido, que no pintaba nada allí.
  const last = draftFromMatch ? save.lastMatch : null

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SaveHeader save={save} />
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-4 pb-6 flex flex-col gap-3">
        {last && (
          <div className={`rounded-2xl border p-3 text-center ${
            last.result === 'win' ? 'border-emerald-500/50 bg-emerald-500/10'
              : last.result === 'draw' ? 'border-amber-500/50 bg-amber-500/10'
                : 'border-rose-500/50 bg-rose-500/10'
          }`}>
            <div className="text-[11px] uppercase tracking-widest text-slate-400">vs {last.rival}</div>
            <div className="text-3xl font-extrabold tabular-nums">{last.score[0]} – {last.score[1]}</div>
            {last.scorers.length > 0 && (
              <div className="text-[11px] text-slate-300 mt-1 flex items-center justify-center gap-1">
                <Icon name="ball" className="w-3.5 h-3.5" />
                {last.scorers.join(', ')}
              </div>
            )}
          </div>
        )}
        <div className="text-[11px] uppercase tracking-widest text-slate-500">
          {draft.some((o) => o.kind === 'tactica')
            ? 'La táctica especial del equipo · elige una para el resto de la partida'
            : `Elige tu recompensa${draftPicks > 1 ? ` · te quedan ${draftPicks}` : ''}`}
        </div>
        {draft.some((o) => o.kind === 'tactica') && (
          <p className="text-[11px] text-slate-400 leading-snug -mt-1">
            Las tácticas especiales NO dan números a jugadores: cambian CÓMO se
            resuelve el partido (contraataques, bloqueos, coste de PT…). Las
            llevas a la vista bajo el marcador — tócalas ahí para releer qué
            hace cada una. El rival también juega con la suya.
          </p>
        )}
        {draft.map((o) => (
          // Las cartas de FICHAJE ya no fichan al tocarlas (demasiados
          // fichajes sin querer): tienen su botón «Fichar». Las demás
          // (objeto, dinero, técnica…) siguen eligiéndose con el toque.
          <Card key={o.id} className="p-3" onClick={o.kind === 'fichaje' ? undefined : () => pickDraft(o.id)}>
            <div className="flex items-center gap-2.5">
              {o.kind === 'fichaje' ? (
                <div className="w-11 h-11 shrink-0 rounded-lg overflow-hidden border border-slate-600 grid place-items-center bg-slate-800">
                  <ImgFallback
                    src={portraitUrl(o.playerId)}
                    className="w-full h-full object-cover object-top"
                    fallback={<Icon name="jersey" className="w-6 h-6 text-slate-400" />}
                  />
                </div>
              ) : o.kind === 'tactica' ? (
                <span
                  className="grid place-items-center w-11 h-11 shrink-0 rounded-xl border-2"
                  style={{
                    borderColor: getTactic(o.tacticId)?.color ?? '#64748b',
                    background: `${getTactic(o.tacticId)?.color ?? '#64748b'}22`,
                  }}
                >
                  <Icon
                    name={getTactic(o.tacticId)?.icon ?? 'bolt'}
                    className="w-6 h-6"
                    style={{ color: getTactic(o.tacticId)?.color }}
                  />
                </span>
              ) : o.kind === 'objeto' ? (
                <ItemIcon itemId={o.itemId} className="w-9 h-9 shrink-0" />
              ) : o.kind === 'tecnica' && getTechnique(o.techniqueId) ? (
                <TechniqueBadge tech={getTechnique(o.techniqueId)!} size={40} />
              ) : (
                <Icon
                  name={o.kind === 'entrenamiento' ? 'dumbbell' : o.kind === 'dinero' ? 'coin' : 'bench'}
                  className="w-7 h-7 shrink-0 text-amber-300"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-sm"><CoinText text={o.title} /></div>
                {/* En los fichajes: llega en NORMAL (la rareza la subes tú) y
                    su elemento, antes de decidir. */}
                {o.kind === 'fichaje' && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest" style={{ color: rarityBorder(1) }}>
                      {RARITY_LABEL[1]}
                    </span>
                    <ElementChip element={getPlayerBase(o.playerId).element} />
                  </div>
                )}
                <div className="text-[11px] text-slate-400"><CoinText text={o.desc} coin="w-3 h-3" /></div>
              </div>
              {/* Cartas de PAGO: el precio a la vista, y en rojo si no llega. */}
              {o.kind === 'objeto' && o.cost ? (
                <span
                  className={`shrink-0 text-[11px] font-extrabold tabular-nums px-2 py-0.5 rounded-full border ${
                    save.coins >= o.cost
                      ? 'text-amber-300 border-amber-400/50 bg-amber-500/10'
                      : 'text-rose-300 border-rose-400/50 bg-rose-500/10'
                  }`}
                >
                  −<CoinPrice amount={o.cost} />
                </span>
              ) : null}
              <Icon name="arrowRight" className="w-4 h-4 text-slate-500 shrink-0" />
            </div>
            {/* Los atributos con los que llegaría, para no fichar a ciegas. */}
            {o.kind === 'fichaje' && (
              <div className="mt-2 flex flex-col gap-1.5">
                <StatGrid stats={scaleStats(getPlayerBase(o.playerId).stats, o.level)} />
                {/* El aguante (fuera del grid) y el depósito de PT que trae. */}
                {(() => {
                  const agu = scaleStats(getPlayerBase(o.playerId).stats, o.level).aguante
                  return (
                    <div className="text-[10px] text-slate-400">
                      Aguante <b className="text-slate-200">{agu}</b> · PT máx ≈ <b className="text-slate-200">{Math.round(28 + agu * 0.7)}</b>
                    </div>
                  )
                })()}
                <SigningExtras baseId={o.playerId} save={save} level={o.level} />
                {/* COMPARAR y FICHAR, cada uno con su botón: la carta ya no
                    ficha al tocarla. */}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    full
                    onClick={() => {
                      const b = getPlayerBase(o.playerId)
                      setCompareWith({
                        name: b.name,
                        baseId: b.id,
                        position: b.position,
                        element: b.element,
                        level: o.level,
                        rarity: 1,
                        stats: scaleStats(b.stats, o.level),
                      })
                    }}
                  >
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <Icon name="scales" className="w-4 h-4" /> Comparar
                    </span>
                  </Button>
                  <Button variant="primary" full onClick={() => pickDraft(o.id)}>
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <Icon name="autograph" className="w-4 h-4" /> Fichar
                    </span>
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
      {compareWith && <CompareSheet a={compareWith} onClose={() => setCompareWith(null)} />}
    </div>
  )
}

/**
 * Lo que un FICHAJE trae bajo el brazo, antes de decidir: su cadena de
 * supertécnicas (con el nivel al que despierta cada paso) y las técnicas
 * COMBINADAS que desbloquearía con gente que ya está en tu plantilla.
 */
function SigningExtras({ baseId, save, level }: { baseId: string; save: InazumaSave; level: number }) {
  const base = getPlayerBase(baseId)
  const chain = base.signature ?? []
  const rosterIds = new Set(save.roster.map((p) => p.baseId))
  const combos = COMBOS.filter((c) => c.members.includes(baseId))
  if (!chain.length && !combos.length) return null

  return (
    <div className="flex flex-col gap-1">
      {chain.length > 0 && (
        <div>
          <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1">Cadena de supertécnicas</div>
          {/* EL MISMO formato de cadena que la ficha del jugador: escalera con
              su estado (los pasos ya paran la burbuja, no fichan sin querer). */}
          <SignatureChain baseId={baseId} level={level} rarity={1} />
        </div>
      )}
      {combos.map((c) => {
        const t = getTechnique(c.techniqueId)
        if (!t) return null
        const mates = c.members.filter((m) => m !== baseId)
        const missing = mates.filter((m) => !rosterIds.has(m))
        const ready = missing.length === 0
        return (
          <div
            key={c.techniqueId}
            // Leer la nota del combo tampoco debe fichar (la carta entera
            // es un botón de fichaje).
            onClick={(e) => e.stopPropagation()}
            className={`rounded-md border px-1.5 py-1 text-[10px] leading-snug ${
              ready ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-800/40 text-slate-400'
            }`}
          >
            <b>{t.name}</b> (combinada {c.label}){' '}
            {ready
              ? '— ¡ya tienes a los demás en plantilla!'
              : `— te falta ${missing.map((m) => getPlayerBase(m).name).join(' y ')}`}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cierre
// ---------------------------------------------------------------------------

export function EndView({ won }: { won: boolean }) {
  const { save, exitInazuma, restartTournament } = useInazuma()
  // Confeti de victoria, autoapagado — el mismo cierre que el modo Pokémon.
  const [confetti, setConfetti] = useState(won)
  const [shared, setShared] = useState<string | null>(null)
  useEffect(() => {
    if (!won) return
    const t = setTimeout(() => setConfetti(false), 4000)
    return () => clearTimeout(t)
  }, [won])
  if (!save) return null
  const teamName = teamDisplay(save).name

  const share = async () => {
    const team = buildLineup(save.roster, save.lineup)?.all ?? []
    const text = `⚡ ¡${teamName} campeón del Football Frontier en Inazuma Rogue!\n`
      + `⚽ ${save.record[0]}V ${save.record[1]}E ${save.record[2]}D · ${save.goalsFor}-${save.goalsAgainst}\n`
      + `🎮 Once: ${team.map((p) => `${getPlayerBase(p.baseId).name.split(' ')[0]} Nv.${p.level}`).join(', ')}\n\n`
      + '¿Puedes superarme? https://miasergi.github.io/pokelink/'
    const r = await shareText(text, 'Inazuma Rogue')
    setShared(r === 'copied' ? '¡Copiado! Pégalo donde quieras' : r === 'shared' ? '¡Compartido!' : 'No se pudo compartir')
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      {confetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10" aria-hidden>
          {Array.from({ length: 26 }).map((_, i) => (
            <Icon
              key={i}
              name={(['trophy', 'star', 'bolt', 'ball'] as const)[i % 4]}
              className="absolute w-5 h-5 text-amber-300 animate-float"
              style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `${(i % 8) * 0.35}s`, opacity: 0.8 }}
            />
          ))}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 safe-top flex flex-col items-center gap-3 text-center">
        <Icon name={won ? 'trophy' : 'sad'} className={`w-16 h-16 mt-4 ${won ? 'text-amber-300' : 'text-slate-400'}`} />
        <h2 className={`text-2xl font-extrabold ${won ? 'text-amber-300' : 'text-slate-300'}`}>
          {won ? '¡CAMPEONES DEL FOOTBALL FRONTIER!' : 'Fin del torneo'}
        </h2>
        <p className="text-sm text-slate-400 max-w-[18rem]">
          {won
            ? `El ${teamName} lo ha conseguido. Nadie apostaba por vosotros.`
            : `El torneo se acaba aquí, en ${layerName(save.layer, save.teamId, save.saga)}. La próxima vez.`}
        </p>
        {/* La plantilla queda GUARDADA con todo su detalle (Salón del título):
            base para revanchas y exhibiciones. */}
        <p className="text-[11px] text-slate-500 -mt-1">
          Tu plantilla queda guardada con todos sus datos{won ? ' en el Salón de campeones' : ''}.
        </p>
        <div className="grid grid-cols-3 gap-2 w-full max-w-sm mt-2">
          <Stat label="Ganados" value={save.record[0]} />
          <Stat label="Empatados" value={save.record[1]} />
          <Stat label="Perdidos" value={save.record[2]} />
          <Stat label="A favor" value={save.goalsFor} />
          <Stat label="En contra" value={save.goalsAgainst} />
          <Stat label="Plantilla" value={save.roster.length} />
        </div>
        {/* Las MISMAS estadísticas que en la vista del mapa (pichichi, tabla
            desplegable con duelos y técnicas): ganar o perder, el cierre se
            merece los datos completos. */}
        <div className="w-full max-w-sm flex flex-col gap-3 text-left mt-2">
          <StatsBoard save={save} />
        </div>
      </div>
      {/* El CIERRE, calcado del modo Pokémon: reintentar el mismo cuadro,
          sortear uno nuevo con la misma configuración, o volver a casa (y
          compartir, si has ganado). Fuera el menú de «nueva run / álbum». */}
      <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-3 safe-bottom flex flex-col gap-2">
        {won ? (
          <>
            <Button variant="secondary" full onClick={() => void share()}>
              {shared ?? <span className="inline-flex items-center justify-center gap-1.5"><Icon name="share" className="w-4 h-4" /> Compartir</span>}
            </Button>
            <Button variant="primary" full onClick={() => void restartTournament(false)}>
              <span className="inline-flex items-center justify-center gap-1.5"><Icon name="refresh" className="w-4 h-4" /> Nuevo torneo ({teamName})</span>
            </Button>
          </>
        ) : (
          <>
            <Button variant="primary" full onClick={() => void restartTournament(true)}>
              <span className="inline-flex items-center justify-center gap-1.5"><Icon name="refresh" className="w-4 h-4" /> Reintentar este torneo (mismo cuadro)</span>
            </Button>
            <Button variant="secondary" full onClick={() => void restartTournament(false)}>
              <span className="inline-flex items-center justify-center gap-1.5"><Icon name="dice" className="w-4 h-4" /> Reiniciar con cuadro nuevo</span>
            </Button>
          </>
        )}
        <Button variant="ghost" full onClick={exitInazuma}>
          <span className="inline-flex items-center justify-center gap-1.5"><Icon name="home" className="w-4 h-4" /> Volver al inicio</span>
        </Button>
      </div>
    </div>
  )
}

/**
 * PAREJAS DE COMBO del vestuario: por cada técnica combinada que alguien de
 * la plantilla tenga despertada, eliges con QUIÉN se lanza por defecto. Si el
 * elegido no está en el campo (cambios, lesiones de aguante…), el motor
 * auto-ajusta solo: canónico presente y, si no, el mejor disponible.
 */
function ComboPartnersCard() {
  const { save, setComboPartner } = useInazuma()
  if (!save) return null
  const relevant = COMBOS.filter((c) => save.roster.some((p) => p.techniques.includes(c.techniqueId)))
  if (!relevant.length) return null

  return (
    <Foldout
      icon={<ComboMark className="w-3.5 h-3.5 text-amber-300" />}
      title="Combos"
      summary={`${relevant.length} ${relevant.length === 1 ? 'técnica' : 'técnicas'}`}
    >
    <div className="rounded-b-2xl border-x border-b border-slate-700 bg-slate-800/50 p-2.5">
      <div className="flex flex-col gap-2">
        {relevant.map((c) => {
          const t = getTechnique(c.techniqueId)
          if (!t) return null
          const needed = c.members.length - 1
          // El PRINCIPAL: quien tiene la técnica despertada — él la lanza, así
          // que no tiene sentido ofrecerlo también como compañero.
          const principals = save.roster.filter((p) => p.techniques.includes(c.techniqueId))
          const principalUids = new Set(principals.map((p) => p.uid))
          const chosen = (save.comboPartners?.[c.techniqueId] ?? []).filter((u) => !principalUids.has(u))
          const toggle = (uid: string) => {
            const next = chosen.includes(uid)
              ? chosen.filter((u) => u !== uid)
              : [...chosen, uid].slice(-needed)
            setComboPartner(c.techniqueId, next)
          }
          return (
            <div key={c.techniqueId} className="rounded-xl border border-slate-700/70 bg-slate-900/40 p-2">
              <div className="flex items-center gap-1.5">
                <TechniqueBadge tech={t} size={26} />
                <div className="min-w-0">
                  <div className="text-[12px] font-extrabold truncate">{t.name}</div>
                  <div className="text-[9px] text-slate-400">
                    Principal: <b className="text-slate-200">{principals.map((p) => getPlayerBase(p.baseId).name.split(' ')[0]).join(', ') || '—'}</b>
                  </div>
                </div>
                <span className="ml-auto shrink-0 text-[9px] text-slate-500">{needed === 1 ? '+1 compañero' : `+${needed} compañeros`}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {save.roster.filter((p) => !principalUids.has(p.uid)).map((p) => {
                  const base = getPlayerBase(p.baseId)
                  const canon = c.members.includes(p.baseId)
                  const on = chosen.includes(p.uid)
                  return (
                    <button
                      key={p.uid}
                      onClick={() => toggle(p.uid)}
                      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold transition active:scale-95 ${
                        on
                          ? 'border-amber-500/70 bg-amber-500/15 text-amber-200'
                          : 'border-slate-700 bg-slate-800/60 text-slate-400'
                      }`}
                    >
                      {canon && <span className="text-amber-300">★</span>}
                      {base.name.split(' ')[0]}
                    </button>
                  )
                })}
              </div>
              <p className="mt-1 text-[9px] text-slate-500 leading-snug">
                ★ = canónico de la serie: con él hay plus de AFINIDAD (potencia máxima).
                Si tu elegido no está en el campo, se ajusta solo.
              </p>
            </div>
          )
        })}
      </div>
    </div>
    </Foldout>
  )
}

/**
 * SECCIÓN PLEGABLE del vestuario: cabecera con resumen siempre visible y el
 * contenido bajo demanda — la pantalla de plantilla estaba creciendo sin
 * freno y estas secciones se consultan de vez en cuando, no en cada visita.
 */
function Foldout({ icon, title, summary, children }: {
  icon: React.ReactNode
  title: string
  summary?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2 border border-slate-700 bg-slate-800/70 px-2.5 py-2 text-left transition active:scale-[0.99] ${
          open ? 'rounded-t-2xl' : 'rounded-2xl'
        }`}
      >
        {icon}
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-300">{title}</span>
        {summary && <span className="min-w-0 truncate text-[11px] text-slate-500">· {summary}</span>}
        <Icon name="arrowRight" className={`ml-auto w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-800/70 border border-slate-700/60 py-2">
      <div className="text-lg font-extrabold tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  )
}

/**
 * Barra de aviso flotante para los mensajes del store.
 *
 * Se va SOLA a los 4 segundos y no intercepta clics. La primera versión era un
 * `<button>` fijo que se quedaba puesto hasta que lo tocabas, y como está sobre
 * la zona baja del mapa bloqueaba las casillas de debajo: al volver de una
 * pachanga no se podía elegir la siguiente casilla sin quitar antes el aviso.
 */
export function Toast() {
  const { message, messageDetail, clearMessage } = useInazuma()
  if (!message) return null
  // MODAL, no toast: los avisos del rogue (niveles, dinero, técnicas
  // aprendidas…) pasaban desapercibidos abajo y desaparecían solos a los 4 s.
  // Ahora se quedan hasta el «Entendido» (o un toque fuera): lo que ha pasado
  // se LEE. El icono (rayo o aviso) le da contexto de un vistazo.
  const esAviso = /^(no |ese |esa |el partido guardado|la enfermería|te faltan)/i.test(message)
  return createPortal(
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm grid place-items-center p-5 animate-fade-in" onClick={clearMessage}>
      <div
        className={`w-full max-w-sm rounded-3xl border-2 bg-slate-900 p-4 text-center animate-pop-in ${
          esAviso ? 'border-rose-500/50' : 'border-amber-500/50'
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: esAviso ? '0 0 30px rgba(244,63,94,.25)' : '0 0 30px rgba(251,191,36,.25)' }}
      >
        <Icon name={esAviso ? 'warning' : 'bolt'} className={`w-8 h-8 mx-auto mb-1.5 ${esAviso ? 'text-rose-400' : 'text-amber-300'}`} />
        <p className="text-[13px] leading-snug text-slate-100 font-semibold whitespace-pre-line">
          <CoinText text={message} />
        </p>
        {/* LAS FILAS con retrato: quién sube exactamente qué. */}
        {messageDetail && messageDetail.length > 0 && (
          <div className="mt-2.5 flex flex-col gap-1 max-h-[42svh] overflow-y-auto text-left">
            {messageDetail.map((r, i) => (
              <div key={`${r.baseId}-${i}`} className="flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-800/60 px-2 py-1">
                <span className="w-8 h-8 shrink-0 rounded-lg overflow-hidden bg-slate-900 grid place-items-center">
                  <ImgFallback
                    src={portraitUrl(r.baseId)}
                    className="w-full h-full object-cover object-top"
                    alt={r.name}
                    fallback={<span className="text-[10px] font-extrabold text-slate-400">{r.name.slice(0, 2).toUpperCase()}</span>}
                  />
                </span>
                <span className="min-w-0 flex-1 text-[12px] font-bold truncate">{r.name}</span>
                <span className="shrink-0 text-[11px] font-extrabold tabular-nums text-emerald-300">{r.sub}</span>
              </div>
            ))}
          </div>
        )}
        <Button variant="primary" full className="mt-3" onClick={clearMessage}>Entendido</Button>
      </div>
    </div>,
    document.body,
  )
}
