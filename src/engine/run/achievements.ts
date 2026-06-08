import type { RunState } from './types'
import type { MetaRecord } from '@/persistence/db'
import { ALL_SPECIES, getSpecies } from '@/data'

/**
 * Devuelve los logros recién conseguidos (los que se cumplen y NO estaban ya en
 * `meta.achievements`). Función pura: la persistencia la hace `recordRunEnd`.
 * `won` = la run terminó en victoria (campeón derrotado).
 */
export function checkAchievements(meta: MetaRecord, run: RunState, won: boolean, now: number = Date.now()): string[] {
  // Duración = tiempo de juego ACTIVO (elapsedMs ya volcado al cerrar la run);
  // si falta (runs antiguas), se estima con el ancla de sesión.
  const durationMs = run.elapsedMs != null ? run.elapsedMs : Math.max(0, now - run.startedAt)
  const types = run.party.map((p) => new Set(getSpecies(p.speciesId).types))
  const monotype = run.party.length > 0 && [...types[0]].some((t) => types.every((s) => s.has(t)))
  const hasLegendary = run.party.some((p) => getSpecies(p.speciesId).legendary)
  const hasShiny = run.party.some((p) => p.shiny)
  const earned: string[] = []
  // Victorias acumuladas / partidas jugadas
  if (meta.totals.wins >= 1) earned.push('first_win')
  if (meta.totals.wins >= 10) earned.push('win10')
  if (meta.totals.wins >= 25) earned.push('win25')
  if (meta.totals.wins >= 50) earned.push('win50')
  if (meta.totals.runs >= 50) earned.push('played50')
  // Dificultad y modos
  if (run.stats.gymsDefeated >= 8) earned.push('gym_master')
  if (won && run.difficulty === 'hard') earned.push('champion_hard')
  if (won && run.difficulty === 'nuzlocke') earned.push('champion_nuzlocke')
  if (won && run.daily) earned.push('daily_win')
  if (won && run.random) earned.push('random_win')
  if (won && run.monotype) earned.push('monolocke_win')
  if (won && run.pools.length > 1) earned.push('multi_win')
  // Velocidad
  if (won && durationMs > 0 && durationMs < 25 * 60000) earned.push('speedrun')
  if (won && durationMs > 0 && durationMs < 15 * 60000) earned.push('speedrun15')
  // Composición
  if (won && monotype) earned.push('monotype')
  if (won && hasLegendary) earned.push('legendary_team')
  if (won && hasShiny) earned.push('shiny_win')
  if (won && run.party.length >= 6) earned.push('full_team_win')
  // Colección
  if (meta.pokedexShiny.length >= 1) earned.push('shiny')
  if (meta.pokedexShiny.length >= 5) earned.push('shiny5')
  if (meta.pokedexShiny.length >= 25) earned.push('shiny25')
  if (meta.pokedexCaught.length >= 50) earned.push('collector50')
  if (meta.pokedexCaught.length >= 100) earned.push('collector100')
  if (meta.pokedexCaught.length >= 150) earned.push('collector150')
  if (meta.pokedexCaught.length >= ALL_SPECIES.length) earned.push('collector_all')
  if (meta.regionsWon.length >= 9) earned.push('all_regions')
  return earned.filter((id) => !meta.achievements.includes(id))
}
