import type { TrainerData } from '@/types'

// Rosters de Paldea (Gen 9 — Escarlata/Púrpura). Movesets derivados del nivel.
const T = (s: string) => `https://play.pokemonshowdown.com/sprites/trainers/${s}.png`

export const PALDEA_GYM_LEADERS: TrainerData[] = [
  { id: 'katy', name: 'Catalina', trainerClass: 'gym', specialtyType: 'bug', sprite: T('katy'), reward: { money: 1500 }, quote: '¡Mis Pokémon insecto son tan dulces como mis pasteles!',
    team: [{ speciesId: 917, level: 14 }, { speciesId: 915, level: 14 }, { speciesId: 216, level: 15 }] },
  { id: 'brassius', name: 'Brais', trainerClass: 'gym', specialtyType: 'grass', sprite: T('brassius'), reward: { money: 1900 }, quote: '¡Mi arte y mis Pokémon planta florecerán ante ti!',
    team: [{ speciesId: 548, level: 16 }, { speciesId: 928, level: 16 }, { speciesId: 185, level: 17 }] },
  { id: 'iono', name: 'Mela', trainerClass: 'gym', specialtyType: 'electric', sprite: T('iono'), reward: { money: 2300 }, quote: '¡Hola a todos mis seguidores! ¡Hoy electrocuto a un retador!',
    team: [{ speciesId: 940, level: 23 }, { speciesId: 404, level: 23 }, { speciesId: 939, level: 24 }, { speciesId: 429, level: 24 }] },
  { id: 'kofu', name: 'Fuco', trainerClass: 'gym', specialtyType: 'water', sprite: T('kofu'), reward: { money: 2600 }, quote: '¡Caramba! ¡Mis Pokémon de agua están más frescos que el marisco!',
    team: [{ speciesId: 976, level: 29 }, { speciesId: 961, level: 29 }, { speciesId: 740, level: 30 }] },
  { id: 'larry', name: 'Lacho', trainerClass: 'gym', specialtyType: 'normal', sprite: T('larry'), reward: { money: 3000 }, quote: 'Lo normal es lo mejor. Sin complicaciones, ¿verdad?',
    team: [{ speciesId: 775, level: 35 }, { speciesId: 398, level: 35 }, { speciesId: 982, level: 36 }] },
  { id: 'ryme', name: 'Lima', trainerClass: 'gym', specialtyType: 'ghost', sprite: T('ryme'), reward: { money: 3400 }, quote: '¡Yeah! ¡Mis Pokémon fantasma marcan el ritmo de tu derrota!',
    team: [{ speciesId: 354, level: 41 }, { speciesId: 778, level: 41 }, { speciesId: 972, level: 41 }, { speciesId: 849, level: 42 }] },
  { id: 'tulip', name: 'Tuli', trainerClass: 'gym', specialtyType: 'psychic', sprite: T('tulip'), reward: { money: 3800 }, quote: 'La belleza y la mente... mis Pokémon psíquicos lo tienen todo.',
    team: [{ speciesId: 981, level: 44 }, { speciesId: 282, level: 44 }, { speciesId: 956, level: 45 }, { speciesId: 671, level: 45 }] },
  { id: 'grusha', name: 'Gimena', trainerClass: 'gym', specialtyType: 'ice', sprite: T('grusha'), reward: { money: 4600 }, quote: 'Frío y preciso. Así caerás ante mi hielo.',
    team: [{ speciesId: 873, level: 47 }, { speciesId: 614, level: 47 }, { speciesId: 975, level: 48 }, { speciesId: 334, level: 48 }] },
]

export const PALDEA_ELITE_FOUR: TrainerData[] = [
  { id: 'rika', name: 'Cintia', trainerClass: 'elite', specialtyType: 'ground', sprite: T('rika'), reward: { money: 8000 }, quote: 'Jeje, no te confíes. La tierra esconde sorpresas.',
    team: [{ speciesId: 340, level: 57 }, { speciesId: 323, level: 57 }, { speciesId: 232, level: 57 }, { speciesId: 51, level: 57 }, { speciesId: 980, level: 58 }] },
  { id: 'poppy', name: 'Hortensia', trainerClass: 'elite', specialtyType: 'steel', sprite: T('poppy'), reward: { money: 8000 }, quote: '¡Mis Pokémon de acero son durísimos! ¡A jugar!',
    team: [{ speciesId: 879, level: 58 }, { speciesId: 437, level: 58 }, { speciesId: 823, level: 58 }, { speciesId: 959, level: 58 }, { speciesId: 462, level: 58 }] },
  { id: 'larry-flying', name: 'Lacho', trainerClass: 'elite', specialtyType: 'flying', sprite: T('larry'), reward: { money: 8000 }, quote: 'Otra vez yo. Esta vez, volando. La vida es así.',
    team: [{ speciesId: 357, level: 59 }, { speciesId: 398, level: 59 }, { speciesId: 334, level: 59 }, { speciesId: 741, level: 59 }, { speciesId: 973, level: 60 }] },
  { id: 'hassel', name: 'Esmeralda', trainerClass: 'elite', specialtyType: 'dragon', sprite: T('hassel'), reward: { money: 8000 }, quote: '¡El arte de los dragones culmina aquí!',
    team: [{ speciesId: 715, level: 60 }, { speciesId: 691, level: 60 }, { speciesId: 841, level: 60 }, { speciesId: 612, level: 60 }, { speciesId: 998, level: 61 }] },
]

export function buildPaldeaChampion(_rivalFinalId: number): TrainerData {
  return { id: 'champion-geeta', name: 'Ságita', trainerClass: 'champion', sprite: T('geeta'), reward: { money: 16000 }, quote: 'Soy Ságita, la Suprema. ¡Veamos si mereces el título!',
    team: [{ speciesId: 956, level: 61 }, { speciesId: 673, level: 61 }, { speciesId: 976, level: 61 }, { speciesId: 713, level: 61 }, { speciesId: 970, level: 62 }, { speciesId: 983, level: 62 }] }
}
