// Audita los retratos de Dragon Ball Rogue ya descargados: por cada PNG dice si
// es válido, si tiene alfa de verdad, cuánto transparente hay, si las 4 esquinas
// están limpias y si el sujeto ocupa un área razonable.
//
//   node scripts/audit-dragon-portraits.mjs
//   node scripts/audit-dragon-portraits.mjs goku vegeta
//   node scripts/audit-dragon-portraits.mjs --formas        (los transformados)
//   node scripts/audit-dragon-portraits.mjs --formas goku__ssj
//
// No modifica nada: es la comprobación que uno hace DESPUÉS de `fetch-dragon`
// (o de `fetch-dragon-forms`, con `--formas`) para no fiarse de que el recorte
// haya salido bien.
import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodePng, analyze, isPng } from './png-cutout.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
// Los retratos de los transformados viven en otra carpeta pero se miden igual:
// mismo PNG, mismo alfa, mismas esquinas. Un solo auditor para los dos.
const formas = args.includes('--formas') || args.includes('--forms')
const DIR = join(ROOT, 'public', 'dragon', formas ? 'forms' : 'fighters')

const only = new Set(args.filter((a) => !a.startsWith('--')))

function pad(s, n) { return String(s).padEnd(n) }
function padL(s, n) { return String(s).padStart(n) }

async function main() {
  let files = []
  try {
    files = (await readdir(DIR)).filter((f) => f.endsWith('.png')).sort()
  } catch {
    console.log(`No hay nada que auditar: ${DIR} todavía no existe.`)
    return
  }
  // Los ids de forma (`vegeta_saiyan__ozaru`) son bastante más largos que los
  // de luchador, así que la columna se mide sola en vez de ir fija a 16.
  const W = Math.max(16, ...files.map((f) => f.length - 4))
  const rows = []
  let totalBytes = 0
  const suspicious = []

  for (const file of files) {
    const id = file.replace(/\.png$/, '')
    if (only.size && !only.has(id)) continue
    const path = join(DIR, file)
    const buf = await readFile(path)
    const size = (await stat(path)).size
    totalBytes += size
    if (!isPng(buf)) {
      rows.push({ id, ok: false, note: 'NO es PNG', size })
      suspicious.push(`${id}: no es un PNG`)
      continue
    }
    let img
    try { img = decodePng(buf) } catch (err) {
      rows.push({ id, ok: false, note: `no decodifica: ${err.message}`, size })
      suspicious.push(`${id}: ${err.message}`)
      continue
    }
    const a = analyze(img)
    const hasAlpha = a.transparentRatio > 0 || a.semiRatio > 0
    const row = {
      id, ok: true, size,
      dims: `${a.width}x${a.height}`,
      hasAlpha,
      transparent: a.transparentRatio,
      subject: a.opaqueRatio,
      corners: a.cornersClean,
      border: a.borderTransparentRatio,
    }
    rows.push(row)
    if (!hasAlpha) suspicious.push(`${id}: SIN canal alfa útil (fondo opaco)`)
    else if (!a.cornersClean) suspicious.push(`${id}: esquinas opacas (${a.corners.join('/')})`)
    if (a.opaqueRatio < 0.08) suspicious.push(`${id}: sujeto residual ${(a.opaqueRatio * 100).toFixed(1)}% — ¿flood fill se comió al personaje?`)
  }

  console.log(`${pad('id', W)} ${pad('tamaño', 10)} ${padL('kB', 7)} ${padL('alfa', 5)} ${padL('transp%', 8)} ${padL('sujeto%', 8)} ${padL('esquinas', 9)} ${padL('marco%', 7)}`)
  console.log('-'.repeat(W + 64))
  for (const r of rows) {
    if (!r.ok) { console.log(`${pad(r.id, W)} ${r.note}`); continue }
    console.log([
      pad(r.id, W),
      pad(r.dims, 10),
      padL((r.size / 1024).toFixed(1), 7),
      padL(r.hasAlpha ? 'sí' : 'NO', 5),
      padL((r.transparent * 100).toFixed(1), 8),
      padL((r.subject * 100).toFixed(1), 8),
      padL(r.corners ? 'limpias' : 'OPACAS', 9),
      padL((r.border * 100).toFixed(0), 7),
    ].join(' '))
  }
  console.log('-'.repeat(W + 64))
  const good = rows.filter((r) => r.ok && r.hasAlpha && r.corners).length
  console.log(`${rows.length} ficheros · ${good} con esquinas limpias · total ${(totalBytes / 1024).toFixed(1)} kB`)
  if (suspicious.length) {
    console.log('\nSospechosos:')
    for (const s of suspicious) console.log(`  ! ${s}`)
  } else {
    console.log('\nSin sospechosos.')
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
