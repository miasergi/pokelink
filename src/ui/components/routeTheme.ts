import type { PokemonType } from '@/types'
import type { MapSegment } from '@/engine/run/segments'

// Escenarios de tramo con los TILES DE LOS JUEGOS (public/routes/tiles/*.png).
//
// Antes cada tramo se ilustraba con una foto o un fotograma del anime: al
// ampliarlo para cubrir la pantalla se emborronaba y quedaba fuera de tono.
// Ahora son las localidades de los juegos renderizadas tile a tile desde los
// datos de FireRed, Crystal y Emerald (`scripts/render-tilemaps.mjs`, que las
// baja de los descompilados de pret): PNG a resolución nativa que la UI escala
// con `image-rendering: pixelated`, así que se ven como en la consola. Para
// usar arte propio basta sobrescribir esos ficheros (o añadir escenas al
// script). Proyecto de fan sin ánimo de lucro.
const TILES = import.meta.env.BASE_URL + 'routes/tiles/'
const sceneImg = (scene: string) => `${TILES}${scene}.png`

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
  /** Imagen de cabecera del tramo (y telón de fondo de toda la run). */
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

interface TypeTheme {
  name: string
  terrain: TerrainPalette
  /** Escenas de tiles que pegan con el bioma, para regiones sin tiles 2D
   *  (gens 4-9 son juegos en 3D) y para el Modo Historia. Se alterna entre
   *  ellas por generación para que dos regiones no se vean idénticas. */
  scenes: string[]
}
const T = (name: string, terrain: TerrainPalette, scenes: string[]): TypeTheme => ({ name, terrain, scenes })

const THEME_BY_TYPE: Record<PokemonType, TypeTheme> = {
  normal: T('Pradera abierta', GRASS, ['goldenrod', 'petalburg', 'pallet']),
  fairy: T('Campos floridos', GRASS, ['verdanturf', 'cherrygrove']),
  grass: T('Bosque frondoso', WOOD, ['celadon', 'fortree']),
  bug: T('Senda del bosque', WOOD, ['azalea', 'viridian_forest']),
  water: T('Ruta costera', WATER, ['cerulean', 'dewford', 'slateport', 'pacifidlog']),
  ice: T('Paso helado', SNOW, ['mahogany', 'fallarbor']),
  fire: T('Senda volcánica', LAVA, ['cinnabar', 'lavaridge']),
  electric: T('Gran ciudad', URBAN, ['vermilion', 'mauville']),
  rock: T('Cañón rocoso', ROCK, ['pewter', 'rustboro']),
  ground: T('Camino del desierto', SAND, ['viridian', 'cianwood']),
  fighting: T('Cascada de entrenamiento', GRASS, ['cianwood', 'saffron']),
  flying: T('Acantilados ventosos', STONE, ['violet', 'fortree']),
  psychic: T('Ruinas ancestrales', STONE, ['saffron', 'mossdeep']),
  ghost: T('Bosque tenebroso', CAVE, ['lavender', 'ecruteak']),
  dark: T('Senda nocturna', CAVE, ['ecruteak', 'lavender']),
  poison: T('Ciénaga tóxica', SWAMP, ['fuchsia', 'viridian_forest']),
  steel: T('Zona industrial', URBAN, ['olivine', 'lilycove']),
  dragon: T('Gruta profunda', CAVE, ['blackthorn', 'sootopolis']),
}

const LEAGUE: TypeTheme = T('Calle Victoria', STONE, ['indigo', 'ever_grande', 'route23'])
export const LEAGUE_THEME: RouteTheme = { img: sceneImg(LEAGUE.scenes[0]), name: LEAGUE.name, terrain: LEAGUE.terrain }

// ---------------------------------------------------------------------------
// Localidades REALES de cada región
//
// Cada tramo muestra la localidad donde está ese gimnasio, en el orden de
// líderes de `src/data/trainers/genN.ts`; la novena entrada es la Liga. Kanto,
// Johto y Hoenn tienen sus mapas de verdad (`scene`); las regiones de los
// juegos en 3D (gens 4-9) no tienen tiles, así que conservan su nombre y
// toman una escena de tiles que case con el TIPO del líder.
interface RegionPlace { name: string; scene?: string }
const A = (name: string, scene?: string): RegionPlace => ({ name, scene })

const PLACES_BY_GEN: Record<number, RegionPlace[]> = {
  1: [A('Ciudad Plateada', 'pewter'), A('Ciudad Celeste', 'cerulean'), A('Ciudad Carmín', 'vermilion'), A('Ciudad Azulona', 'celadon'), A('Ciudad Fucsia', 'fuchsia'), A('Ciudad Azafrán', 'saffron'), A('Isla Canela', 'cinnabar'), A('Ciudad Verde', 'viridian'), A('Meseta Añil', 'indigo')],
  2: [A('Ciudad Malva', 'violet'), A('Pueblo Azalea', 'azalea'), A('Ciudad Trigal', 'goldenrod'), A('Ciudad Iris', 'ecruteak'), A('Ciudad Orquídea', 'cianwood'), A('Ciudad Olivo', 'olivine'), A('Pueblo Caoba', 'mahogany'), A('Ciudad Endrino', 'blackthorn'), A('Calle Victoria', 'route23')],
  3: [A('Ciudad Férrica', 'rustboro'), A('Pueblo Azuliza', 'dewford'), A('Ciudad Malvalona', 'mauville'), A('Pueblo Lavacalda', 'lavaridge'), A('Ciudad Petalia', 'petalburg'), A('Ciudad Arborada', 'fortree'), A('Ciudad Algaria', 'mossdeep'), A('Arrecípolis', 'sootopolis'), A('Ciudad Colosalia', 'ever_grande')],
  4: [A('Ciudad Pirita'), A('Ciudad Vetusta'), A('Ciudad Rocavelo'), A('Ciudad Pradera'), A('Ciudad Corazón'), A('Ciudad Canal'), A('Ciudad Puntaneva'), A('Ciudad Marina'), A('Liga de Sinnoh')],
  5: [A('Ciudad Gres'), A('Ciudad Esmalte'), A('Ciudad Porcelana'), A('Ciudad Mayólica'), A('Ciudad Rayente'), A('Ciudad Loza'), A('Ciudad Ferrocén'), A('Ciudad Ópalo'), A('Liga de Teselia')],
  6: [A('Ciudad Novarte'), A('Ciudad Relieve'), A('Ciudad Yantra'), A('Ciudad Fluxus'), A('Ciudad Luminalia'), A('Ciudad Fractal'), A('Ciudad Tulusa'), A('Ciudad Nieveria'), A('Liga de Kalos')],
  7: [A('Cueva Bullente'), A('Colina Saltagua'), A('Área Volcánica del Wela'), A('Jungla Umbría'), A('Observatorio Hokulani'), A('Supermercado Abandonado'), A('Pueblo Marino'), A('Cañón Poni'), A('Monte Lanakila')],
  8: [A('Pueblo Ladera'), A('Pueblo Amura'), A('Ciudad Pistón'), A('Pueblo Auriga'), A('Bosque Lúgubre'), A('Pueblo Plié'), A('Pueblo Crampón'), A('Ciudad Artejo'), A('Ciudad Puntera')],
  9: [A('Cortondo'), A('Artazon'), A('Levincia'), A('Cascarrafa'), A('Medalí'), A('Montenevera'), A('Alfornada'), A('Monte Glaseado'), A('Mesagoza')],
}

/** Tema visual de un tramo: la localidad real de la región si la conocemos y,
 *  si no (modo historia), el paisaje por TIPO de siempre. El TERRENO del
 *  tablero sigue saliendo del tipo del líder: el bioma tiene que casar con lo
 *  que peleas, no con la ciudad. */
export function segmentTheme(seg: MapSegment, isLast: boolean, gen?: number): RouteTheme {
  const type = seg.boss?.content.kind === 'trainer' ? seg.boss.content.trainer.specialtyType : undefined
  const base = isLast ? LEAGUE : (type && THEME_BY_TYPE[type]) || THEME_BY_TYPE.normal
  const places = gen ? PLACES_BY_GEN[gen] : undefined
  // El tramo final (Calle Victoria + Liga) es siempre la última entrada.
  const i = isLast ? (places?.length ?? 0) - 1 : seg.index
  const place = places?.[i]
  const scene = place?.scene ?? base.scenes[(gen ?? 0) % base.scenes.length]
  return { img: sceneImg(scene), name: place?.name ?? base.name, terrain: base.terrain }
}
