import type { TrainerData } from '@/types'
import type { StoryLine } from './chapters'
import type { ChapterContent } from './content'

const SHOWDOWN = (slug: string) => `https://play.pokemonshowdown.com/sprites/trainers/${slug}.png`

// Capítulo 4 — «El Coro de los Inestables».
// Las cavernas naturales bajo el laboratorio, donde se "retira" a los
// experimentos fallidos del dossier (Misdreavus, Yanmega, Flygon, Bronzong,
// Lapras). La roca amplifica sus ecos: todo el capítulo es una caja de
// resonancia... y algo ahí abajo dirige el coro.

const POOL = [
  74, 75, 76, 95, // roca viva de las cavernas (Geodude, Onix)
  92, 93, 200, // ecos espectrales (Gastly, Misdreavus)
  193, 469, // zumbidos en la oscuridad (Yanma, Yanmega)
  328, 329, 330, // el Espíritu del Desierto y sus crías (Trapinch, Vibrava, Flygon)
  436, 437, 433, 358, // campanas que nadie toca (Bronzor, Chingling, Chimecho)
  41, 42, // los túneles siguen siendo suyos (Zubat)
]

const CLASSES = [
  { name: 'Espeleóloga', slug: 'hiker', pool: [74, 75, 76, 95] },
  { name: 'Médium de las profundidades', slug: 'medium', pool: [92, 93, 200] },
  { name: 'Cazador de ecos', slug: 'ruinmaniac', pool: [328, 329, 436] },
  { name: 'Domador inestable', slug: 'pokemaniac', pool: [193, 469, 433] },
  { name: 'Fugitivo del laboratorio', slug: 'burglar', pool: [88, 109, 41, 42] },
]

const BOSS: { trainer: TrainerData; team: number[]; aceLevel: number } = {
  trainer: {
    id: 'story-custodian',
    name: 'El Custodio',
    trainerClass: 'champion',
    sprite: SHOWDOWN('medium'),
    reward: { money: 7500 },
    quote: 'Yo cuido de lo que ellos tiran. Los inestables también cantan… y cantan para mí.',
    team: [],
  },
  team: [200, 469, 131, 437, 330], // Misdreavus, Yanmega, Lapras, Bronzong, Flygon (ace)
  aceLevel: 33,
}

const PREBOSS: StoryLine[] = [
  { text: 'La caverna se abre en una catedral de piedra. Cientos de ojos brillan en los nichos de las paredes.', glitch: true },
  { speaker: 'El Custodio', text: 'Chissst. Vas a despertarlos. Aquí abajo el silencio se gana… o se paga.' },
  { speaker: 'El Custodio', text: 'Los científicos los llaman fracasos. Yo los llamo mi coro. ¡Cantad para el invitado!', glitch: true },
]
const OUTRO: StoryLine[] = [
  { speaker: 'El Custodio', text: 'Bien… muy bien. Tu equipo también canta, ¿lo sabías? Todos cantan, al final.' },
  { text: 'El Custodio se hace a un lado y señala una grieta por la que sale luz fría y un zumbido constante.' },
  { speaker: 'El Custodio', text: 'Eso que oyes es el Núcleo. El corazón que alimenta la frecuencia. Si lo paras… la isla entera dejará de cantar.', glitch: true },
]

export const CHAPTER4: ChapterContent = {
  pool: POOL,
  classes: CLASSES,
  boss: BOSS,
  preboss: PREBOSS,
  outro: OUTRO,
  startLevel: 24,
  layers: [{ width: 2 }, { width: 3 }, { width: 3, heal: true }, { width: 3 }, { width: 3 }, { width: 3, heal: true }, { width: 3 }, { width: 2, heal: true }],
}
