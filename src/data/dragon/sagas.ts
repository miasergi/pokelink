// Las cuatro sagas. Cada una es un tramo del mapa con su paleta, su pool de
// rivales y su jefe multifase.
//
// `plScale` es TEATRO PURO: multiplica el número que canta el scouter para que
// los millones de la saga de Cell existan sin tocar un solo número del balance
// (ver `powerLevel` en engine/dragon/roster.ts). Nunca entra en un cálculo de
// daño.

export interface BossDef {
  id: string
  /**
   * Nivel del jefe. Va TRES por encima del final de su tramo desde que los
   * luchadores tienen carácter y vínculos: esos bonus son del jugador (cuatro
   * cuerpos con rasgos contra uno) y sin compensarlos el bot que juega bien se
   * terminaba el juego el 43 % de las veces.
   */
  level: number
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
  /** Nivel de los rivales normales al empezar y al acabar el tramo. */
  levels: [number, number]
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
  {
    id: 0,
    name: 'Los Saiyans',
    subtitle: 'Un hermano que nadie esperaba',
    scene: 'yermo',
    color: '#f97316',
    plScale: 1,
    levels: [6, 18],
    pool: ['saibaman', 'soldado', 'raditz'],
    elites: ['raditz', 'nappa'],
    boss: {
      id: 'vegeta_saiyan',
      level: 21,
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
    levels: [24, 34],
    pool: ['soldado', 'cui', 'dodoria', 'zarbon'],
    elites: ['zarbon', 'recoome', 'ginyu'],
    boss: {
      id: 'freezer',
      // Dos por debajo del resto de jefes: es el primer muro de verdad y se
      // llevaba la mitad de las runs él solo.
      level: 35,
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
    levels: [38, 48],
    pool: ['a19', 'soldado', 'a17', 'cui'],
    elites: ['a17', 'a19', 'cell'],
    boss: {
      id: 'cell',
      level: 51,
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
    levels: [52, 62],
    pool: ['dabura', 'a17', 'majin_vegeta'],
    elites: ['dabura', 'majin_vegeta'],
    boss: {
      id: 'buu',
      level: 65,
      phases: ['superbuu', 'kidbuu'],
      intro: 'Rosa, sonriente y con un apetito que no distingue entre un planeta y un caramelo.',
      outro: 'Un último puñetazo y el cielo se queda quieto. Por primera vez en toda la aventura, silencio.',
    },
    recruits: ['vegeta', 'gohan', 'trunks', 'a18', 'videl', 'dende'],
    masters: ['kaiosama', 'popo'],
    aiSkill: 0.65,
    intro: 'Un mago sin escrúpulos abre un capullo que llevaba siglos sellado. Dentro no había un arma: había un niño.',
  },
]

export function getSaga(i: number): SagaDef {
  return SAGAS[Math.max(0, Math.min(SAGAS.length - 1, i))]
}
