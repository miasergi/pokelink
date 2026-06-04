import type { TrainerData } from '@/types'
import { KANTO_GYM_LEADERS, KANTO_ELITE_FOUR, buildKantoChampion } from './gen1'
import { JOHTO_GYM_LEADERS, JOHTO_ELITE_FOUR, buildJohtoChampion } from './gen2'
import { HOENN_GYM_LEADERS, HOENN_ELITE_FOUR, buildHoennChampion } from './gen3'
import { SINNOH_GYM_LEADERS, SINNOH_ELITE_FOUR, buildSinnohChampion } from './gen4'
import { UNOVA_GYM_LEADERS, UNOVA_ELITE_FOUR, buildUnovaChampion } from './gen5'
import { KALOS_GYM_LEADERS, KALOS_ELITE_FOUR, buildKalosChampion } from './gen6'
import { ALOLA_GYM_LEADERS, ALOLA_ELITE_FOUR, buildAlolaChampion } from './gen7'
import { GALAR_GYM_LEADERS, GALAR_ELITE_FOUR, buildGalarChampion } from './gen8'
import { PALDEA_GYM_LEADERS, PALDEA_ELITE_FOUR, buildPaldeaChampion } from './gen9'

const SHOWDOWN = (s: string) => `https://play.pokemonshowdown.com/sprites/trainers/${s}.png`

export interface RegionData {
  gen: number
  /** Desplazamiento de medalla en el spritesheet de badges de PokeAPI ((gen-1)*8). */
  badgeBase: number
  rival: { name: string; sprite: string }
  /** Equipo de apoyo del rival en sus 3 apariciones (sin contar su inicial). */
  rivalExtras: number[][]
  gymLeaders: TrainerData[]
  eliteFour: TrainerData[]
  buildChampion: (rivalFinalId: number) => TrainerData
}

const REGIONS: Record<number, RegionData> = {
  1: { gen: 1, badgeBase: 0, rival: { name: 'Rival', sprite: SHOWDOWN('blue') }, rivalExtras: [[16, 19], [18, 64], [18, 65, 112]], gymLeaders: KANTO_GYM_LEADERS, eliteFour: KANTO_ELITE_FOUR, buildChampion: buildKantoChampion },
  2: { gen: 2, badgeBase: 8, rival: { name: 'Silver', sprite: SHOWDOWN('silver') }, rivalExtras: [[215, 16], [81, 93], [215, 42, 64]], gymLeaders: JOHTO_GYM_LEADERS, eliteFour: JOHTO_ELITE_FOUR, buildChampion: buildJohtoChampion },
  3: { gen: 3, badgeBase: 16, rival: { name: 'Bruno/Aura', sprite: SHOWDOWN('brendan') }, rivalExtras: [[263, 278], [286, 357], [330, 334, 376]], gymLeaders: HOENN_GYM_LEADERS, eliteFour: HOENN_ELITE_FOUR, buildChampion: buildHoennChampion },
  4: { gen: 4, badgeBase: 24, rival: { name: 'Barry', sprite: SHOWDOWN('barry') }, rivalExtras: [[396, 399], [397, 415], [398, 405, 462]], gymLeaders: SINNOH_GYM_LEADERS, eliteFour: SINNOH_ELITE_FOUR, buildChampion: buildSinnohChampion },
  5: { gen: 5, badgeBase: 32, rival: { name: 'Hilberto', sprite: SHOWDOWN('hilbert') }, rivalExtras: [[504, 519], [507, 522], [521, 553, 537]], gymLeaders: UNOVA_GYM_LEADERS, eliteFour: UNOVA_ELITE_FOUR, buildChampion: buildUnovaChampion },
  6: { gen: 6, badgeBase: 40, rival: { name: 'Calem', sprite: SHOWDOWN('calem') }, rivalExtras: [[661, 659], [662, 667], [663, 695, 697]], gymLeaders: KALOS_GYM_LEADERS, eliteFour: KALOS_ELITE_FOUR, buildChampion: buildKalosChampion },
  7: { gen: 7, badgeBase: 48, rival: { name: 'Tilo', sprite: SHOWDOWN('hau') }, rivalExtras: [[731, 734], [738, 757], [745, 462, 628]], gymLeaders: ALOLA_GYM_LEADERS, eliteFour: ALOLA_ELITE_FOUR, buildChampion: buildAlolaChampion },
  8: { gen: 8, badgeBase: 56, rival: { name: 'Hop', sprite: SHOWDOWN('hop') }, rivalExtras: [[819, 821], [831, 845], [823, 884, 6]], gymLeaders: GALAR_GYM_LEADERS, eliteFour: GALAR_ELITE_FOUR, buildChampion: buildGalarChampion },
  9: { gen: 9, badgeBase: 64, rival: { name: 'Nemona', sprite: SHOWDOWN('nemona') }, rivalExtras: [[921, 915], [948, 957], [983, 970, 713]], gymLeaders: PALDEA_GYM_LEADERS, eliteFour: PALDEA_ELITE_FOUR, buildChampion: buildPaldeaChampion },
}

export function getRegion(gen: number): RegionData {
  return REGIONS[gen] ?? REGIONS[1]
}

export function regionReady(gen: number): boolean {
  return gen in REGIONS
}

/** Construye un combate de rival con su inicial (evolucionado al nivel) + apoyo. */
export function buildRival(
  region: RegionData, midOrFinalId: number, level: number, extras: number[],
): TrainerData {
  const team = extras.map((speciesId, i) => ({ speciesId, level: Math.max(5, level - 2 - i * 2) }))
  team.push({ speciesId: midOrFinalId, level })
  return {
    id: `rival-${level}`, name: region.rival.name, trainerClass: 'rival',
    sprite: region.rival.sprite, reward: { money: 800 + level * 30 },
    quote: '¡Te demostraré quién es el mejor entrenador!',
    team,
  }
}
