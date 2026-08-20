// Carátulas de los cuatro juegos, para la pantalla de elegir saga.
//
//   node scripts/fetch-inazuma-sagas.mjs
//
// Guarda en `public/inazuma/sagas/<id>.png`. Si alguna falta, la UI pinta la
// tarjeta con el color de la saga: el juego nunca depende de estas imágenes.
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'inazuma', 'sagas')
const API = 'https://inazuma-eleven.fandom.com/api.php'
const UA = 'pokelink-inazuma-sagas/1.0 (script de un solo uso)'

/** Fichero de la wiki con la carátula de cada juego. */
const COVERS = {
  ff: 'File:Inazuma Eleven cover.jpg',
  alius: 'File:Inazuma Eleven 2 Kyoui no Shinryakusha Fire cover.jpg',
  ffi: 'File:Inazuma Eleven 3 Sekai e no Chousen!! Spark cover.jpg',
  go: 'File:Inazuma Eleven GO Shine cover.png',
  vr: 'File:Inazuma Eleven Eiyuutachi no Victory Road cover.png',
}

async function main() {
  await mkdir(OUT, { recursive: true })
  for (const [id, file] of Object.entries(COVERS)) {
    try {
      const url = `${API}?${new URLSearchParams({
        action: 'query', titles: file, prop: 'imageinfo', iiprop: 'url', iiurlwidth: '512', format: 'json',
      })}`
      const j = await (await fetch(url, { headers: { 'User-Agent': UA } })).json()
      const page = Object.values(j?.query?.pages ?? {})[0]
      const src = page?.imageinfo?.[0]?.thumburl ?? page?.imageinfo?.[0]?.url
      if (!src) { console.log(`  ✗ ${id}: sin carátula`); continue }
      // `format=png` es lo único que respeta el CDN de Fandom para no servir WebP.
      const res = await fetch(`${src.split('?')[0]}?format=png`, { headers: { 'User-Agent': UA } })
      if (!res.ok) throw new Error(String(res.status))
      await writeFile(join(OUT, `${id}.png`), Buffer.from(await res.arrayBuffer()))
      console.log(`  ✓ ${id} → sagas/${id}.png`)
    } catch (err) {
      console.log(`  ✗ ${id}: ${err.message}`)
    }
  }
}

await main()
