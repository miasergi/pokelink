import type { PokemonInstance } from '@/types'
import { getSpecies } from '@/data'
import { fullHeal, isFainted } from '@/engine/team/instance'

export const MAX_PARTY = 6

export function partyHasRoom(party: PokemonInstance[]): boolean {
  return party.length < MAX_PARTY
}

export function anyAlive(party: PokemonInstance[]): boolean {
  return party.some((p) => !isFainted(p))
}

export function healParty(party: PokemonInstance[]): void {
  for (const p of party) fullHeal(p)
}

/** Aplica un objeto de curación/revivir a un Pokémon. Devuelve true si surtió efecto. */
export function applyHealItem(mon: PokemonInstance, itemId: string): boolean {
  switch (itemId) {
    case 'potion':
      return healHp(mon, Math.ceil(mon.stats.hp * 0.25))
    case 'super-potion':
      return healHp(mon, Math.ceil(mon.stats.hp * 0.5))
    case 'hyper-potion':
      return healHp(mon, Math.ceil(mon.stats.hp * 0.75))
    case 'max-potion':
      if (isFainted(mon)) return false
      if (mon.currentHp >= mon.stats.hp && mon.status === 'none') return false
      mon.currentHp = mon.stats.hp
      mon.status = 'none'
      for (const mv of mon.moves) mv.pp = mv.maxPp
      return true
    case 'revive':
      if (!isFainted(mon)) return false
      mon.currentHp = Math.floor(mon.stats.hp / 2)
      mon.status = 'none'
      return true
    case 'max-revive':
      if (!isFainted(mon)) return false
      mon.currentHp = mon.stats.hp
      mon.status = 'none'
      return true
    default:
      return false
  }
}

function healHp(mon: PokemonInstance, amount: number): boolean {
  if (isFainted(mon) || mon.currentHp >= mon.stats.hp) return false
  mon.currentHp = Math.min(mon.stats.hp, mon.currentHp + amount)
  return true
}

export function describeMon(mon: PokemonInstance): string {
  const s = getSpecies(mon.speciesId)
  return `${mon.nickname ?? s.displayName} Nv.${mon.level}`
}
