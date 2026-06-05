// Genera los tiles de Centro Pokémon, Poké Mart y Hierba Alta a partir de
// sprites REALES (estilo Gen-2, libres) del repo nikouu/Pokemon-gen-2-style-tilemap.
// - Hierba: se usa tal cual (tile real).
// - Edificio real recoloreado: tejado rojo (Centro, con Poké Ball) y azul (Mart).
// Uso: node scripts/build-tiles.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import { deflateSync, inflateSync } from 'node:zlib'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'tiles')
const SRC = 'https://raw.githubusercontent.com/nikouu/Pokemon-gen-2-style-tilemap/main/Custom'

// ---- PNG encode/decode (RGBA, 8-bit, sin entrelazado) ----
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
function decodePNG(buf) {
  let pos = 8, w = 0, h = 0; const idat = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos); const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4) }
    else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    pos += 12 + len
  }
  const rawz = inflateSync(Buffer.concat(idat))
  const stride = w * 4, out = Buffer.alloc(w * h * 4)
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < h; y++) {
    const ft = rawz[y * (stride + 1)]
    const row = rawz.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride)
    const cur = Buffer.alloc(stride)
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? cur[x - 4] : 0, b = prev[x], c = x >= 4 ? prev[x - 4] : 0
      let v = row[x]
      if (ft === 1) v = (v + a) & 255
      else if (ft === 2) v = (v + b) & 255
      else if (ft === 3) v = (v + ((a + b) >> 1)) & 255
      else if (ft === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255 }
      cur[x] = v
    }
    cur.copy(out, y * stride); prev = cur
  }
  return { w, h, data: out }
}

async function fetchPNG(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url)
  return decodePNG(Buffer.from(await r.arrayBuffer()))
}

// Recolorea los píxeles amarillos del tejado a un tono objetivo (rojo/azul).
function recolorRoof(img, kind) {
  const { w, h, data } = img
  const out = Buffer.from(data)
  for (let i = 0; i < w * h; i++) {
    const r = out[i * 4], g = out[i * 4 + 1], b = out[i * 4 + 2], a = out[i * 4 + 3]
    if (a === 0) continue
    const isYellow = r > 110 && g > 95 && b < g - 35 // tejado amarillo (no la pared crema)
    if (!isYellow) continue
    const lvl = Math.max(r, g)
    if (kind === 'red') { out[i * 4] = lvl; out[i * 4 + 1] = Math.round(lvl * 0.24); out[i * 4 + 2] = Math.round(lvl * 0.22) }
    else { out[i * 4] = Math.round(lvl * 0.22); out[i * 4 + 1] = Math.round(lvl * 0.45); out[i * 4 + 2] = lvl }
  }
  return { w, h, data: out }
}

function put(img, x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return
  const i = (y * img.w + x) * 4; img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = a
}
// Dibuja una Poké Ball pequeña centrada en (cx,cy)
function pokeball(img, cx, cy, rad) {
  for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) {
    if (x * x + y * y > rad * rad) continue
    const col = y < -1 ? [230, 60, 55, 255] : y > 1 ? [245, 245, 245, 255] : [40, 36, 40, 255]
    put(img, cx + x, cy + y, col)
  }
  put(img, cx, cy, [245, 245, 245, 255])
  put(img, cx - 1, cy, [40, 36, 40, 255]); put(img, cx + 1, cy, [40, 36, 40, 255])
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const grass = await fetchPNG(`${SRC}/Grass-tall_large.png`)
  await writeFile(path.join(OUT, 'tallgrass.png'), encodePNG(grass.w, grass.h, grass.data))

  const building = await fetchPNG(`${SRC}/Constructed/Building.png`)
  const center = recolorRoof(building, 'red')
  pokeball(center, Math.round(center.w / 2), Math.round(center.h * 0.2), 5)
  await writeFile(path.join(OUT, 'pokecenter.png'), encodePNG(center.w, center.h, center.data))

  const mart = recolorRoof(building, 'blue')
  await writeFile(path.join(OUT, 'pokemart.png'), encodePNG(mart.w, mart.h, mart.data))

  console.log('✓ tiles (sprites reales recoloreados) ->', OUT)
}
main().catch((e) => { console.error(e); process.exit(1) })
