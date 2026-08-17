// Institutos del Football Frontier, en el orden en que aparecen en el torneo.
//
// `power` multiplica los atributos de todo el once rival. OJO al tocarlo: es
// una palanca brutal comparada con el nivel (2 niveles de ventaja son ~+5 % de
// atributos, así que un `power` de 1.42 equivale a sacarle 17 niveles al
// jugador). La primera versión iba de 0.9 a 1.42 y convertía cada eliminatoria
// en una moneda al aire por mucho que fueras ganando: medido con el bot, se
// caía por igual en todas las rondas y nadie levantaba el título.
//
// La dificultad de verdad la marca la CALIDAD DE LA PLANTILLA rival, que ya
// sube sola por el cuadro (Occult juega con ★2 y Zeus con ★4-★5). `power` solo
// da el último empujón.
//
// La curva se rebajó al pasar a plantillas REALES de 14 jugadores: antes los
// rivales eran 3-5 jugadores con nombre y el resto relleno flojo, y al darles
// un once entero de verdad la primera eliminatoria se llevaba por delante al
// 30 % de las partidas.
//
// Segundo ajuste, midiendo eliminatoria a eliminatoria: con la cola en 1.26 los
// tres últimos institutos eran un muro (48 % de pase contra Zeus incluso con 28
// niveles de ventaja), y como hay que encadenar OCHO, el título salía decidido
// por la suerte y no por lo que haces.
//
// Tercer ajuste, al quitar los empates gratis (ahora hay prórroga y penaltis) y
// al escribir a mano las estrellas de los cracks: la curva se aplanó por abajo
// (0.72 → 0.94 en los seis primeros) y se dejó la cola alta, que es donde tiene
// que doler. Rango 0.72 → 1.15, y la final se lleva por delante a uno de cada
// cinco que llega.
import type { TeamBase } from '@/engine/inazuma/types'

export const TEAMS: TeamBase[] = [
  {
    id: 'raimon', name: 'Instituto Raimon', color: '#e11d48', kit: ['#fbbf24', '#1d4ed8'], element: 'montana', power: 1, tactic: 'remontada',
    taunt: '¡Vamos, equipo! ¡Nos lo jugamos todo aquí!',
    lineup: [],
  },
  {
    id: 'occult', name: 'Instituto Occult', color: '#7c3aed', kit: ['#94a3b8', '#312e81'], element: 'bosque', power: 0.72, tactic: 'catenaccio',
    taunt: 'Este campo está maldito… y vosotros también.',
    lineup: [],
  },
  {
    id: 'otaku', name: 'Instituto Otaku', color: '#0ea5e9', kit: ['#bae6fd', '#0369a1'], element: 'aire', power: 0.78, tactic: 'academia',
    taunt: 'Hemos calculado vuestras jugadas. Todas.',
    lineup: [],
  },
  {
    id: 'mikage', name: 'Instituto Brain', color: '#14b8a6', kit: ['#5eead4', '#115e59'], element: 'bosque', power: 0.84, tactic: 'toque',
    taunt: 'Vuestras jugadas están calculadas antes de que las penséis.',
    lineup: [],
  },
  {
    id: 'shuriken', name: 'Instituto Shuriken', color: '#334155', kit: ['#64748b', '#0f172a'], element: 'aire', power: 0.89, tactic: 'gegenpressing',
    taunt: 'No nos veréis venir. Nunca lo hacen.',
    lineup: [],
  },
  {
    id: 'farm', name: 'Instituto Farm', color: '#65a30d', kit: ['#86efac', '#166534'], element: 'bosque', power: 0.94, tactic: 'fondo-fisico',
    taunt: 'Llevamos madrugando desde los seis años. ¿Y vosotros?',
    lineup: [],
  },
  {
    id: 'kirkwood', name: 'Instituto Kirkwood', color: '#f97316', kit: ['#fdba74', '#c2410c'], element: 'fuego', power: 1.02, tactic: 'contragolpe',
    taunt: 'Quemamos el campo entero si hace falta.',
    lineup: [],
  },
  {
    id: 'royal', name: 'Royal Academy', color: '#1d4ed8', kit: ['#22c55e', '#b91c1c'], element: 'bosque', power: 1.08, tactic: 'futbol-total',
    taunt: 'El fútbol es una ciencia. Y vosotros no habéis estudiado.',
    lineup: [],
  },
  {
    id: 'zeus', name: 'Instituto Zeus', color: '#facc15', kit: ['#f8fafc', '#a16207'], element: 'fuego', power: 1.15, tactic: 'furinkazan',
    taunt: 'Los dioses no pierden contra unos críos.',
    lineup: [],
  },

  // ------------------------------------------------------------------
  // SAGA ALIUS (Inazuma Eleven 2): la caravana Raimon contra la Academia
  // Alius. Misma curva de `power` que el cuadro clásico (0.72 → 1.15).
  // ------------------------------------------------------------------
  {
    id: 'yokato', name: 'Instituto Yokato', color: '#0284c7', kit: ['#93c5fd', '#1e40af'], element: 'aire', power: 0.72, tactic: 'contragolpe',
    taunt: 'La caravana pasa por aquí… y aquí se queda.',
    lineup: [],
  },
  {
    id: 'oumihara', name: 'Instituto Oumihara', color: '#0d9488', kit: ['#e0f2fe', '#075985'], element: 'bosque', power: 0.78, tactic: 'toque',
    taunt: 'El mar nos enseñó a no rendirnos nunca.',
    lineup: [],
  },
  {
    id: 'gemini-storm', name: 'Tormenta Géminis', color: '#818cf8', kit: ['#a5b4fc', '#3730a3'], element: 'aire', power: 0.86, tactic: 'vibracion',
    taunt: 'Vuestro fútbol es de otro planeta. Del malo.',
    lineup: [],
  },
  {
    id: 'epsilon', name: 'Épsilon', color: '#22d3ee', kit: ['#67e8f9', '#155e75'], element: 'montana', power: 0.94, tactic: 'academia',
    taunt: 'Somos la segunda oleada. No habrá tercera: no hará falta.',
    lineup: [],
  },
  {
    id: 'diamond-dust', name: 'Diamond Dust', color: '#7dd3fc', kit: ['#e0f2fe', '#0284c7'], element: 'aire', power: 1.0, tactic: 'muro',
    taunt: 'El hielo no negocia.',
    lineup: [],
  },
  {
    id: 'prominence', name: 'Prominence', color: '#f97316', kit: ['#fb923c', '#9a3412'], element: 'fuego', power: 1.05, tactic: 'furinkazan',
    taunt: 'Arded con nosotros o apartaos.',
    lineup: [],
  },
  {
    id: 'chaos', name: 'Caos', color: '#a21caf', kit: ['#e879f9', '#701a75'], element: 'fuego', power: 1.1, tactic: 'vibracion',
    taunt: 'Fuego y hielo, juntos. No tenéis ninguna posibilidad.',
    lineup: [],
  },
  {
    id: 'genesis', name: 'Génesis', color: '#6d28d9', kit: ['#c4b5fd', '#4c1d95'], element: 'aire', power: 1.15, tactic: 'furinkazan',
    taunt: 'Somos la obra maestra de la Academia Alius.',
    lineup: [],
  },

  // ------------------------------------------------------------------
  // SAGA FFI (Inazuma Eleven 3): las selecciones del Football Frontier
  // Internacional.
  // ------------------------------------------------------------------
  {
    id: 'inazuma-japan', name: 'Inazuma Japan', color: '#1d4ed8', kit: ['#3b82f6', '#f97316'], element: 'montana', power: 1, tactic: 'remontada',
    taunt: '¡Vamos a por el mundo, equipo!',
    lineup: [],
  },
  {
    id: 'big-waves', name: 'Big Waves', color: '#0891b2', kit: ['#fbbf24', '#166534'], element: 'bosque', power: 0.72, tactic: 'fondo-fisico',
    taunt: 'Surfead nuestra ola… si podéis.',
    lineup: [],
  },
  {
    id: 'desert-lion', name: 'Desert Lion', color: '#d97706', kit: ['#fda4af', '#881337'], element: 'montana', power: 0.78, tactic: 'contragolpe',
    taunt: 'El desierto no perdona a los débiles.',
    lineup: [],
  },
  {
    id: 'knights-of-queen', name: 'Knights of Queen', color: '#4338ca', kit: ['#f8fafc', '#b91c1c'], element: 'aire', power: 0.86, tactic: 'toque',
    taunt: 'Por la reina y por la corona.',
    lineup: [],
  },
  {
    id: 'fire-dragon', name: 'Fire Dragon', color: '#dc2626', kit: ['#ef4444', '#1e3a8a'], element: 'fuego', power: 0.94, tactic: 'escuela-tiro',
    taunt: 'El dragón escupe fuego. Vosotros, excusas.',
    lineup: [],
  },
  {
    id: 'the-empire', name: 'The Empire', color: '#16a34a', kit: ['#bae6fd', '#0284c7'], element: 'bosque', power: 1.0, tactic: 'futbol-total',
    taunt: 'El imperio del fútbol no cede su trono.',
    lineup: [],
  },
  {
    id: 'unicorn', name: 'Unicorn', color: '#2563eb', kit: ['#dbeafe', '#1d4ed8'], element: 'aire', power: 1.05, tactic: 'gegenpressing',
    taunt: 'Sueño americano, pesadilla vuestra.',
    lineup: [],
  },
  {
    id: 'orpheus', name: 'Orpheus', color: '#0f766e', kit: ['#2dd4bf', '#134e4a'], element: 'montana', power: 1.1, tactic: 'academia',
    taunt: 'El fútbol nació aquí. Venid a aprender.',
    lineup: [],
  },
  {
    id: 'little-gigant', name: 'Little Gigant', color: '#b91c1c', kit: ['#ef4444', '#7f1d1d'], element: 'fuego', power: 1.15, tactic: 'muro',
    taunt: 'Pequeños de nombre. Gigantes en el campo.',
    lineup: [],
  },
  // -------------------------------------------------------------------------
  // IE1 · más institutos del Football Frontier
  // -------------------------------------------------------------------------
  {
    id: 'kasamino', name: 'Instituto Kasamino', color: '#f97316', kit: ['#fb923c', '#7c2d12'], element: 'fuego', power: 0.70, tactic: 'fondo-fisico',
    taunt: 'No hace falta técnica para ganar. Hace falta hambre.',
    lineup: [],
  },
  {
    id: 'senbayama', name: 'Instituto Senbayama', color: '#65a30d', kit: ['#84cc16', '#365314'], element: 'montana', power: 0.80, tactic: 'fondo-fisico',
    taunt: 'Aquí se entrena en la montaña. Vosotros solo corréis.',
    lineup: [],
  },
  {
    id: 'the-fires', name: 'The Fires', color: '#dc2626', kit: ['#ef4444', '#450a0a'], element: 'fuego', power: 0.86, tactic: 'escuela-tiro',
    taunt: 'Lo que tocamos, arde.',
    lineup: [],
  },
  {
    id: 'the-mountains', name: 'The Mountains', color: '#a16207', kit: ['#ca8a04', '#422006'], element: 'montana', power: 0.86, tactic: 'muro',
    taunt: 'Intentad mover una montaña. Os esperamos.',
    lineup: [],
  },
  {
    id: 'the-woods', name: 'The Woods', color: '#15803d', kit: ['#22c55e', '#14532d'], element: 'bosque', power: 0.86, tactic: 'catenaccio',
    taunt: 'En nuestro bosque nadie encuentra la portería.',
    lineup: [],
  },
  // -------------------------------------------------------------------------
  // IE2 · la temporada del Instituto Alius
  // -------------------------------------------------------------------------
  {
    id: 'hakuren', name: 'Instituto Hakuren', color: '#38bdf8', kit: ['#e0f2fe', '#0369a1'], element: 'aire', power: 0.84, tactic: 'muro',
    taunt: 'La ventisca juega con nosotros. Abrigaos.',
    lineup: [],
  },
  {
    id: 'shin-teikoku', name: 'Nuevo Instituto Imperial', color: '#4338ca', kit: ['#818cf8', '#1e1b4b'], element: 'bosque', power: 0.96, tactic: 'academia',
    taunt: 'El Imperio ha vuelto. Y esta vez sin ataduras.',
    lineup: [],
  },
  {
    id: 'dark-emperors', name: 'Emperadores Oscuros', color: '#7e22ce', kit: ['#1e1b4b', '#6b21a8'], element: 'bosque', power: 0.98, tactic: 'vibracion',
    taunt: 'Vuestros amigos ya no os reconocen. Nosotros tampoco.',
    lineup: [],
  },
  {
    id: 'epsilon-kai', name: 'Epsilon Mejorado', color: '#16a34a', kit: ['#4ade80', '#14532d'], element: 'bosque', power: 1.02, tactic: 'academia',
    taunt: 'La versión anterior fue el borrador.',
    lineup: [],
  },
  // -------------------------------------------------------------------------
  // IE3 · más selecciones del Mundial
  // -------------------------------------------------------------------------
  {
    id: 'the-kingdom', name: 'The Kingdom', color: '#eab308', kit: ['#facc15', '#166534'], element: 'fuego', power: 1.04, tactic: 'futbol-total',
    taunt: 'En Brasil el balón se acaricia, no se golpea.',
    lineup: [],
  },
  {
    id: 'rose-griffon', name: 'Rose Griffon', color: '#ec4899', kit: ['#f9a8d4', '#831843'], element: 'aire', power: 1.02, tactic: 'toque',
    taunt: 'Elegancia francesa. Vais a perder con estilo.',
    lineup: [],
  },
  {
    id: 'brockenborg', name: 'Brockenborg', color: '#525252', kit: ['#e5e5e5', '#171717'], element: 'montana', power: 1.06, tactic: 'catenaccio',
    taunt: 'Máquinas. Sin fisuras, sin dudas, sin piedad.',
    lineup: [],
  },
  {
    id: 'ogre', name: 'Team Ogre', color: '#166534', kit: ['#14532d', '#052e16'], element: 'montana', power: 1.12, tactic: 'gegenpressing',
    taunt: 'Venimos del futuro a borraros del torneo.',
    lineup: [],
  },
  {
    id: 'neo-japan', name: 'Neo Japan', color: '#b91c1c', kit: ['#fecaca', '#7f1d1d'], element: 'fuego', power: 1.08, tactic: 'academia',
    taunt: 'Nosotros somos la selección que Japón merecía.',
    lineup: [],
  },
  {
    id: 'gaia', name: 'Team Gaia', color: '#0d9488', kit: ['#5eead4', '#134e4a'], element: 'bosque', power: 1.10, tactic: 'furinkazan',
    taunt: 'El planeta entero juega de nuestra parte.',
    lineup: [],
  },
  // -------------------------------------------------------------------------
  // IEVR (Victory Road) · el Football Frontier de la nueva generación
  //
  // Caras NUEVAS: de estos institutos solo entra gente que DEBUTA en Victory
  // Road. Los de IE1-IE3 que reaparecen de mayores se quedan fuera — no
  // queremos la misma plantilla dos veces con otra cara.
  // -------------------------------------------------------------------------
  {
    id: 'nagumohara', name: 'Instituto Nagumohara', color: '#0d9488', kit: ['#f0fdfa', '#0d9488'], element: 'aire', power: 0.78, tactic: 'remontada',
    taunt: 'Aquí se juega por gusto. Y por eso ganamos.',
    lineup: [],
  },
  {
    id: 'ouja-raimon', name: 'Raimon Soberano', color: '#dc2626', kit: ['#f87171', '#1d4ed8'], element: 'montana', power: 1.05, tactic: 'vibracion',
    taunt: 'El nombre pesa. Nosotros lo llevamos bien.',
    lineup: [],
  },
  {
    id: 'hokuyou-gakuen', name: 'Instituto Hokuyou', color: '#0ea5e9', kit: ['#7dd3fc', '#0c4a6e'], element: 'aire', power: 0.82, tactic: 'contragolpe',
    taunt: 'Del norte se viene con el viento de cara aprendido.',
    lineup: [],
  },
  {
    id: 'ai-gakuen', name: 'Instituto AI', color: '#22d3ee', kit: ['#a5f3fc', '#155e75'], element: 'bosque', power: 0.94, tactic: 'academia',
    taunt: 'Vuestro partido ya está calculado. Jugadlo si queréis.',
    lineup: [],
  },
  {
    id: 'houreikan', name: 'Houreikan', color: '#b91c1c', kit: ['#fca5a5', '#7f1d1d'], element: 'fuego', power: 0.9, tactic: 'catenaccio',
    taunt: 'Disciplina antes que talento. Siempre.',
    lineup: [],
  },
  {
    id: 'ijin-meibundou', name: 'Ijin Meibundou', color: '#a16207', kit: ['#fcd34d', '#451a03'], element: 'montana', power: 0.98, tactic: 'academia',
    taunt: 'Los grandes nombres de la historia juegan de nuestra parte.',
    lineup: [],
  },
  {
    id: 'keizen-arashiyama', name: 'Keizen Arashiyama', color: '#16a34a', kit: ['#86efac', '#14532d'], element: 'bosque', power: 0.86, tactic: 'gegenpressing',
    taunt: 'La tormenta de la montaña no avisa.',
    lineup: [],
  },
  {
    id: 'nishinomiya', name: 'Instituto Nishinomiya', color: '#8b5cf6', kit: ['#c4b5fd', '#4c1d95'], element: 'aire', power: 0.88, tactic: 'toque',
    taunt: 'Venimos a jugar bonito. Y a ganar.',
    lineup: [],
  },
  {
    id: 'senjutsu-no-teikoku', name: 'Imperio de la Estrategia', color: '#4338ca', kit: ['#a5b4fc', '#1e1b4b'], element: 'bosque', power: 1.08, tactic: 'academia',
    taunt: 'No improvisamos. Nunca hemos improvisado.',
    lineup: [],
  },
  {
    id: 'toufuu-ikokukan', name: 'Toufuu Ikokukan', color: '#e11d48', kit: ['#fda4af', '#881337'], element: 'fuego', power: 1.0, tactic: 'futbol-total',
    taunt: 'Fútbol de otras tierras. No lo habéis visto nunca.',
    lineup: [],
  },
  {
    id: 'hakuren-vr', name: 'Hakuren (nueva generación)', color: '#38bdf8', kit: ['#e0f2fe', '#0369a1'], element: 'aire', power: 0.92, tactic: 'muro',
    taunt: 'La nieve sigue aquí. Los de antes ya no.',
    lineup: [],
  },
]

export const TEAM_BY_ID = new Map(TEAMS.map((t) => [t.id, t]))

/**
 * Nombre y escudo A PINTAR para el equipo del usuario: el del instituto, o los
 * elegidos a mano en el modo bombo (nombre libre + cualquier escudo).
 */
export function teamDisplay(save: { teamId?: string; customName?: string; customCrest?: string }): { name: string; crestId: string } {
  const team = TEAM_BY_ID.get(save.teamId ?? 'raimon')
  return {
    name: save.customName ?? team?.name ?? 'Mi equipo',
    crestId: save.customCrest ?? save.teamId ?? 'raimon',
  }
}

export function getTeam(id: string): TeamBase {
  const t = TEAM_BY_ID.get(id)
  if (!t) throw new Error(`Instituto desconocido: ${id}`)
  return t
}

/** Nombres de las eliminatorias, de la primera a la final. */
export const ROUND_NAMES = [
  'Primera ronda', 'Segunda ronda', 'Tercera ronda', 'Octavos',
  'Cuartos', 'Repesca', 'Semifinal', 'FINAL',
]

/**
 * SAGAS: cada una es un torneo completo con sus NUEVE equipos (el tuyo + ocho
 * rivales), sus jugables y su pool de fichajes propio — la «región» del
 * roguelike. Los equipos que no están en `teams` nunca entran en su cuadro.
 */
export interface Saga {
  id: 'ff' | 'alius' | 'ffi' | 'vr'
  name: string
  desc: string
  /** Los NUEVE equipos del torneo (jugables incluidos). */
  teams: string[]
  playable: string[]
  /** Equipos cuyos jugadores nutren el ojeador ADEMÁS de los ya derrotados. */
  scoutTeams: string[]
}

export const SAGAS: Saga[] = [
  {
    id: 'ff',
    name: 'Inazuma Eleven',
    desc: 'La primera temporada: el torneo nacional de institutos.',
    teams: ['raimon', 'occult', 'otaku', 'mikage', 'shuriken', 'farm', 'kirkwood', 'royal', 'zeus'],
    playable: ['raimon', 'occult', 'royal'],
    scoutTeams: ['kfc', 'oumihara', 'manyuuji', 'yokato', 'windies', 'extra-stars', 'kage-no-hero',
      'kasamino', 'senbayama', 'the-fires', 'the-mountains', 'the-woods'],
  },
  {
    id: 'alius',
    name: 'Inazuma Eleven 2',
    desc: 'La segunda temporada: la caravana Raimon contra los equipos alienígenas.',
    teams: ['raimon', 'yokato', 'oumihara', 'gemini-storm', 'epsilon', 'diamond-dust', 'prominence', 'chaos', 'genesis'],
    playable: ['raimon', 'genesis'],
    scoutTeams: ['occult', 'otaku', 'shuriken', 'farm', 'kirkwood', 'royal', 'zeus', 'kfc', 'mikage', 'manyuuji', 'windies', 'extra-stars', 'kage-no-hero',
      'hakuren', 'shin-teikoku', 'dark-emperors', 'epsilon-kai'],
  },
  {
    id: 'ffi',
    name: 'Inazuma Eleven 3',
    desc: 'La tercera temporada: las selecciones del mundial juvenil.',
    teams: ['inazuma-japan', 'big-waves', 'desert-lion', 'knights-of-queen', 'fire-dragon', 'the-empire', 'unicorn', 'orpheus', 'little-gigant'],
    playable: ['inazuma-japan', 'orpheus', 'unicorn'],
    scoutTeams: ['raimon', 'royal', 'zeus', 'kirkwood', 'gemini-storm', 'epsilon', 'diamond-dust', 'prominence', 'chaos', 'genesis', 'windies', 'extra-stars', 'kage-no-hero',
      'the-kingdom', 'rose-griffon', 'brockenborg', 'ogre', 'neo-japan', 'gaia'],
  },
  {
    id: 'vr',
    name: 'Inazuma Eleven VR',
    desc: 'La nueva generación: el Football Frontier años después, con caras que no habías visto.',
    teams: ['nagumohara', 'hokuyou-gakuen', 'keizen-arashiyama', 'nishinomiya', 'houreikan', 'hakuren-vr', 'ai-gakuen', 'toufuu-ikokukan', 'senjutsu-no-teikoku'],
    playable: ['nagumohara', 'ouja-raimon', 'hokuyou-gakuen'],
    // El ojeador de esta región mueve SOLO gente de Victory Road: es otra
    // época y mezclarla con los clásicos rompería la idea.
    scoutTeams: ['ouja-raimon', 'ijin-meibundou'],
  },
]

export const SAGA_BY_ID = new Map(SAGAS.map((s) => [s.id, s]))
export type SagaId = Saga['id']

export function getSaga(id?: string): Saga {
  return SAGA_BY_ID.get((id ?? 'ff') as SagaId) ?? SAGAS[0]
}

/**
 * Institutos que puedes elegir al empezar (saga clásica). Cada uno cambia la
 * partida entera: con quién arrancas y contra quién juegas.
 */
export const PLAYABLE_TEAMS = SAGAS[0].playable

/**
 * Cuadro del torneo DE UNA SAGA: los OCHO equipos que no son el tuyo,
 * ordenados de menos a más fuertes. Así, elegir equipo no solo cambia tu
 * plantilla — también mete en el cuadro al que has descartado.
 */
export function buildBracket(
  playerTeamId: string,
  sagaId?: string,
  /** RANDOMIZADOR de cuadro: institutos de estas épocas, no los de la saga. */
  shuffleFrom?: { eras: RegionId[]; rng: { int: (a: number, b: number) => number } },
): { teamId: string; name: string }[] {
  const saga = getSaga(sagaId)
  if (shuffleFrom) {
    // El cuadro se sortea entre TODOS los institutos de las épocas elegidas,
    // ordenados luego por dificultad: la escalada se mantiene, pero no sabes
    // a quién te vas a encontrar.
    const eras = new Set(shuffleFrom.eras)
    const pool = TEAMS.filter((t) => t.id !== playerTeamId && t.id !== 'libre'
      && (!eras.size || eras.has(regionOfTeam(t.id))))
    const picked: TeamBase[] = []
    const rest = pool.slice()
    while (picked.length < ROUND_NAMES.length && rest.length) {
      picked.push(...rest.splice(shuffleFrom.rng.int(0, rest.length - 1), 1))
    }
    if (picked.length === ROUND_NAMES.length) {
      return picked
        .sort((a, b) => a.power - b.power)
        .map((t, i) => ({ teamId: t.id, name: ROUND_NAMES[i] }))
    }
  }
  const rivals = TEAMS
    .filter((t) => saga.teams.includes(t.id) && t.id !== playerTeamId)
    .sort((a, b) => a.power - b.power)
    // Desde el FINAL: si juegas con un equipo de FUERA de la saga, sobra un
    // candidato — y debe caerse el más flojo, no el jefe final.
    .slice(-ROUND_NAMES.length)
  return rivals.map((t, i) => ({ teamId: t.id, name: ROUND_NAMES[i] }))
}

/** Cuadro por defecto (Raimon, saga clásica), para datos y tipos. */
export const BRACKET = buildBracket('raimon')

/** Nombres de relleno para completar los onces rivales que no llegan a 11. */
export const FILLER_NAMES: string[] = [
  'Dani Moro', 'Iván Prado', 'Leo Rivas', 'Marc Duval', 'Tomás Vela', 'Óscar Rey',
  'Nico Serra', 'Hugo Lasa', 'Bruno Cid', 'Álex Duna', 'Iker Mora', 'Pau Riera',
  'Diego Sanz', 'Raúl Vidal', 'Adri Cano', 'Saúl Mena', 'Gael Ferrer', 'Unai Roca',
]

// ---------------------------------------------------------------------------
// Regiones (de qué juego es cada instituto)
// ---------------------------------------------------------------------------

/** Las cuatro épocas del modo, en orden de la saga. */
export const REGIONS = [
  { id: 'ff' as const, name: 'IE1 · Football Frontier', desc: 'La primera temporada: institutos de Japón.' },
  { id: 'alius' as const, name: 'IE2 · Academia Alius', desc: 'La invasión alienígena y los equipos de la caravana.' },
  { id: 'ffi' as const, name: 'IE3 · Mundial (FFI)', desc: 'Las selecciones del Football Frontier Internacional.' },
  { id: 'vr' as const, name: 'IEVR · Victory Road', desc: 'La nueva generación, años después.' },
]

export type RegionId = (typeof REGIONS)[number]['id']

/**
 * REGIÓN de cada instituto. Se calcula del cuadro de cada saga y se completa a
 * mano con los equipos que solo salen en el ojeador (que no están en ningún
 * cuadro pero sí pertenecen a una época).
 */
const EXTRA_REGION: Record<string, RegionId> = {
  // IE1: institutos del Football Frontier que no entran en el cuadro.
  kfc: 'ff', oumihara: 'ff', manyuuji: 'ff', yokato: 'ff', windies: 'ff',
  'extra-stars': 'ff', 'kage-no-hero': 'ff', kasamino: 'ff', senbayama: 'ff',
 'the-fires': 'ff', 'the-mountains': 'ff', 'the-woods': 'ff',
  mikage: 'ff',
  // IE2: la temporada del Instituto Alius.
  hakuren: 'alius', 'shin-teikoku': 'alius', 'dark-emperors': 'alius', 'epsilon-kai': 'alius',
  // IE3: el Mundial.
  'the-kingdom': 'ffi', 'rose-griffon': 'ffi', brockenborg: 'ffi', ogre: 'ffi',
  'neo-japan': 'ffi', gaia: 'ffi',
  // IEVR: la nueva generación.
  'ouja-raimon': 'vr', 'ijin-meibundou': 'vr',
}

const REGION_BY_TEAM = (() => {
  const m = new Map<string, RegionId>()
  for (const s of SAGAS) for (const t of s.teams) if (!m.has(t)) m.set(t, s.id as RegionId)
  for (const [t, r] of Object.entries(EXTRA_REGION)) if (!m.has(t)) m.set(t, r)
  return m
})()

/** ¿De qué época es este instituto? El Raimon es de la primera, por defecto. */
export function regionOfTeam(teamId: string): RegionId {
  return REGION_BY_TEAM.get(teamId) ?? 'ff'
}
