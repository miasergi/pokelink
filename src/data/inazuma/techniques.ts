// Catálogo de supertécnicas. GENERADO — se regenera con
// `node scripts/build-inazuma-techniques.mjs`.
//
// TODAS son técnicas REALES de la serie: el nombre, la clase (tiro/regate/
// bloqueo/parada) y el elemento salen del infobox `Hissatsu` de la wiki de
// Fandom, y la imagen de `public/inazuma/techniques/<id>.png` es la de esa
// misma ficha. Antes había técnicas de relleno inventadas; ya no queda ninguna.
//
// La POTENCIA y el COSTE sí están reescalados: los números del juego original
// mezclan versiones y no encajan en la economía de PT de este modo.
import type { Technique } from '@/engine/inazuma/types'

export const TECHNIQUES: Technique[] = [
  // -------------------- BLOQUEO
  { id: 'super-scan-df', name: "Defence Scan", kind: 'bloqueo', element: 'bosque', power: 32, cost: 9, desc: "El terreno atrapa las piernas del rival." },
  { id: 'coil-turn', name: "Coil Turn", kind: 'bloqueo', element: 'aire', power: 32, cost: 9, desc: "Una ráfaga le quita el balón de los pies." },
  { id: 'shikofumi', name: "Sumo Stomp", kind: 'bloqueo', element: 'montana', power: 32, cost: 9, desc: "Aquí no pasa nadie." },
  { id: 'fake-bomber', name: "Fake Bomber", kind: 'bloqueo', element: 'fuego', power: 33, cost: 10, desc: "Un muro de fuego cierra el pasillo." },
  { id: 'planet-shield', name: "Planet Shield", kind: 'bloqueo', element: 'fuego', power: 39, cost: 11, desc: "Un muro de fuego cierra el pasillo." },
  { id: 'flame-dance', name: "Flame Dance", kind: 'bloqueo', element: 'fuego', power: 62, cost: 18, desc: "Un muro de fuego cierra el pasillo." },
  { id: 'killer-slide', name: "Entrada Asesina", kind: 'bloqueo', element: 'bosque', power: 62, cost: 18, desc: "Entrada limpia y demoledora." },
  { id: 'the-wall', name: "El Muro", kind: 'bloqueo', element: 'montana', power: 67, cost: 19, desc: "Un muro se levanta del césped y el balón se estrella." },
  { id: 'no-escape', name: "No Escape", kind: 'bloqueo', element: 'montana', power: 70, cost: 20, desc: "Aquí no pasa nadie." },
  { id: 'the-tower', name: "La Torre", kind: 'bloqueo', element: 'aire', power: 79, cost: 23, desc: "Una torre de piedra corta el pasillo." },
  { id: 'good-smell', name: "Sleeping Dust", kind: 'bloqueo', element: 'bosque', power: 84, cost: 24, desc: "El terreno atrapa las piernas del rival." },
  { id: 'ice-ground', name: "Land Of Ice", kind: 'bloqueo', element: 'aire', power: 90, cost: 26, desc: "El suelo se congela bajo los pies del atacante." },
  // -------------------- PARADA
  { id: 'tornado-catch', name: "Tornado Catch", kind: 'parada', element: 'aire', power: 25, cost: 7, desc: "Una corriente lo levanta por encima del larguero." },
  { id: 'nekketsu-punch', name: "Fireball Knuckle", kind: 'parada', element: 'fuego', power: 37, cost: 11, desc: "Un puñetazo ardiente contra el disparo." },
  { id: 'pressure-punch', name: "Pressure Punch", kind: 'parada', element: 'fuego', power: 37, cost: 11, desc: "Detiene el disparo con las manos al rojo." },
  { id: 'killer-blade', name: "Killer Blade", kind: 'parada', element: 'bosque', power: 37, cost: 11, desc: "Una malla vegetal frena el balón en seco." },
  { id: 'full-power-shield', name: "Escudo Total", kind: 'parada', element: 'fuego', power: 44, cost: 13, desc: "El portero se planta y no cede un centímetro." },
  { id: 'kogarashi', name: "Mistral", kind: 'parada', element: 'aire', power: 50, cost: 14, desc: "Una corriente lo levanta por encima del larguero." },
  { id: 'black-hole', name: "Black Hole", kind: 'parada', element: 'bosque', power: 56, cost: 16, desc: "Una malla vegetal frena el balón en seco." },
  { id: 'hanafubuki', name: "Flower Power", kind: 'parada', element: 'aire', power: 67, cost: 19, desc: "Una corriente lo levanta por encima del larguero." },
  { id: 'god-hand', name: "Mano Celestial", kind: 'parada', element: 'montana', power: 67, cost: 19, desc: "Una mano gigante emerge y detiene lo indetenible." },
  { id: 'wormhole', name: "Wormhole", kind: 'parada', element: 'bosque', power: 79, cost: 23, desc: "Una malla vegetal frena el balón en seco." },
  { id: 'mugen-the-hand', name: "Mano Infinita", kind: 'parada', element: 'montana', power: 101, cost: 29, desc: "La mano se estira todo lo que haga falta." },
  { id: 'majin-the-hand', name: "Mano del Demonio", kind: 'parada', element: 'montana', power: 135, cost: 39, desc: "La mano del demonio atrapa el balón en el aire." },
  // -------------------- REGATE
  { id: 'super-scan-of', name: "Attack Scan", kind: 'regate', element: 'bosque', power: 32, cost: 9, desc: "Se escurre entre la maleza y aparece por el otro lado." },
  { id: 'tatsumaki-senpuu', name: "Whirlwind Twister", kind: 'regate', element: 'aire', power: 32, cost: 9, desc: "Acelera hasta que el defensa deja de verle." },
  { id: 'dash-accel', name: "Dash Accelerator", kind: 'regate', element: 'montana', power: 32, cost: 9, desc: "Se abre camino a hombros, sin frenar." },
  { id: 'heat-tackle', name: "Entrada Ardiente", kind: 'regate', element: 'fuego', power: 34, cost: 10, desc: "Entra en llamas, y no es una forma de hablar." },
  { id: 'judge-through', name: "Breakthrough", kind: 'regate', element: 'fuego', power: 35, cost: 10, desc: "Un quiebro con las botas humeando." },
  { id: 'ninin-sankyaku', name: "Three-Legged Rush", kind: 'regate', element: 'montana', power: 37, cost: 11, desc: "Se abre camino a hombros, sin frenar." },
  { id: 'moonsault', name: "Moonsault", kind: 'regate', element: 'aire', power: 50, cost: 14, desc: "Acelera hasta que el defensa deja de verle." },
  { id: 'triple-dash', name: "Triple Dash", kind: 'regate', element: 'montana', power: 62, cost: 18, desc: "Se abre camino a hombros, sin frenar." },
  { id: 'illusion-ball', name: "Balón Ilusión", kind: 'regate', element: 'bosque', power: 79, cost: 23, desc: "Se multiplica en cinco copias y solo una lleva el balón." },
  { id: 'southern-crosscut', name: "Southern Cross", kind: 'regate', element: 'bosque', power: 96, cost: 28, desc: "Se escurre entre la maleza y aparece por el otro lado." },
  { id: 'heaven-s-time', name: "Heaven's Time", kind: 'regate', element: 'aire', power: 112, cost: 32, desc: "Acelera hasta que el defensa deja de verle." },
  { id: 'lightning-accel', name: "Lightning Sprint", kind: 'regate', element: 'fuego', power: 118, cost: 34, desc: "Un quiebro con las botas humeando." },
  // -------------------- TIRO
  { id: 'grenade-shot', name: "Grenade Shot", kind: 'tiro', element: 'fuego', power: 40, cost: 12, desc: "El balón sale ardiendo y el portero lo nota en los guantes." },
  { id: 'rolling-kick', name: "Patada Giratoria", kind: 'tiro', element: 'bosque', power: 40, cost: 12, desc: "Rueda por encima del rival con el balón pegado." },
  { id: 'tarzan-kick', name: "Tarzan Kick", kind: 'tiro', element: 'montana', power: 41, cost: 12, desc: "Pega como una roca cayendo desde arriba." },
  { id: 'megane-crash', name: "Spectacle Crash", kind: 'tiro', element: 'montana', power: 48, cost: 14, desc: "Pega como una roca cayendo desde arriba." },
  { id: 'dragon-tornado', name: "Tornado de Dragón", kind: 'tiro', element: 'fuego', power: 50, cost: 14, desc: "Dos dragones enroscados alrededor del balón." },
  { id: 'death-zone', name: "Zona Mortal", kind: 'tiro', element: 'bosque', power: 53, cost: 15, desc: "Tres jugadores hunden el balón en la portería." },
  { id: 'the-phoenix', name: "El Fénix", kind: 'tiro', element: 'fuego', power: 54, cost: 16, desc: "Un ave de fuego renace sobre el área pequeña." },
  { id: 'dragon-crash', name: "Golpe de Dragón", kind: 'tiro', element: 'bosque', power: 62, cost: 18, desc: "Un dragón de energía escolta el disparo." },
  { id: 'dokonjou-club', name: "Utter Gutsiness Club", kind: 'tiro', element: 'montana', power: 62, cost: 18, desc: "Pega como una roca cayendo desde arriba." },
  { id: 'god-break', name: "Golpe Divino", kind: 'tiro', element: 'aire', power: 70, cost: 20, desc: "Alas doradas y un disparo que no admite discusión." },
  { id: 'tri-pegasus', name: "Tri-Pegaso", kind: 'tiro', element: 'aire', power: 70, cost: 20, desc: "Tres caballos alados empujan a la vez." },
  { id: 'fire-tornado', name: "Tornado de Fuego", kind: 'tiro', element: 'fuego', power: 79, cost: 23, desc: "El balón entra en combustión y arrastra al portero." },
  { id: 'eternal-blizzard', name: "Ventisca Eterna", kind: 'tiro', element: 'aire', power: 90, cost: 26, desc: "El campo se hiela por donde pasa el balón." },
  { id: 'wolf-legend', name: "Legendary Wolf", kind: 'tiro', element: 'aire', power: 90, cost: 26, desc: "Una manada de lobos de nieve cruza el área." },
  { id: 'butterfly-dream', name: "Butterfly Trance", kind: 'tiro', element: 'montana', power: 96, cost: 28, desc: "Una nube de mariposas tapa el regate." },
  { id: 'inazuma-break', name: "Inazuma Break", kind: 'tiro', element: 'aire', power: 112, cost: 32, desc: "Técnica combinada: dos compañeros catapultan al rematador." },
  { id: 'supernova', name: "Supernova", kind: 'tiro', element: 'bosque', power: 135, cost: 39, desc: "La naturaleza empuja el disparo hacia la red." },
]

export const TECHNIQUE_BY_ID = new Map(TECHNIQUES.map((t) => [t.id, t]))

export function getTechnique(id: string): Technique | undefined {
  return TECHNIQUE_BY_ID.get(id)
}

/** Técnicas de una clase concreta, para el draft y el aprendizaje. */
export function techniquesOfKind(kind: Technique['kind']): Technique[] {
  return TECHNIQUES.filter((t) => t.kind === kind)
}

/** Qué clase de técnica usa cada demarcación al atacar/defender. */
export const KIND_LABEL: Record<Technique['kind'], string> = {
  tiro: 'Tiro',
  regate: 'Regate',
  bloqueo: 'Bloqueo',
  parada: 'Parada',
}

/** Lo que cuesta un manual de supertécnica: proporcional a su potencia. */
export function techniquePrice(t: Technique): number {
  return Math.round(500 + t.power * 22)
}

/**
 * Manuales a la venta. Es un surtido FIJO por partida (depende de la semilla)
 * que se renueva según avanzas: si la tienda ofreciera el catálogo entero,
 * comprar dejaría de ser una decisión y sería una lista de la compra.
 */
export function techniqueStock(seed: number, progress: number): Technique[] {
  const maxPower = 55 + progress * 12
  const pool = TECHNIQUES.filter((t) => t.power <= maxPower)
  const out: Technique[] = []
  let h = (seed ^ (progress * 2654435761)) >>> 0
  for (let i = 0; i < 4 && pool.length; i++) {
    h = (Math.imul(h ^ (h >>> 15), 2246822507) >>> 0)
    const pick = pool[h % pool.length]
    if (!out.includes(pick)) out.push(pick)
  }
  return out
}
