// Los ESCENARIOS de los tramos del rogue: un tile de los propios juegos por
// ronda, con progresión de la ribera del río al gran estadio de la final.
//
//   node scripts/fetch-inazuma-zones.mjs [--force]
//
// Guarda en `public/inazuma/zones/zona-<i>.png` (0-7). Si alguno falta, la
// cabecera del mapa pinta su gradiente de siempre: nada depende de esto.
import { mkdir, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'inazuma', 'zones')
const API = 'https://inazuma-eleven.fandom.com/api.php'
const UA = 'pokelink-inazuma-zones/1.0 (script de un solo uso)'

/** Un escenario por ronda (0-7): de la calle a la final. */
const ZONES = [
  'File:Riverbank Ground (GO).png',      // Ronda 1 · la ribera del río
  'File:(GO) Raimon Stadium.png',        // Ronda 2 · el campo del insti
  'File:Teikoku Stadium (GO).png',       // Ronda 3 · el estadio de la Royal
  'File:Wildcat Stadium.png',            // Dieciseisavos
  'File:Peafowl Stadium.png',            // Octavos
  'File:(IE (024)) Zeus Stadium.png',    // Cuartos · el olimpo de Zeus
  'File:Holy Road Stadium.png',          // Semifinal
  'File:(VR) Football Frontier Stadium.png', // Final · el gran estadio
]

const force = process.argv.includes('--force')

async function exists(p) { try { await access(p); return true } catch { return false } }

async function main() {
  await mkdir(OUT, { recursive: true })
  for (let i = 0; i < ZONES.length; i++) {
    const dest = join(OUT, `zona-${i}.png`)
    if (!force && await exists(dest)) { console.log(`  · zona-${i} ya estaba`); continue }
    try {
      const url = `${API}?${new URLSearchParams({
        action: 'query', titles: ZONES[i], prop: 'imageinfo', iiprop: 'url', iiurlwidth: '512', format: 'json',
      })}`
      const j = await (await fetch(url, { headers: { 'User-Agent': UA } })).json()
      const page = Object.values(j?.query?.pages ?? {})[0]
      const src = page?.imageinfo?.[0]?.thumburl ?? page?.imageinfo?.[0]?.url
      if (!src) { console.log(`  ✗ zona-${i}: sin imagen (${ZONES[i]})`); continue }
      const res = await fetch(`${src.split('?')[0]}?format=png`, { headers: { 'User-Agent': UA } })
      if (!res.ok) throw new Error(String(res.status))
      await writeFile(dest, Buffer.from(await res.arrayBuffer()))
      console.log(`  ✓ zona-${i} ← ${ZONES[i].replace('File:', '')}`)
    } catch (err) {
      console.log(`  ✗ zona-${i}: ${err.message}`)
    }
  }
}

await main()
