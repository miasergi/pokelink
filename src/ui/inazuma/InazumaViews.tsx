// Vistas del modo fuera del partido: título, mapa del torneo, previa, vestuario
// (plantilla), tienda, cartas de recompensa y pantallas de cierre.
import { useEffect, useState } from 'react'
import { Button, Card, ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { useInazuma } from '@/state/inazumaStore'
import { PlayerCard, PlayerRow, ElementChip, portraitUrl } from '@/ui/inazuma/PlayerCard'
import MapBoard, { NodePreview } from '@/ui/inazuma/MapBoard'
import PitchView from '@/ui/inazuma/PitchView'
import { RivalLineup } from '@/ui/inazuma/ExtraViews'
import { FORMATIONS, getFormation } from '@/data/inazuma/formations'
import { ELEMENT_INFO, elementMultiplier } from '@/engine/inazuma/elements'
import { buildLineup, lineupError, overall, ptMax, transferValue } from '@/engine/inazuma/roster'
import { SQUAD_SIZE } from '@/engine/inazuma/types'

import { availableNextNodes, layerName, mapSegments, segmentForLayer } from '@/engine/inazuma/tournament'
import { getTeam, TEAM_BY_ID } from '@/data/inazuma/teams'
import { getPlayerBase } from '@/data/inazuma/players'
import { getTechnique } from '@/data/inazuma/techniques'
import { getItem, stockFor } from '@/data/inazuma/items'
import { techniquePrice, techniqueStock } from '@/data/inazuma/techniques'
import { bossIndexForLayer } from '@/engine/inazuma/tournament'
import { ROSTER_MAX, type InazumaSave, type PlayerInstance, type TournamentNode } from '@/engine/inazuma/types'

// ---------------------------------------------------------------------------
// Título
// ---------------------------------------------------------------------------

export function TitleView() {
  const { hasSave, save, continueTournament, abandonTournament, exitInazuma, goTo } = useInazuma()
  const [confirm, setConfirm] = useState(false)

  return (
    <div className="flex flex-col flex-1 items-center justify-between p-6 safe-top safe-bottom">
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
        <div className="text-6xl animate-float">⚽</div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          INAZUMA <span className="text-amber-400">ROGUE</span>
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
                Continuar · {layerName(save.layer)}
              </span>
            </Button>
            <div className="text-center text-[11px] text-slate-500">
              {save.record[0]}V {save.record[1]}E {save.record[2]}D · {save.roster.length} jugadores · {save.coins.toLocaleString('es-ES')} ₽
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
        <Button variant="ghost" full onClick={exitInazuma}>Volver al inicio</Button>
      </div>

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
  const [preview, setPreview] = useState<TournamentNode | null>(null)
  if (!save) return null
  const segs = mapSegments(save.map)
  const seg = segmentForLayer(segs, save.layer)
  const reachable = new Set(availableNextNodes(save.map, save.currentNodeId).map((n) => n.id))

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SaveHeader save={save} />
      <div className="shrink-0 px-3 pt-2 pb-1.5 border-b border-slate-800/70">
        <SegmentProgress segs={segs} current={seg.index} />
        <div className="flex items-center gap-2 mt-2">
          <TeamCrest teamId={seg.boss?.teamId} size={30} />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-slate-500">{seg.name}</div>
            <div className="font-extrabold text-[13px] leading-tight truncate">
              Camino a {seg.boss ? getTeam(seg.boss.teamId ?? '').name : 'la final'}
            </div>
          </div>
          <span className="ml-auto text-[10px] text-slate-600 tabular-nums shrink-0">
            {seg.index + 1}/8
          </span>
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

      <MapBoard save={save} onPick={setPreview} />

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
  // El nombre y el color salen del instituto ELEGIDO: estaban fijos al Raimon
  // y la cabecera mentía en cuanto jugabas con otro equipo.
  const team = TEAM_BY_ID.get(save.teamId ?? 'raimon')
  return (
    <div className="safe-top shrink-0 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-3 py-2 flex items-center gap-2">
      <span className="w-2.5 h-6 rounded-sm shrink-0" style={{ background: team?.color ?? '#e11d48' }} />
      <div className="min-w-0 flex-1">
        <div className="font-extrabold text-sm leading-none truncate">{team?.name ?? 'Instituto Raimon'}</div>
        <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
          {save.record[0]}V {save.record[1]}E {save.record[2]}D · {save.goalsFor}:{save.goalsAgainst}
        </div>
      </div>
      <span className="text-sm font-bold text-amber-300 tabular-nums shrink-0">{save.coins.toLocaleString('es-ES')} ₽</span>
    </div>
  )
}

function BottomBar({ onSquad, onBag }: { onSquad: () => void; onBag?: () => void }) {
  const { exitInazuma, save } = useInazuma()
  const items = (save?.bag.length ?? 0) + (save?.techniqueBag.length ?? 0)
  return (
    <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-2 safe-bottom flex gap-2">
      <Button variant="secondary" full onClick={onSquad}>
        <span className="inline-flex items-center justify-center gap-1.5"><Icon name="people" className="w-4 h-4" /> Vestuario</span>
      </Button>
      {onBag && (
        // Con el icono a secas se leía como una papelera, y «tocar la papelera»
        // asusta. Va con la palabra al lado.
        <Button variant="secondary" full onClick={onBag}>
          <span className="inline-flex items-center justify-center gap-1.5 relative">
            <Icon name="bag" className="w-4 h-4" /> Mochila
            {items > 0 && (
              <span className="rounded-full bg-amber-400 text-slate-900 text-[9px] font-black px-1.5 leading-tight">
                {items}
              </span>
            )}
          </span>
        </Button>
      )}
      <Button variant="ghost" onClick={exitInazuma}>
        <Icon name="home" className="w-4 h-4" />
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Previa del partido
// ---------------------------------------------------------------------------

export function PreviewView() {
  const { save, matchNode, confirmMatch, goTo } = useInazuma()
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
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 flex flex-col gap-3">
        <div
          className="rounded-2xl border border-slate-700 p-4 text-center"
          style={{ background: `linear-gradient(150deg, ${team.color}33, rgba(15,23,42,0.9) 60%)` }}
        >
          <div className="text-[11px] uppercase tracking-widest text-slate-400">{matchNode.subtitle}</div>
          <div className="text-xl font-extrabold mt-1">{rivalName}</div>
          <div className="mt-1.5 flex justify-center"><ElementChip element={team.element} /></div>
          {isBoss
            ? <p className="text-[12px] italic text-slate-400 mt-2">«{team.taunt}»</p>
            : <p className="text-[12px] text-slate-500 mt-2">{matchNode.reward}</p>}
        </div>

        {/* Aviso de emparejamiento elemental: es LA decisión táctica del modo */}
        <MatchupHint teamElement={team.element} lineup={lineup?.all ?? []} />

        {/* Su once. Sin esto, el sistema elemental era una adivinanza. */}
        {matchNode.teamId && (matchNode.kind === 'jefe' || matchNode.kind === 'final') && (
          <RivalLineup teamId={matchNode.teamId} level={matchNode.level ?? 10} />
        )}

        <div className="text-[11px] uppercase tracking-widest text-slate-500">
          Tu once · {getFormation(save.formation).name}
        </div>
        <div className="flex flex-col gap-1.5">
          {lineup?.all.map((p) => (
            <PlayerRow
              key={p.uid}
              player={p}
              right={<ElementBadgeVs mine={getPlayerBase(p.baseId).element} rival={team.element} />}
            />
          ))}
        </div>
      </div>
      <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-3 safe-bottom flex flex-col gap-2">
        {err && <div className="text-[11px] text-rose-300 text-center">{err}</div>}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => goTo('squad')}>Vestuario</Button>
          <Button variant="primary" full disabled={!!err} onClick={confirmMatch}>¡Saltar al campo!</Button>
        </div>
        <button className="text-xs text-slate-500" onClick={() => goTo('map')}>Volver al cuadro</button>
      </div>
    </div>
  )
}

function ElementBadgeVs({ mine, rival }: { mine: keyof typeof ELEMENT_INFO; rival: keyof typeof ELEMENT_INFO }) {
  const mult = elementMultiplier(mine, rival)
  const info = ELEMENT_INFO[mine]
  return (
    <span className="text-sm" style={{ color: info.color }}>
      {info.glyph}
      {mult > 1 && <span className="ml-0.5 text-[10px] text-emerald-300">▲</span>}
      {mult < 1 && <span className="ml-0.5 text-[10px] text-rose-300">▼</span>}
    </span>
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
    pendingTarget, applyToPlayer, cancelTarget, swapPlayers,
  } = useInazuma()
  const [detail, setDetail] = useState<string | null>(null)
  const [tab, setTab] = useState<'campo' | 'lista'>('campo')
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
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 flex flex-col gap-2">
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
              {t === 'campo' ? '⚽ Alineación' : '☰ Lista'}
            </button>
          ))}
        </div>

        {err && <div className="text-[11px] text-rose-300">{err}</div>}

        {tab === 'campo' && (
          <PitchView
            save={save}
            onSwap={swapPlayers}
            onTap={(uid) => (target ? applyToPlayer(uid) : setDetail(uid))}
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
function TechniqueStock() {
  const { save, buyTechnique } = useInazuma()
  if (!save) return null
  // Un puñado fijo por partida (según la semilla), para que la tienda tenga
  // identidad y no sea un catálogo infinito.
  const offer = techniqueStock(save.seed, bossIndexForLayer(save.layer))
  if (!offer.length) return null

  return (
    <>
      <div className="text-[11px] uppercase tracking-widest text-slate-500">Manuales de supertécnica</div>
      {offer.map((t) => {
        const info = ELEMENT_INFO[t.element]
        const price = techniquePrice(t)
        const afford = save.coins >= price
        return (
          <Card
            key={t.id}
            className={`p-3 ${afford ? '' : 'opacity-50'}`}
            onClick={afford ? () => buyTechnique(t.id) : undefined}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl shrink-0" style={{ color: info.color }}>{info.glyph}</span>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm" style={{ color: info.color }}>{t.name}</div>
                <div className="text-[11px] text-slate-400">
                  {t.kind} · {info.label} · potencia {t.power} · {t.cost} PT
                </div>
              </div>
              <span className="text-sm font-extrabold text-amber-300 tabular-nums shrink-0">
                {price.toLocaleString('es-ES')} ₽
              </span>
            </div>
          </Card>
        )
      })}
      <div className="text-[11px] uppercase tracking-widest text-slate-500 mt-1">Material</div>
    </>
  )
}

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

function BagPanel({
  save, onUse, onEquip,
}: {
  save: InazumaSave
  onUse: (itemId: string, uid: string) => void
  onEquip: (uid: string, itemId: string | undefined) => void
}) {
  const [use, setUse] = useState<string | null>(null)
  if (!save.bag.length) return null
  return (
    <>
      <div className="text-[11px] uppercase tracking-widest text-slate-500 mt-2">Mochila</div>
      <div className="flex flex-wrap gap-1.5">
        {save.bag.map((id, i) => {
          const item = getItem(id)
          if (!item) return null
          return (
            <button
              key={`${id}-${i}`}
              onClick={() => setUse(id)}
              className="rounded-lg border border-slate-700 bg-slate-800/70 px-2 py-1 text-[11px] text-left active:scale-95 transition"
            >
              <div className="font-bold">{item.name}</div>
              <div className="text-[9px] text-slate-500">{item.kind === 'equipo' ? 'equipable' : 'de un solo uso'}</div>
            </button>
          )
        })}
      </div>
      {use && (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={() => setUse(null)}>
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-4 max-h-[80%] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="font-extrabold text-center">{getItem(use)?.name}</div>
            <p className="text-[11px] text-slate-400 text-center mb-2">{getItem(use)?.desc}</p>
            <div className="text-[11px] text-slate-500 mb-1">¿A quién?</div>
            <div className="overflow-y-auto no-scrollbar flex flex-col gap-1.5">
              {save.roster.map((p) => (
                <PlayerRow
                  key={p.uid}
                  player={p}
                  onClick={() => {
                    if (getItem(use)?.kind === 'equipo') onEquip(p.uid, use)
                    else onUse(use, p.uid)
                    setUse(null)
                  }}
                />
              ))}
            </div>
            <Button variant="ghost" full className="mt-2" onClick={() => setUse(null)}>Cancelar</Button>
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
  const gear = bag.filter((id) => getItem(id)?.kind === 'equipo')
  const fee = transferValue(base, player.level)
  return (
    <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-3 max-h-[88%] overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
        <PlayerCard player={player} />

        {/* Las dos barras de la carta no se explican solas. En el playtest los
            PT fueron lo más confuso del modo, así que se cuentan aquí mismo. */}
        <div className="mt-2 rounded-xl border border-slate-700/70 bg-slate-800/40 px-2.5 py-2 text-[10px] text-slate-400 leading-relaxed">
          <b className="text-sky-300">PT {Math.round(player.pt)}/{ptMax(player)}</b> — la gasolina de las
          supertécnicas. Cada una cuesta lo que pone en su ficha y se descuenta al usarla. Sin PT
          suficientes solo te queda el tiro sencillo. Se recuperan comiendo en el Rai Rai, con
          bebidas y al terminar cada instituto. El depósito crece con el aguante.
          <br />
          <b className="text-emerald-300">AGU {Math.round(player.stamina)}/100</b> — el desgaste del
          partido. Por debajo del 40 % rinde peor en todos los duelos.
        </div>

        <div className="mt-3 text-[11px] uppercase tracking-widest text-slate-500">Supertécnicas</div>
        <div className="flex flex-col gap-1 mt-1">
          {player.techniques.map((id) => {
            const t = getTechnique(id)
            if (!t) return null
            const info = ELEMENT_INFO[t.element]
            return (
              <div key={id} className="rounded-lg border border-slate-700 bg-slate-800/60 px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[12px]" style={{ color: info.color }}>{t.name}</span>
                  <span className="text-[10px] text-slate-500">{t.kind} · {t.power} pot. · {t.cost} PT</span>
                </div>
                {t.desc && <div className="text-[10px] text-slate-500 italic">{t.desc}</div>}
              </div>
            )
          })}
        </div>

        <div className="mt-3 text-[11px] uppercase tracking-widest text-slate-500">Equipamiento</div>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {player.item && (
            <button onClick={() => onEquip(undefined)} className="rounded-lg border border-rose-600/50 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200">
              Quitar {getItem(player.item)?.name}
            </button>
          )}
          {gear.map((id, i) => (
            <button key={`${id}-${i}`} onClick={() => onEquip(id)} className="rounded-lg border border-slate-700 bg-slate-800/70 px-2 py-1 text-[11px]">
              {getItem(id)?.name}
            </button>
          ))}
          {!gear.length && !player.item && <span className="text-[11px] text-slate-600">Nada en la mochila.</span>}
        </div>

        <div className="mt-3 flex gap-2">
          <Button variant="primary" full onClick={onClose}>Cerrar</Button>
          {/* Se enseña la cifra ANTES de pulsar: un botón de traspaso sin
              precio es una decisión a ciegas. */}
          {!player.captain && !blocked && (
            <Button variant="danger" onClick={onRelease}>
              Traspasar · {fee.toLocaleString('es-ES')} ₽
            </Button>
          )}
        </div>
        {/* `getTeam` LANZA con un id desconocido, así que aquí se consulta el
            mapa directamente: una ficha de jugador no debe poder tumbar la UI. */}
        <div className="text-[10px] text-slate-600 text-center mt-1">
          {base.team === 'libre' ? 'Agente libre' : `Fichado del ${TEAM_BY_ID.get(base.team)?.name ?? base.team}`}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tienda
// ---------------------------------------------------------------------------

export function ShopView() {
  const { save, buy, goTo, matchNode } = useInazuma()
  if (!save) return null
  const isRaiRai = matchNode?.kind === 'rairai'
  const stock = stockFor(isRaiRai ? 'rairai' : 'tienda')

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
            <span className="text-3xl leading-none">{isRaiRai ? '🍜' : '🛒'}</span>
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

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 flex flex-col gap-2">
        {!isRaiRai && <TechniqueStock />}

        {stock.map((item) => {
          const afford = save.coins >= item.price
          return (
            <Card key={item.id} className={`p-3 ${afford ? '' : 'opacity-50'}`} onClick={afford ? () => buy(item.id) : undefined}>
              <div className="flex items-center gap-2.5">
                <span className="text-xl shrink-0">
                  {item.kind === 'equipo' ? '🎽' : item.kind === 'manual' ? '📘' : item.kind === 'comida' ? '🍥' : '🧃'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm">{item.name}</div>
                  <div className="text-[11px] text-slate-400">{item.desc}</div>
                </div>
                <span className="text-sm font-extrabold text-amber-300 tabular-nums shrink-0">
                  {item.price.toLocaleString('es-ES')} ₽
                </span>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-2 safe-bottom flex gap-2">
        <Button variant="secondary" onClick={() => goTo('squad')}>Vestuario</Button>
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
  const { save, draft, draftPicks, pickDraft } = useInazuma()
  if (!save) return null
  const last = save.lastMatch

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SaveHeader save={save} />
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 flex flex-col gap-3">
        {last && (
          <div className={`rounded-2xl border p-3 text-center ${
            last.result === 'win' ? 'border-emerald-500/50 bg-emerald-500/10'
              : last.result === 'draw' ? 'border-amber-500/50 bg-amber-500/10'
                : 'border-rose-500/50 bg-rose-500/10'
          }`}>
            <div className="text-[11px] uppercase tracking-widest text-slate-400">vs {last.rival}</div>
            <div className="text-3xl font-extrabold tabular-nums">{last.score[0]} – {last.score[1]}</div>
            {last.scorers.length > 0 && (
              <div className="text-[11px] text-slate-300 mt-1">⚽ {last.scorers.join(', ')}</div>
            )}
          </div>
        )}
        <div className="text-[11px] uppercase tracking-widest text-slate-500">
          Elige tu recompensa{draftPicks > 1 ? ` · te quedan ${draftPicks}` : ''}
        </div>
        {draft.map((o) => (
          <Card key={o.id} className="p-3" onClick={() => pickDraft(o.id)}>
            <div className="flex items-center gap-2.5">
              {o.kind === 'fichaje' ? (
                <div className="w-11 h-11 shrink-0 rounded-lg overflow-hidden border border-slate-600 grid place-items-center bg-slate-800">
                  <ImgFallback
                    src={portraitUrl(o.playerId)}
                    className="w-full h-full object-cover"
                    fallback={<span className="text-lg">🎽</span>}
                  />
                </div>
              ) : (
                <span className="text-2xl shrink-0">
                  {o.kind === 'objeto' ? '🎒' : o.kind === 'entrenamiento' ? '🏃' : o.kind === 'tecnica' ? '⚡' : o.kind === 'dinero' ? '💰' : '🛌'}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-sm">{o.title}</div>
                <div className="text-[11px] text-slate-400">{o.desc}</div>
              </div>
              <Icon name="arrowRight" className="w-4 h-4 text-slate-500 shrink-0" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cierre
// ---------------------------------------------------------------------------

export function EndView({ won }: { won: boolean }) {
  const { save, exitInazuma, abandonTournament, goTo } = useInazuma()
  if (!save) return null
  const best = [...save.roster].sort((a, b) => overall(b) - overall(a)).slice(0, 3)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-4 safe-top flex flex-col items-center gap-3 text-center">
        <div className="text-6xl mt-4">{won ? '🏆' : '😔'}</div>
        <h2 className={`text-2xl font-extrabold ${won ? 'text-amber-300' : 'text-slate-300'}`}>
          {won ? '¡CAMPEONES DEL FOOTBALL FRONTIER!' : 'Eliminados'}
        </h2>
        <p className="text-sm text-slate-400 max-w-[18rem]">
          {won
            ? 'El Raimon lo ha conseguido. Nadie apostaba por vosotros.'
            : `El torneo se acaba aquí, en ${layerName(save.layer)}. La próxima vez.`}
        </p>
        <div className="grid grid-cols-3 gap-2 w-full max-w-sm mt-2">
          <Stat label="Ganados" value={save.record[0]} />
          <Stat label="Empatados" value={save.record[1]} />
          <Stat label="Perdidos" value={save.record[2]} />
          <Stat label="A favor" value={save.goalsFor} />
          <Stat label="En contra" value={save.goalsAgainst} />
          <Stat label="Plantilla" value={save.roster.length} />
        </div>
        <div className="text-[11px] uppercase tracking-widest text-slate-500 mt-3">Los mejores</div>
        <div className="w-full max-w-sm flex flex-col gap-2">
          {best.map((p) => <PlayerCard key={p.uid} player={p} compact />)}
        </div>
      </div>
      <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-3 safe-bottom flex flex-col gap-2">
        <Button variant="primary" full onClick={() => void abandonTournament()}>Nuevo torneo</Button>
        <Button variant="secondary" full onClick={() => goTo('album')}>
          <span className="inline-flex items-center justify-center gap-1.5">
            <Icon name="pokedex" className="w-4 h-4" /> Álbum de fichajes
          </span>
        </Button>
        <Button variant="ghost" full onClick={exitInazuma}>Volver al inicio</Button>
      </div>
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
  const { message, clearMessage } = useInazuma()

  useEffect(() => {
    if (!message) return
    const t = setTimeout(clearMessage, 4000)
    return () => clearTimeout(t)
  }, [message, clearMessage])

  if (!message) return null
  return (
    <div className="pointer-events-none fixed left-1/2 -translate-x-1/2 bottom-24 z-[80] max-w-[90%] animate-pop-in">
      <button
        onClick={clearMessage}
        className="pointer-events-auto rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-[12px] text-slate-100 shadow-xl"
      >
        {message}
      </button>
    </div>
  )
}
