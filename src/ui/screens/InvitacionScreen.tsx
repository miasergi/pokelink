// LA INVITACIÓN — su propia página, en su propia URL.
//
// Es lo ÚNICO que recibe Óscar por WhatsApp, y por eso está separada del resto:
// si el enlace le llevara a la landing entera, en dos minutos sabría que hay
// dieciocho cajas esperándole, vería el álbum con sus propios memes y se le
// caería la sorpresa antes de empezar. Aquí solo hay un aviso de raid y un
// botón. Lo demás está detrás de ese botón.
//
// La cuenta atrás es la pieza que justifica mandarlo con días de antelación:
// cada vez que abra el enlace la ve bajar.
import { useEffect } from 'react'
import { useGame } from '@/state/gameStore'
import { play } from '@/utils/sfx'
import Marca, { type MarcaId } from '@/ui/despedida/Marcas'
import { meme, rutaMeme } from '@/data/memes'
import {
  ARRANQUE, Antetitulo, DIRECTO, FILETE, FINAL, LIMA, NEGRO,
  cuentaAtras, useAhora,
} from '@/ui/despedida/despedidaKit'

const REQUISITOS = [
  { n: '01', texto: 'Deshazte de mujeres y mascotas antes del asalto' },
  { n: '02', texto: 'Dos PCs encendidos y el OBS listo para el directo' },
  { n: '03', texto: 'Discord abierto: la banda entra por ahí' },
  { n: '04', texto: 'Sin planes hasta el domingo por la tarde' },
  { n: '05', texto: 'Obediencia. Ya no mandas en tu casa' },
]

const DATOS = [
  { k: 'Inicio', v: 'Sáb 12 · 10:00' },
  { k: 'Duración', v: 'Hasta el domingo' },
  { k: 'Banda', v: '8 asaltantes' },
  { k: 'Zona', v: 'Tu propio salón' },
]

export default function InvitacionScreen() {
  const { navigate } = useGame()
  const ahora = useAhora()
  const cuenta = cuentaAtras(ahora, ARRANQUE)
  const acabado = ahora >= FINAL
  const guiri = meme('pulgar')

  // La landing suelta el corsé de 560 px del shell y esta también: es un
  // cartel, no una columna de móvil.
  useEffect(() => {
    const root = document.getElementById('root')
    root?.classList.add('root-ancho')
    return () => root?.classList.remove('root-ancho')
  }, [])

  return (
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar font-festui" style={{ background: NEGRO }}>
      <div className="relative overflow-hidden min-h-full">
        {/* Rejilla y resplandor, como el hero del sitio */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage: `linear-gradient(${FILETE} 1px, transparent 1px), linear-gradient(90deg, ${FILETE} 1px, transparent 1px)`,
            backgroundSize: '72px 72px',
            maskImage: 'radial-gradient(75% 60% at 50% 22%, #000, transparent 78%)',
            WebkitMaskImage: 'radial-gradient(75% 60% at 50% 22%, #000, transparent 78%)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 -top-1/4 h-[70vh] pointer-events-none"
          style={{ background: `radial-gradient(50% 55% at 50% 50%, ${LIMA}22, transparent 70%)` }}
        />

        <div className="relative max-w-4xl mx-auto px-5 sm:px-10 py-14 sm:py-20">
          <div className="flex items-baseline justify-between gap-4">
            <Antetitulo color={LIMA}>Aviso de raid</Antetitulo>
            <span className="font-fest uppercase text-white text-xl sm:text-2xl leading-none">
              Óscar<span style={{ color: LIMA }}>26</span>
            </span>
          </div>

          <h1 className="font-fest uppercase text-white leading-[0.9] mt-7 text-[15vw] sm:text-7xl lg:text-8xl">
            El servidor
            <br />
            <span style={{ color: LIMA }}>Elfia 12</span>
            <br />
            va a caer
          </h1>

          <p className="text-[15px] sm:text-lg text-zinc-400 mt-6 leading-relaxed max-w-2xl">
            Una banda de ocho ha marcado tu casa como objetivo. No hay forma de
            cancelarlo: te casas, y esto va incluido en el paquete.
          </p>

          {/* --- La cuenta atrás: el motivo de mandar esto con antelación --- */}
          <div className="mt-10 sm:mt-12">
            {acabado ? (
              <div className="border p-6" style={{ borderColor: FILETE, background: '#0C0C10' }}>
                <Antetitulo color={LIMA}>Se acabó</Antetitulo>
                <div className="font-fest uppercase text-white text-4xl sm:text-5xl leading-none mt-2">
                  Sobreviviste
                </div>
              </div>
            ) : cuenta.llegada ? (
              <div className="border p-6 sm:p-8" style={{ borderColor: `${DIRECTO}55`, background: `${DIRECTO}0D` }}>
                <span
                  className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em]"
                  style={{ color: DIRECTO }}
                >
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: DIRECTO }} />
                  Está pasando ahora
                </span>
                <div className="font-fest uppercase text-white text-4xl sm:text-6xl leading-none mt-3">
                  Ya han entrado
                </div>
              </div>
            ) : (
              <>
                <Antetitulo>Empieza en</Antetitulo>
                <div className="grid grid-cols-4 gap-2 sm:gap-4 mt-3">
                  {[
                    { v: cuenta.dias, e: 'días' },
                    { v: cuenta.horas, e: 'horas' },
                    { v: cuenta.minutos, e: 'min' },
                    { v: cuenta.segundos, e: 'seg' },
                  ].map((c) => (
                    <div key={c.e} className="border px-2 py-4 sm:py-6 text-center" style={{ borderColor: FILETE, background: '#0C0C10' }}>
                      <div className="font-fest text-[11vw] sm:text-6xl leading-none tabular-nums text-white">
                        {String(c.v).padStart(2, '0')}
                      </div>
                      <div className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500 mt-2">
                        {c.e}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* --- Los datos del asalto --- */}
          <div className="grid grid-cols-2 gap-px mt-10" style={{ background: FILETE }}>
            {DATOS.map((d) => (
              <div key={d.k} className="p-4 sm:p-5" style={{ background: '#0B0B0E' }}>
                <div className="text-[9.5px] font-bold uppercase tracking-[0.24em] text-zinc-600">{d.k}</div>
                <div className="text-[15px] sm:text-lg font-bold text-white mt-1">{d.v}</div>
              </div>
            ))}
          </div>

          <div className="border-l-2 pl-5 mt-10" style={{ borderColor: LIMA }}>
            <Antetitulo color={LIMA}>Botín garantizado</Antetitulo>
            <p className="font-fest uppercase text-white text-2xl sm:text-4xl leading-none mt-2">
              Un disfraz. Y no lo eliges tú.
            </p>
          </div>

          {/* --- Requisitos --- */}
          <div className="mt-10">
            <Antetitulo>Requisitos de entrada</Antetitulo>
            <div className="mt-4 border-t" style={{ borderColor: FILETE }}>
              {REQUISITOS.map((r) => (
                <div key={r.n} className="flex items-baseline gap-5 py-4 border-b" style={{ borderColor: FILETE }}>
                  <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: LIMA }}>{r.n}</span>
                  <span className="text-[14px] sm:text-[15px] text-zinc-300 leading-snug">{r.texto}</span>
                </div>
              ))}
            </div>
          </div>

          {/* --- La puerta --- */}
          <div className="mt-12 flex flex-col sm:flex-row sm:items-center gap-6">
            <button
              onClick={() => { play('confirm'); navigate('despedida') }}
              className="inline-flex items-center justify-center gap-3 text-[13px] font-bold uppercase tracking-[0.18em] px-9 py-5 transition active:scale-[0.97] hover:brightness-110"
              style={{ background: LIMA, color: NEGRO }}
            >
              Aceptar el raid
              <Marca id={'reloj' as MarcaId} className="w-4 h-4" />
            </button>
            <p className="text-[12.5px] text-zinc-600 leading-relaxed max-w-xs">
              Detrás de ese botón está el programa, el marcador y lo que puedes
              ganar. No hay vuelta atrás.
            </p>
          </div>

          {/* El único chiste visual de la página: al final del todo. */}
          {guiri && (
            <img
              src={rutaMeme(guiri)}
              alt=""
              aria-hidden
              className="hidden sm:block absolute right-2 bottom-0 w-40 lg:w-52 pointer-events-none select-none"
              style={{
                filter: 'drop-shadow(0 20px 30px rgba(0,0,0,.6))',
                maskImage: 'linear-gradient(to bottom, #000 80%, transparent)',
                WebkitMaskImage: 'linear-gradient(to bottom, #000 80%, transparent)',
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
