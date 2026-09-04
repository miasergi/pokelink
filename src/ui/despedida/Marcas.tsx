// MARCAS de la despedida: los símbolos del cartel, sin fondo y de un solo
// color. Sustituyen a los emojis, que traían su propia paleta de colorines y
// rompían el lenguaje de la sección (era mirar el programa y ver una fila de
// pegatinas de WhatsApp).
//
// Todas comparten el mismo lienzo de 24×24 y se pintan con `currentColor`, así
// que heredan el color de donde se pongan: blanco en el programa, lima cuando
// el bloque está en juego, negro sobre el botón de lima.
//
// Valorant y League of Legends son las marcas oficiales de Simple Icons
// (CC0-1.0, simpleicons.org). El resto están dibujadas aquí: los logos de
// verdad tienen copyright, así que se evocan (la calavera con sombrero de
// paja, el creeper, la llama) en vez de copiarse.

/** Las once del programa y las siete de las cajas. */
export type MarcaId =
  | 'directo' | 'onepiece' | 'elsword' | 'comida' | 'valorant' | 'fortnite'
  | 'lol' | 'minecraft' | 'luna' | 'dado' | 'balon' | 'reloj'
  | 'vaso' | 'caramelo' | 'comodin' | 'kebab' | 'cascos' | 'cafe' | 'regalo'

const TRAZOS: Record<MarcaId, string> = {
  // Cámara de directo: montar el streaming es el primer bloque del sábado.
  directo:
    'M2.6 6.2h11.6a2.2 2.2 0 0 1 2.2 2.2v7.2a2.2 2.2 0 0 1-2.2 2.2H2.6A2.2 2.2 0 0 1 .4 15.6V8.4a2.2 2.2 0 0 1 2.2-2.2Z'
    + 'M17.6 10.6 23 7.2v9.6l-5.4-3.4Z',

  // Calavera con sombrero de paja: One Piece sin copiar el logo.
  onepiece:
    'M1.6 10.6c0-.7 4.6-1.3 10.4-1.3s10.4.6 10.4 1.3-4.6 1.7-10.4 1.7S1.6 11.3 1.6 10.6Z'
    + 'M6.4 9.6C6.4 5.9 8.9 3.4 12 3.4s5.6 2.5 5.6 6.2c0 .4-2.5.7-5.6.7s-5.6-.3-5.6-.7Z'
    + 'M6.9 13.4h10.2c0 3.1-1.4 5.4-3.1 6.4v1.9H9.9v-1.9c-1.7-1-3-3.3-3-6.4Z'
    // Ojos y nariz, recortados con evenodd.
    + 'M10.6 16a1.3 1.3 0 1 1-2.6 0 1.3 1.3 0 0 1 2.6 0Z'
    + 'M16 16a1.3 1.3 0 1 1-2.6 0 1.3 1.3 0 0 1 2.6 0Z'
    + 'M12 17.4l.9 1.6h-1.8Z',

  // Espadón. La primera versión era una hoja de dos píxeles que a 20 px
  // desaparecía; esta tiene cuerpo.
  elsword:
    'M12 1 15 8.6v6.4H9V8.6Z'
    + 'M4.8 15.4h14.4v2.4H4.8Z'
    + 'M10.6 17.8h2.8v3.4h-2.8Z'
    + 'M9.4 21.2h5.2v1.8H9.4Z',

  // Cubiertos.
  comida:
    'M5.6 1.6h1.7v6.1h1.1V1.6h1.7v6.1h1.1V1.6h1.7v6.6c0 1.5-1 2.7-2.4 3v11.2H8v-11c-1.4-.3-2.4-1.5-2.4-3Z'
    + 'M17.4 1.6c1.9 1.6 2.9 4.2 2.9 7.2 0 2.4-.7 4.2-1.9 5.2v8.4h-2.2V2.5c0-.7.6-1.2 1.2-.9Z',

  // Valorant — Simple Icons (CC0-1.0).
  valorant:
    'M23.792 2.152a.252.252 0 0 0-.098.083c-3.384 4.23-6.769 8.46-10.15 12.69-.107.093-.025.288.119.265 2.439.003 4.877 0 7.316.001a.66.66 0 0 0 .552-.25c.774-.967 1.55-1.934 2.324-2.903a.72.72 0 0 0 .144-.49c-.002-3.077 0-6.153-.003-9.23.016-.11-.1-.206-.204-.167z'
    + 'M.077 2.166c-.077.038-.074.132-.076.205.002 3.074.001 6.15.001 9.225a.679.679 0 0 0 .158.463l7.64 9.55c.12.152.308.25.505.247 2.455 0 4.91.003 7.365 0 .142.02.222-.174.116-.265C10.661 15.176 5.526 8.766.4 2.35c-.08-.094-.174-.272-.322-.184z',

  // Llama del botín: lo más reconocible de Fortnite que se puede dibujar sin
  // copiar nada. En bloques, que redondeada parecía un perro.
  fortnite:
    'M2.4 10.4h9.8v8.2H2.4Z'
    + 'M3.2 18.6h2.4v3.8H3.2Z'
    + 'M9 18.6h2.4v3.8H9Z'
    + 'M12.2 6.4h3.6v6.4h-3.6Z'
    + 'M12.2 3.4h7.6v4.2h-7.6Z'
    + 'M18 1.4 19.4 3.4h-2.8Z'
    + 'M17.6 5.4a.9.9 0 1 1-1.8 0 .9.9 0 0 1 1.8 0Z',

  // League of Legends — Simple Icons (CC0-1.0).
  lol:
    'm1.912 0 1.212 2.474v19.053L1.912 24h14.73l1.337-4.682H8.33V0ZM12 1.516c-.913 0-1.798.112-2.648.312v1.74a9.738 9.738 0 0 1 2.648-.368c5.267 0 9.536 4.184 9.536 9.348a9.203 9.203 0 0 1-2.3 6.086l-.273.954-.602 2.112c2.952-1.993 4.89-5.335 4.89-9.122C23.25 6.468 18.213 1.516 12 1.516Zm0 2.673c-.924 0-1.814.148-2.648.414v13.713h8.817a8.246 8.246 0 0 0 2.36-5.768c0-4.617-3.818-8.359-8.529-8.359zM2.104 7.312A10.858 10.858 0 0 0 .75 12.576c0 1.906.492 3.7 1.355 5.266z',

  // Cara de creeper: Minecraft entero cabe en seis cuadrados.
  minecraft:
    'M2.4 2.4h19.2v19.2H2.4Z'
    + 'M6.2 7h3.7v3.7H6.2Z'
    + 'M14.1 7h3.7v3.7h-3.7Z'
    + 'M10.1 10.9h3.8v3.6h-3.8Z'
    + 'M8.2 14.5h2.5v4.2H8.2Z'
    + 'M13.3 14.5h2.5v4.2h-2.5Z',

  // Luna creciente: la cena disfrazado de Sailor Moon.
  luna:
    'M13.4 1.8A10.4 10.4 0 1 0 22.4 15 8.4 8.4 0 0 1 13.4 1.8Z',

  // Dado: la noche de juegos de mesa. Dos naipes juntos se leían como un libro.
  dado:
    'M4.6 2.6h14.8a2 2 0 0 1 2 2v14.8a2 2 0 0 1-2 2H4.6a2 2 0 0 1-2-2V4.6a2 2 0 0 1 2-2Z'
    + 'M9.4 7.6a1.7 1.7 0 1 1-3.4 0 1.7 1.7 0 0 1 3.4 0Z'
    + 'M18 7.6a1.7 1.7 0 1 1-3.4 0 1.7 1.7 0 0 1 3.4 0Z'
    + 'M13.7 12a1.7 1.7 0 1 1-3.4 0 1.7 1.7 0 0 1 3.4 0Z'
    + 'M9.4 16.4a1.7 1.7 0 1 1-3.4 0 1.7 1.7 0 0 1 3.4 0Z'
    + 'M18 16.4a1.7 1.7 0 1 1-3.4 0 1.7 1.7 0 0 1 3.4 0Z',

  // Balón de baloncesto, con las costuras recortadas.
  balon:
    'M12 1.4a10.6 10.6 0 1 0 0 21.2 10.6 10.6 0 0 0 0-21.2Z'
    + 'M11.2 2.2h1.6v19.6h-1.6Z'
    + 'M2.2 11.2h19.6v1.6H2.2Z'
    + 'M6.9 2.9 8 4.2A9.9 9.9 0 0 0 8 19.8l-1.1 1.3a11.6 11.6 0 0 1 0-18.2Z'
    + 'M17.1 2.9a11.6 11.6 0 0 1 0 18.2L16 19.8a9.9 9.9 0 0 0 0-15.6Z',

  // Reloj: los retos que valen a cualquier hora del fin de semana.
  reloj:
    'M12 1.4a10.6 10.6 0 1 0 0 21.2 10.6 10.6 0 0 0 0-21.2Z'
    + 'M12 4.2a7.8 7.8 0 1 1 0 15.6 7.8 7.8 0 0 1 0-15.6Z'
    + 'M11.1 6.4h1.8v6.1l4.1 2.4-.9 1.5-5-2.9Z',

  // --- Las cajas ---

  // Vaso de refresco con pajita.
  vaso:
    'M4.6 6.4h14.8l-1.5 14.9a2 2 0 0 1-2 1.8H8.1a2 2 0 0 1-2-1.8Z'
    + 'M3.8 3.4h16.4v2.6H3.8Z'
    + 'M13.4 3.4 15.6.4l2.4 1.5-1.4 1.5Z',

  // Caramelo envuelto.
  caramelo:
    'M8.4 8.4h7.2v7.2H8.4Z'
    + 'M7.1 8.1 2.4 5.4v13.2l4.7-2.7Z'
    + 'M16.9 8.1l4.7-2.7v13.2l-4.7-2.7Z',

  // Comodín: naipe con estrella.
  comodin:
    'M6.4 1.8h11.2a1.8 1.8 0 0 1 1.8 1.8v16.8a1.8 1.8 0 0 1-1.8 1.8H6.4a1.8 1.8 0 0 1-1.8-1.8V3.6a1.8 1.8 0 0 1 1.8-1.8Z'
    + 'M12 6.2l1.7 3.5 3.8.5-2.8 2.7.7 3.8-3.4-1.8-3.4 1.8.7-3.8L6.5 10.2l3.8-.5Z',

  // Brocheta. El intento anterior (un dürüm) salía clavado a un parquímetro.
  kebab:
    'M11.2 1.2h1.6v3.4h-1.6Z'
    + 'M11.2 19.4h1.6v3.4h-1.6Z'
    + 'M6.4 4.6h11.2v4H6.4Z'
    + 'M6.4 10h11.2v4H6.4Z'
    + 'M6.4 15.4h11.2v4H6.4Z',

  // Cascos: quien manda en la música.
  cascos:
    'M12 1.8A9.6 9.6 0 0 0 2.4 11.4v5.2h2.4v-5.2a7.2 7.2 0 1 1 14.4 0v5.2h2.4v-5.2A9.6 9.6 0 0 0 12 1.8Z'
    + 'M2 13.6h3.6a1.4 1.4 0 0 1 1.4 1.4v5.6a1.4 1.4 0 0 1-1.4 1.4H2Z'
    + 'M18.4 13.6H22v8.4h-3.6a1.4 1.4 0 0 1-1.4-1.4V15a1.4 1.4 0 0 1 1.4-1.4Z',

  // Taza: el desayuno del domingo.
  cafe:
    'M2.6 5.4h14.2v7.2a5.4 5.4 0 0 1-5.4 5.4H8a5.4 5.4 0 0 1-5.4-5.4Z'
    + 'M18.2 6.8h1.6a3.4 3.4 0 0 1 0 6.8h-1.6v-2.2h1.6a1.2 1.2 0 0 0 0-2.4h-1.6Z'
    + 'M2.2 20h15v2.4h-15Z',

  // Caja de regalo, con el lazo recortado.
  regalo:
    'M2.6 10.6h18.8v11.2H2.6Z'
    + 'M1.4 5.8h21.2v4.2H1.4Z'
    + 'M10.9 5.8h2.2v16h-2.2Z'
    + 'M8.6 1.2a2.7 2.7 0 0 1 2.6 3.9H8.6a1.9 1.9 0 0 1 0-3.9Z'
    + 'M15.4 1.2a1.9 1.9 0 0 1 0 3.9h-2.6a2.7 2.7 0 0 1 2.6-3.9Z',
}

/** Ids existentes, para poder comprobar que los datos no piden una marca que
 *  no está dibujada (se vería un hueco y nadie se enteraría hasta el sábado). */
export const MARCAS = Object.keys(TRAZOS) as MarcaId[]

export default function Marca({ id, className = 'w-6 h-6', style }: {
  id: MarcaId
  className?: string
  /** Sirve sobre todo para el color: la marca se pinta con `currentColor`. */
  style?: React.CSSProperties
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" fillRule="evenodd" clipRule="evenodd" aria-hidden focusable="false">
      <path d={TRAZOS[id]} />
    </svg>
  )
}
