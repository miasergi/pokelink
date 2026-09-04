// DESPEDIDA DE ÓSCAR — landing del evento.
//
// Comparte dominio con la sala de juegos y nada más: ni tipografía, ni paleta,
// ni forma. Aquí no hay pestañas ni tarjetas redondeadas; hay una página que
// se recorre de arriba abajo, como el sitio de cualquier evento.
//
// Lo funcional (marcar retos) vive en el PANEL DEL JUEZ, fuera de la página:
// así esto se le puede enseñar a cualquiera sin miedo a que toque el marcador,
// y el que lleva los puntos tiene una herramienta rápida en vez de un
// escaparate.
import { useEffect, useRef, useState } from 'react'
import { useGame } from '@/state/gameStore'
import { useDespedida } from '@/state/despedidaStore'
import { play } from '@/utils/sfx'
import { Antetitulo, FILETE, LIMA, NEGRO, irA } from '@/ui/despedida/despedidaKit'
import HeroSection from '@/ui/despedida/HeroSection'
import ProgramaSection from '@/ui/despedida/ProgramaSection'
import MarcadorSection from '@/ui/despedida/MarcadorSection'
import RetosSection from '@/ui/despedida/RetosSection'
import PremiosSection from '@/ui/despedida/PremiosSection'
import InvitacionSection from '@/ui/despedida/InvitacionSection'
import PanelJuez from '@/ui/despedida/PanelJuez'
import OverlayView from '@/ui/despedida/OverlayView'
import Celebracion from '@/ui/despedida/Celebracion'

const ENLACES = [
  { id: 'programa', rotulo: 'Programa' },
  { id: 'marcador', rotulo: 'Marcador' },
  { id: 'retos', rotulo: 'Retos' },
  { id: 'premios', rotulo: 'Premios' },
  { id: 'invitacion', rotulo: 'Invitación' },
]

export default function DespedidaScreen() {
  const { navigate } = useGame()
  const juez = useDespedida((s) => s.juez)
  const puntos = useDespedida((s) => s.puntos())
  const [menu, setMenu] = useState(false)
  const [pin, setPin] = useState(false)
  const [panel, setPanel] = useState(false)
  const [tele, setTele] = useState(false)
  const [scrolleado, setScrolleado] = useState(false)
  const scroller = useRef<HTMLDivElement | null>(null)

  // El shell de la app encierra todo en 560 px. Una landing de evento necesita
  // el ancho entero, así que mientras esta pantalla está montada se lo quita.
  useEffect(() => {
    const root = document.getElementById('root')
    root?.classList.add('root-ancho')
    return () => root?.classList.remove('root-ancho')
  }, [])

  // Mientras la tele está puesta, la pantalla no debe apagarse.
  useEffect(() => {
    if (!tele) return
    let sentinel: WakeLockSentinel | null = null
    let vivo = true
    void navigator.wakeLock?.request('screen').then((s) => {
      if (!vivo) { void s.release(); return }
      sentinel = s
    }).catch(() => { /* sin wake lock: se apagará la pantalla y ya está */ })
    return () => { vivo = false; void sentinel?.release().catch(() => {}) }
  }, [tele])

  if (tele) {
    return (
      <>
        <OverlayView onSalir={() => setTele(false)} />
        <Celebracion />
      </>
    )
  }

  const abrirPanel = () => {
    if (juez) { setPanel(true); return }
    setPin(true)
  }

  return (
    <div
      ref={scroller}
      onScroll={(e) => setScrolleado(e.currentTarget.scrollTop > 40)}
      className="flex-1 min-h-0 overflow-y-auto no-scrollbar"
      style={{ background: NEGRO }}
    >
      {/* --- Nav fija --- */}
      <nav
        className="fixed top-0 inset-x-0 z-30 transition-colors duration-300"
        style={{
          background: scrolleado ? 'rgba(8,8,10,.92)' : 'transparent',
          borderBottom: `1px solid ${scrolleado ? FILETE : 'transparent'}`,
          backdropFilter: scrolleado ? 'blur(10px)' : undefined,
        }}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-14 h-14 sm:h-16 flex items-center gap-6">
          <button
            onClick={() => { play('tap'); scroller.current?.scrollTo({ top: 0, behavior: 'smooth' }) }}
            className="font-fest uppercase text-white text-lg sm:text-xl leading-none tracking-wide shrink-0"
          >
            Óscar<span style={{ color: LIMA }}>26</span>
          </button>

          <div className="hidden md:flex items-center gap-7 flex-1">
            {ENLACES.map((e) => (
              <button
                key={e.id}
                onClick={() => irA(e.id)}
                className="font-festui text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition"
              >
                {e.rotulo}
              </button>
            ))}
          </div>

          <div className="flex-1 md:flex-none" />

          <span
            className="font-festui text-[11px] font-bold tabular-nums px-2.5 py-1.5 border shrink-0"
            style={{ color: LIMA, borderColor: `${LIMA}44` }}
          >
            {puntos} pts
          </span>

          <button
            onClick={() => { play('tap'); setMenu(true) }}
            className="shrink-0 w-9 h-9 grid place-items-center border text-zinc-300 active:scale-95 transition"
            style={{ borderColor: FILETE }}
            aria-label="Menú"
          >
            <span className="block w-4 space-y-1">
              <span className="block h-px bg-current" />
              <span className="block h-px bg-current" />
              <span className="block h-px bg-current" />
            </span>
          </button>
        </div>
      </nav>

      <HeroSection />
      <ProgramaSection />
      <MarcadorSection />
      <RetosSection />
      <PremiosSection />
      <InvitacionSection />

      {/* --- Pie --- */}
      <footer className="border-t px-5 sm:px-8 lg:px-14 py-12" style={{ borderColor: FILETE }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-8">
          <div>
            <div className="font-fest uppercase text-white text-4xl sm:text-5xl leading-none">
              Óscar<span style={{ color: LIMA }}>26</span>
            </div>
            <p className="font-festui text-[12.5px] text-zinc-600 mt-3 max-w-sm leading-relaxed">
              12 y 13 de septiembre de 2026. Ocho amigos, dos días y una lista de retos.
              Hecho por la cuadrilla, para una sola persona.
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-3">
            <button
              onClick={() => { play('back'); navigate('home') }}
              className="font-festui text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-600 hover:text-zinc-300 transition"
            >
              ← Volver a la sala de juegos
            </button>
          </div>
        </div>
      </footer>

      {/* Botón flotante del juez: solo aparece si este móvil ya lo es. Para el
          resto, la puerta está en el menú y pide PIN. */}
      {juez && !panel && (
        <button
          onClick={() => { play('confirm'); setPanel(true) }}
          className="fixed bottom-5 right-5 z-30 font-festui text-[11px] font-bold uppercase tracking-[0.2em] px-5 py-4 shadow-2xl active:scale-95 transition"
          style={{ background: LIMA, color: NEGRO }}
        >
          Panel del juez
        </button>
      )}

      {menu && (
        <MenuSheet
          juez={juez}
          onCerrar={() => setMenu(false)}
          onIr={(id) => { setMenu(false); irA(id) }}
          onPanel={() => { setMenu(false); abrirPanel() }}
          onTele={() => { setMenu(false); setTele(true) }}
          onInicio={() => { setMenu(false); navigate('home') }}
        />
      )}
      {pin && <PinModal onCerrar={() => setPin(false)} onEntrar={() => { setPin(false); setPanel(true) }} />}
      {panel && <PanelJuez onCerrar={() => setPanel(false)} />}
      <Celebracion />
    </div>
  )
}

/** Menú a pantalla completa: navegación en móvil + accesos de organización. */
function MenuSheet({ juez, onCerrar, onIr, onPanel, onTele, onInicio }: {
  juez: boolean
  onCerrar: () => void
  onIr: (id: string) => void
  onPanel: () => void
  onTele: () => void
  onInicio: () => void
}) {
  const reiniciar = useDespedida((s) => s.reiniciar)
  const [confirmar, setConfirmar] = useState(false)

  return (
    <div className="fixed inset-0 z-40 flex flex-col animate-fade-in" style={{ background: 'rgba(8,8,10,.97)' }}>
      <div className="shrink-0 safe-top border-b" style={{ borderColor: FILETE }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-14 h-14 sm:h-16 flex items-center justify-between">
          <span className="font-fest uppercase text-white text-lg leading-none">Menú</span>
          <button
            onClick={() => { play('back'); onCerrar() }}
            className="w-9 h-9 grid place-items-center border text-zinc-300 active:scale-95 transition"
            style={{ borderColor: FILETE }}
            aria-label="Cerrar el menú"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 sm:px-8 lg:px-14 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="border-t" style={{ borderColor: FILETE }}>
            {ENLACES.map((e, i) => (
              <button
                key={e.id}
                onClick={() => { play('tap'); onIr(e.id) }}
                className="w-full flex items-baseline gap-5 py-5 border-b text-left group"
                style={{ borderColor: FILETE }}
              >
                <span className="font-festui text-[11px] font-bold tabular-nums" style={{ color: LIMA }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-fest uppercase text-white text-4xl sm:text-5xl leading-none group-hover:opacity-70 transition">
                  {e.rotulo}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-10">
            <Antetitulo>Organización</Antetitulo>
            <div className="grid sm:grid-cols-2 gap-px mt-4" style={{ background: FILETE }}>
              <Opcion
                titulo={juez ? 'Panel del juez' : 'Entrar como juez'}
                desc={juez ? 'Marcar retos y dar puntos.' : 'Para quien lleva el marcador. Pide PIN.'}
                onClick={onPanel}
                destacado={juez}
              />
              <Opcion titulo="Modo tele" desc="Pantalla grande para el salón o el OBS." onClick={onTele} />
              <Opcion titulo="Sala de juegos" desc="Volver al resto de la web." onClick={onInicio} />
              {juez && (
                confirmar ? (
                  <div className="p-5" style={{ background: '#150A0D' }}>
                    <p className="font-festui text-[12.5px] text-zinc-300 leading-snug">
                      Se borran todos los puntos y el historial. ¿Seguro?
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => setConfirmar(false)}
                        className="flex-1 font-festui text-[11px] font-bold uppercase tracking-[0.16em] py-3 border text-zinc-400"
                        style={{ borderColor: FILETE }}
                      >
                        No
                      </button>
                      <button
                        onClick={() => { play('error'); reiniciar(); setConfirmar(false); onCerrar() }}
                        className="flex-1 font-festui text-[11px] font-bold uppercase tracking-[0.16em] py-3"
                        style={{ background: '#FF3D57', color: NEGRO }}
                      >
                        Borrar
                      </button>
                    </div>
                  </div>
                ) : (
                  <Opcion titulo="Reiniciar el marcador" desc="Volver a cero. Para las pruebas de antes del día." onClick={() => setConfirmar(true)} />
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Opcion({ titulo, desc, onClick, destacado }: {
  titulo: string
  desc: string
  onClick: () => void
  destacado?: boolean
}) {
  return (
    <button
      onClick={() => { play('tap'); onClick() }}
      className="p-5 text-left transition hover:brightness-125"
      style={{ background: destacado ? `${LIMA}0F` : '#0B0B0E' }}
    >
      <div className="font-festui text-[14px] font-bold" style={{ color: destacado ? LIMA : '#FFFFFF' }}>{titulo}</div>
      <div className="font-festui text-[12px] text-zinc-500 mt-1 leading-snug">{desc}</div>
    </button>
  )
}

function PinModal({ onCerrar, onEntrar }: { onCerrar: () => void; onEntrar: () => void }) {
  const entrarJuez = useDespedida((s) => s.entrarJuez)
  const [valor, setValor] = useState('')
  const [error, setError] = useState(false)

  const enviar = () => {
    if (entrarJuez(valor)) { play('confirm'); onEntrar(); return }
    play('error')
    setError(true)
    setValor('')
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-6 animate-fade-in" style={{ background: 'rgba(8,8,10,.94)' }} onClick={onCerrar}>
      <div className="w-full max-w-sm border p-6" style={{ borderColor: FILETE, background: '#0B0B0E' }} onClick={(e) => e.stopPropagation()}>
        <Antetitulo color={LIMA}>Acceso restringido</Antetitulo>
        <h3 className="font-fest uppercase text-white text-4xl leading-none mt-3">PIN del juez</h3>
        <p className="font-festui text-[12.5px] text-zinc-500 mt-3 leading-relaxed">
          Lo tienen los organizadores. Óscar no debería poder darse puntos solo.
        </p>
        <input
          value={valor}
          onChange={(e) => { setValor(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(false) }}
          onKeyDown={(e) => { if (e.key === 'Enter') enviar() }}
          inputMode="numeric"
          autoFocus
          placeholder="····"
          className={`mt-5 w-full border px-4 py-4 text-center font-fest text-4xl tracking-[0.4em] text-white outline-none ${error ? 'animate-shake' : ''}`}
          style={{ borderColor: error ? '#FF3D57' : FILETE, background: NEGRO }}
        />
        <div className="flex gap-2 mt-5">
          <button
            onClick={onCerrar}
            className="flex-1 font-festui text-[11px] font-bold uppercase tracking-[0.18em] py-3.5 border text-zinc-400"
            style={{ borderColor: FILETE }}
          >
            Cancelar
          </button>
          <button
            onClick={enviar}
            className="flex-[1.4] font-festui text-[11px] font-bold uppercase tracking-[0.18em] py-3.5"
            style={{ background: LIMA, color: NEGRO }}
          >
            Entrar
          </button>
        </div>
      </div>
    </div>
  )
}
