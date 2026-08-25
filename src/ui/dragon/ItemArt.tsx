// ARTE PROPIO de los objetos del modo Dragon Ball. Un dibujo por objeto, aquí
// dentro, sin descargar nada.
//
// Por qué DIBUJADOS y no bajados de ninguna wiki:
//  - La mitad de estos objetos son inventados para el juego (la cinta de
//    concentración, el núcleo de energía, el elixir de ki, las muñequeras de
//    gravedad): no existe imagen de ninguno en ninguna parte.
//  - Los que sí existen vendrían cada uno de una fuente distinta —un render 3D,
//    un recorte de anime, un sprite— y la bolsa sería un batiburrillo.
//  - Dibujados con la misma gramática pesan nada, se ven igual en todos los
//    móviles y no dependen de que una descarga haya ido bien. Es lo mismo que
//    hace el resto del repo (`public/covers/party-cover.svg`, `IECoin` en
//    Inazuma, los escenarios de `Bits.tsx`).
//
// LA GRAMÁTICA, que es lo que hace que parezcan de la misma colección:
//  - Lienzo `0 0 24 24`, el mismo que `Icon`.
//  - Silueta de relleno PLANO con contorno de tinta (`INK`) de 1,1 de grosor.
//    A 16 px eso es un pelo; a 40, un borde de pegatina. Nada de trazos finos
//    de detalle, que a tamaño de ficha se convierten en ruido gris.
//  - Volumen SIEMPRE igual: una luz blanca arriba a la izquierda y una sombra
//    negra abajo a la derecha, las dos translúcidas. Al ser tinta neutra sobre
//    el color de cada objeto, las quince piezas quedan iluminadas desde el
//    mismo sitio sin tener que inventar una paleta de sombras por objeto.
//  - CERO `<defs>`/gradientes: como el componente se pinta muchas veces en la
//    misma pantalla (bolsa, tienda, fichas), los `id` de los degradados
//    chocarían entre instancias. Con rellenos planos el problema no existe.
//  - Nada de `currentColor`: estos van a color, se hereden los colores que se
//    hereden del contenedor.
import { getItem } from '@/data/dragon/items'

/** La tinta del contorno. Es el mismo azul-negro del fondo de la app. */
const INK = '#0b1220'

/** Luz y sombra, siempre las mismas: el volumen se lee igual en los quince. */
const LUZ = { fill: '#ffffff', opacity: 0.26, stroke: 'none' } as const
const SOMBRA = { fill: '#000000', opacity: 0.16, stroke: 'none' } as const

/**
 * Corte de CAMISETA compartido por los dos lastres: el mismo cuerpo, distinta
 * carga. Que se reconozcan como parientes es justo lo que cuenta la progresión
 * (ropa lastrada → lastre del Rey Kaito).
 */
const CAMISETA = 'M9 3.6 L4.6 5.8 L6.2 10.2 L8.4 9.4 L8.4 20.4 H15.6 V9.4 '
  + 'L17.8 10.2 L19.4 5.8 L15 3.6 C15 5.2 13.7 6 12 6 C10.3 6 9 5.2 9 3.6 Z'

/**
 * Silueta de JUDÍA, compartida por la Semilla del Ermitaño y la de Karin: una
 * elipse oblicua, que es lo que hace que se lea «legumbre» y no «piedra». La
 * diferencia entre las dos es el color y el brillo, como en el propio anime.
 */
const JUDIA = 'M5.6 15.4 C3.6 12.6 5.6 8 10 5.4 C14.4 2.8 19 3.2 20.4 6 '
  + 'C21.8 8.8 19.6 13.2 15.4 15.8 C11 18.4 7 18.2 5.6 15.4 Z'

/**
 * El dibujo de cada objeto. Van sin `<svg>`: el envoltorio (lienzo, contorno,
 * uniones redondeadas) lo pone `ItemArt`, así ninguno puede desviarse.
 */
const ARTE: Record<string, JSX.Element> = {
  // ------------------------------------------------------------ equipo ---

  // ARMADURA SAIYAN: peto oscuro con hombreras ámbar que sobresalen y la placa
  // pectoral del ejército de Freezer.
  armadura: (
    <>
      <path d="M8.6 4.6 C5.2 4.2 2.4 6.4 2.2 9.8 C2.15 10.7 2.8 11.4 3.6 11.5 L7.9 12.1 Z" fill="#f59e0b" />
      <path d="M15.4 4.6 C18.8 4.2 21.6 6.4 21.8 9.8 C21.85 10.7 21.2 11.4 20.4 11.5 L16.1 12.1 Z" fill="#f59e0b" />
      <path d="M8.2 4.6 H15.8 L17 12.4 C17 16.2 14.9 18.9 12 20.6 C9.1 18.9 7 16.2 7 12.4 Z" fill="#334155" />
      <path d="M7.6 9.2 H16.4 L16.8 12.4 C15.2 13.2 13.6 13.6 12 13.6 C10.4 13.6 8.8 13.2 7.2 12.4 Z" fill="#f59e0b" />
      <path d="M9.2 5.2 H11 L9.6 12.8 Z" {...LUZ} />
      <path d="M12 4.6 H15.8 L17 12.4 C17 16.2 14.9 18.9 12 20.6 Z" fill="#000000" opacity="0.12" stroke="none" />
    </>
  ),

  // GUANTES DE COMBATE: el puño de frente, con los tres nudillos reforzados en
  // acero — que es literalmente lo que sube el objeto (+20 % de poder).
  guantes: (
    <>
      <path d="M8 12 H6.4 C4.5 12 3.1 13.2 3.1 14.8 C3.1 16.4 4.5 17.6 6.4 17.6 H8 Z" fill="#991b1b" />
      <path d="M6.4 12.6 A5.6 5.6 0 0 1 12 7 A5.6 5.6 0 0 1 17.6 12.6 V15.6 A1.6 1.6 0 0 1 16 17.2 H8 A1.6 1.6 0 0 1 6.4 15.6 Z" fill="#b91c1c" />
      <circle cx="8.7" cy="10.9" r="1.25" fill="#e2e8f0" />
      <circle cx="12" cy="9.5" r="1.25" fill="#e2e8f0" />
      <circle cx="15.3" cy="10.9" r="1.25" fill="#e2e8f0" />
      <path d="M7 16.8 H17 A1.4 1.4 0 0 1 18.4 18.2 V19.9 A1.4 1.4 0 0 1 17 21.3 H7 A1.4 1.4 0 0 1 5.6 19.9 V18.2 A1.4 1.4 0 0 1 7 16.8 Z" fill="#0f172a" />
      <path d="M6.2 19 H17.8" stroke="#e2e8f0" strokeWidth="1.1" fill="none" />
      <path d="M6.6 12.8 C6.8 9.9 9 7.7 11.8 7.5 C9.4 8 7.6 10.1 7.4 12.8 Z" {...LUZ} />
      <path d="M12 7 A5.6 5.6 0 0 1 17.6 12.6 V15.6 A1.6 1.6 0 0 1 16 17.2 H12 Z" {...SOMBRA} />
    </>
  ),

  // CINTA DE CONCENTRACIÓN: la tela ceñida a la frente y los dos cabos al
  // viento. En azul de ki, el mismo color con el que la app pinta el ki.
  banda: (
    <>
      <path d="M17.4 8.6 C19.8 7.8 21.4 6.2 22.4 4.2 C22.2 7.6 20.8 10.2 18.2 11.8 Z" fill="#0ea5e9" />
      <path d="M17.4 13.4 C20 13.8 21.8 15.2 22.8 17.6 C20.4 16.2 18.2 15.6 16.4 15.6 Z" fill="#0ea5e9" />
      <path d="M2 10.6 C5.6 8.2 11 7.5 15.2 8.7 L15.2 13.1 C11 11.9 5.6 12.6 2 15 Z" fill="#38bdf8" />
      <path d="M14.4 7.9 H17.2 V13.9 H14.4 Z" fill="#0284c7" />
      <path d="M2 10.6 C5.6 8.2 11 7.5 15.2 8.7 L15.2 10.1 C11 8.9 5.6 9.6 2 12 Z" {...LUZ} />
      <path d="M2 13.6 C5.6 11.2 11 10.5 15.2 11.7 L15.2 13.1 C11 11.9 5.6 12.6 2 15 Z" {...SOMBRA} />
    </>
  ),

  // NUBE KINTON: un cúmulo amarillo de fondo plano, que es como se dibuja
  // siempre en el anime (se monta encima, no se atraviesa).
  kinton: (
    <>
      <path
        d={'M6 18.4 C3.5 18.4 1.6 16.7 1.6 14.5 C1.6 12.7 2.9 11.2 4.6 10.8 C4.9 8.1 7.2 6 10 6 '
          + 'C11.9 6 13.6 7 14.6 8.5 C15.2 8.2 15.9 8 16.6 8 C19 8 20.9 9.9 20.9 12.2 L20.9 12.8 '
          + 'C21.9 13.4 22.5 14.4 22.5 15.6 C22.5 17.2 21.2 18.4 19.7 18.4 Z'}
        fill="#fbbf24"
      />
      <path d="M5.4 12.6 C5.8 10.2 7.6 8.4 10 8" stroke="#fef3c7" strokeWidth="1.8" fill="none" />
      <path d="M3 16.1 C7 17.9 17.6 18.1 21.8 16.1 C21.6 17.4 20.8 18.4 19.7 18.4 L6 18.4 C4.6 18.4 3.4 17.5 3 16.1 Z" {...SOMBRA} />
    </>
  ),

  // RASTREADOR: la lente verde barriendo hacia delante, el cuerpo del aparato
  // con su piloto y el arco que se engancha a la oreja.
  scouter: (
    <>
      {/* El arco de la oreja va en gris claro: en gris oscuro se lo tragaba el
          fondo de la ficha y el aparato parecía flotar. */}
      <path d="M15.2 6.8 C19.6 6.8 22.2 9 22.2 11.8 C22.2 14.6 19.6 16.8 15.2 16.8" stroke={INK} strokeWidth="2.9" fill="none" strokeLinecap="round" />
      <path d="M15.2 6.8 C19.6 6.8 22.2 9 22.2 11.8 C22.2 14.6 19.6 16.8 15.2 16.8" stroke="#94a3b8" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M2.4 9.6 C2.4 8.6 3.2 7.8 4.2 7.6 L10.8 6.2 L10.8 15.2 L4.2 13.8 C3.2 13.6 2.4 12.8 2.4 11.8 Z" fill="#4ade80" />
      <path d="M10.2 5.4 H13.8 A1.8 1.8 0 0 1 15.6 7.2 V14.4 A1.8 1.8 0 0 1 13.8 16.2 H10.2 Z" fill="#334155" />
      <circle cx="12.9" cy="8" r="1.1" fill="#f87171" />
      <path d="M3.8 9.2 L9.8 8 L9.8 9.6 L3.8 10.8 Z" {...LUZ} />
      <path d="M3 12.4 L10.8 13.8 L10.8 15.2 L4.2 13.8 C3.5 13.7 3 13.1 3 12.4 Z" {...SOMBRA} />
    </>
  ),

  // CAPA DEL MAESTRO: el paño cayendo desde el cuello, con su broche dorado.
  // Violeta porque es el objeto «decente en todo», el equilibrado.
  capa: (
    <>
      <path d="M8 5 C6.8 6.6 4.6 12 3.4 18.6 C6 20 9 20.6 12 20.6 C15 20.6 18 20 20.6 18.6 C19.4 12 17.2 6.6 16 5 Z" fill="#7c3aed" />
      <path d="M7.4 4 C9 3 10.4 2.6 12 2.6 C13.6 2.6 15 3 16.6 4 L16 6.2 C14.7 5.4 13.4 5 12 5 C10.6 5 9.3 5.4 8 6.2 Z" fill="#a78bfa" />
      <circle cx="12" cy="6.6" r="1.5" fill="#fbbf24" />
      <path d="M8.8 6.4 C7.8 8.8 6.4 12.6 5.6 17" stroke="#c4b5fd" strokeWidth="1.5" fill="none" />
      <path d="M12 5 H16 C17.2 6.6 19.4 12 20.6 18.6 C17.9 19.9 15 20.6 12 20.6 Z" {...SOMBRA} />
    </>
  ),

  // ROPA LASTRADA: la camiseta naranja del gi con dos planchas de plomo cosidas
  // al pecho. Frena, y por eso entrena.
  lastre: (
    <>
      <path d={CAMISETA} fill="#f97316" />
      <path d="M9.2 10.6 H14.8 A0.8 0.8 0 0 1 15.6 11.4 V13.2 H8.4 V11.4 A0.8 0.8 0 0 1 9.2 10.6 Z" fill="#334155" />
      <path d="M8.4 14.6 H15.6 V16.4 A0.8 0.8 0 0 1 14.8 17.2 H9.2 A0.8 0.8 0 0 1 8.4 16.4 Z" fill="#334155" />
      <circle cx="9.9" cy="11.9" r="0.55" fill="#94a3b8" stroke="none" />
      <circle cx="14.1" cy="11.9" r="0.55" fill="#94a3b8" stroke="none" />
      <circle cx="9.9" cy="15.9" r="0.55" fill="#94a3b8" stroke="none" />
      <circle cx="14.1" cy="15.9" r="0.55" fill="#94a3b8" stroke="none" />
      <path d="M9 3.6 L4.6 5.8 L6.2 10.2 L8.4 9.4 L8.4 6.4 Z" {...LUZ} />
      <path d="M12 6 V20.4 H15.6 V9.4 L17.8 10.2 L19.4 5.8 L15 3.6 C15 5.2 13.7 6 12 6 Z" {...SOMBRA} />
    </>
  ),

  // LASTRE DEL REY KAITO: el MISMO corte, pero azul de otro mundo y cargado de
  // bloques hasta los hombros. Se ve de un vistazo que pesa el doble.
  lastre2: (
    <>
      <path d={CAMISETA} fill="#1e40af" />
      <path d="M4.9 6.4 H7.9 A0.7 0.7 0 0 1 8.6 7.1 V9.5 H5.6 A0.7 0.7 0 0 1 4.9 8.8 Z" fill="#0f172a" />
      <path d="M16.1 6.4 H18.4 A0.7 0.7 0 0 1 19.1 7.1 V8.8 A0.7 0.7 0 0 1 18.4 9.5 H15.4 V7.1 A0.7 0.7 0 0 1 16.1 6.4 Z" fill="#0f172a" />
      <path d="M8.8 9.8 H15.2 A0.7 0.7 0 0 1 15.9 10.5 V12.6 H8.1 V10.5 A0.7 0.7 0 0 1 8.8 9.8 Z" fill="#0f172a" />
      <path d="M8.1 13.4 H15.9 V16.2 H8.1 Z" fill="#0f172a" />
      <path d="M8.1 17 H15.9 V19.4 A0.7 0.7 0 0 1 15.2 20.1 H8.8 A0.7 0.7 0 0 1 8.1 19.4 Z" fill="#0f172a" />
      <path d="M9.4 11.2 H14.6 M9.4 14.8 H14.6 M9.4 18.4 H14.6" stroke="#475569" strokeWidth="1.1" fill="none" />
      <path d="M9 3.6 L4.6 5.8 L5.6 8.6 L8.4 7.4 Z" {...LUZ} />
      <path d="M12 6 V20.4 H15.6 V9.4 L17.8 10.2 L19.4 5.8 L15 3.6 C15 5.2 13.7 6 12 6 Z" {...SOMBRA} />
    </>
  ),

  // NÚCLEO DE ENERGÍA: una carcasa con pistas de circuito que van a morir a un
  // corazón encendido. Es el objeto con el que se empieza el combate cargado.
  nucleo: (
    <>
      <circle cx="12" cy="12" r="9" fill="#0c4a6e" />
      <path
        d={'M12 3.4 V7.6 M12 16.4 V20.6 M3.4 12 H7.6 M16.4 12 H20.6 M6 6 L8.9 8.9 '
          + 'M15.1 15.1 L18 18 M18 6 L15.1 8.9 M8.9 15.1 L6 18'}
        stroke="#38bdf8"
        strokeWidth="1.4"
        fill="none"
      />
      <circle cx="12" cy="12" r="4.6" fill="#0ea5e9" />
      <circle cx="12" cy="12" r="2.1" fill="#e0f2fe" stroke="none" />
      <path d="M5.9 7.6 A8.1 8.1 0 0 1 12.6 3.9" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.8" fill="none" />
      <path d="M18.7 17.2 A9 9 0 0 1 6.4 18.4 A9 9 0 0 0 18.7 17.2 Z" {...SOMBRA} />
    </>
  ),

  // MUÑEQUERAS DE GRAVEDAD: el puño de tela visto por su boca (por eso se ve el
  // hueco) con la pesa cosida al frente y sus surcos.
  pesas: (
    <>
      <path d="M3.4 9.4 H20.6 V16.2 A2.4 2.4 0 0 1 18.2 18.6 H5.8 A2.4 2.4 0 0 1 3.4 16.2 Z" fill="#b91c1c" />
      <ellipse cx="12" cy="9.4" rx="8.6" ry="2.8" fill="#ef4444" />
      <ellipse cx="12" cy="9.4" rx="5.4" ry="1.5" fill="#450a0a" />
      {/* Puntadas: sin ellas el puño de tela se leía como un cubo. */}
      <path d="M4.6 16.2 H8 M16 16.2 H19.4" stroke="#fca5a5" strokeWidth="1" strokeDasharray="1.4 1.2" fill="none" />
      <path d="M9 11.6 H15 A1 1 0 0 1 16 12.6 V15.6 A1 1 0 0 1 15 16.6 H9 A1 1 0 0 1 8 15.6 V12.6 A1 1 0 0 1 9 11.6 Z" fill="#334155" />
      <path d="M9.9 13.3 H14.1 M9.9 15 H14.1" stroke="#94a3b8" strokeWidth="1" fill="none" />
      <path d="M4 11 C4.6 10.2 5.6 9.8 6.4 9.7 L6.4 18.5 A2.4 2.4 0 0 1 4 16.2 Z" {...LUZ} />
      <path d="M17.6 9.7 C18.8 9.9 19.9 10.4 20.6 11 V16.2 A2.4 2.4 0 0 1 18.2 18.6 H17.6 Z" {...SOMBRA} />
    </>
  ),

  // ----------------------------------------------------------- uso ---

  // SEMILLA DEL ERMITAÑO: la judía verde entera, con su surco. Nada más: si se
  // le añade brillo se confunde con la de Karin.
  semilla: (
    <>
      <path d={JUDIA} fill="#22c55e" />
      <path d="M9.4 13.4 C11.6 11.4 14.2 9.2 16.6 8" stroke="#14532d" strokeWidth="1.3" fill="none" />
      <path d="M7.6 8.8 C9.6 7 12.2 5.6 14.8 5.1 C12.2 4.6 9.6 5.4 7.6 6.8 Z" {...LUZ} />
      <path d="M6.4 16.6 C8.4 18.2 12 18 15.4 15.8 C18.2 14.1 20.2 11.6 21 9.2 C21.4 12.3 19 15.4 15.4 17.4 C11.4 19.6 7.6 18.7 6.4 16.6 Z" {...SOMBRA} />
    </>
  ),

  // SEMILLA PARTIDA: la misma judía CORTADA. El canto plano y pálido es todo lo
  // que hace falta para leer «media», sin escribirlo.
  semilla_media: (
    <>
      {/* La MISMA silueta que la entera, ABIERTA: la carne pálida del interior
          ocupa el centro y solo queda el canto verde alrededor. Probé a dibujar
          medio trozo suelto y se leía como una hoja; partida por la mitad y con
          las dos a la vista, la pareja se entiende sola. La cara interior es la
          misma curva escalada desde el centro, así que encaja siempre. */}
      <path d={JUDIA} fill="#16a34a" />
      <path
        d={JUDIA}
        fill="#bbf7d0"
        strokeWidth={1.6}
        transform="translate(12.7 10.6) scale(0.66) translate(-12.7 -10.6)"
      />
      <path d="M10 12.8 C11.8 11.2 13.8 9.6 15.6 8.6" stroke="#4ade80" strokeWidth="1.2" fill="none" />
      <path d="M6.4 16.6 C8.4 18.2 12 18 15.4 15.8 C18.2 14.1 20.2 11.6 21 9.2 C21.4 12.3 19 15.4 15.4 17.4 C11.4 19.6 7.6 18.7 6.4 16.6 Z" {...SOMBRA} />
    </>
  ),

  // ELIXIR DE KI: matraz de cristal con el líquido azul y sus burbujas. El azul
  // es el mismo `KI_COLOR` con el que se pinta la barra de ki.
  elixir: (
    <>
      <path d="M9.7 2 H14.3 A0.8 0.8 0 0 1 15.1 2.8 V4.2 H8.9 V2.8 A0.8 0.8 0 0 1 9.7 2 Z" fill="#a16207" />
      <path d="M10.2 4.2 H13.8 V7 H10.2 Z" fill="#cbd5e1" />
      <path d="M10.2 6.6 L6.6 12.9 C5 15.9 7.2 21.2 12 21.2 C16.8 21.2 19 15.9 17.4 12.9 L13.8 6.6 Z" fill="#e2e8f0" fillOpacity="0.35" />
      <path
        d="M7.4 13.4 C9 12.4 10.9 14.1 12.6 13.2 C14 12.5 15.6 13 16.6 13.4 C18.1 16.3 16.2 20.3 12 20.3 C7.8 20.3 5.9 16.3 7.4 13.4 Z"
        fill="#0ea5e9"
      />
      <circle cx="10.2" cy="16.4" r="1" fill="#7dd3fc" stroke="none" />
      <circle cx="13.6" cy="18" r="0.7" fill="#7dd3fc" stroke="none" />
      <path d="M9.6 14.8 C8.7 16.6 9 18.5 10.4 19.6" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.5" fill="none" />
    </>
  ),

  // AGUA SAGRADA: la calabaza-cantimplora del templo de Karin, con su tapón, su
  // cordel y la gota grabada en la panza para que no haya duda de qué lleva.
  agua: (
    <>
      <path d="M10.4 1.8 H13.6 A0.8 0.8 0 0 1 14.4 2.6 V4.4 H9.6 V2.6 A0.8 0.8 0 0 1 10.4 1.8 Z" fill="#78350f" />
      <path
        d={'M12 4.2 C10.1 4.2 8.9 5.5 8.9 7.1 C8.9 8.3 9.4 9.1 9.4 9.9 C9.4 10.9 8.1 11.4 6.9 12.6 '
          + 'C5.5 14 4.7 15.8 4.7 17.4 C4.7 19.8 7.9 21.4 12 21.4 C16.1 21.4 19.3 19.8 19.3 17.4 '
          + 'C19.3 15.8 18.5 14 17.1 12.6 C15.9 11.4 14.6 10.9 14.6 9.9 C14.6 9.1 15.1 8.3 15.1 7.1 '
          + 'C15.1 5.5 13.9 4.2 12 4.2 Z'}
        fill="#d6a34a"
      />
      <path d="M8.7 9.5 H15.3 A1 1 0 0 1 16.3 10.5 V11 A1 1 0 0 1 15.3 12 H8.7 A1 1 0 0 1 7.7 11 V10.5 A1 1 0 0 1 8.7 9.5 Z" fill="#f59e0b" />
      <path d="M12 13.8 C13.7 15.6 14.7 16.8 14.7 18 A2.7 2.7 0 0 1 9.3 18 C9.3 16.8 10.3 15.6 12 13.8 Z" fill="#38bdf8" />
      <path d="M10.3 5.4 C9.5 6 9.2 6.9 9.4 8 C8.6 7 8.9 5.8 10.3 5.4 Z" {...LUZ} />
      <path d="M17.1 12.6 C18.5 14 19.3 15.8 19.3 17.4 C19.3 19.8 16.1 21.4 12 21.4 L12 19.6 C15.6 19.6 17.9 18.4 17.9 16.6 C17.9 15.3 17.6 13.9 17.1 12.6 Z" {...SOMBRA} />
    </>
  ),

  // JUDÍA DE KARIN: la misma silueta que la semilla pero DORADA y con destello.
  // La que levanta a un caído tenía que verse como la buena de verdad.
  revivir: (
    <>
      <path d={JUDIA} fill="#f59e0b" />
      <path d="M9.4 13.4 C11.6 11.4 14.2 9.2 16.6 8" stroke="#92400e" strokeWidth="1.3" fill="none" />
      <path d="M7.6 8.8 C9.6 7 12.2 5.6 14.8 5.1 C12.2 4.6 9.6 5.4 7.6 6.8 Z" fill="#fde68a" stroke="none" />
      <path d="M6.4 16.6 C8.4 18.2 12 18 15.4 15.8 C18.2 14.1 20.2 11.6 21 9.2 C21.4 12.3 19 15.4 15.4 17.4 C11.4 19.6 7.6 18.7 6.4 16.6 Z" {...SOMBRA} />
      <path d="M18.6 2 L19.5 4.5 L22 5.4 L19.5 6.3 L18.6 8.8 L17.7 6.3 L15.2 5.4 L17.7 4.5 Z" fill="#fef3c7" />
    </>
  ),

  // CAÍDA para objetos futuros sin arte: una bolsa cerrada con su cordel. Es
  // decorosa, encaja con la colección y no miente sobre lo que hay dentro.
  __generico: (
    <>
      <path d="M9.6 8.2 L10.4 4.6 M14.4 8.2 L13.6 4.6" stroke="#64748b" strokeWidth="1.6" fill="none" />
      <path d="M12 7.4 C16.6 7.4 20.2 11.4 20.2 15.4 C20.2 18.8 16.5 21.2 12 21.2 C7.5 21.2 3.8 18.8 3.8 15.4 C3.8 11.4 7.4 7.4 12 7.4 Z" fill="#475569" />
      <path d="M6.2 11.4 C9 12.9 15 12.9 17.8 11.4" stroke="#f59e0b" strokeWidth="1.6" fill="none" />
      <circle cx="12" cy="13" r="1.5" fill="#f59e0b" />
      <path d="M8.8 9.4 C6.6 11 5.3 13.2 5.3 15.4 C5.3 17 6.1 18.3 7.4 19.2 C5.2 18.4 3.8 17 3.8 15.4 C3.8 12.9 5.7 10.4 8.8 9.4 Z" {...LUZ} />
      <path d="M12 7.4 C16.6 7.4 20.2 11.4 20.2 15.4 C20.2 18.8 16.5 21.2 12 21.2 Z" {...SOMBRA} />
    </>
  ),
}

/**
 * EL ICONO de un objeto del modo Dragon Ball. Se pide por `id`; si ese id no
 * tiene dibujo (un objeto que se añada mañana) cae a la bolsa genérica, así que
 * nunca queda un hueco en la ficha, la bolsa ni la tienda.
 */
export function ItemArt({ id, className = 'w-6 h-6' }: { id: string; className?: string }) {
  const nombre = getItem(id)?.name
  return (
    <svg
      viewBox="0 0 24 24"
      className={`inline-block shrink-0 ${className}`}
      role="img"
      aria-label={nombre ?? 'Objeto'}
    >
      {nombre && <title>{nombre}</title>}
      {/* El contorno y las uniones redondeadas se ponen UNA vez, aquí: así
          ningún dibujo puede salirse de la gramática por descuido. */}
      <g stroke={INK} strokeWidth={1.1} strokeLinejoin="round" strokeLinecap="round">
        {ARTE[id] ?? ARTE.__generico}
      </g>
    </svg>
  )
}

export default ItemArt
