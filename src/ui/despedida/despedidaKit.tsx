// Piezas compartidas de la DESPEDIDA: reloj vivo, cabecera, marcador y
// chapas. Todo lo visual de la sección sale de aquí para que el móvil, la tele
// y la invitación se vean como la misma cosa.
import { useEffect, useState } from 'react'
import Icon from '@/ui/components/Icon'
import { play } from '@/utils/sfx'
import { BLOQUES, PUNTOS_MAXIMOS, RECOMPENSAS, type Bloque } from '@/data/despedida'
import { proximaRecompensa } from '@/state/despedidaStore'

/** Color de la sección (el rosa "Sailor" manda en toda la despedida). */
export const ROSA = '#f472b6'
export const FONDO = 'radial-gradient(85% 55% at 80% -10%, #f472b62e, transparent 55%), radial-gradient(75% 55% at 0% 105%, #38bdf824, transparent 60%), #080c18'

/**
 * Hora actual, refrescada sola. El horario es el corazón de la pantalla: si no
 * se mueve solo, alguien tiene que recargar y nadie lo va a hacer con el
 * Valorant abierto.
 */
export function useAhora(intervaloMs = 20_000): Date {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), intervaloMs)
    return () => clearInterval(t)
  }, [intervaloMs])
  return ahora
}

export function DespedidaHeader({ onBack, right, titulo }: {
  onBack: () => void
  right?: React.ReactNode
  titulo: string
}) {
  return (
    <div className="safe-top sticky top-0 z-20 bg-slate-950/85 backdrop-blur-md border-b border-slate-800">
      <div className="flex items-center justify-between px-3 h-12 gap-2">
        <button
          onClick={() => { play('back'); onBack() }}
          className="shrink-0 w-9 h-9 grid place-items-center rounded-full border border-slate-700 bg-slate-800/80 text-slate-300 active:scale-95 transition"
          aria-label="Volver"
        >
          <Icon name="arrowRight" className="w-4 h-4 rotate-180" />
        </button>
        <div className="flex-1 text-center font-extrabold tracking-wide truncate">{titulo}</div>
        <div className="shrink-0 min-w-9 flex justify-end">{right}</div>
      </div>
    </div>
  )
}

/** 'HH:MM' de un Date, con dos dígitos. */
export function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** "1 h 20 min" / "12 min" — para cuentas atrás legibles de un vistazo. */
export function duracion(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60_000))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

/**
 * EL MARCADOR. Puntos grandes + barra hasta la siguiente recompensa (no hasta
 * el máximo: lo que motiva es "me faltan 12 para abrir la caja", no "voy por
 * el 31 % del total").
 */
export function Marcador({ puntos, compacto = false }: { puntos: number; compacto?: boolean }) {
  const proxima = proximaRecompensa(puntos)
  const anterior = [...RECOMPENSAS].reverse().find((r) => puntos >= r.umbral)
  const desde = anterior?.umbral ?? 0
  const hasta = proxima?.umbral ?? PUNTOS_MAXIMOS
  const pct = hasta > desde ? Math.min(100, Math.max(0, ((puntos - desde) / (hasta - desde)) * 100)) : 100

  return (
    <div className="rounded-3xl border border-pink-500/30 bg-slate-900/70 p-4" style={{ boxShadow: `0 20px 40px -28px ${ROSA}` }}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">Puntos de Óscar</div>
          <div className={`font-black leading-none tabular-nums ${compacto ? 'text-4xl' : 'text-6xl'}`} style={{ color: ROSA, textShadow: `0 6px 26px ${ROSA}66` }}>
            {puntos}
          </div>
        </div>
        <div className="text-right shrink-0">
          {proxima ? (
            <>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Siguiente premio</div>
              <div className="text-2xl font-black text-amber-300 tabular-nums">{Math.max(0, proxima.umbral - puntos)}</div>
              <div className="text-[10px] text-slate-400 font-bold -mt-0.5">puntos</div>
            </>
          ) : (
            <div className="text-[11px] font-black text-emerald-300 uppercase tracking-widest">Todo<br />desbloqueado</div>
          )}
        </div>
      </div>

      <div className="mt-3 h-2.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${ROSA}, #fbbf24)` }}
        />
      </div>
      {proxima && !compacto && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
          <Icon name="lock" className="w-3.5 h-3.5 shrink-0 text-slate-500" />
          <span className="truncate italic">{proxima.pista}</span>
        </div>
      )}
    </div>
  )
}

/** Chapa de estado de un bloque en la agenda. */
export function EstadoChip({ estado }: { estado: 'pasado' | 'ahora' | 'futuro' }) {
  if (estado === 'ahora') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-400/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-300">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" /> En directo
      </span>
    )
  }
  if (estado === 'pasado') {
    return <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Hecho</span>
  }
  return <span className="rounded-full bg-slate-800/60 border border-slate-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Pendiente</span>
}

/** Lista de participantes de un bloque, con Óscar destacado. */
export function Participantes({ nombres }: { nombres: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {nombres.map((n) => (
        <span
          key={n}
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
            n === 'Óscar'
              ? 'border-pink-400/50 bg-pink-500/15 text-pink-200'
              : 'border-slate-700 bg-slate-800/70 text-slate-300'
          }`}
        >
          {n}
        </span>
      ))}
    </div>
  )
}

/**
 * Estado de un bloque respecto al reloj. Si el juez ha FIJADO un bloque (porque
 * el horario se ha ido de madre, que se irá), manda el orden del guion y no la
 * hora: lo anterior al fijado es pasado y lo posterior, futuro.
 */
export function estadoDe(b: Bloque, ahora: Date, fijado: string | null, rango: { desde: Date; hasta: Date }): 'pasado' | 'ahora' | 'futuro' {
  if (fijado) {
    const i = BLOQUES.findIndex((x) => x.id === b.id)
    const j = BLOQUES.findIndex((x) => x.id === fijado)
    if (i === j) return 'ahora'
    return i < j ? 'pasado' : 'futuro'
  }
  if (ahora >= rango.hasta) return 'pasado'
  if (ahora >= rango.desde) return 'ahora'
  return 'futuro'
}
