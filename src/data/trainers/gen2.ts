import type { TrainerData } from '@/types'

// ============================================================================
// Rosters reales de Johto (Gen 2 — Oro/Plata/Cristal), niveles ajustados.
// Movesets derivados del learnset al nivel.
// ============================================================================

const T = (slug: string) => `https://play.pokemonshowdown.com/sprites/trainers/${slug}.png`

export const JOHTO_GYM_LEADERS: TrainerData[] = [
  {
    id: 'falkner', name: 'Pegaso', trainerClass: 'gym', specialtyType: 'flying',
    sprite: T('falkner'), reward: { money: 1200 },
    quote: '¡Soy Pegaso, el orgulloso maestro de los Pokémon de tipo volador!',
    team: [{ speciesId: 16, level: 9 }, { speciesId: 17, level: 13 }],
  },
  {
    id: 'bugsy', name: 'Antón', trainerClass: 'gym', specialtyType: 'bug',
    sprite: T('bugsy'), reward: { money: 1600 },
    quote: '¡Soy Antón! ¡Nadie sabe más de Pokémon insecto que yo!',
    team: [{ speciesId: 11, level: 15 }, { speciesId: 14, level: 15 }, { speciesId: 123, level: 17 }],
  },
  {
    id: 'whitney', name: 'Blanca', trainerClass: 'gym', specialtyType: 'normal',
    sprite: T('whitney'), reward: { money: 2000 },
    quote: '¡Los Pokémon normales son los mejores y más monos!',
    team: [{ speciesId: 35, level: 18 }, { speciesId: 241, level: 20 }],
  },
  {
    id: 'morty', name: 'Morti', trainerClass: 'gym', specialtyType: 'ghost',
    sprite: T('morty'), reward: { money: 2400 },
    quote: 'Puedo ver lo que otros no ven... ¡tu derrota!',
    team: [{ speciesId: 92, level: 21 }, { speciesId: 93, level: 21 }, { speciesId: 93, level: 23 }, { speciesId: 94, level: 25 }],
  },
  {
    id: 'chuck', name: 'Aníbal', trainerClass: 'gym', specialtyType: 'fighting',
    sprite: T('chuck'), reward: { money: 2900 },
    quote: '¡UOOOH! ¡Mi entrenamiento de lucha te hará pedazos!',
    team: [{ speciesId: 57, level: 29 }, { speciesId: 62, level: 31 }],
  },
  {
    id: 'jasmine', name: 'Yasmina', trainerClass: 'gym', specialtyType: 'steel',
    sprite: T('jasmine'), reward: { money: 3200 },
    quote: 'Esto... gracias por ayudar antes. Daré lo mejor de mí.',
    team: [{ speciesId: 81, level: 30 }, { speciesId: 81, level: 30 }, { speciesId: 208, level: 35 }],
  },
  {
    id: 'pryce', name: 'Fredo', trainerClass: 'gym', specialtyType: 'ice',
    sprite: T('pryce'), reward: { money: 3400 },
    quote: 'Los Pokémon y yo hemos sobrevivido a duros inviernos. ¡Verás!',
    team: [{ speciesId: 86, level: 27 }, { speciesId: 87, level: 29 }, { speciesId: 221, level: 31 }],
  },
  {
    id: 'clair', name: 'Débora', trainerClass: 'gym', specialtyType: 'dragon',
    sprite: T('clair'), reward: { money: 4000 },
    quote: '¡Soy la mejor entrenadora de dragones! ¡No tendré piedad!',
    team: [{ speciesId: 148, level: 37 }, { speciesId: 148, level: 37 }, { speciesId: 148, level: 37 }, { speciesId: 230, level: 40 }],
  },
]

export const JOHTO_ELITE_FOUR: TrainerData[] = [
  {
    id: 'will', name: 'Mento', trainerClass: 'elite', specialtyType: 'psychic',
    sprite: T('will'), reward: { money: 6000 },
    quote: 'Me he entrenado por todo el mundo. ¡No perderé!',
    team: [{ speciesId: 178, level: 40 }, { speciesId: 124, level: 41 }, { speciesId: 80, level: 41 }, { speciesId: 103, level: 41 }, { speciesId: 178, level: 42 }],
  },
  {
    id: 'koga-johto', name: 'Koga', trainerClass: 'elite', specialtyType: 'poison',
    sprite: T('koga'), reward: { money: 6000 },
    quote: '¡Fwahaha! ¡Mis Pokémon veneno te dejarán sin escapatoria!',
    team: [{ speciesId: 168, level: 40 }, { speciesId: 49, level: 41 }, { speciesId: 205, level: 43 }, { speciesId: 89, level: 42 }, { speciesId: 169, level: 44 }],
  },
  {
    id: 'bruno-johto', name: 'Bruno', trainerClass: 'elite', specialtyType: 'fighting',
    sprite: T('bruno'), reward: { money: 6000 },
    quote: '¡Te aplastaré con el poder de mis Pokémon de lucha!',
    team: [{ speciesId: 237, level: 42 }, { speciesId: 106, level: 42 }, { speciesId: 107, level: 42 }, { speciesId: 95, level: 43 }, { speciesId: 68, level: 46 }],
  },
  {
    id: 'karen', name: 'Karen', trainerClass: 'elite', specialtyType: 'dark',
    sprite: T('karen'), reward: { money: 6000 },
    quote: 'Los Pokémon fuertes, débiles... lo que importa es el corazón.',
    team: [{ speciesId: 197, level: 42 }, { speciesId: 45, level: 42 }, { speciesId: 94, level: 45 }, { speciesId: 198, level: 44 }, { speciesId: 229, level: 47 }],
  },
]

/** Campeón de Johto: Lance (equipo fijo; ignora el inicial del rival). */
export function buildJohtoChampion(_rivalFinalId: number): TrainerData {
  return {
    id: 'champion-lance', name: 'Lance', trainerClass: 'champion',
    sprite: T('lance'), reward: { money: 12000 },
    quote: '¡Soy Lance, el Campeón! ¡Te mostraré el poder de los dragones!',
    team: [
      { speciesId: 130, level: 46 }, // Gyarados
      { speciesId: 149, level: 48 }, // Dragonite
      { speciesId: 149, level: 48 }, // Dragonite
      { speciesId: 142, level: 46 }, // Aerodactyl
      { speciesId: 6, level: 46 }, // Charizard
      { speciesId: 149, level: 50 }, // Dragonite
    ],
  }
}
