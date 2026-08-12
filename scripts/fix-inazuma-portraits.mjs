// Repara los retratos CON FONDO: los cambia por arte transparente de la wiki.
//
//   node scripts/fix-inazuma-portraits.mjs
//
// El fetch normal se queda con la imagen principal de la página del personaje
// (`pageimages`). Para los protagonistas eso es un render transparente, pero
// para los secundarios (temporada 2, Alius) suele ser una CAPTURA del anime
// con fondo — y en las cartas cantaba muchísimo.
//
// Este script detecta los retratos sin canal alfa (o de cuerpo entero) y busca
// en la MISMA página del personaje un fichero mejor. El orden importa: los
// SPRITES «(VR)/(X)» son bustos 256px con alfa garantizada; los renders 3D en
// varias licencias vienen con el fondo cocido. Se descarga con `format=png`
// (el CDN de Fandom re-codifica a WebP si no se lo pides explícitamente).
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, 'public', 'inazuma', 'players')
const SOURCE = join(ROOT, 'src', 'data', 'inazuma', 'players.ts')
const API = 'https://inazuma-eleven.fandom.com/api.php'
const UA = 'pokelink-inazuma-portraits/2.0 (reparador de fondos)'

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

/** ¿El PNG tiene transparencia? (colorType con alfa o chunk tRNS) */
function pngHasAlpha(buf) {
  if (buf.slice(1, 4).toString() !== 'PNG') return false
  const colorType = buf[25]
  if (colorType === 6 || colorType === 4) return true
  return buf.includes('tRNS')
}

/**
 * ¿Este fichero local necesita arreglo? Sin alfa (webp/jpeg/png opaco) o de
 * CUERPO ENTERO (mucho más alto que ancho): los retratos del modo son bustos,
 * y un render de cuerpo entero recortado al cuadrado desentona.
 */
function needsFix(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return true // jpeg
  if (buf.slice(0, 4).toString('hex') === '52494646') return true // riff/webp
  if (!pngHasAlpha(buf)) return true
  const w = buf.readUInt32BE(16)
  const h = buf.readUInt32BE(20)
  return h > w * 1.45
}

/** Página del personaje, por búsqueda del nombre del doblaje. */
async function findPage(name) {
  const direct = await api({ action: 'parse', page: name, prop: 'wikitext', redirects: '1' }).catch(() => null)
  if (direct?.parse?.title && /\|name_dub\s*=/.test(direct.parse.wikitext?.['*'] ?? '')) return direct.parse.title
  const j = await api({ action: 'query', list: 'search', srsearch: name, srlimit: '1' })
  return j?.query?.search?.[0]?.title ?? null
}

/**
 * Candidatos a retrato transparente, mejores primero. Los renders 3D y los
 * cut-in de los juegos modernos son arte limpio sin fondo.
 */
function rankCandidates(files) {
  const score = (t) => {
    // Los SPRITES (VR/X) y los cut-in van PRIMERO: son bustos 256px+ SIEMPRE
    // con canal alfa. Los renders 3D son preciosos pero en varias licencias
    // vienen con el fondo cocido (PNG colorType 2) y no sirven.
    if (/sprite \(VR\)/i.test(t)) return 0
    if (/cut-?in/i.test(t)) return 1
    if (/sprite \(X\)/i.test(t)) return 2
    if (/3D \((VR|X)\) \(1\)/i.test(t)) return 3
    if (/3D \(1\)/i.test(t)) return 4
    if (/3D/i.test(t)) return 5
    return 99
  }
  return files
    .filter((t) => score(t) < 99 && /\.png$/i.test(t))
    .sort((a, b) => score(a) - score(b))
}

/** Descarga un File: de la wiki como PNG de verdad. */
async function download(fileTitle) {
  const j = await api({ action: 'query', titles: fileTitle, prop: 'imageinfo', iiprop: 'url|size|mime' })
  const pages = j?.query?.pages ?? {}
  for (const k of Object.keys(pages)) {
    const ii = pages[k]?.imageinfo?.[0]
    if (!ii || ii.width < 80) continue
    const res = await fetch(`${ii.url.split('?')[0]}?format=png`, { headers: { 'User-Agent': UA } })
    if (!res.ok) continue
    return Buffer.from(await res.arrayBuffer())
  }
  return null
}

async function main() {
  const src = await readFile(SOURCE, 'utf8')
  const roster = [...src.matchAll(/id: '([^']+)', name: '([^']+)'/g)].map((m) => ({ id: m[1], name: m[2] }))
  const files = new Set(await readdir(DIR))

  const broken = []
  for (const p of roster) {
    if (!files.has(`${p.id}.png`)) continue
    const buf = await readFile(join(DIR, `${p.id}.png`))
    if (needsFix(buf)) broken.push(p)
  }
  console.log(`${broken.length} retratos con fondo o sin alfa`)

  let fixed = 0
  const left = []
  for (const p of broken) {
    try {
      const page = await findPage(p.name)
      if (!page) { left.push(p.name); continue }
      const imgs = await api({ action: 'query', prop: 'images', titles: page, imlimit: '100', redirects: '1' })
      const pages = imgs?.query?.pages ?? {}
      const all = Object.values(pages).flatMap((pg) => (pg.images ?? []).map((i) => i.title))
      const candidates = rankCandidates(all)

      let done = false
      for (const c of candidates.slice(0, 8)) {
        const buf = await download(c)
        if (buf && pngHasAlpha(buf)) {
          await writeFile(join(DIR, `${p.id}.png`), buf)
          console.log(`  ✓ ${p.name} ← ${c.replace('File:', '')}`)
          fixed++
          done = true
          break
        }
        await new Promise((r) => setTimeout(r, 120))
      }
      if (!done) left.push(p.name)
    } catch (err) {
      left.push(`${p.name} (${err.message})`)
    }
    await new Promise((r) => setTimeout(r, 200))
  }

  console.log(`\n${fixed} reparados · ${left.length} sin alternativa transparente`)
  if (left.length) console.log('  ' + left.join(', '))
}

main().catch((err) => { console.error(err); process.exit(1) })
