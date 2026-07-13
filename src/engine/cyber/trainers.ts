// Entrenadores del modo Cyber PokéBall: los líderes/rival/Alto Mando/campeón
// REALES de la región elegida (registro de regions.ts), adaptados al formato
// del juguete: equipos de máximo 3 Pokémon y curva de niveles propia (8→50).
import type { PokemonInstance, TrainerData } from '@/types'
import { encounterPool, getSpecies } from '@/data'
import { getRegion, buildRival } from '@/data/trainers/regions'
import { STARTERS_BY_GEN } from '@/data/starters'
import { createInstance } from '@/engine/team/instance'
import { evolutionAtLevel, getFinalEvolution } from '@/engine/team/evolution'
import { RNG } from '@/utils/rng'
import type { CyberTrainerInfo } from './types'

/** Nivel del ace de cada gimnasio (1..8) en la aventura Cyber. */
export const GYM_LEVELS = [8, 12, 16, 20, 25, 29, 33, 38]
/** El rival aparece con 2, 5 y 8 medallas. */
export const RIVAL_BADGES = [2, 5, 8]
export const RIVAL_LEVELS = [14, 27, 40]
export const ELITE_LEVELS = [42, 43, 45, 46]
export const CHAMPION_LEVEL = 50

/** Nivel de los salvajes según medallas (con algo de varianza). */
export function wildLevel(badges: number, rng: RNG): number {
  return Math.max(2, Math.min(42, 3 + badges * 4 + rng.int(-1, 2)))
}

/** Instancia el equipo de un TrainerData: se queda con los 3 de MAYOR nivel y
 *  reescala al ace objetivo (los demás -2/-4), manteniendo sus especies reales. */
function instantiateTeam(data: TrainerData, aceLevel: number, rng: RNG): PokemonInstance[] {
  const specs = [...data.team].sort((a, b) => a.level - b.level).slice(-3)
  const n = specs.length
  return specs.map((spec, i) => {
    const level = Math.max(2, aceLevel - (n - 1 - i) * 2)
    return createInstance(spec.speciesId, level, rng, { shinyChance: 0 })
  })
}

export function buildGymBattle(gen: number, gymIndex: number, rng: RNG): CyberTrainerInfo {
  const leader = getRegion(gen).gymLeaders[gymIndex]
  return {
    kind: 'gym',
    name: leader.name,
    sprite: leader.sprite,
    team: instantiateTeam(leader, GYM_LEVELS[gymIndex], rng),
    money: 300 + GYM_LEVELS[gymIndex] * 25,
    progressIndex: gymIndex,
    quote: leader.quote,
  }
}

/** El rival elige el inicial que GANA al del jugador (triada planta→fuego→agua). */
export function rivalStarterId(gen: number, playerStarterId: number): number {
  const triad = STARTERS_BY_GEN[gen] ?? STARTERS_BY_GEN[1]
  const i = triad.indexOf(playerStarterId)
  return i >= 0 ? triad[(i + 1) % 3] : triad[(Math.abs(playerStarterId) || 0) % 3]
}

export function buildRivalBattle(gen: number, stage: number, playerStarterId: number, rng: RNG): CyberTrainerInfo {
  const region = getRegion(gen)
  const level = RIVAL_LEVELS[stage] ?? RIVAL_LEVELS[RIVAL_LEVELS.length - 1]
  const starter = evolutionAtLevel(rivalStarterId(gen, playerStarterId), level)
  // buildRival monta ace + apoyo; nos quedamos con los 3 últimos (los mejores).
  const data = buildRival(region, starter, level, (region.rivalExtras[stage] ?? []).slice(0, 2))
  return {
    kind: 'rival',
    name: region.rival.name,
    sprite: region.rival.sprite,
    team: data.team.slice(-3).map((s) => createInstance(s.speciesId, s.level, rng, { shinyChance: 0 })),
    money: data.reward.money,
    progressIndex: stage,
    quote: data.quote,
  }
}

export function buildEliteBattle(gen: number, index: number, rng: RNG): CyberTrainerInfo {
  const member = getRegion(gen).eliteFour[index]
  return {
    kind: 'elite',
    name: member.name,
    sprite: member.sprite,
    team: instantiateTeam(member, ELITE_LEVELS[index], rng),
    money: 1200 + index * 300,
    progressIndex: index,
    quote: member.quote,
  }
}

export function buildChampionBattle(gen: number, playerStarterId: number, rng: RNG): CyberTrainerInfo {
  const region = getRegion(gen)
  const rivalFinal = getFinalEvolution(rivalStarterId(gen, playerStarterId))
  const data = region.buildChampion(rivalFinal)
  return {
    kind: 'champion',
    name: data.name,
    sprite: data.sprite,
    team: instantiateTeam(data, CHAMPION_LEVEL, rng),
    money: 5000,
    quote: data.quote,
  }
}

const MINOR_NAMES = ['JOVEN', 'CHICA', 'PESCADOR', 'MONTAÑERO', 'CIENTÍFICO', 'GUARDIA', 'DOMADOR', 'CAMPISTA']

export function buildMinorTrainer(gen: number, badges: number, rng: RNG): CyberTrainerInfo {
  const pool = cyberWildPool(gen, badges)
  const size = badges >= 3 ? 2 : 1
  const lvl = wildLevel(badges, rng) + 1
  const team = Array.from({ length: size }, (_, i) =>
    createInstance(rng.pick(pool).id, Math.max(2, lvl - i), rng, { shinyChance: 0 }))
  return {
    kind: 'minor',
    name: rng.pick(MINOR_NAMES),
    team,
    money: 80 + lvl * 12,
    quote: '¡Eh! ¡Nuestras miradas se han cruzado!',
  }
}

/** Team Rocket: pareja de tipo veneno/siniestro si la región los tiene. */
export function buildRocketBattle(gen: number, badges: number, rng: RNG): CyberTrainerInfo {
  const pool = encounterPool(gen)
  const villains = pool.filter((s) => s.types.some((t) => t === 'poison' || t === 'dark'))
  const source = villains.length >= 2 ? villains : pool
  const lvl = wildLevel(badges, rng) + 2
  const team = rng.sample(source, 2).map((s, i) => createInstance(s.id, Math.max(2, lvl - i), rng, { shinyChance: 0 }))
  return {
    kind: 'rocket',
    name: 'TEAM ROCKET',
    team,
    money: 200 + lvl * 15,
    quote: '¡Prepárate para los problemas!',
  }
}

/** Pool de salvajes del modo: sin legendarios y con techo de potencia (BST) que
 *  sube con las medallas, para no cruzarte un Dragonite en la ruta 1. */
export function cyberWildPool(gen: number, badges: number) {
  const cap = 320 + badges * 45
  const bst = (s: ReturnType<typeof getSpecies>) =>
    s.baseStats.hp + s.baseStats.atk + s.baseStats.def + s.baseStats.spa + s.baseStats.spd + s.baseStats.spe
  const pool = encounterPool(gen).filter((s) => bst(s) <= cap)
  return pool.length ? pool : encounterPool(gen)
}
