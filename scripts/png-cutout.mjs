// Recorte de fondos en PNG con Node PURO (sin `sharp`, sin `canvas`, sin nada).
//
// ¿Por qué escribir un códec de PNG a mano en vez de instalar una librería?
// Porque este repo no tiene dependencias nativas y no las queremos: `sharp`
// arrastra binarios por plataforma y rompe los CI baratos. Un PNG sin
// entrelazar es, en el fondo, `zlib.inflate` + deshacer 5 filtros de scanline;
// cabe en un fichero y se entiende de un vistazo.
//
// Lo que hace, en orden:
//   decodePng()  → RGBA plano (soporta color types 0/2/3/4/6, 8 y 16 bits)
//   cutout()     → flood fill desde los 4 bordes para quitar el fondo
//   trim()       → recorta el lienzo a la caja del sujeto
//   encodePng()  → vuelve a PNG RGBA de 8 bits (deflate + CRC32 bien calculado)
//
// La clave del recorte es el FLOOD FILL: el fondo de una captura es una región
// contigua que toca el borde de la imagen; el personaje no. Borrar "todo lo que
// se parezca al blanco" sería mucho más simple pero le abre agujeros a la ropa
// clara, a los ojos y a los dientes — justo lo que NO queremos.
import { inflateSync, deflateSync } from 'node:zlib'

// ---------------------------------------------------------------------------
// CRC32 (el del spec de PNG: polinomio 0xEDB88320, reflejado)
// ---------------------------------------------------------------------------
// Si el CRC de un chunk está mal el PNG simplemente NO ABRE en el navegador, y
// el fallo es silencioso (imagen rota). Tabla precalculada una sola vez.
const CRC_TABLE = (() => {
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
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export function isPng(buf) {
  return Buffer.isBuffer(buf) && buf.length > 8 && buf.subarray(0, 8).equals(SIGNATURE)
}

// ---------------------------------------------------------------------------
// Decodificación
// ---------------------------------------------------------------------------

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  return pb <= pc ? b : c
}

/** Deshace los filtros 0-4 del spec. Trabaja en BYTES, no en píxeles. */
function unfilter(raw, stride, height, bpp) {
  const out = Buffer.alloc(stride * height)
  let pos = 0
  for (let y = 0; y < height; y++) {
    if (pos >= raw.length) throw new Error('IDAT truncado')
    const type = raw[pos++]
    const line = raw.subarray(pos, pos + stride)
    pos += stride
    const o = y * stride
    const prev = o - stride
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[o + x - bpp] : 0
      const b = y > 0 ? out[prev + x] : 0
      const c = x >= bpp && y > 0 ? out[prev + x - bpp] : 0
      const v = line[x]
      let r
      switch (type) {
        case 0: r = v; break
        case 1: r = v + a; break
        case 2: r = v + b; break
        case 3: r = v + ((a + b) >> 1); break
        case 4: r = v + paeth(a, b, c); break
        default: throw new Error(`filtro de scanline desconocido: ${type}`)
      }
      out[o + x] = r & 0xff
    }
  }
  return out
}

/** Lee bits sueltos de un scanline empaquetado (bit depth 1/2/4). */
function sample(line, index, depth) {
  if (depth === 8) return line[index]
  const perByte = 8 / depth
  const byte = line[Math.floor(index / perByte)]
  const shift = 8 - depth * ((index % perByte) + 1)
  return (byte >> shift) & ((1 << depth) - 1)
}

/**
 * PNG → { width, height, data: Uint8Array RGBA de 8 bits }.
 * Normaliza TODO a RGBA8 para que el resto del módulo no tenga que saber nada
 * de paletas ni de 16 bits.
 */
export function decodePng(buf) {
  if (!isPng(buf)) throw new Error('no es un PNG (firma incorrecta)')
  let pos = 8
  let ihdr = null
  const idat = []
  let palette = null
  let trns = null

  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    pos += 12 + len
    if (type === 'IHDR') {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        depth: data[8],
        colorType: data[9],
        interlace: data[12],
      }
    } else if (type === 'PLTE') palette = Buffer.from(data)
    else if (type === 'tRNS') trns = Buffer.from(data)
    else if (type === 'IDAT') idat.push(Buffer.from(data))
    else if (type === 'IEND') break
  }

  if (!ihdr) throw new Error('PNG sin IHDR')
  // Adam7: raro en las miniaturas del thumbnailer de Fandom. Antes que
  // implementarlo a medias y sacar basura, avisamos y que el llamante lo salte.
  if (ihdr.interlace) throw new Error('PNG entrelazado (Adam7) no soportado')
  const { width, height, depth, colorType } = ihdr
  if (![1, 2, 4, 8, 16].includes(depth)) throw new Error(`bit depth no soportado: ${depth}`)

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType]
  if (!channels) throw new Error(`color type no soportado: ${colorType}`)

  const bitsPerPixel = channels * depth
  const stride = Math.ceil((bitsPerPixel * width) / 8)
  // El bpp del filtrado es en bytes y NUNCA baja de 1 (spec 9.2).
  const bpp = Math.max(1, Math.ceil(bitsPerPixel / 8))
  const raw = unfilter(inflateSync(Buffer.concat(idat)), stride, height, bpp)

  const data = new Uint8Array(width * height * 4)
  const max = (1 << depth) - 1

  for (let y = 0; y < height; y++) {
    const line = raw.subarray(y * stride, (y + 1) * stride)
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4
      let r, g, b, a = 255
      if (depth === 16) {
        // 16 bits → nos quedamos con el byte alto: la vista no distingue más y
        // el resto del pipeline es de 8 bits.
        const base = x * channels * 2
        const ch = (i) => line[base + i * 2]
        if (colorType === 0) { r = g = b = ch(0) }
        else if (colorType === 2) { r = ch(0); g = ch(1); b = ch(2) }
        else if (colorType === 4) { r = g = b = ch(0); a = ch(1) }
        else { r = ch(0); g = ch(1); b = ch(2); a = ch(3) }
      } else if (colorType === 3) {
        // Paleta: el sample es un índice; el alfa sale del tRNS si lo hay.
        const idx = sample(line, x, depth)
        if (!palette || idx * 3 + 2 >= palette.length) { r = g = b = 0 }
        else { r = palette[idx * 3]; g = palette[idx * 3 + 1]; b = palette[idx * 3 + 2] }
        if (trns && idx < trns.length) a = trns[idx]
      } else if (colorType === 0) {
        const v = sample(line, x, depth)
        r = g = b = depth === 8 ? v : Math.round((v * 255) / max)
      } else {
        const base = x * channels
        if (colorType === 2) { r = line[base]; g = line[base + 1]; b = line[base + 2] }
        else if (colorType === 4) { r = g = b = line[base]; a = line[base + 1] }
        else { r = line[base]; g = line[base + 1]; b = line[base + 2]; a = line[base + 3] }
      }
      data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = a
    }
  }

  // tRNS en gris/RGB sin paleta: un color concreto es totalmente transparente.
  if (trns && (colorType === 0 || colorType === 2)) {
    const key = colorType === 0
      ? [trns.readUInt16BE(0) & 0xff, trns.readUInt16BE(0) & 0xff, trns.readUInt16BE(0) & 0xff]
      : [trns.readUInt16BE(0) & 0xff, trns.readUInt16BE(2) & 0xff, trns.readUInt16BE(4) & 0xff]
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] === key[0] && data[i + 1] === key[1] && data[i + 2] === key[2]) data[i + 3] = 0
    }
  }

  return { width, height, data }
}

// ---------------------------------------------------------------------------
// Codificación
// ---------------------------------------------------------------------------

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy ? data.copy(out, 8) : Buffer.from(data).copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}

/** RGBA plano → PNG color type 6, 8 bits, sin entrelazar. */
export function encodePng({ width, height, data }) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  const prevLine = Buffer.alloc(stride)
  const cur = Buffer.alloc(stride)
  const cand = [Buffer.alloc(stride), Buffer.alloc(stride), Buffer.alloc(stride), Buffer.alloc(stride), Buffer.alloc(stride)]

  for (let y = 0; y < height; y++) {
    data.copy ? data.copy(cur, 0, y * stride, (y + 1) * stride)
      : Buffer.from(data.buffer, data.byteOffset + y * stride, stride).copy(cur)
    // Heurística estándar del spec: probamos los 5 filtros y nos quedamos con el
    // de menor suma de valores absolutos. Sale un fichero bastante más pequeño
    // que filtrando siempre con 0, y a 256 px el coste es despreciable.
    let best = 0
    let bestScore = Infinity
    for (let f = 0; f < 5; f++) {
      const out = cand[f]
      let score = 0
      for (let x = 0; x < stride; x++) {
        const a = x >= 4 ? cur[x - 4] : 0
        const b = prevLine[x]
        const c = x >= 4 ? prevLine[x - 4] : 0
        let v
        switch (f) {
          case 0: v = cur[x]; break
          case 1: v = cur[x] - a; break
          case 2: v = cur[x] - b; break
          case 3: v = cur[x] - ((a + b) >> 1); break
          default: v = cur[x] - paeth(a, b, c)
        }
        v &= 0xff
        out[x] = v
        score += v < 128 ? v : 256 - v
      }
      if (score < bestScore) { bestScore = score; best = f }
    }
    raw[y * (stride + 1)] = best
    cand[best].copy(raw, y * (stride + 1) + 1)
    cur.copy(prevLine)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // color type 6 = RGBA
  ihdr[10] = 0  // compresión deflate
  ihdr[11] = 0  // método de filtrado 0
  ihdr[12] = 0  // sin entrelazar

  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------------------------------------------------------------------------
// Análisis
// ---------------------------------------------------------------------------

/**
 * ¿Este PNG viene YA recortado? No basta con mirar el color type: media wiki
 * sube capturas guardadas como RGBA con el alfa entero a 255. Lo que delata a
 * un recorte de verdad es que las ESQUINAS y el borde estén transparentes.
 */
export function analyze(img) {
  const { width, height, data } = img
  const total = width * height
  let transparent = 0
  let semi = 0
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] === 0) transparent++
    else if (data[i] < 255) semi++
  }
  const corner = (x, y) => data[(y * width + x) * 4 + 3]
  const corners = [corner(0, 0), corner(width - 1, 0), corner(0, height - 1), corner(width - 1, height - 1)]
  // Borde: si el marco entero es transparente el sujeto está claramente aislado.
  let borderPixels = 0
  let borderTransparent = 0
  for (let x = 0; x < width; x++) {
    for (const y of [0, height - 1]) {
      borderPixels++
      if (data[(y * width + x) * 4 + 3] < 16) borderTransparent++
    }
  }
  for (let y = 1; y < height - 1; y++) {
    for (const x of [0, width - 1]) {
      borderPixels++
      if (data[(y * width + x) * 4 + 3] < 16) borderTransparent++
    }
  }
  return {
    width,
    height,
    transparentRatio: transparent / total,
    semiRatio: semi / total,
    opaqueRatio: (total - transparent) / total,
    corners,
    cornersClean: corners.every((a) => a < 16),
    borderTransparentRatio: borderTransparent / borderPixels,
  }
}

/** Atajo: ¿ya está recortado y por tanto no hay que tocarlo? */
export function looksCutOut(img) {
  const a = analyze(img)
  // Pedimos las 4 esquinas limpias Y que la mayoría del marco lo esté también:
  // así no colamos una captura con una viñeta oscura en las esquinas.
  return a.cornersClean && a.borderTransparentRatio > 0.6 && a.transparentRatio > 0.05
}

// ---------------------------------------------------------------------------
// Recorte de fondo
// ---------------------------------------------------------------------------

function dist(data, i, r, g, b) {
  const dr = data[i] - r
  const dg = data[i + 1] - g
  const db = data[i + 2] - b
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

/**
 * Quita el fondo por flood fill desde los cuatro bordes.
 *
 * Doble tolerancia a propósito:
 *  - `local`: cuánto puede cambiar el color de un píxel al siguiente. Pequeña,
 *    para que la mancha NO se cuele por el antialias del contorno del personaje.
 *  - `global`: cuánto puede alejarse un píxel del color de la SEMILLA del borde
 *    de la que viene. Más generosa, para tragarse degradados de estudio (el
 *    típico fondo gris que va de claro a oscuro) sin abrir la puerta al sujeto.
 *
 * El alfa no es binario: los píxeles frontera se quedan a medio camino para que
 * el contorno no salga dentado sobre el escenario del juego.
 */
export function cutout(img, opts = {}) {
  const { width, height, data } = img
  const local = opts.local ?? 26
  const global = opts.global ?? 72
  const feather = opts.feather ?? 34 // ancho de la rampa de alfa, en distancia de color
  const out = new Uint8Array(data)

  const n = width * height
  const state = new Uint8Array(n) // 0 sin visitar, 1 en cola/visitado
  // Color de la semilla del que desciende cada píxel del fondo, para la
  // tolerancia global y luego para el suavizado del borde.
  const seedR = new Uint8Array(n)
  const seedG = new Uint8Array(n)
  const seedB = new Uint8Array(n)
  const stack = new Int32Array(n)
  let sp = 0

  const push = (p, r, g, b) => {
    if (state[p]) return
    state[p] = 1
    seedR[p] = r; seedG[p] = g; seedB[p] = b
    stack[sp++] = p
  }

  // Semillas: todo el marco. Los píxeles ya transparentes cuentan como fondo
  // (imágenes con alfa parcial que además traen una franja opaca).
  for (let x = 0; x < width; x++) {
    for (const y of [0, height - 1]) {
      const p = y * width + x
      push(p, data[p * 4], data[p * 4 + 1], data[p * 4 + 2])
    }
  }
  for (let y = 0; y < height; y++) {
    for (const x of [0, width - 1]) {
      const p = y * width + x
      push(p, data[p * 4], data[p * 4 + 1], data[p * 4 + 2])
    }
  }

  while (sp > 0) {
    const p = stack[--sp]
    const px = p % width
    const py = (p / width) | 0
    const i = p * 4
    const cr = data[i]
    const cg = data[i + 1]
    const cb = data[i + 2]
    const sr = seedR[p]
    const sg = seedG[p]
    const sb = seedB[p]
    // 4-vecindad: la 8-vecindad se cuela en diagonal por los huecos del antialias.
    const neigh = [
      px > 0 ? p - 1 : -1,
      px < width - 1 ? p + 1 : -1,
      py > 0 ? p - width : -1,
      py < height - 1 ? p + width : -1,
    ]
    for (const q of neigh) {
      if (q < 0 || state[q]) continue
      const j = q * 4
      // Un píxel ya transparente de origen es fondo sin más preguntas.
      if (data[j + 3] === 0) { push(q, sr, sg, sb); continue }
      if (dist(data, j, cr, cg, cb) > local) continue
      if (dist(data, j, sr, sg, sb) > global) continue
      push(q, sr, sg, sb)
    }
  }

  // Alfa duro para el fondo.
  for (let p = 0; p < n; p++) if (state[p]) out[p * 4 + 3] = 0

  // Suavizado del contorno: los píxeles de sujeto que tocan fondo se quedan con
  // alfa parcial según lo lejos que estén del color del fondo que tienen al
  // lado. Sin esto el recorte se ve como un sello recortado con tijeras.
  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const p = py * width + px
      if (state[p]) continue
      let br = 0, bg = 0, bb = 0, count = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue
          const qx = px + dx
          const qy = py + dy
          if (qx < 0 || qy < 0 || qx >= width || qy >= height) continue
          const q = qy * width + qx
          if (!state[q]) continue
          br += seedR[q]; bg += seedG[q]; bb += seedB[q]; count++
        }
      }
      if (!count) continue
      br /= count; bg /= count; bb /= count
      const d = dist(data, p * 4, br, bg, bb)
      // d > local por construcción; a partir de local+feather ya es sujeto pleno.
      const t = Math.max(0, Math.min(1, (d - local) / feather))
      const a = Math.round(t * out[p * 4 + 3])
      if (a < out[p * 4 + 3]) out[p * 4 + 3] = a
    }
  }

  return { width, height, data: out }
}

/** Recorta el lienzo a la caja del sujeto, con un margen de cortesía. */
export function trim(img, { threshold = 12, padding = 2 } = {}) {
  const { width, height, data } = img
  let minX = width, minY = height, maxX = -1, maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > threshold) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return img // todo transparente: no tocamos nada
  minX = Math.max(0, minX - padding)
  minY = Math.max(0, minY - padding)
  maxX = Math.min(width - 1, maxX + padding)
  maxY = Math.min(height - 1, maxY + padding)
  const w = maxX - minX + 1
  const h = maxY - minY + 1
  if (w === width && h === height) return img
  const out = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    const src = ((y + minY) * width + minX) * 4
    out.set(data.subarray(src, src + w * 4), y * w * 4)
  }
  return { width: w, height: h, data: out }
}

/**
 * Pipeline completo sobre bytes: PNG con fondo → PNG recortado y encuadrado.
 * Devuelve `null` si el resultado es sospechoso (el flood fill se ha comido al
 * personaje). Preferimos devolver el original antes que un recorte con agujeros.
 */
export function cutoutPngBuffer(buf, opts = {}) {
  const img = decodePng(buf)
  const cut = cutout(img, opts)
  const stats = analyze(cut)
  // Si queda menos del 8% de píxeles opacos es que hemos borrado al sujeto.
  if (stats.opaqueRatio < (opts.minSubject ?? 0.08)) {
    return { buffer: null, reason: `sujeto residual (${(stats.opaqueRatio * 100).toFixed(1)}%)`, stats }
  }
  // Y si no hemos quitado prácticamente nada, el flood fill no ha encontrado
  // fondo: dejarlo tal cual y avisar es más honesto que fingir que va bien.
  if (stats.transparentRatio < (opts.minRemoved ?? 0.02)) {
    return { buffer: null, reason: `no se detectó fondo (${(stats.transparentRatio * 100).toFixed(1)}% quitado)`, stats }
  }
  const trimmed = trim(cut, opts)
  return { buffer: encodePng(trimmed), reason: null, stats: analyze(trimmed) }
}
