// Descarga los ESCUDOS de los institutos desde la wiki de Fandom.
//
//   node scripts/fetch-inazuma-crests.mjs [--force]
//
// Guarda en `public/inazuma/teams/<id>.png`. Si un escudo no aparece no pasa
// nada: la UI pinta un escudo generado con la inicial sobre el color del
// equipo (ver `TeamCrest` en `InazumaViews.tsx`).
//
// Busca primero el fichero de emblema (`File:<Equipo> emblem.png`), que es el
// escudo limpio, y solo si no existe cae a la imagen principal de la página
// del equipo — que suele ser una foto de la plantilla y queda peor.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public', 'inazuma', 'teams')
const SOURCE = join(ROOT, 'src', 'data', 'inazuma', 'teams.ts')
const API = 'https://inazuma-eleven.fandom.com/api.php'
const SIZE = 256
const UA = 'pokelink-inazuma-crests/1.0 (script de un solo uso)'

const force = process.argv.includes('--force')

/**
 * Nombres a probar en la wiki, en orden. Varios institutos están catalogados
 * por su nombre japonés y no por el del doblaje, así que cada uno lleva sus
 * alternativas.
 */
const WIKI_NAME = {
  raimon: ['Raimon'],
  occult: ['Occult'],
  otaku: ['Otaku', 'Otaku Gakuen'],
  wild: ['Wild', 'Wild Junior High', 'Yakuza Gakuen'],
  shuriken: ['Shuriken'],
  farm: ['Farm', 'Farm Junior High', 'Nose'],
  kirkwood: ['Kirkwood', 'Kidokawa Seishuu'],
  royal: ['Royal Academy', 'Teikoku Gakuen'],
  zeus: ['Zeus'],
}

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

function firstThumb(json) {
  const pages = json?.query?.pages ?? {}
  for (const key of Object.keys(pages)) {
    if (key === '-1') continue
    const src = pages[key]?.thumbnail?.source ?? pages[key]?.imageinfo?.[0]?.thumburl
    if (src) return src
  }
  return null
}

/** El emblema limpio, si existe. */
async function findEmblem(name) {
  for (const title of [`File:${name} emblem.png`, `File:${name} Emblem.png`, `File:${name} emblem.jpg`]) {
    try {
      const j = await api({ action: 'query', titles: title, prop: 'imageinfo', iiprop: 'url', iiurlwidth: String(SIZE) })
      const url = firstThumb(j)
      if (url) return url
    } catch { /* siguiente */ }
  }
  // Búsqueda abierta entre los ficheros.
  try {
    const j = await api({ action: 'query', list: 'search', srsearch: `${name} emblem`, srnamespace: '6', srlimit: '5' })
    for (const hit of j?.query?.search ?? []) {
      // Nos quedamos con el emblema base, no con las variantes (GO, dub, U-13…).
      if (!/emblem/i.test(hit.title)) continue
      if (/\b(GO|dub|U-1[35]|Dreams|United|First)\b/i.test(hit.title)) continue
      const info = await api({ action: 'query', titles: hit.title, prop: 'imageinfo', iiprop: 'url', iiurlwidth: String(SIZE) })
      const url = firstThumb(info)
      if (url) return url
    }
  } catch { /* nada */ }
  // Último recurso: la imagen principal de la página del equipo.
  try {
    const j = await api({ action: 'query', titles: name, prop: 'pageimages', piprop: 'thumbnail', pithumbsize: String(SIZE) })
    return firstThumb(j)
  } catch { return null }
}

async function exists(p) { try { await access(p); return true } catch { return false } }

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const src = await readFile(SOURCE, 'utf8')
  const ids = [...src.matchAll(/id: '([a-z]+)', name: '([^']+)'/g)].map((m) => m[1])

  let ok = 0, skipped = 0
  const missing = []
  for (const id of ids) {
    const dest = join(OUT_DIR, `${id}.png`)
    if (!force && await exists(dest)) { skipped++; continue }
    const names = WIKI_NAME[id] ?? [id]
    try {
      let url = null
      for (const name of names) {
        url = await findEmblem(name)
        if (url) break
      }
      if (!url) { missing.push(id); console.log(`  ✗ ${id} — sin escudo`); continue }
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (!res.ok) throw new Error(`${res.status}`)
      await writeFile(dest, Buffer.from(await res.arrayBuffer()))
      ok++
      console.log(`  ✓ ${id} → ${id}.png`)
    } catch (err) {
      missing.push(id)
      console.log(`  ✗ ${id} — ${err.message}`)
    }
    await new Promise((r) => setTimeout(r, 350))
  }
  console.log(`\n${ok} descargados · ${skipped} ya estaban · ${missing.length} sin escudo`)
  if (missing.length) console.log('Sin escudo (se pintará el generado): ' + missing.join(', '))
}

main().catch((e) => { console.error(e); process.exit(1) })
