// DESPEDIDA DE ÓSCAR — hub de la sección. Aislada del resto de la app (patrón
// La Previa / Cyber): estado propio en localStorage y solo toca `gameStore`
// para volver a Inicio.
//
// Tres pestañas y nada más: qué toca AHORA, los retos y las cajas. Todo lo de
// organizar (modo juez, tele, invitación) vive en el menú, que es donde no
// estorba mientras estáis jugando.
import { useEffect, useState } from 'react'
import { useGame } from '@/state/gameStore'
import { useDespedida } from '@/state/despedidaStore'
import Icon from '@/ui/components/Icon'
import { play } from '@/utils/sfx'
import { DespedidaHeader, FONDO } from '@/ui/despedida/despedidaKit'
import AgendaView from '@/ui/despedida/AgendaView'
import RetosView from '@/ui/despedida/RetosView'
import RecompensasView from '@/ui/despedida/RecompensasView'
import InvitacionView from '@/ui/despedida/InvitacionView'
import OverlayView from '@/ui/despedida/OverlayView'
import Celebracion from '@/ui/despedida/Celebracion'

type Tab = 'directo' | 'retos' | 'premios' | 'invitacion'

const TABS: Array<{ id: Tab; icon: string; label: string }> = [
  { id: 'directo', icon: 'bolt', label: 'Directo' },
  { id: 'retos', icon: 'target', label: 'Retos' },
  { id: 'premios', icon: 'gift', label: 'Premios' },
]

export default function DespedidaScreen() {
  const { navigate } = useGame()
  const { juez, salirJuez } = useDespedida()
  const puntos = useDespedida((s) => s.puntos())
  const [tab, setTab] = useState<Tab>('directo')
  const [bloqueDestacado, setBloqueDestacado] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const [pin, setPin] = useState(false)
  const [tele, setTele] = useState(false)

  // Mientras la tele está puesta, la pantalla no debe apagarse. Si el navegador
  // no soporta wakeLock (o lo deniega), simplemente no pasa nada.
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

  const irARetos = (bloqueId: string) => {
    setBloqueDestacado(bloqueId)
    setTab('retos')
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 relative" style={{ background: FONDO }}>
      <DespedidaHeader
        titulo={tab === 'invitacion' ? '📜 La invitación' : '🌙 Despedida de Óscar'}
        onBack={() => (tab === 'invitacion' ? setTab('directo') : navigate('home'))}
        right={
          <div className="flex items-center gap-1.5">
            <span className="rounded-full border border-pink-500/40 bg-pink-500/15 px-2.5 py-1 text-[11px] font-black tabular-nums text-pink-200">
              {puntos}
            </span>
            <button
              onClick={() => { play('tap'); setMenu(true) }}
              className="shrink-0 w-9 h-9 grid place-items-center rounded-full border border-slate-700 bg-slate-800/80 text-slate-300 active:scale-95 transition"
              aria-label="Menú de la despedida"
            >
              <Icon name="gear" className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {tab === 'directo' && <AgendaView onIrARetos={irARetos} />}
      {tab === 'retos' && <RetosView bloqueDestacado={bloqueDestacado} />}
      {tab === 'premios' && <RecompensasView />}
      {tab === 'invitacion' && <InvitacionView />}

      {/* Barra de pestañas: siempre a mano con el pulgar. */}
      {tab !== 'invitacion' && (
        <div className="absolute bottom-0 inset-x-0 z-20 border-t border-slate-800 bg-slate-950/90 backdrop-blur-md">
          <div className="max-w-md mx-auto flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => { play('tap'); setTab(t.id); if (t.id !== 'retos') setBloqueDestacado(null) }}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] transition ${
                  tab === t.id ? 'text-pink-300' : 'text-slate-500'
                }`}
              >
                <Icon name={t.icon} className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-wider">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {menu && (
        <MenuSheet
          juez={juez}
          onCerrar={() => setMenu(false)}
          onJuez={() => { setMenu(false); if (juez) salirJuez(); else setPin(true) }}
          onTele={() => { setMenu(false); setTele(true) }}
          onInvitacion={() => { setMenu(false); setTab('invitacion') }}
        />
      )}
      {pin && <PinModal onCerrar={() => setPin(false)} />}
      <Celebracion />
    </div>
  )
}

function MenuSheet({ juez, onCerrar, onJuez, onTele, onInvitacion }: {
  juez: boolean
  onCerrar: () => void
  onJuez: () => void
  onTele: () => void
  onInvitacion: () => void
}) {
  const reiniciar = useDespedida((s) => s.reiniciar)
  const [confirmar, setConfirmar] = useState(false)

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-slate-950/70 backdrop-blur-sm animate-fade-in" onClick={onCerrar}>
      <div
        className="w-full max-w-md mx-auto rounded-t-3xl border-t border-x border-slate-700 bg-slate-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-2 animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mb-1" />

        <Opcion
          icon="scales"
          titulo={juez ? 'Salir del modo juez' : 'Entrar como juez'}
          desc={juez ? 'Este móvil deja de poder tocar los puntos.' : 'Para quien lleva el marcador. Pide PIN.'}
          activo={juez}
          onClick={onJuez}
        />
        <Opcion icon="weather" titulo="Modo tele / directo" desc="Pantalla grande para el salón o el OBS." onClick={onTele} />
        <Opcion icon="scroll" titulo="La invitación de Óscar" desc="El aviso de raid, listo para mandárselo." onClick={onInvitacion} />

        {juez && (
          confirmar ? (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3">
              <div className="text-[12px] font-bold text-rose-200 mb-2">¿Seguro? Se borran todos los puntos y el historial.</div>
              <div className="flex gap-2">
                <button onClick={() => setConfirmar(false)} className="flex-1 rounded-xl border border-slate-700 py-2 text-[12px] font-bold text-slate-300 active:scale-95 transition">
                  No
                </button>
                <button
                  onClick={() => { play('error'); reiniciar(); setConfirmar(false); onCerrar() }}
                  className="flex-1 rounded-xl bg-rose-500 py-2 text-[12px] font-black text-slate-950 active:scale-95 transition"
                >
                  Borrar todo
                </button>
              </div>
            </div>
          ) : (
            <Opcion icon="refresh" titulo="Reiniciar el marcador" desc="Volver a cero. Para las pruebas de antes del día." onClick={() => setConfirmar(true)} />
          )
        )}

        <button onClick={onCerrar} className="mt-1 rounded-2xl border border-slate-700 py-3 text-[13px] font-bold text-slate-300 active:scale-[0.98] transition">
          Cerrar
        </button>
      </div>
    </div>
  )
}

function Opcion({ icon, titulo, desc, activo, onClick }: {
  icon: string
  titulo: string
  desc: string
  activo?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={() => { play('tap'); onClick() }}
      className={`w-full flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left active:scale-[0.98] transition ${
        activo ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-slate-700 bg-slate-800/60'
      }`}
    >
      <Icon name={icon} className={`w-5 h-5 shrink-0 ${activo ? 'text-emerald-300' : 'text-slate-400'}`} />
      <span className="min-w-0">
        <span className={`block text-[13px] font-black ${activo ? 'text-emerald-200' : 'text-slate-100'}`}>{titulo}</span>
        <span className="block text-[11px] text-slate-400 leading-snug">{desc}</span>
      </span>
    </button>
  )
}

function PinModal({ onCerrar }: { onCerrar: () => void }) {
  const entrarJuez = useDespedida((s) => s.entrarJuez)
  const [valor, setValor] = useState('')
  const [error, setError] = useState(false)

  const enviar = () => {
    if (entrarJuez(valor)) { play('confirm'); onCerrar(); return }
    play('error')
    setError(true)
    setValor('')
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in" onClick={onCerrar}>
      <div className="w-full max-w-xs rounded-3xl border border-slate-700 bg-slate-900 p-5 animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="text-center text-[13px] font-black text-slate-100">PIN del juez</div>
        <p className="text-center text-[11px] text-slate-400 mt-1 leading-snug">
          Lo tienen los organizadores. Óscar no debería poder darse puntos solo.
        </p>
        <input
          value={valor}
          onChange={(e) => { setValor(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(false) }}
          onKeyDown={(e) => { if (e.key === 'Enter') enviar() }}
          inputMode="numeric"
          autoFocus
          placeholder="····"
          className={`mt-4 w-full rounded-2xl bg-slate-950 border px-4 py-3 text-center text-2xl font-black tracking-[0.5em] text-slate-100 outline-none ${
            error ? 'border-rose-500 animate-shake' : 'border-slate-700 focus:border-pink-500/60'
          }`}
        />
        <div className="flex gap-2 mt-4">
          <button onClick={onCerrar} className="flex-1 rounded-2xl border border-slate-700 py-2.5 text-[12px] font-bold text-slate-300 active:scale-95 transition">
            Cancelar
          </button>
          <button onClick={enviar} className="flex-[1.4] rounded-2xl bg-pink-500 py-2.5 text-[12px] font-black text-slate-950 active:scale-95 transition">
            Entrar
          </button>
        </div>
      </div>
    </div>
  )
}
