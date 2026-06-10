import type { TrainerData } from '@/types'
import type { StoryLine } from './chapters'
import { ARCHIPELAGO_POOL, CHAPTER1_CLASSES, CHAPTER1_BOSS, CHAPTER1_PREBOSS, CHAPTER1_OUTRO, type StoryClass } from './chapter1'
import { CHAPTER2 } from './chapter2'
import { CHAPTER3 } from './chapter3'
import { CHAPTER4 } from './chapter4'
import { CHAPTER5 } from './chapter5'
import { CHAPTER6 } from './chapter6'

/** Contenido jugable + narrativa de un capítulo del Modo Historia. */
export interface ChapterContent {
  /** Especies del pool salvaje/capturas del capítulo. */
  pool: number[]
  /** Clases de entrenador temáticas. */
  classes: StoryClass[]
  /** Jefe final del capítulo (se trata como 'champion' para cerrar la run). */
  boss: { trainer: TrainerData; team: number[]; aceLevel: number }
  /** Diálogos antes del jefe y al superar el capítulo. */
  preboss: StoryLine[]
  outro: StoryLine[]
  /** Nivel de los enemigos al EMPEZAR el capítulo (la curva sube hasta el ace
   *  del jefe). También es el nivel del compañero nuevo si empiezas de cero. */
  startLevel?: number
  /** Capas de ruta del mapa (sin contar el jefe). */
  layers: { width: number; heal?: boolean }[]
}

const CHAPTER1: ChapterContent = {
  pool: ARCHIPELAGO_POOL,
  classes: CHAPTER1_CLASSES,
  boss: CHAPTER1_BOSS,
  preboss: CHAPTER1_PREBOSS,
  outro: CHAPTER1_OUTRO,
  startLevel: 5,
  layers: [{ width: 2 }, { width: 3 }, { width: 3, heal: true }, { width: 3 }, { width: 3 }, { width: 2, heal: true }],
}

export const STORY_CONTENT: Record<number, ChapterContent> = {
  1: CHAPTER1, 2: CHAPTER2, 3: CHAPTER3, 4: CHAPTER4, 5: CHAPTER5, 6: CHAPTER6,
}
