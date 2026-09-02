// RETRATOS UNIFICADOS desde inazumo.es (su mapa público nombre → imagen del
// CDN, /data/player-images.txt): un solo estilo de busto para todo el
// catálogo. La k-ésima imagen de un nombre va a la k-ésima variante de época
// del personaje (mark-evans, mark-evans-2…), con overrides puntuales.
//
//   node scripts/fetch-inazumo-portraits.mjs
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'inazuma', 'players')
const UA = { 'User-Agent': 'pokelink-portraits/1.0 (script de un solo uso)' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** El retrato EXACTO pedido para algunos (el resto sigue la regla general). */
const OVERRIDES = {
  'shawn-froste': 'https://dxi4wb638ujep.cloudfront.net/1/k/w/k/wk5ezxf-7dm.png',
  'neil-turner': 'https://dxi4wb638ujep.cloudfront.net/1/k/i/n/inwfp5x5ak8.png',
}

async function main() {
  // 1) El mapa nombre → [imágenes] de inazumo.es (principal + extra).
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  const byName = new Map()
  const addLine = (name, url) => {
    const k = norm(name)
    if (!byName.has(k)) byName.set(k, [])
    if (!byName.get(k).includes(url)) byName.get(k).push(url)
  }
  const main1 = await (await fetch('https://inazumo.es/data/player-images.txt', { headers: UA })).text()
  for (const l of main1.split('\n')) {
    const m = l.match(/^(.+?)\s+-\s+(https:\/\/\S+)/)
    if (m) addLine(m[1], m[2])
  }
  const extra = await (await fetch('https://inazumo.es/data/player-images-extra.txt', { headers: UA })).text()
  for (const l of extra.split('\n')) {
    const m = l.match(/^(.+?)\s+\|\s+(https:\/\/\S+)/)
    if (m) addLine(m[1], m[2])
  }
  console.log('nombres con imagen en inazumo:', byName.size)

  // 2) Nuestro catálogo, agrupado por nombre (variantes en orden de sufijo).
  const src = await readFile(join(ROOT, 'src/data/inazuma/players.ts'), 'utf8')
  const players = [...src.matchAll(/id: '([a-z0-9-]+)', name: '((?:[^'\\]|\\.)+)',/g)]
    .map((m) => ({ id: m[1], name: m[2].replace(/\\'/g, "'") }))
  const groups = new Map()
  for (const p of players) {
    const k = norm(p.name)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(p.id)
  }
  const suffixNum = (id) => Number(id.match(/-(\d+)$/)?.[1] ?? 1)
  for (const ids of groups.values()) ids.sort((a, b) => suffixNum(a) - suffixNum(b))

  // 3) Descarga: k-ésima imagen → k-ésima variante (si faltan, la última).
  let ok = 0
  const sinMatch = []
  for (const [nameKey, ids] of groups) {
    const urls = byName.get(nameKey)
    if (!urls) { sinMatch.push(ids[0]); continue }
    for (let i = 0; i < ids.length; i++) {
      const url = OVERRIDES[ids[i]] ?? urls[Math.min(i, urls.length - 1)]
      try {
        const res = await fetch(url, { headers: UA })
        if (!res.ok) throw new Error(String(res.status))
        await writeFile(join(OUT, `${ids[i]}.png`), Buffer.from(await res.arrayBuffer()))
        ok++
        if (ok % 100 === 0) console.log(`  …${ok} retratos`)
      } catch (e) {
        console.log('  ✗', ids[i], e.message)
      }
      await sleep(120)
    }
  }
  console.log(`retratos nuevos: ${ok} · sin match en inazumo: ${sinMatch.length}`)
  await writeFile(join(ROOT, 'scripts/.cache/inazumo-sin-match.txt'), sinMatch.join('\n'))
}

await main()
