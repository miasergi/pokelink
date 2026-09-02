// VÍDEOS y datos VR oficiales de las supertécnicas, desde el JSON público de
// inazumo.es (/data/supertecnicas-completas.json). Genera
// src/data/inazuma/tech-videos.ts con, por técnica NUESTRA:
//   - video: webm del CDN (se reproduce en streaming, no se descarga al repo)
//   - vrPower / vrTension: la potencia y tensión OFICIALES de Victory Road
//     (solo informativas: nuestro balance —25-150 con grano fino— no se toca,
//     el suyo es un sistema plano de 6 valores).
//
//   node scripts/fetch-inazumo-techdata.mjs
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const UA = { 'User-Agent': 'pokelink-techdata/1.0 (script de un solo uso)' }
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Normalización AGRESIVA de reserva: sin separadores y ordinales pegados
// («Pingüino Emperador Nº 7» ↔ «PINGÜINO EMPERADOR 7»).
const hard = (s) => slug(s).replace(/-/g, '').replace(/no(\d)/g, '$1').replace(/n(\d)/g, '$1')

const data = await (await fetch('https://inazumo.es/data/supertecnicas-completas.json', { headers: UA })).json()
const theirs = new Map()
const theirsHard = new Map()
for (const t of data.tecnicas) {
  for (const key of [slug(t.nombreIngles ?? ''), slug(t.nombre ?? '')]) {
    if (key && !theirs.has(key)) theirs.set(key, t)
  }
  for (const key of [hard(t.nombreIngles ?? ''), hard(t.nombre ?? '')]) {
    if (key && !theirsHard.has(key)) theirsHard.set(key, t)
  }
}

const src = await readFile(join(ROOT, 'src/data/inazuma/techniques.ts'), 'utf8')
const ours = [...src.matchAll(/id: '([a-z0-9-]+)', name: "([^"]+)",/g)].map((m) => ({ id: m[1], name: m[2] }))

let lines = ''
let nVideo = 0
for (const o of ours) {
  const t = theirs.get(o.id) ?? theirs.get(slug(o.name)) ?? theirsHard.get(hard(o.id)) ?? theirsHard.get(hard(o.name))
  if (!t) continue
  const parts = []
  if (t.video_link) { parts.push(`video: '${t.video_link}'`); nVideo++ }
  if (typeof t.potencia === 'number') parts.push(`vrPower: ${t.potencia}`)
  if (typeof t.tension === 'number') parts.push(`vrTension: ${t.tension}`)
  if (parts.length) lines += `  '${o.id}': { ${parts.join(', ')} },\n`
}

const out = `// GENERADO por scripts/fetch-inazumo-techdata.mjs — no editar a mano.
// Vídeos (webm en streaming desde el CDN de inazumo.es) y datos VR oficiales
// de cada supertécnica del catálogo. Informativo: el balance del modo es el
// nuestro (ver el comentario del script).
export interface TechMedia {
  video?: string
  vrPower?: number
  vrTension?: number
}

export const TECH_MEDIA: Record<string, TechMedia> = {
${lines}}

export function techVideo(id: string): string | undefined {
  return TECH_MEDIA[id]?.video
}
`
await writeFile(join(ROOT, 'src/data/inazuma/tech-videos.ts'), out)
console.log('técnicas con datos:', out.split('\n').filter((l) => l.startsWith("  '")).length, '· con vídeo:', nVideo)
