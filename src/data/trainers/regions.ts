import type { TrainerData } from '@/types'
import { KANTO_GYM_LEADERS, KANTO_ELITE_FOUR, buildKantoChampion } from './gen1'
import { JOHTO_GYM_LEADERS, JOHTO_ELITE_FOUR, buildJohtoChampion } from './gen2'

const SHOWDOWN = (s: string) => `https://play.pokemonshowdown.com/sprites/trainers/${s}.png`

export interface RegionData {
  gen: number
  /** Desplazamiento de medalla en el spritesheet de badges de PokeAPI (Kanto=0, Johto=8). */
  badgeBase: number
  rival: { name: string; sprite: string }
  /** Equipo de apoyo del rival en sus 3 apariciones (sin contar su inicial). */
  rivalExtras: number[][]
  gymLeaders: TrainerData[]
  eliteFour: TrainerData[]
  buildChampion: (rivalFinalId: number) => TrainerData
}

const REGIONS: Record<number, RegionData> = {
  1: {
    gen: 1, badgeBase: 0,
    rival: { name: 'Rival', sprite: SHOWDOWN('blue') },
    rivalExtras: [[16, 19], [18, 64], [18, 65, 112]],
    gymLeaders: KANTO_GYM_LEADERS, eliteFour: KANTO_ELITE_FOUR,
    buildChampion: buildKantoChampion,
  },
  2: {
    gen: 2, badgeBase: 8,
    rival: { name: 'Silver', sprite: SHOWDOWN('silver') },
    rivalExtras: [[215, 16], [81, 93], [215, 42, 64]],
    gymLeaders: JOHTO_GYM_LEADERS, eliteFour: JOHTO_ELITE_FOUR,
    buildChampion: buildJohtoChampion,
  },
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
