// Baja los ICONOS REALES de objeto del juego (Inazuma Eleven DS) desde la
// wiki de Fandom y los deja en public/inazuma/icons/item-<id>.png, pisando los
// twemoji provisionales. Correr con: node scripts/fetch-inazuma-items.mjs
//
// El mapeo es curado a mano: nuestros objetos son una selección de diseño y la
// wiki cataloga los del juego original, así que se elige el sprite que MEJOR
// representa cada uno (la bebida de PT es el Sports Water, el ramen es el
// oden del puesto, los documentos legendarios despiertan la firma…).
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const API = 'https://inazuma-eleven.fandom.com/api.php'
const OUT = join(process.cwd(), 'public', 'inazuma', 'icons')

/** id nuestro → File: de la wiki. */
const MAP = {
  // equipamiento
  'botas-rayo': 'Blue Shoes icon.png',
  'botas-inazuma': 'Red Shoes icon.png',
  'botas-doradas': 'Shoes icon (IE).png',
  'bota-oro-macizo': 'Big Boots icon.png',
  'espinilleras': 'Protective Pendant Bronze icon.png',
  'guantes-portero': 'Glove icon (IE).png',
  'guantes-titan': 'Glove icon (IE3).png',
  'guante-dios': 'Glove icon (IE3).png',
  'banda-tiro': 'Orange Misanga icon.png',
  'muneq-control': 'Misanga icon.png',
  'cinta-aguante': 'Blue Misanga icon.png',
  'cinta-cabeza': 'Sunglasses icon.png',
  'cinta-legendaria': 'GP Pendant Gold icon.png',
  'amuleto-relampago': 'Power Pendant Gold icon.png',
  'brazalete-capitan': 'Oath Pendant icon.png',
  // consumibles
  'bebida-isotonica': 'Sports Water icon.png',
  'bebida-doble': 'Super Water icon.png',
  'concentrado': "God's Aqua icon.png",
  'masaje': 'Stamina Flavor icon.png',
  'ramen-rai-rai': 'Finest Oden icon.png',
  'ramen-especial': 'Hyper Flavor icon (IE3).png',
  'gyoza': 'Onigiri icon.png',
  'banquete': 'Cow Milk icon.png',
  'plan-entrenamiento': 'Soccer Magazine icon.png',
  'plan-intensivo': 'Soccer Club Notebook icon.png',
  'mejora': 'Scrap of the Secret Notebook icon.png',
  'manual-avanzado': "Souichirou's Documents icon.png",
}

const q = async (params) => {
  const u = new URL(API)
  for (const [k, v] of Object.entries({ format: 'json', ...params })) u.searchParams.set(k, v)
  const r = await fetch(u, { headers: { 'user-agent': 'pokelink-items' } })
  return r.json()
}

await mkdir(OUT, { recursive: true })
let ok = 0
const misses = []
for (const [id, file] of Object.entries(MAP)) {
  const j = await q({ action: 'query', titles: `File:${file}`, prop: 'imageinfo', iiprop: 'url' })
  const page = Object.values(j?.query?.pages ?? {})[0]
  const url = page?.imageinfo?.[0]?.url
  if (!url) { misses.push(`${id} ← ${file}`); continue }
  // Solo `?format=png` en la URL garantiza PNG de verdad (la CDN transcodifica
  // a webp aunque el Accept diga otra cosa).
  const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}format=png`, {
    headers: { 'user-agent': 'pokelink-items' },
  })
  if (!res.ok) { misses.push(`${id} ← ${file} (http ${res.status})`); continue }
  const buf = Buffer.from(await res.arrayBuffer())
  // Firma PNG: si la CDN devolviera webp, mejor conservar el twemoji.
  if (buf.length < 100 || buf[0] !== 0x89 || buf[1] !== 0x50) { misses.push(`${id} ← ${file} (no PNG)`); continue }
  await writeFile(join(OUT, `item-${id}.png`), buf)
  ok += 1
}
console.log(`descargados ${ok}/${Object.keys(MAP).length}`)
if (misses.length) console.log('fallos:', misses.join(' · '))
