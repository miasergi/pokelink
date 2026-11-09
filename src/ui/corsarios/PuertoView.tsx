// El puerto: encargos del día, Mar Abierto, bodega de botín, récords y
// opciones. Más las piezas superpuestas que usan todas las vistas: escenas de
// historia y el aviso efímero.
import { useEffect, useMemo, useState } from 'react'
import { useCorsarios, type Escena } from '@/state/corsariosStore'
import { getPirata, PIRATAS, RAREZA_INFO } from '@/data/corsarios/piratas'
import { FINAL, INTRO_ISLA, TUTORIAL } from '@/data/corsarios/historia'
import { VENTA } from '@/data/corsarios/equipo'
import { imagenPieza, nombrePieza } from '@/data/corsarios/mods'
import { ISLAS } from '@/data/corsarios/islas'
import {
  campanaTerminada, diarioHoy, ENCARGOS, encargoListo, INVENTARIO_MAX, pisoActual, poderEquipo,
  portadorDe, unidadesAliadas, unidadesMar,
} from '@/engine/corsarios/game'
import type { Pieza, Rareza } from '@/engine/corsarios/types'
import PirateFace from './PirateFace'
import { Boton, ClaseChip, Doblon, fmt, Perla } from './Bits'

export default function PuertoView() {
  const { save } = useCorsarios()
  if (!save) return null
  return (
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-3 pb-4 flex flex-col gap-3">
      <Encargos />
      <MarAbierto />
      <Bodega />
      <Mods />
      <Records />
      <Opciones />
    </div>
  )
}

function Tarjeta({ titulo, color = '#94a3b8', children, extra }: { titulo: string; color?: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-wide" style={{ color }}>{titulo}</span>
        {extra}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function Encargos() {
  const { save, cobrarEncargo } = useCorsarios()
  if (!save) return null
  const d = diarioHoy(save)
  return (
    <Tarjeta titulo="Encargos del día" color="#fbbf24" extra={<span className="text-[10.5px] font-bold text-slate-500">Se renuevan cada día</span>}>
      <div className="flex flex-col gap-2">
        {ENCARGOS.map((e, k) => {
          const hecho = Math.min(e.meta, d[e.campo])
          const cobrado = d.cobrados.includes(k)
          return (
            <div key={k} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className={`text-[12.5px] font-bold ${cobrado ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{e.texto}</div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-amber-400" style={{ width: `${(hecho / e.meta) * 100}%` }} />
                </div>
              </div>
              <Boton tono={e.perlas ? 'perla' : 'oro'} disabled={!encargoListo(save, k)} onClick={() => cobrarEncargo(k)} className="!px-2.5 !py-1.5 shrink-0">
                {cobrado ? 'Hecho' : (
                  <span className="inline-flex items-center gap-1">
                    {e.perlas ? <><Perla />{e.perlas}</> : <><Doblon />{fmt(e.doblones ?? 0)}</>}
                  </span>
                )}
              </Boton>
            </div>
          )
        })}
      </div>
    </Tarjeta>
  )
}

function MarAbierto() {
  const { save, abordarMar } = useCorsarios()
  const piso = save ? pisoActual(save) : 1
  const rivales = useMemo(() => unidadesMar(piso), [piso])
  if (!save) return null
  const abierto = campanaTerminada(save)
  const mio = poderEquipo(unidadesAliadas(save))
  const suyo = poderEquipo(rivales)
  return (
    <div className="rounded-2xl border p-3 relative overflow-hidden"
      style={{ borderColor: '#0ea5e955', background: 'radial-gradient(120% 90% at 100% 0%, #0ea5e933, transparent 60%), #0f172acc' }}>
      <div className="text-[11px] font-black uppercase tracking-wide text-sky-300">Mar Abierto</div>
      {!abierto ? (
        <div className="mt-1 text-[12px] text-slate-400 leading-snug">
          Más allá del mapa hay aguas donde nunca se acaban los rivales. Se abren al vencer al Almirante Hierro.
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between">
            <div className="text-[19px] font-black text-slate-50">Piso {piso}</div>
            <div className="text-[11px] font-bold text-slate-400">Récord: <b className="text-sky-300">{save.marPiso}</b></div>
          </div>
          <div className="text-[11px] text-slate-400">
            Cada 5 pisos, un jefe y <span className="text-fuchsia-200 font-bold">60 perlas</span> (15 en los demás). Tu poder <b className="text-amber-300">{fmt(mio)}</b> · rivales <b className="text-rose-300">{fmt(suyo)}</b>
          </div>
          <div className="mt-2 flex gap-1.5">
            {rivales.map((u) => (
              <div key={u.uid} className="flex flex-col items-center w-14">
                <PirateFace look={u.look} rareza={u.rareza} size={40} />
                <ClaseChip clase={u.clase} corto />
              </div>
            ))}
          </div>
          <Boton className="w-full mt-2.5" tono={piso % 5 === 0 ? 'rojo' : 'oro'} onClick={abordarMar}>Zarpar al piso {piso}</Boton>
        </>
      )}
    </div>
  )
}

const ORDEN: Rareza[] = ['L', 'E', 'R', 'C']

function Bodega() {
  const { save, vender, venderSobrantes } = useCorsarios()
  const [abierta, setAbierta] = useState(false)
  if (!save) return null
  const piezas = [...save.inventario].sort((a, b) => ORDEN.indexOf(a.rareza) - ORDEN.indexOf(b.rareza) || a.tipo.localeCompare(b.tipo))
  return (
    <Tarjeta titulo={`Bodega · ${save.inventario.length}/${INVENTARIO_MAX}`} color="#a78bfa"
      extra={piezas.length > 0 && <button onClick={() => setAbierta((v) => !v)} className="text-[11px] font-black text-slate-300">{abierta ? 'Ocultar' : 'Ver todo'}</button>}>
      {piezas.length === 0 ? (
        <div className="text-[12px] text-slate-400">Vacía. Los combates sueltan armas y amuletos; los jefes, siempre. Se equipan desde la ficha de cada pirata.</div>
      ) : (
        <>
          <div className="text-[11.5px] text-slate-400">
            {(['C', 'R', 'E', 'L'] as Rareza[]).map((r) => `${save.inventario.filter((p) => p.rareza === r).length} ${RAREZA_INFO[r].nombre.toLowerCase()}`).join(' · ')}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Boton tono="gris" className="!text-[10.5px]" onClick={() => venderSobrantes('C')}>Vender comunes libres</Boton>
            <Boton tono="gris" className="!text-[10.5px]" onClick={() => venderSobrantes('R')}>Vender raros y peores</Boton>
          </div>
          {abierta && (
            <div className="mt-2 flex flex-col gap-1.5">
              {piezas.map((p) => {
                const quien = portadorDe(save, p.uid)
                return (
                  <div key={p.uid} className="flex items-center gap-2 rounded-xl bg-slate-800/60 px-2 py-1.5">
                    <IconoPieza p={p} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-bold text-slate-100 truncate">{nombrePieza(p)}</div>
                      <div className="text-[10.5px] text-slate-400">{textoBonus(p)}{quien && <> · lo lleva <b className="text-amber-200">{quien === 'capitan' ? save.capitan.nombre : getPirata(quien).nombre}</b></>}</div>
                    </div>
                    <button onClick={() => vender(p.uid)} className="shrink-0 flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-black text-amber-300 active:scale-95">
                      <Doblon />{VENTA[p.rareza]}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </Tarjeta>
  )
}

export const textoBonus = (p: Pieza) => p.tipo === 'arma' ? `+${Math.round(p.bonus * 100)}% ataque` : `+${Math.round(p.bonus * 100)}% vida y defensa`

export function IconoPieza({ p, size = 32 }: { p: Pieza; size?: number }) {
  const c = RAREZA_INFO[p.rareza].color
  const img = imagenPieza(p)
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className="shrink-0" aria-hidden>
      <defs><clipPath id={`ip-${p.uid}`}><rect x="2" y="2" width="28" height="28" rx="7" /></clipPath></defs>
      <rect x="1" y="1" width="30" height="30" rx="8" fill={`${c}22`} stroke={c} strokeWidth="2" />
      {img ? <image href={img} x="2" y="2" width="28" height="28" preserveAspectRatio="xMidYMid slice" clipPath={`url(#ip-${p.uid})`} />
      : p.tipo === 'arma'
        ? <g><path d="M9 23 L21 8 L24 8 L24 11 L12 26 Z" fill="#e2e8f0" /><path d="M8 20 L15 27 M7 26 L10 23" stroke={c} strokeWidth="2.5" strokeLinecap="round" /></g>
        : <g><path d="M10 7 Q16 13 22 7" fill="none" stroke="#e2e8f0" strokeWidth="1.6" /><circle cx="16" cy="19" r="6.5" fill={c} stroke="#e2e8f0" strokeWidth="1.6" /><circle cx="14" cy="17" r="1.8" fill="#fff" opacity=".8" /></g>}
    </svg>
  )
}

function Mods() {
  const { mods, modActivo, irA } = useCorsarios()
  const activo = mods.find((m) => m.id === modActivo)
  return (
    <div className="rounded-2xl border border-violet-500/40 p-3"
      style={{ background: 'radial-gradient(120% 90% at 0% 0%, #8b5cf633, transparent 60%), #0f172acc' }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-wide text-violet-300">Mods</span>
        <span className="text-[10.5px] font-bold text-slate-400">{mods.length} guardado{mods.length === 1 ? '' : 's'}</span>
      </div>
      <div className="mt-1 text-[12px] text-slate-300 leading-snug">
        {activo ? <>Activo: <b className="text-violet-200">{activo.nombre}</b></> : 'Personaliza retratos, nombres, especiales, objetos e islas con tus propios packs.'}
      </div>
      <Boton tono="perla" className="w-full mt-2.5" onClick={() => irA('mods')}>Abrir el editor de mods</Boton>
    </div>
  )
}

function Records() {
  const { save } = useCorsarios()
  if (!save) return null
  const estrellas = Object.values(save.estrellas).reduce((a, b) => a + b, 0)
  const filas: [string, string][] = [
    ['Combates', fmt(save.combates)],
    ['Victorias', fmt(save.victorias)],
    ['Estrellas', `${estrellas}/${ISLAS.length * 12}`],
    ['Colección', `${save.tripulacion.length}/${PIRATAS.length}`],
    ['Mar Abierto', save.marPiso ? `piso ${save.marPiso}` : '—'],
    ['En el mar desde', new Date(save.creado).toLocaleDateString('es-ES')],
  ]
  return (
    <Tarjeta titulo="Cuaderno de bitácora" color="#38bdf8">
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {filas.map(([k, v]) => (
          <div key={k} className="flex justify-between text-[12px]"><span className="text-slate-400">{k}</span><b className="text-slate-100">{v}</b></div>
        ))}
      </div>
    </Tarjeta>
  )
}

function Opciones() {
  const { save, verEscena, borrarPartida } = useCorsarios()
  const [confirmar, setConfirmar] = useState(false)
  if (!save) return null
  return (
    <Tarjeta titulo="Opciones" color="#94a3b8">
      <div className="grid grid-cols-2 gap-2">
        <Boton tono="gris" onClick={() => verEscena({ tipo: 'tuto' })}>Cómo se juega</Boton>
        {save.vistos.includes('fin') ? <Boton tono="gris" onClick={() => verEscena({ tipo: 'fin' })}>Ver el final</Boton> : <span />}
      </div>
      {!confirmar ? (
        <button onClick={() => setConfirmar(true)} className="mt-3 text-[11.5px] font-bold text-rose-400">Empezar de cero…</button>
      ) : (
        <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-950/40 p-2.5">
          <div className="text-[12px] text-rose-100">Se borra tu capitán, la tripulación, el botín y todo el progreso. No se puede deshacer.</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Boton tono="gris" onClick={() => setConfirmar(false)}>Cancelar</Boton>
            <Boton tono="rojo" onClick={() => { void borrarPartida() }}>Borrar todo</Boton>
          </div>
        </div>
      )}
    </Tarjeta>
  )
}

// ------------------------------------------------------------- SUPERPUESTOS
/** Escenas de historia: páginas de texto que se pasan tocando. */
export function EscenaOverlay() {
  const { escena, cerrarEscena, save } = useCorsarios()
  const [pagina, setPagina] = useState(0)
  useEffect(() => { setPagina(0) }, [escena])
  if (!escena || !save) return null
  const paginas = paginasDe(escena)
  const p = paginas[Math.min(pagina, paginas.length - 1)]
  const ultima = pagina >= paginas.length - 1
  const jefe = escena.tipo === 'isla' ? PIRATAS.find((d) => d.desbloqueaIsla === escena.isla) : escena.tipo === 'fin' ? getPirata('hierro') : null
  const color = escena.tipo === 'isla' ? ISLAS[escena.isla].color : escena.tipo === 'fin' ? '#fbbf24' : '#f59e0b'
  return (
    <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm grid place-items-center p-4"
      onClick={() => (ultima ? cerrarEscena() : setPagina((n) => n + 1))}>
      <div key={pagina} className="w-full max-w-sm rounded-3xl border p-5 animate-pop-in"
        style={{ borderColor: `${color}66`, background: `radial-gradient(120% 70% at 50% 0%, ${color}26, transparent 60%), #0b1220` }}>
        <div className="text-[10.5px] font-black uppercase tracking-[0.25em]" style={{ color }}>
          {escena.tipo === 'tuto' ? `Cómo se juega · ${pagina + 1}/${paginas.length}` : escena.tipo === 'fin' ? 'Fin de la campaña' : `Isla ${escena.isla + 1}`}
        </div>
        <div className="mt-1 text-[20px] font-black text-slate-50 leading-tight">{p.titulo}</div>
        {jefe && pagina === paginas.length - 1 && (
          <div className="mt-3 flex justify-center"><PirateFace look={jefe.look} rareza={jefe.rareza} size={84} /></div>
        )}
        <div className="mt-3 flex flex-col gap-2.5">
          {p.lineas.map((l, k) => <p key={k} className="text-[13.5px] text-slate-200 leading-relaxed">{l}</p>)}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1">
            {paginas.length > 1 && paginas.map((_, k) => <span key={k} className={`w-1.5 h-1.5 rounded-full ${k === pagina ? 'bg-amber-300' : 'bg-slate-600'}`} />)}
          </div>
          <span className="text-[11.5px] font-black uppercase tracking-wide text-amber-300">{ultima ? (escena.tipo === 'fin' ? 'Al Mar Abierto' : '¡Adelante!') : 'Seguir'}</span>
        </div>
      </div>
    </div>
  )
}

function paginasDe(e: Escena) {
  if (e.tipo === 'tuto') return TUTORIAL
  if (e.tipo === 'fin') return [FINAL]
  return [INTRO_ISLA[e.isla]]
}

/** Aviso efímero (saqueos, ventas…). */
export function Aviso() {
  const { aviso, limpiarAviso } = useCorsarios()
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(limpiarAviso, 3600)
    return () => clearTimeout(t)
  }, [aviso, limpiarAviso])
  if (!aviso) return null
  return (
    <div className="absolute left-3 right-3 bottom-20 z-30 pointer-events-none">
      <div className="mx-auto max-w-sm rounded-xl bg-slate-900/95 px-3 py-2 text-[12.5px] text-center font-bold text-slate-100 animate-pop-in"
        style={{ boxShadow: '0 0 0 1px #fbbf2455, 0 8px 24px #00000088' }}>
        {aviso}
      </div>
    </div>
  )
}
