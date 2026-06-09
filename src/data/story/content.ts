import type { TrainerData } from '@/types'
import type { StoryLine } from './chapters'
import { ARCHIPELAGO_POOL, CHAPTER1_CLASSES, CHAPTER1_BOSS, CHAPTER1_PREBOSS, CHAPTER1_OUTRO, type StoryClass } from './chapter1'
import { CHAPTER2 } from './chapter2'

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
  /** Capas de ruta del mapa (sin contar el jefe). */
  layers: { width: number; heal?: boolean }[]
}

const CHAPTER1: ChapterContent = {
  pool: ARCHIPELAGO_POOL,
  classes: CHAPTER1_CLASSES,
  boss: CHAPTER1_BOSS,
  preboss: CHAPTER1_PREBOSS,
  outro: CHAPTER1_OUTRO,
  layers: [{ width: 2 }, { width: 3 }, { width: 3, heal: true }, { width: 3 }, { width: 3 }, { width: 2, heal: true }],
}

export const STORY_CONTENT: Record<number, ChapterContent> = { 1: CHAPTER1, 2: CHAPTER2 }
