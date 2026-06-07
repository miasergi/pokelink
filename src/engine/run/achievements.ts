import type { RunState } from './types'
import type { MetaRecord } from '@/persistence/db'
import { ALL_SPECIES, getSpecies } from '@/data'

/**
 * Devuelve los logros recién conseguidos (los que se cumplen y NO estaban ya en
 * `meta.achievements`). Función pura: la persistencia la hace `recordRunEnd`.
 * `won` = la run terminó en victoria (campeón derrotado).
 */
export function checkAchievements(meta: MetaRecord, run: RunState, won: boolean, now: number = Date.now()): string[] {
  const durationMs = Math.max(0, now - run.startedAt)
  const types = run.party.map((p) => new Set(getSpecies(p.speciesId).types))
  const monotype = run.party.length > 0 && [...types[0]].some((t) => types.every((s) => s.has(t)))
  const earned: string[] = []
  if (meta.totals.wins >= 1) earned.push('first_win')
  if (meta.totals.wins >= 10) earned.push('win10')
  if (run.stats.gymsDefeated >= 8) earned.push('gym_master')
  if (won && run.difficulty === 'hard') earned.push('champion_hard')
  if (won && run.difficulty === 'nuzlocke') earned.push('champion_nuzlocke')
  if (won && durationMs > 0 && durationMs < 25 * 60000) earned.push('speedrun')
  if (won && monotype) earned.push('monotype')
  if (won && run.daily) earned.push('daily_win')
  if (meta.pokedexShiny.length >= 1) earned.push('shiny')
  if (meta.pokedexCaught.length >= 50) earned.push('collector50')
  if (meta.pokedexCaught.length >= 100) earned.push('collector100')
  if (meta.pokedexCaught.length >= ALL_SPECIES.length) earned.push('collector_all')
  if (meta.regionsWon.length >= 9) earned.push('all_regions')
  return earned.filter((id) => !meta.achievements.includes(id))
}
