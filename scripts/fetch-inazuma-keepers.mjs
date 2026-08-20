// FOTOS DE PARADA: para cada PORTERO del catálogo busca en su página de la
// wiki un fotograma del anime con la pelota ATRAPADA (catch/holds/save...) y
// lo guarda en `public/inazuma/keepers/<id>.png`. La tele de Chester lo
// enseña al cantar la parada.
//
//   node scripts/fetch-inazuma-keepers.mjs [--force] [id ...]
//
// CÓMO ELIGE: los ficheros de la wiki van titulados con el nombre JAPONÉS
// («(IE (026)) Genda catches the ball.png»), así que se busca el apellido
// (campo `wiki` del caché del roster) + verbos de parada, y se puntúa:
// atrapar > parar; se vetan los planos de espectadores («seeing X's save»),
// sprites, iconos y artes. Si no hay nada decente, ese portero se queda sin
// foto y la tele cae al comportamiento normal — el juego nunca depende de
// que esté.
import { mkdir, readFile, writeFile, access, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public', 'inazuma', 'keepers')
const SOURCE = join(ROOT, 'src', 'data', 'inazuma', 'players.ts')
const CACHE = join(ROOT, 'scripts', '.cache', 'inazuma-roster.json')
const API = 'https://inazuma-eleven.fandom.com/api.php'
const UA = 'pokelink-inazuma-keepers/1.0 (fotos de parada)'

const args = process.argv.slice(2)
const force = args.includes('--force')
const only = new Set(args.filter((a) => !a.startsWith('--')))

/** Vetos: fallos, casis, «catches up to» (correr, no parar) y no-balones. */
const BAD = /fail|almost|try(ing)?|catch(es|ing)? up|after|before|seeing|watching|noting|about|icon|sprite|logo|artwork|puppet|3D|TCG|manga|wallpaper|DVD|CD|design|eyecatch|Puni|SD\)|wood|plank|child/i

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

function firstPage(json) {
  const pages = json?.query?.pages ?? {}
  for (const key of Object.keys(pages)) if (key !== '-1') return pages[key]
  return null
}

/** Porteros de players.ts (id, nombre dub) sin los inventados. */
async function readKeepers() {
  const src = await readFile(SOURCE, 'utf8')
  const out = []
  for (const chunk of src.split(/\n  \},?/)) {
    const m = /id: '([^']+)', name: '([^']+)'.*position: 'POR'/.exec(chunk)
    if (!m) continue
    if (/rarity: \d,\s*\/\/ original/.test(chunk)) continue
    out.push({ id: m[1], name: m[2] })
  }
  return out
}

/** id → nombre wiki corto (japonés), del caché del roster. */
async function wikiNames() {
  const cache = JSON.parse(await readFile(CACHE, 'utf8'))
  const map = new Map()
  for (const roster of Object.values(cache)) {
    if (!Array.isArray(roster)) continue
    for (const p of roster) if (p.id && p.wiki) map.set(p.id, p.wiki)
  }
  return map
}

/** Resuelve la página real del personaje (título completo). */
async function resolvePage(short, dub) {
  for (const q of [short, dub].filter(Boolean)) {
    const j = await api({ action: 'query', titles: q, redirects: '1' })
    const pg = firstPage(j)
    if (pg?.title && pg.pageid) return pg.title
  }
  const s = await api({ action: 'query', list: 'search', srsearch: short ?? dub, srlimit: '1' })
  return s?.query?.search?.[0]?.title ?? null
}

async function exists(p) { try { await access(p); return true } catch { return false } }

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const keepers = await readKeepers()
  const wikis = await wikiNames()
  const targets = only.size ? keepers.filter((k) => only.has(k.id)) : keepers

  let ok = 0, skipped = 0
  const missing = []
  for (const { id, name } of targets) {
    const dest = join(OUT_DIR, `${id}.png`)
    if (!force && await exists(dest)) { skipped++; continue }
    try {
      // Los fotogramas de acción viven en páginas de EPISODIO, no en la del
      // personaje: se busca directamente en el espacio de FICHEROS por
      // «apellido + verbo de parada». El apellido es el nombre wiki japonés
      // (así se titulan los ficheros); sin él, el nombre dub como último tren.
      const short = wikis.get(id)
      const surname = (short ?? name).split(' ')[0]
      const found = new Set()
      for (const verb of ['catching', 'catches', 'caught', 'holding', 'stops', 'saves', 'blocking', 'punches']) {
        const j = await api({ action: 'query', list: 'search', srsearch: `${surname} ${verb}`, srnamespace: '6', srlimit: '10' })
        for (const r of j?.query?.search ?? []) found.add(r.title)
        await new Promise((r) => setTimeout(r, 120))
      }
      // El PORTERO tiene que ser el que ejecuta el verbo («Endou catching…»),
      // no el que sufre la parada («Domon catching Endou's shot»).
      const ACT = new RegExp(`(^|[)\\s])${surname}('s)?\\s+(catch(es|ing)?|caught|hold(s|ing)?|grab(s|bing)?|stop(s|ping)?|sav(es|ing)|block(s|ing)?|punch(es|ing)?|keeps)\\b`, 'i')
      const scored = [...found]
        .filter((t) => ACT.test(t) && !BAD.test(t))
        .map((t) => ({
          t,
          s: (/catch|caught|hold|grab/i.test(t) ? 3 : 0) + (/ball/i.test(t) ? 2 : 0)
            + (/shot|shoot/i.test(t) ? 1 : 0) + (/^File:\(IE /.test(t) ? 1 : 0),
        }))
        .sort((a, b) => b.s - a.s)
      const pick = scored[0]?.t
      if (!pick) { missing.push(name); console.log(`  ✗ ${name} — sin fotograma de parada`); continue }
      const info = await api({ action: 'query', titles: pick, prop: 'imageinfo', iiprop: 'url|size', iiurlwidth: '380' })
      const ii = firstPage(info)?.imageinfo?.[0]
      const url = ii?.thumburl ?? ii?.url
      if (!url) { missing.push(name); continue }
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (!res.ok) throw new Error(`${res.status}`)
      await writeFile(dest, Buffer.from(await res.arrayBuffer()))
      ok++
      console.log(`  ✓ ${name} ← ${pick.replace('File:', '')}`)
    } catch (err) {
      missing.push(name)
      console.log(`  ✗ ${name} — ${err.message}`)
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  const have = (await readdir(OUT_DIR)).length
  console.log(`\n${ok} bajados · ${skipped} ya estaban · ${missing.length} sin foto · ${have} en total`)
  if (missing.length) console.log('Sin foto (la tele cae a lo normal): ' + missing.join(', '))
}

main().catch((e) => { console.error(e); process.exit(1) })
