import type { TrainerData } from '@/types'
import type { StoryLine } from './chapters'

const SHOWDOWN = (slug: string) => `https://play.pokemonshowdown.com/sprites/trainers/${slug}.png`

// Pokémon del Archipiélago de Niebla (costa/mar de Kanto): el pool salvaje y de
// capturas del Capítulo 1.
export const ARCHIPELAGO_POOL = [
  16, 17, 21, 22, 19, 20, 41, 42, 54, 55, 60, 61, 72, 73, 79, 80, 86, 87, 90, 91,
  98, 99, 116, 117, 118, 119, 120, 121, 129, 130, 131,
]

// Clases de entrenador temáticas del capítulo (contrabandistas, guardias, marinos).
export interface StoryClass {
  name: string
  slug: string
  /** Especies de las que sale su equipo. */
  pool: number[]
}
export const CHAPTER1_CLASSES: StoryClass[] = [
  { name: 'Contrabandista', slug: 'biker', pool: [41, 42, 19, 20, 109, 88] }, // Zubat/Golbat, Rattata/Raticate, Koffing, Grimer
  { name: 'Marinero', slug: 'sailor', pool: [60, 61, 116, 117, 118, 119, 98, 99] }, // Poliwag, Horsea, Goldeen, Krabby
  { name: 'Nadadora', slug: 'swimmerf', pool: [72, 73, 120, 121, 90, 91, 86, 87] }, // Tentacool, Staryu, Shellder, Seel
  { name: 'Pescador', slug: 'fisherman', pool: [129, 130, 118, 119, 116, 117] }, // Magikarp/Gyarados, Goldeen, Horsea
  { name: 'Guardia del perímetro', slug: 'blackbelt', pool: [66, 67, 56, 57, 106, 107] }, // Machop, Mankey, Hitmon
]

// Jefe del capítulo: el capitán del ferry clandestino.
export const CHAPTER1_BOSS: { trainer: TrainerData; team: number[]; aceLevel: number } = {
  trainer: {
    id: 'story-captain',
    name: 'El Capitán',
    trainerClass: 'champion',
    specialtyType: 'water',
    sprite: SHOWDOWN('sailor'),
    reward: { money: 3000 },
    quote: '¿Crees que puedes llegar a la isla? Por encima de mi cadáver y de mi tripulación.',
    team: [],
  },
  team: [87, 91, 99, 121, 73, 130], // Dewgong, Cloyster, Kingler, Starmie, Tentacruel, Gyarados (ace)
  aceLevel: 20,
}

// Narrativa: antes del jefe y al superar el capítulo.
export const CHAPTER1_PREBOSS: StoryLine[] = [
  { text: 'La niebla se abre. Un viejo ferry oxidado cabecea contra el muelle, y su capitán te corta el paso.' },
  { speaker: 'El Capitán', text: 'Nadie cruza a Mistery Island. Lo que hacen ahí dentro no es asunto tuyo… ni mío.' },
  { speaker: 'El Capitán', text: 'Pero si insistes en hundirte con tus rumores, te hundiré yo primero. ¡A cubierta!', glitch: true },
]
export const CHAPTER1_OUTRO: StoryLine[] = [
  { speaker: 'El Capitán', text: 'Está bien… está bien. Te llevaré. Pero recuerda que te avisé.' },
  { text: 'Mientras el ferry se adentra en la niebla, un zumbido grave vibra en el casco. No viene del motor.', glitch: true },
  { text: 'Algo en la isla está cantando. Y te ha oído llegar.', glitch: true },
]
