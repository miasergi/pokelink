import type { TrainerData } from '@/types'

// Rosters de Galar (Gen 8 — Espada/Escudo). Movesets derivados del nivel.
const T = (s: string) => `https://play.pokemonshowdown.com/sprites/trainers/${s}.png`

export const GALAR_GYM_LEADERS: TrainerData[] = [
  { id: 'milo', name: 'Percy', trainerClass: 'gym', specialtyType: 'grass', sprite: T('milo'), reward: { money: 1500 }, quote: '¡Mi fuerza de planta es como un trigal interminable!',
    team: [{ speciesId: 829, level: 19 }, { speciesId: 830, level: 20 }] },
  { id: 'nessa', name: 'Cathy', trainerClass: 'gym', specialtyType: 'water', sprite: T('nessa'), reward: { money: 1900 }, quote: '¡La marea está de mi lado! ¡Prepárate para nadar!',
    team: [{ speciesId: 118, level: 22 }, { speciesId: 846, level: 23 }, { speciesId: 834, level: 24 }] },
  { id: 'kabu', name: 'Naboru', trainerClass: 'gym', specialtyType: 'fire', sprite: T('kabu'), reward: { money: 2300 }, quote: '¡Mi pasión arde con la fuerza de mil soles!',
    team: [{ speciesId: 38, level: 25 }, { speciesId: 59, level: 25 }, { speciesId: 851, level: 27 }] },
  { id: 'bea', name: 'Judith', trainerClass: 'gym', specialtyType: 'fighting', sprite: T('bea'), reward: { money: 2700 }, quote: 'Mi mente y mi cuerpo son uno. ¡No flaquearé!',
    team: [{ speciesId: 237, level: 34 }, { speciesId: 675, level: 34 }, { speciesId: 865, level: 35 }, { speciesId: 68, level: 36 }] },
  { id: 'allister', name: 'Algiz', trainerClass: 'gym', specialtyType: 'ghost', sprite: T('allister'), reward: { money: 2700 }, quote: '...Los espíritus susurran tu derrota...',
    team: [{ speciesId: 562, level: 34 }, { speciesId: 778, level: 34 }, { speciesId: 864, level: 35 }, { speciesId: 94, level: 36 }] },
  { id: 'opal', name: 'Sila', trainerClass: 'gym', specialtyType: 'fairy', sprite: T('opal'), reward: { money: 3100 }, quote: '¿Cuál es tu color? ¡El mío es el rosa de la victoria!',
    team: [{ speciesId: 110, level: 36 }, { speciesId: 303, level: 36 }, { speciesId: 468, level: 37 }, { speciesId: 869, level: 38 }] },
  { id: 'melony', name: 'Mel', trainerClass: 'gym', specialtyType: 'ice', sprite: T('melony'), reward: { money: 3500 }, quote: '¡Te congelaré con el cariño de una madre!',
    team: [{ speciesId: 873, level: 40 }, { speciesId: 555, level: 40 }, { speciesId: 875, level: 42 }, { speciesId: 131, level: 44 }] },
  { id: 'raihan', name: 'Roy', trainerClass: 'gym', specialtyType: 'dragon', sprite: T('raihan'), reward: { money: 4400 }, quote: '¡Soy el mejor para los selfies... y para los dragones!',
    team: [{ speciesId: 526, level: 46 }, { speciesId: 330, level: 46 }, { speciesId: 844, level: 46 }, { speciesId: 884, level: 48 }] },
]

export const GALAR_ELITE_FOUR: TrainerData[] = [
  { id: 'gordie', name: 'Morris', trainerClass: 'elite', specialtyType: 'rock', sprite: T('gordie'), reward: { money: 7000 }, quote: '¡Mis Pokémon roca te aplastarán como un alud!',
    team: [{ speciesId: 689, level: 48 }, { speciesId: 213, level: 48 }, { speciesId: 874, level: 48 }, { speciesId: 839, level: 50 }] },
  { id: 'marnie', name: 'Roxy', trainerClass: 'elite', specialtyType: 'dark', sprite: T('marnie'), reward: { money: 7000 }, quote: '¡Mis Pokémon siniestros y yo somos un equipo imparable!',
    team: [{ speciesId: 510, level: 48 }, { speciesId: 454, level: 48 }, { speciesId: 560, level: 48 }, { speciesId: 877, level: 48 }, { speciesId: 861, level: 50 }] },
  { id: 'bede', name: 'Berto', trainerClass: 'elite', specialtyType: 'fairy', sprite: T('bede'), reward: { money: 7000 }, quote: '¡Estoy destinado a la grandeza! ¡Apártate!',
    team: [{ speciesId: 858, level: 49 }, { speciesId: 282, level: 49 }, { speciesId: 303, level: 49 }, { speciesId: 78, level: 51 }] },
  { id: 'piers', name: 'Nerio', trainerClass: 'elite', specialtyType: 'dark', sprite: T('piers'), reward: { money: 7000 }, quote: '¡Mi música punk y mis Pokémon siniestros te harán vibrar!',
    team: [{ speciesId: 560, level: 49 }, { speciesId: 435, level: 49 }, { speciesId: 687, level: 49 }, { speciesId: 862, level: 51 }] },
]

export function buildGalarChampion(_rivalFinalId: number): TrainerData {
  return { id: 'champion-leon', name: 'Lionel', trainerClass: 'champion', sprite: T('leon'), reward: { money: 15000 }, quote: '¡Mi reinado como Campeón no acabará hoy! ¡A por todas!',
    team: [{ speciesId: 681, level: 62 }, { speciesId: 887, level: 63 }, { speciesId: 612, level: 63 }, { speciesId: 464, level: 64 }, { speciesId: 866, level: 62 }, { speciesId: 6, level: 65 }] }
}
