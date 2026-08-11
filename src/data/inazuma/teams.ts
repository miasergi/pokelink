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
// da el último empujón, así que se mantiene en un rango estrecho.
import type { TeamBase } from '@/engine/inazuma/types'

export const TEAMS: TeamBase[] = [
  {
    id: 'raimon', name: 'Instituto Raimon', color: '#e11d48', element: 'montana', power: 1,
    taunt: '¡Vamos, equipo! ¡Nos lo jugamos todo aquí!',
    lineup: [],
  },
  {
    id: 'occult', name: 'Instituto Occult', color: '#7c3aed', element: 'bosque', power: 0.9,
    taunt: 'Este campo está maldito… y vosotros también.',
    lineup: ['jim-wraith', 'victor-grave', 'mona-crypt', 'ozzy-blake'],
  },
  {
    id: 'otaku', name: 'Instituto Otaku', color: '#0ea5e9', element: 'aire', power: 0.96,
    taunt: 'Hemos calculado vuestras jugadas. Todas.',
    lineup: ['tobias-quill', 'noel-pixel', 'ken-arcade'],
  },
  {
    id: 'wild', name: 'Instituto Wild', color: '#ca8a04', element: 'montana', power: 1,
    taunt: 'Aquí no se juega al fútbol. Aquí se sobrevive.',
    lineup: ['gus-boulder', 'rex-thorn', 'bruno-stagg'],
  },
  {
    id: 'shuriken', name: 'Instituto Shuriken', color: '#334155', element: 'aire', power: 1.04,
    taunt: 'No nos veréis venir. Nunca lo hacen.',
    lineup: ['goro-tetsu', 'kaze-shindo', 'rin-kagemori'],
  },
  {
    id: 'farm', name: 'Instituto Farm', color: '#65a30d', element: 'bosque', power: 1.07,
    taunt: 'Llevamos madrugando desde los seis años. ¿Y vosotros?',
    lineup: ['otto-barn', 'martha-reap', 'silas-hayfield'],
  },
  {
    id: 'kirkwood', name: 'Instituto Kirkwood', color: '#f97316', element: 'fuego', power: 1.1,
    taunt: 'Quemamos el campo entero si hace falta.',
    lineup: ['hector-ash', 'adrian-kirk', 'lucia-ember'],
  },
  {
    id: 'royal', name: 'Royal Academy', color: '#1d4ed8', element: 'bosque', power: 1.15,
    taunt: 'El fútbol es una ciencia. Y vosotros no habéis estudiado.',
    lineup: ['joe-king', 'herman-waldon', 'sue-marlow', 'caleb-stonewall'],
  },
  {
    id: 'zeus', name: 'Instituto Zeus', color: '#facc15', element: 'fuego', power: 1.22,
    taunt: 'Los dioses no pierden contra unos críos.',
    lineup: ['atlas-vane', 'nyx-lorne', 'helios-crown', 'torch-hades', 'byron-love'],
  },
]

export const TEAM_BY_ID = new Map(TEAMS.map((t) => [t.id, t]))

export function getTeam(id: string): TeamBase {
  const t = TEAM_BY_ID.get(id)
  if (!t) throw new Error(`Instituto desconocido: ${id}`)
  return t
}

/**
 * Orden del cuadro del torneo. Cada entrada es una ronda de PARTIDO; entre dos
 * rondas de partido siempre hay un interludio (ojeador / entrenamiento /
 * descanso / tienda), que genera `tournament.ts`.
 */
export const BRACKET: { teamId: string; name: string }[] = [
  { teamId: 'occult', name: 'Primera ronda' },
  { teamId: 'otaku', name: 'Segunda ronda' },
  { teamId: 'wild', name: 'Tercera ronda' },
  { teamId: 'shuriken', name: 'Octavos' },
  { teamId: 'farm', name: 'Cuartos' },
  { teamId: 'kirkwood', name: 'Repesca' },
  { teamId: 'royal', name: 'Semifinal' },
  { teamId: 'zeus', name: 'FINAL' },
]

/** Nombres de relleno para completar los onces rivales que no llegan a 11. */
export const FILLER_NAMES: string[] = [
  'Dani Moro', 'Iván Prado', 'Leo Rivas', 'Marc Duval', 'Tomás Vela', 'Óscar Rey',
  'Nico Serra', 'Hugo Lasa', 'Bruno Cid', 'Álex Duna', 'Iker Mora', 'Pau Riera',
  'Diego Sanz', 'Raúl Vidal', 'Adri Cano', 'Saúl Mena', 'Gael Ferrer', 'Unai Roca',
]
