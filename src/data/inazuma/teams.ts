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
    id: 'raimon', name: 'Instituto Raimon', color: '#e11d48', element: 'montana', power: 1,
    taunt: '¡Vamos, equipo! ¡Nos lo jugamos todo aquí!',
    lineup: [],
  },
  {
    id: 'occult', name: 'Instituto Occult', color: '#7c3aed', element: 'bosque', power: 0.72,
    taunt: 'Este campo está maldito… y vosotros también.',
    lineup: [],
  },
  {
    id: 'otaku', name: 'Instituto Otaku', color: '#0ea5e9', element: 'aire', power: 0.78,
    taunt: 'Hemos calculado vuestras jugadas. Todas.',
    lineup: [],
  },
  {
    id: 'wild', name: 'Instituto Wild', color: '#ca8a04', element: 'montana', power: 0.84,
    taunt: 'Aquí no se juega al fútbol. Aquí se sobrevive.',
    lineup: [],
  },
  {
    id: 'shuriken', name: 'Instituto Shuriken', color: '#334155', element: 'aire', power: 0.89,
    taunt: 'No nos veréis venir. Nunca lo hacen.',
    lineup: [],
  },
  {
    id: 'farm', name: 'Instituto Farm', color: '#65a30d', element: 'bosque', power: 0.94,
    taunt: 'Llevamos madrugando desde los seis años. ¿Y vosotros?',
    lineup: [],
  },
  {
    id: 'kirkwood', name: 'Instituto Kirkwood', color: '#f97316', element: 'fuego', power: 1.02,
    taunt: 'Quemamos el campo entero si hace falta.',
    lineup: [],
  },
  {
    id: 'royal', name: 'Royal Academy', color: '#1d4ed8', element: 'bosque', power: 1.08,
    taunt: 'El fútbol es una ciencia. Y vosotros no habéis estudiado.',
    lineup: [],
  },
  {
    id: 'zeus', name: 'Instituto Zeus', color: '#facc15', element: 'fuego', power: 1.15,
    taunt: 'Los dioses no pierden contra unos críos.',
    lineup: [],
  },
]

export const TEAM_BY_ID = new Map(TEAMS.map((t) => [t.id, t]))

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
 * Institutos que puedes elegir al empezar. Cada uno cambia la partida entera:
 * con quién arrancas y, como tu equipo sale del cuadro, contra quién juegas.
 */
export const PLAYABLE_TEAMS = ['raimon', 'occult', 'royal']

/**
 * Cuadro del torneo: los OCHO institutos que no son el tuyo, ordenados de menos
 * a más fuertes. Así, elegir equipo no solo cambia tu plantilla — también mete
 * en el cuadro al que has descartado.
 */
export function buildBracket(playerTeamId: string): { teamId: string; name: string }[] {
  const rivals = TEAMS
    .filter((t) => t.id !== playerTeamId)
    .sort((a, b) => a.power - b.power)
    .slice(0, ROUND_NAMES.length)
  return rivals.map((t, i) => ({ teamId: t.id, name: ROUND_NAMES[i] }))
}

/** Cuadro por defecto (jugando con el Raimon), para datos y tipos. */
export const BRACKET = buildBracket('raimon')

/** Nombres de relleno para completar los onces rivales que no llegan a 11. */
export const FILLER_NAMES: string[] = [
  'Dani Moro', 'Iván Prado', 'Leo Rivas', 'Marc Duval', 'Tomás Vela', 'Óscar Rey',
  'Nico Serra', 'Hugo Lasa', 'Bruno Cid', 'Álex Duna', 'Iker Mora', 'Pau Riera',
  'Diego Sanz', 'Raúl Vidal', 'Adri Cano', 'Saúl Mena', 'Gael Ferrer', 'Unai Roca',
]
