import type { PokemonInstance } from '@/types'
import { getItem, TYPE_BOOST_BY_ID } from '@/data/items'
import { getSpecies, getMove, getMegaForms } from '@/data'
import { effectiveTier } from './leveling'

function canEvolveTwice(speciesId: number): boolean {
  return getSpecies(speciesId).evolutions.some((e) => getSpecies(e.toId).evolutions.length > 0)
}

/** ¿El objeto `itemId` tendría ALGÚN efecto/uso sobre `mon`?
 *  Para mostrar atenuados los objetos/Pokémon sin efecto y avisar al jugador.
 *  `cap` = tope de nivel (Nuzlocke); por defecto 100. */
export function itemHasEffect(itemId: string, mon: PokemonInstance, cap = 100): boolean {
  const item = getItem(itemId)
  switch (item.category) {
    case 'heal':
      return mon.currentHp > 0 && (mon.currentHp < mon.stats.hp || mon.status !== 'none')
    case 'revive':
      return mon.currentHp <= 0
    case 'battle':
      if (itemId === 'upgrade') return effectiveTier(mon) < 2
      if (itemId === 'rare-candy' || itemId === 'super-candy') return mon.level < cap
      return true
    case 'evolution':
      if (itemId === 'mega-stone') return getMegaForms(mon.speciesId).length > 0
      // piedra evolutiva: bloqueada por Mineraluz/Supermineral
      return getSpecies(mon.speciesId).evolutions.length > 0 &&
        mon.heldItemId !== 'eviolite' && mon.heldItemId !== 'super-mineral'
    case 'held': {
      if (itemId === 'eviolite') return getSpecies(mon.speciesId).evolutions.length > 0
      if (itemId === 'super-mineral') return canEvolveTwice(mon.speciesId)
      const boostType = TYPE_BOOST_BY_ID[itemId]
      if (boostType) return mon.moves.some((m) => getMove(m.moveId).type === boostType)
      return true // resto de equipables: siempre aportan algo
    }
    default:
      return false // 'special' (se usan solos, no sobre un Pokémon)
  }
}

export interface StatMods { hp: number; off: number; def: number; spd: number; spe: number }

/** Multiplicadores que el objeto equipado aplica a las stats VISIBLES (para
 *  mostrarlas actualizadas y colorear mejoras/empeoramientos). `off` = stat
 *  ofensiva (Ataque o At. Especial, la que use el Pokémon). */
export function heldStatMods(mon: PokemonInstance): StatMods {
  const m: StatMods = { hp: 1, off: 1, def: 1, spd: 1, spe: 1 }
  const id = mon.heldItemId
  if (!id) return m
  if (id === 'super-mineral' && canEvolveTwice(mon.speciesId)) { m.hp = 2; m.off = 2; m.def = 2; m.spd = 2; m.spe = 2; return m }
  if (id === 'eviolite' && getSpecies(mon.speciesId).evolutions.length > 0) { m.def *= 1.5; m.spd *= 1.5 }
  if (id === 'assault-vest') { m.def *= 1.5; m.spd *= 1.5 }
  if (id === 'choice-band' || id === 'life-orb') m.off *= 1.3
  if (id === 'iron-ball') { m.off *= 1.5; m.spe *= 0.8 }
  if (id === 'quick-scarf') m.spe *= 1.3
  const boostType = TYPE_BOOST_BY_ID[id]
  if (boostType && mon.moves.some((mv) => getMove(mv.moveId).type === boostType)) m.off *= 1.5
  return m
}

/** Motivo corto de por qué no tiene efecto (para el aviso). */
export function noEffectReason(itemId: string, mon: PokemonInstance, cap = 100): string {
  const item = getItem(itemId)
  if (item.category === 'heal') return mon.currentHp <= 0 ? 'Está debilitado (usa Revivir)' : 'Ya tiene los PS al máximo'
  if (item.category === 'revive') return 'No está debilitado'
  if (itemId === 'upgrade') return 'Ya tiene la potencia máxima (120)'
  if (itemId === 'rare-candy' || itemId === 'super-candy') return mon.level >= cap ? 'Ya está en el tope de nivel' : ''
  if (itemId === 'mega-stone') return 'No puede megaevolucionar'
  if (item.category === 'evolution' && (mon.heldItemId === 'eviolite' || mon.heldItemId === 'super-mineral')) return 'No evoluciona mientras lleve ese mineral'
  if (item.category === 'evolution') return 'No puede evolucionar'
  if (itemId === 'eviolite') return 'Ya no puede evolucionar'
  if (itemId === 'super-mineral') return 'No es una primera etapa evolutiva'
  if (TYPE_BOOST_BY_ID[itemId]) return 'No tiene ataques de ese tipo'
  return 'No tendría efecto'
}
