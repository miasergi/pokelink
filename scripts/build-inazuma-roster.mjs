// Genera la base de datos REAL de jugadores cruzando dos fuentes:
//
//   1. Fandom  → la plantilla de cada instituto, en nombres japoneses
//                (`{{#invoke:MemberTable ... |p1=Endou |p2=Kazemaru ...}}`).
//   2. inazumo → buscando ese nombre japonés sale su ficha con el nombre del
//                DOBLAJE, su elemento y su demarcación reales.
//
// Se hace así porque ninguna de las dos fuentes vale por sí sola: la wiki no
// tiene los nombres del doblaje europeo y inazumo no dice a qué instituto
// pertenece cada jugador.
//
//   node scripts/build-inazuma-roster.mjs            (todos los equipos)
//   node scripts/build-inazuma-roster.mjs occult zeus
//
// Escribe `scripts/.cache/inazuma-roster.json`. NO toca `players.ts`: ese
// fichero lleva los atributos equilibrados a mano, así que la mezcla se hace
// aparte y con criterio.
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const { chromium } = require(join(ROOT, 'node_modules', 'playwright'))

const OUT = join(ROOT, 'scripts', '.cache', 'inazuma-roster.json')
const WIKI = 'https://inazuma-eleven.fandom.com/api.php'
const UA = 'pokelink-roster-builder/1.0 (script de un solo uso)'

/** Página de la wiki de cada instituto y cuántos jugadores coger. */
const TEAMS = {
  raimon: { pages: ['Raimon'], take: 18 },
  occult: { pages: ['Occult'], take: 16 },
  otaku: { pages: ['Otaku', 'Otaku Gakuen'], take: 16 },
  wild: { pages: ['Wild', 'Yakuza Gakuen'], take: 16 },
  shuriken: { pages: ['Shuriken', 'Shuriken Gakuen'], take: 16 },
  farm: { pages: ['Nose', 'Farm'], take: 16 },
  kirkwood: { pages: ['Kidokawa Seishuu'], take: 16 },
  royal: { pages: ['Teikoku Gakuen'], take: 16 },
  zeus: { pages: ['Zeus'], take: 16 },
}

/** Traducción de lo que pone inazumo a nuestros identificadores. */
const ELEMENT = { 'montaña': 'montana', montana: 'montana', fuego: 'fuego', bosque: 'bosque', aire: 'aire' }
const POSITION = { portero: 'POR', defensa: 'DEF', centrocampista: 'MED', delantero: 'DEL' }

const only = new Set(process.argv.slice(2).filter((a) => !a.startsWith('--')))

async function wikiRoster(pages) {
  for (const page of pages) {
    try {
      const r = await fetch(`${WIKI}?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json`,
        { headers: { 'User-Agent': UA } })
      const wt = (await r.json())?.parse?.wikitext?.['*']
      if (!wt) continue
      const m = wt.match(/\|p\d+=([^\n|}]+)/g)
      if (m && m.length >= 8) {
        return { page, names: m.map((x) => x.split('=')[1].trim()).filter(Boolean) }
      }
    } catch { /* siguiente */ }
  }
  return null
}

const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function main() {
  await mkdir(dirname(OUT), { recursive: true })

  // --- 1. plantillas de la wiki
  const rosters = {}
  for (const [id, cfg] of Object.entries(TEAMS)) {
    if (only.size && !only.has(id)) continue
    const found = await wikiRoster(cfg.pages)
    if (!found) { console.log(`  ✗ ${id}: la wiki no tiene plantilla`); continue }
    rosters[id] = found.names.slice(0, cfg.take)
    console.log(`  · ${id}: ${rosters[id].length} de ${found.page}`)
  }

  // --- 2. ficha real de cada uno en inazumo
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const page = await (await browser.newContext()).newPage()
  await page.goto('https://inazumo.es/jugadores', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
  // OJO: el buscador NO lleva atributo `type`, así que `input[type=text]` no casa.
  const search = page.locator('input:not([type]), input[type="text"]').first()
  await search.waitFor({ state: 'visible', timeout: 60000 })

  const out = {}
  const missing = []

  for (const [teamId, names] of Object.entries(rosters)) {
    out[teamId] = []
    for (const jp of names) {
      try {
        await search.fill('')
        await page.waitForTimeout(200)
        await search.fill(jp)
        await page.waitForTimeout(1500)

        const cards = await page.evaluate(() =>
          [...document.querySelectorAll('a[href*="/jugadores/"]')].map((a) => ({
            href: a.getAttribute('href') ?? '',
            text: (a.textContent || '').trim().replace(/\s+/g, ' '),
            img: a.querySelector('img')?.getAttribute('src') ?? null,
          })))

        // La carta BASE es la del slug sin prefijo de variante.
        const base = cards.find((c) => /^\/jugadores\/[a-z0-9-]+-\d+$/.test(c.href)
          && !/^\/jugadores\/(basara|idol)-/.test(c.href))
        if (!base) { missing.push(`${teamId}/${jp}`); console.log(`  ✗ ${teamId}/${jp} — sin carta base`); continue }

        await page.goto(`https://inazumo.es${base.href}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
        await page.waitForTimeout(2200)
        const info = await page.evaluate(() => ({
          h1: document.querySelector('h1,h2')?.textContent?.trim() ?? '',
          body: document.body.innerText.replace(/\s+/g, ' ').slice(0, 400),
          img: [...document.querySelectorAll('img')].map((i) => i.src).find((s) => s.includes('cloudfront')) ?? null,
        }))

        // OJO: hay que ANCLAR la búsqueda. Buscar «portero» o «fuego» sueltos en
        // el texto de la página da basura: el bloque de estadísticas incluye la
        // línea «PP Portero» para TODO el mundo y los nombres de técnicas llevan
        // elementos dentro («Despeje de Fuego»). El encabezado real es
        //   <nombre JP> <afinidad> <Elemento> <Posición> Tier <X>
        // así que se lee justo lo que va pegado a «Tier».
        const head = /(Fuego|Bosque|Aire|Monta[ñn]a)\s+(Portero|Defensa|Centrocampista|Delantero)\s+Tier/i
          .exec(info.body)
        const el = head?.[1]?.toLowerCase()
        const pos = head?.[2]?.toLowerCase()
        const name = info.h1 || base.text
        out[teamId].push({
          jp,
          name,
          id: slugify(name),
          element: el ? ELEMENT[el] : null,
          position: pos ? POSITION[pos] : null,
          img: info.img,
          slug: base.href.replace('/jugadores/', ''),
        })
        console.log(`  ✓ ${teamId.padEnd(9)} ${jp.padEnd(12)} → ${name} (${pos ?? '?'} / ${el ?? '?'})`)

        // volver al buscador
        await page.goto('https://inazumo.es/jugadores', { waitUntil: 'domcontentloaded', timeout: 45000 })
        await page.waitForTimeout(1200)
      } catch (err) {
        missing.push(`${teamId}/${jp}`)
        console.log(`  ✗ ${teamId}/${jp} — ${err.message.split('\n')[0]}`)
      }
    }
  }

  await browser.close()
  await writeFile(OUT, JSON.stringify(out, null, 2), 'utf8')
  const total = Object.values(out).reduce((a, l) => a + l.length, 0)
  console.log(`\n${total} jugadores en ${OUT}`)
  if (missing.length) console.log(`Sin ficha (${missing.length}): ${missing.join(', ')}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
