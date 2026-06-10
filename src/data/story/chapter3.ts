import type { TrainerData } from '@/types'
import type { StoryLine } from './chapters'
import type { ChapterContent } from './content'

const SHOWDOWN = (slug: string) => `https://play.pokemonshowdown.com/sprites/trainers/${slug}.png`

// Capítulo 3 — «Los Laboratorios Sumergidos».
// El ascensor del búnker baja al nivel −3: pasillos blancos bajo el mar, jaulas
// de cristal y los PROTOTIPOS del tipo Sonoro (las líneas de Whismur, Kricketot
// y Chimecho del dossier). Aquí la historia enseña por fin el corazón técnico
// del proyecto: la bioacústica.

const POOL = [
  41, 42, 54, 55, // túneles húmedos (Zubat, Psyduck)
  81, 82, 100, 101, 137, 233, // equipamiento del laboratorio (Magnemite, Voltorb, Porygon)
  88, 89, 109, 110, // residuos de los experimentos (Grimer, Koffing)
  293, 294, 401, 402, 433, 358, // PROTOTIPOS sonoros (Whismur, Kricketot, Chingling/Chimecho)
]

const CLASSES = [
  { name: 'Técnico de sonido', slug: 'scientist', pool: [81, 82, 100, 101] },
  { name: 'Bioingeniera', slug: 'scientistf', pool: [137, 433, 358, 401, 402] },
  { name: 'Vigilante del nivel −3', slug: 'blackbelt', pool: [66, 67, 56, 57] },
  { name: 'Celador de jaulas', slug: 'roughneck', pool: [41, 42, 88, 89, 109, 110] },
  { name: 'Becario aterrado', slug: 'youngster', pool: [293, 294, 54, 100] },
]

const BOSS: { trainer: TrainerData; team: number[]; aceLevel: number } = {
  trainer: {
    id: 'story-bioacoustics',
    name: 'Dra. Lyra',
    trainerClass: 'champion',
    sprite: SHOWDOWN('scientistf'),
    reward: { money: 6000 },
    quote: 'La naturaleza afina despacio. Nosotros afinamos en semanas. Escucha a mis prototipos.',
    team: [],
  },
  team: [82, 137, 402, 358, 295], // Magneton, Porygon, Kricketune, Chimecho, Exploud (ace)
  aceLevel: 28,
}

const PREBOSS: StoryLine[] = [
  { text: 'La última compuerta da a un anfiteatro de cristal. Decenas de jaulas insonorizadas vibran al unísono.', glitch: true },
  { speaker: 'Dra. Lyra', text: 'Un intruso con oído fino. Llegas a tiempo: hoy mis prototipos dan su primer concierto.' },
  { speaker: 'Dra. Lyra', text: 'El gen Sonoro es mi partitura. Y no pienso dejar que un desafinado la interrumpa.', glitch: true },
]
const OUTRO: StoryLine[] = [
  { speaker: 'Dra. Lyra', text: 'Imposible… mis prototipos perfectos… ¿desafinando ante un aficionado?' },
  { text: 'Sobre su mesa, un mapa del subsuelo: bajo los laboratorios hay CAVERNAS naturales… llenas de marcas rojas: «INESTABLES — NO ABRIR».', glitch: true },
  { text: 'Entonces lo oyes. Un canto grave y hermoso que no debería sonar aquí: tu Lapras responde a las máquinas de resonancia.', glitch: true },
  { speaker: 'Dra. Lyra', text: 'Vaya, vaya… el espécimen del viejo capitán. Las cubas lo han RECONOCIDO. Su gen ya estaba sembrado; solo necesitaba… afinarse.', glitch: true },
  { text: 'Tu Lapras tiembla un instante y, cuando vuelve a cantar, su voz suena distinta. Más profunda. Artificial. ¡Tu Lapras es ahora de tipo Agua/Sonoro!', glitch: true },
  { text: 'Desde las profundidades, como respuesta, sube un coro desacompasado de aullidos.', glitch: true },
]

export const CHAPTER3: ChapterContent = {
  pool: POOL,
  classes: CLASSES,
  boss: BOSS,
  preboss: PREBOSS,
  outro: OUTRO,
  startLevel: 17,
  layers: [{ width: 2 }, { width: 3 }, { width: 3, heal: true }, { width: 3 }, { width: 3 }, { width: 3, heal: true }, { width: 3 }, { width: 2, heal: true }],
}
