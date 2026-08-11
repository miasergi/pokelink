// Convierte `scripts/.cache/inazuma-roster.json` (datos REALES de la wiki) en
// `src/data/inazuma/players.ts`.
//
// Los NOMBRES, POSICIONES y ELEMENTOS salen de la wiki y no se tocan. Lo que
// pone este script son los ATRIBUTOS y la RAREZA, que no existen en ninguna
// fuente y hay que inventarlos para que el roguelite esté equilibrado: se
// reparten por demarcación y por «peso» del personaje en la serie (los que
// aparecen antes en la plantilla de la wiki son los titulares).
//
//   node scripts/emit-inazuma-players.mjs
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const IN = join(ROOT, 'scripts', '.cache', 'inazuma-roster.json')
const OUT = join(ROOT, 'src', 'data', 'inazuma', 'players.ts')

/** Presupuesto de atributos por rareza (suma de los 6). */
const BUDGET = { 1: 200, 2: 240, 3: 285, 4: 330, 5: 375 }

/** Reparto del presupuesto por demarcación (fracción de cada atributo). */
const SHAPE = {
  POR: { tiro: 0.09, control: 0.13, fisico: 0.17, defensa: 0.30, velocidad: 0.13, aguante: 0.18 },
  DEF: { tiro: 0.09, control: 0.14, fisico: 0.24, defensa: 0.27, velocidad: 0.12, aguante: 0.14 },
  MED: { tiro: 0.15, control: 0.27, fisico: 0.13, defensa: 0.16, velocidad: 0.17, aguante: 0.12 },
  DEL: { tiro: 0.30, control: 0.21, fisico: 0.14, defensa: 0.08, velocidad: 0.17, aguante: 0.10 },
}

/** Técnicas por demarcación y nivel de estrella. */
const TECHS = {
  POR: { top: ['p-mano-celestial', 'p-blocaje'], mid: ['p-muralla'], low: ['p-blocaje'] },
  DEF: { top: ['b-muro', 'b-entrada'], mid: ['b-raices'], low: ['b-entrada'] },
  MED: { top: ['r-ilusion', 'r-torbellino'], mid: ['r-paso-montana'], low: ['r-recorte'] },
  DEL: { top: ['t-tornado-fuego', 't-brasa'], mid: ['t-meteorito'], low: ['t-tiro-raso'] },
}

/** Espíritu por elemento, solo para ★4-★5. */
const SPIRIT = { fuego: 'pegaso', bosque: 'ent', aire: 'kraken', montana: 'majin' }

/** Estrellas por puesto en la plantilla: los primeros son los titulares. */
function rarityFor(index, teamId) {
  const elite = teamId === 'royal' || teamId === 'zeus'
  if (index === 0) return elite ? 5 : 4
  if (index <= 2) return elite ? 4 : 3
  if (index <= 6) return 3
  if (index <= 9) return 2
  return elite ? 2 : 1
}

/** Reparte el presupuesto con un poco de ruido determinista por nombre. */
function statsFor(position, rarity, seedStr) {
  let h = 2166136261
  for (const c of seedStr) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0
  const noise = (i) => (((h >>> (i * 4)) & 15) - 7) * 0.6

  const budget = BUDGET[rarity]
  const shape = SHAPE[position] ?? SHAPE.MED
  const out = {}
  const keys = ['tiro', 'control', 'fisico', 'defensa', 'velocidad', 'aguante']
  keys.forEach((k, i) => {
    out[k] = Math.max(18, Math.round(budget * shape[k] + noise(i)))
  })
  return out
}

function techsFor(position, rarity) {
  const t = TECHS[position] ?? TECHS.MED
  if (rarity >= 4) return t.top
  if (rarity === 3) return [...t.mid, ...t.low].slice(0, 2)
  return t.low
}

const q = (s) => `'${s.replace(/'/g, "\\'")}'`

const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function main() {
  const data = JSON.parse(await readFile(IN, 'utf8'))

  const lines = []
  lines.push('// Base de datos de jugadores. GENERADA — no editar a mano el bloque de')
  lines.push('// jugadores: se regenera con `node scripts/emit-inazuma-players.mjs`.')
  lines.push('//')
  lines.push('// NOMBRE, POSICIÓN y ELEMENTO son REALES: salen del infobox de cada personaje')
  lines.push('// en la wiki de Fandom (`name_dub`, `position`, `element`), así que Mark Evans')
  lines.push('// es portero de Montaña porque lo es, no porque me lo haya parecido.')
  lines.push('//')
  lines.push('// Los ATRIBUTOS y la RAREZA sí son inventados: no existen en ninguna fuente con')
  lines.push('// una escala comparable, así que se reparten por demarcación y por el puesto que')
  lines.push('// ocupa el jugador en la plantilla de la wiki (los primeros son los titulares).')
  lines.push('// Presupuesto por rareza: ★1≈200 ★2≈240 ★3≈285 ★4≈330 ★5≈375.')
  lines.push("import { bestFormationFor, getFormation } from '@/data/inazuma/formations'")
  lines.push("import type { PlayerBase } from '@/engine/inazuma/types'")
  lines.push('')
  lines.push('export const PLAYERS: PlayerBase[] = [')

  const seenIds = new Set()
  for (const [teamId, list] of Object.entries(data)) {
    lines.push(`  // ${'='.repeat(30)} ${teamId.toUpperCase()}`)
    let idx = 0
    for (const p of list) {
      if (!p.position || !p.element) continue
      // La wiki añade sufijos de desambiguación al nombre del doblaje
      // («John Neville (game)»); fuera, que se ven en la carta del jugador.
      const cleanName = p.name.replace(/\s*\([^)]*\)\s*$/, '').trim()
      let id = slugify(cleanName)
      const baseId = id
      let n = 2
      while (seenIds.has(id)) id = `${baseId}-${n++}`
      seenIds.add(id)

      const rarity = rarityFor(idx, teamId)
      const st = statsFor(p.position, rarity, id)
      const techs = techsFor(p.position, rarity)
      lines.push('  {')
      lines.push(`    id: ${q(id)}, name: ${q(cleanName)}, team: ${q(teamId)}, position: ${q(p.position)}, element: ${q(p.element)}, rarity: ${rarity},`)
      lines.push(`    stats: { tiro: ${st.tiro}, control: ${st.control}, fisico: ${st.fisico}, defensa: ${st.defensa}, velocidad: ${st.velocidad}, aguante: ${st.aguante} },`)
      lines.push(`    techniques: [${techs.map(q).join(', ')}],`)
      if (rarity >= 4) lines.push(`    spirit: ${q(SPIRIT[p.element])},`)
      lines.push('  },')
      idx++
    }
  }
  lines.push(']')
  lines.push('')
  lines.push('export const PLAYER_BY_ID = new Map(PLAYERS.map((p) => [p.id, p]))')
  lines.push('')
  lines.push('export function getPlayerBase(id: string): PlayerBase {')
  lines.push('  const p = PLAYER_BY_ID.get(id)')
  lines.push('  if (!p) throw new Error(`Jugador desconocido: ${id}`)')
  lines.push('  return p')
  lines.push('}')
  lines.push('')
  lines.push('/** Jugadores de un instituto concreto. */')
  lines.push('export function playersOfTeam(teamId: string): PlayerBase[] {')
  lines.push('  return PLAYERS.filter((p) => p.team === teamId)')
  lines.push('}')
  lines.push('')
  lines.push('export function squadCounts(teamId: string): { DEF: number; MED: number; DEL: number } {')
  lines.push('  const own = playersOfTeam(teamId)')
  lines.push("  const n = (pos: PlayerBase['position']) => own.filter((p) => p.position === pos).length")
  lines.push("  return { DEF: n('DEF'), MED: n('MED'), DEL: n('DEL') }")
  lines.push('}')
  lines.push('')
  lines.push('/** Formación que este instituto puede alinear con su plantilla real. */')
  lines.push('export function formationFor(teamId: string): string {')
  lines.push('  return bestFormationFor(squadCounts(teamId)).id')
  lines.push('}')
  lines.push('')
  lines.push('/**')
  lines.push(' * Once con el que arranca cada instituto, según la formación que pueda')
  lines.push(' * alinear: las plantillas son las reales y cada equipo trae su reparto, así')
  lines.push(' * que un 4-4-2 fijo dejaba a varios con el once inválido de salida.')
  lines.push(' */')
  lines.push('export function startingSquad(teamId: string, formationId?: string): string[] {')
  lines.push('  const own = playersOfTeam(teamId)')
  lines.push('  const f = getFormation(formationId ?? formationFor(teamId))')
  lines.push("  const line = (pos: PlayerBase['position'], n: number) =>")
  lines.push('    own.filter((p) => p.position === pos).slice(0, n).map((p) => p.id)')
  lines.push("  const picked = [...line('POR', 1), ...line('DEF', f.defs), ...line('MED', f.mids), ...line('DEL', f.fwds)]")
  lines.push('  if (picked.length < 11) {')
  lines.push('    const rest = own.filter((p) => !picked.includes(p.id)).map((p) => p.id)')
  lines.push('    picked.push(...rest.slice(0, 11 - picked.length))')
  lines.push('  }')
  lines.push('  return picked.slice(0, 11)')
  lines.push('}')
  lines.push('')
  lines.push('/** Plantilla inicial del Raimon (compatibilidad). */')
  lines.push("export const RAIMON_STARTING_XI: string[] = startingSquad('raimon')")
  lines.push('')

  await writeFile(OUT, lines.join('\n'), 'utf8')

  const total = [...seenIds].length
  console.log(`${total} jugadores escritos en ${OUT}`)
  for (const [teamId, list] of Object.entries(data)) {
    const ok = list.filter((p) => p.position && p.element)
    const byPos = ok.reduce((a, p) => ({ ...a, [p.position]: (a[p.position] ?? 0) + 1 }), {})
    console.log(`  ${teamId.padEnd(9)} ${String(ok.length).padStart(2)}  POR:${byPos.POR ?? 0} DEF:${byPos.DEF ?? 0} MED:${byPos.MED ?? 0} DEL:${byPos.DEL ?? 0}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
