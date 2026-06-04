import type { TrainerData } from '@/types'

// Rosters de Kalos (Gen 6 — X/Y). Movesets derivados del nivel.
const T = (s: string) => `https://play.pokemonshowdown.com/sprites/trainers/${s}.png`

export const KALOS_GYM_LEADERS: TrainerData[] = [
  { id: 'viola', name: 'Aura', trainerClass: 'gym', specialtyType: 'bug', sprite: T('viola'), reward: { money: 1300 }, quote: '¡Cada combate es una instantánea perfecta!',
    team: [{ speciesId: 283, level: 10 }, { speciesId: 666, level: 12 }] },
  { id: 'grant', name: 'Lino', trainerClass: 'gym', specialtyType: 'rock', sprite: T('grant'), reward: { money: 1800 }, quote: '¡Supera este muro de roca si puedes!',
    team: [{ speciesId: 698, level: 25 }, { speciesId: 696, level: 25 }] },
  { id: 'korrina', name: 'Corelia', trainerClass: 'gym', specialtyType: 'fighting', sprite: T('korrina'), reward: { money: 2200 }, quote: '¡Gran dama de la megaevolución! ¡Aquí voy!',
    team: [{ speciesId: 619, level: 29 }, { speciesId: 67, level: 28 }, { speciesId: 701, level: 32 }] },
  { id: 'ramos', name: 'Amaro', trainerClass: 'gym', specialtyType: 'grass', sprite: T('ramos'), reward: { money: 2500 }, quote: 'Mis Pokémon planta han crecido fuertes, jovenzuelo.',
    team: [{ speciesId: 189, level: 30 }, { speciesId: 70, level: 31 }, { speciesId: 673, level: 34 }] },
  { id: 'clemont', name: 'Lem', trainerClass: 'gym', specialtyType: 'electric', sprite: T('clemont'), reward: { money: 2800 }, quote: '¡El futuro es brillante gracias a la ciencia y la electricidad!',
    team: [{ speciesId: 587, level: 35 }, { speciesId: 82, level: 35 }, { speciesId: 695, level: 37 }] },
  { id: 'valerie', name: 'Valeria', trainerClass: 'gym', specialtyType: 'fairy', sprite: T('valerie'), reward: { money: 3100 }, quote: 'Los Pokémon de tipo hada son misteriosos y bellos...',
    team: [{ speciesId: 303, level: 38 }, { speciesId: 122, level: 39 }, { speciesId: 700, level: 42 }] },
  { id: 'olympia', name: 'Ágata', trainerClass: 'gym', specialtyType: 'psychic', sprite: T('olympia'), reward: { money: 3500 }, quote: 'El futuro... veo tu derrota en las estrellas.',
    team: [{ speciesId: 561, level: 44 }, { speciesId: 199, level: 45 }, { speciesId: 678, level: 48 }] },
  { id: 'wulfric', name: 'Édel', trainerClass: 'gym', specialtyType: 'ice', sprite: T('wulfric'), reward: { money: 4200 }, quote: '¡Mi corazón es cálido, pero mis Pokémon son de hielo!',
    team: [{ speciesId: 460, level: 56 }, { speciesId: 615, level: 55 }, { speciesId: 713, level: 59 }] },
]

export const KALOS_ELITE_FOUR: TrainerData[] = [
  { id: 'malva', name: 'Malva', trainerClass: 'elite', specialtyType: 'fire', sprite: T('malva'), reward: { money: 7000 }, quote: '¡Mis llamas reducirán a cenizas tus esperanzas!',
    team: [{ speciesId: 668, level: 63 }, { speciesId: 324, level: 63 }, { speciesId: 609, level: 63 }, { speciesId: 663, level: 65 }] },
  { id: 'siebold', name: 'Narciso', trainerClass: 'elite', specialtyType: 'water', sprite: T('siebold'), reward: { money: 7000 }, quote: 'La cocina y el combate son arte. ¡Saboréalo!',
    team: [{ speciesId: 693, level: 63 }, { speciesId: 130, level: 63 }, { speciesId: 121, level: 63 }, { speciesId: 689, level: 65 }] },
  { id: 'wikstrom', name: 'Tyrón', trainerClass: 'elite', specialtyType: 'steel', sprite: T('wikstrom'), reward: { money: 7000 }, quote: '¡Por mi honor de caballero de acero, no perderé!',
    team: [{ speciesId: 707, level: 63 }, { speciesId: 476, level: 63 }, { speciesId: 212, level: 63 }, { speciesId: 681, level: 65 }] },
  { id: 'drasna', name: 'Drácena', trainerClass: 'elite', specialtyType: 'dragon', sprite: T('drasna'), reward: { money: 7000 }, quote: 'Mis dragones son tan dulces conmigo como feroces contigo.',
    team: [{ speciesId: 691, level: 63 }, { speciesId: 621, level: 63 }, { speciesId: 334, level: 63 }, { speciesId: 715, level: 65 }] },
]

export function buildKalosChampion(_rivalFinalId: number): TrainerData {
  return { id: 'champion-diantha', name: 'Dianta', trainerClass: 'champion', sprite: T('diantha'), reward: { money: 14000 }, quote: 'Soy Dianta, la Campeona. ¡Que nuestro combate sea memorable!',
    team: [{ speciesId: 701, level: 64 }, { speciesId: 697, level: 65 }, { speciesId: 699, level: 65 }, { speciesId: 711, level: 65 }, { speciesId: 706, level: 66 }, { speciesId: 282, level: 68 }] }
}
