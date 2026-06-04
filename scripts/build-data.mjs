// ============================================================================
// build-data.mjs — Genera la "BD interna" desde PokeAPI.
// Salida: src/data/generated/pokemon.json y moves.json
// Cachea cada respuesta en scripts/.cache para que las re-ejecuciones sean rápidas
// y resumibles. Uso: npm run build-data  (o: node scripts/build-data.mjs)
// ============================================================================

import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CACHE_DIR = path.join(__dirname, '.cache')
const OUT_DIR = path.join(ROOT, 'src', 'data', 'generated')
const API = 'https://pokeapi.co/api/v2'
const MAX_DEX = 1025 // especies principales (sin formas alternas id>=10000)
const CONCURRENCY = 12

const ARTWORK = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
const FRONT = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`

// ---- fetch con caché en disco + reintentos --------------------------------
async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function getJSON(url) {
  const key = createHash('sha1').update(url).digest('hex') + '.json'
  const cacheFile = path.join(CACHE_DIR, key)
  if (await exists(cacheFile)) {
    return JSON.parse(await readFile(cacheFile, 'utf8'))
  }
  let lastErr
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url)
      if (res.status === 404) {
        await writeFile(cacheFile, 'null')
        return null
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      const json = await res.json()
      await writeFile(cacheFile, JSON.stringify(json))
      return json
    } catch (err) {
      lastErr = err
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
    }
  }
  throw lastErr
}

// Ejecuta tareas con límite de concurrencia y barra de progreso simple.
async function pool(items, worker, label) {
  const results = new Array(items.length)
  let i = 0
  let done = 0
  async function run() {
    while (i < items.length) {
      const idx = i++
      results[idx] = await worker(items[idx], idx)
      done++
      if (done % 25 === 0 || done === items.length) {
        process.stdout.write(`\r${label}: ${done}/${items.length}   `)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, run))
  process.stdout.write('\n')
  return results
}

// ---- mapeos ----------------------------------------------------------------
const AILMENT_MAP = {
  paralysis: 'par',
  burn: 'brn',
  poison: 'psn',
  freeze: 'frz',
  sleep: 'slp',
  // 'toxic' no es ailment en PokeAPI; veneno grave se modela aparte si hace falta
}

const ITEM_EVO_MAP = {
  'fire-stone': 'fire-stone',
  'water-stone': 'water-stone',
  'thunder-stone': 'thunder-stone',
  'leaf-stone': 'leaf-stone',
  'moon-stone': 'moon-stone',
  'sun-stone': 'sun-stone',
  'shiny-stone': 'shiny-stone',
  'dusk-stone': 'dusk-stone',
  'dawn-stone': 'dawn-stone',
  'ice-stone': 'ice-stone',
}

function pickLevelUpLearnset(pokemon) {
  const out = []
  for (const m of pokemon.moves) {
    const moveId = idFromUrl(m.move.url)
    let level = null
    for (const d of m.version_group_details) {
      if (d.move_learn_method.name === 'level-up') {
        const lv = d.level_learned_at
        if (level === null || lv < level) level = lv
      }
    }
    if (level !== null) out.push({ moveId, level: level === 0 ? 1 : level })
  }
  // dedup por moveId (menor nivel) y orden por nivel
  const byId = new Map()
  for (const e of out) {
    if (!byId.has(e.moveId) || e.level < byId.get(e.moveId)) byId.set(e.moveId, e.level)
  }
  return [...byId.entries()]
    .map(([moveId, level]) => ({ moveId, level }))
    .sort((a, b) => a.level - b.level)
}

function idFromUrl(url) {
  const m = url.match(/\/(\d+)\/?$/)
  return m ? Number(m[1]) : null
}

function parseEvolutionChain(chain) {
  // Devuelve Map<fromId, EvolutionStep[]>
  const steps = new Map()
  function walk(node) {
    const fromId = idFromUrl(node.species.url)
    for (const next of node.evolves_to) {
      const toId = idFromUrl(next.species.url)
      const det = next.evolution_details[0] || {}
      let trigger = null
      if (det.min_level) trigger = { kind: 'level', level: det.min_level }
      else if (det.item && ITEM_EVO_MAP[det.item.name])
        trigger = { kind: 'item', itemId: ITEM_EVO_MAP[det.item.name] }
      else if (det.trigger && det.trigger.name === 'trade') trigger = { kind: 'trade' }
      else if (det.min_happiness) trigger = { kind: 'friendship' }
      else trigger = { kind: 'level', level: 30 } // fallback razonable
      if (toId && toId <= MAX_DEX) {
        if (!steps.has(fromId)) steps.set(fromId, [])
        steps.get(fromId).push({ toId, trigger })
      }
      walk(next)
    }
  }
  walk(chain.chain)
  return steps
}

// ---- main ------------------------------------------------------------------
async function main() {
  await mkdir(CACHE_DIR, { recursive: true })
  await mkdir(OUT_DIR, { recursive: true })

  // 1) Movimientos: lista completa
  console.log('Descargando lista de movimientos...')
  const moveList = (await getJSON(`${API}/move?limit=100000`)).results
  const moveDetails = await pool(
    moveList,
    (m) => getJSON(m.url),
    'moves',
  )

  const moves = []
  for (const mv of moveDetails) {
    if (!mv || !mv.damage_class) continue
    const category = mv.damage_class.name // physical/special/status
    const meta = mv.meta || {}
    const effect = {}
    const ailment = meta.ailment && AILMENT_MAP[meta.ailment.name]
    if (ailment) {
      effect.ailment = ailment
      effect.chance = category === 'status' ? 1 : (meta.ailment_chance || 100) / 100
    }
    if (mv.stat_changes && mv.stat_changes.length) {
      const selfTarget = mv.target && mv.target.name && mv.target.name.startsWith('user')
      effect.statChanges = mv.stat_changes.map((sc) => ({
        stat: mapStat(sc.stat.name),
        stages: sc.change,
        target: selfTarget || sc.change > 0 ? 'self' : 'opponent',
      }))
      if (effect.chance === undefined)
        effect.chance = category === 'status' ? 1 : (meta.stat_chance || 100) / 100
    }
    if (meta.drain && meta.drain > 0) effect.drain = meta.drain / 100
    if (meta.drain && meta.drain < 0) effect.recoil = Math.abs(meta.drain) / 100
    if (meta.healing && meta.healing > 0) effect.heal = meta.healing / 100
    if (meta.min_hits && meta.max_hits && meta.max_hits > 1)
      effect.multiHit = [meta.min_hits, meta.max_hits]
    if (meta.crit_rate && meta.crit_rate > 0) (effect.flags ||= []).push('highCrit')

    moves.push({
      id: mv.id,
      name: mv.name,
      type: mv.type.name,
      category,
      power: mv.power || 0,
      accuracy: mv.accuracy == null ? 0 : mv.accuracy,
      pp: mv.pp || 5,
      priority: mv.priority || 0,
      effect: Object.keys(effect).length ? effect : undefined,
    })
  }
  moves.sort((a, b) => a.id - b.id)
  await writeFile(path.join(OUT_DIR, 'moves.json'), JSON.stringify(moves))
  console.log(`✓ ${moves.length} movimientos -> moves.json`)

  // 2) Pokémon (1..MAX_DEX)
  const ids = Array.from({ length: MAX_DEX }, (_, i) => i + 1)
  console.log('Descargando Pokémon...')
  const pokeData = await pool(ids, (id) => getJSON(`${API}/pokemon/${id}`), 'pokemon')
  console.log('Descargando especies...')
  const speciesData = await pool(ids, (id) => getJSON(`${API}/pokemon-species/${id}`), 'species')

  // cadenas de evolución (únicas)
  const chainUrls = new Set()
  for (const sp of speciesData) {
    if (sp && sp.evolution_chain) chainUrls.add(sp.evolution_chain.url)
  }
  console.log('Descargando cadenas de evolución...')
  const chains = await pool([...chainUrls], (url) => getJSON(url), 'chains')
  const evoSteps = new Map() // fromId -> EvolutionStep[]
  for (const ch of chains) {
    if (!ch) continue
    for (const [from, steps] of parseEvolutionChain(ch)) evoSteps.set(from, steps)
  }
  // set de ids que evolucionan (para isFinal)
  const evolvesFrom = new Set(evoSteps.keys())

  const species = []
  for (let i = 0; i < ids.length; i++) {
    const p = pokeData[i]
    const sp = speciesData[i]
    if (!p || !sp) continue
    const id = p.id
    const stats = {}
    for (const s of p.stats) {
      const k = mapStat(s.stat.name)
      if (k) stats[k] = s.base_stat
    }
    const generation = genNumber(sp.generation && sp.generation.name)
    species.push({
      id,
      name: p.name,
      displayName: capitalize(sp.name),
      types: p.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
      baseStats: {
        hp: stats.hp,
        atk: stats.atk,
        def: stats.def,
        spa: stats.spa,
        spd: stats.spd,
        spe: stats.spe,
      },
      generation,
      learnset: pickLevelUpLearnset(p),
      evolutions: evoSteps.get(id) || [],
      isFinal: !evolvesFrom.has(id),
      legendary: !!(sp.is_legendary || sp.is_mythical),
      spriteArtwork: ARTWORK(id),
      spriteFront: FRONT(id),
      catchRate: sp.capture_rate ?? 45,
      baseExp: p.base_experience ?? 100,
    })
  }
  species.sort((a, b) => a.id - b.id)
  await writeFile(path.join(OUT_DIR, 'pokemon.json'), JSON.stringify(species))
  console.log(`✓ ${species.length} Pokémon -> pokemon.json`)

  // 3) Megaevoluciones y formas primigenias
  const speciesById = new Map(species.map((s) => [s.id, s]))
  const megaVarieties = [] // { baseId, baseSpecies, url }
  for (const sp of speciesData) {
    if (!sp || !sp.varieties) continue
    for (const v of sp.varieties) {
      const n = v.pokemon.name
      if (n.includes('-mega') || n.includes('-primal')) {
        megaVarieties.push({ baseId: idFromUrl(sp.url || `/${sp.id}/`) || sp.id, url: v.pokemon.url, name: n })
      }
    }
  }
  console.log('Descargando megaevoluciones...')
  const megaDetails = await pool(megaVarieties, (m) => getJSON(m.url), 'megas')
  const megas = []
  for (let i = 0; i < megaVarieties.length; i++) {
    const mv = megaVarieties[i]
    const d = megaDetails[i]
    if (!d) continue
    const base = speciesById.get(mv.baseId)
    if (!base) continue
    const stats = {}
    for (const s of d.stats) {
      const k = mapStat(s.stat.name)
      if (k) stats[k] = s.base_stat
    }
    const isPrimal = mv.name.includes('-primal')
    const suffix = mv.name.endsWith('-x') ? ' X' : mv.name.endsWith('-y') ? ' Y' : ''
    megas.push({
      id: d.id,
      baseId: mv.baseId,
      name: d.name,
      displayName: isPrimal
        ? `${base.displayName} Primigenio`
        : `Mega ${base.displayName}${suffix}`,
      types: d.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
      baseStats: {
        hp: stats.hp, atk: stats.atk, def: stats.def, spa: stats.spa, spd: stats.spd, spe: stats.spe,
      },
      generation: base.generation,
      learnset: base.learnset,
      evolutions: [],
      isFinal: true,
      legendary: base.legendary,
      spriteArtwork: ARTWORK(d.id),
      spriteFront: FRONT(d.id),
      catchRate: base.catchRate,
      baseExp: base.baseExp,
      isMega: true,
    })
  }
  megas.sort((a, b) => a.baseId - b.baseId)
  await writeFile(path.join(OUT_DIR, 'megas.json'), JSON.stringify(megas))
  console.log(`✓ ${megas.length} megaevoluciones -> megas.json`)

  console.log('Hecho.')
}

function mapStat(name) {
  switch (name) {
    case 'hp': return 'hp'
    case 'attack': return 'atk'
    case 'defense': return 'def'
    case 'special-attack': return 'spa'
    case 'special-defense': return 'spd'
    case 'speed': return 'spe'
    default: return null
  }
}

function genNumber(name) {
  const map = {
    'generation-i': 1, 'generation-ii': 2, 'generation-iii': 3,
    'generation-iv': 4, 'generation-v': 5, 'generation-vi': 6,
    'generation-vii': 7, 'generation-viii': 8, 'generation-ix': 9,
  }
  return map[name] || 1
}

function capitalize(s) {
  return s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
