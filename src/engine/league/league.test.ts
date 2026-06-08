import { describe, it, expect } from 'vitest'
import { RNG } from '@/utils/rng'
import { createInstance } from '@/engine/team/instance'
import { getSpecies, getMove } from '@/data'
import {
  createLeague, simulateMatch, playerGroupMatch, recordGroupResult, advanceMatchday,
  groupStandings, playerKnockoutMatch, recordKnockoutResult, advanceKnockoutRound, leagueChampion,
} from './league'

function playerTeam() {
  const rng = new RNG(7)
  return [6, 9, 3, 25, 143, 130].map((id) => createInstance(id, 80, rng))
}

describe('Liga Pokémon — estructura', () => {
  it('crea 32 participantes en 8 grupos de 4; el jugador está incluido', () => {
    const st = createLeague('Tú', '', playerTeam(), 123)
    expect(st.participants).toHaveLength(32)
    expect(st.groups).toHaveLength(8)
    for (const g of st.groups) expect(g.members).toHaveLength(4)
    // cada participante en exactamente un grupo
    const all = st.groups.flatMap((g) => g.members).sort((a, b) => a - b)
    expect(all).toEqual(Array.from({ length: 32 }, (_, i) => i))
    expect(st.participants[st.playerIdx].isPlayer).toBe(true)
  })

  it('cada rival lleva 6 Pokémon a Nv.100, con 1 mega y 1 Movimiento Z', () => {
    const st = createLeague('Tú', '', playerTeam(), 123)
    for (const p of st.participants) {
      if (p.isPlayer) continue
      expect(p.team).toHaveLength(6)
      expect(p.team.every((m) => m.level === 100)).toBe(true)
      // Permamega: un miembro ya está en su forma mega y SIN Megapiedra.
      expect(p.team.some((m) => getSpecies(m.speciesId).isMega)).toBe(true)
      expect(p.team.every((m) => m.heldItemId !== 'mega-stone')).toBe(true)
      const hasZ = p.team.some((m) => m.moves.some((mv) => getMove(mv.moveId).power >= 160))
      expect(hasZ).toBe(true)
    }
    // el equipo del jugador se sube a Nv.100
    expect(st.participants[st.playerIdx].team.every((m) => m.level === 100)).toBe(true)
  })
})

describe('Liga Pokémon — torneo completo', () => {
  it('se juega entero (grupos + eliminatorias) hasta coronar un campeón', () => {
    const st = createLeague('Tú', '', playerTeam(), 99)
    const rng = new RNG(1)
    // Fase de grupos: 3 jornadas. El combate del jugador se "juega" simulándolo.
    for (let md = 0; md < 3; md++) {
      const pm = playerGroupMatch(st)
      if (pm) recordGroupResult(st, pm, simulateMatch(st.participants[pm.a].team, st.participants[pm.b].team, rng))
      advanceMatchday(st)
    }
    expect(st.phase).toBe('knockout')
    // Cada grupo tiene una clasificación completa de 4.
    for (let g = 0; g < 8; g++) expect(groupStandings(st, g)).toHaveLength(4)
    // Eliminatorias hasta el campeón.
    let guard = 0
    while (st.phase === 'knockout' && guard++ < 10) {
      const km = playerKnockoutMatch(st)
      if (km && km.a != null && km.b != null) {
        const o = simulateMatch(st.participants[km.a].team, st.participants[km.b].team, rng)
        recordKnockoutResult(st, km, o.winner === 'a' ? km.a : km.b)
      }
      advanceKnockoutRound(st)
    }
    expect(st.phase).toBe('champion')
    expect(leagueChampion(st)).not.toBeNull()
  })
})
