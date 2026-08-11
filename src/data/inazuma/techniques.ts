// Catálogo de supertécnicas.
//
// NOTA sobre las fuentes: las técnicas ICÓNICAS de la saga (Mano Celestial,
// Tornado de Fuego, Pingüinos Emperador, Ilusión, Muro de Piedra, El Fénix…)
// llevan su nombre del doblaje. El resto son de relleno, escritas en el mismo
// idioma visual para que las plantillas rivales no repitan las mismas cuatro
// técnicas. Están marcadas con `// relleno`. Si quieres sustituirlas por las
// reales de la saga, este fichero es el único sitio que hay que tocar.
//
// Balance (potencia / coste PT):
//   básica     25-40  /  8-12      → todo el mundo lleva una, se puede spamear
//   media      55-75  / 16-22      → una por partido y medio
//   definitiva 95-135 / 28-40      → decide un partido, te deja seco
import type { Technique } from '@/engine/inazuma/types'

export const TECHNIQUES: Technique[] = [
  // ---------------------------------------------------------------- TIROS ---
  { id: 't-tiro-raso', name: 'Tiro raso', kind: 'tiro', element: 'aire', power: 25, cost: 6, desc: 'Un disparo honesto a ras de hierba.' }, // relleno
  { id: 't-volea', name: 'Volea seca', kind: 'tiro', element: 'montana', power: 34, cost: 9, desc: 'Golpeo al primer toque, sin pensarlo.' }, // relleno
  { id: 't-tornado-fuego', name: 'Tornado de Fuego', kind: 'tiro', element: 'fuego', power: 72, cost: 20, desc: 'El balón entra en combustión y arrastra al portero.', evolvesTo: 't-tornado-fuego-2' },
  { id: 't-tornado-fuego-2', name: 'Tornado de Fuego 2', kind: 'tiro', element: 'fuego', power: 108, cost: 32, desc: 'La misma llamarada, con el doble de revoluciones.' },
  { id: 't-pinguinos-1', name: 'Pingüinos Emperador nº1', kind: 'tiro', element: 'bosque', power: 78, cost: 22, desc: 'Una bandada de pingüinos arrastra el balón a portería.', evolvesTo: 't-pinguinos-2' },
  { id: 't-pinguinos-2', name: 'Pingüinos Emperador nº2', kind: 'tiro', element: 'bosque', power: 118, cost: 36, desc: 'Ahora son dos bandadas. No hay portero que lo pare limpio.' },
  { id: 't-golpe-dragon', name: 'Golpe de Dragón', kind: 'tiro', element: 'bosque', power: 66, cost: 18, desc: 'Un dragón de energía escolta el disparo.' },
  { id: 't-ventisca', name: 'Ventisca Eterna', kind: 'tiro', element: 'aire', power: 74, cost: 21, desc: 'El campo se hiela por donde pasa el balón.', evolvesTo: 't-leyenda-lobo' },
  { id: 't-leyenda-lobo', name: 'Leyenda del Lobo', kind: 'tiro', element: 'aire', power: 112, cost: 34, desc: 'Una manada de lobos de nieve cruza el área.' },
  { id: 't-fenix', name: 'El Fénix', kind: 'tiro', element: 'fuego', power: 120, cost: 38, desc: 'Un ave de fuego renace sobre el área pequeña.' },
  { id: 't-tiro-celestial', name: 'Tiro Celestial', kind: 'tiro', element: 'fuego', power: 96, cost: 30, desc: 'Alas doradas y un disparo que no admite discusión.' },
  { id: 't-meteorito', name: 'Remate Meteorito', kind: 'tiro', element: 'montana', power: 70, cost: 20, desc: 'El balón cae desde el cielo como una roca ardiendo.' }, // relleno
  { id: 't-inazuma-1', name: 'Inazuma nº1', kind: 'tiro', element: 'montana', power: 88, cost: 26, desc: 'Técnica combinada: dos compañeros catapultan al rematador.' },
  { id: 't-torre-babel', name: 'Torre de Babel', kind: 'tiro', element: 'montana', power: 92, cost: 28, desc: 'Una columna de piedra empuja el balón hacia la escuadra.' }, // relleno
  { id: 't-cuchilla-sombra', name: 'Cuchilla Sombría', kind: 'tiro', element: 'bosque', power: 58, cost: 16, desc: 'El disparo desaparece a media trayectoria.' }, // relleno
  { id: 't-huracan-doble', name: 'Huracán Doble', kind: 'tiro', element: 'aire', power: 62, cost: 17, desc: 'Dos remolinos en direcciones opuestas.' }, // relleno
  { id: 't-brasa', name: 'Brasa', kind: 'tiro', element: 'fuego', power: 38, cost: 10, desc: 'Un chispazo, poco más. Pero entra.' }, // relleno

  // -------------------------------------------------------------- REGATES ---
  { id: 'r-recorte', name: 'Recorte', kind: 'regate', element: 'aire', power: 24, cost: 5, desc: 'Cambio de dirección de toda la vida.' }, // relleno
  { id: 'r-ilusion', name: 'Ilusión', kind: 'regate', element: 'bosque', power: 70, cost: 18, desc: 'Se multiplica en cinco copias y solo una lleva el balón.' },
  { id: 'r-torbellino', name: 'Torbellino', kind: 'regate', element: 'aire', power: 64, cost: 16, desc: 'Acelera hasta convertirse en un remolino.' },
  { id: 'r-espejismo', name: 'Espejismo', kind: 'regate', element: 'fuego', power: 56, cost: 14, desc: 'El calor deforma la figura del regateador.' }, // relleno
  { id: 'r-paso-montana', name: 'Paso de Montaña', kind: 'regate', element: 'montana', power: 60, cost: 15, desc: 'Se abre camino a hombros, sin frenar.' }, // relleno
  { id: 'r-danza-hojas', name: 'Danza de Hojas', kind: 'regate', element: 'bosque', power: 44, cost: 11, desc: 'Una cortina de hojas tapa el balón.' }, // relleno
  { id: 'r-sombra-doble', name: 'Sombra Doble', kind: 'regate', element: 'bosque', power: 98, cost: 28, desc: 'Deja atrás su propia sombra corriendo.' }, // relleno
  { id: 'r-relampago', name: 'Paso Relámpago', kind: 'regate', element: 'aire', power: 90, cost: 26, desc: 'De un lado del campo al otro en un parpadeo.' }, // relleno

  // ------------------------------------------------------------- BLOQUEOS ---
  { id: 'b-entrada', name: 'Entrada firme', kind: 'bloqueo', element: 'montana', power: 26, cost: 6, desc: 'Al balón, siempre al balón.' }, // relleno
  { id: 'b-muro', name: 'Muro de Piedra', kind: 'bloqueo', element: 'montana', power: 72, cost: 19, desc: 'Un muro se levanta del césped y el balón se estrella.' },
  { id: 'b-barrera-hielo', name: 'Barrera de Hielo', kind: 'bloqueo', element: 'aire', power: 68, cost: 18, desc: 'El suelo se congela bajo los pies del atacante.' },
  { id: 'b-raices', name: 'Raíces', kind: 'bloqueo', element: 'bosque', power: 58, cost: 15, desc: 'El terreno atrapa las piernas del rival.' }, // relleno
  { id: 'b-cerco-llamas', name: 'Cerco de Llamas', kind: 'bloqueo', element: 'fuego', power: 62, cost: 16, desc: 'Un anillo de fuego cierra el pasillo.' }, // relleno
  { id: 'b-torre-doble', name: 'Torre Doble', kind: 'bloqueo', element: 'montana', power: 96, cost: 27, desc: 'Dos defensas hacen de pared viviente.' }, // relleno
  { id: 'b-tormenta-arena', name: 'Tormenta de Arena', kind: 'bloqueo', element: 'montana', power: 50, cost: 13, desc: 'Nadie ve nada durante dos segundos.' }, // relleno

  // -------------------------------------------------------------- PARADAS ---
  { id: 'p-blocaje', name: 'Blocaje', kind: 'parada', element: 'montana', power: 28, cost: 6, desc: 'Manos seguras, sin florituras.' }, // relleno
  { id: 'p-mano-celestial', name: 'Mano Celestial', kind: 'parada', element: 'montana', power: 76, cost: 20, desc: 'Una mano gigante emerge y detiene lo indetenible.', evolvesTo: 'p-mano-celestial-2' },
  { id: 'p-mano-celestial-2', name: 'Mano Celestial 2', kind: 'parada', element: 'montana', power: 114, cost: 32, desc: 'La mano ya no para el balón: lo devuelve.' },
  { id: 'p-puno-justiciero', name: 'Puño Justiciero', kind: 'parada', element: 'fuego', power: 100, cost: 29, desc: 'Un puñetazo ardiente contra el disparo.' },
  { id: 'p-muralla', name: 'Muralla Defensiva', kind: 'parada', element: 'montana', power: 66, cost: 17, desc: 'El portero se planta y no cede un centímetro.' }, // relleno
  { id: 'p-red-hojas', name: 'Red de Hojas', kind: 'parada', element: 'bosque', power: 60, cost: 16, desc: 'Una malla vegetal frena el balón en seco.' }, // relleno
  { id: 'p-corriente', name: 'Corriente Ascendente', kind: 'parada', element: 'aire', power: 70, cost: 19, desc: 'Una ráfaga levanta el disparo por encima del larguero.' }, // relleno
  { id: 'p-guante-espectral', name: 'Guante Espectral', kind: 'parada', element: 'bosque', power: 92, cost: 26, desc: 'La mano atraviesa el balón y lo detiene desde dentro.' }, // relleno
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
  const pool = TECHNIQUES.filter((t) => t.power <= maxPower && !t.evolvesTo)
  const out: Technique[] = []
  let h = (seed ^ (progress * 2654435761)) >>> 0
  for (let i = 0; i < 4 && pool.length; i++) {
    h = (Math.imul(h ^ (h >>> 15), 2246822507) >>> 0)
    const pick = pool[h % pool.length]
    if (!out.includes(pick)) out.push(pick)
  }
  return out
}
