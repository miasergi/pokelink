import { useRef, useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, TopBar } from '@/ui/components/kit'
import { getSpecies, getMove } from '@/data'
import { ITEMS, getItem } from '@/data/items'
import Sprite from '@/ui/components/Sprite'
import Icon from '@/ui/components/Icon'
import TypeBadge from '@/ui/components/TypeBadge'
import HpBar from '@/ui/components/HpBar'
import PowerDots from '@/ui/components/PowerDots'
import PartyList from '@/ui/components/PartyList'
import CompareModal from '@/ui/components/CompareModal'
import { typeGradient } from '@/ui/theme/types'
import { displayStats } from '@/engine/team/itemEffect'
import { attackCategory } from '@/engine/battle/damage'
import { groupStandings, playerGroupMatch, playerKnockoutMatch, leagueChampion } from '@/engine/league/league'
import type { PokemonInstance } from '@/types'
import type { LeagueParticipant, LeagueState, LeagueMatch, KnockoutMatch, MatchSide } from '@/engine/league/types'

interface BattleView { aIdx: number; bIdx: number; detailA?: MatchSide[]; detailB?: MatchSide[]; killsA?: number; killsB?: number; winnerIdx: number }

const EQUIPPABLES = ITEMS.filter((i) => i.category === 'held').map((i) => i.id)

function Portrait({ p, size = 'w-9 h-9' }: { p: LeagueParticipant; size?: string }) {
  if (p.sprite) return <img src={p.sprite} alt="" className={`${size} object-contain shrink-0`} onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }} />
  return <Icon name="pokeball" className={size} />
}

export default function LeagueScreen() {
  const { league, startLeagueMatch, abandonLeague, equipLeagueItem, unequipLeagueItem, setLeagueOrder, navigate } = useGame()
  const [viewTeam, setViewTeam] = useState<number | null>(null) // participante a inspeccionar
  const [shop, setShop] = useState(false)
  const [team, setTeam] = useState(false) // gestionar mi equipo
  const [results, setResults] = useState(false)
  const [battle, setBattle] = useState<BattleView | null>(null)
  const myGroupRef = useRef<HTMLDivElement | null>(null)
  if (!league) return null

  const openGroup = (m: LeagueMatch) => { if (m.played) setBattle({ aIdx: m.a, bIdx: m.b, detailA: m.detailA, detailB: m.detailB, killsA: m.killsA, killsB: m.killsB, winnerIdx: m.winner === 'a' ? m.a : m.b }) }
  const openKo = (m: KnockoutMatch) => { if (m.played && m.a != null && m.b != null) setBattle({ aIdx: m.a, bIdx: m.b, detailA: m.detailA, detailB: m.detailB, killsA: m.killsA, killsB: m.killsB, winnerIdx: m.winner! }) }

  const champ = leagueChampion(league)
  const pgm = playerGroupMatch(league)
  const pkm = playerKnockoutMatch(league)
  const oppIdx = pgm ? (pgm.a === league.playerIdx ? pgm.b : pgm.a)
    : (pkm && pkm.a != null && pkm.b != null ? (pkm.a === league.playerIdx ? pkm.b : pkm.a) : null)

  return (
    <div className="flex flex-col flex-1">
      <TopBar
        title={<span className="inline-flex items-center gap-2"><Icon name="liga" className="w-6 h-6" /> Liga Pokémon</span>}
        left={<Button variant="ghost" onClick={() => navigate('home')}>‹</Button>}
        right={<button className="text-[11px] text-rose-300 font-bold pr-1" onClick={() => void abandonLeague()}>Abandonar</button>}
      />
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 no-scrollbar">
        {/* Estado / fase */}
        {league.phase === 'champion' ? (
          <ChampionCard league={league} champ={champ} onView={setViewTeam} />
        ) : (
          <div className="rounded-xl bg-slate-800/60 border border-slate-700 px-3 py-2 text-center text-sm font-bold">
            {league.phase === 'groups' ? `Fase de grupos · Jornada ${league.matchday + 1}/3` : league.knockout[league.koRound]?.name ?? 'Eliminatorias'}
          </div>
        )}

        {/* Tu próximo combate */}
        {oppIdx != null && (
          <div className="rounded-2xl border border-fuchsia-500/50 p-3" style={{ background: 'linear-gradient(135deg, rgba(217,70,239,0.18), rgba(15,23,42,0.7))' }}>
            <div className="text-[11px] uppercase tracking-wide text-fuchsia-200 font-bold mb-1.5">Tu próximo combate</div>
            <button onClick={() => setViewTeam(oppIdx)} className="flex items-center gap-2 w-full text-left active:scale-[0.99]">
              <Portrait p={league.participants[oppIdx]} size="w-12 h-12" />
              <div className="flex-1 min-w-0">
                <div className="font-extrabold truncate">{league.participants[oppIdx].name}</div>
                <div className="text-[11px] text-slate-300">Toca para ver su equipo y prepararte</div>
              </div>
            </button>
            <Button full variant="primary" className="mt-2.5" onClick={startLeagueMatch}><span className="inline-flex items-center justify-center gap-1.5"><Icon name="play" className="w-4 h-4" /> ¡Combatir!</span></Button>
            <div className="flex gap-2 mt-2">
              <Button full variant="secondary" onClick={() => setTeam(true)}><span className="inline-flex items-center justify-center gap-1.5"><Icon name="people" className="w-4 h-4" /> Mi equipo</span></Button>
              <Button full variant="secondary" onClick={() => setShop(true)}><span className="inline-flex items-center justify-center gap-1.5"><Icon name="bag" className="w-4 h-4" /> Tienda</span></Button>
            </div>
          </div>
        )}

        {/* Accesos: ver resultados por jornada y saltar a mi grupo */}
        {league.phase !== 'champion' && (
          <div className="flex gap-2">
            <Button variant="secondary" full className="!py-2" onClick={() => setResults(true)}>
              <span className="inline-flex items-center justify-center gap-1.5"><Icon name="clipboard" className="w-4 h-4" /> Resultados</span>
            </Button>
            {league.phase === 'groups' && (
              <Button variant="secondary" full className="!py-2" onClick={() => myGroupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                <span className="inline-flex items-center justify-center gap-1.5"><Icon name="target" className="w-4 h-4" /> Mi grupo</span>
              </Button>
            )}
          </div>
        )}

        {/* Grupos */}
        {league.phase === 'groups' && league.groups.map((g) => {
          const st = groupStandings(league, g.idx)
          const mine = g.members.includes(league.playerIdx)
          return (
            <div key={g.idx} ref={mine ? myGroupRef : undefined} className={`rounded-xl border bg-slate-900/40 p-2 ${mine ? 'border-fuchsia-500/50' : 'border-slate-700/60'}`}>
              <div className="flex items-center justify-between mb-1 px-1">
                <div className="text-xs font-bold text-slate-300">Grupo {g.idx + 1}{mine && <span className="text-fuchsia-300"> · tu grupo</span>}</div>
                <div className="text-[9px] text-slate-500">Pts · Kills</div>
              </div>
              <div className="flex flex-col gap-0.5">
                {st.map((row, pos) => {
                  const p = league.participants[row.participant]
                  const isPlayer = row.participant === league.playerIdx
                  const qualifies = pos < 2
                  return (
                    <button key={row.participant} onClick={() => setViewTeam(row.participant)}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1 text-left ${isPlayer ? 'bg-fuchsia-500/20' : qualifies ? 'bg-emerald-500/5' : ''}`}>
                      <span className={`text-[10px] font-black w-4 ${qualifies ? 'text-emerald-300' : 'text-slate-500'}`}>{pos + 1}</span>
                      <Portrait p={p} size="w-7 h-7" />
                      <span className={`flex-1 min-w-0 text-xs font-semibold truncate ${isPlayer ? 'text-fuchsia-200' : ''}`}>{p.name}{isPlayer && ' (tú)'}</span>
                      <span className="text-[11px] font-bold tabular-nums">{row.points}</span>
                      <span className="text-[10px] text-slate-400 tabular-nums w-7 text-right">{row.kills >= 0 ? '+' : ''}{row.kills}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Eliminatorias */}
        {league.phase !== 'groups' && league.knockout.map((round, ri) => (
          <div key={ri} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-2">
            <div className="text-xs font-bold text-slate-300 mb-1 px-1">{round.name}</div>
            <div className="flex flex-col gap-1">
              {round.matches.map((m, mi) => (
                <div key={mi} className="flex items-center gap-1.5 text-xs">
                  <KoSide league={league} idx={m.a} win={m.winner === m.a} onView={setViewTeam} />
                  <span className="text-slate-500 text-[10px]">vs</span>
                  <KoSide league={league} idx={m.b} win={m.winner === m.b} onView={setViewTeam} />
                  {m.played && <button onClick={() => openKo(m)} className="shrink-0 text-sky-300/80 active:scale-90 px-1" title="Ver combate"><Icon name="scroll" className="w-4 h-4" /></button>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {viewTeam != null && <TeamModal p={league.participants[viewTeam]} onClose={() => setViewTeam(null)} />}
      {team && <MyTeamModal team={league.participants[league.playerIdx].team} onReorder={setLeagueOrder} onClose={() => setTeam(false)} />}
      {shop && <LeagueShop league={league} onEquip={equipLeagueItem} onUnequip={unequipLeagueItem} onClose={() => setShop(false)} />}
      {results && <ResultsModal league={league} onClose={() => setResults(false)} onOpen={openGroup} />}
      {battle && <BattleResultModal league={league} v={battle} onClose={() => setBattle(null)} />}
    </div>
  )
}

function KoSide({ league, idx, win, onView }: { league: LeagueState; idx: number | null; win: boolean; onView: (i: number) => void }) {
  if (idx == null) return <div className="flex-1 text-slate-600 text-[11px] px-2">—</div>
  const p = league.participants[idx]
  const isPlayer = idx === league.playerIdx
  return (
    <button onClick={() => onView(idx)} className={`flex-1 min-w-0 flex items-center gap-1.5 rounded-lg px-2 py-1 ${win ? 'bg-emerald-500/15' : ''} ${isPlayer ? 'ring-1 ring-fuchsia-400' : ''}`}>
      <Portrait p={p} size="w-6 h-6" />
      <span className={`truncate ${win ? 'font-bold text-emerald-200' : 'text-slate-300'}`}>{p.name}{isPlayer && ' (tú)'}</span>
    </button>
  )
}

function ChampionCard({ league, champ, onView }: { league: LeagueState; champ: number | null; onView: (i: number) => void }) {
  const isPlayer = champ === league.playerIdx
  return (
    <div className="rounded-2xl border border-amber-500/50 p-4 text-center" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(15,23,42,0.7))' }}>
      <Icon name="trophy" className="w-12 h-12 mx-auto" />
      <div className="font-extrabold text-amber-300 text-lg mt-1">{isPlayer ? '¡Has ganado la Liga!' : 'Campeón de la Liga'}</div>
      {champ != null && (
        <button onClick={() => onView(champ)} className="inline-flex items-center gap-2 mt-2 bg-slate-800/60 rounded-full px-3 py-1.5 active:scale-95">
          <img src={league.participants[champ].sprite} alt="" className="w-8 h-8 object-contain" />
          <span className="font-bold">{league.participants[champ].name}</span>
        </button>
      )}
    </div>
  )
}

function TeamModal({ p, onClose }: { p: LeagueParticipant; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm grid place-items-center p-3" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90%] overflow-y-auto no-scrollbar rounded-3xl border border-slate-700 bg-slate-900 p-3 animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-2">
          {p.sprite && <img src={p.sprite} alt="" className="w-10 h-10 object-contain" />}
          <div className="font-extrabold flex-1">{p.name}</div>
          <button className="text-slate-400 px-1" onClick={onClose}><Icon name="x" className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {p.team.map((m) => {
            const sp = getSpecies(m.speciesId)
            const held = m.heldItemId ? getItem(m.heldItemId) : null
            return (
              <div key={m.uid} className="rounded-xl border border-slate-700 bg-slate-800/50 p-2">
                <div className="flex items-center gap-2">
                  <Sprite speciesId={m.speciesId} shiny={m.shiny} className="w-10 h-10 object-contain" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{sp.displayName}</div>
                    <div className="text-[9px] text-slate-400">Nv.{m.level}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-0.5 mt-1">{sp.types.map((t) => <TypeBadge key={t} type={t} size="sm" shrink />)}</div>
                {held && <div className="text-[9px] text-amber-200 inline-flex items-center gap-1 mt-1">{held.sprite && <img src={held.sprite} alt="" className="w-3 h-3" />}<span className="truncate">{held.name}</span></div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ResultsModal({ league, onClose, onOpen }: { league: LeagueState; onClose: () => void; onOpen: (m: LeagueMatch) => void }) {
  const [md, setMd] = useState(Math.max(0, Math.min(2, league.matchday - (league.phase === 'groups' ? 1 : 0))))
  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm grid place-items-center p-3" onClick={onClose}>
      <div className="w-full max-w-md max-h-[92%] overflow-y-auto no-scrollbar rounded-3xl border border-slate-700 bg-slate-900 p-3 animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-extrabold inline-flex items-center gap-1.5"><Icon name="clipboard" className="w-5 h-5" /> Resultados</div>
          <button className="text-slate-400 px-1" onClick={onClose}><Icon name="x" className="w-5 h-5" /></button>
        </div>
        <div className="flex gap-1.5 mb-2">
          {[0, 1, 2].map((j) => (
            <button key={j} onClick={() => setMd(j)} className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${md === j ? 'bg-fuchsia-500 text-white' : 'bg-slate-800 text-slate-300'}`}>Jornada {j + 1}</button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {league.groups.map((g) => (
            <div key={g.idx} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-2">
              <div className="text-[11px] font-bold text-slate-300 mb-1 px-1">Grupo {g.idx + 1}</div>
              {g.matches.filter((m) => m.matchday === md).map((m, i) => {
                const na = league.participants[m.a].name, nb = league.participants[m.b].name
                const aWin = m.winner === 'a', bWin = m.winner === 'b'
                return (
                  <button key={i} disabled={!m.played} onClick={() => onOpen(m)} className="w-full flex items-center gap-1.5 text-[11px] py-1 px-1 rounded-lg disabled:opacity-100 enabled:active:bg-slate-800/60">
                    <span className={`flex-1 min-w-0 truncate text-right ${aWin ? 'font-bold text-emerald-300' : 'text-slate-300'}`}>{na}</span>
                    <span className="tabular-nums text-slate-400 shrink-0">{m.played ? `${m.killsA! >= 0 ? '+' : ''}${m.killsA} · ${m.killsB! >= 0 ? '+' : ''}${m.killsB}` : 'vs'}</span>
                    <span className={`flex-1 min-w-0 truncate ${bWin ? 'font-bold text-emerald-300' : 'text-slate-300'}`}>{nb}</span>
                    {m.played && <Icon name="scroll" className="w-3.5 h-3.5 text-sky-300/70 shrink-0" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BattleResultModal({ league, v, onClose }: { league: LeagueState; v: BattleView; onClose: () => void }) {
  const faintsA = v.detailA?.filter((d) => d.fainted).length ?? 0
  const faintsB = v.detailB?.filter((d) => d.fainted).length ?? 0
  const side = (idx: number, detail: MatchSide[] | undefined, faints: number, kos: number) => {
    const p = league.participants[idx]
    const win = v.winnerIdx === idx
    const total = detail?.length ?? 6
    return (
      <div className={`rounded-2xl border p-2.5 ${win ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/40'}`}>
        <div className="flex items-center gap-2 mb-1.5">
          {p.sprite && <img src={p.sprite} alt="" className="w-9 h-9 object-contain shrink-0" />}
          <div className="min-w-0 flex-1">
            <div className="font-bold truncate text-sm">{p.name}{win && <span className="text-emerald-300 text-[10px] font-black ml-1">GANA</span>}</div>
            <div className="text-[10px] text-slate-400">{total - faints}/{total} en pie · {kos} K.O. rival</div>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {(detail ?? []).map((d, i) => (
            <div key={i} className="relative">
              <Sprite speciesId={d.speciesId} shiny={d.shiny} className={`w-full object-contain ${d.fainted ? 'grayscale opacity-40' : ''}`} />
              {d.fainted && <Icon name="x" className="absolute inset-0 m-auto w-4 h-4 text-rose-400 drop-shadow" />}
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="fixed inset-0 z-[74] bg-black/75 backdrop-blur-sm grid place-items-center p-3" onClick={onClose}>
      <div className="w-full max-w-md max-h-[92%] overflow-y-auto no-scrollbar rounded-3xl border border-slate-700 bg-slate-900 p-3 animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-extrabold inline-flex items-center gap-1.5"><Icon name="sword" className="w-5 h-5" /> Resultado del combate</div>
          <button className="text-slate-400 px-1" onClick={onClose}><Icon name="x" className="w-5 h-5" /></button>
        </div>
        {!v.detailA ? (
          <p className="text-sm text-slate-400 text-center py-4">Este combate se jugó antes de guardar el detalle. Los nuevos combates ya lo muestran.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {side(v.aIdx, v.detailA, faintsA, faintsB)}
            <div className="text-center text-[11px] text-slate-400">Kills (neto): <b className="text-slate-200">{v.killsA! >= 0 ? '+' : ''}{v.killsA}</b> · <b className="text-slate-200">{v.killsB! >= 0 ? '+' : ''}{v.killsB}</b></div>
            {side(v.bIdx, v.detailB, faintsB, faintsA)}
          </div>
        )}
      </div>
    </div>
  )
}

function MyTeamModal({ team, onReorder, onClose }: { team: PokemonInstance[]; onReorder: (uids: string[]) => void; onClose: () => void }) {
  const [sel, setSel] = useState<string | null>(null)
  const [compare, setCompare] = useState(false)
  const mon = team.find((p) => p.uid === sel) ?? null
  const sp = mon ? getSpecies(mon.speciesId) : null
  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm grid place-items-center p-3" onClick={onClose}>
      <div className="w-full max-w-md max-h-[92%] overflow-y-auto no-scrollbar rounded-3xl border border-slate-700 bg-slate-900 p-3 animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <div className="font-extrabold inline-flex items-center gap-1.5"><Icon name="people" className="w-5 h-5" /> Tu equipo</div>
          <button className="text-slate-400 px-1" onClick={onClose}><Icon name="x" className="w-5 h-5" /></button>
        </div>
        <p className="text-[11px] text-slate-400 mb-2">Arrastra para reordenar (el primero es tu líder). Toca un Pokémon para ver detalles y comparar.</p>
        <PartyList party={team} selectedUid={sel} onSelect={(uid) => setSel(uid === sel ? null : uid)} onReorder={onReorder} />
      </div>

      {mon && sp && (
        <div className="fixed inset-0 z-[72] bg-black/75 backdrop-blur-sm grid place-items-center p-3" onClick={() => setSel(null)}>
          <div className="w-full max-w-md max-h-[92%] overflow-y-auto no-scrollbar rounded-3xl border border-slate-700 bg-slate-900 p-3 animate-pop-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end -mb-1"><button className="text-slate-400 px-1" onClick={() => setSel(null)}><Icon name="x" className="w-5 h-5" /></button></div>
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-xl p-0.5" style={{ background: typeGradient(sp.types) }}>
                <Sprite speciesId={mon.speciesId} shiny={mon.shiny} className="w-14 h-14 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold truncate">{sp.displayName}</div>
                <div className="flex gap-1 mt-0.5">{sp.types.map((t) => <TypeBadge key={t} type={t} size="sm" />)}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-slate-400">Nv.{mon.level}</span>
                {team.length > 1 && <button onClick={() => setCompare(true)} className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-700 text-slate-200 active:scale-95 inline-flex items-center gap-1"><Icon name="scales" className="w-3.5 h-3.5" /> Comparar</button>}
              </div>
            </div>
            <div className="mb-2"><HpBar current={mon.currentHp} max={mon.stats.hp} status={mon.status} showNumbers /></div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
              {displayStats(mon).filter((r) => r.key !== 'hp').map((r) => {
                const color = r.eff > r.base ? 'text-emerald-400' : r.eff < r.base ? 'text-rose-400' : ''
                return (
                  <div key={r.key} className="flex justify-between">
                    <span className="text-slate-400">{r.label}</span>
                    <span className={`font-bold tabular-nums ${color}`}>{r.eff}{r.eff !== r.base && <span className="text-[9px] text-slate-500 font-normal"> ({r.base})</span>}</span>
                  </div>
                )
              })}
            </div>
            <div className="grid grid-cols-1 gap-1.5 mb-2">
              {mon.moves.map((mv) => {
                const m = getMove(mv.moveId)
                return (
                  <div key={mv.moveId} className="rounded-lg bg-slate-900/60 px-2.5 py-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0"><TypeBadge type={m.type} size="sm" /><span className="text-xs font-semibold truncate">{m.displayName}</span><PowerDots type={m.type} power={m.power} /></div>
                    <span className="text-[10px] text-slate-400 shrink-0">{attackCategory(mon) === 'physical' ? 'Físico' : 'Especial'} · {m.power}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-900/60 px-2.5 py-1.5">
              {mon.heldItemId ? (<><img src={getItem(mon.heldItemId).sprite} alt="" className="w-6 h-6" style={{ imageRendering: 'pixelated' }} /><span className="text-xs flex-1 truncate">{getItem(mon.heldItemId).name}</span></>) : <span className="text-xs text-slate-500">Sin objeto equipado</span>}
            </div>
          </div>
        </div>
      )}
      {compare && mon && <CompareModal team={team} baseUid={mon.uid} onClose={() => setCompare(false)} />}
    </div>
  )
}

function LeagueShop({ league, onEquip, onUnequip, onClose }: { league: LeagueState; onEquip: (uid: string, id: string) => void; onUnequip: (uid: string) => void; onClose: () => void }) {
  const [pick, setPick] = useState<string | null>(null) // itemId elegido para equipar
  const team = league.participants[league.playerIdx].team
  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm grid place-items-center p-3" onClick={onClose}>
      <div className="w-full max-w-md max-h-[92%] overflow-y-auto no-scrollbar rounded-3xl border border-slate-700 bg-slate-900 p-3 animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="font-extrabold inline-flex items-center gap-1.5"><Icon name="bag" className="w-5 h-5" /> Tienda (gratis)</div>
          <button className="text-slate-400 px-1" onClick={onClose}><Icon name="x" className="w-5 h-5" /></button>
        </div>
        <p className="text-[11px] text-slate-400 mb-2">Equipa objetos a tu equipo sin coste. Solo equipables.</p>

        {/* Tu equipo: toca un Pokémon para equiparle el objeto elegido */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {team.map((m) => {
            const held = m.heldItemId ? getItem(m.heldItemId) : null
            return (
              <button key={m.uid} onClick={() => { if (pick) { onEquip(m.uid, pick); setPick(null) } }}
                className={`rounded-xl border p-1.5 flex flex-col items-center ${pick ? 'border-sky-400 active:scale-95' : 'border-slate-700'}`} style={{ background: 'rgba(15,23,42,0.6)' }}>
                <Sprite speciesId={m.speciesId} shiny={m.shiny} className="w-10 h-10 object-contain" />
                <div className="text-[9px] truncate w-full text-center">{getSpecies(m.speciesId).displayName}</div>
                {held ? (
                  <span className="mt-0.5 inline-flex items-center gap-0.5 text-[8px] text-amber-200">
                    {held.sprite && <img src={held.sprite} alt="" className="w-3 h-3" />}
                    <span className="truncate max-w-[3.5rem]">{held.name}</span>
                    <span onClick={(e) => { e.stopPropagation(); onUnequip(m.uid) }} className="text-rose-300 font-black ml-0.5">×</span>
                  </span>
                ) : <span className="text-[8px] text-slate-500 mt-0.5">sin objeto</span>}
              </button>
            )
          })}
        </div>

        {pick && <div className="text-[11px] text-sky-200 mb-1.5">Elegido <b>{getItem(pick).name}</b> · toca un Pokémon para equipárselo. <button className="underline" onClick={() => setPick(null)}>cancelar</button></div>}

        <div className="grid grid-cols-2 gap-2">
          {EQUIPPABLES.map((id) => {
            const it = getItem(id)
            return (
              <button key={id} onClick={() => setPick(id)} className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 text-left active:scale-[0.97] ${pick === id ? 'border-sky-400 bg-sky-600/20' : 'border-slate-700 bg-slate-800'}`}>
                {it.sprite && <img src={it.sprite} alt="" className="w-6 h-6 shrink-0" style={{ imageRendering: 'pixelated' }} />}
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold truncate">{it.name}</div>
                  <div className="text-[9px] text-slate-400 line-clamp-2">{it.description}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
