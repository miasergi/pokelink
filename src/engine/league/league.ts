import type { PokemonInstance } from '@/types'
import { RNG } from '@/utils/rng'
import { runBattle } from '@/engine/battle/battleEngine'
import { leagueTrainerPool, buildLeagueTeam, scaleToLv100 } from './roster'
import type { LeagueGroup, LeagueMatch, LeagueParticipant, LeagueState, KnockoutMatch, MatchOutcome, Standing } from './types'

const GROUPS = 8
const GROUP_SIZE = 4

/** Calendario todos-contra-todos de un grupo de 4 (3 jornadas de 2 partidos). */
function roundRobin(members: number[]): LeagueMatch[] {
  const [m0, m1, m2, m3] = members
  const mk = (a: number, b: number, md: number): LeagueMatch => ({ a, b, matchday: md, played: false })
  return [
    mk(m0, m1, 0), mk(m2, m3, 0),
    mk(m0, m2, 1), mk(m1, m3, 1),
    mk(m0, m3, 2), mk(m1, m2, 2),
  ]
}

/** Crea un torneo de 32 (jugador + 31 rivales). El equipo del jugador se sube a Nv.100. */
export function createLeague(playerName: string, playerSprite: string, playerTeam: PokemonInstance[], seed: number): LeagueState {
  const rng = new RNG(seed)
  const pool = rng.shuffle(leagueTrainerPool().slice())
  const chosen = pool.slice(0, 31)

  const participants: LeagueParticipant[] = []
  participants.push({ id: 'player', name: playerName || 'Tú', sprite: playerSprite, isPlayer: true, team: playerTeam.slice(0, 6).map(scaleToLv100) })
  for (const def of chosen) {
    participants.push({ id: def.id, name: def.name, sprite: def.sprite, isPlayer: false, team: buildLeagueTeam(def, rng) })
  }

  // Reparte los 32 en 8 grupos de 4 (el jugador cae en un grupo al azar).
  const order = rng.shuffle(participants.map((_, i) => i))
  const groups: LeagueGroup[] = []
  for (let g = 0; g < GROUPS; g++) {
    const members = order.slice(g * GROUP_SIZE, g * GROUP_SIZE + GROUP_SIZE)
    groups.push({ idx: g, members, matches: roundRobin(members) })
  }

  return {
    seed, rngState: rng.getState(), participants, playerIdx: 0,
    groups, phase: 'groups', matchday: 0, knockout: [], koRound: 0, startedAt: seed,
  }
}

function withRng<T>(state: LeagueState, fn: (rng: RNG) => T): T {
  const rng = new RNG(state.rngState)
  const out = fn(rng)
  state.rngState = rng.getState()
  return out
}

/** Simula un combate IA vs IA y devuelve ganador + kills netas (debilitados rival − propios). */
export function simulateMatch(teamA: PokemonInstance[], teamB: PokemonInstance[], rng: RNG): MatchOutcome {
  const seed = rng.int(1, 2 ** 30)
  const res = runBattle({ playerTeam: structuredClone(teamA), enemyTeam: structuredClone(teamB), seed, isBoss: true })
  let fa = 0, fb = 0
  for (const e of res.events) if (e.kind === 'faint') { if (e.side === 'player') fa++; else fb++ }
  const winner: 'a' | 'b' = res.winner === 'player' ? 'a' : 'b'
  return { winner, killsA: fb - fa, killsB: fa - fb }
}

function applyOutcome(m: LeagueMatch, o: MatchOutcome): void {
  m.played = true
  m.winner = o.winner
  m.killsA = o.killsA
  m.killsB = o.killsB
}

/** Combate de grupos del jugador en la jornada actual (o null si no le toca / no está en grupos). */
export function playerGroupMatch(state: LeagueState): LeagueMatch | null {
  if (state.phase !== 'groups') return null
  const g = state.groups.find((gr) => gr.members.includes(state.playerIdx))
  if (!g) return null
  return g.matches.find((m) => m.matchday === state.matchday && (m.a === state.playerIdx || m.b === state.playerIdx) && !m.played) ?? null
}

/** Registra el resultado del combate del jugador (desde la UI de batalla). */
export function recordGroupResult(state: LeagueState, match: LeagueMatch, outcome: MatchOutcome): void {
  void state
  applyOutcome(match, outcome)
}

/** Simula el resto de combates de la jornada actual y avanza. Si terminan las 3
 *  jornadas, monta las eliminatorias. */
export function advanceMatchday(state: LeagueState): void {
  withRng(state, (rng) => {
    for (const g of state.groups) {
      for (const m of g.matches) {
        if (m.matchday !== state.matchday || m.played) continue
        applyOutcome(m, simulateMatch(state.participants[m.a].team, state.participants[m.b].team, rng))
      }
    }
  })
  state.matchday++
  if (state.matchday >= GROUP_SIZE - 1) buildKnockout(state)
}

function headToHead(group: LeagueGroup, a: number, b: number): number {
  let pa = 0, pb = 0, ka = 0, kb = 0
  for (const m of group.matches) {
    if (!m.played) continue
    if (m.a === a && m.b === b) { if (m.winner === 'a') pa++; else pb++; ka += m.killsA ?? 0; kb += m.killsB ?? 0 }
    else if (m.a === b && m.b === a) { if (m.winner === 'a') pb++; else pa++; kb += m.killsA ?? 0; ka += m.killsB ?? 0 }
  }
  if (pa !== pb) return pb - pa
  if (ka !== kb) return kb - ka
  return 0
}

/** Clasificación ordenada de un grupo (puntos → kills → enfrentamiento directo →
 *  el jugador queda peor en triple empate). */
export function groupStandings(state: LeagueState, groupIdx: number): Standing[] {
  const g = state.groups[groupIdx]
  const stats = new Map<number, Standing>()
  for (const p of g.members) stats.set(p, { participant: p, played: 0, won: 0, points: 0, kills: 0 })
  for (const m of g.matches) {
    if (!m.played) continue
    const sa = stats.get(m.a)!, sb = stats.get(m.b)!
    sa.played++; sb.played++
    sa.kills += m.killsA ?? 0; sb.kills += m.killsB ?? 0
    if (m.winner === 'a') { sa.won++; sa.points++ } else { sb.won++; sb.points++ }
  }
  const arr = g.members.map((p) => stats.get(p)!)
  arr.sort((x, y) => {
    if (x.points !== y.points) return y.points - x.points
    if (x.kills !== y.kills) return y.kills - x.kills
    const h = headToHead(g, x.participant, y.participant)
    if (h !== 0) return h
    if (x.participant === state.playerIdx) return 1
    if (y.participant === state.playerIdx) return -1
    return x.participant - y.participant
  })
  return arr
}

/** Monta los octavos: 1º(GrupoN) vs 2º(Grupo N+1). */
function buildKnockout(state: LeagueState): void {
  const firsts: number[] = [], seconds: number[] = []
  for (let g = 0; g < GROUPS; g++) {
    const st = groupStandings(state, g)
    firsts[g] = st[0].participant
    seconds[g] = st[1].participant
  }
  const r16: KnockoutMatch[] = []
  for (let i = 0; i < GROUPS; i++) r16.push({ a: firsts[i], b: seconds[(i + 1) % GROUPS], played: false })
  state.knockout = [{ name: 'Octavos', matches: r16 }]
  state.phase = 'knockout'
  state.koRound = 0
}

const KO_NAMES = ['Octavos', 'Cuartos', 'Semifinal', 'Final']

/** Combate eliminatorio del jugador en la ronda actual (o null si ya está fuera). */
export function playerKnockoutMatch(state: LeagueState): KnockoutMatch | null {
  if (state.phase !== 'knockout') return null
  const round = state.knockout[state.koRound]
  if (!round) return null
  return round.matches.find((m) => (m.a === state.playerIdx || m.b === state.playerIdx) && !m.played) ?? null
}

export function recordKnockoutResult(state: LeagueState, match: KnockoutMatch, winner: number): void {
  void state
  match.played = true
  match.winner = winner
}

/** Simula el resto de la ronda eliminatoria y monta la siguiente (o corona campeón). */
export function advanceKnockoutRound(state: LeagueState): void {
  const round = state.knockout[state.koRound]
  withRng(state, (rng) => {
    for (const m of round.matches) {
      if (m.played || m.a == null || m.b == null) continue
      const o = simulateMatch(state.participants[m.a].team, state.participants[m.b].team, rng)
      m.played = true
      m.winner = o.winner === 'a' ? m.a : m.b
    }
  })
  const winners = round.matches.map((m) => m.winner!).filter((w) => w != null)
  if (winners.length <= 1) { state.phase = 'champion'; return }
  const next: KnockoutMatch[] = []
  for (let i = 0; i < winners.length; i += 2) next.push({ a: winners[i], b: winners[i + 1] ?? null, played: false })
  state.knockout.push({ name: KO_NAMES[Math.min(state.koRound + 1, KO_NAMES.length - 1)], matches: next })
  state.koRound++
}

/** Campeón del torneo (índice de participante) si ya está decidido. */
export function leagueChampion(state: LeagueState): number | null {
  if (state.phase !== 'champion') return null
  const last = state.knockout[state.knockout.length - 1]
  return last?.matches[0]?.winner ?? null
}

const STAGE_ORDER = ['Fase de grupos', 'Octavos', 'Cuartos', 'Semifinal', 'Final', 'Campeón']
export function stageRank(stage: string): number {
  return STAGE_ORDER.indexOf(stage)
}

/** ¿El jugador ha perdido algún combate del torneo? */
export function playerLostAny(state: LeagueState): boolean {
  const pid = state.playerIdx
  for (const g of state.groups) for (const m of g.matches) {
    if (!m.played) continue
    if (m.a === pid && m.winner === 'b') return true
    if (m.b === pid && m.winner === 'a') return true
  }
  for (const r of state.knockout) for (const m of r.matches) {
    if (!m.played || m.winner == null) continue
    if ((m.a === pid || m.b === pid) && m.winner !== pid) return true
  }
  return false
}

/** Mejor fase alcanzada por el jugador (para récords). */
export function playerBestStage(state: LeagueState): string {
  const pid = state.playerIdx
  if (state.phase === 'champion' && leagueChampion(state) === pid) return 'Campeón'
  let bestIdx = -1
  for (const r of state.knockout) {
    if (r.matches.some((m) => m.a === pid || m.b === pid)) bestIdx = Math.max(bestIdx, STAGE_ORDER.indexOf(r.name))
  }
  return bestIdx >= 0 ? STAGE_ORDER[bestIdx] : 'Fase de grupos'
}

/** Logros de Liga conseguidos según el estado actual del torneo. */
export function leagueAchievements(state: LeagueState): string[] {
  const pid = state.playerIdx
  const out: string[] = []
  if (state.knockout[0]?.matches.some((m) => m.a === pid || m.b === pid)) out.push('league_groups')
  for (const r of state.knockout) {
    if (!r.matches.some((m) => m.a === pid || m.b === pid)) continue
    if (r.name === 'Semifinal') out.push('league_semis')
    if (r.name === 'Final') out.push('league_finalist')
  }
  if (state.phase === 'champion' && leagueChampion(state) === pid) {
    out.push('league_champion')
    if (!playerLostAny(state)) out.push('league_flawless')
  }
  return out
}
