// Descarga IMÁGENES (PNG de Twemoji) para la iconografía del modo Inazuma:
// casillas del mapa, balones, objetos y situaciones.
//
//   node scripts/fetch-inazuma-icons.mjs
//
// ¿Por qué Twemoji y no el emoji del sistema o un SVG monocromo?
//  - El emoji del sistema se ve distinto en cada móvil (y en Windows varios
//    salen en blanco y negro). Twemoji es la MISMA imagen en todas partes.
//  - El SVG monocromo quedaba plano para las casillas; el usuario pidió
//    imágenes con color, como los iconos grandes del modo Pokémon.
//  - Licencia CC-BY 4.0: se puede usar citando la fuente.
//
// Salida: public/inazuma/icons/<nombre>.png (72×72).
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'inazuma', 'icons')
const CDN = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72'

/** nombre de fichero → emoji. */
const ICONS = {
  // --- casillas del mapa
  'node-pachanga': '⚽',
  'node-objeto': '🎒',
  'node-tecnica': '⚡',
  'node-firma': '🌟',
  'node-ojeador': '🔍',
  'node-evento': '❓',
  'node-rairai': '🍜',
  'node-tienda': '🛒',
  'node-jefe': '🏟️',
  'node-final': '🏆',
  // --- partido
  ball: '⚽',
  goal: '🥅',
  glove: '🧤',
  gol: '🎉',
  // --- objetos, por id
  'item-botas-rayo': '👟',
  'item-espinilleras': '🦵',
  'item-guantes-titan': '🥊',
  'item-banda-tiro': '🎯',
  'item-muneq-control': '⌚',
  'item-cinta-aguante': '🎗️',
  'item-guantes-portero': '🧤',
  'item-botas-doradas': '🥇',
  'item-cinta-cabeza': '🎽',
  'item-brazalete-capitan': '💪',
  'item-botas-inazuma': '⚡',
  'item-guante-dios': '🌟',
  'item-bota-oro-macizo': '🏅',
  'item-cinta-legendaria': '👑',
  'item-amuleto-relampago': '🧿',
  'item-bebida-isotonica': '🥤',
  'item-bebida-doble': '🧃',
  'item-masaje': '💆',
  'item-concentrado': '🧪',
  'item-plan-entrenamiento': '📋',
  'item-plan-intensivo': '📈',
  'item-ramen-rai-rai': '🍜',
  'item-ramen-especial': '🍲',
  'item-gyoza': '🥟',
  'item-banquete': '🍱',
  'item-mejora': '✨',
  'item-manual-avanzado': '📘',
  // --- situaciones, por id de evento
  'event-ribera': '🌅',
  'event-cuaderno': '📓',
  'event-cazatalentos': '🕴️',
  'event-maquina': '🥤',
  'event-porteria': '🥅',
  'event-lesion': '🩹',
  'event-reto': '🎯',
  'event-tienda-cerrada': '📦',
  'event-tormenta': '⛈️',
  'event-maestro': '🧓',
  'event-balon-firmado': '✍️',
  'event-gimnasio': '🏋️',
}

/** Un emoji → nombre de fichero de Twemoji (codepoints en hex, sin fe0f). */
function candidates(emoji) {
  const cps = [...emoji].map((c) => c.codePointAt(0).toString(16))
  const noVs = cps.filter((c) => c !== 'fe0f')
  // Twemoji suele omitir el fe0f, pero no siempre: se prueban las dos formas.
  return [...new Set([noVs.join('-'), cps.join('-')])]
}

async function main() {
  await mkdir(OUT, { recursive: true })
  let ok = 0
  const missing = []
  for (const [name, emoji] of Object.entries(ICONS)) {
    let saved = false
    for (const code of candidates(emoji)) {
      const res = await fetch(`${CDN}/${code}.png`)
      if (!res.ok) continue
      await writeFile(join(OUT, `${name}.png`), Buffer.from(await res.arrayBuffer()))
      saved = true
      ok++
      break
    }
    if (!saved) { missing.push(`${name} (${emoji})`); console.log(`  ✗ ${name}`) }
    await new Promise((r) => setTimeout(r, 60))
  }
  console.log(`${ok}/${Object.keys(ICONS).length} iconos descargados`)
  if (missing.length) console.log('Faltan: ' + missing.join(', '))
}

main().catch((err) => { console.error(err); process.exit(1) })
