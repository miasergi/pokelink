// Los ESCENARIOS de los tramos del rogue: un fondo de los propios juegos por
// ronda Y POR SAGA, con la progresión de cada historia (la ribera del río en
// la clásica, la caravana en Alius, la isla Liocott en el FFI, el Camino
// Sagrado en GO y los estadios virtuales en VR).
//
//   node scripts/fetch-inazuma-zones.mjs [--force]
//
// Guarda en `public/inazuma/zones/<saga>-<i>.png` (i = 0-7, una por ronda).
// Muchas capturas de los juegos y cartelas del anime llevan el nombre del
// estadio QUEMADO en la franja inferior: esas entradas llevan `crop` y se les
// recorta ese % de abajo con un canvas de playwright antes de guardar.
// Si alguno falta, la cabecera del mapa pinta su gradiente de siempre: nada
// depende de esto.
import { mkdir, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'inazuma', 'zones')
const API = 'https://inazuma-eleven.fandom.com/api.php'
const UA = 'pokelink-inazuma-zones/1.0 (script de un solo uso)'

/**
 * Ocho escenarios por saga, en el orden de las rondas: Ronda 1-3,
 * Dieciseisavos, Octavos, Cuartos, Semifinal y Final. String, o
 * `[titulo, cropInferior]` si hay que recortar la franja del texto.
 */
const ZONES = {
  // La clásica: de la ribera del río al estadio del Football Frontier.
  ff: [
    'File:Riverbank Ground (GO).png',            // la ribera del río
    'File:Inazuma Town.png',                     // la ciudad Inazuma
    'File:(IE (001)) Steel Tower.png',           // la torre de metal
    ['File:Teikoku Stadium (Ares).png', 0.3],   // el estadio de la Royal
    ['File:Football Frontier of Fierce Fights Stadium.png', 0.3],
    ['File:(AT) Zeus Junior High Stadium.png', 0.26], // el territorio del Zeus
    'File:(IE (024)) Zeus Stadium.png',          // el olimpo del Zeus
    'File:Football Frontier Stadium.png',        // la gran final
  ],
  // Alius: el viaje de la caravana y los alienígenas.
  alius: [
    'File:Inazuma Town.png',                     // la ciudad, amenazada
    'File:Inazuma Caravan.png',                  // la caravana Inazuma
    'File:Ohisama En.png',                       // el orfanato
    'File:Hakuren.png',                          // la nieve del norte
    'File:Inazuma Town Wii.png',                 // la gira por el país
    "File:(OC (002)) Sun Garden's rooftop.png",  // el secreto del Sun Garden
    ['File:Snowland Stadium.png', 0.3],         // la fortaleza helada
    'File:(IE (060)) Aliea Gakuen.png',          // la academia alienígena
  ],
  // FFI: la isla Liocott y sus estadios del mundial.
  ffi: [
    'File:Liocott Island.png',                   // la llegada a la isla
    'File:Liocott Island Japan Area.png',        // el barrio japonés
    'File:Condor Stadium.png',
    'File:Wildcat Stadium.png',
    ['File:Sea Snake Stadium.png', 0.3],
    'File:Peafowl Stadium.png',
    'File:Titanic Stadium.png',
    'File:Football Frontier Stadium.png',        // la gran final
  ],
  // GO: el Camino Sagrado y sus estadios.
  go: [
    'File:(GO (001)) Steel Tower.jpg',           // la torre, diez años después
    ['File:(GO) Raimon Stadium.png', 0.3],      // el campo del insti
    ['File:Teikoku Stadium (GO).png', 0.3],     // el estadio de la Royal
    ['File:(GO (009)) Tengawara Junior High School.png', 0.3], // el primer rival
    'File:(GO (019)) Kaiou Stadium.png',         // la fortaleza del Kaiou
    'File:(GO (022)) Russian Roulette Stadium.png', // la pirámide de láseres
    ['File:Snowland Stadium.png', 0.3],         // el cañón de hielo
    ['File:Holy Road Stadium.png', 0.3],        // la final del Camino Sagrado
  ],
  // VR: los estadios virtuales de Victory Road.
  vr: [
    ['File:(VR) Kizuna Town.png', 0.12],         // la ciudad de los vínculos
    'File:(VR) Backstreet Ground.png',
    'File:(VR) Townspeople Stadium.png',
    'File:(VR) BB Stadium.png',
    'File:(VR) Spacetime Loophole Stadium.png',
    'File:(VR) Moscow at Night Route Bay Main Stadium.png',
    'File:(VR) Astro Ray Stadium.png',
    'File:(VR) Football Frontier Stadium.png',   // la gran final virtual
  ],
}

const force = process.argv.includes('--force')

async function exists(p) { try { await access(p); return true } catch { return false } }

/** Recorta el % inferior de un PNG con un canvas (playwright, como siempre). */
async function cropBottom(browser, buf, frac) {
  const page = await browser.newPage()
  try {
    const dataUrl = `data:image/png;base64,${buf.toString('base64')}`
    const out = await page.evaluate(async (args) => {
      const img = new Image()
      await new Promise((ok, ko) => { img.onload = ok; img.onerror = ko; img.src = args.src })
      const h = Math.round(img.naturalHeight * (1 - args.frac))
      const c = document.createElement('canvas')
      c.width = img.naturalWidth; c.height = h
      c.getContext('2d').drawImage(img, 0, 0)
      return c.toDataURL('image/png')
    }, { src: dataUrl, frac })
    return Buffer.from(out.split(',')[1], 'base64')
  } finally {
    await page.close()
  }
}

async function main() {
  await mkdir(OUT, { recursive: true })
  let browser = null
  for (const [saga, files] of Object.entries(ZONES)) {
    for (let i = 0; i < files.length; i++) {
      const [title, crop] = Array.isArray(files[i]) ? files[i] : [files[i], 0]
      const dest = join(OUT, `${saga}-${i}.png`)
      if (!force && await exists(dest)) { console.log(`  · ${saga}-${i} ya estaba`); continue }
      try {
        const url = `${API}?${new URLSearchParams({
          action: 'query', titles: title, prop: 'imageinfo', iiprop: 'url', iiurlwidth: '512', format: 'json',
        })}`
        const j = await (await fetch(url, { headers: { 'User-Agent': UA } })).json()
        const page = Object.values(j?.query?.pages ?? {})[0]
        const src = page?.imageinfo?.[0]?.thumburl ?? page?.imageinfo?.[0]?.url
        if (!src) { console.log(`  ✗ ${saga}-${i}: sin imagen (${title})`); continue }
        const res = await fetch(`${src.split('?')[0]}?format=png`, { headers: { 'User-Agent': UA } })
        if (!res.ok) throw new Error(String(res.status))
        let buf = Buffer.from(await res.arrayBuffer())
        if (crop > 0) {
          if (!browser) browser = await (await import('playwright')).chromium.launch()
          buf = await cropBottom(browser, buf, crop)
        }
        await writeFile(dest, buf)
        console.log(`  ✓ ${saga}-${i} ← ${title.replace('File:', '')}${crop ? ` (recorte ${crop})` : ''}`)
      } catch (err) {
        console.log(`  ✗ ${saga}-${i}: ${err.message}`)
      }
      await new Promise((r) => setTimeout(r, 300))
    }
  }
  if (browser) await browser.close()
}

await main()
