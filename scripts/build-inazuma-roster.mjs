// Genera la base de datos REAL de jugadores desde la wiki de Fandom.
//
//   1. Página del instituto → su plantilla, en nombres cortos japoneses
//      (`{{#invoke:MemberTable ... |p1=Endou |p2=Kazemaru ...}}`).
//   2. Ficha de cada personaje → `|name_dub=` (nombre del doblaje europeo),
//      `|element=` y `|position=`.
//
// Todo por HTTP, sin navegador. Las dos versiones anteriores intentaban cruzar
// la wiki con inazumo y fracasaban: la wiki romaniza distinto («Endou» frente a
// «Mamoru Endo») y las cartas base de inazumo traen el japonés en KANJI, así que
// no había clave común. Resulta que no hacía falta: la propia wiki guarda el
// nombre del doblaje y el elemento en el infobox de cada personaje.
//
//   node scripts/build-inazuma-roster.mjs
//
// Escribe `scripts/.cache/inazuma-roster.json`. NO toca `players.ts`.
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'scripts', '.cache', 'inazuma-roster.json')
const API = 'https://inazuma-eleven.fandom.com/api.php'
const UA = 'pokelink-roster-builder/2.0 (script de un solo uso)'

/** Página de la wiki de cada instituto. */
const TEAMS = {
  raimon: ['Raimon'],
  occult: ['Occult'],
  otaku: ['Otaku', 'Otaku Gakuen'],
  wild: ['Wild', 'Yakuza Gakuen'],
  shuriken: ['Sengoku Igajima', 'Shuriken'],
  farm: ['Nose', 'Farm'],
  kirkwood: ['Kidokawa Seishuu'],
  royal: ['Teikoku Gakuen'],
  zeus: ['Zeus'],
}

/** Los cuatro elementos, como los escribe la wiki en inglés. */
const ELEMENT = {
  fire: 'fuego', wood: 'bosque', forest: 'bosque',
  wind: 'aire', air: 'aire',
  earth: 'montana', mountain: 'montana',
}
const POSITION = { gk: 'POR', df: 'DEF', mf: 'MED', fw: 'DEL' }

/**
 * Excepciones a mano. Son los casos en los que la wiki no se deja leer: la
 * página del apellido es de desambiguación PERO contiene un `name_dub` (así que
 * pasa el filtro) o su infobox no trae `position`/`element`. Son cinco de 126;
 * el resto sale de la wiki tal cual.
 */
const OVERRIDES = {
  Endou: { name: 'Mark Evans', position: 'POR', element: 'montana' },
  Kazemaru: { position: 'DEF', element: 'aire' },
  Tamagorou: { position: 'DEF', element: 'aire' },
  Gojou: { position: 'DEF', element: 'bosque' },
  Sakiyama: { position: 'MED', element: 'bosque' },
}

const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const cache = new Map()
async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`
  if (cache.has(url)) return cache.get(url)
  const r = await fetch(url, { headers: { 'User-Agent': UA } })
  const j = await r.json()
  cache.set(url, j)
  return j
}

async function wikitext(title) {
  const j = await api({ action: 'parse', page: title, prop: 'wikitext', redirects: '1' })
  return j?.parse?.wikitext?.['*'] ?? null
}

async function teamRoster(pages) {
  for (const page of pages) {
    const wt = await wikitext(page)
    if (!wt) continue
    const m = wt.match(/\|p\d+=([^\n|}]+)/g)
    if (m && m.length >= 8) {
      // Se quedan solo los del juego original: la tabla mezcla varias entregas.
      const names = [...new Set(m.map((x) => x.split('=')[1].trim()).filter(Boolean))]
      return { page, names }
    }
  }
  return null
}

/** Resuelve un nombre corto («Kazemaru») a su página completa. */
async function resolvePage(short) {
  const direct = await wikitext(short)
  // OJO: hay que comprobar que la página directa sea una FICHA. `Endou`,
  // `Kazemaru` o `Tamagorou` existen como páginas de desambiguación por
  // apellido, y quedarse con ellas dejaba sin datos justo a los titulares
  // (entre ellos el portero del Raimon, que rompía el once entero).
  if (direct && /\|name_dub\s*=/.test(direct)) return { title: short, wt: direct }
  const j = await api({ action: 'query', list: 'search', srsearch: short, srnamespace: '0', srlimit: '5' })
  for (const hit of j?.query?.search ?? []) {
    if (!hit.title.toLowerCase().startsWith(short.toLowerCase().split('_')[0])) continue
    const wt = await wikitext(hit.title)
    if (wt && /\|name_dub\s*=/.test(wt)) return { title: hit.title, wt }
  }
  return null
}

/**
 * Lee TODAS las apariciones de un campo del infobox. Hay fichas donde `|position=`
 * aparece más de una vez y la primera trae basura (el nombre del personaje, por
 * ejemplo `|position= Kazemaru`), así que el que llama se queda con la primera
 * que sepa interpretar en lugar de con la primera a secas.
 */
function fields(wt, key) {
  const re = new RegExp('\\|\\s*' + key + '\\s*=\\s*([^\\n|]+)', 'gi')
  const out = []
  let m
  while ((m = re.exec(wt))) out.push(m[1].replace(/\[\[|\]\]|'''/g, '').trim())
  return out
}

const field = (wt, key) => fields(wt, key)[0] ?? null

/** Primera posición reconocible: acepta «DF», «DF,MF», «MF/FW»… */
function parsePosition(values) {
  for (const v of values) {
    for (const tok of v.toUpperCase().split(/[^A-Z]+/)) {
      if (POSITION[tok.toLowerCase()]) return POSITION[tok.toLowerCase()]
    }
  }
  return null
}

/** Primer elemento reconocible. */
function parseElement(values) {
  for (const v of values) {
    const key = v.toLowerCase().split(/[^a-z]+/).find((t) => ELEMENT[t])
    if (key) return ELEMENT[key]
  }
  return null
}

async function main() {
  await mkdir(dirname(OUT), { recursive: true })
  const out = {}
  const missing = []

  for (const [teamId, pages] of Object.entries(TEAMS)) {
    const roster = await teamRoster(pages)
    if (!roster) { console.log(`x ${teamId}: la wiki no tiene plantilla`); continue }
    out[teamId] = []
    for (const short of roster.names) {
      if (out[teamId].length >= 14) break
      const page = await resolvePage(short)
      if (!page) { missing.push(`${teamId}/${short}`); continue }
      const dub = field(page.wt, 'name_dub')
      if (!dub) { missing.push(`${teamId}/${short}`); continue }
      const ov = OVERRIDES[short] ?? {}
      // Los nombres vienen a veces con marcas de lista del wikitext («*Axel Blaze»).
      const name = (ov.name ?? dub).replace(/^[*#:;\s]+/, '').trim()
      out[teamId].push({
        wiki: page.title,
        name,
        id: slugify(name),
        element: ov.element ?? parseElement(fields(page.wt, 'element')),
        position: ov.position ?? parsePosition(fields(page.wt, 'position')),
      })
    }
    const full = out[teamId].filter((p) => p.element).length
    console.log(`${teamId.padEnd(9)} ${String(out[teamId].length).padStart(2)} jugadores, ${full} con elemento`)
  }

  await writeFile(OUT, JSON.stringify(out, null, 2), 'utf8')
  const all = Object.values(out).flat()
  console.log('')
  console.log(`${all.length} jugadores -> ${OUT}`)
  console.log(`  con elemento: ${all.filter((p) => p.element).length}`)
  console.log(`  con posicion: ${all.filter((p) => p.position).length}`)
  if (missing.length) console.log(`Sin ficha (${missing.length}): ${missing.slice(0, 20).join(', ')}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
