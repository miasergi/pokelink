// Repara los retratos de ETAPA EQUIVOCADA: jugadores cuyo retrato salió de un
// juego posterior (renders 3D con chándal de Victory Road, sprites (X)/(K-IJ),
// chibis SD, disfraces de gacha) cuando el modo es de la etapa CLÁSICA
// (Inazuma Eleven 1-3). El caso que lo destapó: Shawn Froste salía con el
// pañuelo de una entrega posterior y parecía un adulto.
//
//   node scripts/fix-inazuma-portraits-era.mjs
//
// Para cada jugador afectado busca en su página de la wiki, por orden:
//   1. `<Título>.png` — el arte principal del personaje (para los reclutables
//      de IE1 es un busto 256px transparente de su look clásico).
//   2. Un `... sprite.png` SIN etiqueta de juego moderno — los bustos 64px de
//      los juegos DS ((TG) = uniforme del Genesis, (IJ) = Inazuma Japan...).
//   3. `<Título> (unmerged).png` u otro arte sin etiqueta moderna, aunque
//      traiga fondo: mejor un fondo que una etapa que no toca.
// Si nada pasa el filtro, se deja el retrato que hay.
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, 'public', 'inazuma', 'players')
const SOURCE = join(ROOT, 'src', 'data', 'inazuma', 'players.ts')
const CACHE = join(ROOT, 'scripts', '.cache', 'inazuma-roster.json')
const API = 'https://inazuma-eleven.fandom.com/api.php'
const UA = 'pokelink-inazuma-portraits/3.0 (reparador de etapa)'

/** Equipos cuyo retrato vino en masa del render 3D moderno (chándal VR). */
const TEAMS_TO_FIX = new Set(['windies', 'extra-stars', 'kage-no-hero'])
/** Sueltos detectados en la auditoría visual de la galería completa. */
const EXTRA_IDS = new Set([
  'shawn-froste', 'shawn-froste-2', // pañuelo de entrega posterior
  'xavier-foster', // Gran disfrazado de pirata (gacha)
  'cannon-random', // chibi 3D de un spin-off
  'cadence-soundtown', // render 3D moderno
  'berdy-caster', // cuerpo entero moderno
  // Identidades corregidas (antes «Hellion»/«Scuba» de Orion):
  'leonard-o-shea', 'leonard-o-shea-2', 'chad-taylor',
])

/** Ficheros forzados: cuando el elegido automático no es el look que toca. */
const FORCED_FILE = {
  // El automático pescaba el sprite del modo «Atsuya» (ojos naranjas).
  'shawn-froste': '(H) Fubuki Shirou sprite (unmerged).png',
}

/** Etiquetas de juego POSTERIOR a la etapa clásica: descartan el fichero. */
const MODERN = /\((GO|VR|X|SD|CS|O|On|Orion|Ares|EG|K-IJ|IJ \(O\)|R|S|E|H \(A\))\)|casual|adult|sticker|save icon|3D|Puni|chibi/i

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

function pngHasAlpha(buf) {
  if (buf.slice(1, 4).toString() !== 'PNG') return false
  const colorType = buf[25]
  return colorType === 6 || colorType === 4 || buf.includes('tRNS')
}

/** Descarga un File: como PNG (miniado a 256 si es más grande). */
async function download(fileTitle) {
  const j = await api({ action: 'query', titles: fileTitle, prop: 'imageinfo', iiprop: 'url|size', iiurlwidth: '256' })
  for (const pg of Object.values(j?.query?.pages ?? {})) {
    const ii = pg?.imageinfo?.[0]
    if (!ii || !ii.width) continue
    const url = `${(ii.thumburl ?? ii.url).split('?')[0]}?format=png`
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (!res.ok) continue
    return { buf: Buffer.from(await res.arrayBuffer()), w: ii.width, h: ii.height }
  }
  return null
}

/** name limpio de players.ts → título de página wiki, vía la caché del crawl. */
async function wikiTitles() {
  const cache = JSON.parse(await readFile(CACHE, 'utf8'))
  const map = new Map()
  for (const list of Object.values(cache)) {
    for (const p of list) {
      const raw = p.name.includes('{{') ? (p.wiki ?? p.name) : p.name
      const clean = raw.replace(/\s*\([^)]*\)\s*$/, '').trim()
      if (!map.has(clean)) map.set(clean, p.wiki)
    }
  }
  return map
}

async function main() {
  const src = await readFile(SOURCE, 'utf8')
  const roster = []
  for (const chunk of src.split(/\n  \},?/)) {
    // OJO con los apellidos con comilla («Leonard O\'Shea»): el grupo del
    // nombre tiene que aceptar comillas escapadas, o el jugador ni aparece.
    const m = /id: '([^']+)', name: '((?:\\'|[^'])+)', team: '([^']+)'/.exec(chunk)
    if (!m) continue
    if (/rarity: \d,\s*\/\/ original/.test(chunk)) continue
    const name = m[2].replace(/\\'/g, "'")
    if (TEAMS_TO_FIX.has(m[3]) || EXTRA_IDS.has(m[1])) roster.push({ id: m[1], name })
  }
  const titles = await wikiTitles()
  console.log(`${roster.length} retratos a revisar`)

  let fixed = 0
  const left = []
  for (const p of roster) {
    const page = titles.get(p.name)
    if (!page) { left.push(`${p.id} (sin página)`); continue }
    const imgs = await api({ action: 'query', prop: 'images', titles: page, imlimit: '200', redirects: '1' })
    const pg = Object.values(imgs?.query?.pages ?? {})[0]
    const all = (pg?.images ?? []).map((i) => i.title.replace(/^File:/, ''))
      .filter((t) => /\.png$/i.test(t) && !MODERN.test(t))
    const title = pg?.title ?? page

    // Caso especial: Fubuki en su etapa Hakuren (el clon de The Windies).
    const mainName = p.id === 'shawn-froste-2' ? `${title} (unmerged).png` : `${title}.png`
    const candidates = FORCED_FILE[p.id] ? [FORCED_FILE[p.id]] : [
      ...all.filter((t) => t === mainName),
      ...all.filter((t) => / sprite/i.test(t) && t.toLowerCase().includes(title.split(' ')[0].toLowerCase())),
      ...all.filter((t) => t.startsWith(title) && t !== mainName),
    ]

    let done = false
    for (const cand of [...new Set(candidates)]) {
      const got = await download(`File:${cand}`)
      if (!got) continue
      // El arte principal debe ser busto (no mucho más alto que ancho) Y con
      // alfa; los sprites DS 64px valen siempre (son bustos por definición).
      const isSprite = / sprite/i.test(cand)
      if (!isSprite && got.h > got.w * 1.45) continue
      if (!isSprite && !pngHasAlpha(got.buf) && cand !== mainName) continue
      await writeFile(join(DIR, `${p.id}.png`), got.buf)
      console.log(`  ✓ ${p.id} ← ${cand}`)
      fixed++
      done = true
      break
    }
    if (!done) left.push(p.id)
  }
  console.log(`${fixed} reparados`)
  if (left.length) console.log(`sin candidato clásico (se quedan como están): ${left.join(', ')}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
