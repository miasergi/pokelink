// Descarga los retratos de los jugadores de Inazuma desde la wiki de Fandom.
//
//   node scripts/fetch-inazuma-portraits.mjs            (solo los que faltan)
//   node scripts/fetch-inazuma-portraits.mjs --force    (vuelve a bajarlo todo)
//   node scripts/fetch-inazuma-portraits.mjs mark-evans jude-sharp
//
// Guarda en `public/inazuma/players/<id>.png` miniaturas de 256 px pedidas a la
// propia API (`pithumbsize`), así que no hace falta redimensionar nada ni
// instalar `sharp`.
//
// IMPORTANTE:
//  - Los jugadores marcados `// original` en `src/data/inazuma/players.ts` NO
//    existen en la serie: se saltan, porque buscarlos solo devolvería basura.
//  - Si un retrato no se encuentra NO pasa nada: la UI pinta la carta generada
//    con las iniciales. El juego nunca depende de que estas imágenes estén.
//  - Las imágenes son de Fandom y están sujetas a su licencia (CC-BY-SA para el
//    texto; las imágenes suelen ser material con copyright de Level-5 usado
//    bajo uso legítimo). Revísalo antes de publicar el juego.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public', 'inazuma', 'players')
const SOURCE = join(ROOT, 'src', 'data', 'inazuma', 'players.ts')
const API = 'https://inazuma-eleven.fandom.com/api.php'
const THUMB_SIZE = 256
// Fandom rechaza el User-Agent por defecto de Node en algunas rutas.
const UA = 'pokelink-inazuma-portraits/1.0 (script de un solo uso; contacto: repo owner)'

const args = process.argv.slice(2)
const force = args.includes('--force')
const only = new Set(args.filter((a) => !a.startsWith('--')))

/** Saca {id, name} de players.ts sin compilar TypeScript. */
async function readRoster() {
  const src = await readFile(SOURCE, 'utf8')
  const out = []
  for (const chunk of src.split(/\n  \},?/)) {
    const m = /id: '([^']+)', name: '([^']+)'/.exec(chunk)
    if (!m) continue
    // Los inventados llevan `// original` AL FINAL DE LA LÍNEA DE `rarity`.
    // Ojo: hay que anclarlo ahí y no buscar `// original` suelto — el primer
    // trozo del split incluye la cabecera del fichero, que menciona la marca
    // para explicarla, y con una búsqueda suelta se saltaba a Mark Evans.
    if (/rarity: \d,\s*\/\/ original/.test(chunk)) continue
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
 * Busca la página del personaje y devuelve la URL de su imagen principal.
 * Primero prueba el título exacto; si no hay página, cae a la búsqueda abierta.
 */
async function findPortrait(name) {
  const byTitle = await api({ action: 'query', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: String(THUMB_SIZE), titles: name })
  const direct = firstThumb(byTitle)
  if (direct) return direct

  const search = await api({ action: 'query', list: 'search', srsearch: name, srlimit: '1' })
  const hit = search?.query?.search?.[0]?.title
  if (!hit) return null
  const byHit = await api({ action: 'query', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: String(THUMB_SIZE), titles: hit })
  return firstThumb(byHit)
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

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const roster = await readRoster()
  const targets = only.size ? roster.filter((p) => only.has(p.id)) : roster
  if (!targets.length) {
    console.error('No hay jugadores que descargar. ¿Ids correctos?')
    process.exit(1)
  }

  let ok = 0
  let skipped = 0
  const missing = []

  for (const { id, name } of targets) {
    const dest = join(OUT_DIR, `${id}.png`)
    if (!force && await exists(dest)) { skipped++; continue }
    try {
      const url = await findPortrait(name)
      if (!url) { missing.push(name); console.log(`  ✗ ${name} — sin imagen en la wiki`); continue }
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (!res.ok) throw new Error(`${res.status}`)
      await writeFile(dest, Buffer.from(await res.arrayBuffer()))
      ok++
      console.log(`  ✓ ${name} → ${id}.png`)
    } catch (err) {
      missing.push(name)
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
