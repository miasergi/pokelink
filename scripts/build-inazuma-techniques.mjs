// Construye el catálogo de supertécnicas a partir de la wiki de Fandom y baja
// la imagen de cada una.
//
//   node scripts/build-inazuma-techniques.mjs
//
// De la wiki salen los datos REALES de cada técnica (infobox `Hissatsu`):
//   |type=    Shoot / Dribble / Block / Catch   → tiro / regate / bloqueo / parada
//   |element= Fire / Wind / Earth / Wood        → fuego / aire / montaña / bosque
//   |tp_ie=   coste en TP del primer juego
//   |power=   potencia
//
// Lo que NO sale de la wiki es el equilibrio: las potencias del juego original
// van en otra escala y mezclan versiones (GO, Ares, Galaxy…), así que aquí se
// normalizan a la escala del modo (25-135) manteniendo el orden relativo.
//
// El NOMBRE que se pinta es el del doblaje español cuando lo conozco (tabla
// `ES`); si no, se queda el del doblaje inglés, que es el que usa la wiki.
//
// Las imágenes van a `public/inazuma/techniques/<id>.png`. Si alguna falta, la
// UI cae a su icono de elemento: el juego nunca depende de que estén.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_TS = join(ROOT, 'src', 'data', 'inazuma', 'techniques.ts')
const OUT_IMG = join(ROOT, 'public', 'inazuma', 'techniques')
const CACHE = join(ROOT, 'scripts', '.cache', 'inazuma-techniques.json')
const API = 'https://inazuma-eleven.fandom.com/api.php'
const UA = 'pokelink-inazuma-techniques/1.0 (script de un solo uso)'

/**
 * Categorías de la wiki de las que se saca el catálogo. De cada una se cogen
 * SOLO las técnicas que debutaron en el primer juego (`debut_game` con
 * `{{Media|games|IE}}`): son las de la primera temporada, que es la que cubre
 * este modo. Sin ese filtro entraban cientos de técnicas de GO, Ares y Galaxy.
 */
const CATEGORIES = [
  'Category:Shoot hissatsu',
  'Category:Dribble hissatsu',
  'Category:Block hissatsu',
  'Category:Catch hissatsu',
]

/**
 * Cuántas quedarse de cada clase Y ELEMENTO. El reparto por elemento no es un
 * capricho: una técnica solo la puede aprender quien comparte demarcación y
 * elemento con ella, así que un catálogo sin técnicas de bosque deja a media
 * plantilla sin nada que aprender.
 */
const PER_KIND_ELEMENT = { tiro: 4, regate: 3, bloqueo: 3, parada: 3 }
const ELEMENTS = ['fuego', 'bosque', 'aire', 'montana']

/**
 * Las que NO pueden faltar. Son las que cualquiera que haya visto la serie
 * espera encontrarse; el resto del catálogo se rellena muestreando la curva de
 * potencia de cada clase.
 */
const MUST_HAVE = [
  'Fire Tornado', 'Dragon Crash', 'Inazuma Break', 'Death Zone', 'The Phoenix',
  'God Break', 'Eternal Blizzard', 'Wolf Legend', 'Dragon Tornado', 'Tri-Pegasus',
  'Illusion Ball', 'Spiral Draw', 'Heat Tackle',
  'The Tower', 'The Wall', 'Killer Slide', 'Ice Ground',
  'God Hand', 'Majin The Hand', 'Mugen The Hand', 'Nekketsu Punch', 'Full Power Shield',
]

/** Descripción de reserva por clase y elemento, para las que no tienen texto. */
const GENERIC = {
  tiro: {
    fuego: 'El balón sale ardiendo y el portero lo nota en los guantes.',
    bosque: 'La naturaleza empuja el disparo hacia la red.',
    aire: 'El aire se corta por donde pasa el balón.',
    montana: 'Pega como una roca cayendo desde arriba.',
  },
  regate: {
    fuego: 'Un quiebro con las botas humeando.',
    bosque: 'Se escurre entre la maleza y aparece por el otro lado.',
    aire: 'Acelera hasta que el defensa deja de verle.',
    montana: 'Se abre camino a hombros, sin frenar.',
  },
  bloqueo: {
    fuego: 'Un muro de fuego cierra el pasillo.',
    bosque: 'El terreno atrapa las piernas del rival.',
    aire: 'Una ráfaga le quita el balón de los pies.',
    montana: 'Aquí no pasa nadie.',
  },
  parada: {
    fuego: 'Detiene el disparo con las manos al rojo.',
    bosque: 'Una malla vegetal frena el balón en seco.',
    aire: 'Una corriente lo levanta por encima del larguero.',
    montana: 'Firme como un muro de piedra.',
  },
}

/** Nombre del doblaje español, cuando lo conozco. */
const ES = {
  'Fire Tornado': 'Tornado de Fuego',
  'Dragon Crash': 'Golpe de Dragón',
  'Death Zone': 'Zona Mortal',
  'The Phoenix': 'El Fénix',
  'God Break': 'Golpe Divino',
  'Spinning Cut': 'Corte Giratorio',
  'Dragon Tornado': 'Tornado de Dragón',
  'Tri-Pegasus': 'Tri-Pegaso',
  'Twin Boost': 'Doble Impulso',
  'Megaton Head': 'Cabezazo Megatón',
  'Wolf Legend': 'Leyenda del Lobo',
  'Eternal Blizzard': 'Ventisca Eterna',
  'Northern Impact': 'Impacto Polar',
  'Prime Legend': 'Leyenda Suprema',
  'Grand Fire': 'Gran Fuego',
  'Atomic Flare': 'Llamarada Atómica',
  'The Earth': 'La Tierra',
  'Bakunetsu Screw': 'Rosca Ardiente',
  'Dragon Slayer': 'Mata Dragones',
  'Tsunami Boost': 'Impulso Tsunami',
  'Dark Phoenix': 'Fénix Oscuro',
  'Dark Tornado': 'Tornado Oscuro',
  'Illusion Ball': 'Balón Ilusión',
  'Spiral Draw': 'Espiral',
  Cyclone: 'Ciclón',
  'Butterfly Dream': 'Sueño de Mariposa',
  'Deep Mist': 'Niebla Densa',
  'Rolling Kick': 'Patada Giratoria',
  'Frozen Steal': 'Robo Helado',
  'The Wall': 'El Muro',
  'The Tower': 'La Torre',
  'Killer Slide': 'Entrada Asesina',
  'Ice Ground': 'Suelo Helado',
  'Heat Tackle': 'Entrada Ardiente',
  'Wild Dunk': 'Mate Salvaje',
  'Iron Wall': 'Muro de Hierro',
  Earthquake: 'Terremoto',
  'Perfect Tower': 'Torre Perfecta',
  'God Hand': 'Mano Celestial',
  'Majin The Hand': 'Mano del Demonio',
  'Mugen The Hand': 'Mano Infinita',
  'Nekketsu Punch': 'Puño Ardiente',
  'Full Power Shield': 'Escudo Total',
  'Power Shield': 'Escudo',
  'Beast Fang': 'Colmillo de Bestia',
}

/** Descripción de sabor. Sin ella la ficha de la técnica queda desnuda. */
const DESC = {
  'Fire Tornado': 'El balón entra en combustión y arrastra al portero.',
  'Dragon Crash': 'Un dragón de energía escolta el disparo.',
  'Inazuma Break': 'Técnica combinada: dos compañeros catapultan al rematador.',
  'Death Zone': 'Tres jugadores hunden el balón en la portería.',
  'The Phoenix': 'Un ave de fuego renace sobre el área pequeña.',
  'God Break': 'Alas doradas y un disparo que no admite discusión.',
  'Spinning Cut': 'Rosca imposible: el balón dobla a media trayectoria.',
  'Dragon Tornado': 'Dos dragones enroscados alrededor del balón.',
  'Tri-Pegasus': 'Tres caballos alados empujan a la vez.',
  'Twin Boost': 'Dos rematadores al mismo tiempo, un solo disparo.',
  'Megaton Head': 'Un cabezazo que suena a demolición.',
  'Wolf Legend': 'Una manada de lobos de nieve cruza el área.',
  'Eternal Blizzard': 'El campo se hiela por donde pasa el balón.',
  'Northern Impact': 'El hielo estalla bajo la portería.',
  'Prime Legend': 'La bestia legendaria despierta detrás del disparo.',
  'Grand Fire': 'Una columna de fuego sube desde el césped.',
  'Atomic Flare': 'Un fogonazo y ya está dentro.',
  'The Earth': 'El planeta entero empuja el balón.',
  'Bakunetsu Screw': 'Rosca al rojo vivo.',
  'Dragon Slayer': 'Una espada de energía parte la defensa.',
  'Tsunami Boost': 'Una ola levanta el balón por encima de todos.',
  'Dark Phoenix': 'El fénix, pero de sombra.',
  'Dark Tornado': 'El tornado se traga la luz del área.',
  'Illusion Ball': 'Se multiplica en cinco copias y solo una lleva el balón.',
  'Spiral Draw': 'Gira sobre sí mismo y sale por el otro lado.',
  Cyclone: 'Acelera hasta convertirse en un remolino.',
  'Butterfly Dream': 'Una nube de mariposas tapa el regate.',
  'Deep Mist': 'La niebla se traga al que defiende.',
  'Rolling Kick': 'Rueda por encima del rival con el balón pegado.',
  'Frozen Steal': 'El suelo se congela y el balón cambia de dueño.',
  'The Wall': 'Un muro se levanta del césped y el balón se estrella.',
  'The Tower': 'Una torre de piedra corta el pasillo.',
  'Killer Slide': 'Entrada limpia y demoledora.',
  'Ice Ground': 'El suelo se congela bajo los pies del atacante.',
  'Heat Tackle': 'Entra en llamas, y no es una forma de hablar.',
  'Wild Dunk': 'Se lleva por delante balón y delantero.',
  'Iron Wall': 'Dos defensas hacen de pared viviente.',
  Earthquake: 'El terreno tiembla y nadie mantiene el equilibrio.',
  'Perfect Tower': 'La torre, pero sin grietas.',
  'God Hand': 'Una mano gigante emerge y detiene lo indetenible.',
  'Majin The Hand': 'La mano del demonio atrapa el balón en el aire.',
  'Mugen The Hand': 'La mano se estira todo lo que haga falta.',
  'Nekketsu Punch': 'Un puñetazo ardiente contra el disparo.',
  'Full Power Shield': 'El portero se planta y no cede un centímetro.',
  'Power Shield': 'Manos seguras, sin florituras.',
  'Beast Fang': 'Unas fauces enormes muerden el balón.',
}

const TYPE = { shoot: 'tiro', dribble: 'regate', block: 'bloqueo', catch: 'parada' }
// Los elementos de la serie son Fire / Wood / Wind / Mountain (en las entregas
// nuevas «Earth»). OJO: la wiki escribe «Mountain», no «Earth», y con el mapa
// equivocado se descartaba media wiki por «sin infobox utilizable».
const ELEMENT = {
  // La wiki escribe «Forest» y «Mountain». Con «Wood» y «Earth» (que es como se
  // llaman en las entregas nuevas) se caía TODO el bosque del catálogo y los
  // jugadores de ese elemento se quedaban sin nada que aprender.
  fire: 'fuego', forest: 'bosque', wood: 'bosque', wind: 'aire',
  mountain: 'montana', earth: 'montana',
}
/**
 * Elemento a mano para las fichas cuyo campo `element` de la wiki viene roto
 * (algunas repiten ahí el nombre de la técnica).
 */
const ELEMENT_FIX = {
  'God Hand': 'montana',
  'Majin The Hand': 'montana',
  'Mugen The Hand': 'montana',
}

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

/** Primer número de un campo del infobox, que suele traer varias versiones. */
function firstNumber(text) {
  const m = /(\d+)/.exec(text ?? '')
  return m ? Number(m[1]) : null
}

function field(wikitext, name) {
  const re = new RegExp(`\\|\\s*${name}\\s*=\\s*([^|}]*)`, 'i')
  const m = re.exec(wikitext)
  return m ? m[1].trim() : ''
}

/**
 * Campo que puede llevar plantillas con `|` dentro (`{{Media|games|IE}}`), así
 * que se lee hasta el siguiente campo del infobox y no hasta el primer `|`.
 */
function longField(wikitext, name) {
  const re = new RegExp(`\\n\\|\\s*${name}\\s*=\\s*([\\s\\S]*?)(?=\\n\\|)`, 'i')
  const m = re.exec(wikitext)
  return m ? m[1].trim() : ''
}

/** Nombre del doblaje inglés, sin viñetas ni variantes entre paréntesis. */
function dubName(wikitext, fallback) {
  const raw = longField(wikitext, 'name_dub') || field(wikitext, 'name_dub')
  const first = raw.split('\n').map((l) => l.replace(/^\*+/, '').trim()).filter(Boolean)[0]
  if (!first) return fallback
  const clean = first
    // Bastantes fichas ponen {{PAGENAME}} en vez de repetir el nombre.
    .replace(/\{\{PAGENAME\}\}/gi, fallback)
    .replace(/''.*?''/g, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
  return clean || fallback
}

async function fetchTechnique(title) {
  const parsed = await api({ action: 'parse', prop: 'wikitext', page: title })
  const wt = parsed?.parse?.wikitext?.['*']
  if (!wt) return null

  // Primera y segunda entrega: es lo que cubre la primera temporada del anime
  // (el Football Frontier). Sin la segunda faltaban clásicos como La Torre o la
  // Ventisca Eterna.
  const debut = longField(wt, 'debut_game')
  if (!/\{\{Media\|games\|IE(2)?\}\}/.test(debut)) return null
  const name = dubName(wt, title)

  // Algunas técnicas son de dos clases (`type` y `type2`). Se queda la
  // defensiva si la hay: en este modo un bloqueo y un regate no son
  // intercambiables, los usan demarcaciones distintas.
  // Manda el tipo PRINCIPAL. Al preferir el secundario defensivo se colaban
  // cosas raras (el Corte Giratorio, que es un tiro, acababa de bloqueo).
  const type = TYPE[field(wt, 'type').toLowerCase().replace(/[^a-z]/g, '')]
  const element = ELEMENT_FIX[name]
    ?? ELEMENT[field(wt, 'element').toLowerCase().replace(/[^a-z]/g, '')]
  if (!type || !element) return null

  const power = firstNumber(field(wt, 'power'))
  const tp = firstNumber(field(wt, 'tp_ie')) ?? firstNumber(field(wt, 'tp_ie2'))

  const img = await api({
    action: 'query', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '256', titles: title,
  })
  const pages = img?.query?.pages ?? {}
  let thumb = null
  for (const k of Object.keys(pages)) {
    if (k !== '-1' && pages[k]?.thumbnail?.source) thumb = pages[k].thumbnail.source
  }

  return { title, name, type, element, power, tp, thumb }
}

/**
 * Normaliza a la escala del modo. Las potencias de la wiki mezclan juegos y
 * versiones (de 40 a 200), así que se comprimen a 25-135 conservando el orden.
 */
function balance(list) {
  const powers = list.map((t) => t.power ?? 60)
  const lo = Math.min(...powers)
  const hi = Math.max(...powers)
  return list.map((t) => {
    const raw = t.power ?? 60
    const norm = hi > lo ? (raw - lo) / (hi - lo) : 0.5
    const power = Math.round(25 + norm * 110)
    // El coste sale de la potencia, no del TP de la wiki: así no hay técnicas
    // baratísimas y demoledoras que rompan la economía de PT del modo.
    const cost = Math.max(5, Math.round(power * 0.29))
    return { ...t, power, cost }
  })
}

async function main() {
  await mkdir(OUT_IMG, { recursive: true })

  // Barrer la wiki entera lleva unos minutos, así que se cachea: para retocar
  // el reparto o los nombres no hace falta volver a pedirle nada.
  let cached = null
  try { cached = JSON.parse(await readFile(CACHE, 'utf8')) } catch { /* primera vez */ }
  if (cached) return emit(cached)

  const titles = []
  for (const cat of CATEGORIES) {
    const j = await api({ action: 'query', list: 'categorymembers', cmtitle: cat, cmlimit: '500' })
    const members = (j?.query?.categorymembers ?? []).map((m) => m.title)
    console.log(`${cat}: ${members.length} fichas`)
    titles.push(...members)
    await new Promise((r) => setTimeout(r, 250))
  }

  const found = []
  const seenTitles = new Set()
  for (const title of titles) {
    // Una técnica puede estar en dos categorías (Heat Tackle es regate y
    // bloqueo) y se colaba dos veces con el mismo id.
    if (seenTitles.has(title)) continue
    seenTitles.add(title)
    try {
      const t = await fetchTechnique(title)
      if (!t) continue
      if (!t.thumb) continue // sin imagen no entra: el catálogo tiene que ser uniforme
      found.push(t)
      console.log(`  ✓ ${t.name} · ${t.type} · ${t.element} · pot.${t.power ?? '?'}`)
    } catch (err) {
      console.log(`  ✗ ${title} — ${err.message}`)
    }
    await new Promise((r) => setTimeout(r, 120))
  }

  await mkdir(dirname(CACHE), { recursive: true })
  await writeFile(CACHE, JSON.stringify(found, null, 1), 'utf8')
  return emit(found)
}

/** Elige el catálogo definitivo y escribe el fichero y las imágenes. */
async function emit(found) {
  // Reparto por clase Y elemento (ver `PER_KIND_ELEMENT`).
  const must = new Set(MUST_HAVE)
  const list = []
  for (const [kind, max] of Object.entries(PER_KIND_ELEMENT)) {
    for (const element of ELEMENTS) {
      const pool = found
        .filter((t) => t.type === kind && t.element === element)
        .sort((a, b) => (a.power ?? 0) - (b.power ?? 0))
      if (!pool.length) {
        console.log(`  ! sin técnicas de ${kind}/${element} en la wiki`)
        continue
      }
      // Primero las imprescindibles y el resto muestreando la curva de potencia,
      // para que haya básicas, medias y definitivas de cada elemento.
      const picked = pool.filter((t) => must.has(t.name) || must.has(t.title))
      const rest = pool.filter((t) => !picked.includes(t))
      const room = Math.max(0, max - picked.length)
      for (let i = 0; i < room && rest.length; i++) {
        picked.push(rest[Math.round((i * (rest.length - 1)) / Math.max(1, room - 1))])
      }
      list.push(...new Set(picked))
    }
  }

  const balanced = balance([...new Set(list)])
    .sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : a.power - b.power))

  // Imágenes
  let imgs = 0
  for (const t of balanced) {
    if (!t.thumb) continue
    try {
      const res = await fetch(t.thumb, { headers: { 'User-Agent': UA } })
      if (!res.ok) throw new Error(String(res.status))
      // El nombre del fichero es el ID (que sale del TÍTULO de la wiki), no el
      // nombre traducido: si no, la ficha buscaba `tornado-de-fuego.png` y la
      // imagen estaba guardada como `fire-tornado.png`.
      await writeFile(join(OUT_IMG, `${slug(t.title)}.png`), Buffer.from(await res.arrayBuffer()))
      imgs++
    } catch (err) {
      console.log(`  ✗ imagen de ${t.name}: ${err.message}`)
    }
    await new Promise((r) => setTimeout(r, 180))
  }

  const lines = []
  lines.push('// Catálogo de supertécnicas. GENERADO — se regenera con')
  lines.push('// `node scripts/build-inazuma-techniques.mjs`.')
  lines.push('//')
  lines.push('// TODAS son técnicas REALES de la serie: el nombre, la clase (tiro/regate/')
  lines.push('// bloqueo/parada) y el elemento salen del infobox `Hissatsu` de la wiki de')
  lines.push('// Fandom, y la imagen de `public/inazuma/techniques/<id>.png` es la de esa')
  lines.push('// misma ficha. Antes había técnicas de relleno inventadas; ya no queda ninguna.')
  lines.push('//')
  lines.push('// La POTENCIA y el COSTE sí están reescalados: los números del juego original')
  lines.push('// mezclan versiones y no encajan en la economía de PT de este modo.')
  lines.push("import type { Technique } from '@/engine/inazuma/types'")
  lines.push('')
  lines.push('export const TECHNIQUES: Technique[] = [')
  let lastType = ''
  for (const t of balanced) {
    if (t.type !== lastType) {
      lastType = t.type
      lines.push(`  // ${'-'.repeat(20)} ${t.type.toUpperCase()}`)
    }
    // El id sale del TÍTULO de la wiki, que es único; el nombre puede repetirse
    // entre variantes y dejaba dos técnicas con la misma clave.
    const id = slug(t.title)
    const name = ES[t.name] ?? t.name
    const desc = DESC[t.name] ?? DESC[t.title] ?? GENERIC[t.type][t.element]
    lines.push(`  { id: '${id}', name: ${JSON.stringify(name)}, kind: '${t.type}', element: '${t.element}', power: ${t.power}, cost: ${t.cost}, desc: ${JSON.stringify(desc)} },`)
  }
  lines.push(']')
  lines.push('')
  lines.push('export const TECHNIQUE_BY_ID = new Map(TECHNIQUES.map((t) => [t.id, t]))')
  lines.push('')
  lines.push('export function getTechnique(id: string): Technique | undefined {')
  lines.push('  return TECHNIQUE_BY_ID.get(id)')
  lines.push('}')
  lines.push('')
  lines.push('/** Técnicas de una clase concreta, para el draft y el aprendizaje. */')
  lines.push("export function techniquesOfKind(kind: Technique['kind']): Technique[] {")
  lines.push('  return TECHNIQUES.filter((t) => t.kind === kind)')
  lines.push('}')
  lines.push('')
  lines.push('/** Qué clase de técnica usa cada demarcación al atacar/defender. */')
  lines.push("export const KIND_LABEL: Record<Technique['kind'], string> = {")
  lines.push("  tiro: 'Tiro',")
  lines.push("  regate: 'Regate',")
  lines.push("  bloqueo: 'Bloqueo',")
  lines.push("  parada: 'Parada',")
  lines.push('}')
  lines.push('')
  lines.push('/** Lo que cuesta un manual de supertécnica: proporcional a su potencia. */')
  lines.push('export function techniquePrice(t: Technique): number {')
  lines.push('  return Math.round(500 + t.power * 22)')
  lines.push('}')
  lines.push('')
  lines.push('/**')
  lines.push(' * Manuales a la venta. Es un surtido FIJO por partida (depende de la semilla)')
  lines.push(' * que se renueva según avanzas: si la tienda ofreciera el catálogo entero,')
  lines.push(' * comprar dejaría de ser una decisión y sería una lista de la compra.')
  lines.push(' */')
  lines.push('export function techniqueStock(seed: number, progress: number): Technique[] {')
  lines.push('  const maxPower = 55 + progress * 12')
  lines.push('  const pool = TECHNIQUES.filter((t) => t.power <= maxPower)')
  lines.push('  const out: Technique[] = []')
  lines.push('  let h = (seed ^ (progress * 2654435761)) >>> 0')
  lines.push('  for (let i = 0; i < 4 && pool.length; i++) {')
  lines.push('    h = (Math.imul(h ^ (h >>> 15), 2246822507) >>> 0)')
  lines.push('    const pick = pool[h % pool.length]')
  lines.push('    if (!out.includes(pick)) out.push(pick)')
  lines.push('  }')
  lines.push('  return out')
  lines.push('}')
  lines.push('')

  await writeFile(OUT_TS, lines.join('\n'), 'utf8')
  const count = {}
  for (const t of balanced) count[t.type] = (count[t.type] ?? 0) + 1
  console.log(`\n${balanced.length} técnicas escritas · ${imgs} imágenes`)
  console.log('  ' + Object.entries(count).map(([k, n]) => `${k}:${n}`).join('  '))
}

main().catch((err) => { console.error(err); process.exit(1) })
