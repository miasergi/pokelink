// Descarga los retratos de los luchadores de Dragon Ball Rogue desde la wiki de
// Fandom (dragonball.fandom.com).
//
//   node scripts/fetch-dragon-portraits.mjs             (solo los que faltan)
//   node scripts/fetch-dragon-portraits.mjs --force     (vuelve a bajarlo todo)
//   node scripts/fetch-dragon-portraits.mjs goku vegeta
//   node scripts/fetch-dragon-portraits.mjs --no-cutout (no recorta fondos)
//
// Guarda en `public/dragon/fighters/<id>.png` miniaturas de 256 px pedidas a la
// propia API (`pithumbsize` / `iiurlwidth`), así que no hace falta redimensionar
// nada ni instalar `sharp`.
//
// ¿Por qué .png y no .webp? Porque sin `sharp` no hay conversión posible, y
// GitHub Pages sirve el Content-Type según la EXTENSIÓN del fichero: si el
// nombre acaba en .png pero los bytes son de otro formato, el navegador recibe
// un Content-Type que no se corresponde con el contenido. Nos quedamos con .png
// y nos aseguramos de que los BYTES también lo sean (ver `asPng`).
//
// ---------------------------------------------------------------------------
// EL FONDO IMPORTA
// ---------------------------------------------------------------------------
// Estos retratos se pintan ENCIMA del escenario del combate. Si la imagen trae
// fondo opaco (blanco, gris de estudio o una captura de anime entera) se ve como
// una pegatina rectangular y queda fatal. Así que perseguimos PNG con fondo
// transparente, en este orden:
//
//   1. PEDIR EN ORIGEN algo que YA venga recortado. En dragonball.fandom.com los
//      ficheros "artwork" de los juegos (sobre todo la familia
//      "Sparking! Zero - <personaje> artwork.png") son renders a cuerpo entero
//      con alfa, y encima son consistentes entre sí: 29 de los 30 luchadores
//      tienen uno, así que el roster queda visualmente homogéneo.
//   2. VERIFICAR DE VERDAD que hay transparencia. Que el color type declare alfa
//      no basta: media wiki sube capturas guardadas como RGBA con el alfa a 255.
//      Descargamos, decodificamos y miramos si el marco de la imagen está
//      realmente vacío (`looksCutOut`).
//   3. Si no hay nada con alfa, RECORTAR el fondo nosotros con flood fill desde
//      los bordes (`scripts/png-cutout.mjs`, Node puro, sin dependencias).
//   4. Y si el recorte sale sospechoso (se come al personaje, o no encuentra
//      fondo que quitar), dejamos la imagen ORIGINAL y avisamos: mejor un
//      recuadro feo que un recorte con agujeros — y la UI siempre puede caer a
//      la carta de iniciales.
//
// IMPORTANTE:
//  - Si un retrato no se encuentra NO pasa nada: la UI pinta la carta generada
//    con las iniciales del luchador. El juego NUNCA depende de que estas
//    imágenes existan, así que un fallo parcial no es un error: el script avisa,
//    se salta ese personaje y sigue con el resto.
//  - Las imágenes son de Fandom y están sujetas a su licencia (CC-BY-SA para el
//    texto; las imágenes suelen ser material con copyright de Toei/Bird Studio
//    usado bajo uso legítimo). Revísalo antes de publicar el juego.
//  - Para comprobar el resultado: `node scripts/audit-dragon-portraits.mjs`.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodePng, analyze, looksCutOut, cutoutPngBuffer, isPng } from './png-cutout.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public', 'dragon', 'fighters')
const SOURCE = join(ROOT, 'src', 'data', 'dragon', 'fighters.ts')
const API = 'https://dragonball.fandom.com/api.php'
const THUMB_SIZE = 256
// Cuántos ficheros llegamos a descargar por personaje antes de rendirnos y tirar
// del recorte manual. Sin tope, un personaje con 40 imágenes en su artículo nos
// haría martillear la wiki para nada.
const MAX_TRIES = 5

// Fandom rechaza el User-Agent por defecto de Node en algunas rutas.
const UA = 'pokelink-dragon-portraits/2.0 (script de un solo uso; contacto: repo owner)'

/**
 * MAPA id → artículo de la wiki. Hace falta SÍ O SÍ por dos motivos:
 *  1. Los ids del juego son cortos y de andar por casa (`a18`, `soldado`,
 *     `vegeta_saiyan`, `majin_vegeta`, `chaoz`...), no títulos de nada.
 *  2. Los nombres de `fighters.ts` están en español de España ("Krilín",
 *     "Ten Shin Han", "Nº 18", "Freezer") y los artículos de
 *     dragonball.fandom.com están EN INGLÉS. Buscar "Freezer" allí devuelve
 *     electrodomésticos, no al emperador del universo.
 *
 * `title`  es el artículo del personaje: de él sacamos la imagen principal.
 * `render` es el fichero de artwork transparente ELEGIDO A MANO. Es el que
 *          manda, y va primero, porque la búsqueda genérica por "<nombre>
 *          artwork" no sabe distinguir entre "Goku (Z-Mid)" y "Goku (GT)", ni
 *          entre "Perfect Cell" y "Cell Max". La forma/época del personaje es
 *          una decisión de diseño del juego, no algo que deba adivinar un
 *          buscador.
 * `file`   es un override para cuando no hay render y la imagen principal del
 *          artículo tampoco sirve.
 *
 * Y una entrada a `null` significa "ya hemos mirado y NO hay nada decente en la
 * wiki": ni se busca. Es distinto de no tener entrada (que sí busca a ciegas por
 * el nombre en español y suele traer cualquier cosa).
 */
const WIKI = {
  // --- Aliados ---
  // Goku "Z-Mid": el gi naranja de siempre, la época que cubre el rogue.
  goku: { title: 'Goku', render: 'Sparking! Zero - Goku (Z-Mid) artwork.png' },
  krilin: { title: 'Krillin', render: 'Sparking! Zero - Krillin artwork.png' },
  yamcha: { title: 'Yamcha', render: 'Sparking! Zero - Yamcha artwork.png' },
  // OJO: el fichero es "Tien", no "Tien Shinhan" como el artículo.
  ten: { title: 'Tien Shinhan', render: 'Sparking! Zero - Tien artwork.png' },
  chaoz: { title: 'Chiaotzu', render: 'Sparking! Zero - Chiaotzu artwork.png' },
  piccolo: { title: 'Piccolo', render: 'Sparking! Zero - Piccolo artwork.png' },
  // Gohan adolescente: el de la saga de Cell, el más reconocible.
  gohan: { title: 'Gohan', render: 'Sparking! Zero - Gohan (Teen) artwork.png' },
  // Vegeta "Z-End": armadura azul de la saga de Buu, ya como aliado.
  vegeta: { title: 'Vegeta', render: 'Sparking! Zero - Vegeta (Z-End) artwork.png' },
  trunks: { title: 'Future Trunks', render: 'Sparking! Zero - Future Trunks artwork.png' },
  a18: { title: 'Android 18', render: 'Sparking! Zero - Android 18 artwork.png' },
  // Dende es el ÚNICO del roster sin artwork de juego (no es personaje
  // jugable). "Dende BOG" es un render con alfa de Battle of Gods.
  dende: { title: 'Dende', file: 'Dende BOG.png' },
  videl: { title: 'Videl', render: 'Sparking! Zero - Videl artwork.png' },
  yajirobe: { title: 'Yajirobe', render: 'Sparking! Zero - Yajirobe artwork.png' },

  // --- Rivales ---
  // "Saibaman" en singular no es artículo: la wiki los lista en plural.
  saibaman: { title: 'Saibamen', render: 'Sparking! Zero - Saibaman artwork.png' },
  raditz: { title: 'Raditz', render: 'Sparking! Zero - Raditz artwork.png' },
  nappa: { title: 'Nappa', render: 'Sparking! Zero - Nappa artwork.png' },
  // Mismo artículo que `vegeta`, así que forzamos un render distinto:
  // "Z-Scouter" es justo la armadura saiyan con rastreador con la que llega a
  // la Tierra en la saga 1.
  vegeta_saiyan: { title: 'Vegeta', render: 'Sparking! Zero - Vegeta (Z-Scouter) artwork.png' },
  // "Soldado de Freezer" no es un personaje concreto. En la wiki el artículo
  // genérico es Appule (el morado de Namek), pero el render bueno se llama
  // literalmente "Frieza Soldier".
  soldado: { title: 'Appule', render: 'Sparking! Zero - Frieza Soldier artwork.png' },
  cui: { title: 'Cui', render: 'Sparking! Zero - Cui artwork.png' },
  dodoria: { title: 'Dodoria', render: 'Sparking! Zero - Dodoria artwork.png' },
  zarbon: { title: 'Zarbon', render: 'Sparking! Zero - Zarbon artwork.png' },
  ginyu: { title: 'Captain Ginyu', render: 'Sparking! Zero - Captain Ginyu artwork.png' },
  recoome: { title: 'Recoome', render: 'Sparking! Zero - Recoome artwork.png' },
  // Cuarta forma: el Freezer "de verdad", el que pelea en Namek.
  freezer: { title: 'Frieza', render: 'Sparking! Zero - 4th Form Frieza (Z) artwork.png' },
  a19: { title: 'Android 19', render: 'Sparking! Zero - Android 19 artwork.png' },
  // "(Z)" para no traernos al Nº 17 de Super, que va con otra ropa.
  a17: { title: 'Android 17', render: 'Sparking! Zero - Android 17 (Z) artwork.png' },
  // Cell perfecto: el de la saga, no el imperfecto ni el Cell Max de la peli.
  cell: { title: 'Cell', render: 'Sparking! Zero - Perfect Cell artwork.png' },
  dabura: { title: 'Dabura', render: 'Sparking! Zero - Dabura artwork.png' },
  // No hay artículo propio de "Majin Vegeta" (redirige a la sección de Vegeta).
  majin_vegeta: { title: 'Vegeta', render: 'Sparking! Zero - Majin Vegeta artwork.png' },
  // El artículo "Majin Buu" es el de la ESPECIE y su imagen es un montaje con
  // todas las formas. En Sparking! Zero "Majin Buu" a secas ES el Buu gordo,
  // que es el que el doblaje español llama simplemente "Majin Buu".
  buu: { title: 'Innocent Buu', render: 'Sparking! Zero - Majin Buu artwork.png' },

  // --- Arco clásico (Dragon Ball): aliados ---
  // Sparking! Zero no tiene al Goku niño de la primera serie. El que sí tiene es
  // el "Mini" de Daima, que va igual de crío, con la cola fuera y el Báculo
  // Sagrado en la mano: para `goku_nino` vale. Comparte artículo con `goku`, así
  // que lo que lo distingue es el render.
  goku_nino: { title: 'Goku', render: 'Sparking! Zero - Goku (Mini) artwork.png' },
  roshi: { title: 'Master Roshi', render: 'Sparking! Zero - Master Roshi artwork.png' },
  goten: { title: 'Goten', render: 'Sparking! Zero - Goten artwork.png' },
  // OJO: "Trunks" a secas es el NIÑO; el del futuro (nuestro `trunks`) vive en
  // "Future Trunks". Aquí cambian artículo y render a la vez.
  trunks_nino: { title: 'Trunks', render: 'Sparking! Zero - Kid Trunks artwork.png' },
  gotenks: { title: 'Gotenks', render: 'Sparking! Zero - Gotenks artwork.png' },

  // --- Arco clásico (Dragon Ball): rivales ---
  // AVISO PARA EL QUE VENGA DETRÁS: de aquí para abajo casi no hay artwork con
  // alfa. Los villanos de la primera serie no salen en Sparking! Zero ni en
  // ningún juego moderno, así que la wiki solo tiene fotogramas del anime y
  // páginas de manga a color. Por eso van con `file` (un fichero elegido a mano,
  // el que mejor aísla al personaje) en vez de con `render`: el fondo lo quita
  // después el flood fill de `png-cutout.mjs`. Es peor acabado que el resto del
  // roster, pero es lo que hay — y sigue siendo mejor que una pegatina
  // rectangular. Están elegidos por lo despejado del fondo, no por lo épicos que
  // sean: un plano quieto recorta mucho mejor que uno de acción.
  pilaf: { title: 'Emperor Pilaf', file: 'PilafKanzenban.png' },
  // `bandido` no tiene artículo NI personaje: es un enemigo de relleno que el
  // juego se inventa para el arco del desierto. `null` = no lo intentes
  // siquiera; la UI pinta la carta con las iniciales y tan contentos.
  bandido: null,
  // De Giran, Nam y el Sargento Black no hay ni un fotograma que valga: siempre
  // salen metidos en una escena y el flood fill acaba comiéndoles media pierna o
  // dejándoles media pared pegada. De los tres SÍ hay foto de su figura de la
  // línea World Collectable (DWC) sobre fondo liso: eso recorta redondo y el
  // personaje se reconoce a la primera. Es la foto de un muñeco, sí; pero es la
  // única versión limpia que existe.
  giran: { title: 'Giran', file: 'Giran-DWC-full.PNG' },
  nam: { title: 'Nam', file: 'Nam-DWC-full.PNG' },
  // Jackie Chun es Mutenroshi con peluca y gafas, y su artículo REDIRIGE a
  // "Master Roshi": sin `file` nos traeríamos al viejo de siempre y tendríamos
  // dos veces el mismo retrato.
  jackie: { title: 'Master Roshi', file: 'JackieChun (Ep26).png' },
  black_rr: { title: 'Staff Officer Black', file: 'DWC DB040 black august 2009.PNG' },
  // Blue, Tao y Tambourine sí tienen manga a color con el personaje entero y de
  // pie sobre casi nada: se recortan bien.
  blue_rr: { title: 'General Blue', file: 'GeneralBlueColorManga.jpg' },
  tao: { title: 'Mercenary Tao', file: 'Mercenary Tao (Kanzenban Manga).png' },
  tambourine: { title: 'Tambourine', file: 'Tambourine Manga.PNG' },
  // Los dos Piccolos de la primera serie sí tienen recorte de verdad, pero solo
  // en Jumputi Heroes (arte chibi con alfa). Feo mezclarlo con los renders de
  // Sparking! Zero, sí; peor sería un recuadro con el trono de fondo.
  piccolo_daimao: { title: 'King Piccolo', file: 'Jumputi Heroes - King Piccolo.png' },
  // Mismo artículo que `piccolo` (el Jr. de mayor ES Piccolo), así que forzamos
  // fichero. "Ma Junior" es el nombre con el que se apunta al 23º Budokai.
  piccolo_jr: { title: 'Piccolo', file: 'Jumputi Heroes - Ma Junior.png' },
  chappa: { title: 'King Chappa', file: 'King Chappa manga.jpg' },

  // --- Dragon Ball Super: rivales ---
  // Mismo artículo que `freezer`; el render es el que manda.
  freezer_dorado: { title: 'Frieza', render: 'Sparking! Zero - Golden Frieza artwork.png' },
  // Sorbet tampoco es jugable en ningún juego reciente: fotograma y a recortar.
  sorbet: { title: 'Sorbet', file: 'Sorbet main image.png' },
  // "Bills" es el nombre del doblaje español; en la wiki es "Beerus".
  bills: { title: 'Beerus', render: 'Sparking! Zero - Beerus artwork.png' },
  whis: { title: 'Whis', render: 'Sparking! Zero - Whis artwork.png' },
  hit: { title: 'Hit', render: 'Sparking! Zero - Hit artwork.png' },
  cabba: { title: 'Cabba', render: 'Sparking! Zero - Cabba artwork.png' },
  // Kale, Caulifla y Kefla en forma BASE: si cogiéramos las transformadas, Kefla
  // (la fusión) y Kale (Legendaria) saldrían las dos verdes y musculadas y no
  // habría quien las distinguiera en la carta.
  kale: { title: 'Kale', render: 'Sparking! Zero - Kale artwork.png' },
  caulifla: { title: 'Caulifla', render: 'Sparking! Zero - Caulifla artwork.png' },
  kefla: { title: 'Kefla', render: 'Sparking! Zero - Kefla artwork.png' },
  // El Broly del roster está en el bloque de Super, así que el de la peli de
  // 2018 — no el "(Z)" de las películas viejas.
  broly: { title: 'Broly', render: 'Sparking! Zero - Broly (Super) artwork.png' },
  goku_black: { title: 'Goku Black', render: 'Sparking! Zero - Goku Black artwork.png' },
  // Zamasu y Zamasu fusionado son el mismo personaje en dos estados; cada uno
  // con su artículo Y su render para que no se pisen.
  zamasu: { title: 'Zamasu', render: 'Sparking! Zero - Zamasu artwork.png' },
  zamasu_fusion: { title: 'Fused Zamasu', render: 'Sparking! Zero - Fused Zamasu artwork.png' },
  // "Toppo" redirige a "Top" en la wiki inglesa.
  toppo: { title: 'Top', render: 'Sparking! Zero - Toppo artwork.png' },
  dyspo: { title: 'Dyspo', render: 'Sparking! Zero - Dyspo artwork.png' },
  jiren: { title: 'Jiren', render: 'Sparking! Zero - Jiren artwork.png' },
}

const args = process.argv.slice(2)
const force = args.includes('--force')
const noCutout = args.includes('--no-cutout')
const only = new Set(args.filter((a) => !a.startsWith('--')))

/** Saca {id, name} de fighters.ts sin compilar TypeScript. */
async function readRoster() {
  const src = await readFile(SOURCE, 'utf8')
  const out = []
  for (const chunk of src.split(/\n  \},?/)) {
    const m = /id: '([^']+)', name: '([^']+)'/.exec(chunk)
    if (!m) continue
    out.push({ id: m[1], name: m[2] })
  }
  return out
}

async function exists(path) {
  try { await access(path); return true } catch { return false }
}

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

/**
 * OJO CON ESTO: el CDN de Fandom (static.wikia.nocookie.net) sirve WEBP por
 * defecto, aunque la URL acabe en `.png` y aunque no mandes `Accept: image/webp`.
 * Si guardáramos la respuesta tal cual acabaríamos con ficheros `<id>.png` cuyos
 * bytes son un RIFF/WEBP — justo la incoherencia extensión ↔ contenido que
 * queríamos evitar. El parámetro `format=png` fuerza al thumbnailer a devolver
 * PNG de verdad, manteniendo el `scale-to-width-down/256`.
 *
 * (Y de paso: el thumbnailer de Fandom SÍ conserva el canal alfa al reescalar,
 * así que un render transparente sigue siéndolo después de la miniatura.)
 */
function asPng(url) {
  return url + (url.includes('?') ? '&' : '?') + 'format=png'
}

// ---------------------------------------------------------------------------
// Puntuación de candidatos
// ---------------------------------------------------------------------------

// Ficheros que NUNCA son un retrato: logotipos, iconos, cartas de juegos de
// móvil, portadas, páginas de manga, merchandising...
const JUNK = /\b(logo|icon|card|sticker|cover|chapter|scan|poster|banner|calendar|stamp|badge|emblem|wallpaper)\b|manga|deformation|chesspiece|figurine|keshi|kesh\b|collection|deagostini|megahouse|irwin|settei|concept art/i
// Nombres que describen una ESCENA: capturas del anime, seguro con fondo.
const SCENE = /\bvs\.?\b|\bep\.?\s*\d|episode|screenshot|defeat|attack|fight|battl|punch|kick|kills?\b|flashback|arrives|absorb|reaction|trailer/i
// Lo que sí promete recorte limpio.
const RENDER = /\b(artwork|render|art)\b/i

/** ¿El colorType que declara MediaWiki puede llevar transparencia? */
function alphaCapable(colorType) {
  if (!colorType) return false
  return /alpha/i.test(colorType) || /index/i.test(colorType)
}

/**
 * Puntúa un fichero candidato SOLO por sus metadatos (nombre y dimensiones),
 * antes de gastar una descarga en él. Cuanto más alto, antes se prueba.
 */
function scoreCandidate(title, info, wantedName) {
  const name = title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '')
  let score = 0
  if (JUNK.test(name)) score -= 60
  if (SCENE.test(name)) score -= 40
  if (RENDER.test(name)) score += 30
  // El nombre del personaje debe salir en el fichero; si no, casi seguro que es
  // una imagen de grupo o de otro.
  const key = wantedName.toLowerCase().split(/\s+/)[0]
  if (key && name.toLowerCase().includes(key)) score += 20
  else score -= 25
  if (info) {
    const { width, height } = info
    if (width && height) {
      const ratio = width / height
      // Un retrato es vertical o cuadrado; 16:9 es una captura de tele.
      if (ratio > 1.5) score -= 30
      else if (ratio <= 1.05) score += 15
      // Miniaturas diminutas: no dan para 256 px.
      if (Math.max(width, height) < 120) score -= 20
    }
    if (info.mime === 'image/png') score += 10
    else score -= 35 // JPEG no puede tener alfa, ni de broma
    if (alphaCapable(info.colorType)) score += 40
  }
  return score
}

function metaOf(imageinfo) {
  const md = Object.fromEntries((imageinfo?.metadata ?? []).map((m) => [m.name, m.value]))
  return {
    width: imageinfo?.width,
    height: imageinfo?.height,
    mime: imageinfo?.mime,
    colorType: md.colorType,
  }
}

// ---------------------------------------------------------------------------
// Las cuatro fuentes de candidatos
// ---------------------------------------------------------------------------

/** Resuelve un `File:...` concreto a su miniatura de 256 px. */
async function fileThumb(file) {
  // `iiurlheight` además de `iiurlwidth`: sin él, un retrato muy vertical sale a
  // 256 de ancho pero 470 de alto y pesa el triple que los demás.
  const json = await api({
    action: 'query', prop: 'imageinfo', iiprop: 'url',
    iiurlwidth: String(THUMB_SIZE), iiurlheight: String(THUMB_SIZE),
    titles: `File:${file.replace(/^File:/, '')}`,
  })
  for (const [key, page] of Object.entries(json?.query?.pages ?? {})) {
    if (key === '-1') continue
    const info = page?.imageinfo?.[0]
    if (info) return info.thumburl || info.url || null
  }
  return null
}

/** Imagen principal de un artículo por título exacto. */
async function titleThumb(title) {
  const json = await api({
    action: 'query', prop: 'pageimages', piprop: 'thumbnail',
    pithumbsize: String(THUMB_SIZE), titles: title,
  })
  for (const [key, page] of Object.entries(json?.query?.pages ?? {})) {
    if (key === '-1') continue
    const src = page?.thumbnail?.source
    if (src) return src
  }
  return null
}

/**
 * Busca en el espacio de nombres File (namespace 6) ficheros de artwork/render
 * del personaje. Es la vía que nos da los recortes limpios: en esta wiki los
 * renders de los juegos se llaman "<Juego> - <Personaje> artwork.png".
 */
async function searchRenders(name) {
  const found = new Map()
  for (const q of [`${name} artwork`, `${name} render`]) {
    try {
      const json = await api({ action: 'query', list: 'search', srsearch: q, srnamespace: '6', srlimit: '12' })
      for (const hit of json?.query?.search ?? []) found.set(hit.title, true)
    } catch { /* seguimos con la otra consulta */ }
  }
  return [...found.keys()]
}

/** Todas las imágenes de un artículo, con sus metadatos, en UNA sola petición. */
async function pageImages(title) {
  try {
    const json = await api({
      action: 'query', generator: 'images', titles: title, gimlimit: '200', redirects: '1',
      prop: 'imageinfo', iiprop: 'url|size|mime|metadata',
    })
    return Object.values(json?.query?.pages ?? {})
      .filter((p) => p?.imageinfo?.[0])
      .map((p) => ({ title: p.title, info: metaOf(p.imageinfo[0]) }))
  } catch { return [] }
}

/** Metadatos de una lista de ficheros (hasta 50 por petición). */
async function filesMeta(titles) {
  const out = new Map()
  for (let i = 0; i < titles.length; i += 40) {
    try {
      const json = await api({
        action: 'query', titles: titles.slice(i, i + 40).join('|'),
        prop: 'imageinfo', iiprop: 'url|size|mime|metadata',
      })
      for (const page of Object.values(json?.query?.pages ?? {})) {
        if (page?.imageinfo?.[0]) out.set(page.title, metaOf(page.imageinfo[0]))
      }
    } catch { /* lo que no venga, se queda sin metadatos y puntúa peor */ }
  }
  return out
}

/**
 * Construye la lista ORDENADA de candidatos (títulos `File:...`, más alguna URL
 * suelta de `pageimages`). De más fiable a más desesperado:
 *   1. El render elegido a mano.
 *   2. El override `file` de toda la vida.
 *   3. Artwork/render encontrado buscando en el namespace File, puntuado.
 *   4. Las imágenes del propio artículo que declaren alfa, puntuadas.
 *   5. La imagen principal del artículo (casi siempre una captura: último recurso).
 */
async function findCandidates(entry, fallbackName) {
  const title = entry?.title ?? fallbackName
  const out = []
  const seen = new Set()
  const push = (c) => { const k = c.file ?? c.url; if (k && !seen.has(k)) { seen.add(k); out.push(c) } }

  if (entry?.render) push({ file: entry.render, why: 'render elegido a mano' })
  if (entry?.file) push({ file: entry.file, why: 'fichero elegido a mano' })

  const searched = await searchRenders(title)
  if (searched.length) {
    const meta = await filesMeta(searched)
    searched
      .map((t) => ({ file: t, info: meta.get(t), score: scoreCandidate(t, meta.get(t), title) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .forEach((c) => push({ file: c.file, why: `búsqueda artwork (${c.score})` }))
  }

  const imgs = await pageImages(title)
  imgs
    .filter((c) => alphaCapable(c.info.colorType))
    .map((c) => ({ ...c, score: scoreCandidate(c.title, c.info, title) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .forEach((c) => push({ file: c.title, why: `imagen del artículo (${c.score})` }))

  try {
    const url = await titleThumb(title)
    if (url) push({ url, why: 'imagen principal del artículo' })
  } catch { /* seguimos */ }

  // Último cartucho: búsqueda abierta de artículo. Solo si no tenemos NADA.
  if (!out.length) {
    try {
      const search = await api({ action: 'query', list: 'search', srsearch: title, srlimit: '1' })
      const hit = search?.query?.search?.[0]?.title
      if (hit) {
        const url = await titleThumb(hit)
        if (url) push({ url, why: `búsqueda abierta → ${hit}` })
      }
    } catch { /* nos rendimos */ }
  }

  return out
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Descarga un candidato como PNG de 256 px y lo devuelve decodificado.
 *
 * REINTENTA a propósito: el CDN de Fandom falla de vez en cuando con un 5xx
 * suelto, y sin reintento ese tropiezo hace que el script se salte el render
 * bueno y se conforme con el siguiente candidato — que puede ser un Krilín de
 * policía en vez del de siempre. Un fallo de red NO debe cambiar el resultado.
 */
async function download(candidate, tries = 3) {
  const url = candidate.url ?? await fileThumb(candidate.file)
  if (!url) return null
  let last = null
  for (let i = 0; i < tries; i++) {
    if (i) await sleep(500 * i)
    try {
      const res = await fetch(asPng(url), { headers: { 'User-Agent': UA } })
      if (!res.ok) throw new Error(`${res.status}`)
      const bytes = Buffer.from(await res.arrayBuffer())
      // Comprobación de la firma PNG (\x89PNG). Si la wiki nos cuela otra cosa
      // preferimos saltarlo antes que dejar un .png que no es un .png.
      if (!isPng(bytes)) throw new Error('la respuesta no es un PNG')
      return { bytes, image: decodePng(bytes) }
    } catch (err) { last = err }
  }
  throw last ?? new Error('descarga fallida')
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const roster = await readRoster()
  const targets = only.size ? roster.filter((f) => only.has(f.id)) : roster
  if (!targets.length) {
    console.error('No hay luchadores que descargar. ¿Ids correctos?')
    process.exit(1)
  }

  let ok = 0
  let skipped = 0
  const missing = []
  const carved = []   // los que hemos tenido que recortar a mano
  const doubtful = [] // los que se han quedado con fondo

  for (const { id, name } of targets) {
    const dest = join(OUT_DIR, `${id}.png`)
    if (!force && await exists(dest)) { skipped++; continue }
    const entry = WIKI[id]
    if (entry === null) {
      // Descartado a mano: no hay imagen que valga y buscar solo trae basura.
      missing.push(`${name} (${id})`)
      console.log(`  – ${name} — sin retrato a propósito (no hay nada en la wiki)`)
      continue
    }
    if (!entry) console.log(`  ! ${id} — sin entrada en WIKI, probamos con "${name}" a pelo`)

    try {
      const candidates = await findCandidates(entry, name)
      if (!candidates.length) {
        missing.push(`${name} (${id})`)
        console.log(`  ✗ ${name} — sin imagen en la wiki`)
        continue
      }

      let chosen = null   // el que ya viene recortado: se guarda tal cual
      let fallback = null // el mejor que hemos podido bajar, con fondo y todo

      for (const cand of candidates.slice(0, MAX_TRIES)) {
        let got = null
        try {
          got = await download(cand)
        } catch (err) {
          // Que se caiga un candidato elegido A MANO no puede pasar en silencio:
          // significa que nos vamos a quedar con una imagen peor.
          if (cand.why.includes('mano')) console.log(`  ! ${name} — no se pudo bajar "${cand.file}": ${err.message}`)
        }
        await sleep(250)
        if (!got) continue
        if (!fallback) fallback = { ...got, cand }
        if (looksCutOut(got.image)) { chosen = { ...got, cand }; break }
        // Un candidato ELEGIDO A MANO manda aunque venga con fondo opaco. Sin
        // esto la búsqueda a ciegas se cuela por detrás: basta con que a algún
        // fichero suyo le vea alfa para que gane, y así es como "Jackie Chun"
        // acaba siendo el artwork de Mutenroshi (mismo artículo) y Tao Pai Pai y
        // General Blue acaban compartiendo retrato. Si hemos dicho qué fichero
        // es, ese es; para el fondo ya está el recorte de más abajo.
        if (cand.why.includes('mano')) break
      }

      if (chosen) {
        await writeFile(dest, chosen.bytes)
        ok++
        const a = analyze(chosen.image)
        console.log(`  ✓ ${name} → ${id}.png  alfa de origen · ${a.width}x${a.height} · ${(chosen.bytes.length / 1024).toFixed(1)} kB  [${chosen.cand.why}]`)
        continue
      }

      if (!fallback) {
        missing.push(`${name} (${id})`)
        console.log(`  ✗ ${name} — ningún candidato se pudo descargar`)
        continue
      }

      if (noCutout) {
        await writeFile(dest, fallback.bytes)
        ok++
        doubtful.push(`${name} (${id}) — con fondo, --no-cutout`)
        console.log(`  ~ ${name} → ${id}.png  con fondo (--no-cutout)`)
        continue
      }

      // Nadie con alfa: toca recortar el fondo nosotros.
      const cut = cutoutPngBuffer(fallback.bytes)
      if (cut.buffer) {
        await writeFile(dest, cut.buffer)
        ok++
        carved.push(`${name} (${id})`)
        const s = cut.stats
        console.log(`  ✂ ${name} → ${id}.png  recortado · ${s.width}x${s.height} · ${(s.transparentRatio * 100).toFixed(0)}% transparente · ${(cut.buffer.length / 1024).toFixed(1)} kB`)
      } else {
        // El recorte no ha salido: dejamos el original antes que un destrozo.
        await writeFile(dest, fallback.bytes)
        ok++
        doubtful.push(`${name} (${id}) — ${cut.reason}`)
        console.log(`  ~ ${name} → ${id}.png  SIN recortar (${cut.reason})`)
      }
    } catch (err) {
      // Un fallo aquí NO aborta la pasada: se anota y a por el siguiente.
      missing.push(`${name} (${id})`)
      console.log(`  ✗ ${name} — ${err.message}`)
    }
    // Cortesía con la wiki: no la martilleamos.
    await sleep(350)
  }

  console.log(`\n${ok} descargados · ${skipped} ya estaban · ${missing.length} sin encontrar`)
  if (carved.length) {
    console.log(`Recortados a mano (no había artwork con alfa): ${carved.join(', ')}`)
  }
  if (doubtful.length) {
    console.log('DUDOSOS — se han quedado con fondo, revísalos:')
    for (const d of doubtful) console.log(`  ~ ${d}`)
  }
  if (missing.length) {
    console.log('Sin retrato (la UI usará la carta con iniciales):')
    console.log('  ' + missing.join(', '))
  }
  console.log('\nComprueba el resultado con: node scripts/audit-dragon-portraits.mjs')
}

main().catch((err) => { console.error(err); process.exit(1) })
