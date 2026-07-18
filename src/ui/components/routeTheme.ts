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

export interface RouteTheme {
  /** Imagen de cabecera del tramo. */
  img: string
  /** Nombre evocador de la ruta ("Ruta costera", "Paso helado"...). */
  name: string
}

const T = (file: string, name: string): RouteTheme => ({ img: `${ROUTES}${file}.webp`, name })

const THEME_BY_TYPE: Record<PokemonType, RouteTheme> = {
  normal: T('meadow', 'Pradera abierta'),
  fairy: T('meadow', 'Campos floridos'),
  grass: T('forest', 'Bosque frondoso'),
  bug: T('forest', 'Senda del bosque'),
  water: T('coast', 'Ruta costera'),
  ice: T('snow', 'Paso helado'),
  fire: T('volcano', 'Senda volcánica'),
  electric: T('city', 'Gran ciudad'),
  rock: T('canyon', 'Cañón rocoso'),
  ground: T('desert', 'Camino del desierto'),
  fighting: T('waterfall', 'Cascada de entrenamiento'),
  flying: T('cliffs', 'Acantilados ventosos'),
  psychic: T('ruins', 'Ruinas ancestrales'),
  ghost: T('nightforest', 'Bosque tenebroso'),
  dark: T('nightforest', 'Senda nocturna'),
  poison: T('swamp', 'Ciénaga tóxica'),
  steel: T('factory', 'Zona industrial'),
  dragon: T('cave', 'Gruta profunda'),
}

export const LEAGUE_THEME: RouteTheme = T('league', 'Calle Victoria')

/** Tema visual de un tramo: por el tipo del líder que lo cierra; el tramo
 *  final (Calle Victoria + Liga) tiene tema propio. */
export function segmentTheme(seg: MapSegment, isLast: boolean): RouteTheme {
  if (isLast) return LEAGUE_THEME
  const type = seg.boss?.content.kind === 'trainer' ? seg.boss.content.trainer.specialtyType : undefined
  return (type && THEME_BY_TYPE[type]) || THEME_BY_TYPE.normal
}
