import type { TrainerData } from '@/types'
import type { StoryLine } from './chapters'
import type { ChapterContent } from './content'

const SHOWDOWN = (slug: string) => `https://play.pokemonshowdown.com/sprites/trainers/${slug}.png`

// Capítulo 5 — «El Núcleo de Resonancia».
// El reactor que alimenta la frecuencia de toda la isla: turbinas, bobinas y
// los "modificados con éxito" del dossier como guardianes de élite. El Director
// Krell defiende la sala de control con los experimentos estrella del proyecto.

const POOL = [
  81, 82, 462, // bobinas con ojos (Magnemite, Magnezone)
  100, 101, 125, 239, // descargas sueltas (Voltorb, Electabuzz)
  479, // el propio sistema, poseído (Rotom)
  599, 600, 601, // engranajes del reactor (Klink)
  848, 849, // batería tóxica (Toxel, Toxtricity)
  728, 729, 909, 910, // sujetos en tanques (Popplio, Fuecoco)
  137, 233, // software de mantenimiento (Porygon)
]

const CLASSES = [
  { name: 'Ingeniero del núcleo', slug: 'scientist', pool: [462, 82, 601, 479] },
  { name: 'Operaria de turbinas', slug: 'worker', pool: [599, 600, 601, 81, 82] },
  { name: 'Guardia de élite', slug: 'blackbelt', pool: [57, 67, 106, 107] },
  { name: 'Acólito de la frecuencia', slug: 'psychic', pool: [358, 433, 437] },
  { name: 'Técnico de descargas', slug: 'guitarist', pool: [125, 239, 848, 100, 101] },
]

const BOSS: { trainer: TrainerData; team: number[]; aceLevel: number } = {
  trainer: {
    id: 'story-director',
    name: 'Director Krell',
    trainerClass: 'champion',
    sprite: SHOWDOWN('colress'),
    reward: { money: 9000 },
    quote: 'El Núcleo no es una máquina: es un diapasón del tamaño de una isla. Y tú estás desafinando.',
    team: [],
  },
  team: [462, 40, 730, 911, 849], // Magnezone, Wigglytuff, Primarina, Skeledirge, Toxtricity (ace)
  aceLevel: 44,
}

const PREBOSS: StoryLine[] = [
  { text: 'La sala de control envuelve el reactor: un cilindro de luz que late como un corazón. Cada latido te zumba en los dientes.', glitch: true },
  { speaker: 'Director Krell', text: 'Impresionante, ¿verdad? Cada Pokémon de esta isla late ya a NUESTRO compás.' },
  { speaker: 'Director Krell', text: 'Arriba, en la torre, espera la Frecuencia Madre. Pero para llegar a ella… tendrás que apagarme a mí.', glitch: true },
]
const OUTRO: StoryLine[] = [
  { speaker: 'Director Krell', text: 'El Núcleo entra en parada de emergencia… ¿Sabes lo que has hecho? ¡El Arquitecto perderá el control del coro!' },
  { text: 'Las turbinas se detienen una a una. Por primera vez desde que pisaste la isla… silencio.', glitch: true },
  { text: 'Y en ese silencio se oye, nítida, una melodía triste que baja desde la torre. Alguien sigue cantando. Alguien encerrado.', glitch: true },
]

export const CHAPTER5: ChapterContent = {
  pool: POOL,
  classes: CLASSES,
  boss: BOSS,
  preboss: PREBOSS,
  outro: OUTRO,
  startLevel: 33,
  layers: [{ width: 2 }, { width: 3 }, { width: 3, heal: true }, { width: 3 }, { width: 3 }, { width: 3, heal: true }, { width: 3 }, { width: 2, heal: true }],
}
