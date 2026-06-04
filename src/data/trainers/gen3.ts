import type { TrainerData } from '@/types'

// Rosters de Hoenn (Gen 3 — Rubí/Zafiro/Esmeralda). Movesets derivados del nivel.
const T = (s: string) => `https://play.pokemonshowdown.com/sprites/trainers/${s}.png`

export const HOENN_GYM_LEADERS: TrainerData[] = [
  { id: 'roxanne', name: 'Petra', trainerClass: 'gym', specialtyType: 'rock', sprite: T('roxanne'), reward: { money: 1400 }, quote: '¡Te mostraré el poder de los Pokémon de tipo roca!',
    team: [{ speciesId: 74, level: 14 }, { speciesId: 74, level: 14 }, { speciesId: 299, level: 16 }] },
  { id: 'brawly', name: 'Marcial', trainerClass: 'gym', specialtyType: 'fighting', sprite: T('brawly'), reward: { money: 1700 }, quote: '¡Una gran ola de combate te arrollará!',
    team: [{ speciesId: 66, level: 17 }, { speciesId: 307, level: 17 }, { speciesId: 296, level: 19 }] },
  { id: 'wattson', name: 'Erico', trainerClass: 'gym', specialtyType: 'electric', sprite: T('wattson'), reward: { money: 2000 }, quote: '¡Wahaha! ¡Mis Pokémon eléctricos te electrizarán!',
    team: [{ speciesId: 100, level: 20 }, { speciesId: 81, level: 20 }, { speciesId: 82, level: 22 }, { speciesId: 310, level: 24 }] },
  { id: 'flannery', name: 'Candela', trainerClass: 'gym', specialtyType: 'fire', sprite: T('flannery'), reward: { money: 2400 }, quote: '¡Mis Pokémon de fuego arden con pasión!',
    team: [{ speciesId: 218, level: 26 }, { speciesId: 322, level: 26 }, { speciesId: 323, level: 27 }, { speciesId: 324, level: 29 }] },
  { id: 'norman', name: 'Norman', trainerClass: 'gym', specialtyType: 'normal', sprite: T('norman'), reward: { money: 2800 }, quote: 'Hola... soy tu padre, y el líder de gimnasio. No me contendré.',
    team: [{ speciesId: 327, level: 27 }, { speciesId: 288, level: 27 }, { speciesId: 264, level: 29 }, { speciesId: 289, level: 31 }] },
  { id: 'winona', name: 'Alana', trainerClass: 'gym', specialtyType: 'flying', sprite: T('winona'), reward: { money: 3100 }, quote: 'He surcado los cielos con mis Pokémon. ¡Prepárate!',
    team: [{ speciesId: 333, level: 29 }, { speciesId: 357, level: 29 }, { speciesId: 279, level: 30 }, { speciesId: 227, level: 31 }, { speciesId: 334, level: 33 }] },
  { id: 'tate-liza', name: 'Vito y Leti', trainerClass: 'gym', specialtyType: 'psychic', sprite: T('tate'), reward: { money: 3600 }, quote: '¡Somos hermanos gemelos! ¡Nuestra mente es una sola!',
    team: [{ speciesId: 338, level: 41 }, { speciesId: 337, level: 41 }, { speciesId: 178, level: 42 }, { speciesId: 344, level: 42 }] },
  { id: 'wallace', name: 'Plubio', trainerClass: 'gym', specialtyType: 'water', sprite: T('wallace'), reward: { money: 4200 }, quote: 'El agua fluye con elegancia. ¡Como mis Pokémon!',
    team: [{ speciesId: 364, level: 40 }, { speciesId: 119, level: 42 }, { speciesId: 340, level: 42 }, { speciesId: 130, level: 42 }, { speciesId: 350, level: 43 }] },
]

export const HOENN_ELITE_FOUR: TrainerData[] = [
  { id: 'sidney', name: 'Sixto', trainerClass: 'elite', specialtyType: 'dark', sprite: T('sidney'), reward: { money: 6000 }, quote: '¡Me gusta tu mirada! Pero no ganarás.',
    team: [{ speciesId: 262, level: 46 }, { speciesId: 275, level: 48 }, { speciesId: 332, level: 46 }, { speciesId: 342, level: 48 }, { speciesId: 359, level: 49 }] },
  { id: 'phoebe', name: 'Fátima', trainerClass: 'elite', specialtyType: 'ghost', sprite: T('phoebe-gen3'), reward: { money: 6000 }, quote: 'Aprendí a comunicarme con los Pokémon fantasma...',
    team: [{ speciesId: 356, level: 48 }, { speciesId: 354, level: 49 }, { speciesId: 302, level: 50 }, { speciesId: 354, level: 49 }, { speciesId: 356, level: 51 }] },
  { id: 'glacia', name: 'Núria', trainerClass: 'elite', specialtyType: 'ice', sprite: T('glacia'), reward: { money: 6000 }, quote: 'Mis Pokémon de hielo te congelarán el alma.',
    team: [{ speciesId: 364, level: 50 }, { speciesId: 362, level: 50 }, { speciesId: 364, level: 52 }, { speciesId: 362, level: 52 }, { speciesId: 365, level: 53 }] },
  { id: 'drake', name: 'Dracón', trainerClass: 'elite', specialtyType: 'dragon', sprite: T('drake-gen3'), reward: { money: 6000 }, quote: '¡Soy el maestro de los dragones! ¿Tienes lo que hay que tener?',
    team: [{ speciesId: 372, level: 52 }, { speciesId: 334, level: 54 }, { speciesId: 330, level: 53 }, { speciesId: 330, level: 53 }, { speciesId: 373, level: 55 }] },
]

export function buildHoennChampion(_rivalFinalId: number): TrainerData {
  return { id: 'champion-steven', name: 'Máximo', trainerClass: 'champion', sprite: T('steven'), reward: { money: 12000 }, quote: '¡Soy Máximo, el Campeón! Te mostraré el poder del acero.',
    team: [{ speciesId: 227, level: 57 }, { speciesId: 344, level: 55 }, { speciesId: 306, level: 56 }, { speciesId: 346, level: 56 }, { speciesId: 348, level: 56 }, { speciesId: 376, level: 58 }] }
}
