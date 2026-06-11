import type { TrainerData } from '@/types'
import type { StoryLine } from './chapters'
import type { ChapterContent } from './content'

const SHOWDOWN = (slug: string) => `https://play.pokemonshowdown.com/sprites/trainers/${slug}.png`

// Capítulo 6 — «La Frecuencia Madre» (final del arco).
// La torre de Mistery Island. Con el Núcleo apagado, el Arquitecto canaliza la
// frecuencia directamente desde su origen: Meloetta, la "frecuencia madre" del
// dossier, encerrada en lo alto. Es el capítulo final: su mejor coro te espera.

const POOL = [
  39, 40, // nanas amplificadas (Jigglypuff)
  293, 294, 295, // los prototipos veteranos (línea Whismur)
  441, // mensajeros ultrasónicos (Chatot)
  714, 715, // guardia aérea (Noibat, Noivern)
  848, 849, // amplificadores vivos (Toxel, Toxtricity)
  200, 429, // los ecos también suben (Misdreavus, Mismagius)
  131, 437, // viejos conocidos del proyecto (Lapras, Bronzong)
]

const CLASSES = [
  { name: 'Guardia del Arquitecto', slug: 'veteran', pool: [715, 330, 469] },
  { name: 'Corista de la torre', slug: 'beauty', pool: [39, 40, 441, 730] },
  { name: 'Portavoz del proyecto', slug: 'gentleman', pool: [295, 294, 441] },
  { name: 'Científico jefe', slug: 'scientist', pool: [849, 462, 137, 233] },
  { name: 'Sombra del coro', slug: 'medium', pool: [200, 429, 94] },
]

const BOSS: { trainer: TrainerData; team: number[]; aceLevel: number } = {
  trainer: {
    id: 'story-architect',
    name: 'El Arquitecto',
    trainerClass: 'champion',
    sprite: SHOWDOWN('ghetsis'),
    reward: { money: 12000 },
    quote: 'Compuse un tipo que la naturaleza no supo imaginar. Y tú quieres silenciarlo. Qué vulgaridad.',
    team: [],
  },
  team: [295, 715, 849, 911, 648], // Exploud, Noivern, Toxtricity, Skeledirge, MELOETTA (ace)
  aceLevel: 46,
}

const PREBOSS: StoryLine[] = [
  { text: 'La cima de la torre es un auditorio abierto al cielo. En el centro, una cápsula de cristal: dentro, una silueta pequeña canta una nana rota.', glitch: true },
  { speaker: 'El Arquitecto', text: 'Bienvenido al estreno. Meloetta lleva años componiendo para mí: cada Pokémon alterado de esta isla es una NOTA de su partitura.' },
  { speaker: 'El Arquitecto', text: 'El tipo Sonoro es mi obra maestra. Si tanto deseas el silencio… mi coro final te lo concederá.', glitch: true },
]
const OUTRO: StoryLine[] = [
  { speaker: 'El Arquitecto', text: 'La partitura… se deshace. Meloetta ya no canta para mí…' },
  { text: 'La cápsula se abre. Meloetta flota un instante frente a ti, te dedica una única nota limpia —la primera verdadera que oyes en esta isla— y se desvanece hacia el mar.', glitch: true },
  { text: 'Las jaulas se abren en cadena, niveles abajo. La frecuencia se apaga. Mistery Island, por fin, suena a olas.' },
  { text: 'Entre los papeles del Arquitecto queda un maletín con VIALES DE FRECUENCIA etiquetados a mano: «el gen Sonoro, dosis estable». Pero esa… es otra historia.', glitch: true },
]

export const CHAPTER6: ChapterContent = {
  pool: POOL,
  classes: CLASSES,
  boss: BOSS,
  preboss: PREBOSS,
  outro: OUTRO,
  startLevel: 38,
  layers: [{ width: 2 }, { width: 3 }, { width: 3, heal: true }, { width: 3 }, { width: 3 }, { width: 3, heal: true }, { width: 3 }, { width: 3 }, { width: 2, heal: true }],
}
