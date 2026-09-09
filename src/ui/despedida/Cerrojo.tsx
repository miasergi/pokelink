// EL CERROJO. Hasta que empiece la despedida, el sitio no se abre.
//
// Lo decidió el grupo: «que sepa lo justo». Óscar recibe la invitación con
// días de antelación —y la cuenta atrás es media gracia— pero el programa, el
// marcador y las cajas no aparecen hasta el sábado a las diez. Si los viera
// antes, el sábado ya no le sorprende nada.
//
// La puerta trasera es el PIN del juez: los organizadores tienen que poder
// entrar a preparar, mirar las cajas en modo organizador y probar el panel.
// Está a la vista pero en pequeño, que es justo lo contrario de lo que mira
// alguien que acaba de llegar por el enlace.
import { useState } from 'react'
import { useGame } from '@/state/gameStore'
import { useDespedida } from '@/state/despedidaStore'
import { play } from '@/utils/sfx'
import { ARRANQUE, Antetitulo, FILETE, LIMA, NEGRO, cuentaAtras, useAhora } from './despedidaKit'

export default function Cerrojo() {
  const { navigate } = useGame()
  const entrarJuez = useDespedida((s) => s.entrarJuez)
  const ahora = useAhora()
  const cuenta = cuentaAtras(ahora, ARRANQUE)
  const [pidiendoPin, setPidiendoPin] = useState(false)
  const [valor, setValor] = useState('')
  const [error, setError] = useState(false)

  const enviar = () => {
    if (entrarJuez(valor)) { play('confirm'); return }
    play('error')
    setError(true)
    setValor('')
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar font-festui" style={{ background: NEGRO }}>
      <div className="relative min-h-full grid place-items-center px-5 py-16">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[60vh] pointer-events-none"
          style={{ background: `radial-gradient(50% 55% at 50% 30%, ${LIMA}1A, transparent 70%)` }}
        />

        <div className="relative w-full max-w-xl text-center">
          <Candado />

          <Antetitulo color={LIMA} className="mt-8">Acceso cerrado</Antetitulo>
          <h1 className="font-fest uppercase text-white text-[13vw] sm:text-6xl leading-[0.9] mt-4">
            Todavía no
          </h1>
          <p className="text-[14px] sm:text-base text-zinc-400 mt-5 leading-relaxed">
            Esto se abre el sábado 12 a las 10:00, cuando la banda entre por la
            puerta. Ni un minuto antes.
          </p>

          <div className="grid grid-cols-4 gap-2 sm:gap-3 mt-9">
            {[
              { v: cuenta.dias, e: 'días' },
              { v: cuenta.horas, e: 'horas' },
              { v: cuenta.minutos, e: 'min' },
              { v: cuenta.segundos, e: 'seg' },
            ].map((c) => (
              <div key={c.e} className="border py-4 sm:py-5" style={{ borderColor: FILETE, background: '#0C0C10' }}>
                <div className="font-fest text-[9vw] sm:text-5xl leading-none tabular-nums text-white">
                  {String(c.v).padStart(2, '0')}
                </div>
                <div className="text-[9px] font-bold uppercase tracking-[0.26em] text-zinc-600 mt-1.5">{c.e}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => { play('back'); navigate('invitacion') }}
            className="mt-10 text-[11px] font-bold uppercase tracking-[0.2em] px-7 py-4 border text-white transition hover:bg-white/5"
            style={{ borderColor: FILETE }}
          >
            Volver a la invitación
          </button>

          {/* La puerta de los organizadores */}
          <div className="mt-14 pt-8 border-t" style={{ borderColor: FILETE }}>
            {pidiendoPin ? (
              <div className="max-w-xs mx-auto">
                <Antetitulo>PIN de la organización</Antetitulo>
                <input
                  value={valor}
                  onChange={(e) => { setValor(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(false) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') enviar() }}
                  inputMode="numeric"
                  autoFocus
                  placeholder="····"
                  className={`mt-3 w-full border px-4 py-3.5 text-center font-fest text-3xl tracking-[0.4em] text-white outline-none ${error ? 'animate-shake' : ''}`}
                  style={{ borderColor: error ? '#FF3D57' : FILETE, background: NEGRO }}
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { setPidiendoPin(false); setValor(''); setError(false) }}
                    className="flex-1 text-[11px] font-bold uppercase tracking-[0.16em] py-3 border text-zinc-400"
                    style={{ borderColor: FILETE }}
                  >
                    Dejarlo
                  </button>
                  <button
                    onClick={enviar}
                    className="flex-[1.4] text-[11px] font-bold uppercase tracking-[0.16em] py-3"
                    style={{ background: LIMA, color: NEGRO }}
                  >
                    Entrar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { play('tap'); setPidiendoPin(true) }}
                className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-zinc-700 hover:text-zinc-400 transition"
              >
                Soy de la organización
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Candado() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-16 h-16 mx-auto"
      fill="none"
      stroke={LIMA}
      strokeWidth="1.4"
      strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 24px ${LIMA}55)` }}
    >
      <rect x="4.5" y="10" width="15" height="11" rx="1.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
      <circle cx="12" cy="15.5" r="1.4" fill={LIMA} stroke="none" />
    </svg>
  )
}
