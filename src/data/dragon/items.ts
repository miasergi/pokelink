// Objetos. Dos familias:
//  - `equipo`: se lleva puesto y multiplica atributos.
//  - `uso`: se gasta EN COMBATE y consume el turno (menos el radar, que es de mapa).
//
// Los multiplicadores son PORCENTAJE, nunca puntos planos. En Inazuma medimos
// que los bonus planos valen literalmente cero en cuanto los atributos suben;
// aquí, con el crecimiento del 8,5 % por nivel, pasaría exactamente igual.
import type { StatKey } from '@/engine/dragon/types'

export interface Item {
  id: string
  name: string
  kind: 'equipo' | 'uso'
  price: number
  /** Multiplicadores permanentes sobre los atributos (solo `equipo`). */
  stats?: Partial<Record<StatKey, number>>
  /** Ki con el que empiezas el combate, por encima de la mitad de serie. */
  startKi?: number
  /** % de PS máximos que cura al usarse (solo `uso`). */
  heal?: number
  /** Ki que devuelve al usarse (solo `uso`). */
  ki?: number
  /** Revive a un compañero debilitado en vez de curar al activo. */
  revive?: boolean
  /** Se puede usar fuera del combate (semillas, elixires). */
  field?: boolean
  /** Lastre: penaliza ahora y da niveles extra al terminar el combate. */
  train?: number
  desc: string
}

export const ITEMS: Item[] = [
  // ------------------------------------------------------------- equipo ---
  {
    id: 'armadura', name: 'Armadura saiyan', kind: 'equipo', price: 900,
    stats: { defensa: 1.18, aguante: 1.08 },
    desc: 'Flexible y resistente. Estándar del ejército de Freezer.',
  },
  {
    id: 'guantes', name: 'Guantes de combate', kind: 'equipo', price: 800,
    stats: { poder: 1.2 },
    desc: 'Los nudillos reforzados pegan más fuerte.',
  },
  {
    id: 'banda', name: 'Cinta de concentración', kind: 'equipo', price: 800,
    stats: { ki: 1.2 },
    desc: 'Ayuda a canalizar. Tus técnicas duelen más.',
  },
  {
    id: 'kinton', name: 'Nube Kinton', kind: 'equipo', price: 1000,
    stats: { velocidad: 1.28 },
    desc: 'Solo la monta quien tiene el corazón puro. Pegas antes que nadie.',
  },
  {
    id: 'scouter', name: 'Rastreador', kind: 'equipo', price: 600,
    stats: { velocidad: 1.1 },
    startKi: 15,
    desc: 'Lees el poder del rival antes de que se mueva. Empiezas con más ki.',
  },
  {
    id: 'capa', name: 'Capa del Maestro', kind: 'equipo', price: 1200,
    stats: { defensa: 1.12, ki: 1.12, poder: 1.06 },
    desc: 'Nada espectacular en nada, decente en todo.',
  },
  {
    id: 'lastre', name: 'Ropa lastrada', kind: 'equipo', price: 700,
    stats: { velocidad: 0.78, poder: 0.9 },
    train: 1,
    desc: 'Pesa una barbaridad y te frena. A cambio, cada combate te entrena el doble.',
  },
  {
    id: 'lastre2', name: 'Lastre del Rey Kaito', kind: 'equipo', price: 1800,
    stats: { velocidad: 0.68, poder: 0.85, defensa: 0.9 },
    train: 2,
    desc: 'Gravedad de otro mundo sobre los hombros. Insufrible, y por eso funciona.',
  },
  {
    id: 'nucleo', name: 'Núcleo de energía', kind: 'equipo', price: 1400,
    stats: { ki: 1.1 },
    startKi: 40,
    desc: 'Empiezas los combates con el depósito casi lleno.',
  },
  {
    id: 'pesas', name: 'Muñequeras de gravedad', kind: 'equipo', price: 1100,
    stats: { poder: 1.15, aguante: 1.15, velocidad: 0.92 },
    desc: 'Entrenar con 100 G deja el cuerpo hecho un bloque.',
  },

  // ---------------------------------------------------------------- uso ---
  {
    id: 'semilla', name: 'Semilla del Ermitaño', kind: 'uso', price: 2500,
    heal: 100, ki: 100, field: true,
    desc: 'Una judía y estás como nuevo. No hay muchas en el mundo.',
  },
  {
    id: 'semilla_media', name: 'Semilla partida', kind: 'uso', price: 1100,
    heal: 50, ki: 40, field: true,
    desc: 'Media judía, medio milagro.',
  },
  {
    id: 'elixir', name: 'Elixir de ki', kind: 'uso', price: 700,
    ki: 60, field: true,
    desc: 'Rellena el depósito sin tener que bajar la guardia para cargar.',
  },
  {
    id: 'agua', name: 'Agua Sagrada', kind: 'uso', price: 1600,
    heal: 60, ki: 30, field: true,
    desc: 'Del templo de Karin. Sabe fatal y funciona.',
  },
  {
    id: 'revivir', name: 'Judía de Karin', kind: 'uso', price: 3000,
    heal: 60, revive: true, field: true,
    desc: 'Levanta a un compañero debilitado con parte de sus fuerzas.',
  },
  {
    id: 'radar', name: 'Radar del Dragón', kind: 'uso', price: 2000,
    field: true,
    desc: 'Detecta una Bola de Dragón en el tramo actual. Se queda contigo.',
  },
]

const BY_ID = new Map(ITEMS.map((i) => [i.id, i]))

export function getItem(id: string): Item | undefined {
  return BY_ID.get(id)
}

/** Lo que vende la tienda en un tramo dado (la variedad sube con la saga). */
export function stockFor(saga: number, rngPick: <T>(a: readonly T[]) => T): Item[] {
  const pool = ITEMS.filter((i) => i.id !== 'radar')
  const out: Item[] = []
  // Siempre hay algo con lo que curarse: una tienda sin cura es una trampa.
  out.push(saga >= 2 ? BY_ID.get('semilla')! : BY_ID.get('semilla_media')!)
  out.push(BY_ID.get('elixir')!)
  while (out.length < 5) {
    const pick = rngPick(pool)
    if (!out.some((i) => i.id === pick.id)) out.push(pick)
  }
  return out
}
