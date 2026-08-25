// Catálogo de técnicas. Nombres del doblaje/manga en español donde existen.
//
// Regla de diseño: **toda técnica sale del mismo depósito de ki que la
// transformación**, así que gastar es siempre una decisión.
//
// Y una regla CONTRAINTUITIVA que costó medir: la potencia por punto de ki
// CRECE con la potencia (Ráfaga 46/26 = 1,8; Resplandor 96/45 = 2,1). Con la
// tabla al revés, el bot elegía siempre la técnica más barata porque era la
// más rentable, hacía 6,5 de daño por golpe y perdía TODOS los combates de
// jefe. Las técnicas gordas tienen que compensar: llegar a lanzarlas ya exige
// haber cargado, que es el riesgo real.
import type { Technique } from '@/engine/dragon/types'

export const TECHNIQUES: Technique[] = [
  // ----------------------------------------------------------- físicas ---
  {
    id: 'combo',
    name: 'Ráfaga de golpes',
    kind: 'fisica', style: 'bruto', power: 46, cost: 26, hits: 3,
    desc: 'Tres impactos encadenados. Reparte la potencia, así que la guardia le quita menos.',
  },
  {
    id: 'punolobo',
    name: 'Puño del Lobo',
    kind: 'fisica', style: 'tecnico', power: 44, cost: 25, hits: 2, stun: 0.15,
    desc: 'Dos zarpazos secos. Puede dejar al rival sin aire un turno.',
  },
  {
    id: 'patada_ascendente',
    name: 'Patada ascendente',
    kind: 'fisica', style: 'bruto', power: 40, cost: 23, stun: 0.25,
    desc: 'Barata y con buena probabilidad de aturdir.',
  },
  {
    id: 'martillo',
    name: 'Martillo doble',
    kind: 'fisica', style: 'bruto', power: 58, cost: 30,
    desc: 'Las dos manos juntas sobre la nuca. Lento pero demoledor.',
  },
  {
    id: 'placaje_ki',
    name: 'Embestida de ki',
    kind: 'fisica', style: 'bruto', power: 52, cost: 28, recoil: 8,
    desc: 'Te lanzas envuelto en aura. Pega fuerte y te pasa factura.',
  },
  {
    id: 'rodillazo',
    name: 'Rodillazo al plexo',
    kind: 'fisica', style: 'tecnico', power: 48, cost: 26, pierce: true,
    desc: 'Busca el hueco de la guardia. Ignora la defensa reforzada.',
  },
  {
    id: 'garra_namek',
    name: 'Zarpa namekiana',
    kind: 'fisica', style: 'bruto', power: 50, cost: 27, hits: 2,
    desc: 'Brazos que se estiran más de lo que el rival calcula.',
  },

  // ---------------------------------------------------------- energía ---
  {
    id: 'kamehameha',
    name: 'Kamehameha',
    kind: 'energia', style: 'ki', power: 58, cost: 30,
    desc: 'La onda vital de la escuela Tortuga. El choque de rayos por excelencia.',
  },
  {
    id: 'masenko',
    name: 'Masenko',
    kind: 'energia', style: 'ki', power: 52, cost: 28,
    desc: 'Rápido de cargar: dos manos sobre la frente y fuera.',
  },
  {
    id: 'kienzan',
    name: 'Disco Destructor',
    kind: 'energia', style: 'tecnico', power: 56, cost: 29, pierce: true,
    desc: 'Un filo de ki que corta cualquier cosa. La guardia no sirve de nada.',
  },
  {
    id: 'makankosappo',
    name: 'Rayo Perforador',
    kind: 'energia', style: 'tecnico', power: 66, cost: 33, pierce: true,
    desc: 'Dos dedos, un taladro de ki en espiral. Atraviesa la defensa.',
  },
  {
    id: 'kikoho',
    name: 'Cañón Tri-Haz',
    kind: 'energia', style: 'ki', power: 76, cost: 37, recoil: 14,
    desc: 'Demoledor, pero se cobra la vida del que lo lanza.',
  },
  {
    id: 'galick',
    name: 'Ataque Galick',
    kind: 'energia', style: 'ki', power: 62, cost: 32,
    desc: 'El orgullo saiyan comprimido en dos palmas.',
  },
  {
    id: 'bigbang',
    name: 'Big Bang',
    kind: 'energia', style: 'ki', power: 72, cost: 35,
    desc: 'Una esfera densa que revienta al contacto.',
  },
  {
    id: 'resplandor',
    name: 'Resplandor Final',
    kind: 'energia', style: 'ki', power: 96, cost: 45,
    desc: 'Carga larga y una pared de luz. Vacía el depósito casi entero.',
  },
  {
    id: 'rayomortal',
    name: 'Rayo Mortal',
    kind: 'energia', style: 'tecnico', power: 44, cost: 25, pierce: true,
    desc: 'Un dedo, un agujero. Barato y quirúrgico.',
  },
  {
    id: 'chispa',
    name: 'Chispa Mortal',
    kind: 'energia', style: 'ki', power: 84, cost: 40,
    desc: 'Una esfera del tamaño de una luna sobre la palma.',
  },
  {
    id: 'ondaexpansiva',
    name: 'Onda expansiva',
    kind: 'energia', style: 'bruto', power: 50, cost: 27,
    desc: 'Ki liberado en todas direcciones. Imposible de esquivar del todo.',
  },
  {
    id: 'genkidama',
    name: 'Genki Dama',
    kind: 'energia', style: 'ki', power: 150, cost: 66,
    desc: 'La energía de todo el planeta. Necesitas el depósito casi lleno.',
  },
  {
    id: 'burningattack',
    name: 'Burning Attack',
    kind: 'energia', style: 'tecnico', power: 60, cost: 31, stun: 0.2,
    desc: 'Una secuencia de manos imposible y una bola dirigida.',
  },
  {
    id: 'infinitybullet',
    name: 'Ráfaga infinita',
    kind: 'energia', style: 'ki', power: 54, cost: 28, hits: 4,
    desc: 'Cuatro disparos seguidos. Contra la guardia se cuela mejor que uno gordo.',
  },
  {
    id: 'explosion_final',
    name: 'Explosión final',
    kind: 'energia', style: 'bruto', power: 190, cost: 70, recoil: 60,
    desc: 'Te llevas al rival por delante aunque te cueste casi todo.',
  },

  // ------------------------------------------------------------ apoyo ---
  {
    id: 'taiyoken',
    name: 'Golpe del Sol',
    kind: 'apoyo', style: 'tecnico', power: 0, cost: 14,
    debuff: { velocidad: 0.72, defensa: 0.85 },
    desc: 'Un fogonazo que ciega al rival: pierde reflejos el resto del combate.',
  },
  {
    id: 'zanzoken',
    name: 'Imagen residual',
    kind: 'apoyo', style: 'tecnico', power: 0, cost: 16,
    buff: { velocidad: 1.35 },
    desc: 'Dejas un doble donde estabas. Ganas velocidad para el resto del asalto.',
  },
  {
    id: 'concentracion',
    name: 'Concentración',
    kind: 'apoyo', style: 'ki', power: 0, cost: 12,
    buff: { ki: 1.3, poder: 1.12 },
    desc: 'Aprietas los puños y el aura sube. Tus técnicas pegan mucho más.',
  },
  {
    id: 'regeneracion',
    name: 'Regeneración',
    // Cara Y modesta a propósito: curar el 42 % por 34 de ki convertía a
    // cualquier rival regenerador en un muro de 60 turnos, y a Cell —que
    // además recupera ki solo por ser androide— en un combate literalmente
    // inganable (0 victorias en 40 intentos).
    kind: 'apoyo', style: 'tecnico', power: 0, cost: 46, heal: 30,
    desc: 'Fisiología namekiana: recompones el cuerpo si queda una célula sana.',
  },
  {
    id: 'multiforma',
    name: 'Multiforma',
    kind: 'apoyo', style: 'tecnico', power: 0, cost: 24,
    buff: { poder: 1.3, velocidad: 1.15 },
    desc: 'Cuatro copias golpeando a la vez.',
  },
  {
    id: 'muro',
    name: 'Barrera de ki',
    kind: 'apoyo', style: 'bruto', power: 0, cost: 18,
    buff: { defensa: 1.45 },
    desc: 'Una cúpula de energía. Aguantas lo que venga.',
  },

  // ------------------------------------------- Dragon Ball (arco clásico) ---
  {
    id: 'kamehameha_nino',
    name: 'Kamehameha imperfecto',
    kind: 'energia', style: 'ki', power: 44, cost: 24,
    desc: 'Aún no le sale entero, pero ya tumba a un dinosaurio.',
  },
  {
    id: 'bastonsagrado',
    name: 'Bastón Sagrado',
    kind: 'fisica', style: 'tecnico', power: 48, cost: 25, hits: 2,
    desc: 'Se alarga hasta donde haga falta. Nadie sabe cuánto es eso.',
  },
  {
    id: 'dodonpa',
    name: 'Dodon Pa',
    kind: 'energia', style: 'tecnico', power: 54, cost: 27, pierce: true,
    desc: 'Un dedo, un rayo fino y un agujero limpio.',
  },
  {
    id: 'mafuba',
    name: 'Mafuba',
    kind: 'apoyo', style: 'tecnico', power: 0, cost: 40,
    debuff: { poder: 0.6, ki: 0.6 },
    desc: 'Sella al rival en una vasija. Sale carísimo y lo deja hecho un guiñapo.',
  },
  {
    id: 'explosion_demoniaca',
    name: 'Onda Demoníaca',
    kind: 'energia', style: 'ki', power: 68, cost: 34,
    desc: 'La técnica del Rey Demonio. Huele a azufre.',
  },
  {
    id: 'punokamikaze',
    name: 'Puño Kamikaze',
    kind: 'fisica', style: 'bruto', power: 64, cost: 32, recoil: 10,
    desc: 'Todo el cuerpo por delante y que sea lo que Kami quiera.',
  },

  // ------------------------------------------------------ Dragon Ball Super ---
  {
    id: 'punodragon',
    name: 'Puño del Dragón',
    kind: 'fisica', style: 'bruto', power: 88, cost: 44, pierce: true,
    desc: 'Un dragón dorado sale del puño y atraviesa lo que haya delante.',
  },
  {
    id: 'hakai',
    name: 'Hakai',
    kind: 'energia', style: 'ki', power: 110, cost: 58, pierce: true,
    desc: 'La técnica de los dioses de la destrucción: borra lo que toca.',
  },
  {
    id: 'saltotemporal',
    name: 'Salto Temporal',
    kind: 'apoyo', style: 'tecnico', power: 0, cost: 30,
    buff: { velocidad: 1.5 },
    debuff: { velocidad: 0.8 },
    desc: 'Se adelanta un instante en el tiempo. Imposible seguirle.',
  },
  {
    id: 'rayojuicio',
    name: 'Rayo del Juicio',
    kind: 'energia', style: 'ki', power: 82, cost: 40,
    desc: 'Un dios convencido de que aniquilar es justicia.',
  },
  {
    id: 'esferacastigo',
    name: 'Esfera del Castigo',
    kind: 'energia', style: 'ki', power: 94, cost: 46,
    desc: 'La condena caída del cielo, del tamaño de una montaña.',
  },
  {
    id: 'gigantica',
    name: 'Bomba Gigantesca',
    kind: 'energia', style: 'bruto', power: 100, cost: 50, recoil: 8,
    desc: 'Toda la energía comprimida y soltada de una vez.',
  },
  {
    id: 'atomico',
    name: 'Puño Atómico',
    kind: 'fisica', style: 'bruto', power: 76, cost: 38, stun: 0.2,
    desc: 'El golpe más simple del universo, llevado al extremo.',
  },
  {
    id: 'muroluz',
    name: 'Muro de Luz',
    kind: 'apoyo', style: 'tecnico', power: 0, cost: 24,
    buff: { defensa: 1.5, aguante: 1.15 },
    desc: 'Una barrera que no se rompe con fuerza bruta.',
  },
]

const BY_ID = new Map(TECHNIQUES.map((t) => [t.id, t]))

export function getTechnique(id: string): Technique | undefined {
  return BY_ID.get(id)
}