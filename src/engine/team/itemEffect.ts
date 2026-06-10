import type { PokemonInstance } from '@/types'
import { getItem, TYPE_BOOST_BY_ID } from '@/data/items'
import { getSpecies, getMove, getMegaForms, hasRegionalForm } from '@/data'
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
      if (itemId === 'super-upgrade') return effectiveTier(mon) < 2 // salta directo a potencia máx (120)
      if (itemId === 'z-move') return effectiveTier(mon) === 2 // requiere potencia máxima (120) antes
      if (itemId === 'rare-candy' || itemId === 'super-candy') return mon.level < cap
      if (itemId === 'metamorph') return hasRegionalForm(mon.speciesId)
      return true
    case 'evolution':
      if (itemId === 'mega-stone') return getMegaForms(mon.speciesId).length > 0
      // piedra evolutiva: bloqueada por Mineraluz/Supermineral
      return getSpecies(mon.speciesId).evolutions.length > 0 &&
        mon.heldItemId !== 'eviolite' && mon.heldItemId !== 'super-mineral'
    case 'held': {
      if (itemId === 'eviolite') return getSpecies(mon.speciesId).evolutions.length > 0
      if (itemId === 'super-mineral') return canEvolveTwice(mon.speciesId)
      // Gafas Elección: solo atacantes ESPECIALES; Cinta Fuerte: solo FÍSICOS
      // (la categoría del Pokémon es la de su mejor stat ofensivo: Atk >= SpA = físico).
      if (itemId === 'choice-specs') return mon.stats.spa > mon.stats.atk
      if (itemId === 'muscle-band') return mon.stats.atk >= mon.stats.spa
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
  if (id === 'choice-band') m.off *= 1.3
  if (id === 'life-orb') m.off *= 2 // Vidasfera: duplica el daño (a cambio de PS)
  if (id === 'choice-specs' && mon.stats.spa > mon.stats.atk) m.off *= 1.5
  if (id === 'muscle-band' && mon.stats.atk >= mon.stats.spa) m.off *= 1.5
  if (id === 'iron-ball') { m.off *= 1.75; m.spe *= 0.75 }
  const boostType = TYPE_BOOST_BY_ID[id]
  if (boostType && mon.moves.some((mv) => getMove(mv.moveId).type === boostType)) m.off *= 1.5
  return m
}

export interface StatRow { key: string; label: string; base: number; eff: number }

/** Stats VISIBLES con el efecto del objeto equipado aplicado (para el modal y el
 *  comparador). `off` = stat ofensiva (Ataque o At. Especial). */
export function displayStats(mon: PokemonInstance): StatRow[] {
  const m = heldStatMods(mon)
  const phys = mon.stats.atk >= mon.stats.spa
  const off = phys ? mon.stats.atk : mon.stats.spa
  return [
    { key: 'hp', label: 'PS', base: mon.stats.hp, eff: Math.round(mon.stats.hp * m.hp) },
    { key: 'off', label: phys ? 'Ataque' : 'At. Esp.', base: off, eff: Math.round(off * m.off) },
    { key: 'def', label: 'Defensa', base: mon.stats.def, eff: Math.round(mon.stats.def * m.def) },
    { key: 'spd', label: 'Def. Esp.', base: mon.stats.spd, eff: Math.round(mon.stats.spd * m.spd) },
    { key: 'spe', label: 'Velocidad', base: mon.stats.spe, eff: Math.round(mon.stats.spe * m.spe) },
  ]
}

/** Motivo corto de por qué no tiene efecto (para el aviso). */
export function noEffectReason(itemId: string, mon: PokemonInstance, cap = 100): string {
  const item = getItem(itemId)
  if (item.category === 'heal') return mon.currentHp <= 0 ? 'Está debilitado (usa Revivir)' : 'Ya tiene los PS al máximo'
  if (item.category === 'revive') return 'No está debilitado'
  if (itemId === 'upgrade' || itemId === 'super-upgrade') return 'Ya tiene la potencia máxima (120)'
  if (itemId === 'z-move') return effectiveTier(mon) >= 3 ? 'Ya tiene el Movimiento Z (160)' : 'Necesita estar a potencia máxima (120) primero'
  if (itemId === 'choice-specs') return 'Solo para Pokémon de categoría ESPECIAL'
  if (itemId === 'muscle-band') return 'Solo para Pokémon de categoría FÍSICA'
  if (itemId === 'rare-candy' || itemId === 'super-candy') return mon.level >= cap ? 'Ya está en el tope de nivel' : ''
  if (itemId === 'metamorph') return 'No tiene forma regional'
  if (itemId === 'mega-stone') return 'No puede megaevolucionar'
  if (item.category === 'evolution' && (mon.heldItemId === 'eviolite' || mon.heldItemId === 'super-mineral')) return 'No evoluciona mientras lleve ese mineral'
  if (item.category === 'evolution') return 'No puede evolucionar'
  if (itemId === 'eviolite') return 'Ya no puede evolucionar'
  if (itemId === 'super-mineral') return 'No es una primera etapa evolutiva'
  if (TYPE_BOOST_BY_ID[itemId]) return 'No tiene ataques de ese tipo'
  return 'No tendría efecto'
}
