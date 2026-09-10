// Localidades REALES de los juegos, tile a tile, con Node puro.
//
// Renderiza pueblos y ciudades de Kanto (FireRed), Johto (Crystal) y Hoenn
// (Emerald) a partir de los datos de los descompilados de pret
// (github.com/pret/pokefirered · pokecrystal · pokeemerald): tiles de 8×8,
// metatiles, paletas y el layout del mapa. Sale un PNG a resolución NATIVA
// (1 px = 1 px del juego) en public/routes/tiles/<escena>.png; la UI lo escala
// con `image-rendering: pixelated`, así que se ve como en la consola y no como
// una ilustración que se emborrona al ampliar. Proyecto de fan sin ánimo de
// lucro: los tiles son de Game Freak / Nintendo.
//
//   node scripts/render-tilemaps.mjs                 # todas las escenas
//   node scripts/render-tilemaps.mjs pewter azalea   # solo algunas
//
// Los ficheros fuente se cachean en node_modules/.cache/pret (no se suben).
//
// GBA (FireRed/Emerald): el mapa es una rejilla de METATILES de 16×16, cada
// uno = 8 tiles (4 de capa inferior + 4 de capa superior, color 0 = hueco), y
// cada tile lleva su paleta de 16 colores (bits 12-15), volteos (bits 10-11) y
// número de tile (bits 0-9). Un layout combina un tileset PRIMARIO (general)
// y uno SECUNDARIO (el de la ciudad): los ids por debajo del umbral son del
// primario y el resto del secundario.
//
// GBC (Crystal): bloques de 32×32 = 4×4 tiles de 8×8 a 2 bpp (4 colores); la
// paleta de cada tile sale del "palette map" del tileset (8 paletas: gris,
// rojo, verde, agua, amarillo, marrón, TEJADO y texto) y el color del TEJADO
// cambia según el grupo de mapas (por eso Violeta tiene tejados morados y
// Azalea verdes). Usamos las paletas de DÍA.
import fs from 'node:fs'
import path from 'node:path'
import { decodePngIndices, encodePng } from './png-cutout.mjs'

const CACHE = path.resolve('node_modules/.cache/pret')
const OUT = path.resolve('public/routes/tiles')

async function fetchFile(repo, p) {
  const dst = path.join(CACHE, repo, p)
  if (fs.existsSync(dst) && fs.statSync(dst).size > 0) return fs.readFileSync(dst)
  const url = `https://raw.githubusercontent.com/pret/${repo}/master/${p}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} al bajar ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  fs.writeFileSync(dst, buf)
  return buf
}

const newImage = (width, height) => ({ width, height, data: new Uint8Array(width * height * 4) })

function put(img, x, y, [r, g, b]) {
  const o = (y * img.width + x) * 4
  img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255
}

// ---------------------------------------------------------------------------
// GBA
// ---------------------------------------------------------------------------
const GBA = {
  pokefirered: { tilesInPrimary: 640, metatilesInPrimary: 640, palsInPrimary: 7, palsTotal: 13 },
  pokeemerald: { tilesInPrimary: 512, metatilesInPrimary: 512, palsInPrimary: 6, palsTotal: 13 },
}

/** JASC-PAL → [[r,g,b] × 16]. */
function parseJasc(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim())
  if (lines[0] !== 'JASC-PAL') throw new Error('paleta que no es JASC-PAL')
  const n = Number(lines[2])
  return lines.slice(3, 3 + n).map((l) => l.split(/\s+/).map(Number))
}

/** gTileset_PewterCity → pewter_city (nombre de carpeta en el descompilado). */
const tilesetDir = (label) => label.replace(/^gTileset_/, '').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()

const gbaTilesets = new Map()
async function loadGbaTileset(repo, kind, label, palIdx) {
  const key = `${repo}/${kind}/${label}`
  if (gbaTilesets.has(key)) return gbaTilesets.get(key)
  const dir = `data/tilesets/${kind}/${tilesetDir(label)}`
  const png = decodePngIndices(await fetchFile(repo, `${dir}/tiles.png`))
  if (png.width !== 128) throw new Error(`${dir}/tiles.png no tiene 16 tiles de ancho`)
  const metatiles = await fetchFile(repo, `${dir}/metatiles.bin`)
  const pals = {}
  for (const i of palIdx) {
    pals[i] = parseJasc((await fetchFile(repo, `${dir}/palettes/${String(i).padStart(2, '0')}.pal`)).toString('utf8'))
  }
  const ts = { png, metatiles, pals }
  gbaTilesets.set(key, ts)
  return ts
}

function drawGbaTile(img, dx, dy, png, tid, colors, xflip, yflip) {
  const tx = (tid % 16) * 8
  const ty = Math.floor(tid / 16) * 8
  if (ty + 8 > png.height) return
  for (let py = 0; py < 8; py++) {
    const sy = ty + (yflip ? 7 - py : py)
    for (let px = 0; px < 8; px++) {
      const sx = tx + (xflip ? 7 - px : px)
      const c = png.indices[sy * png.width + sx]
      if (c === 0) continue // color 0 = transparente en ambas capas
      put(img, dx + px, dy + py, colors[c])
    }
  }
}

const layoutsCache = new Map()
async function gbaLayouts(repo) {
  if (!layoutsCache.has(repo)) {
    layoutsCache.set(repo, JSON.parse((await fetchFile(repo, 'data/layouts/layouts.json')).toString('utf8')).layouts)
  }
  return layoutsCache.get(repo)
}

async function renderGba({ repo, layout }) {
  const C = GBA[repo]
  const L = (await gbaLayouts(repo)).find((l) => l.id === layout)
  if (!L) throw new Error(`layout ${layout} no está en ${repo}`)
  const range = (a, b) => Array.from({ length: b - a }, (_, i) => a + i)
  const prim = await loadGbaTileset(repo, 'primary', L.primary_tileset, range(0, C.palsInPrimary))
  const sec = await loadGbaTileset(repo, 'secondary', L.secondary_tileset, range(C.palsInPrimary, C.palsTotal))
  const map = await fetchFile(repo, L.blockdata_filepath)
  const img = newImage(L.width * 16, L.height * 16)
  for (let by = 0; by < L.height; by++) {
    for (let bx = 0; bx < L.width; bx++) {
      const id = map.readUInt16LE((by * L.width + bx) * 2) & 0x3ff
      const src = id < C.metatilesInPrimary ? prim.metatiles : sec.metatiles
      const mid = id < C.metatilesInPrimary ? id : id - C.metatilesInPrimary
      if (mid * 16 + 16 > src.length) continue
      for (let k = 0; k < 8; k++) {
        const e = src.readUInt16LE(mid * 16 + k * 2)
        const tile = e & 0x3ff
        const pal = e >> 12
        const png = tile < C.tilesInPrimary ? prim.png : sec.png
        const tid = tile < C.tilesInPrimary ? tile : tile - C.tilesInPrimary
        const colors = pal < C.palsInPrimary ? prim.pals[pal] : sec.pals[pal]
        if (!colors) continue
        drawGbaTile(img, bx * 16 + (k & 1) * 8, by * 16 + ((k >> 1) & 1) * 8, png, tid, colors, e & 0x400, e & 0x800)
      }
    }
  }
  return img
}

// ---------------------------------------------------------------------------
// GBC (Crystal)
// ---------------------------------------------------------------------------
const PAL_BG = { GRAY: 0, RED: 1, GREEN: 2, WATER: 3, YELLOW: 4, BROWN: 5, ROOF: 6, TEXT: 7 }
const gbc5 = (v) => Math.round((v * 255) / 31)

/** `RGB a,b,c, d,e,f, ...` → [[r,g,b], ...] a 8 bits. */
function parseRgbLine(line) {
  const nums = line.replace(/;.*$/, '').replace(/^\s*RGB\s*/, '').split(/[\s,]+/).filter(Boolean).map(Number)
  const out = []
  for (let i = 0; i + 2 < nums.length; i += 3) out.push([gbc5(nums[i]), gbc5(nums[i + 1]), gbc5(nums[i + 2])])
  return out
}

/** Las 8 paletas de DÍA de bg_tiles.pal. */
async function gbcDayPalettes() {
  const lines = (await fetchFile('pokecrystal', 'gfx/tilesets/bg_tiles.pal')).toString('utf8').split(/\r?\n/)
  const start = lines.findIndex((l) => /^;\s*day/.test(l.trim()))
  if (start < 0) throw new Error('bg_tiles.pal sin sección day')
  return lines.slice(start + 1).filter((l) => /^\s*RGB/.test(l)).slice(0, 8).map(parseRgbLine)
}

/** Colores de tejado (día) por grupo de mapas, de roofs.pal. */
async function gbcRoofs() {
  const lines = (await fetchFile('pokecrystal', 'gfx/tilesets/roofs.pal')).toString('utf8').split(/\r?\n/)
  const roofs = {}
  let group = null
  for (const l of lines) {
    const g = l.match(/^;\s*group\s+(\d+)/)
    if (g) { group = Number(g[1]); continue }
    if (group !== null && /^\s*RGB/.test(l) && !roofs[group]) roofs[group] = parseRgbLine(l)
  }
  return roofs
}

/** palette_map.asm → paleta (0-7) por id de tile. */
function parsePaletteMap(text) {
  const out = []
  let rept = 1
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.replace(/;.*$/, '').trim()
    if (!l) continue
    let m
    if ((m = l.match(/^tilepal\s+\d+\s*,\s*(.+)$/))) {
      for (const name of m[1].split(',').map((s) => s.trim())) out.push(PAL_BG[name] ?? 0)
    } else if ((m = l.match(/^rept\s+(\d+)/))) rept = Number(m[1])
    else if (/^endr/.test(l)) rept = 1
    else if (/^db\b/.test(l)) for (let i = 0; i < rept * 2; i++) out.push(PAL_BG.TEXT)
  }
  return out
}

const gbcTilesets = new Map()
async function loadGbcTileset(name) {
  if (gbcTilesets.has(name)) return gbcTilesets.get(name)
  const png = decodePngIndices(await fetchFile('pokecrystal', `gfx/tilesets/${name}.png`))
  if (png.depth !== 2 || png.width !== 128) throw new Error(`gfx/tilesets/${name}.png no es un 2bpp de 16 tiles de ancho`)
  const metatiles = await fetchFile('pokecrystal', `data/tilesets/${name}_metatiles.bin`)
  const palmap = parsePaletteMap((await fetchFile('pokecrystal', `gfx/tilesets/${name}_palette_map.asm`)).toString('utf8'))
  const ts = { png, metatiles, palmap }
  gbcTilesets.set(name, ts)
  return ts
}

/** Id de tile del mapa → tile del PNG: $00-$5F van seguidos y $80-$DF son la
 *  segunda mitad del PNG (en VRAM van al banco 1); $60-$7F son fuente/texto. */
const gbcPngTile = (id) => (id < 0x60 ? id : id >= 0x80 ? id - 0x20 : -1)

async function renderGbc({ blk, tileset, width, height, group }) {
  const ts = await loadGbcTileset(tileset)
  const pals = (await gbcDayPalettes()).map((p) => p.map((c) => [...c]))
  const roof = (await gbcRoofs())[group]
  if (roof) { pals[PAL_BG.ROOF][1] = roof[0]; pals[PAL_BG.ROOF][2] = roof[1] }
  const map = await fetchFile('pokecrystal', `maps/${blk}.blk`)
  if (map.length !== width * height) throw new Error(`${blk}.blk mide ${map.length}, esperaba ${width}×${height}`)
  const img = newImage(width * 32, height * 32)
  for (let by = 0; by < height; by++) {
    for (let bx = 0; bx < width; bx++) {
      const id = map[by * width + bx]
      for (let t = 0; t < 16; t++) {
        const tile = ts.metatiles[id * 16 + t]
        const pt = gbcPngTile(tile)
        const colors = pals[ts.palmap[tile] ?? 0]
        const dx = bx * 32 + (t % 4) * 8
        const dy = by * 32 + Math.floor(t / 4) * 8
        for (let py = 0; py < 8; py++) {
          for (let px = 0; px < 8; px++) {
            // En los PNG de pret el blanco es el color 0 y el negro el 3.
            const c = pt < 0 ? 0 : 3 - ts.png.indices[(Math.floor(pt / 16) * 8 + py) * 128 + (pt % 16) * 8 + px]
            put(img, dx + px, dy + py, colors[c])
          }
        }
      }
    }
  }
  return img
}

// ---------------------------------------------------------------------------
// Escenas
// ---------------------------------------------------------------------------
const FR = (layout) => ({ repo: 'pokefirered', layout })
const EM = (layout) => ({ repo: 'pokeemerald', layout })
// width/height en bloques y grupo de mapa: constants/map_constants.asm.
const CR = (blk, tileset, width, height, group) => ({ blk, tileset, width, height, group })

export const SCENES = {
  // Kanto (FireRed): las 8 ciudades de gimnasio + Meseta Añil, y algún extra.
  pewter: FR('LAYOUT_PEWTER_CITY'),
  cerulean: FR('LAYOUT_CERULEAN_CITY'),
  vermilion: FR('LAYOUT_VERMILION_CITY'),
  celadon: FR('LAYOUT_CELADON_CITY'),
  fuchsia: FR('LAYOUT_FUCHSIA_CITY'),
  saffron: FR('LAYOUT_SAFFRON_CITY'),
  cinnabar: FR('LAYOUT_CINNABAR_ISLAND'),
  viridian: FR('LAYOUT_VIRIDIAN_CITY'),
  indigo: FR('LAYOUT_INDIGO_PLATEAU_EXTERIOR'),
  pallet: FR('LAYOUT_PALLET_TOWN'),
  lavender: FR('LAYOUT_LAVENDER_TOWN'),
  viridian_forest: FR('LAYOUT_VIRIDIAN_FOREST'),
  // Johto (Crystal).
  violet: CR('VioletCity', 'johto', 20, 18, 10),
  azalea: CR('AzaleaTown', 'johto_modern', 20, 9, 8),
  goldenrod: CR('GoldenrodCity', 'johto_modern', 20, 18, 11),
  ecruteak: CR('EcruteakCity', 'johto', 20, 18, 4),
  cianwood: CR('CianwoodCity', 'johto', 15, 27, 22),
  olivine: CR('OlivineCity', 'johto', 20, 18, 1),
  mahogany: CR('MahoganyTown', 'johto', 10, 9, 2),
  blackthorn: CR('BlackthornCity', 'johto', 20, 18, 5),
  route23: CR('Route23', 'kanto', 10, 9, 16),
  new_bark: CR('NewBarkTown', 'johto', 10, 9, 24),
  cherrygrove: CR('CherrygroveCity', 'johto', 20, 9, 26),
  // Hoenn (Emerald).
  rustboro: EM('LAYOUT_RUSTBORO_CITY'),
  dewford: EM('LAYOUT_DEWFORD_TOWN'),
  mauville: EM('LAYOUT_MAUVILLE_CITY'),
  lavaridge: EM('LAYOUT_LAVARIDGE_TOWN'),
  petalburg: EM('LAYOUT_PETALBURG_CITY'),
  fortree: EM('LAYOUT_FORTREE_CITY'),
  mossdeep: EM('LAYOUT_MOSSDEEP_CITY'),
  sootopolis: EM('LAYOUT_SOOTOPOLIS_CITY'),
  ever_grande: EM('LAYOUT_EVER_GRANDE_CITY'),
  littleroot: EM('LAYOUT_LITTLEROOT_TOWN'),
  slateport: EM('LAYOUT_SLATEPORT_CITY'),
  lilycove: EM('LAYOUT_LILYCOVE_CITY'),
  verdanturf: EM('LAYOUT_VERDANTURF_TOWN'),
  fallarbor: EM('LAYOUT_FALLARBOR_TOWN'),
  pacifidlog: EM('LAYOUT_PACIFIDLOG_TOWN'),
}

async function main() {
  const wanted = process.argv.slice(2)
  const names = wanted.length ? wanted : Object.keys(SCENES)
  fs.mkdirSync(OUT, { recursive: true })
  let total = 0
  for (const name of names) {
    const scene = SCENES[name]
    if (!scene) { console.error(`escena desconocida: ${name}`); process.exitCode = 1; continue }
    const img = scene.repo ? await renderGba(scene) : await renderGbc(scene)
    const png = encodePng(img)
    fs.writeFileSync(path.join(OUT, `${name}.png`), png)
    total += png.length
    console.log(`${name.padEnd(16)} ${String(img.width).padStart(4)}×${String(img.height).padEnd(4)} ${(png.length / 1024).toFixed(0).padStart(4)} KB`)
  }
  console.log(`total ${(total / 1024).toFixed(0)} KB en ${path.relative(process.cwd(), OUT)}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
