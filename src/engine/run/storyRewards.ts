import type { PokemonInstance } from '@/types'
import { createInstance } from '@/engine/team/instance'
import { refreshMoves } from '@/engine/team/leveling'
import { RNG } from '@/utils/rng'
import { STORY_SONORO_TYPES } from '@/data/story/experiments'
import { MAX_PARTY } from './party'

/**
 * Recompensas narrativas del Modo Historia al COMPLETAR un capítulo. Se aplican
 * sobre el equipo que se guarda para la continuidad (storyTeams):
 *  - Cap. 1: el Capitán te regala su LAPRAS (aún sano: agua/hielo).
 *  - Cap. 3: las cubas de bioacústica despiertan el gen de tu Lapras, que pasa
 *    a ser de tipo Agua/Sonoro (el momento «le pasa algo» de la historia).
 */
export function applyStoryChapterRewards(
  chapter: number, team: PokemonInstance[], seed: number,
): PokemonInstance[] {
  const out = [...team]
  if (chapter === 1) {
    const lapras = createInstance(131, 13, new RNG(seed + 131), { shinyChance: 0 })
    lapras.nickname = 'Lapras del Capitán'
    lapras.locked = true // regalo del Capitán: intransferible
    if (out.length < MAX_PARTY) out.push(lapras)
    else {
      // Equipo lleno: el Lapras ocupa el sitio del miembro de menor nivel que
      // NO sea intransferible (nunca echa a tu compañero inicial).
      const candidates = out.map((m, i) => ({ m, i })).filter(({ m }) => !m.locked)
      if (candidates.length) {
        const lowest = candidates.reduce((lo, c) => (c.m.level < lo.m.level ? c : lo))
        out[lowest.i] = lapras
      }
    }
  }
  if (chapter === 3) {
    for (const mon of out) {
      if (mon.speciesId !== 131 || mon.typesOverride) continue
      mon.typesOverride = [...(STORY_SONORO_TYPES[131] ?? ['water', 'sonoro'])]
      refreshMoves(mon) // sus ataques pasan a Agua + Sonoro
    }
  }
  return out
}
