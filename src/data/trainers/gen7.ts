import type { TrainerData } from '@/types'

// Rosters de Alola (Gen 7 — Sol/Luna). Capitanes de prueba como "gimnasios" y
// kahunas como Alto Mando. Movesets derivados del nivel.
const T = (s: string) => `https://play.pokemonshowdown.com/sprites/trainers/${s}.png`

export const ALOLA_GYM_LEADERS: TrainerData[] = [
  { id: 'ilima', name: 'Iván', trainerClass: 'gym', specialtyType: 'normal', sprite: T('ilima'), reward: { money: 1300 }, quote: '¡Que comience la prueba! Muéstrame tu valía.',
    team: [{ speciesId: 734, level: 10 }, { speciesId: 235, level: 12 }] },
  { id: 'lana', name: 'Nereida', trainerClass: 'gym', specialtyType: 'water', sprite: T('lana'), reward: { money: 1700 }, quote: 'Las aguas de Alola esconden Pokémon poderosos...',
    team: [{ speciesId: 746, level: 20 }, { speciesId: 171, level: 22 }] },
  { id: 'kiawe', name: 'Kawe', trainerClass: 'gym', specialtyType: 'fire', sprite: T('kiawe'), reward: { money: 2100 }, quote: '¡El fuego de mi danza arrasará contigo!',
    team: [{ speciesId: 126, level: 22 }, { speciesId: 59, level: 24 }, { speciesId: 758, level: 25 }] },
  { id: 'mallow', name: 'Tamato', trainerClass: 'gym', specialtyType: 'grass', sprite: T('mallow'), reward: { money: 2400 }, quote: '¡Mis Pokémon planta han crecido con mucho cariño!',
    team: [{ speciesId: 754, level: 24 }, { speciesId: 756, level: 24 }, { speciesId: 763, level: 26 }] },
  { id: 'sophocles', name: 'Chrome', trainerClass: 'gym', specialtyType: 'electric', sprite: T('sophocles'), reward: { money: 2700 }, quote: '¡La electricidad y la tecnología son mis aliadas!',
    team: [{ speciesId: 737, level: 28 }, { speciesId: 777, level: 29 }, { speciesId: 738, level: 31 }] },
  { id: 'acerola', name: 'Acerola', trainerClass: 'gym', specialtyType: 'ghost', sprite: T('acerola'), reward: { money: 3000 }, quote: '¡Buuu! ¿Te dan miedo mis Pokémon fantasma?',
    team: [{ speciesId: 426, level: 33 }, { speciesId: 781, level: 34 }, { speciesId: 778, level: 36 }] },
  { id: 'mina', name: 'Mina', trainerClass: 'gym', specialtyType: 'fairy', sprite: T('mina'), reward: { money: 3400 }, quote: 'El arte y las hadas... fluyen libres, ¿sabes?',
    team: [{ speciesId: 743, level: 51 }, { speciesId: 210, level: 51 }, { speciesId: 40, level: 53 }] },
  { id: 'kahili', name: 'Kahili', trainerClass: 'gym', specialtyType: 'flying', sprite: T('kahili'), reward: { money: 4200 }, quote: 'Mis Pokémon voladores planean hacia la victoria.',
    team: [{ speciesId: 227, level: 55 }, { speciesId: 630, level: 55 }, { speciesId: 733, level: 57 }] },
]

export const ALOLA_ELITE_FOUR: TrainerData[] = [
  { id: 'hala', name: 'Hala', trainerClass: 'elite', specialtyType: 'fighting', sprite: T('hala'), reward: { money: 7000 }, quote: '¡El kahuna de Melemele te pondrá a prueba!',
    team: [{ speciesId: 297, level: 54 }, { speciesId: 740, level: 55 }, { speciesId: 57, level: 55 }, { speciesId: 760, level: 57 }] },
  { id: 'olivia', name: 'Mayla', trainerClass: 'elite', specialtyType: 'rock', sprite: T('olivia'), reward: { money: 7000 }, quote: 'Mis Pokémon roca son tan duros como bellos.',
    team: [{ speciesId: 369, level: 54 }, { speciesId: 476, level: 55 }, { speciesId: 745, level: 56 }, { speciesId: 526, level: 57 }] },
  { id: 'nanu', name: 'Nanu', trainerClass: 'elite', specialtyType: 'dark', sprite: T('nanu'), reward: { money: 7000 }, quote: 'Bah... acabemos con esto rápido.',
    team: [{ speciesId: 302, level: 54 }, { speciesId: 430, level: 55 }, { speciesId: 553, level: 56 }, { speciesId: 359, level: 57 }] },
  { id: 'hapu', name: 'Hapu', trainerClass: 'elite', specialtyType: 'ground', sprite: T('hapu'), reward: { money: 7000 }, quote: 'La tierra de Alola me da fuerza. ¡Adelante!',
    team: [{ speciesId: 423, level: 55 }, { speciesId: 623, level: 56 }, { speciesId: 330, level: 57 }, { speciesId: 750, level: 59 }] },
]

export function buildAlolaChampion(_rivalFinalId: number): TrainerData {
  return { id: 'champion-kukui', name: 'Prof. Kukui', trainerClass: 'champion', sprite: T('kukui'), reward: { money: 14000 }, quote: '¡Yeah! ¡Soy el primer Campeón de Alola! ¡Dalo todo, primo!',
    team: [{ speciesId: 745, level: 57 }, { speciesId: 38, level: 56 }, { speciesId: 628, level: 57 }, { speciesId: 462, level: 57 }, { speciesId: 143, level: 58 }, { speciesId: 730, level: 58 }] }
}
