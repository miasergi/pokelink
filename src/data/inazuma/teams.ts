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
    id: 'raimon', name: 'Instituto Raimon', color: '#e11d48', kit: ['#fbbf24', '#1d4ed8'], element: 'montana', power: 1,
    taunt: '¡Vamos, equipo! ¡Nos lo jugamos todo aquí!',
    lineup: [],
  },
  {
    id: 'occult', name: 'Instituto Occult', color: '#7c3aed', kit: ['#94a3b8', '#312e81'], element: 'bosque', power: 0.72,
    taunt: 'Este campo está maldito… y vosotros también.',
    lineup: [],
  },
  {
    id: 'otaku', name: 'Instituto Otaku', color: '#0ea5e9', kit: ['#bae6fd', '#0369a1'], element: 'aire', power: 0.78,
    taunt: 'Hemos calculado vuestras jugadas. Todas.',
    lineup: [],
  },
  {
    // LEGACY: «Wild» resultó ser el mismo Nose que Farm (redirect de la wiki).
    // Se conserva para que los saves viejos no revienten, pero ya no entra en
    // ningún cuadro (no está en `SAGAS`).
    id: 'wild', name: 'Instituto Wild', color: '#ca8a04', kit: ['#d97706', '#78350f'], element: 'montana', power: 0.84,
    taunt: 'Aquí no se juega al fútbol. Aquí se sobrevive.',
    lineup: [],
  },
  {
    id: 'mikage', name: 'Instituto Brain', color: '#14b8a6', element: 'bosque', power: 0.84,
    taunt: 'Vuestras jugadas están calculadas antes de que las penséis.',
    lineup: [],
  },
  {
    id: 'shuriken', name: 'Instituto Shuriken', color: '#334155', kit: ['#64748b', '#0f172a'], element: 'aire', power: 0.89,
    taunt: 'No nos veréis venir. Nunca lo hacen.',
    lineup: [],
  },
  {
    id: 'farm', name: 'Instituto Farm', color: '#65a30d', kit: ['#86efac', '#166534'], element: 'bosque', power: 0.94,
    taunt: 'Llevamos madrugando desde los seis años. ¿Y vosotros?',
    lineup: [],
  },
  {
    id: 'kirkwood', name: 'Instituto Kirkwood', color: '#f97316', kit: ['#fdba74', '#c2410c'], element: 'fuego', power: 1.02,
    taunt: 'Quemamos el campo entero si hace falta.',
    lineup: [],
  },
  {
    id: 'royal', name: 'Royal Academy', color: '#1d4ed8', kit: ['#22c55e', '#b91c1c'], element: 'bosque', power: 1.08,
    taunt: 'El fútbol es una ciencia. Y vosotros no habéis estudiado.',
    lineup: [],
  },
  {
    id: 'zeus', name: 'Instituto Zeus', color: '#facc15', kit: ['#f8fafc', '#a16207'], element: 'fuego', power: 1.15,
    taunt: 'Los dioses no pierden contra unos críos.',
    lineup: [],
  },

  // ------------------------------------------------------------------
  // SAGA ALIUS (Inazuma Eleven 2): la caravana Raimon contra la Academia
  // Alius. Misma curva de `power` que el cuadro clásico (0.72 → 1.15).
  // ------------------------------------------------------------------
  {
    id: 'yokato', name: 'Instituto Yokato', color: '#0284c7', element: 'aire', power: 0.72,
    taunt: 'La caravana pasa por aquí… y aquí se queda.',
    lineup: [],
  },
  {
    id: 'oumihara', name: 'Instituto Oumihara', color: '#0d9488', element: 'bosque', power: 0.78,
    taunt: 'El mar nos enseñó a no rendirnos nunca.',
    lineup: [],
  },
  {
    id: 'gemini-storm', name: 'Tormenta Géminis', color: '#818cf8', kit: ['#a5b4fc', '#3730a3'], element: 'aire', power: 0.86,
    taunt: 'Vuestro fútbol es de otro planeta. Del malo.',
    lineup: [],
  },
  {
    id: 'epsilon', name: 'Épsilon', color: '#22d3ee', kit: ['#67e8f9', '#155e75'], element: 'montana', power: 0.94,
    taunt: 'Somos la segunda oleada. No habrá tercera: no hará falta.',
    lineup: [],
  },
  {
    id: 'diamond-dust', name: 'Diamond Dust', color: '#7dd3fc', kit: ['#e0f2fe', '#0284c7'], element: 'aire', power: 1.0,
    taunt: 'El hielo no negocia.',
    lineup: [],
  },
  {
    id: 'prominence', name: 'Prominence', color: '#f97316', kit: ['#fb923c', '#9a3412'], element: 'fuego', power: 1.05,
    taunt: 'Arded con nosotros o apartaos.',
    lineup: [],
  },
  {
    id: 'chaos', name: 'Caos', color: '#a21caf', kit: ['#e879f9', '#701a75'], element: 'fuego', power: 1.1,
    taunt: 'Fuego y hielo, juntos. No tenéis ninguna posibilidad.',
    lineup: [],
  },
  {
    id: 'genesis', name: 'Génesis', color: '#6d28d9', kit: ['#c4b5fd', '#4c1d95'], element: 'aire', power: 1.15,
    taunt: 'Somos la obra maestra de la Academia Alius.',
    lineup: [],
  },

  // ------------------------------------------------------------------
  // SAGA FFI (Inazuma Eleven 3): las selecciones del Football Frontier
  // Internacional.
  // ------------------------------------------------------------------
  {
    id: 'inazuma-japan', name: 'Inazuma Japan', color: '#1d4ed8', kit: ['#3b82f6', '#f97316'], element: 'montana', power: 1,
    taunt: '¡Vamos a por el mundo, equipo!',
    lineup: [],
  },
  {
    id: 'big-waves', name: 'Big Waves', color: '#0891b2', element: 'bosque', power: 0.72,
    taunt: 'Surfead nuestra ola… si podéis.',
    lineup: [],
  },
  {
    id: 'desert-lion', name: 'Desert Lion', color: '#d97706', element: 'montana', power: 0.78,
    taunt: 'El desierto no perdona a los débiles.',
    lineup: [],
  },
  {
    id: 'knights-of-queen', name: 'Knights of Queen', color: '#4338ca', element: 'aire', power: 0.86,
    taunt: 'Por la reina y por la corona.',
    lineup: [],
  },
  {
    id: 'fire-dragon', name: 'Fire Dragon', color: '#dc2626', element: 'fuego', power: 0.94,
    taunt: 'El dragón escupe fuego. Vosotros, excusas.',
    lineup: [],
  },
  {
    id: 'the-empire', name: 'The Empire', color: '#16a34a', element: 'bosque', power: 1.0,
    taunt: 'El imperio del fútbol no cede su trono.',
    lineup: [],
  },
  {
    id: 'unicorn', name: 'Unicorn', color: '#2563eb', kit: ['#dbeafe', '#1d4ed8'], element: 'aire', power: 1.05,
    taunt: 'Sueño americano, pesadilla vuestra.',
    lineup: [],
  },
  {
    id: 'orpheus', name: 'Orpheus', color: '#0f766e', kit: ['#2dd4bf', '#134e4a'], element: 'montana', power: 1.1,
    taunt: 'El fútbol nació aquí. Venid a aprender.',
    lineup: [],
  },
  {
    id: 'little-gigant', name: 'Little Gigant', color: '#b91c1c', kit: ['#ef4444', '#7f1d1d'], element: 'fuego', power: 1.15,
    taunt: 'Pequeños de nombre. Gigantes en el campo.',
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
  id: 'ff' | 'alius' | 'ffi'
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
    name: 'Football Frontier',
    desc: 'La primera temporada: el torneo nacional de institutos.',
    teams: ['raimon', 'occult', 'otaku', 'mikage', 'shuriken', 'farm', 'kirkwood', 'royal', 'zeus'],
    playable: ['raimon', 'occult', 'royal'],
    scoutTeams: ['kfc', 'oumihara', 'manyuuji', 'yokato', 'windies', 'extra-stars', 'kage-no-hero'],
  },
  {
    id: 'alius',
    name: 'Academia Alius',
    desc: 'La segunda temporada: la caravana Raimon contra los equipos alienígenas.',
    teams: ['raimon', 'yokato', 'oumihara', 'gemini-storm', 'epsilon', 'diamond-dust', 'prominence', 'chaos', 'genesis'],
    playable: ['raimon', 'genesis'],
    scoutTeams: ['occult', 'otaku', 'wild', 'shuriken', 'farm', 'kirkwood', 'royal', 'zeus', 'kfc', 'mikage', 'manyuuji', 'windies', 'extra-stars', 'kage-no-hero'],
  },
  {
    id: 'ffi',
    name: 'Football Frontier Internacional',
    desc: 'La tercera temporada: las selecciones del mundial juvenil.',
    teams: ['inazuma-japan', 'big-waves', 'desert-lion', 'knights-of-queen', 'fire-dragon', 'the-empire', 'unicorn', 'orpheus', 'little-gigant'],
    playable: ['inazuma-japan', 'orpheus', 'unicorn'],
    scoutTeams: ['raimon', 'royal', 'zeus', 'kirkwood', 'gemini-storm', 'epsilon', 'diamond-dust', 'prominence', 'chaos', 'genesis', 'windies', 'extra-stars', 'kage-no-hero'],
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
export function buildBracket(playerTeamId: string, sagaId?: string): { teamId: string; name: string }[] {
  const saga = getSaga(sagaId)
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
