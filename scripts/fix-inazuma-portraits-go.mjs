// Quita los FONDOS de los retratos de INAZUMA ELEVEN GO: sus fichas de la
// wiki traen una captura del anime como imagen principal, pero casi todas
// tienen el arte oficial TRANSPARENTE en `File:<Página>.png` (y si no, un
// sprite de su época). Prioridad: arte oficial > sprite (SR) > cualquier
// sprite suyo que no sea de Chrono Stone/Galaxy/casual.
//
//   node scripts/fix-inazuma-portraits-go.mjs            (los de la auditoría)
//   node scripts/fix-inazuma-portraits-go.mjs id1 id2    (solo esos)
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, 'public', 'inazuma', 'players')
const SOURCE = join(ROOT, 'src', 'data', 'inazuma', 'players.ts')
const CACHE = join(ROOT, 'scripts', '.cache', 'inazuma-roster.json')
const LIST = join(ROOT, 'scripts', '.cache', 'portraits-con-fondo.txt')
const API = 'https://inazuma-eleven.fandom.com/api.php'
const UA = 'pokelink-inazuma-portraits-go/1.0 (quita-fondos GO)'

// Chrono Stone (CS), Galaxy (GX/GAL) y variantes raras: fuera.
const BAD = /\((CS|GX|GAL|Orion|Ares|K-IJ|EG|SD|X)\)|casual|adult|sticker|save icon|3D|Puni|Cinderelife/i

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
  const src = await readFile(SOURCE, 'utf8')
  const cache = JSON.parse(await readFile(CACHE, 'utf8'))

  // Equipos GO del caché → sus jugadores, id → página wiki.
  const GO_TEAMS = new Set(['raimon-go', 'mannouzaka', 'tengawara', 'gassan-kunimitsu', 'hakuren-go',
    'kaiou-gakuen', 'genei-gakuen', 'arakumo-gakuen', 'seidouzan', 'dragonlink', 'kidokawa-go', 'unlimited-shining'])
  const wikiByName = new Map()
  for (const [teamId, list] of Object.entries(cache)) {
    if (!GO_TEAMS.has(teamId)) continue
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

  let ids = process.argv.slice(2)
  if (!ids.length) {
    const raw = await readFile(LIST, 'utf8')
    ids = raw.trim().split(/\s+/).filter((id) => wikiByName.has(nameById.get(id) ?? ''))
  }
  console.log(`${ids.length} retratos GO con fondo que arreglar`)

  const left = []
  for (const id of ids) {
    const name = nameById.get(id)
    const page = name ? wikiByName.get(name) : null
    if (!page) { left.push(`${id} (sin página)`); continue }
    try {
      // Título REAL de la página (redirects resueltos): es el nombre del arte.
      const r = await api({ action: 'query', titles: page, redirects: '1' })
      const title = Object.values(r?.query?.pages ?? {})[0]?.title ?? page
      const imgs = await api({ action: 'query', prop: 'images', titles: title, imlimit: '500', redirects: '1' })
      const all = (Object.values(imgs?.query?.pages ?? {})[0]?.images ?? [])
        .map((i) => i.title.replace(/^File:/, ''))
      const surname = title.split(' ')[0].toLowerCase()
      const sprites = all
        .filter((t) => /\.png$/i.test(t) && / sprite/i.test(t) && t.toLowerCase().includes(surname) && !BAD.test(t))
        // (SR) primero: son los bustos limpios de su época.
        .sort((a, b) => Number(/\(SR\)/i.test(b)) - Number(/\(SR\)/i.test(a)))
      // SPRITES_FIRST=1: para los que su arte principal tiene canal alfa pero
      // es una captura opaca (pngHasAlpha no distingue) — el sprite de juego
      // sí es transparente de verdad.
      const candidates = process.env.SPRITES_FIRST
        ? [...sprites, `${title}.png`]
        : [`${title}.png`, ...sprites]
      let done = false
      for (const cand of candidates) {
        const buf = await download(`File:${cand}`)
        if (!buf || !pngHasAlpha(buf)) continue
        await writeFile(join(DIR, `${id}.png`), buf)
        console.log(`  ✓ ${id} ← ${cand}`)
        done = true
        break
      }
      if (!done) left.push(id)
    } catch (err) {
      left.push(`${id} (${err.message})`)
    }
    await new Promise((res) => setTimeout(res, 250))
  }
  if (left.length) console.log(`sin arte transparente (${left.length}): ${left.join(', ')}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
