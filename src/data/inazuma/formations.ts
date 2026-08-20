// Formaciones del once. No son decorativas: la cadena del partido
// (construcción MED → penetración DEL → definición DEL) reparte los duelos
// entre líneas, y el motor elige al que dispute cada eslabón de entre los
// jugadores de esa línea. Con 5-3-2 tienes más gente en el corte y menos arriba;
// con 3-4-3, al revés.
//
// FÚTBOL 5: todas suman 4 de campo + 1 portero.
import type { Formation } from '@/engine/inazuma/types'

export const FORMATIONS: Formation[] = [
  {
    id: '1-2-1',
    name: '1-2-1 · Rombo',
    defs: 1, mids: 2, fwds: 1,
    desc: 'Equilibrada: el doble pivote sostiene la salida y llega al área.',
  },
  {
    id: '2-1-1',
    name: '2-1-1 · Cerrojo',
    defs: 2, mids: 1, fwds: 1,
    desc: 'Defensiva. Cuesta romperte, pero arriba estás solo.',
  },
  {
    id: '1-1-2',
    name: '1-1-2 · Doble punta',
    defs: 1, mids: 1, fwds: 2,
    desc: 'Ofensiva: dos rematadores y la defensa expuesta.',
  },
]

export const FORMATION_BY_ID = new Map(FORMATIONS.map((f) => [f.id, f]))
export const DEFAULT_FORMATION = '1-2-1'

export function getFormation(id: string | undefined): Formation {
  return FORMATION_BY_ID.get(id ?? DEFAULT_FORMATION) ?? FORMATIONS[0]
}

/**
 * Formación que un equipo puede alinear DE VERDAD con los jugadores que tiene.
 *
 * Hace falta porque las plantillas son las reales de la serie y cada instituto
 * viene con un reparto distinto: el Raimon tiene seis defensas y tres
 * centrocampistas, así que empezarlo en 4-4-2 dejaba el once inválido de
 * salida. Se coge la primera formación que cubra las tres líneas y, si ninguna
 * encaja, la que menos huecos deje.
 */
export function bestFormationFor(counts: { DEF: number; MED: number; DEL: number }): Formation {
  const gap = (f: Formation) =>
    Math.max(0, f.defs - counts.DEF) + Math.max(0, f.mids - counts.MED) + Math.max(0, f.fwds - counts.DEL)
  return [...FORMATIONS].sort((a, b) => gap(a) - gap(b))[0]
}
