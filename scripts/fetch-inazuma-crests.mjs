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
  // El nombre JAPONÉS primero: es el que tiene el emblema (VR) a 512×512.
  raimon: ['Raimon'],
  occult: ['Occult'],
  otaku: ['Otaku Gakuen', 'Otaku'],
  wild: ['Yakuza Gakuen', 'Wild'],
  shuriken: ['Sengoku Igajima', 'Shuriken'],
  farm: ['Nose', 'Farm'],
  kirkwood: ['Kidokawa Seishuu', 'Kirkwood'],
  royal: ['Teikoku Gakuen', 'Royal Academy'],
  zeus: ['Zeus'],
  // Equipos EXTRA (temporada 2 y Academia Alius): no juegan el cuadro, pero
  // sus jugadores salen en el ojeador y su escudo acompaña al nombre.
  kfc: ['Inazuma KFC'],
  oumihara: ['Oumihara'],
  mikage: ['Mikage Sennou'],
  manyuuji: ['Manyuuji'],
  yokato: ['Yokato'],
  'gemini-storm': ['Gemini Storm'],
  epsilon: ['Epsilon'],
  'diamond-dust': ['Diamond Dust'],
  prominence: ['Prominence'],
  genesis: ['Genesis', 'The Genesis'],
  chaos: ['Chaos'],
  // Saga FFI (IE3): las selecciones del mundial.
  'inazuma-japan': ['Inazuma Japan'],
  'big-waves': ['Big Waves'],
  'desert-lion': ['Desert Lion'],
  'fire-dragon': ['Fire Dragon (team)', 'Fire Dragon'],
  'the-empire': ['The Empire'],
  'knights-of-queen': ['Knights of Queen'],
  unicorn: ['Unicorn (team)', 'Unicorn'],
  orpheus: ['Orpheus (team)', 'Orpheus'],
  'little-gigant': ['Little Gigant'],
  // Equipos de reclutamiento (fichables sueltos).
  windies: ['The Windies'],
  'extra-stars': ['Extra Stars'],
  'kage-no-hero': ['Kage no Hero'],
  // IE1: institutos del Football Frontier.
  kasamino: ['Kasamino'],
  senbayama: ['Senbayama'],
  'shuuyou-meito': ['Shuuyou Meito Gakuen', 'Shuuyou Meito'],
  'the-fires': ['The Fires'],
  'the-mountains': ['The Mountains'],
  'the-woods': ['The Woods'],
  // IE2: Instituto Alius y Emperadores Oscuros.
  hakuren: ['Hakuren'],
  'shin-teikoku': ['Shin Teikoku Gakuen'],
  'dark-emperors': ['Dark Emperors'],
  'epsilon-kai': ['Epsilon Kai', 'Epsilon'],
  // IE3: selecciones del Mundial.
  'the-kingdom': ['The Kingdom'],
  'rose-griffon': ['Rose Griffon'],
  brockenborg: ['Brockenborg'],
  ogre: ['Ogre'],
  'neo-japan': ['Neo Japan'],
  gaia: ['Gaia (team)', 'Gaia'],
  // IEVR (Victory Road): el Football Frontier de la nueva generación.
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
  'hakuren-vr': ['Hakuren (Victory Road)', 'Hakuren'],
  // IEGO (Inazuma Eleven GO): el Holy Road.
  'raimon-go': ['Raimon (GO)', 'Raimon'],
  mannouzaka: ['Mannouzaka'],
  tengawara: ['Tengawara'],
  'gassan-kunimitsu': ['Gassan Kunimitsu'],
  'hakuren-go': ['Hakuren (GO)', 'Hakuren'],
  'kaiou-gakuen': ['Kaiou Gakuen'],
  'genei-gakuen': ['Genei Gakuen'],
  'arakumo-gakuen': ['Arakumo Gakuen'],
  seidouzan: ['Seidouzan'],
  dragonlink: ['Dragonlink'],
  'kidokawa-go': ['Kidokawa Seishuu (GO)', 'Kidokawa Seishuu'],
  'unlimited-shining': ['Unlimited Shining'],
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
    // El ORIGINAL (`url`), no `thumburl`: el thumbnailer de Fandom re-codifica
    // a WebP aunque el fichero se llame .png, y el navegador de algunos
    // usuarios no lo pintaba. Los originales son PNG de verdad.
    const src = pages[key]?.imageinfo?.[0]?.url ?? pages[key]?.thumbnail?.source
    if (src) return src
  }
  return null
}

/**
 * El emblema limpio, si existe. Se prueba PRIMERO la versión «(VR)» (Victory
 * Road): son los mismos escudos a 512×512, mientras que los ficheros base de
 * la wiki miden 64×64 — y encima el thumbnailer los servía como WebP diminuto
 * con extensión .png, que era el motivo de que varios «no tuvieran logo».
 */
async function findEmblem(names) {
  const list = Array.isArray(names) ? names : [names]
  // PRIMERO los nombres de fichero EXACTOS de TODOS los alias. El «Fire
  // Dragon» llevaba el escudo equivocado porque la búsqueda a ciegas del
  // primer alias («Fire Dragon (team)», que no existe) se colaba antes que el
  // fichero exacto del segundo («Fire Dragon emblem (VR).png»).
  for (const name of list) {
    for (const title of [
      `File:${name} emblem (VR).png`,
      `File:${name} emblem.png`, `File:${name} Emblem.png`, `File:${name} emblem.jpg`,
    ]) {
      try {
        const j = await api({ action: 'query', titles: title, prop: 'imageinfo', iiprop: 'url', iiurlwidth: String(SIZE) })
        const url = firstThumb(j)
        if (url) return url
      } catch { /* siguiente */ }
    }
  }
  const name = list[0]
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

  // El logo INTERNACIONAL del juego («(RE) English Logo.png», 680×406) para la
  // pantalla de título. El «(IE) Logo.png» es el japonés.
  try {
    const j = await api({ action: 'query', titles: 'File:(RE) English Logo.png', prop: 'imageinfo', iiprop: 'url' })
    const url = firstThumb(j)
    if (url) {
      const res = await fetch(`${url.split('?')[0]}?format=png`, { headers: { 'User-Agent': UA } })
      if (res.ok) {
        await writeFile(join(OUT_DIR, '..', 'logo.png'), Buffer.from(await res.arrayBuffer()))
        console.log('  ✓ logo del juego → public/inazuma/logo.png')
      }
    }
  } catch { console.log('  ✗ logo del juego') }

  const src = await readFile(SOURCE, 'utf8')
  const bracketIds = [...src.matchAll(/id: '([a-z0-9-]+)', name: '([^']+)'/g)].map((m) => m[1])
  // También los equipos que solo existen en el catálogo de jugadores.
  const playersSrc = await readFile(join(ROOT, 'src', 'data', 'inazuma', 'players.ts'), 'utf8')
  const playerTeams = [...new Set([...playersSrc.matchAll(/team: '([a-z0-9-]+)'/g)].map((m) => m[1]))]
  const ids = [...new Set([...bracketIds, ...playerTeams])]

  let ok = 0, skipped = 0
  const missing = []
  for (const id of ids) {
    const dest = join(OUT_DIR, `${id}.png`)
    if (!force && await exists(dest)) { skipped++; continue }
    const names = WIKI_NAME[id] ?? [id]
    try {
      const url = await findEmblem(names)
      if (!url) { missing.push(id); console.log(`  ✗ ${id} — sin escudo`); continue }
      // El CDN de Fandom re-codifica a WebP hagas lo que hagas con los
      // headers; lo único que respeta es el parámetro `format=png` en la URL.
      const res = await fetch(`${url.split('?')[0]}?format=png`, { headers: { 'User-Agent': UA } })
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
