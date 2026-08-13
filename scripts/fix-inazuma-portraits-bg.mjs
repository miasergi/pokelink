// Quita los FONDOS que quedan: para los retratos que siguen siendo capturas
// con fondo (auditados con canvas por las esquinas), busca en la página del
// personaje un SPRITE transparente de look clásico. Prioridad: sprite clásico
// sin etiqueta de juego moderno > sprite (VR) (bustos transparentes del look
// clásico, los mismos que ya usan Mark o Axel) > (H). Nunca (GO)/(Orion)/
// (Ares)/(X)/casual/SD.
//
//   node scripts/fix-inazuma-portraits-bg.mjs id1 id2 ...
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, 'public', 'inazuma', 'players')
const SOURCE = join(ROOT, 'src', 'data', 'inazuma', 'players.ts')
const CACHE = join(ROOT, 'scripts', '.cache', 'inazuma-roster.json')
const API = 'https://inazuma-eleven.fandom.com/api.php'
const UA = 'pokelink-inazuma-portraits/4.0 (quita-fondos)'

const BAD = /\((GO|Orion|Ares|CS|SD|X|K-IJ|EG|IJ \(O\))\)|casual|adult|sticker|save icon|3D|Puni/i

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

async function download(fileTitle) {
  const j = await api({ action: 'query', titles: fileTitle, prop: 'imageinfo', iiprop: 'url|size', iiurlwidth: '256' })
  for (const pg of Object.values(j?.query?.pages ?? {})) {
    const ii = pg?.imageinfo?.[0]
    if (!ii || !ii.width || ii.width < 48) continue
    const res = await fetch(`${(ii.thumburl ?? ii.url).split('?')[0]}?format=png`, { headers: { 'User-Agent': UA } })
    if (!res.ok) continue
    return Buffer.from(await res.arrayBuffer())
  }
  return null
}

async function main() {
  const ids = process.argv.slice(2)
  const src = await readFile(SOURCE, 'utf8')
  const cache = JSON.parse(await readFile(CACHE, 'utf8'))
  const wikiByName = new Map()
  for (const list of Object.values(cache)) {
    for (const p of list) {
      const raw = p.name.includes('{{') ? (p.wiki ?? p.name) : p.name
      const clean = raw.replace(/\s*\([^)]*\)\s*$/, '').trim()
      if (!wikiByName.has(clean)) wikiByName.set(clean, p.wiki)
    }
  }
  const nameById = new Map()
  for (const m of src.matchAll(/id: '([^']+)', name: '((?:\\'|[^'])+)'/g)) {
    nameById.set(m[1], m[2].replace(/\\'/g, "'"))
  }

  const left = []
  for (const id of ids) {
    const name = nameById.get(id)
    const page = name ? wikiByName.get(name) : null
    if (!page) { left.push(`${id} (sin página)`); continue }
    const imgs = await api({ action: 'query', prop: 'images', titles: page, imlimit: '200', redirects: '1' })
    const pg = Object.values(imgs?.query?.pages ?? {})[0]
    const all = (pg?.images ?? []).map((i) => i.title.replace(/^File:/, ''))
      .filter((t) => /\.png$/i.test(t) && / sprite/i.test(t) && !BAD.test(t))
    const first = (pg?.title ?? page).split(' ')[0].toLowerCase()
    const mine = all.filter((t) => t.toLowerCase().includes(first))
    // clásico primero, (VR) después.
    const score = (t) => (/\(VR\)/i.test(t) ? 1 : 0)
    mine.sort((a, b) => score(a) - score(b))

    let done = false
    for (const cand of mine) {
      const buf = await download(`File:${cand}`)
      if (!buf || !pngHasAlpha(buf)) continue
      await writeFile(join(DIR, `${id}.png`), buf)
      console.log(`  ✓ ${id} ← ${cand}`)
      done = true
      break
    }
    if (!done) left.push(id)
  }
  if (left.length) console.log(`sin sprite transparente: ${left.join(', ')}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
