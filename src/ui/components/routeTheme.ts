import type { PokemonType } from '@/types'
import type { MapSegment } from '@/engine/run/segments'

// Imágenes de ruta por tramo (public/routes/*.webp): la cabecera de cada
// "pantalla de medalla" muestra el paisaje acorde al TIPO del próximo líder.
// Varios tipos comparten paisaje (16 ficheros para 18 tipos + Liga).
// Fotos de Wikimedia Commons (licencias libres, recortadas a 720×360 webp);
// para usar arte propio basta sobrescribir los ficheros. Créditos (File: en
// commons.wikimedia.org): meadow=Val_D_Orcia_In_Autumn_(179351679) ·
// forest=Stone_stairs_on_a_hiking_trail_in_a_shaded_forest ·
// coast=Chimney_Rock_Trail_Point_Reyes_December_2016_panorama_1 ·
// snow=Winter_auf_dem_Himmeldunkberg · volcano=Etna_Volcano_Paroxysmal_
// Eruption_July_30_2011_(gnuckx) · city=Long_Island_City_New_York_May_2015_
// panorama_3 · canyon=Semi-arid_canyon_landscape..._Villa_de_Leyva ·
// desert=Dunes,_Désert_du_Thar · waterfall=Beauchamp_Falls_(Great_Otway_NP) ·
// cliffs=Cliffs_of_Moher_with_Sea_Thrift · ruins=Temple_of_Hera_(Paestum)_-_
// Interior_from_east · nightforest=Mystical_forest_in_fog_(51900736587) ·
// swamp=Inside_Pichavaram_Mangrove_Forest · factory=Landschaftspark_
// Duisburg-Nord,_Hochofen_5 · cave=Heart_of_the_Cave_in_Carlsbad_Cavern-115 ·
// league=Allianz_Arena_in_Munich.
const ROUTES = import.meta.env.BASE_URL + 'routes/'

/** Paleta del TERRENO del tablero (el mapa se dibuja con tiles de estos
 *  colores, no con una foto). `base`/`alt` son las dos tonalidades del damero
 *  del suelo, `deco` las motitas de hierba/piedra y `edge` la maleza del borde. */
export interface TerrainPalette {
  base: string
  alt: string
  deco: string
  edge: string
  /** Color del sendero que une las casillas. */
  path: string
}

export interface RouteTheme {
  /** Imagen de cabecera del tramo. */
  img: string
  /** Nombre evocador de la ruta ("Ruta costera", "Paso helado"...). */
  name: string
  /** Colores con los que se dibuja el tablero de ese tramo. */
  terrain: TerrainPalette
}

// Paletas de terreno. Cada bioma pinta su propio tablero: hierba en el bosque,
// arena en el desierto, roca en el cañón, nieve en el paso helado...
const P = (base: string, alt: string, deco: string, edge: string, path: string): TerrainPalette =>
  ({ base, alt, deco, edge, path })
const GRASS = P('#5fa855', '#569c4d', '#7cc06f', '#2f6b34', '#c8a970')
const WOOD = P('#4a8f4a', '#428442', '#68ad63', '#255a2b', '#b8975f')
const SAND = P('#d8bd7e', '#cfb173', '#e6d09a', '#a08248', '#b08c50')
const ROCK = P('#a08d78', '#95826e', '#b8a793', '#6b5b4a', '#c2ab8a')
const SNOW = P('#d8e4ec', '#cbd9e3', '#eef4f8', '#8fa6b5', '#a9bcc9')
const LAVA = P('#8a5347', '#7d4a3f', '#a3695a', '#4d2b25', '#c98b5e')
const URBAN = P('#8c93a3', '#828a9a', '#a3aab8', '#535a68', '#b9a98f')
const WATER = P('#5aa9b8', '#51a0af', '#7cc3cf', '#2f6c78', '#d8c79a')
const SWAMP = P('#6b7f52', '#62764a', '#84996a', '#3c4c2f', '#8f7f55')
const CAVE = P('#6f6a80', '#666176', '#877f99', '#413d4e', '#9a8e78')
const STONE = P('#b0a68f', '#a59b85', '#c6bda8', '#7a7160', '#c9b894')

const T = (file: string, name: string, terrain: TerrainPalette): RouteTheme =>
  ({ img: `${ROUTES}${file}.webp`, name, terrain })

const THEME_BY_TYPE: Record<PokemonType, RouteTheme> = {
  normal: T('meadow', 'Pradera abierta', GRASS),
  fairy: T('meadow', 'Campos floridos', GRASS),
  grass: T('forest', 'Bosque frondoso', WOOD),
  bug: T('forest', 'Senda del bosque', WOOD),
  water: T('coast', 'Ruta costera', WATER),
  ice: T('snow', 'Paso helado', SNOW),
  fire: T('volcano', 'Senda volcánica', LAVA),
  electric: T('city', 'Gran ciudad', URBAN),
  rock: T('canyon', 'Cañón rocoso', ROCK),
  ground: T('desert', 'Camino del desierto', SAND),
  fighting: T('waterfall', 'Cascada de entrenamiento', GRASS),
  flying: T('cliffs', 'Acantilados ventosos', STONE),
  psychic: T('ruins', 'Ruinas ancestrales', STONE),
  ghost: T('nightforest', 'Bosque tenebroso', CAVE),
  dark: T('nightforest', 'Senda nocturna', CAVE),
  poison: T('swamp', 'Ciénaga tóxica', SWAMP),
  steel: T('factory', 'Zona industrial', URBAN),
  dragon: T('cave', 'Gruta profunda', CAVE),
}

export const LEAGUE_THEME: RouteTheme = T('league', 'Calle Victoria', STONE)

/** Tema visual de un tramo: por el tipo del líder que lo cierra; el tramo
 *  final (Calle Victoria + Liga) tiene tema propio. */
export function segmentTheme(seg: MapSegment, isLast: boolean): RouteTheme {
  if (isLast) return LEAGUE_THEME
  const type = seg.boss?.content.kind === 'trainer' ? seg.boss.content.trainer.specialtyType : undefined
  return (type && THEME_BY_TYPE[type]) || THEME_BY_TYPE.normal
}
