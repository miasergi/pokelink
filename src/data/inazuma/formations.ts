// Formaciones del once. No son decorativas: la cadena del partido
// (construcción MED → penetración DEL → definición DEL) reparte los duelos
// entre líneas, y el motor elige al que dispute cada eslabón de entre los
// jugadores de esa línea. Con 5-3-2 tienes más gente en el corte y menos arriba;
// con 3-4-3, al revés.
//
// Todas suman 10 de campo + 1 portero.
import type { Formation } from '@/engine/inazuma/types'

export const FORMATIONS: Formation[] = [
  {
    id: '4-4-2',
    name: '4-4-2',
    defs: 4, mids: 4, fwds: 2,
    desc: 'Equilibrada. Ni te desbordan por detrás ni te faltan brazos arriba.',
  },
  {
    id: '3-4-3',
    name: '3-4-3',
    defs: 3, mids: 4, fwds: 3,
    desc: 'Ofensiva. Más rematadores y más rotación arriba, la defensa expuesta.',
  },
  {
    id: '5-3-2',
    name: '5-3-2',
    defs: 5, mids: 3, fwds: 2,
    desc: 'Cerrojo. Cuesta mucho romperte, pero cedes el centro del campo.',
  },
  {
    id: '3-5-2',
    name: '3-5-2',
    defs: 3, mids: 5, fwds: 2,
    desc: 'Dominar el balón: el centro del campo decide de quién es la posesión.',
  },
  {
    id: '4-3-3',
    name: '4-3-3',
    defs: 4, mids: 3, fwds: 3,
    desc: 'Clásica de contraataque: defensa sólida y tres arriba.',
  },
]

export const FORMATION_BY_ID = new Map(FORMATIONS.map((f) => [f.id, f]))
export const DEFAULT_FORMATION = '4-4-2'

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
