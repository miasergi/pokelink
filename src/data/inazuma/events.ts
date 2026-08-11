// SITUACIONES: las casillas de evento del mapa, el equivalente a los eventos
// del roguelike Pokémon. Te plantan una escena y eliges qué hacer; cada opción
// tiene su premio y a veces su coste.
//
// Son la fuente de variedad del recorrido: sin ellas el mapa es siempre
// pachanga-objeto-ojeador. El sabor es de la serie — entrenamientos a orillas
// del río, el abuelo de Mark y su cuaderno, cazatalentos, lesiones tontas.
import type { Element } from '@/engine/inazuma/types'

/** Qué pasa al elegir una opción. Lo aplica el store. */
export type EventEffect =
  | { kind: 'coins'; amount: number }
  /** Objeto concreto o, si no se dice cuál, uno al azar. */
  | { kind: 'item'; itemId?: string }
  /** Supertécnica al azar (va a la mochila). */
  | { kind: 'technique'; element?: Element }
  /** Niveles a TODA la plantilla. */
  | { kind: 'levels'; amount: number }
  /** Aguante a toda la plantilla (negativo = cansancio). */
  | { kind: 'stamina'; amount: number }
  /** Recupera aguante y PT al completo. */
  | { kind: 'rest' }
  /** Ficha gratis a un jugador. */
  | { kind: 'sign' }
  | { kind: 'nothing' }

export interface EventOption {
  label: string
  /** Qué se cuenta al elegirla. */
  outcome: string
  effect: EventEffect
  /** Coste en metálico; si no llega, la opción sale bloqueada. */
  cost?: number
  /** Probabilidad de que salga bien (0-1). Si falla, `fail` es lo que pasa. */
  chance?: number
  fail?: { outcome: string; effect: EventEffect }
}

export interface InazumaEvent {
  id: string
  icon: string
  title: string
  text: string
  options: EventOption[]
}

export const EVENTS: InazumaEvent[] = [
  {
    id: 'ribera',
    icon: '🌅',
    title: 'La ribera del río',
    text: 'El sitio donde el equipo lleva entrenando desde siempre. Nadie os mira, no hay árbitro y da igual la hora que sea.',
    options: [
      { label: 'Entrenar hasta el anochecer', outcome: 'Todos suben 1 nivel, pero llegáis molidos.', effect: { kind: 'levels', amount: 1 } },
      { label: 'Tirar unos balones sin más', outcome: 'Piernas sueltas y buen ambiente.', effect: { kind: 'stamina', amount: 25 } },
    ],
  },
  {
    id: 'cuaderno',
    icon: '📓',
    title: 'El cuaderno del abuelo',
    text: 'Aparece un cuaderno viejo lleno de esquemas de supertécnicas dibujados a mano. Cuesta entender la letra.',
    options: [
      {
        label: 'Descifrarlo entre todos',
        outcome: 'Sacáis en claro una supertécnica.',
        effect: { kind: 'technique' },
        chance: 0.75,
        fail: { outcome: 'No hay quien lo lea. Al menos os echáis unas risas.', effect: { kind: 'stamina', amount: 10 } },
      },
      { label: 'Guardarlo y seguir', outcome: 'Otro día será.', effect: { kind: 'nothing' } },
    ],
  },
  {
    id: 'cazatalentos',
    icon: '🕴️',
    title: 'Un hombre de traje',
    text: 'Lleva un rato mirando el entrenamiento sin decir nada. Al final se acerca: dice que representa a un jugador que busca equipo.',
    options: [
      { label: 'Escuchar la oferta', outcome: 'Se incorpora a la plantilla.', effect: { kind: 'sign' } },
      { label: 'No fiarse', outcome: 'Se marcha por donde ha venido… y os deja algo de dinero «por las molestias».', effect: { kind: 'coins', amount: 700 } },
    ],
  },
  {
    id: 'maquina',
    icon: '🥤',
    title: 'Máquina expendedora averiada',
    text: 'Da el doble de lo que pides. También podría tragarse las monedas y no dar nada.',
    options: [
      {
        label: 'Probar suerte (300 ₽)',
        cost: 300,
        outcome: '¡Cae un montón de bebida! Todo el equipo repone.',
        effect: { kind: 'stamina', amount: 40 },
        chance: 0.7,
        fail: { outcome: 'Se traga las monedas. Clásico.', effect: { kind: 'nothing' } },
      },
      { label: 'Pasar de largo', outcome: 'Mejor no tentar a la suerte.', effect: { kind: 'nothing' } },
    ],
  },
  {
    id: 'porteria',
    icon: '🥅',
    title: 'La portería oxidada',
    text: 'Una portería abandonada en un descampado. El larguero está doblado y la red hecha jirones, pero aguanta.',
    options: [
      { label: 'Sesión de tiros', outcome: 'Los delanteros afinan la puntería: +1 nivel a todos.', effect: { kind: 'levels', amount: 1 } },
      {
        label: 'Desmontarla y vender el metal',
        outcome: 'Chatarra que se paga bien.',
        effect: { kind: 'coins', amount: 900 },
      },
    ],
  },
  {
    id: 'lesion',
    icon: '🩹',
    title: 'Tobillo tocado',
    text: 'Un mal apoyo en el calentamiento. No parece grave, pero cojea.',
    options: [
      {
        label: 'Pagar al fisio (500 ₽)',
        cost: 500,
        outcome: 'Como nuevo. Y de paso repasa a todo el equipo.',
        effect: { kind: 'rest' },
      },
      { label: 'Aguantar el tirón', outcome: 'El equipo sale a jugar tocado.', effect: { kind: 'stamina', amount: -20 } },
    ],
  },
  {
    id: 'reto',
    icon: '🎯',
    title: 'Reto de los veteranos',
    text: 'Unos exjugadores del barrio os desafían a un concurso de tiros. Apuestan dinero.',
    options: [
      {
        label: 'Aceptar la apuesta (400 ₽)',
        cost: 400,
        outcome: '¡Ganado! Se llevan una lección y vosotros el bote.',
        effect: { kind: 'coins', amount: 1400 },
        chance: 0.6,
        fail: { outcome: 'Perdéis la apuesta. Y algo de orgullo.', effect: { kind: 'nothing' } },
      },
      { label: 'Declinar', outcome: 'Hoy no hay tiempo para tonterías.', effect: { kind: 'nothing' } },
    ],
  },
  {
    id: 'tienda-cerrada',
    icon: '📦',
    title: 'Reparto equivocado',
    text: 'Una caja con material deportivo en la puerta de un almacén cerrado. La etiqueta lleva otra dirección.',
    options: [
      { label: 'Quedárselo', outcome: 'Material nuevo para la mochila.', effect: { kind: 'item' } },
      { label: 'Dejarlo donde está', outcome: 'El dueño lo agradece y os da una propina.', effect: { kind: 'coins', amount: 500 } },
    ],
  },
  {
    id: 'tormenta',
    icon: '⛈️',
    title: 'Se pone a diluviar',
    text: 'El campo se convierte en un barrizal en cinco minutos.',
    options: [
      { label: 'Entrenar bajo la lluvia', outcome: 'Curte. +1 nivel a todos, pero acabáis reventados.', effect: { kind: 'levels', amount: 1 } },
      { label: 'Refugiarse y descansar', outcome: 'Una tarde de charla y estiramientos.', effect: { kind: 'stamina', amount: 35 } },
    ],
  },
  {
    id: 'maestro',
    icon: '🧓',
    title: 'El viejo del quiosco',
    text: 'Dice que jugó en Primera hace cuarenta años. Nadie sabe si es verdad, pero de fútbol sabe un rato.',
    options: [
      {
        label: 'Pedirle que os enseñe',
        outcome: 'Os enseña una supertécnica de las de antes.',
        effect: { kind: 'technique' },
      },
      { label: 'Invitarle a un café', outcome: 'Charla agradable. Os regala una entrada vieja… y algo suelto.', effect: { kind: 'coins', amount: 350 } },
    ],
  },
  {
    id: 'balon-firmado',
    icon: '✍️',
    title: 'Balón firmado',
    text: 'Encontráis un balón con la firma de una vieja gloria. Podría valer bastante.',
    options: [
      { label: 'Venderlo', outcome: 'Un coleccionista paga bien.', effect: { kind: 'coins', amount: 1200 } },
      { label: 'Quedárselo como amuleto', outcome: 'Sube la moral: todos suben 1 nivel.', effect: { kind: 'levels', amount: 1 } },
    ],
  },
  {
    id: 'gimnasio',
    icon: '🏋️',
    title: 'Gimnasio del polideportivo',
    text: 'Está vacío y la puerta abierta. Hay pesas, cintas y una máquina de bebidas que funciona.',
    options: [
      {
        label: 'Sesión de fuerza (250 ₽)',
        cost: 250,
        outcome: 'Trabajo duro: +1 nivel a la plantilla.',
        effect: { kind: 'levels', amount: 1 },
      },
      { label: 'Solo estiramientos', outcome: 'Piernas descargadas.', effect: { kind: 'stamina', amount: 30 } },
    ],
  },
]

export const EVENT_BY_ID = new Map(EVENTS.map((e) => [e.id, e]))

export function getEvent(id: string): InazumaEvent | undefined {
  return EVENT_BY_ID.get(id)
}
