// Descarga los retratos de los luchadores de Dragon Ball Rogue desde la wiki de
// Fandom (dragonball.fandom.com).
//
//   node scripts/fetch-dragon-portraits.mjs            (solo los que faltan)
//   node scripts/fetch-dragon-portraits.mjs --force    (vuelve a bajarlo todo)
//   node scripts/fetch-dragon-portraits.mjs goku vegeta
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
// IMPORTANTE:
//  - Si un retrato no se encuentra NO pasa nada: la UI pinta la carta generada
//    con las iniciales del luchador. El juego NUNCA depende de que estas
//    imágenes existan, así que un fallo parcial no es un error: el script avisa,
//    se salta ese personaje y sigue con el resto.
//  - Las imágenes son de Fandom y están sujetas a su licencia (CC-BY-SA para el
//    texto; las imágenes suelen ser material con copyright de Toei/Bird Studio
//    usado bajo uso legítimo). Revísalo antes de publicar el juego.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public', 'dragon', 'fighters')
const SOURCE = join(ROOT, 'src', 'data', 'dragon', 'fighters.ts')
const API = 'https://dragonball.fandom.com/api.php'
const THUMB_SIZE = 256

// Fandom rechaza el User-Agent por defecto de Node en algunas rutas.
const UA = 'pokelink-dragon-portraits/1.0 (script de un solo uso; contacto: repo owner)'

/**
 * MAPA id → artículo de la wiki. Hace falta SÍ O SÍ por dos motivos:
 *  1. Los ids del juego son cortos y de andar por casa (`a18`, `soldado`,
 *     `vegeta_saiyan`, `majin_vegeta`, `chaoz`...), no títulos de nada.
 *  2. Los nombres de `fighters.ts` están en español de España ("Krilín",
 *     "Ten Shin Han", "Nº 18", "Freezer") y los artículos de
 *     dragonball.fandom.com están EN INGLÉS. Buscar "Freezer" allí devuelve
 *     electrodomésticos, no al emperador del universo.
 *
 * `title` es el artículo del personaje: de él sacamos la imagen principal.
 * `file` es un override para los casos en los que el artículo no tiene imagen
 * principal utilizable, o en los que dos ids distintos apuntarían al mismo
 * artículo y queremos que se distingan (Vegeta príncipe vs Vegeta Majin).
 */
const WIKI = {
  // --- Aliados ---
  goku: { title: 'Goku' },
  krilin: { title: 'Krillin' },
  yamcha: { title: 'Yamcha' },
  ten: { title: 'Tien Shinhan' },
  chaoz: { title: 'Chiaotzu' },
  piccolo: { title: 'Piccolo' },
  gohan: { title: 'Gohan' },
  vegeta: { title: 'Vegeta' },
  trunks: { title: 'Future Trunks' },
  a18: { title: 'Android 18' },
  dende: { title: 'Dende' },
  videl: { title: 'Videl' },
  yajirobe: { title: 'Yajirobe' },

  // --- Rivales ---
  // "Saibaman" en singular no es artículo: la wiki los lista en plural.
  saibaman: { title: 'Saibamen' },
  raditz: { title: 'Raditz' },
  nappa: { title: 'Nappa' },
  // Mismo artículo que `vegeta`, así que forzamos una imagen distinta: la de la
  // armadura saiyan original, que es como llega a la Tierra en la saga 1.
  vegeta_saiyan: { title: 'Vegeta', file: 'Vegeta Original Armor.png' },
  // "Soldado de Freezer" no es un personaje concreto. Appule es EL soldado
  // genérico de las tropas de Freezer, el morado que sale en toda Namek.
  soldado: { title: 'Appule' },
  cui: { title: 'Cui' },
  dodoria: { title: 'Dodoria' },
  zarbon: { title: 'Zarbon' },
  ginyu: { title: 'Captain Ginyu' },
  recoome: { title: 'Recoome' },
  freezer: { title: 'Frieza' },
  a19: { title: 'Android 19' },
  a17: { title: 'Android 17' },
  cell: { title: 'Cell' },
  dabura: { title: 'Dabura' },
  // No hay artículo propio de "Majin Vegeta" (redirige a la sección de Vegeta),
  // así que vamos directos al fichero.
  majin_vegeta: { title: 'Vegeta', file: 'MajinVegeta.png' },
  // El artículo "Majin Buu" es el de la ESPECIE y su imagen es un montaje con
  // todas las formas. Innocent Buu es el Buu gordo, el que el doblaje español
  // llama simplemente "Majin Buu".
  buu: { title: 'Innocent Buu' },
}

const args = process.argv.slice(2)
const force = args.includes('--force')
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

function firstThumb(json) {
  const pages = json?.query?.pages ?? {}
  for (const key of Object.keys(pages)) {
    if (key === '-1') continue
    const src = pages[key]?.thumbnail?.source
    if (src) return src
  }
  return null
}

function firstImageInfo(json) {
  const pages = json?.query?.pages ?? {}
  for (const key of Object.keys(pages)) {
    if (key === '-1') continue
    const info = pages[key]?.imageinfo?.[0]
    if (info) return info.thumburl || info.url || null
  }
  return null
}

/**
 * OJO CON ESTO: el CDN de Fandom (static.wikia.nocookie.net) sirve WEBP por
 * defecto, aunque la URL acabe en `.png` y aunque no mandes `Accept: image/webp`.
 * Si guardáramos la respuesta tal cual acabaríamos con ficheros `<id>.png` cuyos
 * bytes son un RIFF/WEBP — justo la incoherencia extensión ↔ contenido que
 * queríamos evitar. El parámetro `format=png` fuerza al thumbnailer a devolver
 * PNG de verdad, manteniendo el `scale-to-width-down/256`.
 */
function asPng(url) {
  return url + (url.includes('?') ? '&' : '?') + 'format=png'
}

/** Resuelve un `File:...` concreto a su miniatura de 256 px. */
async function fileThumb(file) {
  // `iiurlheight` además de `iiurlwidth`: sin él, un retrato muy vertical sale a
  // 256 de ancho pero 470 de alto y pesa el triple que los demás.
  const json = await api({
    action: 'query', prop: 'imageinfo', iiprop: 'url',
    iiurlwidth: String(THUMB_SIZE), iiurlheight: String(THUMB_SIZE),
    titles: `File:${file}`,
  })
  return firstImageInfo(json)
}

/** Imagen principal de un artículo por título exacto. */
async function titleThumb(title) {
  const json = await api({
    action: 'query', prop: 'pageimages', piprop: 'thumbnail',
    pithumbsize: String(THUMB_SIZE), titles: title,
  })
  return firstThumb(json)
}

/**
 * Encuentra la URL del retrato en tres intentos, de más fiable a más
 * desesperado. Cada tier va en su propio try/catch: que un intento reviente no
 * puede impedir que se pruebe el siguiente.
 */
async function findPortrait(entry, fallbackName) {
  // 1. Fichero elegido a mano en WIKI: manda sobre todo lo demás.
  if (entry?.file) {
    try {
      const url = await fileThumb(entry.file)
      if (url) return url
    } catch { /* seguimos probando */ }
  }
  // 2. Imagen principal del artículo por título exacto.
  const title = entry?.title ?? fallbackName
  try {
    const url = await titleThumb(title)
    if (url) return url
  } catch { /* seguimos probando */ }
  // 3. Búsqueda abierta: cogemos el primer artículo que salga y le pedimos su
  //    imagen principal.
  try {
    const search = await api({ action: 'query', list: 'search', srsearch: title, srlimit: '1' })
    const hit = search?.query?.search?.[0]?.title
    if (hit) {
      const url = await titleThumb(hit)
      if (url) return url
    }
  } catch { /* seguimos probando */ }
  // 4. Último cartucho: búsqueda en el espacio de nombres File (namespace 6).
  //    Muchos secundarios no tienen artículo pero sí ficheros subidos.
  try {
    const search = await api({ action: 'query', list: 'search', srsearch: title, srnamespace: '6', srlimit: '1' })
    const hit = search?.query?.search?.[0]?.title
    if (hit) return await fileThumb(hit.replace(/^File:/, ''))
  } catch { /* nos rendimos */ }
  return null
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

  for (const { id, name } of targets) {
    const dest = join(OUT_DIR, `${id}.png`)
    if (!force && await exists(dest)) { skipped++; continue }
    const entry = WIKI[id]
    if (!entry) console.log(`  ! ${id} — sin entrada en WIKI, probamos con "${name}" a pelo`)
    try {
      const url = await findPortrait(entry, name)
      if (!url) {
        missing.push(`${name} (${id})`)
        console.log(`  ✗ ${name} — sin imagen en la wiki`)
        continue
      }
      const res = await fetch(asPng(url), { headers: { 'User-Agent': UA } })
      if (!res.ok) throw new Error(`${res.status}`)
      const bytes = Buffer.from(await res.arrayBuffer())
      // Comprobación barata de la firma PNG (\x89PNG). Si la wiki nos cuela otra
      // cosa preferimos saltarlo antes que dejar un .png que no es un .png.
      if (bytes.length < 8 || bytes[0] !== 0x89 || bytes[1] !== 0x50) {
        throw new Error('la respuesta no es un PNG')
      }
      await writeFile(dest, bytes)
      ok++
      console.log(`  ✓ ${name} → ${id}.png (${(bytes.length / 1024).toFixed(1)} kB)`)
    } catch (err) {
      // Un fallo aquí NO aborta la pasada: se anota y a por el siguiente.
      missing.push(`${name} (${id})`)
      console.log(`  ✗ ${name} — ${err.message}`)
    }
    // Cortesía con la wiki: no la martilleamos.
    await new Promise((r) => setTimeout(r, 350))
  }

  console.log(`\n${ok} descargados · ${skipped} ya estaban · ${missing.length} sin encontrar`)
  if (missing.length) {
    console.log('Sin retrato (la UI usará la carta con iniciales):')
    console.log('  ' + missing.join(', '))
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
