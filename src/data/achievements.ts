export interface Achievement {
  id: string
  title: string
  desc: string
  icon: string
}

/** Catálogo de logros. La comprobación se hace en recordRunEnd (gameStore). */
// `icon` = nombre de icono para el componente <Icon> (sin emojis).
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', title: 'Primera victoria', desc: 'Gana tu primera partida.', icon: 'achievement' },
  { id: 'win10', title: 'Veterano', desc: 'Gana 10 partidas en total.', icon: 'trophy' },
  { id: 'gym_master', title: 'Maestro de gimnasios', desc: 'Derrota a los 8 gimnasios en una partida.', icon: 'league' },
  { id: 'champion_hard', title: 'Campeón en Difícil', desc: 'Gana una partida en dificultad Difícil.', icon: 'fire' },
  { id: 'champion_nuzlocke', title: 'Superviviente', desc: 'Gana una partida en modo Nuzlocke.', icon: 'skull' },
  { id: 'speedrun', title: 'A toda velocidad', desc: 'Gana una partida en menos de 25 minutos.', icon: 'timer' },
  { id: 'monotype', title: 'Especialista', desc: 'Gana con un equipo de un solo tipo.', icon: 'target' },
  { id: 'daily_win', title: 'Reto superado', desc: 'Gana un Reto diario.', icon: 'calendar' },
  { id: 'shiny', title: 'Cazador de shinies', desc: 'Captura un Pokémon shiny.', icon: 'sparkle' },
  { id: 'collector50', title: 'Coleccionista', desc: 'Captura 50 especies distintas.', icon: 'pokedex' },
  { id: 'collector100', title: 'Investigador', desc: 'Captura 100 especies distintas.', icon: 'book' },
  { id: 'collector_all', title: 'Maestro Pokédex', desc: 'Completa la Pokédex.', icon: 'star' },
  { id: 'all_regions', title: 'Trotamundos', desc: 'Gana en las 9 regiones.', icon: 'map' },
]

export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))
