export interface Achievement {
  id: string
  title: string
  desc: string
  icon: string
}

/** Catálogo de logros. La comprobación se hace en recordRunEnd (gameStore). */
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', title: 'Primera victoria', desc: 'Gana tu primera partida.', icon: '🏅' },
  { id: 'win10', title: 'Veterano', desc: 'Gana 10 partidas en total.', icon: '🏆' },
  { id: 'gym_master', title: 'Maestro de gimnasios', desc: 'Derrota a los 8 gimnasios en una partida.', icon: '🥇' },
  { id: 'champion_hard', title: 'Campeón en Difícil', desc: 'Gana una partida en dificultad Difícil.', icon: '🔥' },
  { id: 'champion_nuzlocke', title: 'Superviviente', desc: 'Gana una partida en modo Nuzlocke.', icon: '💀' },
  { id: 'speedrun', title: 'A toda velocidad', desc: 'Gana una partida en menos de 25 minutos.', icon: '⏱️' },
  { id: 'monotype', title: 'Especialista', desc: 'Gana con un equipo de un solo tipo.', icon: '🎯' },
  { id: 'daily_win', title: 'Reto superado', desc: 'Gana un Reto diario.', icon: '🗓️' },
  { id: 'shiny', title: 'Cazador de shinies', desc: 'Captura un Pokémon shiny.', icon: '✨' },
  { id: 'collector50', title: 'Coleccionista', desc: 'Captura 50 especies distintas.', icon: '📕' },
  { id: 'collector100', title: 'Investigador', desc: 'Captura 100 especies distintas.', icon: '📚' },
  { id: 'collector_all', title: 'Maestro Pokédex', desc: 'Completa la Pokédex.', icon: '🌟' },
  { id: 'all_regions', title: 'Trotamundos', desc: 'Gana en las 9 regiones.', icon: '🗺️' },
]

export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))
