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

/** Clase de técnica que usa cada demarcación. */
const KIND = { POR: 'parada', DEF: 'bloqueo', MED: 'regate', DEL: 'tiro' }

/**
 * Técnicas de salida, LEÍDAS del catálogo generado por
 * `build-inazuma-techniques.mjs`. Antes estaban escritas a mano aquí y, al
 * regenerar el catálogo desde la wiki, todos los jugadores se quedaron
 * apuntando a ids que ya no existían.
 *
 * Se elige por demarcación Y elemento, que es lo que exige el motor para poder
 * aprenderlas: a un defensa de bosque le toca un bloqueo de bosque.
 */
async function readTechniques() {
  const src = await readFile(join(ROOT, 'src', 'data', 'inazuma', 'techniques.ts'), 'utf8')
  const out = []
  const re = /\{ id: '([^']+)', name: "[^"]*", kind: '([^']+)', element: '([^']+)', power: (\d+)/g
  let m
  while ((m = re.exec(src))) out.push({ id: m[1], kind: m[2], element: m[3], power: Number(m[4]) })
  return out
}

/** Las `n` técnicas más flojas de esa clase y elemento, de menos a más. */
function pickTechs(all, position, element, n) {
  const kind = KIND[position] ?? 'regate'
  const pool = all.filter((t) => t.kind === kind && t.element === element)
    .sort((a, b) => a.power - b.power)
  if (!pool.length) return []
  return pool.slice(0, n).map((t) => t.id)
}

/** Espíritu por elemento, solo para ★4-★5. */
const SPIRIT = { fuego: 'pegaso', bosque: 'ent', aire: 'kraken', montana: 'majin' }

/**
 * Estrellas ESCRITAS A MANO para los personajes cuyo peso en la serie conozco.
 *
 * El orden de la wiki no es un escalafón de calidad: coloca a los jugadores por
 * el orden en que aparecen en la ficha del equipo, así que Axel Blaze (el
 * killer del Raimon) salía ★1 y Paul Peabody ★3 y le quitaba el sitio a Kevin
 * Dragonfly en el once. Lo que está en esta tabla manda; el resto sigue con la
 * heurística del índice.
 *
 * Solo hay entradas de los personajes de los que estoy seguro. Si falta alguien
 * que merezca más estrellas, se añade aquí y se vuelve a generar el fichero.
 */
const STARS = {
  // --- Raimon
  'Mark Evans': 5,        // Endou, capitán y portero titular
  'Axel Blaze': 5,        // Gouenji, el killer
  'Kevin Dragonfly': 4,   // Someoka, el otro delantero de referencia
  'Nathan Swift': 4,      // Kazemaru
  'Jack Wallside': 3,
  'Tod Ironside': 3,
  'Steve Grim': 3,
  'Sam Kincaid': 3,
  'Tim Saunders': 3,
  'Maxwell Carson': 3,
  'Bobby Shearer': 3,
  'Jim Wraith': 2,
  'Paul Peabody': 2,
  'William Glass': 2,
  // --- Rivales de los que no hay duda
  'Jude Sharp': 5,        // Kidou, el cerebro de la Royal
  'David Samford': 4,     // Sakuma
  'Byron Love': 5,        // Aphrodi, el as del Zeus
}

/**
 * Estrellas por puesto en la plantilla: los primeros son los titulares.
 *
 * MISMO perfil para todos los institutos. Antes los rivales tenían un techo más
 * bajo que el Raimon (★4 contra ★5) y, al escribir a mano las estrellas de los
 * cracks del Raimon, el jugador se plantaba con dos ★5 y dos ★4 contra equipos
 * cuyo mejor hombre era ★4: el torneo se ganaba en una de cada cuatro partidas.
 * Cada instituto tiene sus figuras; la diferencia entre unos y otros la marca
 * el `power` del equipo, que para eso está.
 */
function rarityFor(index, teamId) {
  // Los equipos Alius son la élite del juego: sus plantillas vienen cargadas.
  const ALIUS = ['genesis', 'chaos', 'prominence', 'diamond-dust', 'epsilon', 'gemini-storm']
  const elite = teamId === 'royal' || teamId === 'zeus' || ALIUS.includes(teamId)
  if (index === 0) return 5
  if (index <= 2) return 4
  if (index <= 8) return 3
  if (index <= 11) return 2
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

/**
 * Cadenas de técnicas CARACTERÍSTICAS escritas a mano para los personajes cuyo
 * repertorio canónico conozco. El resto de jugadores recibe una cadena
 * generada de su demarcación y elemento. Los ids son del catálogo real
 * (`techniques.ts`); si alguno faltara, se descarta con aviso.
 */
const SIGNATURES = {
  'Mark Evans': ['god-hand', 'mugen-the-hand', 'majin-the-hand'],
  // El último paso de estas cadenas es una técnica COMBINADA: despertarla es
  // lo que desbloquea el combo (además hacen falta los compañeros en el campo).
  'Axel Blaze': ['fire-tornado', 'inazuma-break', 'bakunetsu-storm'],
  'Kevin Dragonfly': ['dragon-crash', 'dragon-tornado'],
  'Jude Sharp': ['illusion-ball', 'death-zone'],
  'Nathan Swift': ['coil-turn', 'the-tower'],
  'Byron Love': ['god-break', 'eternal-blizzard'],
}

/**
 * Cadena de técnicas de un jugador: la curada si existe; si no, una generada de
 * su clase y elemento, ascendente en potencia. Las estrellas marcan el techo:
 * un ★5 puede despertar hasta la definitiva, un ★1 se queda en la media.
 */
function signatureFor(all, name, position, element, rarity) {
  const curated = SIGNATURES[name]
  const kind = KIND[position] ?? 'regate'
  const pool = all.filter((t) => t.kind === kind && t.element === element)
    .sort((a, b) => a.power - b.power)
  if (curated) {
    const valid = curated.filter((id) => all.some((t) => t.id === id))
    if (valid.length !== curated.length) console.log(`  ! técnica curada desconocida en ${name}`)
    if (valid.length) return valid
  }
  if (!pool.length) return []
  const at = (f) => pool[Math.min(pool.length - 1, Math.floor(pool.length * f))].id
  const steps = rarity >= 4 ? [0, 0.5, 0.95] : rarity === 3 ? [0, 0.55] : [0, 0.35]
  return [...new Set(steps.map(at))]
}

/**
 * Con qué sale un RIVAL al campo: un tramo de su cadena según sus estrellas.
 * Tu plantilla NO hereda esto — tus jugadores empiezan sin técnicas y las
 * despiertan en las casillas de firma.
 */
function techsFor(signature, rarity) {
  if (!signature.length) return []
  // OJO con subir esto: medido con el bot, dar definitivas de salida disparaba
  // los títulos del 6 % al 22 %.
  if (rarity >= 4) return signature.slice(0, 2)
  return signature.slice(0, 1)
}

const q = (s) => `'${s.replace(/'/g, "\\'")}'`

const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function main() {
  const data = JSON.parse(await readFile(IN, 'utf8'))
  const allTechs = await readTechniques()
  if (!allTechs.length) throw new Error('No he podido leer techniques.ts; ¿está generado?')

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
  for (const [teamId, rawList] of Object.entries(data)) {
    lines.push(`  // ${'='.repeat(30)} ${teamId.toUpperCase()}`)
    // Se ordena por estrellas ANTES de emitir: `startingSquad` coge los
    // primeros de cada línea, así que el orden del fichero ES el once titular.
    const list = rawList
      .map((p, i) => ({ p, i }))
      .sort((a, b) => {
        const sa = STARS[(a.p.name ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim()] ?? 0
        const sb = STARS[(b.p.name ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim()] ?? 0
        return sb - sa || a.i - b.i
      })
      .map((x) => x.p)
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

      const rarity = STARS[cleanName] ?? rarityFor(idx, teamId)
      const st = statsFor(p.position, rarity, id)
      const signature = signatureFor(allTechs, cleanName, p.position, p.element, rarity)
      const techs = techsFor(signature, rarity)
      lines.push('  {')
      lines.push(`    id: ${q(id)}, name: ${q(cleanName)}, team: ${q(teamId)}, position: ${q(p.position)}, element: ${q(p.element)}, rarity: ${rarity},`)
      lines.push(`    stats: { tiro: ${st.tiro}, control: ${st.control}, fisico: ${st.fisico}, defensa: ${st.defensa}, velocidad: ${st.velocidad}, aguante: ${st.aguante} },`)
      lines.push(`    techniques: [${techs.map(q).join(', ')}],`)
      if (signature.length) lines.push(`    signature: [${signature.map(q).join(', ')}],`)
      if (rarity >= 4) lines.push(`    spirit: ${q(SPIRIT[p.element])},`)
      lines.push('  },')
      idx++
    }
  }
  lines.push(']')
  lines.push('')
  lines.push('/** Institutos del torneo; el resto de equipos son SOLO fichables. */')
  lines.push("const BRACKET_TEAMS = new Set(['raimon', 'occult', 'otaku', 'wild', 'shuriken', 'farm', 'kirkwood', 'royal', 'zeus'])")
  lines.push('')
  lines.push('/** Equipos extra (temporada 2 y Alius): su gente entra por el ojeador. */')
  lines.push('export const EXTRA_TEAMS: string[] = [...new Set(PLAYERS.map((p) => p.team))].filter((t) => !BRACKET_TEAMS.has(t))')
  lines.push('')
  lines.push('/** Nombre visible de los equipos extra (no están en `teams.ts`). */')
  lines.push('export const TEAM_NAMES: Record<string, string> = {')
  lines.push("  kfc: 'Inazuma KFC',")
  lines.push("  oumihara: 'Instituto Oumihara',")
  lines.push("  mikage: 'Mikage Sennou',")
  lines.push("  manyuuji: 'Instituto Manyuuji',")
  lines.push("  yokato: 'Instituto Yokato',")
  lines.push("  'gemini-storm': 'Tormenta Géminis',")
  lines.push("  epsilon: 'Épsilon',")
  lines.push("  'diamond-dust': 'Diamond Dust',")
  lines.push("  prominence: 'Prominence',")
  lines.push("  genesis: 'Génesis',")
  lines.push("  chaos: 'Caos',")
  lines.push('}')
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
