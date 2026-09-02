// EQUIPOS NUEVOS de una tirada:
//  1. El RAIMON DE LA 2.ª TEMPORADA ('raimon-2'): variantes de gente que ya
//     está en el catálogo (Mark, Axel, Jude tras su fichaje, Shawn, Darren…).
//  2. TRES equipos FICTICIOS ('callejeros', 'trotamundos', 'forasteros')
//     llenos de SCOUTS de los juegos originales (personajes reclutables tipo
//     Nev Erin que no pertenecen a ningún instituto): más futbolistas, menos
//     repeticiones. Fuente: Category:Original series scouts de la wiki.
//
//   node scripts/fetch-inazuma-scouts.mjs
//
// Baja los retratos a public/inazuma/players/ y escribe el bloque de datos en
// scripts/.cache/scouts-block.ts (para pegarlo en players.ts).
import { writeFile, readFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const API = 'https://inazuma-eleven.fandom.com/api.php'
const UA = { 'User-Agent': 'pokelink-scouts/1.0 (script de un solo uso)' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const api = async (p) => (await fetch(`${API}?${new URLSearchParams({ format: 'json', ...p })}`, { headers: UA })).json()
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const POS = { GK: 'POR', DF: 'DEF', MF: 'MED', FW: 'DEL' }
const EL = { Fire: 'fuego', Wood: 'bosque', Forest: 'bosque', Wind: 'aire', Earth: 'montana', Mountain: 'montana' }

// Presupuesto de relleno (~fame 1-2) con forma por demarcación.
const SHAPE = {
  POR: { tiro: 0.06, control: 0.11, fisico: 0.14, defensa: 0.12, velocidad: 0.11, aguante: 0.16, portero: 0.30 },
  DEF: { tiro: 0.09, control: 0.14, fisico: 0.21, defensa: 0.25, velocidad: 0.11, aguante: 0.13, portero: 0.07 },
  MED: { tiro: 0.15, control: 0.27, fisico: 0.11, defensa: 0.14, velocidad: 0.16, aguante: 0.10, portero: 0.07 },
  DEL: { tiro: 0.30, control: 0.21, fisico: 0.13, defensa: 0.07, velocidad: 0.16, aguante: 0.08, portero: 0.05 },
}
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
function statsFor(id, pos) {
  const h = hash(id)
  const budget = 200 + (h % 28)
  const out = {}
  Object.entries(SHAPE[pos]).forEach(([k, f], i) => {
    const noise = 0.94 + (((h >> (i * 4)) & 0xff) / 255) * 0.12
    out[k] = Math.max(10, Math.round(budget * f * noise))
  })
  return out
}
const GENERIC_SIG = {
  POR: ['ice-block', 'earthquake', 'frozen-steal'],
  DEF: ['block-circus', 'zigzag-flame', 'rolling-slide'],
  MED: ['zanzou', 'bunshin-feint', 'magic'],
  DEL: ['grenade-shot', 'rocket-head', 'condor-dive'],
}

async function exists(p) { try { await access(p); return true } catch { return false } }

async function portraitFor(wiki, id) {
  const dest = join(ROOT, 'public', 'inazuma', 'players', `${id}.png`)
  if (await exists(dest)) return true
  for (const title of [`File:${wiki} 3D (1).png`, `File:${wiki} 3D.png`, `File:${wiki}.png`, `File:${wiki} sprite.png`]) {
    const j = await api({ action: 'query', titles: title, prop: 'imageinfo', iiprop: 'url', iiurlwidth: '256' })
    const ii = Object.values(j?.query?.pages ?? {})[0]?.imageinfo?.[0]
    await sleep(200)
    if (!ii) continue
    const res = await fetch(`${(ii.thumburl ?? ii.url).split('?')[0]}?format=png`, { headers: UA })
    if (!res.ok) continue
    await writeFile(dest, Buffer.from(await res.arrayBuffer()))
    return true
  }
  return false
}

async function main() {
  const catalog = await readFile(join(ROOT, 'src/data/inazuma/techniques.ts'), 'utf8')
  const techIds = new Set([...catalog.matchAll(/id: '([a-z0-9-]+)'/g)].map((m) => m[1]))
  const playersSrc = await readFile(join(ROOT, 'src/data/inazuma/players.ts'), 'utf8')
  const usedIds = new Set([...playersSrc.matchAll(/id: '([a-z0-9-]+)'/g)].map((m) => m[1]))

  // ---- 1. Los scouts ------------------------------------------------------
  let cont
  const members = []
  do {
    const j = await api({ action: 'query', list: 'categorymembers', cmtitle: 'Category:Original series scouts', cmlimit: '500', ...(cont ? { cmcontinue: cont } : {}) })
    members.push(...(j.query?.categorymembers ?? []).map((m) => m.title))
    cont = j.continue?.cmcontinue
    await sleep(250)
  } while (cont)
  console.log('scouts en la categoría:', members.length)

  const picked = []
  // Muestreo con zancada por todo el alfabeto, hasta 45 válidos con retrato.
  const stride = Math.max(1, Math.floor(members.length / 140))
  for (let i = 0; i < members.length && picked.length < 45; i += stride) {
    const title = members[i]
    if (/\(scout character\)/.test(title) ? false : /[()]/.test(title)) continue
    const j = await api({ action: 'query', titles: title, prop: 'revisions', rvprop: 'content', rvslots: 'main' })
    const wt = Object.values(j?.query?.pages ?? {})[0]?.revisions?.[0]?.slots?.main?.['*'] ?? ''
    await sleep(200)
    if (!wt.includes('{{ScoutCharacter')) continue
    const dub = wt.match(/name_dub\s*=\s*([^\n|}]+)/)?.[1]?.trim()
    const pos = POS[wt.match(/position\s*=\s*([A-Z]+)/)?.[1] ?? '']
    const el = EL[wt.match(/element\s*=\s*(\w+)/)?.[1] ?? '']
    if (!dub || !pos || !el || /[{}[\]]/.test(dub)) continue
    const id = slug(dub)
    if (!id || usedIds.has(id)) continue
    // Sus hissatsu de los juegos ({{H|...|Nombre}}), colados por el catálogo.
    const hs = [...new Set([...wt.matchAll(/\{\{H\|[^|}]+\|([^|}]+)\}\}/g)].map((m) => slug(m[1])))]
      .filter((t) => techIds.has(t))
    if (!(await portraitFor(title.replace(/ \(scout character\)$/, ''), id))) continue
    usedIds.add(id)
    picked.push({ id, name: dub, pos, el, sig: hs })
    console.log(`  ✓ ${picked.length}/45 ${dub} (${pos}/${el})${hs.length ? ' · ' + hs.length + ' téc.' : ''}`)
  }

  // Reparto en 3 equipos con las posiciones balanceadas.
  const teams = { callejeros: [], trotamundos: [], forasteros: [] }
  const keys = Object.keys(teams)
  const byPos = { POR: [], DEF: [], MED: [], DEL: [] }
  for (const p of picked) byPos[p.pos].push(p)
  let t = 0
  for (const pos of ['POR', 'DEF', 'MED', 'DEL']) {
    for (const p of byPos[pos]) { teams[keys[t % 3]].push(p); t++ }
  }

  let block = ''
  for (const [teamId, list] of Object.entries(teams)) {
    block += `  // ============================== ${teamId.toUpperCase()} (scouts de los juegos)\n`
    for (const p of list) {
      const st = statsFor(p.id, p.pos)
      const sig = (p.sig.length ? p.sig : GENERIC_SIG[p.pos]).slice(0, 4)
      block += `  {\n    id: '${p.id}', name: ${JSON.stringify(p.name).replace(/"/g, "'")}, team: '${teamId}', position: '${p.pos}', element: '${p.el}', fame: 1,\n`
      block += `    stats: { tiro: ${st.tiro}, control: ${st.control}, fisico: ${st.fisico}, defensa: ${st.defensa}, velocidad: ${st.velocidad}, aguante: ${st.aguante} },\n`
      block += `    techniques: ['${sig[0]}'],\n    signature: [${sig.map((x) => `'${x}'`).join(', ')}],\n  },\n`
    }
  }

  // ---- 2. El Raimon de la 2.ª temporada ----------------------------------
  const SECOND = [
    'mark-evans', 'darren-lachance', 'jack-wallside', 'tod-ironside', 'hurley-kane',
    'nathan-swift', 'scott-banyan', 'steve-grim', 'tim-saunders', 'sam-kincaid',
    'jude-sharp', 'kevin-dragonfly', 'shawn-froste', 'axel-blaze',
  ]
  block += `  // ============================== RAIMON (2.ª TEMPORADA)\n`
  for (const person of SECOND) {
    // La MEJOR entrada existente de esa persona, para copiar sus datos.
    const re = new RegExp(`  \\{\\n(?:    //[^\\n]*\\n)*    id: '${person}(?:-\\d+)?', name: '([^']+)'[^\\n]*element: '(\\w+)', fame: (\\d)[^]*?position: '(\\w+)'[^]*?\\n  \\},`)
    // regex frágil: mejor parse por bloque
    const blocks = playersSrc.split(/\n  \{\n/).filter((b) => new RegExp(`id: '${person}(-\\d+)?',`).test(b))
    if (!blocks.length) { console.log('  ✗ sin base para', person); continue }
    const src = blocks.sort((a, b) => (Number(b.match(/fame: (\d)/)?.[1] ?? 0)) - (Number(a.match(/fame: (\d)/)?.[1] ?? 0)))[0]
    const name = src.match(/name: '([^']+)'/)?.[1]
    const posM = src.match(/position: '(\w+)'/)?.[1]
    const elM = src.match(/element: '(\w+)'/)?.[1]
    const fame = src.match(/fame: (\d)/)?.[1]
    const stats = src.match(/stats: \{[^}]+\}/)?.[0]
    const techniques = src.match(/techniques: \[[^\]]*\]/)?.[0]
    const signature = src.match(/signature: \[[^\]]*\]/)?.[0]
    let n = 2
    while (usedIds.has(`${person}-${n}`)) n++
    const id = `${person}-${n}`
    usedIds.add(id)
    block += `  {\n    id: '${id}', name: '${name}', team: 'raimon-2', position: '${posM}', element: '${elM}', fame: ${fame},\n    ${stats},\n    ${techniques},\n    ${signature},\n  },\n`
    void re
  }

  await writeFile(join(ROOT, 'scripts/.cache/scouts-block.ts'), block)
  console.log('\nBloque escrito en scripts/.cache/scouts-block.ts —', block.split('\n  {').length - 1, 'jugadores')
}

await main()
