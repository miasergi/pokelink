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

/**
 * Página de la wiki de cada equipo. Los nueve primeros son los institutos del
 * torneo; el resto son equipos EXTRA cuyos jugadores entran solo en el pool de
 * fichajes (ojeador y cazatalentos): los rivales de la segunda temporada y los
 * equipos Alius, que es donde están los fichajes con caché de verdad.
 */
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
  // --- extra: solo fichables ---
  kfc: ['Inazuma KFC'],
  oumihara: ['Oumihara'],
  mikage: ['Mikage Sennou'],
  manyuuji: ['Manyuuji'],
  yokato: ['Yokato'],
  'gemini-storm': ['Gemini Storm'],
  epsilon: ['Epsilon'],
  'diamond-dust': ['Diamond Dust'],
  prominence: ['Prominence'],
  genesis: ['The Genesis', 'Genesis'],
  chaos: ['Chaos'],
  // --- saga FFI (Inazuma Eleven 3): las selecciones del mundial ---
  'inazuma-japan': ['Inazuma Japan'],
  'big-waves': ['Big Waves'],
  'desert-lion': ['Desert Lion'],
  'fire-dragon': ['Fire Dragon'],
  'the-empire': ['The Empire'],
  'knights-of-queen': ['Knights of Queen'],
  unicorn: ['Unicorn (team)', 'Unicorn'],
  orpheus: ['Orpheus (team)', 'Orpheus'],
  'little-gigant': ['Little Gigant'],
  // --- equipos de RECLUTAMIENTO del juego (fichables sueltos: Konpeito,
  //     Yamino Kageto y compañía). Nunca juegan el cuadro: solo nutren el pool.
  windies: ['The Windies'],
  'extra-stars': ['Extra Stars'],
  'kage-no-hero': ['Kage no Hero'],
  // --- IE1: institutos del Football Frontier que faltaban ---
  kasamino: ['Kasamino'],
  senbayama: ['Senbayama'],
  'shuuyou-meito': ['Shuuyou Meito Gakuen', 'Shuuyou Meito'],
  'the-fires': ['The Fires'],
  'the-mountains': ['The Mountains'],
  'the-woods': ['The Woods'],
  // --- IE2: la temporada del Instituto Alius y los Emperadores Oscuros ---
  hakuren: ['Hakuren'],
  'shin-teikoku': ['Shin Teikoku Gakuen'],
  'dark-emperors': ['Dark Emperors'],
  'epsilon-kai': ['Epsilon Kai'],
  // --- IE3: las selecciones del Mundial que faltaban ---
  'the-kingdom': ['The Kingdom'],
  'rose-griffon': ['Rose Griffon'],
  brockenborg: ['Brockenborg'],
  ogre: ['Ogre'],
  'neo-japan': ['Neo Japan'],
  gaia: ['Gaia (team)', 'Gaia'],
  // --- IEVR (Victory Road): los institutos del Football Frontier nuevo ---
  //     OJO: de estos equipos solo se emiten los personajes que DEBUTAN en
  //     Victory Road (ver `VR_ONLY`). Los de IE1-IE3 que reaparecen de
  //     mayores se descartan: no queremos la plantilla repetida con otra cara.
  nagumohara: ['Nagumohara'],
  'ouja-raimon': ['Ouja Raimon'],
  'hokuyou-gakuen': ['Hokuyou Gakuen'],
  'ai-gakuen': ['AI Gakuen'],
  houreikan: ['Houreikan'],
  'ijin-meibundou': ['Ijin Meibundou'],
  'keizen-arashiyama': ['Keizen Arashiyama'],
  nishinomiya: ['Nishinomiya'],
  'senjutsu-no-teikoku': ['Senjutsu no Teikoku'],
  'toufuu-ikokukan': ['Toufuu Ikokukan'],
  'hakuren-vr': ['Hakuren (Victory Road)'],
}

/**
 * Equipos de VICTORY ROAD: de ellos SOLO se emite gente que debuta en ese
 * juego. Victory Road pasa en el futuro y reaparecen muchos personajes de
 * IE1-IE3 ya mayores; meterlos sería tener la misma plantilla dos veces con
 * otra cara, así que se filtran por su `debut_game`.
 */
const VR_ONLY = new Set([
  'nagumohara', 'ouja-raimon', 'hokuyou-gakuen', 'ai-gakuen', 'houreikan',
  'ijin-meibundou', 'keizen-arashiyama', 'nishinomiya', 'senjutsu-no-teikoku',
  'toufuu-ikokukan', 'hakuren-vr',
])

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
  // Alius: fichas sin infobox completo en la wiki, datos del juego.
  Desarm: { position: 'POR', element: 'montana' },
  Zel: { element: 'fuego' },
  Gran: { position: 'DEL' },
  // FFI: la ficha de Fidio resuelve a «Paolo Bianchi (game)», sin elemento y
  // con el name_dub sucio. Datos del juego: capitán del Orpheus, aire.
  Fidio: { name: 'Paolo Bianchi', position: 'DEL', element: 'aire' },
}

/**
 * Nombres cortos que la resolución directa manda a la página EQUIVOCADA: la
 * wiki tiene un «Lion» y un «Diver» de la saga Orion (posterior) con ficha
 * completa, y se tragaban el sitio de los clásicos de IE1/IE2 (Shishiou Kou
 * y Taira Moguru). Se resuelven a mano ANTES de preguntar a la wiki.
 */
const PAGE_ALIAS = {
  Lion: 'Shishiou Kou',
  Diver: 'Taira Moguru',
}

const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/**
 * Miembros FORZADOS por equipo: gente que la plantilla del wikitext omite pero
 * que canónicamente juega ahí. El caso que lo motivó: la Royal olvida a Kidou
 * (Jude Sharp) y sin él dos de los tres combos del modo eran imposibles.
 */
const FORCED_MEMBERS = {
  royal: ['Kidou'],
  // El PROTAGONISTA de Victory Road: su ficha de la wiki lo deja en un
  // «unnamed youth team» y la plantilla de Nagumohara no lo lista, así que el
  // crawler lo perdía. Su equipo en el juego es Nagumohara.
  nagumohara: ['Endou Haru'],
}

/**
 * Técnicas del personaje según su ficha, en orden de PRIMERA aparición (que en
 * los movesets va de la carta básica a la rara: es la progresión canónica).
 */
function extractHissatsu(wt) {
  const out = []
  const seen = new Set()
  const re = /\{\{H(?:issatsu nav)?\|[A-Z]{2}\|([^}|]+)/g
  let m
  while ((m = re.exec(wt))) {
    const name = m[1].trim()
    if (!seen.has(name)) { seen.add(name); out.push(name) }
  }
  return out
}

/**
 * LAS SUPERTÉCNICAS DE VERDAD DE CADA JUGADOR.
 *
 * En la mayoría de fichas el apartado de técnicas es solo la plantilla
 * `{{MainlineMovesets|<jugador>}}`, así que rascando el wikitexto de la página
 * no salía NADA (a Edgar Partinus le sacábamos su Keshin y ni rastro de
 * Excalibur). Los movesets viven de verdad en `Module:Moveset/Users`, una
 * tabla Lua `Jugador={"Tecnica1","Tecnica2",…}` con TODA la saga dentro.
 * Se baja UNA vez y se consulta por el nombre corto de la página.
 */
let movesetTable = null
async function movesets() {
  if (movesetTable) return movesetTable
  movesetTable = new Map()
  const j = await api({ action: 'query', titles: 'Module:Moveset/Users', prop: 'revisions', rvprop: 'content', rvslots: 'main' })
  const page = Object.values(j?.query?.pages ?? {})[0]
  const lua = page?.revisions?.[0]?.slots?.main?.['*']
  if (!lua) { console.log('  ! no se pudo leer Module:Moveset/Users') ; return movesetTable }
  // `Nombre={"A","B",…}` — el nombre puede ir entre corchetes y comillas.
  const re = /(?:\[")?([A-Za-z0-9_'. -]+?)(?:"\])?\s*=\s*\{([^}]*)\}/g
  let m
  while ((m = re.exec(lua))) {
    const who = m[1].trim()
    const list = [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1])
    if (list.length) movesetTable.set(who, list)
  }
  console.log(`  movesets de la wiki: ${movesetTable.size} jugadores`)
  return movesetTable
}

/**
 * Los ids del módulo van en CamelCase sin espacios ni signos («FireTornado»),
 * y el catálogo los quiere legibles («Fire Tornado») para poder casarlos por
 * nombre. Se separan las mayúsculas respetando las siglas y los números.
 */
function prettyMove(id) {
  return id
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([A-Za-z])([0-9])/g, '$1 $2')
    .trim()
}

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
  if (PAGE_ALIAS[short]) {
    const wt = await wikitext(PAGE_ALIAS[short])
    if (wt && /\|name_dub\s*=/.test(wt)) return { title: PAGE_ALIAS[short], wt }
  }
  const direct = await wikitext(short)
  // OJO: hay que comprobar que la página directa sea una FICHA. `Endou`,
  // `Kazemaru` o `Tamagorou` existen como páginas de desambiguación por
  // apellido, y quedarse con ellas dejaba sin datos justo a los titulares
  // (entre ellos el portero del Raimon, que rompía el once entero).
  if (direct && /\|name_dub\s*=/.test(direct)) return { title: short, wt: direct }
  // El alias sin sufijo («Burn_FD» → «Burn») suele ser un redirect al
  // personaje; `wikitext` ya sigue redirects.
  const base = short.split('_')[0]
  if (base !== short) {
    const redir = await wikitext(base)
    if (redir && /\|name_dub\s*=/.test(redir)) return { title: base, wt: redir }
  }
  const j = await api({ action: 'query', list: 'search', srsearch: base, srnamespace: '0', srlimit: '5' })
  const hits = j?.query?.search ?? []
  for (const hit of hits) {
    if (!hit.title.toLowerCase().startsWith(base.toLowerCase())) continue
    const wt = await wikitext(hit.title)
    if (wt && /\|name_dub\s*=/.test(wt)) return { title: hit.title, wt }
  }
  // Segunda pasada RELAJADA, para los alias coreanos del FFI: el corto
  // «Changsoo» apunta a la página «Choi Chang-soo» — no empieza igual, pero
  // normalizando (solo letras) el título CONTIENE el alias.
  const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '')
  for (const hit of hits) {
    if (!norm(hit.title).includes(norm(base))) continue
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
  // `--only equipo1,equipo2`: re-crawlea SOLO esos equipos y fusiona el
  // resultado con el cache existente (para reparar un equipo sin pagar la
  // pasada completa).
  const onlyArg = process.argv.find((a) => a.startsWith('--only'))
  const only = onlyArg ? new Set((process.argv[process.argv.indexOf(onlyArg) + 1] ?? '').split(',')) : null
  let out = {}
  if (only) {
    try { out = JSON.parse(await (await import('node:fs/promises')).readFile(OUT, 'utf8')) } catch { /* vacío */ }
  }
  const missing = []
  /** Veteranos de IE1-IE3 descartados de los equipos de Victory Road. */
  const skippedVeterans = []

  for (const [teamId, pages] of Object.entries(TEAMS)) {
    if (only && !only.has(teamId)) continue
    const roster = await teamRoster(pages)
    if (!roster) { console.log(`x ${teamId}: la wiki no tiene plantilla`); continue }
    out[teamId] = []
    for (const short of [...(FORCED_MEMBERS[teamId] ?? []), ...roster.names]) {
      if (out[teamId].length >= 14) break
      const page = await resolvePage(short)
      if (!page) { missing.push(`${teamId}/${short}`); continue }
      const dub = field(page.wt, 'name_dub')
      if (!dub) { missing.push(`${teamId}/${short}`); continue }
      // Victory Road: fuera los que vienen de otro juego (los de siempre,
      // crecidos). Solo entra quien DEBUTA aquí.
      if (VR_ONLY.has(teamId)) {
        // Solo se descarta a quien DECLARE otro juego. Que no haya campo de
        // debut NO es motivo: media plantilla del Kaiou Gakuen (los piratas)
        // son personajes originales de Victory Road sin esa ficha rellena, y
        // el filtro se los llevaba por delante.
        const debut = page.wt.match(/debut_game[\s\S]{0,160}/i)?.[0] ?? ''
        const otroJuego = /\{\{Media\|games\|(IE|IE2|IE3|GO|CS|GAL|ARES|ORION)\}\}/i.test(debut)
        if (otroJuego && !/\{\{Media\|games\|VR/i.test(debut)) {
          skippedVeterans.push(`${teamId}/${dub}`); continue
        }
      }
      const ov = OVERRIDES[short] ?? {}
      // Los nombres vienen a veces con marcas de lista del wikitext («*Axel Blaze»).
      const name = (ov.name ?? dub).replace(/^[*#:;\s]+/, '').trim()
      out[teamId].push({
        wiki: page.title,
        name,
        id: slugify(name),
        element: ov.element ?? parseElement(fields(page.wt, 'element')),
        position: ov.position ?? parsePosition(fields(page.wt, 'position')),
        // Sus técnicas CANÓNICAS, en orden de aparición en la ficha: la wiki
        // las lista con plantillas {{H|SH|Fire Tornado}} (los movesets de los
        // juegos). De aquí salen las cadenas características verdaderas.
        // El moveset REAL del módulo manda; lo rascado de la ficha queda de
        // apoyo (algunas páginas sí listan técnicas a mano).
        hissatsu: [
          ...((await movesets()).get(page.title.split('/')[0]) ?? []).map(prettyMove),
          ...extractHissatsu(page.wt),
        ].filter((v, i, a) => a.indexOf(v) === i),
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
  if (skippedVeterans.length) {
    console.log(`Veteranos de IE1-IE3 descartados de Victory Road (${skippedVeterans.length}): ${skippedVeterans.slice(0, 25).join(', ')}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
