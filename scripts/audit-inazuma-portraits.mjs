// AUDITORÍA DE FONDOS de los retratos de Inazuma.
//
//   node scripts/audit-inazuma-portraits.mjs
//
// Escupe los ids con fondo para pasárselos a `fix-inazuma-portraits-bg.mjs`.
// Los que no tengan sprite transparente en la wiki es mejor BORRARLOS: la UI
// pinta la carta con iniciales, que queda mejor que una foto con fondo.
//
// Cómo: mide qué porcentaje de cada retrato es OPACO. Un
// retrato recortado deja mucho hueco transparente alrededor; uno con fondo,
// casi ninguno. Los ficheros se leen en Node y se pasan como data URL, así no
// hay servidor (ni service worker) de por medio ni el canvas se contamina.
import { chromium } from 'playwright'
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, 'public', 'inazuma', 'players')
const OUT = join(ROOT, 'scripts', '.cache', 'portraits-con-fondo.txt')
const files = (await readdir(DIR)).filter((f) => f.endsWith('.png'))
const browser = await chromium.launch()
const page = await browser.newPage()
const res = []
const CHUNK = 25
for (let i = 0; i < files.length; i += CHUNK) {
  const lote = []
  for (const n of files.slice(i, i + CHUNK)) {
    lote.push({ n, b64: (await readFile(join(DIR, n))).toString('base64') })
  }
  res.push(...await page.evaluate(async (items) => {
    const out = []
    for (const { n, b64 } of items) {
      try {
        const img = new Image()
        img.src = `data:image/png;base64,${b64}`
        await img.decode()
        const c = document.createElement('canvas')
        c.width = img.width; c.height = img.height
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const d = ctx.getImageData(0, 0, img.width, img.height).data
        let op = 0
        for (let k = 3; k < d.length; k += 4) if (d[k] > 200) op++
        out.push({ n, pct: Math.round(op / (img.width * img.height) * 100) })
      } catch (e) { out.push({ n, pct: -1, err: String(e).slice(0, 60) }) }
    }
    return out
  }, lote))
}
await browser.close()
res.sort((a, b) => b.pct - a.pct)
const conFondo = res.filter((r) => r.pct >= 90)
console.log(`retratos ${res.length} · errores ${res.filter((r) => r.pct < 0).length} · CON FONDO (≥90 % opaco): ${conFondo.length}`)
console.log('los más opacos:', res.slice(0, 15).map((r) => `${r.n.replace('.png', '')}=${r.pct}%`).join(' '))
await writeFile(OUT, conFondo.map((r) => r.n.replace('.png', '')).join(' '))
