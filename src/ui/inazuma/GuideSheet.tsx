// LA GUÍA del modo: qué es cada número y cada palabra. Se abre desde la
// cabecera (el «?») y desde los ajustes.
//
// Existe porque en los playtests las mismas dudas salieron una y otra vez:
// «¿qué son los PT?», «¿por qué sube de nivel el banquillo?», «¿qué diferencia
// hay entre estrellas y nivel?». El tutorial de bienvenida pasa una vez y se
// olvida; esto queda a un toque de distancia, siempre.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import Icon from '@/ui/components/Icon'
import { Pic } from '@/ui/inazuma/Glyphs'

interface Section {
  icon: string
  /** true si `icon` es una imagen (Pic) y no un SVG. */
  pic?: boolean
  title: string
  body: React.ReactNode
}

const B = ({ children }: { children: React.ReactNode }) => <b className="text-slate-100">{children}</b>

const SECTIONS: Section[] = [
  {
    icon: 'ball',
    title: 'Cómo se gesta un gol',
    body: (
      <>
        Una posesión son <B>tres eslabones</B>: salida de balón → tres cuartos → área. Cada eslabón es un
        duelo (regate contra bloqueo; en el área, disparo contra parada) y cada duelo se resuelve con los
        <B> atributos</B> de los dos jugadores, su <B>técnica</B> (si la pagan), el <B>elemento</B> (bosque
        &gt; montaña &gt; fuego &gt; viento &gt; bosque), el <B>aguante</B> y una pizca de azar — las
        probabilidad de cada opción es esa cuenta ya hecha (actívala en ajustes con «Mostrar
        porcentajes»). Los puntos del campo se encienden con cada eslabón
        ganado: tres puntos y «¡OCASIÓN DE GOL!» significa disparo a puerta. Y ojo: <B>pasar NO es un
        duelo</B> — el pase llega siempre, cambia el emparejamiento de elementos y el que recibe juega el
        duelo con sus propias técnicas.
      </>
    ),
  },
  {
    icon: 'star',
    title: 'Rareza — Normal, Avanzado, Ídolo y Legendario',
    body: (
      <>
        El COLOR de la carta de cada jugador: gris (Normal), morado (Avanzado), oro (Ídolo) y multicolor (Legendario). Sube sus <B>atributos</B>,
        alarga su <B>cadena</B> (1, 2, 3 o 4 supertécnicas — cada paso lleva el borde de la rareza que lo
        abre) y en <B>multicolor</B> despierta su Espíritu Guerrero (con nivel 30). CUALQUIERA puede llegar
        al máximo: se empieza con todo Normales y se sube con <B>Medallas de talento</B> (3 por partido, 1
        por traspaso, también en tiendas) — y tras cada pachanga, UNO de los que la jugaron sube solo, con
        su pantalla. Los rivales van nivelados con la eliminatoria.
      </>
    ),
  },
  {
    icon: 'bolt',
    title: 'PT — la gasolina de las supertécnicas',
    body: (
      <>
        Cada jugador tiene su depósito de <B>PT</B> (la barra azul). Lanzar una supertécnica cuesta los PT
        que pone en su ficha; sin saldo, solo queda la jugada sencilla. Se recuperan en el <B>Rai Rai</B>,
        con bebidas, en el descanso del partido y un poco al superar cada instituto. El tamaño del depósito
        depende del <B>aguante</B> del jugador.
      </>
    ),
  },
  {
    icon: 'tired',
    title: 'Aguante — el desgaste',
    body: (
      <>
        La barra verde (0-100). Jugar partidos y pachangas desgasta; por debajo del <B>40 %</B> el jugador
        rinde peor en TODOS los duelos. Se recupera comiendo, descansando en el Rai Rai y rotando: los
        suplentes llegan frescos.
      </>
    ),
  },
  {
    icon: 'sparkle',
    title: 'Ruptura — la barra del partido',
    body: (
      <>
        La barra fina de la parte de arriba del partido. Se llena encadenando jugadas ganadas y se gasta de
        una de dos maneras, una vez llena: <B>Supervibración</B> (tres acciones seguidas gratis y con
        potencia extra) o <B>Espíritu Guerrero</B> (un único duelo demoledor). El espíritu <B>se despierta
        al nivel 30</B>: al principio del torneo nadie lo tiene disponible.
      </>
    ),
  },
  {
    icon: 'chartUp',
    title: 'Nivel — lo que se entrena',
    body: (
      <>
        Escala los atributos del jugador. Sube al ganar: <B>pachangas</B> (las juega TU ONCE, el mismo que
        alineas en el vestuario: los once suben entero, p. ej. +3) y <B>partidos oficiales</B> (+6 si
        ganas, +4 si empatas, +3 aunque pierdas), más algunas <B>situaciones</B>. El <B>banquillo sube un
        nivel menos</B> que el once en todo — por eso ves subidas distintas al volver al vestuario.
      </>
    ),
  },
  {
    icon: 'bolt',
    title: 'Supertécnicas — se gastan y se eligen',
    body: (
      <>
        Cada una es de una clase (<B>tiro, regate, bloqueo o parada</B>) y de un elemento. Solo puede
        usarlas quien juegue en la demarcación de esa clase, y solo puede <B>aprenderlas</B> quien comparta
        además elemento. Se consiguen en el mapa, en la tienda y sobre todo…
      </>
    ),
  },
  {
    icon: 'node-firma2',
    pic: true,
    title: 'Cadenas — SU técnica, en orden',
    body: (
      <>
        Cada jugador tiene su <B>cadena característica</B>: las técnicas que puede despertar, en orden
        (Mark Evans: Mano Celestial → Mano Infinita → Mano Demoníaca). Se despiertan <B>solas por
        nivel</B> — el 1.º paso al nivel 10, el 2.º al 25, el 3.º al 45 — y ANTES de tiempo en las
        casillas de <B>Supertécnica Especial</B> o con el Manual avanzado. La cadena se ve en la ficha de
        cada jugador, con lo pendiente en gris y su nivel de despertar.
      </>
    ),
  },
  {
    icon: 'people',
    title: 'Técnicas combinadas — de dos o tres',
    body: (
      <>
        Tornado de Dragón (Axel + Kevin), Inazuma Break (Mark + Axel + Jude), Zona Mortal (Jude + David)…
        Hacen falta <B>las dos cosas</B>: que un miembro haya <B>despertado la técnica en su cadena</B> y
        que TODOS los miembros estén sobre el campo. Entonces aparece como opción extra en la jugada, con
        bono de potencia.
      </>
    ),
  },
  {
    icon: 'fire',
    title: 'Elementos — el ciclo',
    body: (
      <>
        Fuego ▶ Bosque ▶ Aire ▶ Montaña ▶ Fuego. Cada uno vence al siguiente (×1.35) y pierde contra el
        anterior (×0.78). No hay elemento dominante: la ventaja está en elegir quién juega y a quién le
        pasas el balón.
      </>
    ),
  },
]

export function GuideButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 grid place-items-center w-8 h-8 rounded-lg border border-slate-700 bg-slate-800/60 text-slate-300 active:scale-95 transition"
        title="Guía"
      >
        <Icon name="lifebuoy" className="w-4 h-4" />
      </button>
      {open && <GuideSheet onClose={() => setOpen(false)} />}
    </>
  )
}

export default function GuideSheet({ onClose }: { onClose: () => void }) {
  // Portal a <body>: el backdrop-filter de la cabecera rompería el `fixed`.
  return createPortal(
    <div className="fixed inset-0 z-[95]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md max-h-[86svh] overflow-y-auto rounded-t-3xl border-t border-x border-slate-700 bg-slate-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <Icon name="lifebuoy" className="w-5 h-5 text-amber-300" />
          <h2 className="font-extrabold">Cómo funciona</h2>
          <button className="ml-auto text-slate-500" onClick={onClose}>
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {SECTIONS.map((s) => (
            <div key={s.title} className="rounded-xl border border-slate-700/70 bg-slate-800/40 p-3">
              <div className="flex items-center gap-2 mb-1">
                {s.pic
                  ? <Pic name={s.icon} className="w-4 h-4" />
                  : <Icon name={s.icon} className="w-4 h-4 text-amber-300" />}
                <div className="text-[13px] font-extrabold">{s.title}</div>
              </div>
              <p className="text-[12px] text-slate-400 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
