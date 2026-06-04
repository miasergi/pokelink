import type { TrainerData } from '@/types'

// Rosters de Sinnoh (Gen 4 — Diamante/Perla/Platino). Movesets derivados del nivel.
const T = (s: string) => `https://play.pokemonshowdown.com/sprites/trainers/${s}.png`

export const SINNOH_GYM_LEADERS: TrainerData[] = [
  { id: 'roark', name: 'Roco', trainerClass: 'gym', specialtyType: 'rock', sprite: T('roark'), reward: { money: 1400 }, quote: '¡Excavo y entreno! ¡Mis Pokémon roca son durísimos!',
    team: [{ speciesId: 74, level: 12 }, { speciesId: 95, level: 12 }, { speciesId: 408, level: 14 }] },
  { id: 'gardenia', name: 'Gardenia', trainerClass: 'gym', specialtyType: 'grass', sprite: T('gardenia'), reward: { money: 1800 }, quote: '¡Jejeje! ¡Mis Pokémon planta no te dejarán escapar!',
    team: [{ speciesId: 420, level: 19 }, { speciesId: 387, level: 19 }, { speciesId: 407, level: 22 }] },
  { id: 'maylene', name: 'Brega', trainerClass: 'gym', specialtyType: 'fighting', sprite: T('maylene'), reward: { money: 2200 }, quote: 'Aún soy joven, pero mi espíritu de lucha es fuerte.',
    team: [{ speciesId: 307, level: 27 }, { speciesId: 67, level: 28 }, { speciesId: 448, level: 32 }] },
  { id: 'crasherwake', name: 'Mananti', trainerClass: 'gym', specialtyType: 'water', sprite: T('crasherwake'), reward: { money: 2500 }, quote: '¡CRASHEEER WAAAKE! ¡La ola te arrastrará!',
    team: [{ speciesId: 130, level: 27 }, { speciesId: 195, level: 27 }, { speciesId: 419, level: 30 }] },
  { id: 'fantina', name: 'Fantina', trainerClass: 'gym', specialtyType: 'ghost', sprite: T('fantina'), reward: { money: 2800 }, quote: '¡Mis Pokémon fantasma bailarán sobre tu derrota!',
    team: [{ speciesId: 426, level: 32 }, { speciesId: 94, level: 34 }, { speciesId: 429, level: 36 }] },
  { id: 'byron', name: 'Acerón', trainerClass: 'gym', specialtyType: 'steel', sprite: T('byron'), reward: { money: 3200 }, quote: '¡Mis Pokémon de acero son una fortaleza inexpugnable!',
    team: [{ speciesId: 82, level: 36 }, { speciesId: 208, level: 36 }, { speciesId: 411, level: 39 }] },
  { id: 'candice', name: 'Inverna', trainerClass: 'gym', specialtyType: 'ice', sprite: T('candice'), reward: { money: 3500 }, quote: '¡Concentración! ¡Mis Pokémon de hielo son puro temple!',
    team: [{ speciesId: 215, level: 38 }, { speciesId: 221, level: 38 }, { speciesId: 460, level: 40 }, { speciesId: 478, level: 42 }] },
  { id: 'volkner', name: 'Lectro', trainerClass: 'gym', specialtyType: 'electric', sprite: T('volkner'), reward: { money: 4200 }, quote: 'Esperaba un buen combate. ¡No me decepciones!',
    team: [{ speciesId: 135, level: 46 }, { speciesId: 26, level: 46 }, { speciesId: 405, level: 48 }, { speciesId: 466, level: 50 }] },
]

export const SINNOH_ELITE_FOUR: TrainerData[] = [
  { id: 'aaron', name: 'Aaron', trainerClass: 'elite', specialtyType: 'bug', sprite: T('aaron'), reward: { money: 6000 }, quote: '¡Mis Pokémon insecto son rápidos y letales!',
    team: [{ speciesId: 469, level: 49 }, { speciesId: 212, level: 49 }, { speciesId: 416, level: 50 }, { speciesId: 214, level: 51 }, { speciesId: 452, level: 53 }] },
  { id: 'bertha', name: 'Berta', trainerClass: 'elite', specialtyType: 'ground', sprite: T('bertha'), reward: { money: 6000 }, quote: 'Jeje, eres jovencito. Veamos de qué estás hecho.',
    team: [{ speciesId: 340, level: 50 }, { speciesId: 472, level: 53 }, { speciesId: 450, level: 52 }, { speciesId: 76, level: 52 }, { speciesId: 464, level: 55 }] },
  { id: 'flint', name: 'Fausto', trainerClass: 'elite', specialtyType: 'fire', sprite: T('flint'), reward: { money: 6000 }, quote: '¡Mis Pokémon arden con la pasión de mi corazón!',
    team: [{ speciesId: 229, level: 52 }, { speciesId: 78, level: 53 }, { speciesId: 136, level: 55 }, { speciesId: 467, level: 57 }, { speciesId: 392, level: 55 }] },
  { id: 'lucian', name: 'Delci', trainerClass: 'elite', specialtyType: 'psychic', sprite: T('lucian'), reward: { money: 6000 }, quote: 'Mis Pokémon psíquicos leen cada uno de tus movimientos.',
    team: [{ speciesId: 122, level: 53 }, { speciesId: 203, level: 54 }, { speciesId: 437, level: 55 }, { speciesId: 65, level: 56 }, { speciesId: 475, level: 59 }] },
]

export function buildSinnohChampion(_rivalFinalId: number): TrainerData {
  return { id: 'champion-cynthia', name: 'Cintia', trainerClass: 'champion', sprite: T('cynthia'), reward: { money: 13000 }, quote: '¡Bienvenido! Soy Cintia, la Campeona. ¡Dalo todo!',
    team: [{ speciesId: 442, level: 58 }, { speciesId: 407, level: 58 }, { speciesId: 468, level: 60 }, { speciesId: 448, level: 60 }, { speciesId: 350, level: 58 }, { speciesId: 445, level: 62 }] }
}
