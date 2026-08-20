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
  // Se lee también la ÉPOCA (`era: 'vr'`), que decide a quién se le puede
  // repartir cada técnica.
  const re = /\{ id: '([^']+)', name: "[^"]*", kind: '([^']+)', element: '([^']+)', power: (\d+), cost: \d+(, era: '([a-z]+)')?/g
  let m
  while ((m = re.exec(src))) {
    out.push({ id: m[1], kind: m[2], element: m[3], power: Number(m[4]), era: m[6] })
  }
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

// ---------------------------------------------------------------------------
// PARCHES DE DATOS (la wiki no siempre está fina)
// ---------------------------------------------------------------------------

/**
 * Fichas INCOMPLETAS que el crawler descartaba por no traer demarcación o
 * elemento. Se completan a mano (por nombre de wiki) en vez de perder al
 * jugador: eran cinco equipos jugando con uno menos.
 */
const FILL_IN = {
  'Shark The Deep': { position: 'DEL' },
  Nori: { element: 'bosque' },
  "Surfin' Bu": { position: 'MED', element: 'aire' },
  Edgar: { element: 'aire' },
  Zel: { element: 'fuego' },
}

/** Nombres del doblaje ESPAÑOL que la wiki trae con el del inglés. */
const NAME_FIX = {}

/**
 * Equipos CLONADOS: la wiki resolvía dos páginas distintas a la misma
 * plantilla, y el catálogo acababa con 14 jugadores duplicados que salían en
 * fichajes y ojeadores. Se emite solo el bueno.
 */
const CLONE_TEAMS = new Set([
  'wild',
  // «Shuuyou Meito Gakuen» y «Otaku Gakuen» son EL MISMO instituto (la wiki
  // resuelve las dos páginas a la misma plantilla): 14 clones, entre ellos
  // los dos Walter Valiant que cantó el playtest.
  'shuuyou-meito',
])

/**
 * Equipos de RECLUTAMIENTO (los que el juego arma juntando gente suelta por
 * elemento). Se emiten los ÚLTIMOS para que el id limpio se lo quede el equipo
 * de la historia: si no, Mac Robingo salía como jugador de The Fires y su
 * Brasil se quedaba con el `-2`.
 */
/**
 * Equipos de VICTORY ROAD: otra época. Sus jugadores rellenan cadena con
 * técnicas de VR, y los clásicos NUNCA con las de VR — si no, a Mark Evans le
 * salía una técnica del futuro y a los chavales nuevos una de los 2000.
 */
const VR_TEAMS = new Set([
  'nagumohara', 'ouja-raimon', 'hokuyou-gakuen', 'ai-gakuen', 'houreikan',
  'ijin-meibundou', 'keizen-arashiyama', 'nishinomiya', 'senjutsu-no-teikoku',
  'toufuu-ikokukan', 'hakuren-vr',
])

const LOW_PRIORITY_TEAMS = new Set([
  'the-fires', 'the-mountains', 'the-woods', 'windies', 'extra-stars', 'kage-no-hero', 'chaos',
])

/**
 * PESO EN LA SERIE, escrito a mano para los personajes que conozco.
 *
 * OJO: no es la RAREZA del juego (Normal/Avanzado/Ídolo/Legendario, que va de
 * 1 a 4 y la subes tú con medallas). Esto es cuánto pinta el personaje en la
 * serie: decide con qué frecuencia lo ofrece el ojeador, lo que cuesta
 * traspasarlo y si sale de titular en SU equipo.
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
  // --- Capitanes y cracks de los equipos añadidos (IE1/IE2/IE3) ---
  'Harper Evans': 5, // el protagonista de Victory Road
  'Mac Robingo': 5, // capitán de Brasil
  'Edgar Partinus': 5, // capitán de Knights of Queen
  'Carlos Lagarto': 4,
  'Gato Carvalho': 4,
  'Teles Torrue': 5, // capitán de The Empire
  'Rococo Urupa': 5, // capitán de Little Gigant
  'Fideo Ardena': 5,
  'Dylan Keith': 5,
  'Mark Kruger': 5, // capitán de Brockenborg
  'Gianluca Zanardi': 4,
  'Napolion Ambrose': 4, // Rose Griffon
  'Yukimura Hyouga': 4,
  'Fubuki Atsuya': 4,
  'Aiden Frost': 5, // Hakuren
  'Ray Dark': 5,
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
  // Cadenas CANÓNICAS revisadas a mano (las de la serie, con las técnicas
  // chulas). Las técnicas de combo van dentro de la cadena de su dueño:
  // despertarlas es lo que desbloquea el combo. El orden de potencia dentro
  // del mismo tipo lo garantiza después `sortSameKindAscending`.
  //
  // Mark: NUNCA usó la Mano Infinita (esa es de Tachimukai/Darren) — su
  // línea es Celestial → Ultradimensional → Demoníaca → Parada Celestial.
  'Mark Evans': ['god-hand', 'ijigen-the-hand', 'majin-the-hand', 'god-catch'],
  'Darren LaChance': ['mugen-the-hand'],
  'Axel Blaze': ['fire-tornado', 'honoo-no-kazamidori', 'inazuma-break', 'bakunetsu-storm'],
  'Kevin Dragonfly': ['dragon-crash', 'dragon-tornado', 'wyvern-crash'],
  'Jude Sharp': ['illusion-ball', 'death-zone', 'koutei-penguin-2gou'],
  'Byron Love': ['god-knows', 'heaven-s-time'],
  'Nathan Swift': ['shippuu-dash'],
  'Jack Wallside': ['the-wall'],
  'Shawn Froste': ['eternal-blizzard', 'wolf-legend'],
  'Xavier Foster': ['ryuusei-blade'],
  'Austin Hobbes': ['the-phoenix'],
  'Hurley Kane': ['tsunami-boost'],
  'Caleb Stonewall': ['koutei-penguin-1gou'],
}

const slugTech = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/**
 * Cadena de técnicas de un jugador. Prioridad:
 *  1. Sus técnicas CANÓNICAS: la lista `hissatsu` que el crawler saca de su
 *     ficha en la wiki (los movesets reales de los juegos), filtrada a las que
 *     existen en el catálogo Y son de la clase de su demarcación, ordenada de
 *     menos a más potencia. Aquí puede haber técnicas de OTRO elemento — es lo
 *     canónico (Someoka es de bosque y su Tornado de Dragón es de fuego) y la
 *     cadena se lo salta a propósito: son SUYAS.
 *  2. La tabla curada, que garantiza las técnicas de los combos.
 *  3. Relleno generado por clase y elemento si con lo real no llega a dos.
 */
/**
 * @param all      Catálogo COMPLETO: de aquí sale lo CANÓNICO (lo que el
 *                 jugador usa de verdad en el juego), pase lo que pase con la
 *                 época — los chavales de Victory Road heredan un montón de
 *                 técnicas clásicas y quitárselas los dejaba con relleno.
 * @param fillPool Subconjunto de SU época: solo para el relleno inventado, que
 *                 es donde sí importa no mezclar (a Mark Evans no le cuelga una
 *                 técnica del futuro porque le falte un hueco).
 */
function signatureFor(all, name, position, element, rarity, hissatsu = [], fillPool = all) {
  const kind = KIND[position] ?? 'regate'
  const byId = new Map(all.map((t) => [t.id, t]))
  // Puesto que ocupa cada técnica en SU moveset: es el orden en que las
  // aprende en el juego, y es lo que manda al ordenar la cadena.
  const canonRank = new Map()
  hissatsu.forEach((h, i) => {
    const id = slugTech(h)
    if (!canonRank.has(id)) canonRank.set(id, i)
  })

  const curated = (SIGNATURES[name] ?? []).filter((id) => byId.has(id))

  // Clases ADMISIBLES: el portero vive de paradas; el resto puede llevar
  // TIROS, REGATES y BLOQUEOS en la cadena — cualquiera defiende un córner o
  // remata una jugada, y capar la cadena a la clase del puesto dejaba a los
  // defensas sin nada que hacer al atacar (y viceversa).
  const kinds = position === 'POR' ? ['parada'] : ['tiro', 'regate', 'bloqueo']

  // EN EL ORDEN DE LA WIKI, que es el del juego: las primeras de su moveset
  // son LAS SUYAS (el Excalibur de Edgar va segundo). Ordenar por potencia
  // aquí, como se hacía antes, se cargaba esa señal y le dejaba fuera su
  // técnica de siempre. La cadena se ordena por potencia igualmente al final
  // (`sortSameKindAscending`), que es donde importa.
  const real = hissatsu
    .map(slugTech)
    .filter((id, i, arr) => arr.indexOf(id) === i)
    .filter((id) => kinds.includes(byId.get(id)?.kind) && !curated.includes(id))
  const realPrimary = real.filter((id) => byId.get(id).kind === kind)
  const realOther = real.filter((id) => byId.get(id).kind !== kind)

  // Lo curado primero y EN SU ORDEN (canon manda). Después lo real: hasta DOS
  // de su clase, y una de cada clase que aún falte — así el moveset canónico
  // mixto de la wiki entra entero en vez de tirarse a la basura.
  const merged = [...curated]
  const countKind = (k) => merged.filter((id) => byId.get(id)?.kind === k).length
  for (const id of realPrimary) { if (merged.length < 4 && countKind(kind) < 2) merged.push(id) }
  for (const k of kinds) {
    if (k === kind) continue
    if (merged.length >= 4 || countKind(k) > 0) continue
    const cand = realOther.find((id) => byId.get(id).kind === k && !merged.includes(id))
    if (cand) merged.push(cand)
  }
  for (const id of [...realPrimary, ...realOther]) { if (merged.length < 4 && !merged.includes(id)) merged.push(id) }

  // CADENAS SOLO CANÓNICAS: cada jugador lleva LO SUYO y nada más — como las
  // evoluciones de Pokémon, no todos tienen 4 pasos ni falta que les hace.
  // El chaval de barrio con una técnica ES diseño; el crack lleva su arsenal.
  if (merged.length >= 1) return sortSameKindAscending(merged.slice(0, 4), byId, canonRank)

  // Relleno DETERMINISTA POR JUGADOR, cubriendo las clases que falten: la
  // cadena de un no-portero acaba con AL MENOS un tiro, un regate y un
  // bloqueo (salvo canon curado que diga otra cosa). Dentro de cada clase,
  // banda de potencia por hueco y el hash del nombre elige SU técnica.
  let h = 2166136261
  for (const ch of name) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) }
  h = h >>> 0
  // Qué clase pide cada hueco de relleno: primero las que faltan (empezando
  // por la del puesto), luego repetir la del puesto.
  const missing = kinds.filter((k) => countKind(k) === 0)
  missing.sort((a, b) => (a === kind ? -1 : 0) - (b === kind ? -1 : 0))
  const wanted = [missing[0] ?? kind]

  const picks = []
  wanted.forEach((k, i) => {
    // Primero las de SU época; si esa combinación de clase y elemento no da
    // (el catálogo de VR es corto en algunos cruces), se cae al catálogo
    // completo: mejor una técnica clásica que una cadena coja de 2 pasos —
    // que es justo lo que pasaba con 44 jugadores de Victory Road.
    let pool = fillPool
      .filter((t) => t.kind === k && t.element === element && !merged.includes(t.id) && !picks.includes(t.id))
      .sort((a, b) => a.power - b.power)
    if (!pool.length) {
      pool = all
        .filter((t) => t.kind === k && t.element === element && !merged.includes(t.id) && !picks.includes(t.id))
        .sort((a, b) => a.power - b.power)
    }
    if (!pool.length) return
    const slot = merged.length + i
    const bandStart = Math.floor((pool.length * slot) / 4)
    const bandEnd = Math.max(bandStart + 1, Math.floor((pool.length * (slot + 1)) / 4))
    const idx = Math.min(pool.length - 1, bandStart + ((h >>> (i * 5)) % (bandEnd - bandStart)))
    if (pool[idx]) picks.push(pool[idx].id)
  })
  return sortSameKindAscending([...merged, ...picks].slice(0, 4), byId, canonRank)
}

/**
 * Dentro del MISMO tipo (tiro/regate/bloqueo/parada), cada paso posterior de
 * la cadena tiene que ser MEJOR que el anterior: se reordenan los pasos de
 * igual tipo por potencia ascendente SIN mover sus huecos (el reparto de
 * tipos por hueco — y la rareza que lo desbloquea — no cambia).
 */
function sortSameKindAscending(ids, byId, canonRank) {
  const out = ids.slice()
  for (const k of ['tiro', 'regate', 'bloqueo', 'parada']) {
    const slots = out.map((id, i) => ({ id, i })).filter((x) => byId.get(x.id)?.kind === k)
    const sorted = slots.map((x) => x.id).sort((a, b) => {
      // MANDA EL CANON: el orden del moveset del juego (Kevin Dragonfly
      // aprende el Golpe de Dragón ANTES que el de Guiverno, aunque la
      // potencia normalizada de la wiki diga lo contrario). La potencia solo
      // desempata lo que el canon no ordena — el relleno inventado.
      const ra = canonRank?.get(a)
      const rb = canonRank?.get(b)
      if (ra != null && rb != null) return ra - rb
      if (ra != null) return -1
      if (rb != null) return 1
      return byId.get(a).power - byId.get(b).power
    })
    slots.forEach((x, j) => { out[x.i] = sorted[j] })
  }
  return out
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
  /** Todo lo emitido, por equipo: de aquí sale el relleno de convocatorias. */
  const emitted = {}
  /** Capitán canónico de cada equipo (leído del infobox de su ficha). */
  const captainByTeam = new Map()
  /**
   * Nombres ya emitidos por la saga CLÁSICA. Victory Road no puede repetir
   * ninguno: el doblaje reutiliza nombres entre personajes distintos, y ver a
   * «Thierry Reyes» en dos equipos de dos épocas es exactamente lo que no
   * queremos. Los equipos clásicos se emiten antes, así que para cuando toca
   * VR esta lista ya está completa.
   */
  const classicNames = new Set()
  const ordered = Object.entries(data)
    .sort((a, b) =>
      // Clásicos primero, Victory Road después (para poder descartar nombres
      // repetidos), y los equipos de relleno al final de cada bloque.
      (Number(VR_TEAMS.has(a[0])) - Number(VR_TEAMS.has(b[0])))
      || (Number(LOW_PRIORITY_TEAMS.has(a[0])) - Number(LOW_PRIORITY_TEAMS.has(b[0]))))
  for (const [teamId, rawList0] of ordered) {
    if (CLONE_TEAMS.has(teamId)) continue
    // Se completan las fichas cojas ANTES de nada: si no, el filtro de abajo
    // se las come y el equipo sale con menos gente.
    const rawList = rawList0.map((p) => {
      const fix = FILL_IN[p.wiki] ?? FILL_IN[p.name]
      const name = NAME_FIX[p.wiki] ?? p.name
      return fix || name !== p.name ? { ...p, ...fix, name } : p
    })
    lines.push(`  // ${'='.repeat(30)} ${teamId.toUpperCase()}`)
    // Se ordena por estrellas ANTES de emitir: `startingSquad` coge los
    // primeros de cada línea, así que el orden del fichero ES el once titular.
    const list = rawList
      .map((p, i) => ({ p, i }))
      .map((x) => x.p)
    // FAMA POR MÉRITOS. El orden de la wiki no es un escalafón (lista antes a
    // porteros y defensas), así que el peso sale de méritos REALES:
    //  · lo curado a mano (STARS) manda;
    //  · el CAPITÁN canónico de la ficha del equipo tiene suelo 4;
    //  · el resto se rankea por su REPERTORIO (nº de técnicas del moveset):
    //    el as de un equipo es el que más supertécnicas tiene, no el primero
    //    de la lista. Era exactamente el fallo de Hokuyou: su estrella salía
    //    de relleno y las rarezas subidas caían en la retaguardia.
    const cleanOf = (q) => ((q.name.includes('{{') ? (q.wiki ?? q.name) : q.name) ?? '')
      .replace(/\s*\([^)]*\)\s*$/, '').trim()
    const byMoves = [...list].sort((a, b) => ((b.hissatsu ?? []).length - (a.hissatsu ?? []).length))
    const moveRank = new Map(byMoves.map((q, i) => [q, i]))
    const ALIUS_ELITE = new Set(['genesis', 'chaos', 'prominence', 'diamond-dust', 'epsilon', 'gemini-storm', 'royal', 'zeus'])
    const fameOf = (q) => {
      const curated = STARS[cleanOf(q)]
      if (curated != null) return curated
      const r = moveRank.get(q) ?? 99
      const porRepertorio = r === 0 ? 4 : r <= 2 ? 3 : r <= 5 ? 2 : 1
      const floor = q.captain ? 4 : ALIUS_ELITE.has(teamId) ? 2 : 1
      return Math.max(porRepertorio, floor)
    }
    // El once titular sale de la fama: los ases empiezan, el relleno espera.
    list.sort((a, b) => fameOf(b) - fameOf(a))
    let idx = 0
    for (const p of list) {
      if (!p.position || !p.element) continue
      // La wiki añade sufijos de desambiguación al nombre del doblaje
      // («John Neville (game)»); fuera, que se ven en la carta del jugador.
      // Y algunas fichas ponen `name_dub={{PAGENAME}}` (el doblaje coincide
      // con el título): ahí el nombre ES el título de la página.
      const rawName = p.name.includes('{{') ? (p.wiki ?? p.name) : p.name
      const cleanName = rawName.replace(/\s*\([^)]*\)\s*$/, '').trim()
      let id = slugify(cleanName)
      const baseId = id
      let n = 2
      while (seenIds.has(id)) id = `${baseId}-${n++}`
      seenIds.add(id)

      // Victory Road: ni un nombre repetido de la saga clásica.
      if (VR_TEAMS.has(teamId) && classicNames.has(cleanName)) continue
      const rarity = fameOf(p)
      if (p.captain) captainByTeam.set(teamId, id)
      const st = statsFor(p.position, rarity, id)
      // CADA UNO CON LAS DE SU ÉPOCA.
      const eraTechs = VR_TEAMS.has(teamId)
        ? allTechs.filter((t) => t.era === 'vr')
        : allTechs.filter((t) => t.era !== 'vr')
      const signature = signatureFor(
        allTechs, cleanName, p.position, p.element, rarity, p.hissatsu ?? [],
        eraTechs.length >= 20 ? eraTechs : allTechs,
      )
      const techs = techsFor(signature, rarity)
      lines.push('  {')
      lines.push(`    id: ${q(id)}, name: ${q(cleanName)}, team: ${q(teamId)}, position: ${q(p.position)}, element: ${q(p.element)}, fame: ${rarity},`)
      lines.push(`    stats: { tiro: ${st.tiro}, control: ${st.control}, fisico: ${st.fisico}, defensa: ${st.defensa}, velocidad: ${st.velocidad}, aguante: ${st.aguante} },`)
      lines.push(`    techniques: [${techs.map(q).join(', ')}],`)
      if (signature.length) lines.push(`    signature: [${signature.map(q).join(', ')}],`)
      lines.push('  },')
      ;(emitted[teamId] ??= []).push({ id, position: p.position, rarity })
      if (!VR_TEAMS.has(teamId)) classicNames.add(cleanName)
      idx++
    }
  }
  // --- JUGADORES CUSTOM (fuera del crawler). El retrato ya está en
  //     public/inazuma/players/<id>.png, así que el fetch los ignora. ---
  lines.push('  {')
  lines.push("    id: 'scor-nelles', name: 'Scor Nelles', team: 'libre', position: 'MED', element: 'fuego', fame: 5, // original")
  lines.push('    stats: { tiro: 74, control: 82, fisico: 58, defensa: 55, velocidad: 70, aguante: 62 },')
  lines.push("    techniques: ['lightning-accel', 'atomic-flare'],")
  lines.push("    signature: ['flame-dance', 'atomic-flare', 'lightning-accel', 'bakunetsu-storm'],")
  lines.push('  },')
  lines.push(']')
  lines.push('')
  lines.push('/**')
  lines.push(' * CAPITÁN CANÓNICO de cada instituto (del infobox de la wiki): es quien')
  lines.push(' * lleva su Brazalete de Capitán y el ancla del reparto de rarezas.')
  lines.push(' */')
  lines.push('export const TEAM_CAPTAINS: Record<string, string> = {')
  for (const [t, pid] of captainByTeam) {
    lines.push(`  ${/^[a-z][a-z0-9]*$/.test(t) ? t : q(t)}: ${q(pid)},`)
  }
  lines.push('}')
  lines.push('')
  lines.push('/** Institutos del torneo; el resto de equipos son SOLO fichables. */')
  lines.push("const BRACKET_TEAMS = new Set(['raimon', 'occult', 'otaku', 'shuriken', 'farm', 'kirkwood', 'royal', 'zeus'])")
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
  lines.push("  windies: 'The Windies',")
  lines.push("  'extra-stars': 'Extra Stars',")
  lines.push("  'kage-no-hero': 'Kage no Hero',")
  lines.push('}')
  lines.push('')
  lines.push('export const PLAYER_BY_ID = new Map(PLAYERS.map((p) => [p.id, p]))')
  lines.push('')
  lines.push('/**')
  lines.push(' * Ids que existieron en catálogos anteriores y cambiaron al corregir la')
  lines.push(' * identidad del personaje (la wiki resolvía al «Lion»/«Diver» de Orion en')
  lines.push(' * vez de a los clásicos). Las partidas guardadas viejas los siguen citando.')
  lines.push(' */')
  lines.push('const LEGACY_IDS: Record<string, string> = {')
  lines.push("  hellion: 'leonard-o-shea',")
  lines.push("  'hellion-2': 'leonard-o-shea-2',")
  lines.push("  scuba: 'chad-taylor',")
  lines.push('}')
  lines.push('')
  lines.push('export function getPlayerBase(id: string): PlayerBase {')
  lines.push('  const p = PLAYER_BY_ID.get(id) ?? PLAYER_BY_ID.get(LEGACY_IDS[id] ?? \'\')')
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
  // RELLENO DE CONVOCATORIAS: al canon se le quedan equipos con 11 (los Alius)
  // y alguno sin portero, y aquí TODOS juegan con 14 y con guantes. Se completa
  // con gente de equipos hermanos (Alius con Alius, y si no, del mismo elenco),
  // a dedo y determinista: nada de azar en los datos.
  const DONORS = {
    'gemini-storm': ['epsilon', 'chaos', 'genesis'],
    epsilon: ['gemini-storm', 'chaos', 'genesis'],
    'diamond-dust': ['prominence', 'chaos', 'genesis'],
    prominence: ['diamond-dust', 'chaos', 'genesis'],
    genesis: ['chaos', 'prominence', 'diamond-dust'],
  }
  const fills = {}
  for (const [teamId, list] of Object.entries(emitted)) {
    const need = 14 - list.length
    const noKeeper = !list.some((x) => x.position === 'POR')
    if (need <= 0 && !noKeeper) continue
    // Donantes: los hermanos de saga si los hay; si no, cualquiera MENOS el
    // Raimon (su gente es la tuya, no relleno de otros) — y siempre por la
    // cola de la rareza: el que se presta es un suplente, no una estrella.
    // El préstamo respeta la ÉPOCA: un instituto de Victory Road se completa
    // con gente de Victory Road, nunca con un clásico (que además saldría
    // repetido, porque ese chaval ya existe en su equipo de los 2000).
    const mismaEra = (t) => VR_TEAMS.has(t) === VR_TEAMS.has(teamId)
    const pool = (DONORS[teamId] ?? Object.keys(emitted)
      .filter((t) => t !== teamId && t !== 'raimon' && t !== 'libre' && mismaEra(t)))
      .flatMap((t) => emitted[t] ?? [])
      .sort((a, b) => a.rarity - b.rarity || a.id.localeCompare(b.id))
    const take = []
    // Primero un PORTERO si no tiene: un equipo sin guantes es injugable.
    if (noKeeper) {
      const gk = pool.find((x) => x.position === 'POR')
      if (gk) take.push(gk.id)
    }
    // Y después, los que hagan falta hasta 14, de menor a mayor rareza (el
    // relleno es banquillo, no fichajes estrella).
    for (const x of pool) {
      if (take.length >= Math.max(need, take.length)) break
      if (take.includes(x.id)) continue
      take.push(x.id)
    }
    if (take.length) fills[teamId] = take
  }
  lines.push('/**')
  lines.push(' * Convocatorias que el CANON deja cortas de 14 (o sin portero). Se completan')
  lines.push(' * con jugadores de equipos hermanos — los Alius entre ellos — para que')
  lines.push(' * cualquier instituto se pueda jugar con un once y un banquillo de verdad.')
  lines.push(' */')
  lines.push('const SQUAD_FILL: Record<string, string[]> = {')
  for (const [teamId, ids] of Object.entries(fills)) {
    lines.push(`  ${/^[a-z][a-z0-9]*$/.test(teamId) ? teamId : q(teamId)}: [${ids.map(q).join(', ')}],`)
  }
  lines.push('}')
  lines.push('')
  lines.push('/**')
  lines.push(' * CONVOCATORIA con la que arranca cada instituto: los 14 de su plantilla')
  lines.push(' * real, ordenados con el once de la formación primero y el resto de')
  lines.push(' * banquillo. Antes se recortaba a 11 y los otros 3 se quedaban fuera hasta')
  lines.push(' * que el ojeador los ofrecía — pero son SUS jugadores, deben salir de casa.')
  lines.push(' */')
  lines.push('export function startingSquad(teamId: string, formationId?: string): string[] {')
  lines.push('  const own = playersOfTeam(teamId)')
  lines.push('  const f = getFormation(formationId ?? formationFor(teamId))')
  lines.push("  const line = (pos: PlayerBase['position'], n: number) =>")
  lines.push('    own.filter((p) => p.position === pos).slice(0, n).map((p) => p.id)')
  lines.push("  const picked = [...line('POR', 1), ...line('DEF', f.defs), ...line('MED', f.mids), ...line('DEL', f.fwds)]")
  lines.push('  const bench = own.filter((p) => !picked.includes(p.id)).map((p) => p.id)')
  lines.push('  const extra = SQUAD_FILL[teamId] ?? []')
  lines.push('  // Si el equipo no tiene portero propio, el prestado entra en el ONCE.')
  lines.push("  const borrowedKeeper = picked.length && own.some((p) => p.position === 'POR')")
  lines.push('    ? []')
  lines.push("    : extra.filter((id) => PLAYER_BY_ID.get(id)?.position === 'POR').slice(0, 1)")
  lines.push('  const rest = extra.filter((id) => !borrowedKeeper.includes(id))')
  lines.push('  const fill = rest.slice(0, Math.max(0, 14 - picked.length - bench.length - borrowedKeeper.length))')
  lines.push('  return [...borrowedKeeper, ...picked, ...bench, ...fill]')
  lines.push('}')
  lines.push('')
  lines.push('/** Once inicial del Raimon (compatibilidad). */')
  lines.push("export const RAIMON_STARTING_XI: string[] = startingSquad('raimon').slice(0, 11)")
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
