// Las seis islas del modo Corsarios. Cada una tiene 3 escaramuzas y un jefe;
// vencer al jefe abre la siguiente isla y lo mete en la taberna.
import type { Fase, Isla } from '@/engine/corsarios/types'

/** Nivel de los rivales de la fase `f` de la isla `i`. */
export function nivelFase(i: number, f: number): number {
  return 1 + Math.round((i * 4 + f) * 2.9)
}

function fase(i: number, f: number, nombre: string, ids: string[], jefe?: string): Fase {
  const n = nivelFase(i, f)
  const rivales = ids.map((id) => ({ id, nivel: n }))
  if (jefe) rivales.splice(Math.floor(rivales.length / 2), 0, { id: jefe, nivel: n + 1 })
  return { nombre, rivales, jefe: !!jefe }
}

export const ISLAS: Isla[] = [
  {
    nombre: 'Isla Tortuga Gris', lema: 'Donde empiezan todos los piratas', color: '#22c55e',
    fases: [
      fase(0, 0, 'El muelle', ['r-bucanero', 'r-bucanero', 'r-bruto']),
      fase(0, 1, 'La taberna del Ancla', ['r-bucanero', 'r-bruto', 'r-mosquete']),
      fase(0, 2, 'El faro viejo', ['r-marinero', 'r-mosquete', 'r-bruto', 'r-bucanero']),
      fase(0, 3, 'La cueva del Tuerto', ['r-bucanero', 'r-bruto'], 'gallardo'),
    ],
  },
  {
    nombre: 'Arrecife Carmesí', lema: 'Aguas rojas, corales afilados', color: '#f43f5e',
    fases: [
      fase(1, 0, 'Bajíos', ['r-arponero', 'r-bucanero', 'r-bruto']),
      fase(1, 1, 'El pecio', ['r-arponero', 'r-curandero', 'r-bucanero']),
      fase(1, 2, 'La laguna', ['r-arponero', 'r-arponero', 'r-bruto', 'r-curandero']),
      fase(1, 3, 'Trono de coral', ['r-arponero', 'r-curandero'], 'medusa'),
    ],
  },
  {
    nombre: 'Puerto Ceniza', lema: 'La Armada vigila cada calle', color: '#f97316',
    fases: [
      fase(2, 0, 'La aduana', ['r-marinero', 'r-marinero', 'r-mosquete']),
      fase(2, 1, 'El arsenal', ['r-mosquete', 'r-mosquete', 'r-oficial']),
      fase(2, 2, 'Las murallas', ['r-marinero', 'r-oficial', 'r-mosquete', 'r-curandero']),
      fase(2, 3, 'El cuartel', ['r-oficial', 'r-mosquete'], 'brasa'),
    ],
  },
  {
    nombre: 'Isla Calavera', lema: 'Nadie vuelve igual', color: '#a3a3a3',
    fases: [
      fase(3, 0, 'Playa de huesos', ['r-esqueleto', 'r-esqueleto', 'r-bruto']),
      fase(3, 1, 'La selva muda', ['r-esqueleto', 'r-bucanero', 'r-arponero']),
      fase(3, 2, 'El templo', ['r-esqueleto', 'r-esqueleto', 'r-curandero', 'r-oficial']),
      fase(3, 3, 'La cripta del Barón', ['r-esqueleto', 'r-esqueleto'], 'huesos'),
    ],
  },
  {
    nombre: 'Mar de Niebla', lema: 'No se ve la proa desde la popa', color: '#818cf8',
    fases: [
      fase(4, 0, 'Barco fantasma', ['r-esqueleto', 'r-arponero', 'r-mosquete']),
      fase(4, 1, 'Los escollos', ['r-oficial', 'r-arponero', 'r-curandero']),
      fase(4, 2, 'El remolino', ['r-esqueleto', 'r-oficial', 'r-arponero', 'r-mosquete']),
      fase(4, 3, 'El velero negro', ['r-arponero', 'r-oficial'], 'viuda'),
    ],
  },
  {
    nombre: 'Fortaleza del Almirante', lema: 'El último bastión de la Armada', color: '#3b82f6',
    fases: [
      fase(5, 0, 'El rompeolas', ['r-oficial', 'r-mosquete', 'r-marinero']),
      fase(5, 1, 'Los cañones', ['r-mosquete', 'r-mosquete', 'r-oficial', 'r-curandero']),
      fase(5, 2, 'La torre', ['r-oficial', 'r-oficial', 'r-arponero', 'r-curandero']),
      fase(5, 3, 'El puente de mando', ['r-oficial', 'r-curandero', 'r-mosquete'], 'hierro'),
    ],
  },
]

export const faseKey = (i: number, f: number) => `${i}-${f}`
