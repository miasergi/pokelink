// Plantel. Aliados reclutables y rivales, en la misma estructura: un rival es
// un luchador con nivel puesto a mano, así que todo el motor los trata igual.
//
// Los atributos base suman entre 48 (Chaoz) y 74 (Vegeta). Esa horquilla es
// deliberada: los personajes flojos existen para que reclutarlos sea una
// decisión y no un regalo — traen técnicas que los fuertes no tienen.
//
// Los RIVALES van deliberadamente APLANADOS (49-70) en todas las sagas: la
// dificultad tiene que venir del nivel y de la pericia de la IA, no de que los
// enemigos de la saga 2 jueguen en otra liga de atributos. Con la escala sin
// aplanar, la saga de Namek mataba al 95 % de las runs que llegaban a ella,
// porque el jugador sube de nivel entre sagas pero no cambia de plantilla.
//
// Y los JEFES finales rondan 72-76, no más: con Freezer a 84 (un 17 % por
// encima de Goku) el bot perdía contra él 16 de cada 30 runs incluso jugando
// bien. Lo que tiene que dar miedo de un jefe son sus FASES, no un atributo.
import type { FighterData } from '@/engine/dragon/types'

export const FIGHTERS: FighterData[] = [
  // =========================================================== ALIADOS ===
  {
    id: 'goku', name: 'Son Goku', lineage: 'saiyan', style: 'bruto',
    base: { poder: 15, ki: 15, defensa: 13, velocidad: 14, aguante: 15 },
    techniques: ['kamehameha', 'combo'],
    learn: [{ level: 8, tech: 'concentracion' }, { level: 18, tech: 'martillo' }, { level: 30, tech: 'genkidama' }],
    forms: ['kaioken', 'kaioken3', 'ssj', 'ssj2', 'ssj3'],
    color: '#f97316', plBase: 334,
  },
  {
    id: 'krilin', name: 'Krilín', lineage: 'terricola', style: 'tecnico',
    base: { poder: 10, ki: 13, defensa: 11, velocidad: 15, aguante: 11 },
    techniques: ['kienzan', 'taiyoken'],
    learn: [{ level: 10, tech: 'kamehameha' }, { level: 22, tech: 'infinitybullet' }],
    color: '#f59e0b', plBase: 206,
  },
  {
    id: 'yamcha', name: 'Yamcha', lineage: 'terricola', style: 'tecnico',
    base: { poder: 12, ki: 10, defensa: 10, velocidad: 14, aguante: 11 },
    techniques: ['punolobo', 'zanzoken'],
    learn: [{ level: 12, tech: 'kamehameha' }, { level: 24, tech: 'rodillazo' }],
    color: '#84cc16', plBase: 177,
  },
  {
    id: 'ten', name: 'Ten Shin Han', lineage: 'terricola', style: 'ki',
    base: { poder: 13, ki: 14, defensa: 12, velocidad: 12, aguante: 12 },
    techniques: ['kikoho', 'multiforma'],
    learn: [{ level: 14, tech: 'taiyoken' }, { level: 26, tech: 'concentracion' }],
    forms: ['sobrecarga'],
    color: '#22c55e', plBase: 250,
  },
  {
    id: 'chaoz', name: 'Chaoz', lineage: 'terricola', style: 'ki',
    base: { poder: 7, ki: 13, defensa: 8, velocidad: 12, aguante: 8 },
    techniques: ['rayomortal', 'taiyoken'],
    learn: [{ level: 10, tech: 'explosion_final' }, { level: 20, tech: 'concentracion' }],
    color: '#e879f9', plBase: 145,
  },
  {
    id: 'piccolo', name: 'Piccolo', lineage: 'namek', style: 'tecnico',
    base: { poder: 14, ki: 14, defensa: 14, velocidad: 12, aguante: 14 },
    techniques: ['makankosappo', 'garra_namek'],
    learn: [{ level: 12, tech: 'regeneracion' }, { level: 24, tech: 'muro' }],
    forms: ['gigante', 'fusionkami'],
    color: '#16a34a', plBase: 322,
  },
  {
    id: 'gohan', name: 'Son Gohan', lineage: 'saiyan', style: 'ki',
    base: { poder: 9, ki: 17, defensa: 10, velocidad: 11, aguante: 12 },
    techniques: ['masenko', 'patada_ascendente'],
    learn: [{ level: 10, tech: 'kamehameha' }, { level: 20, tech: 'concentracion' }, { level: 32, tech: 'ondaexpansiva' }],
    forms: ['ozaru', 'ssj', 'ssj2'],
    color: '#a855f7', plBase: 200,
  },
  {
    id: 'vegeta', name: 'Vegeta', lineage: 'saiyan', style: 'bruto',
    base: { poder: 17, ki: 15, defensa: 13, velocidad: 15, aguante: 14 },
    techniques: ['galick', 'combo'],
    learn: [{ level: 14, tech: 'bigbang' }, { level: 26, tech: 'resplandor' }],
    forms: ['ozaru', 'ssj', 'ssj2', 'majin'],
    color: '#3b82f6', plBase: 800,
  },
  {
    id: 'trunks', name: 'Trunks del futuro', lineage: 'saiyan', style: 'tecnico',
    base: { poder: 15, ki: 13, defensa: 13, velocidad: 15, aguante: 13 },
    techniques: ['burningattack', 'rodillazo'],
    learn: [{ level: 16, tech: 'martillo' }, { level: 28, tech: 'infinitybullet' }],
    forms: ['ssj', 'ssj2'],
    color: '#818cf8', plBase: 950,
  },
  {
    id: 'a18', name: 'Nº 18', lineage: 'androide', style: 'tecnico',
    base: { poder: 15, ki: 14, defensa: 14, velocidad: 16, aguante: 12 },
    techniques: ['infinitybullet', 'rodillazo'],
    learn: [{ level: 18, tech: 'ondaexpansiva' }],
    forms: ['sobrecarga'],
    color: '#38bdf8', plBase: 1100,
    // El núcleo infinito: no gasta ki de verdad. Ver `KI_REGEN_LINEAGE`.
  },
  {
    id: 'dende', name: 'Dende', lineage: 'namek', style: 'tecnico',
    base: { poder: 5, ki: 11, defensa: 9, velocidad: 11, aguante: 9 },
    techniques: ['regeneracion', 'muro'],
    learn: [{ level: 12, tech: 'taiyoken' }],
    color: '#4ade80', plBase: 60,
  },
  {
    id: 'videl', name: 'Videl', lineage: 'terricola', style: 'bruto',
    base: { poder: 12, ki: 8, defensa: 12, velocidad: 13, aguante: 12 },
    techniques: ['combo', 'patada_ascendente'],
    learn: [{ level: 14, tech: 'muro' }, { level: 24, tech: 'martillo' }],
    color: '#fb7185', plBase: 120,
  },
  {
    id: 'yajirobe', name: 'Yajirobe', lineage: 'terricola', style: 'bruto',
    base: { poder: 14, ki: 5, defensa: 15, velocidad: 8, aguante: 16 },
    techniques: ['martillo', 'muro'],
    learn: [{ level: 15, tech: 'placaje_ki' }],
    color: '#ca8a04', plBase: 970,
  },

  // ============================================================ RIVALES ===
  {
    id: 'saibaman', name: 'Saibaman', lineage: 'majin', style: 'bruto',
    base: { poder: 11, ki: 9, defensa: 9, velocidad: 11, aguante: 9 },
    techniques: ['placaje_ki', 'explosion_final'],
    color: '#65a30d', plBase: 1200,
  },
  {
    id: 'raditz', name: 'Raditz', lineage: 'saiyan', style: 'bruto',
    base: { poder: 14, ki: 11, defensa: 12, velocidad: 13, aguante: 12 },
    techniques: ['combo', 'ondaexpansiva'],
    color: '#7c2d12', plBase: 1500,
  },
  {
    id: 'nappa', name: 'Nappa', lineage: 'saiyan', style: 'bruto',
    base: { poder: 15, ki: 11, defensa: 13, velocidad: 10, aguante: 14 },
    techniques: ['martillo', 'ondaexpansiva'],
    color: '#78350f', plBase: 4000,
  },
  {
    id: 'vegeta_saiyan', name: 'Vegeta (Príncipe)', lineage: 'saiyan', style: 'bruto',
    base: { poder: 16, ki: 14, defensa: 13, velocidad: 14, aguante: 13 },
    techniques: ['galick', 'combo', 'ondaexpansiva'],
    forms: ['ozaru'],
    color: '#1d4ed8', plBase: 18000,
  },
  {
    id: 'soldado', name: 'Soldado de Freezer', lineage: 'majin', style: 'bruto',
    base: { poder: 12, ki: 10, defensa: 11, velocidad: 11, aguante: 11 },
    techniques: ['rayomortal', 'combo'],
    color: '#a16207', plBase: 1000,
  },
  {
    id: 'cui', name: 'Cui', lineage: 'majin', style: 'tecnico',
    base: { poder: 13, ki: 12, defensa: 11, velocidad: 12, aguante: 12 },
    techniques: ['rayomortal', 'rodillazo'],
    color: '#7e22ce', plBase: 18000,
  },
  {
    id: 'dodoria', name: 'Dodoria', lineage: 'majin', style: 'bruto',
    base: { poder: 14, ki: 11, defensa: 13, velocidad: 10, aguante: 14 },
    techniques: ['ondaexpansiva', 'martillo'],
    color: '#db2777', plBase: 22000,
  },
  {
    id: 'zarbon', name: 'Zarbon', lineage: 'majin', style: 'tecnico',
    base: { poder: 14, ki: 12, defensa: 12, velocidad: 13, aguante: 12 },
    techniques: ['rodillazo', 'chispa'],
    forms: ['sobrecarga'],
    color: '#0d9488', plBase: 25000,
  },
  {
    id: 'ginyu', name: 'Capitán Ginyu', lineage: 'majin', style: 'tecnico',
    base: { poder: 15, ki: 13, defensa: 13, velocidad: 14, aguante: 13 },
    techniques: ['chispa', 'combo', 'taiyoken'],
    color: '#7c3aed', plBase: 120000,
  },
  {
    id: 'recoome', name: 'Recoome', lineage: 'majin', style: 'bruto',
    base: { poder: 15, ki: 11, defensa: 14, velocidad: 9, aguante: 15 },
    techniques: ['martillo', 'ondaexpansiva'],
    color: '#ea580c', plBase: 65000,
  },
  {
    id: 'freezer', name: 'Freezer', lineage: 'majin', style: 'ki',
    base: { poder: 16, ki: 17, defensa: 14, velocidad: 15, aguante: 14 },
    techniques: ['rayomortal', 'chispa', 'kienzan'],
    color: '#c026d3', plBase: 530000,
  },
  {
    id: 'a19', name: 'Nº 19', lineage: 'androide', style: 'tecnico',
    base: { poder: 13, ki: 12, defensa: 12, velocidad: 11, aguante: 12 },
    techniques: ['rayomortal', 'placaje_ki'],
    color: '#94a3b8', plBase: 250000,
  },
  {
    id: 'a17', name: 'Nº 17', lineage: 'androide', style: 'tecnico',
    base: { poder: 15, ki: 13, defensa: 13, velocidad: 15, aguante: 13 },
    techniques: ['infinitybullet', 'muro', 'rodillazo'],
    color: '#0ea5e9', plBase: 1000000,
  },
  {
    id: 'cell', name: 'Cell', lineage: 'androide', style: 'ki',
    base: { poder: 17, ki: 17, defensa: 15, velocidad: 15, aguante: 14 },
    // SIN Regeneración: siendo androide ya recupera ki solo, y las dos cosas
    // juntas lo convertían en un muro de 62 turnos imposible de tumbar.
    techniques: ['kamehameha', 'kienzan', 'bigbang'],
    color: '#15803d', plBase: 3000000,
  },
  {
    id: 'dabura', name: 'Dabura', lineage: 'majin', style: 'bruto',
    base: { poder: 15, ki: 14, defensa: 13, velocidad: 13, aguante: 13 },
    techniques: ['chispa', 'rodillazo'],
    color: '#b91c1c', plBase: 4000000,
  },
  {
    id: 'majin_vegeta', name: 'Vegeta Majin', lineage: 'saiyan', style: 'bruto',
    base: { poder: 16, ki: 14, defensa: 13, velocidad: 14, aguante: 13 },
    techniques: ['resplandor', 'combo', 'bigbang'],
    forms: ['ssj2', 'majin'],
    color: '#7f1d1d', plBase: 6000000,
  },
  {
    id: 'buu', name: 'Majin Buu', lineage: 'majin', style: 'bruto',
    base: { poder: 17, ki: 16, defensa: 14, velocidad: 14, aguante: 18 },
    techniques: ['ondaexpansiva', 'regeneracion', 'martillo'],
    color: '#f472b6', plBase: 8000000,
  },
]

const BY_ID = new Map(FIGHTERS.map((f) => [f.id, f]))

export function getFighter(id: string): FighterData | undefined {
  return BY_ID.get(id)
}

/**
 * Los INICIALES: eliges uno y empiezas la aventura solo con él, como el
 * inicial de Pokémon. Goku ya no viene de serie — si lo quieres, lo eliges.
 *
 * Son seis de perfiles distintos a propósito, para que la elección cambie de
 * verdad cómo se juega el primer tramo: el equilibrado, el rápido, el de ki,
 * el resistente, el de más pegada y el que apuesta por crecer.
 */
export const STARTERS = ['goku', 'krilin', 'ten', 'piccolo', 'yamcha', 'gohan'] as const

/** Por qué elegir a cada uno, en una línea, para la pantalla de selección. */
export const STARTER_PITCH: Record<string, string> = {
  goku: 'Equilibrado y sin puntos débiles. La opción segura.',
  krilin: 'Rápido y con el Disco Destructor, que ignora la guardia.',
  ten: 'Aguanta el ki como nadie y pega con el Cañón Tri-Haz.',
  piccolo: 'El más resistente. Se regenera y perfora defensas.',
  yamcha: 'Escurridizo y de golpes encadenados. Frágil si te atrapan.',
  gohan: 'Flojo al principio, enorme si sobrevive. Para valientes.',
}

/** Reclutables que aparecen en los interludios, por saga (0-3). */
export const RECRUITS: string[][] = [
  ['krilin', 'yamcha', 'ten', 'chaoz', 'gohan', 'piccolo'],
  ['krilin', 'gohan', 'piccolo', 'dende', 'vegeta', 'yajirobe'],
  ['vegeta', 'trunks', 'piccolo', 'gohan', 'a18', 'ten'],
  ['vegeta', 'gohan', 'trunks', 'a18', 'videl', 'dende'],
]
