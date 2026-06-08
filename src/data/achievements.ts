export interface Achievement {
  id: string
  title: string
  desc: string
  icon: string
}

/** Catálogo de logros. La comprobación se hace en recordRunEnd (gameStore). */
// `icon` = nombre de icono para el componente <Icon> (sin emojis).
export const ACHIEVEMENTS: Achievement[] = [
  // --- Victorias ---
  { id: 'first_win', title: 'Primera victoria', desc: 'Gana tu primera partida.', icon: 'achievement' },
  { id: 'win10', title: 'Veterano', desc: 'Gana 10 partidas en total.', icon: 'trophy' },
  { id: 'win25', title: 'Leyenda', desc: 'Gana 25 partidas en total.', icon: 'trophy' },
  { id: 'win50', title: 'Maestro Pokémon', desc: 'Gana 50 partidas en total.', icon: 'trophy' },
  { id: 'played50', title: 'Incansable', desc: 'Juega 50 partidas.', icon: 'refresh' },
  // --- Dificultad y modos ---
  { id: 'gym_master', title: 'Maestro de gimnasios', desc: 'Derrota a los 8 gimnasios en una partida.', icon: 'league' },
  { id: 'champion_hard', title: 'Campeón en Difícil', desc: 'Gana una partida en dificultad Difícil.', icon: 'fire' },
  { id: 'champion_nuzlocke', title: 'Superviviente', desc: 'Gana una partida en modo Nuzlocke.', icon: 'skull' },
  { id: 'daily_win', title: 'Reto superado', desc: 'Gana un Reto diario.', icon: 'calendar' },
  { id: 'random_win', title: 'Caos controlado', desc: 'Gana una partida en Modo Random.', icon: 'dice' },
  { id: 'monolocke_win', title: 'Monomaníaco', desc: 'Gana una partida en modo Monolocke.', icon: 'lock' },
  { id: 'multi_win', title: 'Sin fronteras', desc: 'Gana con Pokémon de varias regiones.', icon: 'map' },
  // --- Velocidad ---
  { id: 'speedrun', title: 'A toda velocidad', desc: 'Gana una partida en menos de 25 minutos.', icon: 'timer' },
  { id: 'speedrun15', title: 'Relámpago', desc: 'Gana una partida en menos de 15 minutos.', icon: 'bolt' },
  // --- Composición de equipo ---
  { id: 'monotype', title: 'Especialista', desc: 'Gana con un equipo de un solo tipo.', icon: 'target' },
  { id: 'legendary_team', title: 'Domador de leyendas', desc: 'Gana con un Pokémon legendario en el equipo.', icon: 'star' },
  { id: 'shiny_win', title: 'Brillo campeón', desc: 'Gana con un Pokémon shiny en el equipo.', icon: 'sparkle' },
  { id: 'full_team_win', title: 'Equipo completo', desc: 'Gana con 6 Pokémon en el equipo.', icon: 'people' },
  // --- Colección ---
  { id: 'shiny', title: 'Cazador de shinies', desc: 'Captura un Pokémon shiny.', icon: 'sparkle' },
  { id: 'shiny5', title: 'Coleccionista de brillos', desc: 'Consigue 5 shinies distintos.', icon: 'sparkle' },
  { id: 'shiny25', title: 'Iridiscente', desc: 'Consigue 25 shinies distintos.', icon: 'sparkle' },
  { id: 'collector50', title: 'Coleccionista', desc: 'Captura 50 especies distintas.', icon: 'pokedex' },
  { id: 'collector100', title: 'Investigador', desc: 'Captura 100 especies distintas.', icon: 'book' },
  { id: 'collector150', title: 'Enciclopedia', desc: 'Captura 150 especies distintas.', icon: 'book' },
  { id: 'collector_all', title: 'Maestro Pokédex', desc: 'Completa la Pokédex.', icon: 'star' },
  { id: 'all_regions', title: 'Trotamundos', desc: 'Gana en las 9 regiones.', icon: 'map' },
  // --- Liga Pokémon ---
  { id: 'league_groups', title: 'Clasificado', desc: 'Supera la fase de grupos de la Liga.', icon: 'league' },
  { id: 'league_semis', title: 'Semifinalista', desc: 'Llega a las semifinales de la Liga.', icon: 'league' },
  { id: 'league_finalist', title: 'Finalista', desc: 'Llega a la final de la Liga.', icon: 'trophy' },
  { id: 'league_champion', title: 'Rey de la Liga', desc: 'Gana la Liga Pokémon.', icon: 'liga' },
  { id: 'league_flawless', title: 'Imparable', desc: 'Gana la Liga sin perder ni un combate.', icon: 'liga' },
]

export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]))
