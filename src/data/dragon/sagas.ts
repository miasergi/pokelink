// Las cuatro sagas. Cada una es un tramo del mapa con su paleta, su pool de
// rivales y su jefe multifase.
//
// `plScale` es TEATRO PURO: multiplica el número que canta el scouter para que
// los millones de la saga de Cell existan sin tocar un solo número del balance
// (ver `powerLevel` en engine/dragon/roster.ts). Nunca entra en un cálculo de
// daño.

export interface BossDef {
  id: string
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
      level: 18,
      phases: ['ozaru'],
      intro: 'El príncipe de los saiyans aterriza sin prisa. Su rastreador marca un número que no le impresiona.',
      outro: 'La cápsula despega hacia el espacio. No ha sido una victoria: ha sido un aplazamiento.',
    },
    recruits: ['krilin', 'yamcha', 'ten', 'chaoz', 'gohan', 'piccolo'],
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
      level: 34,
      phases: ['freezer2', 'freezer4'],
      intro: 'Flota a un palmo del suelo, sentado en nada. Dice que aún no ha usado ni la mitad de su poder. No está mintiendo.',
      outro: 'El planeta se parte bajo tus pies. Sales de allí porque alguien te sacó, no porque pudieras.',
    },
    recruits: ['krilin', 'gohan', 'piccolo', 'dende', 'vegeta', 'yajirobe'],
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
      level: 48,
      phases: ['semiperfecto', 'perfecto'],
      intro: 'Ha esperado años en un sótano para esto. Solo le falta una cosa para estar completo, y la tienes delante.',
      outro: 'La explosión se lleva media cordillera. Alguien ha pagado el precio y no has sido tú.',
    },
    recruits: ['vegeta', 'trunks', 'piccolo', 'gohan', 'a18', 'ten'],
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
      level: 62,
      phases: ['superbuu', 'kidbuu'],
      intro: 'Rosa, sonriente y con un apetito que no distingue entre un planeta y un caramelo.',
      outro: 'Un último puñetazo y el cielo se queda quieto. Por primera vez en toda la aventura, silencio.',
    },
    recruits: ['vegeta', 'gohan', 'trunks', 'a18', 'videl', 'dende'],
    aiSkill: 0.65,
    intro: 'Un mago sin escrúpulos abre un capullo que llevaba siglos sellado. Dentro no había un arma: había un niño.',
  },
]

export function getSaga(i: number): SagaDef {
  return SAGAS[Math.max(0, Math.min(SAGAS.length - 1, i))]
}
