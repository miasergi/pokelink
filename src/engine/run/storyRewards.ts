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
    if (out.length < MAX_PARTY) out.push(lapras)
    else {
      // Equipo lleno: el Lapras ocupa el sitio del miembro de menor nivel.
      const idx = out.reduce((lo, m, i) => (m.level < out[lo].level ? i : lo), 0)
      out[idx] = lapras
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
