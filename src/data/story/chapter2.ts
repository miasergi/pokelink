import type { TrainerData } from '@/types'
import type { StoryLine } from './chapters'
import type { ChapterContent } from './content'

const SHOWDOWN = (slug: string) => `https://play.pokemonshowdown.com/sprites/trainers/${slug}.png`

// Capítulo 2 — «La Costa Prohibida y el Perímetro de Seguridad».
// Playas fortificadas, vallas electrificadas y puestos de control abandonados.
// Empiezan a verse la tecnología de los científicos y los primeros Pokémon
// "defectuosos" por las ondas de la isla.

const POOL = [
  72, 73, 98, 99, 120, 121, 116, 117, // costa
  81, 82, 100, 101, 125, 137, // tecnología / eléctricos (Magnemite, Voltorb, Electabuzz, Porygon)
  88, 89, 109, 110, // residuos del laboratorio (Grimer, Koffing)
  41, 42, 66, 67, 58, 59, // guardias y patrullas (Zubat, Machop, Growlithe)
]

const CLASSES = [
  { name: 'Guardia de seguridad', slug: 'blackbelt', pool: [66, 67, 56, 57, 106, 107] },
  { name: 'Técnico de laboratorio', slug: 'scientist', pool: [81, 82, 100, 101, 137] },
  { name: 'Patrullero', slug: 'cooltrainer', pool: [58, 59, 88, 89, 109, 110] },
  { name: 'Buzo del perímetro', slug: 'swimmerm', pool: [72, 73, 116, 117, 98, 99] },
  { name: 'Centinela', slug: 'gentleman', pool: [125, 82, 101, 121, 137] },
]

const BOSS: { trainer: TrainerData; team: number[]; aceLevel: number } = {
  trainer: {
    id: 'story-warden',
    name: 'Comandante Vega',
    trainerClass: 'champion',
    specialtyType: 'electric',
    sprite: SHOWDOWN('gentleman'),
    reward: { money: 5000 },
    quote: 'Este perímetro no se cruza. Lo que protejo no debería existir… y tú tampoco saldrás de aquí.',
    team: [],
  },
  team: [101, 89, 110, 82, 131], // Electrode, Muk, Weezing, Magneton, Lapras (ace: sujeto de pruebas)
  aceLevel: 20,
}

const PREBOSS: StoryLine[] = [
  { text: 'Tras las vallas electrificadas, un búnker de hormigón zumba con una energía que eriza la piel.' },
  { speaker: 'Comandante Vega', text: 'Has llegado lejos, intruso. Demasiado. Más allá de esta puerta no hay vuelta a la cordura.' },
  { speaker: 'Comandante Vega', text: 'Mis "sujetos" ya no obedecen a la naturaleza, sino a las frecuencias. Deja que te lo demuestre.', glitch: true },
]
const OUTRO: StoryLine[] = [
  { speaker: 'Comandante Vega', text: 'Imposible… las alarmas… ¡todo el sector está comprometido!' },
  { text: 'Las puertas del perímetro ceden. Un pasillo desciende hacia las profundidades, iluminado por luces blancas y frías.', glitch: true },
  { text: 'Por los altavoces, una voz monótona repite: «Sujeto no autorizado en el nivel −3. Inicien protocolo de resonancia».', glitch: true },
]

export const CHAPTER2: ChapterContent = {
  pool: POOL,
  classes: CLASSES,
  boss: BOSS,
  preboss: PREBOSS,
  outro: OUTRO,
  startLevel: 10,
  layers: [{ width: 2 }, { width: 3 }, { width: 3, heal: true }, { width: 3 }, { width: 3, heal: true }, { width: 3 }, { width: 3 }, { width: 2, heal: true }],
}
