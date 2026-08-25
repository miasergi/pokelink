// Transformaciones. El corazón del riesgo/recompensa del juego.
//
// No vienen de serie: se DESPIERTAN (ver `checkAwakenings` en run.ts) cuando
// llegas al nivel de `unlock` y encima el combate se pone feo — un compañero
// cae, o lo ganas con la vida en rojo. Es el momento del que vive el juego, y
// por eso no se compra ni se elige en un menú.
//
// NO son un botón de «ganar»: cuestan ki al activarse y DRENAN ki cada turno.
// Como las técnicas salen del mismo depósito, transformarte te obliga a pegar
// a puño limpio o a cargar (descubierto) para sostener la forma. Si te quedas
// a cero, se te cae y pierdes el turno recuperando el aliento.
import type { Transformation } from '@/engine/dragon/types'

export const TRANSFORMATIONS: Transformation[] = [
  {
    id: 'kaioken',
    name: 'Kaio-Ken',
    mult: { poder: 1.4, ki: 1.25, velocidad: 1.35 },
    unlock: 8,
    aura: '#ef4444', cost: 14, upkeep: 7, burn: 3,
    desc: 'Multiplicas el ki por encima de tu límite. Cada turno te quema por dentro.',
  },
  {
    id: 'kaioken3',
    name: 'Kaio-Ken ×3',
    mult: { poder: 1.75, ki: 1.5, velocidad: 1.6 },
    requires: 'kaioken', unlock: 22,
    aura: '#dc2626', cost: 24, upkeep: 13, burn: 7,
    desc: 'El cuerpo aguanta lo justo. Brutal mientras dura.',
  },
  {
    id: 'ssj',
    name: 'Superguerrero',
    mult: { poder: 1.75, ki: 1.7, velocidad: 1.5, defensa: 1.3 },
    unlock: 24,
    aura: '#fde047', cost: 26, upkeep: 12,
    lineage: ['saiyan'],
    desc: 'La leyenda de los mil años. Solo despierta con la rabia justa.',
  },
  {
    id: 'ssj2',
    name: 'Superguerrero 2',
    mult: { poder: 2.15, ki: 2.05, velocidad: 1.8, defensa: 1.45 },
    requires: 'ssj', unlock: 46,
    aura: '#facc15', cost: 36, upkeep: 18,
    lineage: ['saiyan'],
    desc: 'Chispas alrededor del aura y ni un gramo de piedad.',
  },
  {
    id: 'ssj3',
    name: 'Superguerrero 3',
    mult: { poder: 2.7, ki: 2.6, velocidad: 2.0, defensa: 1.6 },
    // Coste + dos turnos de mantenimiento tienen que caber en el depósito; si
    // no, activarla es regalar ki porque se cae sola sin llegar a pegar.
    requires: 'ssj2', unlock: 68,
    aura: '#fbbf24', cost: 44, upkeep: 26,
    lineage: ['saiyan'],
    desc: 'Consume ki a un ritmo insostenible. Un asalto, no más.',
  },
  {
    id: 'ozaru',
    name: 'Ozaru',
    // Es la segunda fase del PRIMER jefe del juego: con ×2.4 al poder arrasaba
    // a un equipo de nivel 18 sin que hubiera nada que decidir.
    mult: { poder: 1.85, defensa: 1.6, aguante: 1.4, velocidad: 0.75, ki: 0.85 },
    unlock: 16,
    aura: '#a16207', cost: 30, upkeep: 14,
    lineage: ['saiyan'],
    desc: 'Diez veces tu fuerza y ni pizca de puntería. Mirar la luna sale caro.',
  },
  {
    id: 'gigante',
    name: 'Namekiano gigante',
    mult: { poder: 1.9, defensa: 1.7, aguante: 1.4, velocidad: 0.7 },
    unlock: 18,
    aura: '#4ade80', cost: 22, upkeep: 10,
    lineage: ['namek'],
    desc: 'Multiplicas tu tamaño. Todo lo que ganas en pegada lo pierdes en reflejos.',
  },
  {
    id: 'fusionkami',
    name: 'Fusión con Kami',
    mult: { poder: 1.6, ki: 1.7, defensa: 1.5, velocidad: 1.35 },
    requires: 'gigante', unlock: 32,
    aura: '#22c55e', cost: 20, upkeep: 8,
    lineage: ['namek'],
    desc: 'Vuelves a ser uno. El namekiano completo que fuiste hace siglos.',
  },
  {
    id: 'majin',
    name: 'Marca de Majin',
    mult: { poder: 2.0, ki: 1.9, velocidad: 1.7 },
    unlock: 52,
    aura: '#a855f7', cost: 30, upkeep: 15, burn: 4,
    desc: 'Dejas que la magia te posea a cambio de poder. Se paga con vida.',
  },
  {
    id: 'sobrecarga',
    name: 'Sobrecarga',
    mult: { poder: 1.55, ki: 1.45, velocidad: 1.4 },
    unlock: 16,
    aura: '#38bdf8', cost: 20, upkeep: 11,
    lineage: ['androide', 'terricola'],
    desc: 'Fuerzas el núcleo por encima del régimen seguro.',
  },
  {
    id: 'ultra',
    name: 'Instinto',
    mult: { poder: 2.3, ki: 2.2, velocidad: 2.6, defensa: 1.7 },
    unlock: 80,
    aura: '#e0f2fe', cost: 44, upkeep: 26,
    desc: 'El cuerpo se mueve solo, sin pensar. Nadie sabe cuánto puede durar.',
  },

  // -- formas de JEFE (no se aprenden, las trae puesta el enemigo por fase) --
  // Multiplicadores DELIBERADAMENTE moderados: cada fase ya regala una barra
  // de vida nueva, así que si encima multiplicasen el poder por 2,5 el jefe
  // acumularía dos ventajas y el combate dejaría de tener decisiones.
  {
    id: 'freezer2',
    name: 'Segunda forma',
    mult: { poder: 1.25, ki: 1.22, defensa: 1.25, aguante: 1.1 },
    aura: '#e9d5ff', cost: 0, upkeep: 0,
    desc: 'Los cuernos se alargan y la voz cambia.',
  },
  {
    id: 'freezer3',
    name: 'Tercera forma',
    mult: { poder: 1.5, ki: 1.45, defensa: 1.35, aguante: 1.15 },
    aura: '#d8b4fe', cost: 0, upkeep: 0,
    desc: 'Un cráneo alargado y una presión que no deja respirar.',
  },
  {
    id: 'freezer4',
    name: 'Forma definitiva',
    mult: { poder: 1.85, ki: 1.8, defensa: 1.45, velocidad: 1.3, aguante: 1.2 },
    aura: '#f5f3ff', cost: 0, upkeep: 0,
    desc: 'Lisa, blanca y perfecta. El 100 % de su poder.',
  },
  {
    id: 'semiperfecto',
    name: 'Semiperfecto',
    mult: { poder: 1.35, ki: 1.3, defensa: 1.25, aguante: 1.12 },
    aura: '#86efac', cost: 0, upkeep: 0,
    desc: 'Ha absorbido a uno de los dos. Le falta la mitad.',
  },
  {
    id: 'perfecto',
    name: 'Forma perfecta',
    mult: { poder: 1.8, ki: 1.75, defensa: 1.4, velocidad: 1.4, aguante: 1.2 },
    aura: '#4ade80', cost: 0, upkeep: 0,
    desc: 'Las células de todos los guerreros de la historia, en un solo cuerpo.',
  },
  {
    id: 'superbuu',
    name: 'Super Buu',
    mult: { poder: 1.5, ki: 1.5, defensa: 1.3, aguante: 1.15 },
    aura: '#f9a8d4', cost: 0, upkeep: 0,
    desc: 'Sin la parte buena dentro, ya no queda nada que lo contenga.',
  },
  {
    id: 'kidbuu',
    name: 'Buu original',
    mult: { poder: 1.9, ki: 1.85, velocidad: 1.5, defensa: 1.3 },
    aura: '#ec4899', cost: 0, upkeep: 0,
    desc: 'Pura destrucción sin intención. La forma más antigua y más peligrosa.',
  },

  // ------------------------------------------------ Dragon Ball Super ---
  // La escalera divina. Multiplicadores enormes pero coste ALTO: el depósito
  // de ki es de 100 para todos, así que `coste + 2 turnos de mantenimiento`
  // tiene que caber ahí (hay un test que lo vigila). Son formas para rematar
  // un combate, no para pasearse con ellas puestas.
  {
    id: 'ssjgod',
    name: 'Superguerrero Dios',
    mult: { poder: 2.9, ki: 2.8, velocidad: 2.2, defensa: 1.7 },
    requires: 'ssj3', unlock: 74, aura: '#f43f5e', cost: 40, upkeep: 18,
    lineage: ['saiyan'],
    desc: 'El pelo rojo y la calma de quien ya no necesita gritar.',
  },
  {
    id: 'ssjblue',
    name: 'Dios Superguerrero',
    mult: { poder: 3.4, ki: 3.3, velocidad: 2.6, defensa: 1.9 },
    requires: 'ssjgod', unlock: 92, aura: '#38bdf8', cost: 46, upkeep: 22,
    lineage: ['saiyan'],
    desc: 'El ki divino de un dios en el cuerpo de un superguerrero.',
  },
  {
    id: 'golden',
    name: 'Forma Dorada',
    mult: { poder: 1.85, ki: 1.8, velocidad: 1.4, defensa: 1.45 },
    aura: '#eab308', cost: 0, upkeep: 0,
    desc: 'Cuatro meses de entrenamiento del ser más perezoso del universo.',
  },
  {
    id: 'rabia',
    name: 'Ira Legendaria',
    mult: { poder: 1.8, ki: 1.5, defensa: 1.4, aguante: 1.2, velocidad: 1.2 },
    aura: '#22c55e', cost: 0, upkeep: 0,
    desc: 'Un poder que crece con la furia y no sabe parar.',
  },
  {
    id: 'divino',
    name: 'Poder Divino',
    mult: { poder: 1.9, ki: 1.85, velocidad: 1.45, defensa: 1.5 },
    aura: '#c084fc', cost: 0, upkeep: 0,
    desc: 'La liga de los dioses, donde el esfuerzo ya no basta.',
  },
  {
    id: 'inmortal',
    name: 'Cuerpo Inmortal',
    mult: { poder: 1.6, ki: 1.6, defensa: 1.6, aguante: 1.3 },
    aura: '#a3e635', cost: 0, upkeep: 0,
    desc: 'Da igual cuánto le rompas: se recompone y sigue.',
  },
  {
    id: 'fuerzatotal',
    name: 'Fuerza Total',
    mult: { poder: 2.0, ki: 1.7, defensa: 1.55, velocidad: 1.5 },
    aura: '#f87171', cost: 0, upkeep: 0,
    desc: 'El orgullo de quien nunca ha necesitado transformarse para ganar.',
  },
]

const BY_ID = new Map(TRANSFORMATIONS.map((t) => [t.id, t]))

export function getForm(id: string): Transformation | undefined {
  return BY_ID.get(id)
}
