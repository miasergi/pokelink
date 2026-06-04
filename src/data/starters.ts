// Iniciales clásicos por generación (ids del dex nacional).
export const STARTERS_BY_GEN: Record<number, number[]> = {
  1: [1, 4, 7], // Bulbasaur, Charmander, Squirtle
  2: [152, 155, 158], // Chikorita, Cyndaquil, Totodile
  3: [252, 255, 258], // Treecko, Torchic, Mudkip
  4: [387, 390, 393], // Turtwig, Chimchar, Piplup
  5: [495, 498, 501], // Snivy, Tepig, Oshawott
  6: [650, 653, 656], // Chespin, Fennekin, Froakie
  7: [722, 725, 728], // Rowlet, Litten, Popplio
  8: [810, 813, 816], // Grookey, Scorbunny, Sobble
  9: [906, 909, 912], // Sprigatito, Fuecoco, Quaxly
}

/** Iniciales para el modo "todos los Pokémon": un inicial de cada generación. */
export const ALL_MODE_STARTERS: number[] = [
  1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501,
  650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912,
]
