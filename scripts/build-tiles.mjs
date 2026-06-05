// Genera PNGs pixel-art (Centro Pokémon, Poké Mart, Hierba Alta) en public/tiles/.
// Sin dependencias: encoder PNG mínimo con zlib. Uso: node scripts/build-tiles.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import { deflateSync } from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'tiles')

// ---- PNG encoder (RGBA) ----
const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 }
  return t
})()
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii'); const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  const cr = Buffer.alloc(4); cr.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, cr])
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6
  const stride = w * 4; const raw = Buffer.alloc((stride + 1) * h)
  for (let y = 0; y < h; y++) { raw[y * (stride + 1)] = 0; rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride) }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

function canvas(w, h) {
  const data = Buffer.alloc(w * 4 * h)
  const put = (x, y, [r, g, b, a]) => {
    x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= w || y >= h) return
    const i = (y * w + x) * 4; data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a
  }
  const rect = (x, y, rw, rh, c) => { for (let yy = 0; yy < rh; yy++) for (let xx = 0; xx < rw; xx++) put(x + xx, y + yy, c) }
  // tejado trapezoidal (ancho abajo)
  const roof = (cx, y0, y1, baseHalf, topHalf, fill, edge) => {
    for (let y = y0; y <= y1; y++) {
      const t = (y - y0) / (y1 - y0)
      const half = Math.round(topHalf + (baseHalf - topHalf) * t)
      for (let x = cx - half; x <= cx + half; x++) put(x, y, x <= cx - half + 1 || x >= cx + half - 1 ? edge : fill)
    }
  }
  return { w, h, data, put, rect, roof, png: () => encodePNG(w, h, data) }
}

// Paletas
const OUT_ = [40, 30, 34, 255]
const RED = [231, 76, 60, 255], REDD = [176, 38, 46, 255], REDL = [255, 120, 110, 255]
const WHITE = [248, 250, 252, 255], CREAM = [236, 232, 220, 255], CREAMD = [203, 196, 178, 255]
const BLACK = [33, 33, 40, 255], DOOR = [120, 140, 160, 255]
const GLASS = [125, 211, 252, 255], GLASSD = [56, 132, 200, 255]
const BLUE = [52, 120, 226, 255], BLUED = [28, 78, 170, 255], BLUEL = [120, 175, 255, 255]
const GD = [20, 83, 45, 255], GM = [34, 145, 70, 255], GL = [101, 200, 120, 255], GLL = [160, 230, 150, 255]

function disc(c, cx, cy, r, fn) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) fn(c, cx + x, cy + y, x, y)
}

function pokecenter() {
  const c = canvas(48, 40)
  // cuerpo
  c.rect(7, 17, 34, 22, CREAM)
  c.rect(38, 17, 3, 22, CREAMD) // sombra lateral
  c.rect(7, 38, 34, 1, OUT_)
  // tejado
  c.roof(24, 6, 17, 23, 6, RED, REDD)
  for (let x = 19; x <= 29; x++) c.put(x, 6, REDL) // brillo superior
  c.rect(1, 17, 46, 1, REDD) // alero
  // letrero Poké Ball
  disc(c, 24, 11, 5, (cv, x, y, dx, dy) => cv.put(x, y, dy < -1 ? RED : dy > 1 ? WHITE : BLACK))
  cPut(c, 24, 11, WHITE); cRing(c, 24, 11, 1, BLACK)
  // puertas automáticas (cristal azul, doble)
  c.rect(20, 27, 9, 12, GLASSD)
  c.rect(21, 28, 3, 11, GLASS); c.rect(25, 28, 3, 11, GLASS)
  c.put(24, 28, OUT_); for (let y = 28; y < 39; y++) c.put(24, y, OUT_)
  // ventanas
  c.rect(10, 22, 5, 4, GLASS); c.rect(33, 22, 5, 4, GLASS)
  c.rect(10, 22, 5, 1, GLASSD); c.rect(33, 22, 5, 1, GLASSD)
  return c.png()
}
function cPut(c, x, y, col) { c.put(x, y, col) }
function cRing(c, cx, cy, r, col) { for (let a = 0; a < 360; a += 30) c.put(cx + Math.round(r * Math.cos(a)), cy + Math.round(r * Math.sin(a)), col) }

function pokemart() {
  const c = canvas(48, 40)
  c.rect(7, 17, 34, 22, CREAM)
  c.rect(38, 17, 3, 22, CREAMD)
  c.rect(7, 38, 34, 1, OUT_)
  c.roof(24, 6, 17, 23, 6, BLUE, BLUED)
  for (let x = 19; x <= 29; x++) c.put(x, 6, BLUEL)
  c.rect(1, 17, 46, 1, BLUED)
  // toldo a rayas azul/blanco
  for (let x = 7; x < 41; x++) c.put(x, 18, (Math.floor((x - 7) / 3) % 2 === 0 ? BLUE : WHITE)), c.put(x, 19, (Math.floor((x - 7) / 3) % 2 === 0 ? BLUE : WHITE))
  // letrero blanco con cuadro azul
  c.rect(19, 8, 10, 6, WHITE); c.rect(21, 10, 6, 2, BLUE)
  // puerta
  c.rect(20, 28, 9, 11, DOOR); c.rect(20, 28, 9, 1, OUT_)
  c.rect(21, 29, 7, 4, GLASS)
  // ventanas
  c.rect(10, 23, 5, 4, GLASS); c.rect(33, 23, 5, 4, GLASS)
  return c.png()
}

function tallgrass() {
  const c = canvas(48, 32)
  // base/montículo
  for (let x = 2; x < 46; x++) { const b = 31 - Math.round(2 * Math.sin((x / 46) * Math.PI)); for (let y = b; y < 32; y++) c.put(x, y, y > b + 1 ? GD : GM) }
  // matas (varias, con punta clara)
  const blades = [
    [6, 12], [10, 19], [14, 14], [18, 22], [22, 16], [26, 23], [30, 15], [34, 20], [38, 13], [42, 18],
    [8, 9], [16, 10], [24, 11], [32, 10], [40, 9],
  ]
  for (const [bx, h] of blades) {
    const top = 30 - h
    for (let y = 30; y >= top; y--) {
      const lean = Math.round(((30 - y) / h) * 2) * (bx % 2 ? 1 : -1)
      const col = y <= top + 1 ? GLL : y < top + 4 ? GL : GM
      c.put(bx + lean, y, col)
      c.put(bx + lean + 1, y, y < top + 3 ? GL : GD)
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
