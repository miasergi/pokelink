// LA INVITACIÓN. Es lo único de la sección pensado para que lo vea ÓSCAR antes
// del día: un aviso de raid a su propia casa. Se le manda el enlace y ya está
// avisado (a su manera).
import { useState } from 'react'
import Icon from '@/ui/components/Icon'
import { play } from '@/utils/sfx'

const REQUISITOS = [
  { emoji: '🐕', texto: 'Deshazte de mujeres y mascotas antes del asalto' },
  { emoji: '🖥️', texto: 'Dos PCs encendidos y el OBS listo para el directo' },
  { emoji: '🎧', texto: 'Discord abierto: la banda entra por ahí' },
  { emoji: '📅', texto: 'Sin planes hasta el domingo por la tarde' },
  { emoji: '🫡', texto: 'Obediencia. Ya no mandas en tu casa' },
]

/** Enlace directo a la sección, para pegarlo en el grupo. */
function enlace(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}${import.meta.env.BASE_URL}#/despedidaOscar`
}

export default function InvitacionView() {
  const [copiado, setCopiado] = useState(false)

  const compartir = async () => {
    play('confirm')
    const url = enlace()
    const texto = 'ELFIA 12 VA A SER RAIDEADO. Sábado 12 de septiembre, 10:00. Preséntate.'
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Despedida de Óscar', text: texto, url })
        return
      }
      await navigator.clipboard.writeText(`${texto} ${url}`)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      /* el usuario ha cancelado el diálogo de compartir: sin ruido */
    }
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-24 pt-4 max-w-md w-full mx-auto">
      <div
        className="relative rounded-3xl border border-pink-500/40 overflow-hidden"
        style={{
          background: 'linear-gradient(165deg, rgba(244,114,182,.18), rgba(56,189,248,.10) 45%, rgba(2,6,23,.92))',
          boxShadow: '0 30px 60px -35px #f472b6',
        }}
      >
        {/* Sello superior */}
        <div className="border-b border-pink-500/25 px-5 py-3 text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-pink-300">Aviso de raid</div>
        </div>

        <div className="px-5 py-6 text-center">
          <div className="text-5xl animate-float">🌙</div>
          <h1 className="mt-4 text-[26px] font-black leading-tight text-slate-100">
            El servidor <span className="text-pink-300">Elfia 12</span><br />va a ser raideado
          </h1>
          <p className="mt-3 text-[13px] text-slate-300 leading-snug">
            Una banda de ocho ha marcado tu casa como objetivo. No hay forma de cancelarlo:
            te casas y esto va incluido en el paquete.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 text-left">
            <Dato icono="calendar" titulo="Inicio" valor="Sáb 12 sept · 10:00" />
            <Dato icono="timer" titulo="Duración" valor="Hasta el domingo" />
            <Dato icono="people" titulo="Banda" valor="8 asaltantes" />
            <Dato icono="map" titulo="Zona" valor="Tu propio salón" />
          </div>

          <div className="mt-5 text-left">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mb-2">Requisitos de entrada</div>
            <div className="flex flex-col gap-1.5">
              {REQUISITOS.map((r) => (
                <div key={r.texto} className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2">
                  <span className="shrink-0 text-base leading-none mt-0.5">{r.emoji}</span>
                  <span className="text-[12px] text-slate-300 leading-snug">{r.texto}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-left">
            <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300 mb-1">Botín garantizado</div>
            <div className="text-[12.5px] text-amber-100 leading-snug">
              Un disfraz. Y no lo vas a elegir tú.
            </div>
          </div>

          <p className="mt-5 text-[11px] text-slate-500 italic leading-snug">
            Habrá directo, marcador y premios que se desbloquean. Todo lo que hagas suma puntos.
            Lo que no hagas, también.
          </p>
        </div>
      </div>

      <button
        onClick={compartir}
        className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-pink-500 py-3.5 text-[14px] font-black text-slate-950 active:scale-[0.98] transition"
      >
        <Icon name="share" className="w-4 h-4" />
        {copiado ? '¡Enlace copiado!' : 'Enviar la invitación'}
      </button>
      <p className="mt-2 text-[11px] text-slate-500 text-center leading-snug">
        Se comparte el enlace de esta sección: quien lo abra ve el horario y el marcador en directo.
      </p>
    </div>
  )
}

function Dato({ icono, titulo, valor }: { icono: 'calendar' | 'timer' | 'people' | 'map'; titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
        <Icon name={icono} className="w-3 h-3" /> {titulo}
      </div>
      <div className="text-[12px] font-bold text-slate-200 mt-0.5">{valor}</div>
    </div>
  )
}
