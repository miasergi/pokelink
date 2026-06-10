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
  // Fondos de los caps. 3-6: fotografías de Unsplash (licencia Unsplash, uso
  // libre). Créditos: c3 Felipe Galvan/Zachary Spears · c4 Phạm Mạnh/tian
  // dayong · c5 itsiken/Eury Escudero · c6 Kristaps Ungurs/Rémy Penet.
  {
    id: 3,
    title: 'Capítulo 3',
    subtitle: 'Los Laboratorios Sumergidos',
    gen: 1,
    bg: import.meta.env.BASE_URL + 'story/chapter3-bg.webp',
    mapBg: import.meta.env.BASE_URL + 'story/chapter3-map.webp',
    synopsis:
      'El ascensor del búnker desciende al nivel −3: pasillos blancos bajo el mar, jaulas insonorizadas y los primeros PROTOTIPOS del tipo Sonoro. La Dra. Lyra, jefa de bioacústica, prepara el «primer concierto» de sus criaturas.',
    intro: [
      { text: 'Las puertas del ascensor se cierran. El descenso dura demasiado: el mar queda arriba y el zumbido, abajo.', glitch: true },
      { speaker: 'Voz del sistema', text: 'Nivel −3. Bioacústica. Recuerde su protección auditiva reglamentaria.', glitch: true },
      { text: 'Pasillos blancos, ventanas a tanques de agua oscura. En cada jaula de cristal, un Pokémon canta… aunque no quiera.' },
      { speaker: 'Becario', text: '¡No deberías estar aquí! Si la doctora te oye… no, espera. Aquí TODO se oye. Ya viene.', glitch: true },
      { text: 'Encuentra a la Dra. Lyra y corta el proyecto de raíz.' },
    ],
  },
  {
    id: 4,
    title: 'Capítulo 4',
    subtitle: 'El Coro de los Inestables',
    gen: 1,
    bg: import.meta.env.BASE_URL + 'story/chapter4-bg.webp',
    mapBg: import.meta.env.BASE_URL + 'story/chapter4-map.webp',
    synopsis:
      'Bajo los laboratorios hay cavernas naturales donde se «retira» a los experimentos fallidos. La roca amplifica sus ecos rotos. Algo, ahí abajo, los dirige como a un coro… y se hace llamar El Custodio.',
    intro: [
      { text: 'La grieta del mapa de la Dra. Lyra existe. Bajas con una cuerda prestada y el eco de tus pasos se multiplica… en voces que no son tuyas.', glitch: true },
      { text: 'Marcas rojas en la roca: «INESTABLES — NO ABRIR». Las jaulas de esta zona están todas abiertas.' },
      { speaker: '???', text: 'Pasa, pasa. Pocos visitantes bajan al ensayo. Ninguno se queda al concierto entero.', glitch: true },
      { text: 'Cruza las cavernas de resonancia y enfréntate a quien dirige el coro de los descartados.' },
    ],
  },
  {
    id: 5,
    title: 'Capítulo 5',
    subtitle: 'El Núcleo de Resonancia',
    gen: 1,
    bg: import.meta.env.BASE_URL + 'story/chapter5-bg.webp',
    mapBg: import.meta.env.BASE_URL + 'story/chapter5-map.webp',
    synopsis:
      'El corazón de la isla: un reactor que late como un diapasón gigante y sintoniza a cada Pokémon con la frecuencia del proyecto. El Director Krell custodia la sala de control con los «modificados con éxito».',
    intro: [
      { text: 'Sigues la luz fría de la grieta hasta una sala imposible: turbinas, bobinas y un cilindro de luz que late. Cada latido te zumba en los dientes.', glitch: true },
      { speaker: 'Voz del sistema', text: 'Núcleo de resonancia al 97%. Sincronización insular: estable.', glitch: true },
      { text: 'Aquí nace la frecuencia que enferma a toda la isla. Si el Núcleo cae, el Arquitecto pierde su orquesta.' },
      { speaker: 'Director Krell', text: 'Sé que estás ahí, intruso. Sube. Hace tiempo que el proyecto no recibe… crítica externa.', glitch: true },
    ],
  },
  {
    id: 6,
    title: 'Capítulo 6',
    subtitle: 'La Frecuencia Madre',
    gen: 1,
    bg: import.meta.env.BASE_URL + 'story/chapter6-bg.webp',
    mapBg: import.meta.env.BASE_URL + 'story/chapter6-map.webp',
    synopsis:
      'La torre de Mistery Island. Con el Núcleo apagado, el Arquitecto canaliza la frecuencia desde su origen: Meloetta, la «frecuencia madre», encerrada en lo alto. El capítulo final: libérala y silencia la isla para siempre.',
    intro: [
      { text: 'Con el Núcleo en parada, la torre es lo único que sigue sonando en toda la isla. Una melodía triste baja por la escalera de caracol.', glitch: true },
      { speaker: 'El Arquitecto', text: 'Sube, sube. Toda obra necesita público… y la mía está a una nota de terminarse.', glitch: true },
      { text: 'Los últimos fieles del proyecto defienden cada planta. Arriba espera la cápsula de cristal… y quien la llena de música.' },
      { text: 'Es el final del camino. Libera a Meloetta.' },
    ],
  },
]

/** Iniciales de Kanto (de momento). */
export const KANTO_STARTERS = [1, 4, 7]
