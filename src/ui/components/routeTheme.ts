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

// ---------------------------------------------------------------------------
// Localidades REALES de cada región (v6.52)
//
// Antes cada tramo se ilustraba con una foto de un paisaje real (una pradera de
// la Toscana, el estadio del Bayern para la Liga...) elegida por el TIPO del
// líder: quedaba fuera de tono y además Kanto y Paldea se veían igual. Ahora
// cada tramo muestra la localidad de los JUEGOS donde está ese gimnasio, en el
// orden de líderes de `src/data/trainers/genN.ts`, y la novena entrada es la
// Liga. Imágenes en `public/routes/gen<N>/<tramo>.webp` (recortadas a 720×360
// webp desde Bulbapedia; proyecto de fan sin ánimo de lucro). Para usar arte
// propio basta sobrescribir esos ficheros.
const ART = import.meta.env.BASE_URL + 'routes/'
interface RegionPlace { name: string }
const A = (name: string): RegionPlace => ({ name })

const PLACES_BY_GEN: Record<number, RegionPlace[]> = {
  1: [A('Ciudad Plateada'), A('Ciudad Celeste'), A('Ciudad Carmín'), A('Ciudad Azulona'), A('Ciudad Fucsia'), A('Ciudad Azafrán'), A('Isla Canela'), A('Ciudad Verde'), A('Meseta Añil')],
  2: [A('Ciudad Malva'), A('Pueblo Azalea'), A('Ciudad Trigal'), A('Ciudad Iris'), A('Ciudad Orquídea'), A('Ciudad Olivo'), A('Pueblo Caoba'), A('Ciudad Endrino'), A('Calle Victoria')],
  3: [A('Ciudad Férrica'), A('Pueblo Azuliza'), A('Ciudad Malvalona'), A('Pueblo Lavacalda'), A('Ciudad Petalia'), A('Ciudad Arborada'), A('Ciudad Algaria'), A('Arrecípolis'), A('Ciudad Colosalia')],
  4: [A('Ciudad Pirita'), A('Ciudad Vetusta'), A('Ciudad Rocavelo'), A('Ciudad Pradera'), A('Ciudad Corazón'), A('Ciudad Canal'), A('Ciudad Puntaneva'), A('Ciudad Marina'), A('Liga de Sinnoh')],
  5: [A('Ciudad Gres'), A('Ciudad Esmalte'), A('Ciudad Porcelana'), A('Ciudad Mayólica'), A('Ciudad Rayente'), A('Ciudad Loza'), A('Ciudad Ferrocén'), A('Ciudad Ópalo'), A('Liga de Teselia')],
  6: [A('Ciudad Novarte'), A('Ciudad Relieve'), A('Ciudad Yantra'), A('Ciudad Fluxus'), A('Ciudad Luminalia'), A('Ciudad Fractal'), A('Ciudad Tulusa'), A('Ciudad Nieveria'), A('Liga de Kalos')],
  7: [A('Cueva Bullente'), A('Colina Saltagua'), A('Área Volcánica del Wela'), A('Jungla Umbría'), A('Observatorio Hokulani'), A('Supermercado Abandonado'), A('Pueblo Marino'), A('Cañón Poni'), A('Monte Lanakila')],
  8: [A('Pueblo Ladera'), A('Pueblo Amura'), A('Ciudad Pistón'), A('Pueblo Auriga'), A('Bosque Lúgubre'), A('Pueblo Plié'), A('Pueblo Crampón'), A('Ciudad Artejo'), A('Ciudad Puntera')],
  9: [A('Cortondo'), A('Artazon'), A('Levincia'), A('Cascarrafa'), A('Medalí'), A('Montenevera'), A('Alfornada'), A('Monte Glaseado'), A('Mesagoza')],
}

/** Tema visual de un tramo: la localidad real de la región si la conocemos y,
 *  si no (modo historia, regiones sin arte), el paisaje por TIPO de siempre.
 *  El TERRENO del tablero sigue saliendo del tipo del líder: el bioma tiene que
 *  casar con lo que peleas, no con la ciudad. */
export function segmentTheme(seg: MapSegment, isLast: boolean, gen?: number): RouteTheme {
  const type = seg.boss?.content.kind === 'trainer' ? seg.boss.content.trainer.specialtyType : undefined
  const fallback = isLast ? LEAGUE_THEME : (type && THEME_BY_TYPE[type]) || THEME_BY_TYPE.normal
  const places = gen ? PLACES_BY_GEN[gen] : undefined
  // El tramo final (Calle Victoria + Liga) es siempre la última entrada.
  const i = isLast ? (places?.length ?? 0) - 1 : seg.index
  const place = places?.[i]
  if (!place) return fallback
  return { img: `${ART}gen${gen}/${i}.webp`, name: place.name, terrain: fallback.terrain }
}
