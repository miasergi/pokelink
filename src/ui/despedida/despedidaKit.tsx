// LENGUAJE VISUAL DE LA DESPEDIDA — cartel de festival, no app de juegos.
//
// La sala de juegos es redondeada, azul pizarra y de colorines. Esto es lo
// contrario a propósito: negro casi puro, UN acento de neón, titulares
// condensados en mayúsculas y filetes de un píxel. Solo comparte dominio con
// el resto de la web.
//
// Todas las piezas de la landing salen de aquí para que las seis secciones,
// el panel del juez y la tele se vean como el mismo sitio.
import { useEffect, useRef, useState } from 'react'
import { BLOQUES, rangoDe, type Bloque } from '@/data/despedida'

// ---------------------------------------------------------------- tokens

export const NEGRO = '#08080A'
export const CARBON = '#101014'
export const FILETE = '#24242C'
export const LIMA = '#D7FF3E'
/** Rojo de "en directo". Se usa con cuentagotas: si todo grita, nada grita. */
export const DIRECTO = '#FF3D57'

/** Instante en que arranca la despedida (primer bloque del sábado). */
export const ARRANQUE = rangoDe(BLOQUES[0]).desde
/** Y el final: cuando acaba el último bloque del domingo. */
export const FINAL = rangoDe(BLOQUES[BLOQUES.length - 1]).hasta

// ---------------------------------------------------------------- tiempo

/** Hora actual, refrescada sola. */
export function useAhora(intervaloMs = 1000): Date {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), intervaloMs)
    return () => clearInterval(t)
  }, [intervaloMs])
  return ahora
}

export interface CuentaAtras {
  dias: number
  horas: number
  minutos: number
  segundos: number
  /** true cuando ya ha llegado la hora. */
  llegada: boolean
}

export function cuentaAtras(ahora: Date, hasta: Date): CuentaAtras {
  const ms = hasta.getTime() - ahora.getTime()
  if (ms <= 0) return { dias: 0, horas: 0, minutos: 0, segundos: 0, llegada: true }
  const seg = Math.floor(ms / 1000)
  return {
    dias: Math.floor(seg / 86400),
    horas: Math.floor((seg % 86400) / 3600),
    minutos: Math.floor((seg % 3600) / 60),
    segundos: seg % 60,
    llegada: false,
  }
}

/** "1 h 20 min" / "12 min" — cuentas atrás legibles de un vistazo. */
export function duracion(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60_000))
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

/** Bloque en curso: manda el fijado a mano si lo hay, si no el reloj. */
export function bloqueActual(ahora: Date, fijado: string | null): Bloque | null {
  if (fijado) return BLOQUES.find((b) => b.id === fijado) ?? null
  return BLOQUES.find((b) => {
    const { desde, hasta } = rangoDe(b)
    return ahora >= desde && ahora < hasta
  }) ?? null
}

/**
 * Estado de un bloque. Con un bloque fijado manda el ORDEN del guion y no la
 * hora: si el juez retrasa la despedida, lo posterior sigue siendo futuro.
 */
export function estadoDe(b: Bloque, ahora: Date, fijado: string | null): 'pasado' | 'ahora' | 'futuro' {
  if (fijado) {
    const i = BLOQUES.findIndex((x) => x.id === b.id)
    const j = BLOQUES.findIndex((x) => x.id === fijado)
    return i === j ? 'ahora' : i < j ? 'pasado' : 'futuro'
  }
  const { desde, hasta } = rangoDe(b)
  if (ahora >= hasta) return 'pasado'
  if (ahora >= desde) return 'ahora'
  return 'futuro'
}

// ---------------------------------------------------------------- scroll

/**
 * Aparición al entrar en pantalla. Una landing sin esto se siente muerta; con
 * más de esto, mareante. Una sola vez por elemento y se acabó.
 */
export function useRevela<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { el.classList.add('visible'); return }
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target) }
        }
      },
      // OJO con el umbral: si se pide un PORCENTAJE del elemento, una sección
      // larga (la de retos mide 7.500 px) no llega a cumplirlo nunca en una
      // pantalla pequeña y se queda invisible para siempre. Con 0 basta con
      // que asome un píxel, que es lo que se quería decir.
      { rootMargin: '0px 0px -80px 0px', threshold: 0 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return ref
}

/**
 * Lleva la vista a una sección de la landing. A propósito NO usa anclas de
 * verdad: el hash está reservado para el enlace directo (#/despedidaOscar) y
 * si el nav lo pisara, copiar la URL a mitad de página dejaría de funcionar.
 */
export function irA(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ---------------------------------------------------------------- piezas

/** Etiquetita de arriba: "12–13 SEPT 2026", "EN DIRECTO"… */
export function Antetitulo({ children, color = '#8A8A94', className = '' }: {
  children: React.ReactNode
  color?: string
  className?: string
}) {
  return (
    <div
      className={`font-festui text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.34em] ${className}`}
      style={{ color }}
    >
      {children}
    </div>
  )
}

/**
 * Cabecera de sección numerada, con el filete a lo ancho. Es el patrón que
 * marca el ritmo de toda la página: número, título enorme, raya.
 */
export function Seccion({ n, titulo, apunte, id, children }: {
  n: string
  titulo: string
  apunte?: string
  id: string
  children: React.ReactNode
}) {
  const ref = useRevela<HTMLElement>()
  return (
    <section id={id} ref={ref} className="revela scroll-mt-16 px-5 sm:px-8 lg:px-14 py-14 sm:py-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-baseline gap-3 sm:gap-5">
          <span className="font-festui text-[11px] sm:text-sm font-bold tabular-nums" style={{ color: LIMA }}>{n}</span>
          <h2 className="font-fest uppercase leading-[0.85] tracking-[-0.01em] text-[13vw] sm:text-6xl lg:text-7xl text-white">
            {titulo}
          </h2>
        </div>
        {apunte && (
          <p className="font-festui text-[13px] sm:text-[15px] text-zinc-500 mt-3 max-w-xl leading-relaxed">{apunte}</p>
        )}
        <div className="h-px w-full mt-6 sm:mt-8" style={{ background: FILETE }} />
        <div className="mt-8 sm:mt-10">{children}</div>
      </div>
    </section>
  )
}

/** Botón principal: rectángulo de lima, mayúsculas, sin redondeo de app. */
export function BotonLima({ children, onClick, href, className = '' }: {
  children: React.ReactNode
  onClick?: () => void
  href?: string
  className?: string
}) {
  const clase = `inline-flex items-center justify-center gap-2 font-festui text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.18em] px-7 py-4 transition active:scale-[0.97] hover:brightness-110 ${className}`
  const estilo = { background: LIMA, color: NEGRO }
  if (href) return <a href={href} className={clase} style={estilo}>{children}</a>
  return <button onClick={onClick} className={clase} style={estilo}>{children}</button>
}

/** Botón secundario: solo contorno. */
export function BotonLinea({ children, onClick, href, className = '' }: {
  children: React.ReactNode
  onClick?: () => void
  href?: string
  className?: string
}) {
  const clase = `inline-flex items-center justify-center gap-2 font-festui text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.18em] px-7 py-4 border text-white transition active:scale-[0.97] hover:bg-white/5 ${className}`
  const estilo = { borderColor: FILETE }
  if (href) return <a href={href} className={clase} style={estilo}>{children}</a>
  return <button onClick={onClick} className={clase} style={estilo}>{children}</button>
}

/** Chapa de "EN DIRECTO" con el punto que late. */
export function ChapaDirecto({ grande = false }: { grande?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-festui font-bold uppercase tracking-[0.28em] border px-3 py-1.5 ${grande ? 'text-[12px] sm:text-sm' : 'text-[10px]'}`}
      style={{ color: DIRECTO, borderColor: `${DIRECTO}66`, background: `${DIRECTO}14` }}
    >
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: DIRECTO }} />
      En directo
    </span>
  )
}

/** Dato suelto en rejilla: cifra grande + etiqueta. */
export function Cifra({ valor, etiqueta, color = '#FFFFFF' }: { valor: React.ReactNode; etiqueta: string; color?: string }) {
  return (
    <div className="border-t pt-3" style={{ borderColor: FILETE }}>
      <div className="font-fest text-4xl sm:text-5xl leading-none tabular-nums" style={{ color }}>{valor}</div>
      <div className="font-festui text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500 mt-1.5">{etiqueta}</div>
    </div>
  )
}
