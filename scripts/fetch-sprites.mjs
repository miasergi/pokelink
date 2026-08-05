#!/usr/bin/env node
/**
 * Descarga los sprites PEQUEÑOS (pixel art "front", normal y variocolor) de
 * PokeAPI a public/sprites/ para servirlos desde el propio juego.
 *
 * Por qué solo los "front":
 *   front   ≈ 1,3 KB  ->   ~2 MB en total (1176 especies × normal + shiny)
 *   artwork ≈ 133 KB  -> ~298 MB, inviable en el repo y en la PWA
 * El artwork oficial se sigue pidiendo a PokeAPI (son pocas pantallas grandes:
 * elección de inicial, captura, ficha de Pokédex).
 *
 * Es IDEMPOTENTE: salta lo ya descargado, así que se puede relanzar sin coste.
 * Uso:  node scripts/fetch-sprites.mjs [--force]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'sprites', 'pokemon')
const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'
const FORCE = process.argv.includes('--force')
const CONCURRENCY = 16

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/generated', p), 'utf8'))
const asArray = (j) => (Array.isArray(j) ? j : Object.values(j)[0])

/** Todos los ids que el juego puede pintar: especies + megas + formas regionales. */
function allIds() {
  const ids = new Set()
  for (const file of ['pokemon.json', 'megas.json', 'regionalForms.json']) {
    let data
    try { data = asArray(readJson(file)) } catch { continue }
    for (const s of data) if (typeof s?.id === 'number') ids.add(s.id)
  }
  return [...ids].sort((a, b) => a - b)
}

async function download(url, dest) {
  if (!FORCE && fs.existsSync(dest) && fs.statSync(dest).size > 0) return 'skip'
  const res = await fetch(url)
  if (!res.ok) return res.status === 404 ? 'missing' : 'error'
  const buf = Buffer.from(await res.arrayBuffer())
  if (!buf.length) return 'error'
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, buf)
  return 'ok'
}

async function run() {
  const ids = allIds()
  // Megas y formas regionales usan ids 10000+, que PokeAPI NO sirve en esta ruta:
  // el juego ya cae a la especie base por su cadena de fallback (Sprite.tsx).
  const jobs = []
  for (const id of ids) {
    if (id >= 10000) continue
    jobs.push({ url: `${BASE}/${id}.png`, dest: path.join(OUT, `${id}.png`) })
    jobs.push({ url: `${BASE}/shiny/${id}.png`, dest: path.join(OUT, 'shiny', `${id}.png`) })
  }

  const tally = { ok: 0, skip: 0, missing: 0, error: 0 }
  let next = 0
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++]
      try { tally[await download(job.url, job.dest)]++ } catch { tally.error++ }
      const done = tally.ok + tally.skip + tally.missing + tally.error
      if (done % 200 === 0) process.stdout.write(`\r  ${done}/${jobs.length}`)
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  const size = fs.existsSync(OUT)
    ? fs.readdirSync(OUT, { recursive: true })
        .map((f) => path.join(OUT, f))
        .filter((f) => fs.existsSync(f) && fs.statSync(f).isFile())
        .reduce((a, f) => a + fs.statSync(f).size, 0)
    : 0
  process.stdout.write('\r')
  console.log(`sprites: ${tally.ok} descargados · ${tally.skip} ya estaban · ${tally.missing} sin sprite · ${tally.error} fallos`)
  console.log(`tamaño en public/sprites/pokemon: ${(size / 1048576).toFixed(1)} MB`)
  if (tally.error > 0) process.exitCode = 1
}

run()
