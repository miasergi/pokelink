// Descarga los retratos de los luchadores TRANSFORMADOS de Dragon Ball Rogue.
//
//   node scripts/fetch-dragon-forms.mjs                 (solo los que faltan)
//   node scripts/fetch-dragon-forms.mjs --force         (vuelve a bajarlo todo)
//   node scripts/fetch-dragon-forms.mjs goku            (todas las formas de Goku)
//   node scripts/fetch-dragon-forms.mjs goku__ssj3      (solo esa)
//   node scripts/fetch-dragon-forms.mjs --lista         (qué combinaciones existen)
//   node scripts/fetch-dragon-forms.mjs --buscar goku__ssj4   (candidatos en la wiki)
//
// Guarda en `public/dragon/forms/<baseId>__<formId>.png`, que es EXACTAMENTE lo
// que pide `formPortraitUrl` en `src/ui/dragon/Bits.tsx`. Si el fichero no
// existe, el `onError` del Avatar cae al retrato normal
// (`public/dragon/fighters/<baseId>.png`) y de ahí a la carta con iniciales: por
// eso NO pasa nada por dejar combinaciones sin cubrir.
//
// Es el hermano pequeño de `fetch-dragon-portraits.mjs` y comparte con él todo
// lo que importa: la miniatura de 256 px pedida a la propia API, el `format=png`
// del CDN, la validación de alfa REAL (`looksCutOut`) y el recorte por flood
// fill de `png-cutout.mjs`. Lo único distinto es de dónde sale la lista y cuál
// es la barra de calidad.
//
// ---------------------------------------------------------------------------
// LA REGLA DE ORO: MEJOR NADA QUE UN RETRATO EQUIVOCADO
// ---------------------------------------------------------------------------
// El retrato normal SIEMPRE existe y SIEMPRE es del personaje correcto. Así que
// un retrato de forma solo merece la pena si es (a) del personaje correcto,
// (b) de esa forma concreta y (c) con fondo transparente de verdad. Si falla
// cualquiera de las tres, NO se escribe el fichero: la caída al retrato normal
// es un resultado perfectamente digno, y un Goku rosa donde debería ir un Goku
// Black o un Broly donde debería ir Kale sí sería un error de verdad.
//
// Por eso, y a diferencia del script de retratos base, aquí NO se guarda nunca
// una imagen con fondo opaco: si el recorte no sale, se descarta y punto.
//
// Y por eso también el mapa `FORMS` de más abajo está escrito A MANO fichero a
// fichero. La búsqueda a ciegas es justo lo que confunde a Goku SSJ con Goku
// Black SSJ Rosé, a Vegeta SSJ con Trunks SSJ o a Kale con Broly: todos son
// «un saiyan rubio/verde en pose de artwork» para un buscador de texto. El modo
// `--buscar` está para AYUDAR a elegir a mano, no para elegir solo.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodePng, analyze, looksCutOut, cutoutPngBuffer, isPng } from './png-cutout.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public', 'dragon', 'forms')
const FIGHTERS_TS = join(ROOT, 'src', 'data', 'dragon', 'fighters.ts')
const SAGAS_TS = join(ROOT, 'src', 'data', 'dragon', 'sagas.ts')
const FORMS_TS = join(ROOT, 'src', 'data', 'dragon', 'transformations.ts')
const API = 'https://dragonball.fandom.com/api.php'
const THUMB_SIZE = 256
const MAX_TRIES = 4

const UA = 'pokelink-dragon-forms/1.0 (script de un solo uso; contacto: repo owner)'

// ---------------------------------------------------------------------------
// EL MAPA
// ---------------------------------------------------------------------------
/**
 * `<baseId>__<formId>` → de dónde sale la imagen.
 *
 *   { render }      fichero de artwork con alfa elegido A MANO. Es lo normal.
 *   { render, alt } `alt` es la lista de repuestos si el principal se cae.
 *   { skip }        descartado A PROPÓSITO, con el motivo. Ni se busca.
 *
 * Casi todo sale de la familia "Sparking! Zero - <lo que sea> artwork.png": son
 * renders a cuerpo entero con transparencia de verdad y, sobre todo, son
 * CONSISTENTES con los retratos base, que salen de esa misma familia. Un Goku
 * SSJ de Sparking! Zero al lado de un Goku base de Sparking! Zero se ve como la
 * misma persona transformada; mezclado con un render de FighterZ, no.
 *
 * OJO con la ÉPOCA del personaje: el retrato base de Goku es "(Z-Mid)" y el de
 * Vegeta "(Z-End)", así que sus formas se eligen para casar con eso siempre que
 * el juego tenga la variante. Cuando no la tiene (no existe "SSJ2 Goku
 * (Z-Mid)"), se coge la época más cercana que sí exista y se anota aquí.
 */
const FORMS = {
  // ======================================================== GOKU ==========
  // Retrato base: "Goku (Z-Mid)" (gi naranja de la saga de Freezer/Cell).
  // Kaio-Ken NO tiene render en ningún juego moderno: es un aura roja sobre el
  // Goku de siempre, así que ni Sparking! Zero ni FighterZ le hacen artwork
  // propio. Lo único que hay son fotogramas del anime a media pelea.
  goku__kaioken: { skip: 'no existe artwork de Kaio-Ken: es solo un aura sobre el Goku normal' },
  goku__kaioken3: { skip: 'ídem Kaio-Ken: sin artwork propio en ningún juego' },
  goku__ssj: { render: 'Sparking! Zero - SSJ Goku (Z-Mid) artwork.png' },
  // No hay SSJ2/SSJ3 de la época "Z-Mid": el juego solo los saca en "Z-End"
  // (saga de Buu). Mismo gi naranja, mismo personaje; el pelo es lo que cambia.
  goku__ssj2: { render: 'Sparking! Zero - SSJ2 Goku (Z-End) artwork.png' },
  goku__ssj3: { render: 'Sparking! Zero - SSJ3 Goku (Z-End) artwork.png' },
  // Las divinas solo existen en la época "(Super)", con el gi azul. Es un
  // cambio de vestuario, sí, pero es el canon: el Dios Superguerrero no aparece
  // hasta Super. (Estas tres no están todavía en `forms` de `fighters.ts`; ver
  // el bloque EXTRA de más abajo.)
  goku__ssjgod: { render: 'Sparking! Zero - SSJ God Goku (Super) artwork.png' },
  goku__ssjblue: { render: 'Sparking! Zero - SSJ Blue Goku (Super) artwork.png' },
  goku__ultra: {
    render: 'Sparking! Zero - Ultra Instinct Goku (Super) artwork.png',
    // El "-Sign-" es el Instinto incompleto (pelo gris a medias). Vale de
    // repuesto, pero el bueno es el completo, de pelo plateado.
    alt: ['Sparking! Zero - Ultra Instinct -Sign- Goku (Super) artwork.png'],
  },

  // ======================================================== VEGETA ========
  // Retrato base: "Vegeta (Z-End)" (armadura azul de la saga de Buu).
  vegeta__ssj: { render: 'Sparking! Zero - SSJ Vegeta (Z-End) artwork.png' },
  vegeta__ssj2: { render: 'Sparking! Zero - SSJ2 Vegeta (Z-End) artwork.png' },
  // El Majin Vegeta del juego ES el de la M en la frente, y encima está en SSJ2.
  // Sale el MISMO fichero que el retrato base del rival `majin_vegeta`, y está
  // bien que así sea: cuando el Vegeta aliado se deja poseer, se convierte
  // literalmente en ese personaje.
  vegeta__majin: { render: 'Sparking! Zero - Majin Vegeta artwork.png' },
  // El único Ozaru con render decente de toda la wiki. Y da la casualidad de
  // que es justo el que hace falta dos veces (aquí y en `vegeta_saiyan`).
  vegeta__ozaru: { render: 'Sparking! Zero - Great Ape Vegeta artwork.png' },

  // ======================================================== GOHAN =========
  // Retrato base: "Gohan (Teen)" (el de la saga de Cell).
  gohan__ssj: { render: 'Sparking! Zero - SSJ Gohan (Teen) artwork.png' },
  gohan__ssj2: { render: 'Sparking! Zero - SSJ2 Gohan (Teen) artwork.png' },
  // El Ozaru de Gohan (el que aplasta a Vegeta en la luna artificial) no tiene
  // render: en la wiki solo hay viñetas de manga en blanco y negro y cartas de
  // Dokkan con el fondo estampado. Y usar el Ozaru de VEGETA sería colar a otro
  // personaje, que es justo lo que no queremos.
  gohan__ozaru: { skip: 'sin render de Great Ape Gohan (solo manga en B/N y cartas de Dokkan con fondo)' },

  // ======================================================== TRUNKS ========
  // Retrato base: "Future Trunks" (chaqueta y espada).
  trunks__ssj: { render: 'Sparking! Zero - SSJ Future Trunks artwork.png' },
  // "Super Trunks" es el Trunks hinchado de tercer grado de la Sala del
  // Tiempo — el escalón POR ENCIMA del Superguerrero normal en su historia, y
  // el único que Sparking! Zero le da (no existe "SSJ2 Future Trunks"). Para el
  // hueco de `ssj2` es lo más honesto que hay, y se distingue de un vistazo del
  // SSJ de arriba. CUIDADO: no confundirlo con "SSJ Vegeta", que también va de
  // armadura azul; este es rubio de punta, sin barba y con la cara de Trunks.
  trunks__ssj2: { render: 'Sparking! Zero - Super Trunks artwork.png' },

  // ================================================ NIÑOS Y FUSIÓN ========
  goten__ssj: { render: 'Sparking! Zero - SSJ Goten artwork.png' },
  // OJO: "SSJ Kid Trunks", no "SSJ Future Trunks". El del futuro es `trunks`.
  trunks_nino__ssj: { render: 'Sparking! Zero - SSJ Kid Trunks artwork.png' },
  // "Super Gotenks" es como el juego llama al Gotenks Superguerrero (rubio de
  // punta y chaleco). No confundir con `goten__ssj`: Gotenks lleva el chaleco
  // negro y azul de la fusión, Goten va con gi naranja.
  gotenks__ssj: { render: 'Sparking! Zero - Super Gotenks artwork.png' },
  gotenks__ssj2: { skip: 'no hay artwork de Gotenks SSJ2: el juego salta del Superguerrero al SSJ3' },
  gotenks__ssj3: { render: 'Sparking! Zero - SSJ3 Gotenks artwork.png' },

  // ======================================================== PICCOLO =======
  piccolo__fusionkami: { render: 'Sparking! Zero - Piccolo (Fused with Kami) artwork.png' },
  // Namekiano gigante: el ÚNICO render limpio que existe es el de Lord Slug, que
  // es otro personaje, y el "Giant Orange Piccolo" de la peli Super Hero, que va
  // de naranja y no se parece nada al Piccolo verde del juego.
  piccolo__gigante: { skip: 'sin render de Piccolo gigante (el único limpio es naranja, de Super Hero)' },
  piccolo_daimao__gigante: { skip: 'ídem: no hay render del Rey Demonio en forma gigante' },
  piccolo_jr__gigante: { skip: 'ídem: solo cartas de Dokkan con el fondo estampado' },

  // ================================================== SOBRECARGA ==========
  // Mutenroshi hinchado ("Max Power") es la sobrecarga por excelencia y tiene
  // render propio. Es la única de las cuatro que se salva.
  roshi__sobrecarga: { render: 'Sparking! Zero - Max Power Master Roshi artwork.png' },
  // Zarbon monstruo: el clásico. Cambia tanto que se merece retrato aparte.
  zarbon__sobrecarga: { render: 'Sparking! Zero - Monster Zarbon artwork.png' },
  // Ten Shin Han y Nº 18 no tienen ninguna forma «sobrecargada» en el canon: la
  // transformación se la inventa el juego, así que no hay imagen que buscar.
  ten__sobrecarga: { skip: 'Ten Shin Han no tiene forma sobrecargada en el canon: no hay imagen' },
  a18__sobrecarga: { skip: 'la Nº 18 no tiene forma sobrecargada en el canon: no hay imagen' },

  // ================================================== SAIYANS DE SUPER ====
  cabba__ssj: { render: 'Sparking! Zero - SSJ Cabba artwork.png' },
  cabba__ssj2: { render: 'Sparking! Zero - SSJ2 Cabba artwork.png' },
  // De Caulifla el juego solo saca el SSJ2 (el SSJ suyo no tiene artwork).
  caulifla__ssj: { skip: 'sin artwork de Caulifla en Superguerrero simple (solo el SSJ2)' },
  caulifla__ssj2: { render: 'Sparking! Zero - SSJ2 Caulifla artwork.png' },
  // CUIDADO KALE vs BROLY: los dos son «saiyan legendario verde y musculado».
  // Kale es ELLA, va de camiseta roja y mallas negras; Broly va con la piel
  // desnuda y el pantalón saiyan. El fichero de Kale lleva su nombre, así que
  // basta con no cambiarlo por el de Broly «porque se parecen».
  kale__rabia: { render: 'Sparking! Zero - LSSJ Kale artwork.png' },
  // La Kefla transformada del juego es la SSJ2, de pelo verde y con chispas.
  kefla__rabia: { render: 'Sparking! Zero - SSJ2 Kefla artwork.png' },
  // Broly, el de la peli de 2018 (igual que su retrato base, "(Super)"). El
  // "LSSJ" es el Legendario verde: exactamente la «Ira Legendaria» del juego.
  broly__ssj: { render: 'Sparking! Zero - SSJ Broly (Super) artwork.png' },
  broly__rabia: { render: 'Sparking! Zero - LSSJ Broly (Super) artwork.png' },
  // GOKU BLACK: el SSJ Rosé, de pelo ROSA. No es el Goku SSJ de arriba ni de
  // lejos — mismo cuerpo, pelo rosa y ropa de kaioshin gris y negra.
  goku_black__ssj: { render: 'Sparking! Zero - SSJ Rosé Goku Black artwork.png' },
  goku_black__rabia: { skip: 'la Ira Legendaria no es una forma de Goku Black: no hay imagen que le pegue' },

  // ================================================== DIOSES ==============
  // Zamasu inmortal se ve EXACTAMENTE igual que Zamasu: la inmortalidad no le
  // cambia el aspecto. Un retrato aparte sería el mismo dibujo pesando otra vez.
  zamasu__inmortal: { skip: 'el Zamasu inmortal se ve igual que el normal: el retrato base ya vale' },
  zamasu_fusion__inmortal: { skip: 'ídem: la inmortalidad no le cambia el aspecto' },
  // El «medio corrompido» sí cambia: media cara morada y el brazo deforme.
  zamasu_fusion__divino: { render: 'Sparking! Zero - Half-Corrupted Fused Zamasu artwork.png' },
  // OJO: este fichero NO lleva "artwork" en el nombre, es "God of Destruction
  // Toppo.png" a secas. Por eso no aparece si buscas "<nombre> artwork".
  toppo__divino: { render: 'Sparking! Zero - God of Destruction Toppo.png' },
  jiren__fuerzatotal: { render: 'Sparking! Zero - Full Power Jiren artwork.png' },
  // Bills y Whis ya SON dioses: no tienen «forma divina» aparte, y el juego les
  // pone `divino` como fase de jefe para subirles los números, no el aspecto.
  bills__divino: { skip: 'Bills no tiene forma divina aparte: ya es el Dios de la Destrucción' },
  whis__divino: { skip: 'Whis no tiene forma divina aparte: ya es un ángel' },

  // ================================================== FASES DE JEFE =======
  // El retrato base de `freezer` es la CUARTA forma, así que la segunda y la
  // tercera son un paso atrás en el orden del canon pero un cambio de imagen
  // clarísimo en pantalla, que es de lo que se trata.
  freezer__freezer2: { render: 'Sparking! Zero - 2nd Form Frieza (Z) artwork.png' },
  freezer__freezer3: { render: 'Sparking! Zero - 3rd Form Frieza (Z) artwork.png' },
  // "Forma definitiva / el 100 % de su poder" → el Freezer hinchado al 100 %,
  // no el 4ª forma normal (que es el retrato base y no cambiaría nada).
  freezer__freezer4: { render: 'Sparking! Zero - 100% Full Power Frieza (Z) artwork.png' },
  cell__semiperfecto: { render: 'Sparking! Zero - Semi-Perfect Cell artwork.png' },
  // El retrato base de `cell` YA es "Perfect Cell", así que para la fase
  // perfecta va el "Super Perfect Cell": mismo bicho, otra pose y con chispas.
  cell__perfecto: { render: 'Sparking! Zero - Super Perfect Cell artwork.png' },
  buu__superbuu: { render: 'Sparking! Zero - Super Buu artwork.png' },
  buu__kidbuu: { render: 'Sparking! Zero - Kid Buu artwork.png' },
  // Ozaru de Vegeta príncipe: el mismo render que `vegeta__ozaru`, y con razón,
  // porque es literalmente el mismo momento del anime.
  vegeta_saiyan__ozaru: { render: 'Sparking! Zero - Great Ape Vegeta artwork.png' },
  // El retrato base de `freezer_dorado` ya ES "Golden Frieza": generar el fichero
  // sería duplicar bytes para que se vea exactamente lo mismo.
  freezer_dorado__golden: { skip: 'el retrato base de Freezer Dorado ya es la forma dorada' },
  // Y lo mismo con Vegeta Majin: su retrato base es "Majin Vegeta artwork", que
  // ya es el SSJ2 con la M en la frente. Las dos formas darían la misma imagen.
  majin_vegeta__ssj2: { skip: 'el retrato base de Vegeta Majin ya es el SSJ2 con la M' },
  majin_vegeta__majin: { skip: 'ídem: el retrato base ya lleva la marca de Majin' },

  // ============================================ GOKU NIÑO =================
  // El retrato base es "Goku (Mini)" (el crío de Daima, con cola). Su Ozaru no
  // tiene render y el Kaio-Ken tampoco existe como artwork (ver Goku de arriba).
  goku_nino__ozaru: { skip: 'sin render de Great Ape Goku niño (solo cartas de Dokkan con fondo)' },
  goku_nino__kaioken: { skip: 'no existe artwork de Kaio-Ken en ningún juego' },
}

/**
 * Combinaciones que NO salen de los datos actuales pero que queremos tener ya
 * bajadas. Las tres formas divinas de Goku están en `transformations.ts`
 * (`ssjgod`, `ssjblue`, `ultra`) pero todavía NO en su `forms` de
 * `fighters.ts`, así que hoy el juego no las enseña. En cuanto se añadan ahí,
 * el retrato ya estará esperando.
 */
const EXTRA = [
  'goku__ssjgod', 'goku__ssjblue', 'goku__ultra',
  // La tercera forma de Freezer existe en `transformations.ts`, pero el jefe de
  // la saga 2 encadena `freezer2 → freezer4` (dos fases como máximo, por
  // diseño), así que hoy no llega a verse. Se baja igual: es el único escalón
  // que le falta a la escalera y no cuesta nada tenerlo listo.
  'freezer__freezer3',
]

const args = process.argv.slice(2)
const force = args.includes('--force')
const noCutout = args.includes('--no-cutout')
const listOnly = args.includes('--lista') || args.includes('--list')
const searchIdx = Math.max(args.indexOf('--buscar'), args.indexOf('--search'))
const searchFor = searchIdx >= 0 ? args[searchIdx + 1] : null
// El argumento que va justo detrás de `--buscar` es su parámetro, no un id que
// filtrar. Y ojo con el `-1`: si no hay `--buscar`, `searchIdx + 1` vale 0 y sin
// esta guarda se comería el PRIMER id de la línea de órdenes.
const only = new Set(args.filter((a, i) => !a.startsWith('--') && (searchIdx < 0 || i !== searchIdx + 1)))

// ---------------------------------------------------------------------------
// De dónde sale la lista de combinaciones
// ---------------------------------------------------------------------------

/**
 * Cruza `forms` de cada luchador (`fighters.ts`) con las fases de cada jefe
 * (`sagas.ts`). NO hay lista escrita a mano en ningún sitio: si mañana alguien
 * le da una forma nueva a un personaje, este script se entera solo.
 *
 * Se lee el TypeScript a golpe de expresión regular, igual que hace
 * `fetch-dragon-portraits.mjs`, para no tener que compilar nada ni arrastrar
 * `tsx` como dependencia.
 */
async function readCombos() {
  const combos = new Map() // 'base__form' → { baseId, name, formId, origen }
  const add = (baseId, name, formId, origen) => {
    const key = `${baseId}__${formId}`
    if (!combos.has(key)) combos.set(key, { key, baseId, name, formId, origen })
  }

  const fighters = await readFile(FIGHTERS_TS, 'utf8')
  const names = new Map()
  for (const chunk of fighters.split(/\n  \},?/)) {
    const m = /id: '([^']+)', name: '([^']+)'/.exec(chunk)
    if (!m) continue
    const [, id, name] = m
    names.set(id, name)
    const f = /forms: \[([^\]]*)\]/.exec(chunk)
    if (!f) continue
    for (const q of f[1].matchAll(/'([^']+)'/g)) add(id, name, q[1], 'luchador')
  }

  const sagas = await readFile(SAGAS_TS, 'utf8')
  for (const m of sagas.matchAll(/boss:\s*\{\s*id: '([^']+)',\s*phases: \[([^\]]*)\]/g)) {
    const id = m[1]
    for (const q of m[2].matchAll(/'([^']+)'/g)) add(id, names.get(id) ?? id, q[1], 'fase de jefe')
  }

  for (const key of EXTRA) {
    const [baseId, formId] = key.split('__')
    add(baseId, names.get(baseId) ?? baseId, formId, 'extra (aún no en fighters.ts)')
  }

  // Y comprobamos que la forma existe de verdad, no vaya a ser que un `phases`
  // apunte a una transformación que ya no está.
  const src = await readFile(FORMS_TS, 'utf8')
  const known = new Map()
  for (const m of src.matchAll(/id: '([^']+)',\n\s*name: '([^']+)'/g)) known.set(m[1], m[2])
  for (const c of combos.values()) {
    c.formName = known.get(c.formId)
    if (!c.formName) c.huerfana = true
  }
  return [...combos.values()]
}

// ---------------------------------------------------------------------------
// Wiki (idéntico a fetch-dragon-portraits.mjs: mismos trucos, mismos motivos)
// ---------------------------------------------------------------------------

async function exists(path) {
  try { await access(path); return true } catch { return false }
}

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

/** El CDN de Fandom sirve WEBP si no le pides PNG explícitamente. */
function asPng(url) {
  return url + (url.includes('?') ? '&' : '?') + 'format=png'
}

/** Resuelve un `File:...` a su miniatura de 256 px. */
async function fileThumb(file) {
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Descarga un fichero como PNG de 256 px, con reintentos (el CDN falla solo). */
async function download(file, tries = 3) {
  const url = await fileThumb(file)
  if (!url) return null
  let last = null
  for (let i = 0; i < tries; i++) {
    if (i) await sleep(500 * i)
    try {
      const res = await fetch(asPng(url), { headers: { 'User-Agent': UA } })
      if (!res.ok) throw new Error(`${res.status}`)
      const bytes = Buffer.from(await res.arrayBuffer())
      if (!isPng(bytes)) throw new Error('la respuesta no es un PNG')
      return { bytes, image: decodePng(bytes) }
    } catch (err) { last = err }
  }
  throw last ?? new Error('descarga fallida')
}

// ---------------------------------------------------------------------------
// Modo `--buscar`: la cascada de fetch-dragon-portraits, pero SIN escribir nada
// ---------------------------------------------------------------------------

const JUNK = /\b(logo|icon|card|sticker|cover|chapter|scan|poster|banner|calendar|stamp|badge|emblem|wallpaper)\b|manga|deformation|chesspiece|figurine|keshi|collection|settei|concept art/i
const SCENE = /\bvs\.?\b|\bep\.?\s*\d|episode|screenshot|defeat|attack|fight|battl|punch|kick|kills?\b|flashback|arrives|absorb|reaction|trailer/i
const RENDER = /\b(artwork|render|art)\b/i

function alphaCapable(colorType) {
  return !!colorType && (/alpha/i.test(colorType) || /index/i.test(colorType))
}

function metaOf(ii) {
  const md = Object.fromEntries((ii?.metadata ?? []).map((m) => [m.name, m.value]))
  return { width: ii?.width, height: ii?.height, mime: ii?.mime, colorType: md.colorType }
}

/** Misma puntuación que en el script de retratos base, palabra por palabra. */
function scoreCandidate(title, info, keys) {
  const name = title.replace(/^File:/, '').replace(/\.[a-z]+$/i, '')
  let score = 0
  if (JUNK.test(name)) score -= 60
  if (SCENE.test(name)) score -= 40
  if (RENDER.test(name)) score += 30
  // Aquí pedimos DOS cosas en el nombre, no una: el personaje Y la forma. Sin
  // lo segundo, buscar "Super Saiyan Goku" devuelve al Goku de siempre.
  for (const k of keys) {
    if (k && name.toLowerCase().includes(k.toLowerCase())) score += 20
    else score -= 25
  }
  if (info) {
    const { width, height } = info
    if (width && height) {
      const ratio = width / height
      if (ratio > 1.5) score -= 30
      else if (ratio <= 1.05) score += 15
      if (Math.max(width, height) < 120) score -= 20
    }
    if (info.mime === 'image/png') score += 10
    else score -= 35
    if (alphaCapable(info.colorType)) score += 40
  }
  return score
}

/** Lista candidatos de la wiki para una combinación, ordenados. No escribe. */
async function explore(combo) {
  const queries = [
    `${combo.name} ${combo.formName ?? combo.formId} artwork`,
    `Sparking Zero ${combo.name} artwork`,
    `${combo.formName ?? combo.formId} ${combo.name} render`,
  ]
  const found = new Set()
  for (const q of queries) {
    try {
      const json = await api({ action: 'query', list: 'search', srsearch: q, srnamespace: '6', srlimit: '12' })
      for (const hit of json?.query?.search ?? []) found.add(hit.title)
    } catch { /* seguimos con la siguiente consulta */ }
    await sleep(200)
  }
  const titles = [...found]
  const meta = new Map()
  for (let i = 0; i < titles.length; i += 40) {
    try {
      const json = await api({
        action: 'query', titles: titles.slice(i, i + 40).join('|'),
        prop: 'imageinfo', iiprop: 'url|size|mime|metadata',
      })
      for (const p of Object.values(json?.query?.pages ?? {})) {
        if (p?.imageinfo?.[0]) meta.set(p.title, metaOf(p.imageinfo[0]))
      }
    } catch { /* lo que no venga puntúa peor y ya está */ }
  }
  const keys = [combo.name.split(/\s+/).pop()]
  return titles
    .map((t) => ({ t, info: meta.get(t), score: scoreCandidate(t, meta.get(t), keys) }))
    .sort((a, b) => b.score - a.score)
}

// ---------------------------------------------------------------------------

async function main() {
  const combos = await readCombos()

  if (listOnly) {
    console.log(`${combos.length} combinaciones baseId__formId:\n`)
    for (const c of combos.sort((a, b) => a.key.localeCompare(b.key))) {
      const e = FORMS[c.key]
      const estado = !e ? 'SIN DECIDIR' : e.skip ? `descartada — ${e.skip}` : e.render
      console.log(`  ${c.key.padEnd(28)} ${(c.formName ?? '???').padEnd(22)} ${c.origen.padEnd(24)} ${estado}`)
    }
    const sin = combos.filter((c) => !FORMS[c.key])
    if (sin.length) console.log(`\n${sin.length} sin entrada en FORMS: ${sin.map((c) => c.key).join(', ')}`)
    const huerf = combos.filter((c) => c.huerfana)
    if (huerf.length) console.log(`\nApuntan a una forma que NO está en transformations.ts: ${huerf.map((c) => c.key).join(', ')}`)
    return
  }

  if (searchFor) {
    const combo = combos.find((c) => c.key === searchFor)
      ?? { key: searchFor, baseId: searchFor.split('__')[0], name: searchFor.split('__')[0], formId: searchFor.split('__')[1] }
    console.log(`Candidatos para ${combo.key} (${combo.name} / ${combo.formName ?? combo.formId}):\n`)
    for (const c of (await explore(combo)).slice(0, 20)) {
      const i = c.info
      console.log(`  ${String(c.score).padStart(4)}  ${c.t}  [${i ? `${i.width}x${i.height} ${i.mime} ${i.colorType ?? '?'}` : 'sin metadatos'}]`)
    }
    console.log('\nElige a mano y añádelo al mapa FORMS. NO se ha escrito ningún fichero.')
    return
  }

  await mkdir(OUT_DIR, { recursive: true })

  const targets = only.size
    ? combos.filter((c) => only.has(c.key) || only.has(c.baseId))
    : combos
  if (!targets.length) {
    console.error('No hay combinaciones que descargar. ¿Ids correctos? Prueba con --lista.')
    process.exit(1)
  }

  let ok = 0
  let skipped = 0
  const descartadas = []
  const sinDecidir = []
  const fallidas = []
  const recortadas = []

  for (const combo of targets.sort((a, b) => a.key.localeCompare(b.key))) {
    const dest = join(OUT_DIR, `${combo.key}.png`)
    if (!force && await exists(dest)) { skipped++; continue }

    const entry = FORMS[combo.key]
    if (!entry) {
      sinDecidir.push(combo.key)
      console.log(`  ? ${combo.key} — sin entrada en FORMS; usa --buscar ${combo.key}`)
      continue
    }
    if (entry.skip) {
      descartadas.push(`${combo.key} — ${entry.skip}`)
      console.log(`  – ${combo.key} — descartada: ${entry.skip}`)
      continue
    }

    const files = [entry.render ?? entry.file, ...(entry.alt ?? [])].filter(Boolean).slice(0, MAX_TRIES)
    let got = null
    let usado = null
    for (const file of files) {
      try {
        const d = await download(file)
        if (d) { got = d; usado = file; break }
        console.log(`  ! ${combo.key} — "${file}" no existe en la wiki`)
      } catch (err) {
        console.log(`  ! ${combo.key} — no se pudo bajar "${file}": ${err.message}`)
      }
      await sleep(250)
    }

    if (!got) {
      fallidas.push(`${combo.key} — no se pudo descargar ningún candidato`)
      console.log(`  ✗ ${combo.key} — sin imagen`)
      await sleep(350)
      continue
    }

    // El listón: alfa DE ORIGEN. Es lo que tienen todos los renders de
    // Sparking! Zero, así que si un fichero no lo trae es que nos hemos
    // equivocado de fichero.
    if (looksCutOut(got.image)) {
      await writeFile(dest, got.bytes)
      ok++
      const a = analyze(got.image)
      console.log(`  ✓ ${combo.key}.png  alfa de origen · ${a.width}x${a.height} · ${(a.transparentRatio * 100).toFixed(0)}% transp · ${(got.bytes.length / 1024).toFixed(1)} kB  [${usado}]`)
      await sleep(350)
      continue
    }

    if (noCutout) {
      fallidas.push(`${combo.key} — sin alfa y --no-cutout`)
      console.log(`  ✗ ${combo.key} — viene con fondo y se ha pedido --no-cutout`)
      await sleep(350)
      continue
    }

    // Sin alfa de origen: intentamos recortar. Y si el recorte no convence, NO
    // guardamos nada. Aquí sí podemos permitírnoslo: el retrato normal existe
    // siempre y es del personaje correcto, así que rendirse no deja hueco.
    const cut = cutoutPngBuffer(got.bytes)
    if (cut.buffer) {
      await writeFile(dest, cut.buffer)
      ok++
      recortadas.push(combo.key)
      const s = cut.stats
      console.log(`  ✂ ${combo.key}.png  recortado · ${s.width}x${s.height} · ${(s.transparentRatio * 100).toFixed(0)}% transp · ${(cut.buffer.length / 1024).toFixed(1)} kB  [${usado}]`)
    } else {
      fallidas.push(`${combo.key} — con fondo y el recorte falló (${cut.reason})`)
      console.log(`  ✗ ${combo.key} — con fondo y el recorte falló (${cut.reason}); NO se guarda`)
    }
    await sleep(350)
  }

  console.log(`\n${ok} descargados · ${skipped} ya estaban · ${descartadas.length} descartadas a propósito · ${fallidas.length} fallidas`)
  if (recortadas.length) console.log(`Recortados a mano: ${recortadas.join(', ')}`)
  if (sinDecidir.length) {
    console.log('\nSIN DECIDIR (hay que elegirles fichero a mano):')
    for (const s of sinDecidir) console.log(`  ? ${s}`)
  }
  if (fallidas.length) {
    console.log('\nFALLIDAS (la UI cae al retrato normal, que es lo correcto):')
    for (const f of fallidas) console.log(`  ✗ ${f}`)
  }
  if (descartadas.length) {
    console.log('\nDescartadas a propósito:')
    for (const d of descartadas) console.log(`  – ${d}`)
  }
  console.log('\nComprueba el resultado con: node scripts/audit-dragon-portraits.mjs --formas')
}

main().catch((err) => { console.error(err); process.exit(1) })
