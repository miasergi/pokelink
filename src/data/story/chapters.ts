// Modo Historia: capítulos. Cada capítulo es una "run" temática con narrativa.
// Iteración 1: solo el Capítulo 1 (entrada + cinemática). Los iniciales son de
// Kanto de momento (más adelante: fakemons y contenido temático propio).

export interface StoryLine {
  /** Quién habla (omitido = narración ambiental). */
  speaker?: string
  text: string
  /** Efecto sutil de interferencia en el cuadro (estética sonora). */
  glitch?: boolean
}

export interface Chapter {
  id: number
  title: string
  subtitle: string
  synopsis: string
  /** Generación cuyos Pokémon aparecen en la run del capítulo. */
  gen: number
  intro: StoryLine[]
}

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: 'Capítulo 1',
    subtitle: 'El Archipiélago de Niebla',
    gen: 1,
    synopsis:
      'Islas menores rodeadas de aguas bravas y una niebla que lo devora todo. En algún punto del horizonte se esconde Mistery Island, donde la entrada está prohibida. Ábrete paso entre contrabandistas y guardias hasta el ferry clandestino.',
    intro: [
      { text: 'Más allá del Archipiélago de Niebla, donde el mar ruge contra los acantilados, hay un lugar que no aparece en ningún mapa: Mistery Island.' },
      { text: 'La entrada está prohibida. Quienes lo han intentado, no han vuelto.' },
      { speaker: 'Contrabandista', text: 'Así que tú eres quien quiere saber qué pasa ahí dentro... Tienes agallas, chaval.' },
      { speaker: 'Contrabandista', text: 'Corren rumores feos. Pokémon que ya no suenan como deberían. Frecuencias que enferman.', glitch: true },
      { speaker: 'Contrabandista', text: 'Dicen que están fabricando un tipo que la naturaleza nunca creó. Lo llaman… el tipo Sonoro.', glitch: true },
      { text: 'Las corrientes son traicioneras y los guardias no hacen preguntas. Necesitarás un compañero fuerte a tu lado.' },
      { speaker: 'Contrabandista', text: 'Elige bien. A partir de aquí, no hay vuelta atrás.' },
    ],
  },
]

/** Iniciales de Kanto (de momento). */
export const KANTO_STARTERS = [1, 4, 7]
