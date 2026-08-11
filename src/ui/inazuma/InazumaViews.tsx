// Vistas del modo fuera del partido: título, mapa del torneo, previa, vestuario
// (plantilla), tienda, cartas de recompensa y pantallas de cierre.
import { useState } from 'react'
import { Button, Card, ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { useInazuma } from '@/state/inazumaStore'
import { PlayerCard, PlayerRow, ElementChip, portraitUrl } from '@/ui/inazuma/PlayerCard'
import { ELEMENT_INFO, elementMultiplier } from '@/engine/inazuma/elements'
import { buildLineup, lineupError, overall } from '@/engine/inazuma/roster'
import { matchIndex, roundName, RIVAL_LEVELS, TOTAL_ROUNDS } from '@/engine/inazuma/tournament'
import { getTeam, TEAM_BY_ID } from '@/data/inazuma/teams'
import { getPlayerBase } from '@/data/inazuma/players'
import { getTechnique } from '@/data/inazuma/techniques'
import { ITEMS, getItem } from '@/data/inazuma/items'
import { ROSTER_MAX, type InazumaSave, type PlayerInstance, type TournamentNode } from '@/engine/inazuma/types'

// ---------------------------------------------------------------------------
// Título
// ---------------------------------------------------------------------------

export function TitleView() {
  const { hasSave, save, newTournament, continueTournament, abandonTournament, exitInazuma } = useInazuma()
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
                Continuar · {roundName(save.round)}
              </span>
            </Button>
            <div className="text-center text-[11px] text-slate-500">
              {save.record[0]}V {save.record[1]}E {save.record[2]}D · {save.roster.length} jugadores · {save.coins.toLocaleString('es-ES')} ₽
            </div>
          </>
        )}
        <Button variant="primary" full onClick={() => (hasSave ? setConfirm(true) : void newTournament())}>
          {hasSave ? 'Empezar torneo nuevo' : '¡Empezar el Football Frontier!'}
        </Button>
        <Button variant="ghost" full onClick={exitInazuma}>Volver al inicio</Button>
      </div>

      {confirm && (
        <div className="absolute inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={() => setConfirm(false)}>
          <div className="w-full max-w-xs rounded-3xl border border-rose-500/50 bg-slate-900 p-4 text-center animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <Icon name="warning" className="w-9 h-9 mx-auto text-rose-300" />
            <div className="font-extrabold text-rose-300 mt-1">¿Borrar el torneo actual?</div>
            <p className="text-sm text-slate-300 mt-2">Solo se guarda una partida. Empezar de cero borra la plantilla y el progreso.</p>
            <Button variant="danger" full className="mt-3" onClick={() => { setConfirm(false); void abandonTournament().then(newTournament) }}>
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

const NODE_ICON: Record<TournamentNode['kind'], string> = {
  partido: '⚔️', final: '🏆', amistoso: '🤝', ojeador: '🔎', entrenamiento: '🏃', descanso: '🛌', tienda: '🛒',
}

export function MapView() {
  const { save, chooseNode, goTo } = useInazuma()
  if (!save) return null
  const done = matchIndex(save.round)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SaveHeader save={save} />
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 flex flex-col gap-3">
        <Bracket save={save} />
        <div className="text-[11px] uppercase tracking-widest text-slate-500 mt-1">
          {roundName(save.round)} · elige una opción
        </div>
        {save.offer.map((n) => <NodeCard key={n.id} node={n} save={save} onPick={() => chooseNode(n.id)} />)}
        {!save.offer.length && (
          <div className="text-center text-slate-500 text-sm py-8">No queda nada por jugar.</div>
        )}
        <div className="text-[11px] text-slate-600 text-center mt-2">
          Eliminatoria {Math.min(done + 1, 8)} de 8 · ronda {save.round + 1}/{TOTAL_ROUNDS}
        </div>
      </div>
      <BottomBar onSquad={() => goTo('squad')} />
    </div>
  )
}

function Bracket({ save }: { save: InazumaSave }) {
  const done = matchIndex(save.round)
  return (
    <div className="flex items-center gap-1">
      {RIVAL_LEVELS.map((_, i) => (
        <div
          key={i}
          className={`flex-1 h-1.5 rounded-full ${
            i < done ? 'bg-emerald-500' : i === done ? 'bg-amber-400' : 'bg-slate-700'
          }`}
        />
      ))}
    </div>
  )
}

function NodeCard({ node, save, onPick }: { node: TournamentNode; save: InazumaSave; onPick: () => void }) {
  const team = node.teamId ? getTeam(node.teamId) : null
  const risky = node.id.endsWith('-todas')
  const lineup = buildLineup(save.roster, save.lineup)
  const myLevel = lineup ? Math.round(lineup.all.reduce((a, p) => a + p.level, 0) / lineup.all.length) : 0
  const gap = node.level != null ? node.level - myLevel : 0

  return (
    <Card
      onClick={onPick}
      className={`p-3 ${risky ? 'border-rose-500/50' : node.kind === 'final' ? 'border-amber-400/60' : ''}`}
      style={team ? { background: `linear-gradient(120deg, ${team.color}22, rgba(30,41,59,0.7) 60%)` } : undefined}
    >
      <div className="flex items-start gap-2.5">
        <span className="text-2xl leading-none shrink-0">{NODE_ICON[node.kind]}</span>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold text-sm leading-tight">{node.title}</div>
          <div className="text-[11px] text-slate-400">{node.subtitle}</div>
          {team && (
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              <ElementChip element={team.element} />
              {node.level != null && (
                <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 border ${
                  gap > 3 ? 'border-rose-500/50 bg-rose-500/15 text-rose-200'
                    : gap > 0 ? 'border-amber-500/50 bg-amber-500/15 text-amber-200'
                      : 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                }`}>
                  {gap > 3 ? 'Muy superiores' : gap > 0 ? 'Algo por encima' : 'A tu alcance'}
                </span>
              )}
            </div>
          )}
          <div className="mt-1.5 text-[11px] text-emerald-300/90">🎁 {node.reward}</div>
          {team?.taunt && <div className="mt-1 text-[11px] italic text-slate-500">«{team.taunt}»</div>}
        </div>
        <Icon name="arrowRight" className="w-4 h-4 text-slate-500 shrink-0 mt-1" />
      </div>
    </Card>
  )
}

function SaveHeader({ save }: { save: InazumaSave }) {
  return (
    <div className="safe-top shrink-0 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-3 py-2 flex items-center gap-2">
      <span className="w-2.5 h-6 rounded-sm shrink-0 bg-rose-600" />
      <div className="min-w-0 flex-1">
        <div className="font-extrabold text-sm leading-none">Instituto Raimon</div>
        <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
          {save.record[0]}V {save.record[1]}E {save.record[2]}D · {save.goalsFor}:{save.goalsAgainst}
        </div>
      </div>
      <span className="text-sm font-bold text-amber-300 tabular-nums shrink-0">{save.coins.toLocaleString('es-ES')} ₽</span>
    </div>
  )
}

function BottomBar({ onSquad }: { onSquad: () => void }) {
  const { exitInazuma } = useInazuma()
  return (
    <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-2 safe-bottom flex gap-2">
      <Button variant="secondary" full onClick={onSquad}>
        <span className="inline-flex items-center justify-center gap-1.5"><Icon name="people" className="w-4 h-4" /> Vestuario</span>
      </Button>
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
  const lineup = buildLineup(save.roster, save.lineup)
  const err = lineupError(save.roster, save.lineup)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SaveHeader save={save} />
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 flex flex-col gap-3">
        <div
          className="rounded-2xl border border-slate-700 p-4 text-center"
          style={{ background: `linear-gradient(150deg, ${team.color}33, rgba(15,23,42,0.9) 60%)` }}
        >
          <div className="text-[11px] uppercase tracking-widest text-slate-400">{matchNode.subtitle}</div>
          <div className="text-xl font-extrabold mt-1">{team.name}</div>
          <div className="mt-1.5 flex justify-center"><ElementChip element={team.element} /></div>
          <p className="text-[12px] italic text-slate-400 mt-2">«{team.taunt}»</p>
        </div>

        {/* Aviso de emparejamiento elemental: es LA decisión táctica del modo */}
        <MatchupHint teamElement={team.element} lineup={lineup?.all ?? []} />

        <div className="text-[11px] uppercase tracking-widest text-slate-500">Tu once</div>
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
  const { save, toggleStarter, goTo, equip, useConsumable, release, pendingTarget, applyToPlayer, cancelTarget } = useInazuma()
  const [detail, setDetail] = useState<string | null>(null)
  if (!save) return null

  const starters = save.lineup
    .map((u) => save.roster.find((p) => p.uid === u))
    .filter((p): p is PlayerInstance => !!p)
  const bench = save.roster.filter((p) => !save.lineup.includes(p.uid))
  const err = lineupError(save.roster, save.lineup)
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

        <BagPanel save={save} onUse={useConsumable} onEquip={equip} />
      </div>

      <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-2 safe-bottom flex gap-2">
        <Button variant="primary" full onClick={() => goTo('map')}>Listo</Button>
      </div>

      {detail && (
        <PlayerDetail
          player={save.roster.find((p) => p.uid === detail)!}
          bag={save.bag}
          onClose={() => setDetail(null)}
          onEquip={(item) => equip(detail, item)}
          onRelease={() => { release(detail); setDetail(null) }}
        />
      )}
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
  player, bag, onClose, onEquip, onRelease,
}: {
  player: PlayerInstance
  bag: string[]
  onClose: () => void
  onEquip: (itemId: string | undefined) => void
  onRelease: () => void
}) {
  const base = getPlayerBase(player.baseId)
  const gear = bag.filter((id) => getItem(id)?.kind === 'equipo')
  return (
    <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-3 max-h-[88%] overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
        <PlayerCard player={player} />
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
          {!player.captain && <Button variant="danger" onClick={onRelease}>Traspasar</Button>}
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
  const { save, buy, goTo } = useInazuma()
  if (!save) return null
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SaveHeader save={save} />
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 flex flex-col gap-2">
        <div className="text-[11px] uppercase tracking-widest text-slate-500">Tienda de deportes</div>
        {ITEMS.map((item) => {
          const afford = save.coins >= item.price
          return (
            <Card key={item.id} className={`p-3 ${afford ? '' : 'opacity-50'}`} onClick={afford ? () => buy(item.id) : undefined}>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm">{item.name}</div>
                  <div className="text-[11px] text-slate-400">{item.desc}</div>
                </div>
                <span className="text-sm font-extrabold text-amber-300 tabular-nums shrink-0">{item.price.toLocaleString('es-ES')} ₽</span>
              </div>
            </Card>
          )
        })}
      </div>
      <div className="shrink-0 border-t border-slate-800 bg-slate-900/90 p-2 safe-bottom flex gap-2">
        <Button variant="secondary" onClick={() => goTo('squad')}>Vestuario</Button>
        <Button variant="primary" full onClick={() => goTo('map')}>Salir de la tienda</Button>
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
  const { save, exitInazuma, abandonTournament } = useInazuma()
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
            : `El torneo se acaba aquí, en ${roundName(save.round)}. La próxima vez.`}
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

/** Barra de aviso flotante para los mensajes del store. */
export function Toast() {
  const { message, clearMessage } = useInazuma()
  if (!message) return null
  return (
    <button
      onClick={clearMessage}
      className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[80] max-w-[90%] rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-[12px] text-slate-100 shadow-xl animate-pop-in"
    >
      {message}
    </button>
  )
}
