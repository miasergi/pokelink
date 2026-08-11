// Descarga retratos estilo *Inazuma Eleven: Victory Road* desde inazumo.es.
//
//   node scripts/fetch-inazuma-portraits-vr.mjs [--force] [id ...]
//
// Son bustos de 256 px con fondo transparente, mucho más limpios y consistentes
// que las capturas de anime de la wiki. Sobrescriben lo que haya en
// `public/inazuma/players/<id>.png`; los que no aparezcan conservan el retrato
// de Fandom que bajó `fetch-inazuma-portraits.mjs`.
//
// POR QUÉ CON NAVEGADOR: inazumo.es es una SPA pura. Todas las URLs devuelven
// el mismo esqueleto de 7 KB —incluso las inventadas—, no hay API pública y los
// slugs no son adivinables. La única vía es renderizar la página y usar su
// buscador, que es exactamente lo que hace este script.
//
// CÓMO ELIGE LA CARTA: el buscador devuelve muchas variantes del personaje
// (`basara-…`, `idol-…`, ediciones especiales). La carta BASE es la que tiene
// el slug sin prefijo (`mark-evans-1`), y es la que se coge.
//
// LICENCIA: las imágenes son material de Level-5 rehospedado por una web de
// fans. Mismo caso que las de Fandom. Revísalo antes de publicar el juego.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const { chromium } = require(join(ROOT, 'node_modules', 'playwright'))

const OUT_DIR = join(ROOT, 'public', 'inazuma', 'players')
const SOURCE = join(ROOT, 'src', 'data', 'inazuma', 'players.ts')
const SITE = 'https://inazumo.es/jugadores'

const args = process.argv.slice(2)
const force = args.includes('--force')
const only = new Set(args.filter((a) => !a.startsWith('--')))

const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function readRoster() {
  const src = await readFile(SOURCE, 'utf8')
  const out = []
  for (const chunk of src.split(/\n  \},?/)) {
    const m = /id: '([^']+)', name: '([^']+)'/.exec(chunk)
    if (!m) continue
    if (/rarity: \d,\s*\/\/ original/.test(chunk)) continue
    out.push({ id: m[1], name: m[2] })
  }
  return out
}

async function exists(p) { try { await access(p); return true } catch { return false } }

/** Puntúa un resultado del buscador: la carta base gana a cualquier variante. */
function score(href, wanted) {
  const slug = href.replace('/jugadores/', '')
  const base = /^([a-z0-9-]+?)-(\d+)$/.exec(slug)
  if (!base) return -1
  const [, namePart, id] = base
  if (namePart === wanted) return 1000 - Number(id) / 1e6      // carta base exacta
  if (namePart.endsWith(`-${wanted}`)) return 100              // variante (basara-…, idol-…)
  if (namePart.startsWith(wanted)) return 500 - Number(id) / 1e6 // base con sufijo de nombre
  return -1
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const roster = await readRoster()
  const targets = only.size ? roster.filter((p) => only.has(p.id)) : roster

  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const page = await (await browser.newContext()).newPage()
  // La SPA necesita que la red se calme para pintar el buscador, pero
  // `networkidle` puede no llegar nunca (mantiene conexiones abiertas). Se
  // intenta con tope corto y, pase lo que pase, se espera al elemento que de
  // verdad hace falta.
  await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
  // OJO con el selector: el buscador de inazumo.es NO lleva atributo `type`.
  // En JS `input.type` devuelve 'text' igualmente, así que inspeccionarlo
  // engaña; el selector CSS `input[type="text"]` no casa con él.
  const search = page.locator('input:not([type]), input[type="text"], input[type="search"]').first()
  await search.waitFor({ state: 'visible', timeout: 60000 })

  let ok = 0, skipped = 0
  const missing = []

  for (const { id, name } of targets) {
    const dest = join(OUT_DIR, `${id}.png`)
    if (!force && await exists(dest) && !only.size) { /* se sobrescribe igual: es una mejora */ }
    try {
      await search.fill('')
      await page.waitForTimeout(250)
      await search.fill(name)
      await page.waitForTimeout(1800)

      const results = await page.evaluate(() =>
        [...document.querySelectorAll('a[href*="/jugadores/"]')].map((a) => ({
          href: a.getAttribute('href') ?? '',
          img: a.querySelector('img')?.getAttribute('src') ?? null,
        })))

      const wanted = slugify(name)
      let best = null
      let bestScore = 0
      for (const r of results) {
        if (!r.img || !r.img.includes('cloudfront')) continue
        const s = score(r.href, wanted)
        if (s > bestScore) { bestScore = s; best = r }
      }

      if (!best) { missing.push(name); console.log(`  ✗ ${name} — no está en Victory Road`); continue }

      const res = await fetch(best.img)
      if (!res.ok) throw new Error(String(res.status))
      const buf = Buffer.from(await res.arrayBuffer())
      // Sanidad: un PNG de verdad pesa más que un placeholder.
      if (buf.length < 2000) throw new Error('imagen sospechosamente pequeña')
      await writeFile(dest, buf)
      ok++
      console.log(`  ✓ ${name} → ${id}.png  (${best.href})`)
    } catch (err) {
      missing.push(name)
      console.log(`  ✗ ${name} — ${err.message}`)
    }
  }

  await browser.close()
  console.log(`\n${ok} retratos Victory Road · ${skipped} saltados · ${missing.length} sin carta`)
  if (missing.length) {
    console.log('Se quedan con el retrato de la wiki (captura de anime):')
    console.log('  ' + missing.join(', '))
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
