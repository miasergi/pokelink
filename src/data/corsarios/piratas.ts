// Plantel del modo Corsarios. Todos los personajes son originales: el modo
// toma la MECÁNICA de los gachas de piratas de navegador (capitán genérico,
// taberna con tiradas por rareza, islas de 3-4 rivales), no sus personajes.
import type { Clase, Look, PirataDef, Rareza, Skill, Stats } from '@/engine/corsarios/types'

/** Presupuesto de estadísticas por rareza (antes del oficio). */
const PRESUPUESTO: Record<Rareza, Stats> = {
  C: { hp: 520, atk: 58, def: 30, spd: 100 },
  R: { hp: 620, atk: 70, def: 36, spd: 104 },
  E: { hp: 760, atk: 86, def: 44, spd: 108 },
  L: { hp: 930, atk: 104, def: 54, spd: 112 },
}

/** Cómo reparte cada oficio ese presupuesto. */
const OFICIO: Record<Clase, Stats> = {
  espada: { hp: 1.0, atk: 1.1, def: 0.95, spd: 1.08 },
  puno: { hp: 1.25, atk: 0.92, def: 1.25, spd: 0.92 },
  tirador: { hp: 0.85, atk: 1.22, def: 0.82, spd: 1.04 },
  apoyo: { hp: 1.05, atk: 0.85, def: 1.0, spd: 1.0 },
}

export const CLASE_INFO: Record<Clase, { nombre: string; plural: string; color: string; vence: Clase | null }> = {
  espada: { nombre: 'Espadachín', plural: 'Espadachines', color: '#60a5fa', vence: 'puno' },
  puno: { nombre: 'Luchador', plural: 'Luchadores', color: '#f87171', vence: 'tirador' },
  tirador: { nombre: 'Tirador', plural: 'Tiradores', color: '#fbbf24', vence: 'espada' },
  apoyo: { nombre: 'Navegante', plural: 'Navegantes', color: '#34d399', vence: null },
}

export const RAREZA_INFO: Record<Rareza, { nombre: string; color: string; brillo: string }> = {
  C: { nombre: 'Común', color: '#94a3b8', brillo: '#cbd5e1' },
  R: { nombre: 'Raro', color: '#38bdf8', brillo: '#7dd3fc' },
  E: { nombre: 'Épico', color: '#c084fc', brillo: '#e9d5ff' },
  L: { nombre: 'Legendario', color: '#fbbf24', brillo: '#fde68a' },
}

function base(rareza: Rareza, clase: Clase, ajuste: Partial<Stats> = {}): Stats {
  const p = PRESUPUESTO[rareza]
  const o = OFICIO[clase]
  return {
    hp: Math.round(p.hp * o.hp * (ajuste.hp ?? 1)),
    atk: Math.round(p.atk * o.atk * (ajuste.atk ?? 1)),
    def: Math.round(p.def * o.def * (ajuste.def ?? 1)),
    spd: Math.round(p.spd * o.spd * (ajuste.spd ?? 1)),
  }
}

function p(
  id: string, nombre: string, apodo: string, clase: Clase, rareza: Rareza,
  skill: Skill, look: Look, frase: string,
  extra: { ajuste?: Partial<Stats>; desbloqueaIsla?: number } = {},
): PirataDef {
  return { id, nombre, apodo, clase, rareza, skill, look, frase, base: base(rareza, clase, extra.ajuste), desbloqueaIsla: extra.desbloqueaIsla }
}

const PIEL = ['#f5d0b5', '#e8b68f', '#c98e62', '#9a6440', '#6b4226', '#f1c9a5']

// ---------------------------------------------------------------- TABERNA
export const PIRATAS: PirataDef[] = [
  // ---- Comunes ----
  p('tomas', 'Tomás', 'el Grumete', 'espada', 'C',
    { nombre: 'Tajo de cubierta', kind: 'golpe', mult: 1.9, desc: 'Un tajo fuerte a un rival.' },
    { piel: PIEL[0], pelo: '#7c4a1e', ropa: '#2563eb', sombrero: 'panuelo' },
    'Friego la cubierta y la defiendo. Por ese orden.'),
  p('remo', 'Remo', 'Ferreira', 'puno', 'C',
    { nombre: 'Remazo', kind: 'aturde', mult: 1.4, desc: 'Golpe con el remo que aturde.' },
    { piel: PIEL[2], pelo: '#111827', ropa: '#78350f', sombrero: 'nada', barba: 'corta' },
    'Veinte años remando. Los brazos no se olvidan.'),
  p('marga', 'Marga', 'la Cocinera', 'apoyo', 'C',
    { nombre: 'Caldo de pescado', kind: 'cura', mult: 1.1, desc: 'Cura a toda la tripulación.' },
    { piel: PIEL[1], pelo: '#b91c1c', ropa: '#f8fafc', sombrero: 'panuelo', melena: true },
    'Nadie pelea con el estómago vacío. Nadie.'),
  p('paco', 'Paco', 'Pólvora', 'tirador', 'C',
    { nombre: 'Trabucazo', kind: 'doble', mult: 1.3, desc: 'Metralla a dos rivales.' },
    { piel: PIEL[0], pelo: '#a16207', ropa: '#4d7c0f', sombrero: 'gorra', barba: 'bigote' },
    '¿Huele a quemado? Ah, no, soy yo.'),
  p('nuno', 'Nuno', 'el Vigía', 'tirador', 'C',
    { nombre: 'Tiro desde la cofa', kind: 'golpe', mult: 1.8, desc: 'Disparo certero a un rival.' },
    { piel: PIEL[3], pelo: '#1f2937', ropa: '#0e7490', sombrero: 'nada' },
    '¡Barco a la vista! Bueno, gaviota. Pero casi.'),
  p('lola', 'Lola', 'Ancla', 'puno', 'C',
    { nombre: 'Ancla al fondo', kind: 'golpe', mult: 1.7, desc: 'Deja caer el ancla sobre un rival.' },
    { piel: PIEL[4], pelo: '#111827', ropa: '#9f1239', sombrero: 'panuelo', pendiente: true },
    'Donde echo el ancla, me quedo.'),
  p('anselmo', 'Anselmo', 'el Carpintero', 'apoyo', 'C',
    { nombre: 'Tablones', kind: 'escudo', mult: 1.2, desc: 'Escudo para toda la tripulación.' },
    { piel: PIEL[1], pelo: '#d6d3d1', ropa: '#92400e', sombrero: 'gorra', barba: 'larga' },
    'Este casco aguanta. Lo clavé yo.'),

  // ---- Raros ----
  p('bruna', 'Bruna', 'Sal', 'espada', 'R',
    { nombre: 'Molinete', kind: 'barrido', mult: 0.95, desc: 'Gira y corta a todos los rivales.' },
    { piel: PIEL[2], pelo: '#f59e0b', ropa: '#1e3a8a', sombrero: 'tricornio', melena: true },
    'El mar me dio sal. Yo le devolví acero.'),
  p('algas', 'Doc', 'Algas', 'apoyo', 'R',
    { nombre: 'Ungüento verde', kind: 'cura', mult: 1.35, desc: 'Cura a toda la tripulación.' },
    { piel: PIEL[0], pelo: '#65a30d', ropa: '#14532d', sombrero: 'nada', barba: 'corta' },
    'No preguntes qué lleva. Funciona.'),
  p('bastian', 'Bastián', 'Cañonero', 'tirador', 'R',
    { nombre: 'Andanada', kind: 'barrido', mult: 0.9, desc: 'Cañonazo que alcanza a todos.' },
    { piel: PIEL[3], pelo: '#7f1d1d', ropa: '#3f3f46', sombrero: 'bicornio', barba: 'bigote' },
    '¡Fuego! ...¿Alguien ha visto mis cejas?'),
  p('toro', 'Toro', 'del Malecón', 'puno', 'R',
    { nombre: 'Embestida', kind: 'aturde', mult: 1.6, desc: 'Arrolla a un rival y lo aturde.' },
    { piel: PIEL[4], pelo: '#0f172a', ropa: '#7c2d12', sombrero: 'nada', barba: 'corta', cicatriz: true },
    'Me echaron de todas las tabernas del puerto. Con razón.'),
  p('iria', 'Iria', 'la Sirena', 'apoyo', 'R',
    { nombre: 'Canto de espuma', kind: 'escudo', mult: 1.5, desc: 'Escudo de espuma para todos.' },
    { piel: PIEL[5], pelo: '#06b6d4', ropa: '#0f766e', sombrero: 'nada', melena: true, pendiente: true },
    'No soy una sirena. Pero canto como si lo fuera.'),
  p('leandro', 'Leandro', 'Mano de Plata', 'espada', 'R',
    { nombre: 'Estocada de plata', kind: 'remate', mult: 2.1, desc: 'Remata al más débil. Si cae, repite energía.' },
    { piel: PIEL[1], pelo: '#e5e7eb', ropa: '#4c1d95', sombrero: 'ala', barba: 'bigote' },
    'La mano de verdad la perdí jugando a las cartas.'),
  p('ruda', 'Ruda', 'la Contrabandista', 'tirador', 'R',
    { nombre: 'Dardo de ruda', kind: 'veneno', mult: 1.2, desc: 'Envenena a un rival durante 3 turnos.' },
    { piel: PIEL[2], pelo: '#4c1d95', ropa: '#1c1917', sombrero: 'capucha' },
    'Lo que llevo en la bodega no existe.'),

  // ---- Épicos ----
  p('escarcha', 'Capitana', 'Escarcha', 'espada', 'E',
    { nombre: 'Viento del norte', kind: 'barrido', mult: 1.15, desc: 'Un vendaval de cuchillas a todos.' },
    { piel: PIEL[0], pelo: '#e0f2fe', ropa: '#0c4a6e', sombrero: 'tricornio', melena: true, cicatriz: true },
    'Vengo de donde el mar se congela. Aquí hace calor.'),
  p('mamba', 'Mamba', 'Negra', 'tirador', 'E',
    { nombre: 'Picadura', kind: 'veneno', mult: 1.6, desc: 'Veneno potente a un rival.' },
    { piel: PIEL[4], pelo: '#022c22', ropa: '#14532d', sombrero: 'panuelo', parche: true },
    'Un disparo. Luego espero.'),
  p('coral', 'Coral', 'Bruja del Arrecife', 'apoyo', 'E',
    { nombre: 'Marea viva', kind: 'cura', mult: 1.7, desc: 'Gran curación para todos.' },
    { piel: PIEL[3], pelo: '#fb7185', ropa: '#831843', sombrero: 'capucha', melena: true, pendiente: true },
    'El arrecife me habla. Hoy dice que ganamos.'),
  p('martillo', 'Martillo', 'Rojo', 'puno', 'E',
    { nombre: 'Furia de fragua', kind: 'rabia', mult: 1.8, desc: 'Sube su ataque y golpea.' },
    { piel: PIEL[2], pelo: '#dc2626', ropa: '#450a0a', sombrero: 'nada', barba: 'larga' },
    'Forjaba cañones. Ahora soy uno.'),
  p('ximena', 'Ximena', 'Ojo de Halcón', 'tirador', 'E',
    { nombre: 'Tiro imposible', kind: 'golpe', mult: 2.7, desc: 'Un disparo devastador a un rival.' },
    { piel: PIEL[1], pelo: '#292524', ropa: '#57534e', sombrero: 'ala', parche: true },
    'Cierro un ojo para apuntar. El otro lo perdí apuntando.'),
  p('niebla', 'El Conde', 'Niebla', 'espada', 'E',
    { nombre: 'Golpe fantasma', kind: 'aturde', mult: 2.0, desc: 'Sale de la bruma y aturde.' },
    { piel: '#e2e8f0', pelo: '#475569', ropa: '#1e293b', sombrero: 'bicornio', barba: 'bigote' },
    'Llego con la niebla. Me voy con tu oro.'),

  // ---- Legendarios ----
  p('oleg', 'Oleg', 'Rey Kraken', 'puno', 'L',
    { nombre: 'Abrazo del abismo', kind: 'barrido', mult: 1.05, desc: 'Ocho golpes que alcanzan a todos.' },
    { piel: PIEL[3], pelo: '#7e22ce', ropa: '#3b0764', sombrero: 'corona', barba: 'larga', cicatriz: true },
    'Dicen que luché con un kraken. Mienten: lo convencí.'),
  p('tormenta', 'Dama', 'Tormenta', 'tirador', 'L',
    { nombre: 'Rayo en alta mar', kind: 'barrido', mult: 1.3, desc: 'Un rayo que cae sobre todos.' },
    { piel: PIEL[0], pelo: '#facc15', ropa: '#1e1b4b', sombrero: 'tricornio', melena: true, pendiente: true },
    'Yo no busco la tormenta. Yo soy la tormenta.'),
  p('faro', 'Viejo', 'Faro', 'apoyo', 'L',
    { nombre: 'Luz que guía', kind: 'cura', mult: 2.0, desc: 'Cura enorme a toda la tripulación.' },
    { piel: PIEL[1], pelo: '#f8fafc', ropa: '#b45309', sombrero: 'gorra', barba: 'larga' },
    'Cuarenta años encendiendo la luz. Nadie se pierde conmigo.'),
  p('espectro', 'Espectro', 'Azul', 'espada', 'L',
    { nombre: 'Corte del más allá', kind: 'remate', mult: 3.0, desc: 'Remata al más débil y recupera energía.' },
    { piel: '#bae6fd', pelo: '#1d4ed8', ropa: '#172554', sombrero: 'capucha', cicatriz: true },
    'Morí una vez. No me gustó. No vuelvo a hacerlo.'),

  // ---- Jefes de isla: se desbloquean en la taberna al vencerlos ----
  p('gallardo', 'Tuerto', 'Gallardo', 'espada', 'E',
    { nombre: 'Doble filo', kind: 'doble', mult: 1.6, desc: 'Dos tajos a dos rivales.' },
    { piel: PIEL[2], pelo: '#451a03', ropa: '#7f1d1d', sombrero: 'tricornio', parche: true, barba: 'corta' },
    'Me ganaste en buena lid. Te sigo, capitán.', { desbloqueaIsla: 0 }),
  p('medusa', 'Reina', 'Medusa', 'apoyo', 'E',
    { nombre: 'Velo urticante', kind: 'escudo', mult: 1.9, desc: 'Escudo enorme para todos.' },
    { piel: PIEL[5], pelo: '#a855f7', ropa: '#581c87', sombrero: 'corona', melena: true },
    'Mi arrecife es tuyo. Mis tentáculos, también.', { desbloqueaIsla: 1 }),
  p('brasa', 'Coronel', 'Brasa', 'tirador', 'L',
    { nombre: 'Lluvia de brasas', kind: 'barrido', mult: 0.95, desc: 'Metralla incendiaria a todos.' },
    { piel: PIEL[1], pelo: '#ea580c', ropa: '#9a3412', sombrero: 'bicornio', barba: 'bigote', cicatriz: true },
    'Deserto de la Armada. Su paga era una miseria.', { desbloqueaIsla: 2 }),
  p('huesos', 'Barón', 'Huesos', 'puno', 'L',
    { nombre: 'Danza macabra', kind: 'aturde', mult: 2.4, desc: 'Un golpe que deja helado.' },
    { piel: '#f5f5f4', pelo: '#0c0a09', ropa: '#18181b', sombrero: 'ala', cicatriz: true },
    'Te llevaré a mi isla. Bueno, ahora es tu isla.', { desbloqueaIsla: 3 }),
  p('viuda', 'La Viuda', 'Gris', 'espada', 'L',
    { nombre: 'Último baile', kind: 'remate', mult: 2.8, desc: 'Remata al más débil.' },
    { piel: PIEL[0], pelo: '#9ca3af', ropa: '#111827', sombrero: 'capucha', melena: true, pendiente: true },
    'Enterré a tres capitanes. Tú me caes mejor.', { desbloqueaIsla: 4 }),
  p('hierro', 'Almirante', 'Hierro', 'puno', 'L',
    { nombre: 'Orden de abordaje', kind: 'rabia', mult: 2.3, desc: 'Se enfurece y aplasta.' },
    { piel: PIEL[3], pelo: '#d4d4d8', ropa: '#1e3a8a', sombrero: 'bicornio', barba: 'larga', cicatriz: true },
    'La Armada ha caído. Larga vida a la bandera negra.', { desbloqueaIsla: 5, ajuste: { hp: 1.1 } }),
]

// ---------------------------------------------------------------- RIVALES
// Carne de cañón de las islas: nunca salen en la taberna.
export const RIVALES: PirataDef[] = [
  p('r-marinero', 'Marinero', 'de la Armada', 'espada', 'C',
    { nombre: 'Sablazo', kind: 'golpe', mult: 1.6, desc: '' },
    { piel: PIEL[0], pelo: '#78350f', ropa: '#1d4ed8', sombrero: 'gorra' }, ''),
  p('r-mosquete', 'Mosquetero', 'de la Armada', 'tirador', 'C',
    { nombre: 'Descarga', kind: 'golpe', mult: 1.6, desc: '' },
    { piel: PIEL[1], pelo: '#1f2937', ropa: '#1e40af', sombrero: 'bicornio' }, ''),
  p('r-bruto', 'Bruto', 'de puerto', 'puno', 'C',
    { nombre: 'Puñetazo', kind: 'aturde', mult: 1.2, desc: '' },
    { piel: PIEL[3], pelo: '#111827', ropa: '#57534e', sombrero: 'nada', barba: 'corta' }, ''),
  p('r-bucanero', 'Bucanero', 'raso', 'espada', 'C',
    { nombre: 'Cuchillada', kind: 'doble', mult: 1.2, desc: '' },
    { piel: PIEL[2], pelo: '#451a03', ropa: '#7f1d1d', sombrero: 'panuelo' }, ''),
  p('r-curandero', 'Curandero', 'de a bordo', 'apoyo', 'C',
    { nombre: 'Vendas', kind: 'cura', mult: 0.9, desc: '' },
    { piel: PIEL[1], pelo: '#a8a29e', ropa: '#e7e5e4', sombrero: 'nada', barba: 'larga' }, ''),
  p('r-arponero', 'Arponero', 'del arrecife', 'tirador', 'R',
    { nombre: 'Arpón', kind: 'golpe', mult: 1.8, desc: '' },
    { piel: PIEL[4], pelo: '#0e7490', ropa: '#155e75', sombrero: 'panuelo' }, ''),
  p('r-esqueleto', 'Esqueleto', 'maldito', 'espada', 'R',
    { nombre: 'Hueso afilado', kind: 'veneno', mult: 1.0, desc: '' },
    { piel: '#e7e5e4', pelo: '#0c0a09', ropa: '#292524', sombrero: 'tricornio' }, ''),
  p('r-oficial', 'Oficial', 'de la Armada', 'puno', 'R',
    { nombre: 'Culatazo', kind: 'aturde', mult: 1.4, desc: '' },
    { piel: PIEL[0], pelo: '#e5e7eb', ropa: '#172554', sombrero: 'bicornio', barba: 'bigote' }, ''),
]

const TODOS = new Map<string, PirataDef>([...PIRATAS, ...RIVALES].map((d) => [d.id, d]))

export function getPirata(id: string): PirataDef {
  const d = TODOS.get(id)
  if (!d) throw new Error(`Pirata desconocido: ${id}`)
  return d
}

/** Lo que un mod cambia del capitán (lo rellena `aplicarMod`). */
export const capitanExtra: { retrato?: string; apodo?: string; frase?: string; skill?: Partial<Skill> } = {}

/** El capitán: genérico, de oficio a elegir, con stats de Épico. */
export function capitanDef(nombre: string, clase: Exclude<Clase, 'apoyo'>): PirataDef {
  const skills: Record<Exclude<Clase, 'apoyo'>, Skill> = {
    espada: { nombre: 'Corte del capitán', kind: 'barrido', mult: 1.0, desc: 'Barre a todos los rivales.' },
    puno: { nombre: 'Puño de capitán', kind: 'aturde', mult: 1.9, desc: 'Golpe que aturde a un rival.' },
    tirador: { nombre: 'Disparo de mando', kind: 'golpe', mult: 2.4, desc: 'Un disparo enorme a un rival.' },
  }
  const look: Look = { piel: '#e8b68f', pelo: '#3f2a1d', ropa: '#b91c1c', sombrero: 'tricornio', barba: 'corta' }
  if (capitanExtra.retrato) look.retrato = capitanExtra.retrato
  return {
    id: 'capitan', nombre, apodo: capitanExtra.apodo ?? '', clase, rareza: 'E',
    base: base('E', clase, { hp: 1.05 }), skill: { ...skills[clase], ...capitanExtra.skill },
    look, frase: capitanExtra.frase ?? '',
  }
}
