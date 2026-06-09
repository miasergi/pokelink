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
  /** Imagen de fondo del capítulo (hub/cinemáticas). */
  bg: string
  /** Imagen de fondo del MAPA de la run (escenario del capítulo). */
  mapBg: string
  intro: StoryLine[]
}

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: 'Capítulo 1',
    subtitle: 'El Archipiélago de Niebla',
    gen: 1,
    bg: import.meta.env.BASE_URL + 'story/chapter1-bg.webp',
    mapBg: import.meta.env.BASE_URL + 'story/chapter1-map.webp',
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
  {
    id: 2,
    title: 'Capítulo 2',
    subtitle: 'La Costa Prohibida',
    gen: 1,
    bg: import.meta.env.BASE_URL + 'story/chapter2-bg.webp',
    mapBg: import.meta.env.BASE_URL + 'story/chapter2-map.webp',
    synopsis:
      'El ferry te deja en una playa fortificada: vallas electrificadas, focos y puestos de control abandonados. La tecnología de los científicos está por todas partes… y también sus primeros experimentos defectuosos. Infíltrate en el perímetro de seguridad.',
    intro: [
      { text: 'El ferry encalla en una cala oculta. El capitán no baja: solo señala hacia las luces de los focos que barren la niebla.' },
      { speaker: 'El Capitán', text: 'Hasta aquí llego yo. Lo de ahí dentro… ya no es mar. Es de ellos.' },
      { text: 'Vallas electrificadas. Cámaras. Carteles de "ACCESO RESTRINGIDO" oxidados por la sal.' },
      { text: 'Y entre las rocas, algo se mueve mal: un Pokémon salvaje que tiembla y emite un chillido que no es suyo.', glitch: true },
      { speaker: 'Voz por megafonía', text: 'Atención. Perímetro exterior comprometido. Unidades de seguridad, a sus puestos.', glitch: true },
      { text: 'No hay vuelta atrás. Solo hacia dentro.' },
    ],
  },
]

/** Iniciales de Kanto (de momento). */
export const KANTO_STARTERS = [1, 4, 7]
