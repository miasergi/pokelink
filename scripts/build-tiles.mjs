// Genera PNGs pixel-art (Centro Pokémon, Poké Mart, Hierba Alta) en public/tiles/.
// Sin dependencias externas: encoder PNG mínimo con zlib. Uso: node scripts/build-tiles.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import { deflateSync } from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'tiles')

// ---- PNG encoder (RGBA) ----
const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  const cr = Buffer.alloc(4); cr.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, cr])
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8; ihdr[9] = 6 // bit depth 8, color type 6 (RGBA)
  const stride = w * 4
  const raw = Buffer.alloc((stride + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

// ---- mini lienzo ----
function canvas(w, h) {
  const data = Buffer.alloc(w * 4 * h)
  const put = (x, y, [r, g, b, a]) => {
    x = Math.round(x); y = Math.round(y)
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const i = (y * w + x) * 4
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a
  }
  const rect = (x, y, rw, rh, c) => { for (let yy = 0; yy < rh; yy++) for (let xx = 0; xx < rw; xx++) put(x + xx, y + yy, c) }
  return { w, h, data, put, rect, png: () => encodePNG(w, h, data) }
}

// Paletas
const T = [0, 0, 0, 0]
const OUTLINE = [38, 28, 30, 255]
// Centro
const RED = [226, 59, 59, 255], REDD = [176, 32, 40, 255]
const WHITE = [247, 248, 250, 255], WALL2 = [212, 220, 228, 255]
const DOOR = [90, 105, 125, 255], GLASS = [125, 211, 252, 255]
// Mart
const BLUE = [37, 99, 235, 255], BLUED = [27, 64, 161, 255]
const BEIGE = [236, 230, 214, 255], AWN = [96, 165, 250, 255]
// Grass
const GDARK = [22, 95, 52, 255], GMID = [38, 160, 78, 255], GLIGHT = [96, 210, 120, 255]

function pokecenter() {
  const c = canvas(28, 24)
  // Tejado rojo (trapezoide)
  for (let y = 4; y <= 9; y++) {
    const half = (y - 3) * 2
    for (let x = 14 - half; x <= 14 + half; x++) c.put(x, y, x === 14 - half || x === 14 + half ? REDD : RED)
  }
  c.rect(3, 10, 22, 1, REDD) // alero
  // Cartel (cruz blanca sobre círculo rojo)
  c.rect(11, 4, 6, 4, WHITE)
  c.put(13, 5, RED); c.put(14, 5, RED); c.put(12, 6, RED); c.put(13, 6, RED); c.put(14, 6, RED); c.put(15, 6, RED); c.put(13, 7, RED); c.put(14, 7, RED)
  // Cuerpo
  c.rect(4, 11, 20, 12, WHITE)
  for (let y = 11; y < 23; y++) { c.put(4, y, WALL2); c.put(23, y, WALL2) }
  c.rect(4, 22, 20, 1, OUTLINE)
  // Puerta
  c.rect(11, 16, 6, 7, DOOR)
  c.put(11, 16, OUTLINE); c.put(16, 16, OUTLINE)
  // Ventanas
  c.rect(6, 13, 4, 3, GLASS); c.rect(18, 13, 4, 3, GLASS)
  return c.png()
}

function pokemart() {
  const c = canvas(28, 24)
  for (let y = 4; y <= 9; y++) {
    const half = (y - 3) * 2
    for (let x = 14 - half; x <= 14 + half; x++) c.put(x, y, x === 14 - half || x === 14 + half ? BLUED : BLUE)
  }
  c.rect(3, 10, 22, 1, BLUED)
  // Cartel blanco
  c.rect(11, 4, 6, 4, WHITE); c.rect(12, 5, 4, 2, BLUE)
  // Cuerpo beige
  c.rect(4, 11, 20, 12, BEIGE)
  // Toldo a rayas
  for (let x = 4; x < 24; x++) c.put(x, 11, (x % 2 === 0 ? AWN : WHITE)), c.put(x, 12, (x % 2 === 0 ? AWN : WHITE))
  c.rect(4, 22, 20, 1, OUTLINE)
  c.rect(11, 16, 6, 7, DOOR)
  c.rect(6, 14, 4, 3, GLASS); c.rect(18, 14, 4, 3, GLASS)
  return c.png()
}

function tallgrass() {
  const c = canvas(28, 24)
  const heights = [7, 12, 9, 14, 8, 11, 10, 13, 9, 12, 8, 11, 14, 10]
  for (let x = 1; x < 27; x++) {
    const h = heights[x % heights.length]
    const top = 23 - h
    for (let y = 23; y >= top; y--) {
      const col = y === top ? GLIGHT : y >= 21 ? GDARK : GMID
      c.put(x, y, col)
    }
  }
  return c.png()
}

async function main() {
  await mkdir(OUT, { recursive: true })
  await writeFile(path.join(OUT, 'pokecenter.png'), pokecenter())
  await writeFile(path.join(OUT, 'pokemart.png'), pokemart())
  await writeFile(path.join(OUT, 'tallgrass.png'), tallgrass())
  console.log('✓ tiles ->', OUT)
}
main()
void T
