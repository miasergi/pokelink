import type { TrainerData } from '@/types'
import { STARTERS_BY_GEN } from '@/data/starters'

// ============================================================================
// Rosters reales de Kanto (Gen 1), inspirados en Pokémon Rojo/Azul/Amarillo,
// con niveles ligeramente ajustados para el ritmo roguelike.
// Los movesets se derivan del learnset al nivel (no hace falta moveIds).
// ============================================================================

// Retratos de entrenador desde Pokémon Showdown (PokeAPI no tiene entrenadores).
const TRAINER_SPRITE = (slug: string) =>
  `https://play.pokemonshowdown.com/sprites/trainers/${slug}.png`

export const KANTO_GYM_LEADERS: TrainerData[] = [
  {
    id: 'brock', name: 'Brock', trainerClass: 'gym', specialtyType: 'rock',
    sprite: TRAINER_SPRITE('brock'), reward: { money: 1400 },
    quote: 'Yo soy Brock. ¡Soy el líder del Gimnasio de Ciudad Plateada!',
    team: [
      { speciesId: 74, level: 12 }, // Geodude
      { speciesId: 95, level: 14 }, // Onix
    ],
  },
  {
    id: 'misty', name: 'Misty', trainerClass: 'gym', specialtyType: 'water',
    sprite: TRAINER_SPRITE('misty'), reward: { money: 2100 },
    quote: '¡Soy Misty! ¡Mi política es un ataque acuático total!',
    team: [
      { speciesId: 120, level: 18 }, // Staryu
      { speciesId: 121, level: 21 }, // Starmie
    ],
  },
  {
    id: 'surge', name: 'Tte. Surge', trainerClass: 'gym', specialtyType: 'electric',
    sprite: TRAINER_SPRITE('ltsurge'), reward: { money: 2400 },
    quote: '¡Mis Pokémon eléctricos te dejarán frito!',
    team: [
      { speciesId: 100, level: 21 }, // Voltorb
      { speciesId: 25, level: 18 }, // Pikachu
      { speciesId: 26, level: 24 }, // Raichu
    ],
  },
  {
    id: 'erika', name: 'Erika', trainerClass: 'gym', specialtyType: 'grass',
    sprite: TRAINER_SPRITE('erika'), reward: { money: 2900 },
    quote: 'Encantada... Enseño arreglos florales y Pokémon de planta.',
    team: [
      { speciesId: 114, level: 24 }, // Tangela
      { speciesId: 70, level: 29 }, // Weepinbell
      { speciesId: 45, level: 29 }, // Vileplume
    ],
  },
  {
    id: 'koga', name: 'Koga', trainerClass: 'gym', specialtyType: 'poison',
    sprite: TRAINER_SPRITE('koga'), reward: { money: 3700 },
    quote: '¡Fwahahaha! ¡Un auténtico ninja lucha entre las sombras!',
    team: [
      { speciesId: 109, level: 37 }, // Koffing
      { speciesId: 89, level: 39 }, // Muk
      { speciesId: 109, level: 37 }, // Koffing
      { speciesId: 110, level: 43 }, // Weezing
    ],
  },
  {
    id: 'sabrina', name: 'Sabrina', trainerClass: 'gym', specialtyType: 'psychic',
    sprite: TRAINER_SPRITE('sabrina'), reward: { money: 3800 },
    quote: 'He predicho tu derrota con mis poderes psíquicos.',
    team: [
      { speciesId: 64, level: 38 }, // Kadabra
      { speciesId: 122, level: 37 }, // Mr. Mime
      { speciesId: 49, level: 38 }, // Venomoth
      { speciesId: 65, level: 43 }, // Alakazam
    ],
  },
  {
    id: 'blaine', name: 'Blaine', trainerClass: 'gym', specialtyType: 'fire',
    sprite: TRAINER_SPRITE('blaine'), reward: { money: 4200 },
    quote: '¡Acertijo! ¿Pueden mis Pokémon de fuego abrasarte?',
    team: [
      { speciesId: 58, level: 42 }, // Growlithe
      { speciesId: 77, level: 40 }, // Ponyta
      { speciesId: 78, level: 42 }, // Rapidash
      { speciesId: 59, level: 47 }, // Arcanine
    ],
  },
  {
    id: 'giovanni', name: 'Giovanni', trainerClass: 'gym', specialtyType: 'ground',
    sprite: TRAINER_SPRITE('giovanni'), reward: { money: 5000 },
    quote: '¡Soy el líder del Team Rocket! ¡Te mostraré el verdadero poder!',
    team: [
      { speciesId: 111, level: 45 }, // Rhyhorn
      { speciesId: 51, level: 42 }, // Dugtrio
      { speciesId: 31, level: 44 }, // Nidoqueen
      { speciesId: 34, level: 45 }, // Nidoking
      { speciesId: 112, level: 50 }, // Rhydon
    ],
  },
]

export const KANTO_ELITE_FOUR: TrainerData[] = [
  {
    id: 'lorelei', name: 'Lorelei', trainerClass: 'elite', specialtyType: 'ice',
    sprite: TRAINER_SPRITE('lorelei-gen1rb'), reward: { money: 6000 },
    quote: 'Nadie puede vencer a mis Pokémon de hielo. ¡Te congelarás!',
    team: [
      { speciesId: 87, level: 52 }, // Dewgong
      { speciesId: 91, level: 51 }, // Cloyster
      { speciesId: 80, level: 52 }, // Slowbro
      { speciesId: 124, level: 54 }, // Jynx
      { speciesId: 131, level: 54 }, // Lapras
    ],
  },
  {
    id: 'bruno', name: 'Bruno', trainerClass: 'elite', specialtyType: 'fighting',
    sprite: TRAINER_SPRITE('bruno'), reward: { money: 6000 },
    quote: '¡Te haré pedazos con mis Pokémon de lucha!',
    team: [
      { speciesId: 95, level: 51 }, // Onix
      { speciesId: 107, level: 53 }, // Hitmonchan
      { speciesId: 106, level: 53 }, // Hitmonlee
      { speciesId: 95, level: 54 }, // Onix
      { speciesId: 68, level: 56 }, // Machamp
    ],
  },
  {
    id: 'agatha', name: 'Agatha', trainerClass: 'elite', specialtyType: 'ghost',
    sprite: TRAINER_SPRITE('agatha-gen1rb'), reward: { money: 6000 },
    quote: 'Oak no es más que un crío para mí. ¡Te enseñaré el miedo!',
    team: [
      { speciesId: 94, level: 56 }, // Gengar
      { speciesId: 42, level: 56 }, // Golbat
      { speciesId: 93, level: 55 }, // Haunter
      { speciesId: 24, level: 58 }, // Arbok
      { speciesId: 94, level: 60 }, // Gengar
    ],
  },
  {
    id: 'lance', name: 'Lance', trainerClass: 'elite', specialtyType: 'dragon',
    sprite: TRAINER_SPRITE('lance'), reward: { money: 6000 },
    quote: 'Soy Lance, el mejor entrenador de Pokémon dragón. ¡Prepárate!',
    team: [
      { speciesId: 130, level: 58 }, // Gyarados
      { speciesId: 148, level: 56 }, // Dragonair
      { speciesId: 148, level: 56 }, // Dragonair
      { speciesId: 142, level: 60 }, // Aerodactyl
      { speciesId: 149, level: 62 }, // Dragonite
    ],
  },
]

// Mapeo inicial -> evolución final (Kanto). Para otros iniciales se calcula
// dinámicamente con getFinalEvolution en evolution.ts.
const KANTO_STARTER_FINAL: Record<number, number> = {
  1: 3, // Venusaur
  4: 6, // Charizard
  7: 9, // Blastoise
}

/** Devuelve el inicial que tiene ventaja de tipo sobre el del jugador. */
export function counterStarterId(playerStarterId: number): number {
  for (const triad of Object.values(STARTERS_BY_GEN)) {
    const idx = triad.indexOf(playerStarterId)
    if (idx !== -1) return triad[(idx + 1) % 3]
  }
  return 4
}

/**
 * Campeón (rival Azul). Su inicial es el que cuenta al del jugador.
 * `rivalStarterFinalId` se calcula fuera (con getFinalEvolution) para soportar
 * todas las generaciones; aquí damos el equipo de apoyo clásico de Kanto.
 */
export function buildKantoChampion(rivalStarterFinalId: number): TrainerData {
  return {
    id: 'champion-blue', name: 'Azul', trainerClass: 'champion',
    sprite: TRAINER_SPRITE('blue'), reward: { money: 12000 },
    quote: '¡Ja! ¡Soy el Campeón de la Liga Pokémon! ¿Crees que puedes ganarme?',
    team: [
      { speciesId: 18, level: 61 }, // Pidgeot
      { speciesId: 65, level: 59 }, // Alakazam
      { speciesId: 112, level: 61 }, // Rhydon
      { speciesId: 103, level: 61 }, // Exeggutor
      { speciesId: 130, level: 61 }, // Gyarados
      { speciesId: rivalStarterFinalId, level: 65 },
    ],
  }
}

/**
 * Rival durante la run. `stage` 0..n escala niveles/equipo.
 * El equipo crece con el progreso de la run.
 */
export function buildKantoRival(
  rivalStarterFinalOrMidId: number,
  level: number,
  extraSpeciesIds: number[],
): TrainerData {
  const team = extraSpeciesIds.map((speciesId, i) => ({
    speciesId,
    level: Math.max(5, level - 2 - i * 2),
  }))
  team.push({ speciesId: rivalStarterFinalOrMidId, level })
  return {
    id: `rival-${level}`, name: 'Rival', trainerClass: 'rival',
    sprite: TRAINER_SPRITE('blue'), reward: { money: 800 + level * 30 },
    quote: '¡Eh! ¡Te voy a demostrar quién es el mejor entrenador!',
    team,
  }
}

export { KANTO_STARTER_FINAL }
