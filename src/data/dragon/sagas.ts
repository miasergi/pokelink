// TODAS las sagas de Dragon Ball, del arco clásico a Super. Cada una es un
// tramo del mapa con su paleta, su pool de rivales y su jefe.
//
// Los NIVELES no se guardan aquí: se calculan por la posición de la saga
// dentro del arco que estés jugando (`sagaLevels`/`bossLevel`). Así la misma
// saga sirve para empezar una aventura o para ser el noveno tramo de la
// aventura completa, sin duplicar datos ni descuadrar la curva.
//
// `plScale` es TEATRO PURO: multiplica el número que canta el scouter para que
// los millones de la saga de Cell existan sin tocar un solo número del balance
// (ver `powerLevel` en engine/dragon/roster.ts). Nunca entra en un cálculo de
// daño.

export interface BossDef {
  id: string
  /**
   * Transformaciones que encadena al caer. **Máximo dos**: con tres, Freezer
   * sumaba 852 PS efectivos y el combate se iba a 74 turnos que el equipo no
   * tenía turnos para gastar (medido: pega 24 veces, el jefe 60). Dos fases
   * dan el «aún no has visto nada» sin convertirlo en una carrera de fondo.
   */
  phases?: string[]
  intro: string
  outro: string
}

/** Maestros que se cruzan en el camino y lo que enseñan. */
export interface MasterDef {
  id: string
  name: string
  desc: string
  /** Técnicas que puede enseñar (además de mejorar las que ya sabes). */
  teaches: string[]
}

export const MASTERS: MasterDef[] = [
  {
    id: 'roshi', name: 'Maestro Mutenroshi',
    desc: 'Gafas de sol, camisa hawaiana y la escuela de artes marciales más antigua del mundo.',
    teaches: ['kamehameha', 'taiyoken', 'zanzoken'],
  },
  {
    id: 'karin', name: 'Karin',
    desc: 'Un gato que lleva mil años en lo alto de una torre viendo subir a gente.',
    teaches: ['zanzoken', 'concentracion', 'patada_ascendente'],
  },
  {
    id: 'kaito', name: 'Rey Kaito',
    desc: 'Diez veces la gravedad y un chiste malo cada dos minutos.',
    teaches: ['kikoho', 'genkidama', 'concentracion'],
  },
  {
    id: 'popo', name: 'Mr. Popo',
    desc: 'En el Templo Sagrado no se entrena la fuerza: se entrena la calma.',
    teaches: ['muro', 'multiforma', 'concentracion'],
  },
  {
    id: 'whis_master', name: 'Whis',
    desc: 'El ángel que entrena a un dios de la destrucción. Y le pega cuando se distrae.',
    teaches: ['saltotemporal', 'muroluz', 'atomico'],
  },
  {
    id: 'kaiosama', name: 'Kaio del Sur',
    desc: 'Presume de haber entrenado al hombre más fuerte de su galaxia.',
    teaches: ['martillo', 'placaje_ki', 'ondaexpansiva'],
  },
]

export function getMaster(id: string): MasterDef | undefined {
  return MASTERS.find((m) => m.id === id)
}

export interface SagaDef {
  id: number
  name: string
  subtitle: string
  /** Clave de escenario (la UI la traduce a un degradado). */
  scene: string
  color: string
  plScale: number
  pool: string[]
  elites: string[]
  boss: BossDef
  recruits: string[]
  /** Maestros que pueden aparecer en este tramo. */
  masters: string[]
  /**
   * Pericia de la IA rival en este tramo (0-1). La palanca de dificultad que
   * NO toca ningún número del combate. Sube DESPACIO a propósito: con la
   * escala vieja (0,4 → 0,85) el jefe de la última saga llegaba a 1,0, o sea
   * un rival que juega perfecto —castiga todas las cargas, nunca desperdicia
   * ki— contra un jugador que sigue siendo humano. Ninguna run pasaba de la
   * saga 2.
   */
  aiSkill: number
  intro: string
}

export const SAGAS: SagaDef[] = [
  // ================================ DRAGON BALL (arco clásico) ===
  {
    id: 100,
    name: 'La búsqueda',
    subtitle: 'Un niño con cola y siete esferas',
    scene: 'yermo',
    color: '#84cc16',
    plScale: 0.02,
    pool: ['bandido', 'pilaf', 'saibaman'],
    elites: ['bandido', 'nam'],
    boss: {
      id: 'pilaf',
      phases: [],
      intro: 'Un emperador de tres palmos con un castillo lleno de trampas y muy malas ideas.',
      outro: 'El castillo se viene abajo. Las esferas se dispersan otra vez por el mundo.',
    },
    recruits: ['goku_nino', 'krilin', 'yamcha', 'roshi', 'ten'],
    masters: ['roshi', 'karin'],
    aiSkill: 0.3,
    intro: 'Siete esferas repartidas por el mundo y un crío que no sabe lo que es una chica ni lo que es perder.',
  },
  {
    id: 101,
    name: 'El Gran Torneo',
    subtitle: 'La primera vez que alguien te gana',
    scene: 'ciudad',
    color: '#fbbf24',
    plScale: 0.05,
    pool: ['giran', 'nam', 'chappa', 'bandido'],
    elites: ['chappa', 'nam', 'giran'],
    boss: {
      id: 'jackie',
      phases: [],
      intro: 'Un anciano con peluca que pega como si tuviera veinte años. Nadie sospecha nada.',
      outro: 'Pierdes por un pelo y aprendes más en ese combate que en un año de entrenamiento.',
    },
    recruits: ['goku_nino', 'krilin', 'yamcha', 'ten', 'chaoz', 'roshi'],
    masters: ['roshi', 'karin'],
    aiSkill: 0.35,
    intro: 'El Torneo de las Artes Marciales. Aquí no valen las esferas: solo lo que sepas hacer con las manos.',
  },
  {
    id: 102,
    name: 'La Patrulla Roja',
    subtitle: 'Un ejército detrás de las esferas',
    scene: 'ciudad',
    color: '#dc2626',
    plScale: 0.09,
    pool: ['black_rr', 'blue_rr', 'soldado', 'bandido'],
    elites: ['blue_rr', 'black_rr', 'tao'],
    boss: {
      id: 'tao',
      phases: [],
      intro: 'El mejor asesino a sueldo del mundo. Cobra por adelantado y no falla nunca.',
      outro: 'Cae desde muy alto y jura que volverá con recambios de metal.',
    },
    recruits: ['krilin', 'yamcha', 'ten', 'chaoz', 'roshi', 'yajirobe'],
    masters: ['karin', 'roshi'],
    aiSkill: 0.4,
    intro: 'Un ejército entero buscando las esferas, y un asesino a sueldo con una torre de por medio.',
  },
  {
    id: 103,
    name: 'El Rey Demonio',
    subtitle: 'Lo que salió de la vasija',
    scene: 'templo',
    color: '#166534',
    plScale: 0.14,
    pool: ['tambourine', 'piccolo_daimao', 'giran'],
    elites: ['tambourine', 'piccolo_daimao'],
    boss: {
      id: 'piccolo_jr',
      phases: ['gigante'],
      intro: 'La reencarnación del Rey Demonio, criada solo para vengar a su padre. Y ha entrenado.',
      outro: 'Se marcha volando. No es una tregua, es un aplazamiento: os volveréis a ver.',
    },
    recruits: ['krilin', 'ten', 'chaoz', 'yamcha', 'yajirobe', 'roshi'],
    masters: ['karin', 'popo', 'roshi'],
    aiSkill: 0.48,
    intro: 'Alguien ha abierto la vasija. Lo que llevaba siglos dentro ya está matando maestros uno a uno.',
  },
  {
    id: 0,
    name: 'Los Saiyans',
    subtitle: 'Un hermano que nadie esperaba',
    scene: 'yermo',
    color: '#f97316',
    plScale: 1,
    pool: ['saibaman', 'soldado', 'raditz'],
    elites: ['raditz', 'nappa'],
    boss: {
      id: 'vegeta_saiyan',
      phases: ['ozaru'],
      intro: 'El príncipe de los saiyans aterriza sin prisa. Su rastreador marca un número que no le impresiona.',
      outro: 'La cápsula despega hacia el espacio. No ha sido una victoria: ha sido un aplazamiento.',
    },
    recruits: ['krilin', 'yamcha', 'ten', 'chaoz', 'gohan', 'piccolo'],
    masters: ['roshi', 'karin'],
    aiSkill: 0.35,
    intro: 'Un rastreador cae del cielo sobre la Montaña Paoz. Alguien viene a buscar a un guerrero que se olvidó de quién era.',
  },
  {
    id: 1,
    name: 'Namek',
    subtitle: 'Un planeta con fecha de caducidad',
    scene: 'namek',
    color: '#22d3ee',
    plScale: 9,
    pool: ['soldado', 'cui', 'dodoria', 'zarbon'],
    elites: ['zarbon', 'recoome', 'ginyu'],
    boss: {
      id: 'freezer',
      phases: ['freezer2', 'freezer4'],
      intro: 'Flota a un palmo del suelo, sentado en nada. Dice que aún no ha usado ni la mitad de su poder. No está mintiendo.',
      outro: 'El planeta se parte bajo tus pies. Sales de allí porque alguien te sacó, no porque pudieras.',
    },
    recruits: ['krilin', 'gohan', 'piccolo', 'dende', 'vegeta', 'yajirobe'],
    masters: ['kaito', 'karin'],
    aiSkill: 0.45,
    intro: 'Cinco minutos para que el planeta reviente y siete bolas repartidas entre gente que no piensa soltarlas.',
  },
  {
    id: 2,
    name: 'Los Androides',
    subtitle: 'El futuro llegó con malas noticias',
    scene: 'ciudad',
    color: '#38bdf8',
    plScale: 120,
    pool: ['a19', 'soldado', 'a17', 'cui'],
    elites: ['a17', 'a19', 'cell'],
    boss: {
      id: 'cell',
      phases: ['semiperfecto', 'perfecto'],
      intro: 'Ha esperado años en un sótano para esto. Solo le falta una cosa para estar completo, y la tienes delante.',
      outro: 'La explosión se lleva media cordillera. Alguien ha pagado el precio y no has sido tú.',
    },
    recruits: ['vegeta', 'trunks', 'piccolo', 'gohan', 'a18', 'ten'],
    masters: ['popo', 'kaito'],
    aiSkill: 0.55,
    intro: 'Un chico de pelo lila baja de una máquina del tiempo con una advertencia y una lista de fechas.',
  },
  {
    id: 3,
    name: 'Majin Buu',
    subtitle: 'Magia vieja y hambre',
    scene: 'templo',
    color: '#f472b6',
    plScale: 900,
    pool: ['dabura', 'a17', 'majin_vegeta'],
    elites: ['dabura', 'majin_vegeta'],
    boss: {
      id: 'buu',
      phases: ['superbuu', 'kidbuu'],
      intro: 'Rosa, sonriente y con un apetito que no distingue entre un planeta y un caramelo.',
      outro: 'Un último puñetazo y el cielo se queda quieto. Por primera vez en toda la aventura, silencio.',
    },
    recruits: ['vegeta', 'gohan', 'trunks', 'a18', 'videl', 'dende'],
    masters: ['kaiosama', 'popo'],
    aiSkill: 0.65,
    intro: 'Un mago sin escrúpulos abre un capullo que llevaba siglos sellado. Dentro no había un arma: había un niño.',
  },
  // ================================ DRAGON BALL SUPER ===
  {
    id: 200,
    name: 'El Dios de la Destrucción',
    subtitle: 'Alguien que juega en otra liga',
    scene: 'templo',
    color: '#8b5cf6',
    plScale: 6000,
    pool: ['sorbet', 'soldado', 'cabba'],
    elites: ['cabba', 'freezer_dorado'],
    boss: {
      id: 'bills',
      phases: ['divino'],
      intro: 'Se ha despertado de una siesta de treinta y nueve años preguntando por un dios superguerrero.',
      outro: 'Se marcha aburrido, sin haber usado ni el diez por ciento. Y eso es lo que más asusta.',
    },
    recruits: ['vegeta', 'gohan', 'piccolo', 'krilin', 'goten', 'trunks_nino'],
    masters: ['popo', 'kaiosama', 'kaito'],
    aiSkill: 0.6,
    intro: 'Un gato morado que decide qué planetas siguen existiendo acaba de aterrizar preguntando por ti.',
  },
  {
    id: 201,
    name: 'La Resurrección',
    subtitle: 'El tirano vuelve, y esta vez ha entrenado',
    scene: 'yermo',
    color: '#eab308',
    plScale: 12000,
    pool: ['sorbet', 'soldado', 'cui', 'zarbon'],
    elites: ['freezer_dorado', 'ginyu', 'recoome'],
    boss: {
      id: 'freezer_dorado',
      phases: ['golden'],
      intro: 'Cuatro meses de entrenamiento, los primeros de su vida. Y con eso le sobra para volver dorado.',
      outro: 'La Tierra revienta y hay que rebobinar el minuto entero. Nadie sale de esta con orgullo.',
    },
    recruits: ['vegeta', 'gohan', 'piccolo', 'krilin', 'a18', 'roshi'],
    masters: ['kaiosama', 'popo'],
    aiSkill: 0.65,
    intro: 'Sus hombres han reunido las esferas para traerlo de vuelta. Y esta vez el tirano se ha molestado en entrenar.',
  },
  {
    id: 202,
    name: 'El Torneo de los Universos',
    subtitle: 'Saiyans de otro universo',
    scene: 'ciudad',
    color: '#22d3ee',
    plScale: 30000,
    pool: ['cabba', 'caulifla', 'hit', 'kale'],
    elites: ['hit', 'kale', 'kefla', 'whis'],
    boss: {
      id: 'hit',
      phases: [],
      intro: 'El asesino legendario del Universo 6. Se salta el tiempo, así que sus golpes ya han pasado cuando los ves.',
      outro: 'Se retira con una reverencia. Ha aprendido más de ti que tú de él, y eso es lo preocupante.',
    },
    recruits: ['vegeta', 'gohan', 'gotenks', 'a18', 'goten', 'trunks_nino'],
    masters: ['whis_master', 'kaiosama'],
    aiSkill: 0.7,
    intro: 'Dos universos, cinco luchadores por bando y un premio que ninguno de los dioses quiere perder.',
  },
  {
    id: 203,
    name: 'Trunks del Futuro',
    subtitle: 'Un dios con la cara de tu amigo',
    scene: 'ciudad',
    color: '#a3e635',
    plScale: 60000,
    pool: ['goku_black', 'zamasu', 'soldado'],
    elites: ['goku_black', 'zamasu'],
    boss: {
      id: 'zamasu_fusion',
      phases: ['inmortal', 'divino'],
      intro: 'Dos dioses fusionados en uno inmortal, convencidos de que el universo estaría mejor sin mortales.',
      outro: 'Hace falta la espada de un Kaio-shin y borrar una línea temporal entera para acabar con esto.',
    },
    recruits: ['vegeta', 'trunks', 'gohan', 'piccolo', 'a18'],
    masters: ['whis_master', 'kaiosama'],
    aiSkill: 0.75,
    intro: 'Trunks vuelve del futuro con la cara rota: alguien con el rostro de tu mejor amigo está exterminando a la humanidad.',
  },
  {
    id: 204,
    name: 'El Torneo del Poder',
    subtitle: 'Ocho universos, cuarenta y ocho minutos',
    scene: 'templo',
    color: '#dc2626',
    plScale: 150000,
    pool: ['dyspo', 'toppo', 'kefla', 'caulifla'],
    elites: ['toppo', 'kefla', 'dyspo', 'broly'],
    boss: {
      id: 'jiren',
      phases: ['fuerzatotal'],
      intro: 'El más fuerte del Universo 11. No ha venido a pelear: ha venido a que su universo no desaparezca.',
      outro: 'Cae del ring por un pelo, y por primera vez mira a un rival como a un igual.',
    },
    recruits: ['vegeta', 'gohan', 'piccolo', 'a17', 'a18', 'freezer', 'roshi'],
    masters: ['whis_master', 'kaiosama', 'popo'],
    aiSkill: 0.8,
    intro: 'Ocho universos peleando en un solo ring. Los que pierdan dejarán de existir, y el tiempo corre.',
  },
]

/**
 * ARCOS jugables. Una aventura con las doce sagas serían ~72 casillas y varias
 * horas, así que se elige por dónde quieres jugar. Cada arco es una lista de
 * ids de saga EN ORDEN, y la curva de niveles se calcula por la POSICIÓN
 * dentro del arco (ver `sagaLevels`), no con números fijos: así el arco de
 * Super empieza en nivel 6 si lo juegas suelto y encadena si lo juegas dentro
 * de la aventura completa.
 */
export interface ArcDef {
  id: string
  name: string
  subtitle: string
  desc: string
  color: string
  sagas: number[]
}

export const ARCS: ArcDef[] = [
  {
    id: 'z',
    name: 'Dragon Ball Z',
    subtitle: 'De Raditz a Majin Buu',
    desc: 'El arco clásico: los saiyans, Namek, los androides y Buu. Cuatro sagas.',
    color: '#f97316',
    sagas: [0, 1, 2, 3],
  },
  {
    id: 'clasico',
    name: 'Dragon Ball',
    subtitle: 'De las esferas al Rey Demonio',
    desc: 'El principio de todo, cuando el ki aún se medía en cientos. Cuatro sagas.',
    color: '#84cc16',
    sagas: [100, 101, 102, 103],
  },
  {
    id: 'super',
    name: 'Dragon Ball Super',
    subtitle: 'De Bills al Torneo del Poder',
    desc: 'Dioses de la destrucción, otros universos y el ring donde se juega existir. Cinco sagas.',
    color: '#38bdf8',
    sagas: [200, 201, 202, 203, 204],
  },
  {
    id: 'completo',
    name: 'La aventura completa',
    subtitle: 'Las trece sagas, de principio a fin',
    desc: 'Desde el niño de la montaña hasta el Torneo del Poder. Larguísima: para una tarde entera.',
    color: '#fde047',
    sagas: [100, 101, 102, 103, 0, 1, 2, 3, 200, 201, 202, 203, 204],
  },
]

export function getArc(id: string): ArcDef {
  return ARCS.find((a) => a.id === id) ?? ARCS[0]
}

/**
 * Curva de niveles de una saga por su POSICIÓN en el arco.
 *
 * Los 15 de paso no son arbitrarios: es lo que sube el equipo en un tramo
 * (unos 3,5 combates a +4 niveles cada uno). Si el mapa subiera más rápido, el
 * jugador se descolgaría un poco en cada saga y al final del arco iría
 * insalvablemente corto; si subiera más despacio, acabaría paseándose. Medido:
 * con 14 el bot que juega bien se iba al 33 % de runs ganadas, con 15 se queda
 * en el 20 %, que es donde está calibrado el juego.
 */
export const SAGA_LEVEL_STEP = 15
/** Cuánto sube el nivel de los rivales DENTRO de un mismo tramo. */
const SAGA_LEVEL_SPAN = 12
/**
 * Cuánto le saca el jefe al final de su tramo. Bajado de 3 a 2 por feedback:
 * el primer jefe era un muro y no se pasaba de ahí. Medido con el bot que
 * juega bien: con 3 ganaba el 20 % de las runs, con 2 el 33 %, que da margen
 * para aprender las mecánicas sin volverlo un paseo.
 */
const BOSS_LEVEL_OVER = 2

export function sagaLevels(indexInArc: number, startLevel = 6): [number, number] {
  const from = startLevel + indexInArc * SAGA_LEVEL_STEP
  return [from, from + SAGA_LEVEL_SPAN]
}

export function bossLevel(indexInArc: number, startLevel = 6): number {
  return sagaLevels(indexInArc, startLevel)[1] + BOSS_LEVEL_OVER
}

const BY_ID = new Map(SAGAS.map((s) => [s.id, s]))

/** Saga por su id. Ojo: NO es el índice del arco. */
export function getSaga(id: number): SagaDef {
  return BY_ID.get(id) ?? SAGAS[0]
}
