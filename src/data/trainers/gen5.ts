import type { TrainerData } from '@/types'

// Rosters de Teselia (Gen 5 — Negro/Blanco). Movesets derivados del nivel.
const T = (s: string) => `https://play.pokemonshowdown.com/sprites/trainers/${s}.png`

export const UNOVA_GYM_LEADERS: TrainerData[] = [
  { id: 'cilan', name: 'Millo', trainerClass: 'gym', specialtyType: 'grass', sprite: T('cilan'), reward: { money: 1300 }, quote: 'El sabor de la victoria... ¡será mío!',
    team: [{ speciesId: 506, level: 12 }, { speciesId: 511, level: 14 }] },
  { id: 'lenora', name: 'Aloe', trainerClass: 'gym', specialtyType: 'normal', sprite: T('lenora'), reward: { money: 1700 }, quote: '¡Te enseñaré la fuerza de los Pokémon normales!',
    team: [{ speciesId: 507, level: 18 }, { speciesId: 505, level: 20 }] },
  { id: 'burgh', name: 'Camus', trainerClass: 'gym', specialtyType: 'bug', sprite: T('burgh'), reward: { money: 2000 }, quote: '¡El arte y los Pokémon insecto fluyen por mis venas!',
    team: [{ speciesId: 544, level: 21 }, { speciesId: 557, level: 21 }, { speciesId: 542, level: 23 }] },
  { id: 'elesa', name: 'Camila', trainerClass: 'gym', specialtyType: 'electric', sprite: T('elesa'), reward: { money: 2400 }, quote: '¡Mis Pokémon eléctricos brillan como las estrellas!',
    team: [{ speciesId: 587, level: 25 }, { speciesId: 587, level: 25 }, { speciesId: 523, level: 27 }] },
  { id: 'clay', name: 'Yakón', trainerClass: 'gym', specialtyType: 'ground', sprite: T('clay'), reward: { money: 2800 }, quote: '¡Caramba! ¡Mis Pokémon de tierra son sólidos como la roca!',
    team: [{ speciesId: 552, level: 29 }, { speciesId: 536, level: 29 }, { speciesId: 530, level: 31 }] },
  { id: 'skyla', name: 'Gerania', trainerClass: 'gym', specialtyType: 'flying', sprite: T('skyla'), reward: { money: 3100 }, quote: '¡Surcaremos los cielos hasta tu derrota!',
    team: [{ speciesId: 528, level: 33 }, { speciesId: 521, level: 33 }, { speciesId: 581, level: 35 }] },
  { id: 'brycen', name: 'Junco', trainerClass: 'gym', specialtyType: 'ice', sprite: T('brycen'), reward: { money: 3400 }, quote: 'El hielo es duro y bello. ¡Como mi voluntad!',
    team: [{ speciesId: 583, level: 37 }, { speciesId: 615, level: 37 }, { speciesId: 614, level: 39 }] },
  { id: 'drayden', name: 'Lirio', trainerClass: 'gym', specialtyType: 'dragon', sprite: T('drayden'), reward: { money: 4200 }, quote: '¡Los dragones rugen! ¿Podrás resistir su poder?',
    team: [{ speciesId: 611, level: 41 }, { speciesId: 621, level: 41 }, { speciesId: 612, level: 43 }] },
]

export const UNOVA_ELITE_FOUR: TrainerData[] = [
  { id: 'shauntal', name: 'Anís', trainerClass: 'elite', specialtyType: 'ghost', sprite: T('shauntal'), reward: { money: 6000 }, quote: 'Escribo historias de Pokémon fantasma... ¡y de tu derrota!',
    team: [{ speciesId: 563, level: 48 }, { speciesId: 593, level: 48 }, { speciesId: 623, level: 48 }, { speciesId: 609, level: 50 }] },
  { id: 'grimsley', name: 'Adriano', trainerClass: 'elite', specialtyType: 'dark', sprite: T('grimsley'), reward: { money: 6000 }, quote: 'La victoria y la derrota son como una apuesta...',
    team: [{ speciesId: 560, level: 48 }, { speciesId: 553, level: 48 }, { speciesId: 510, level: 48 }, { speciesId: 625, level: 50 }] },
  { id: 'caitlin', name: 'Catleya', trainerClass: 'elite', specialtyType: 'psychic', sprite: T('caitlin'), reward: { money: 6000 }, quote: 'Mis Pokémon psíquicos y yo somos uno. ¡Adelante!',
    team: [{ speciesId: 579, level: 48 }, { speciesId: 518, level: 48 }, { speciesId: 561, level: 48 }, { speciesId: 576, level: 50 }] },
  { id: 'marshal', name: 'Lotto', trainerClass: 'elite', specialtyType: 'fighting', sprite: T('marshal'), reward: { money: 6000 }, quote: '¡Mi cuerpo y mis Pokémon de lucha son mi arma!',
    team: [{ speciesId: 538, level: 48 }, { speciesId: 539, level: 48 }, { speciesId: 534, level: 48 }, { speciesId: 620, level: 50 }] },
]

export function buildUnovaChampion(_rivalFinalId: number): TrainerData {
  return { id: 'champion-alder', name: 'Mirto', trainerClass: 'champion', sprite: T('alder'), reward: { money: 13000 }, quote: '¡Soy Mirto, el Campeón! ¡Demuéstrame tu vínculo con tus Pokémon!',
    team: [{ speciesId: 617, level: 56 }, { speciesId: 626, level: 56 }, { speciesId: 621, level: 57 }, { speciesId: 584, level: 56 }, { speciesId: 589, level: 57 }, { speciesId: 637, level: 60 }] }
}
