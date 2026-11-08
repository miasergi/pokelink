// Vistas principales de Corsarios: cabecera, navegación, creación del capitán
// y el mapa de islas.
import { useMemo, useState } from 'react'
import { useCorsarios } from '@/state/corsariosStore'
import { capitanDef, getPirata } from '@/data/corsarios/piratas'
import { faseKey, ISLAS } from '@/data/corsarios/islas'
import {
  encargosPendientes, faseAbierta, huecos, islaAbierta, islaSuperada, poderEquipo, tiradaGratis,
  unidadesAliadas, unidadesFase, xpParaNivel, NIVEL_MAX,
} from '@/engine/corsarios/game'
import type { Clase } from '@/engine/corsarios/types'
import PirateFace from './PirateFace'
import { Boton, ClaseChip, Doblon, Estrellas, fmt, Perla, Triangulo } from './Bits'

// ----------------------------------------------------------------- CABECERA
export function Cabecera() {
  const { save, salir } = useCorsarios()
  if (!save) return null
  const pct = save.nivel >= NIVEL_MAX ? 100 : Math.round((save.xp / xpParaNivel(save.nivel)) * 100)
  return (
    <div className="shrink-0 px-3 pt-3 pb-2 safe-top flex items-center gap-2">
      <button onClick={salir} aria-label="Volver a Inicio"
        className="w-9 h-9 grid place-items-center rounded-xl bg-slate-900/80 border border-slate-700 text-slate-300 active:scale-95">
        <svg viewBox="0 0 20 20" className="w-4 h-4"><path d="M12.5 4 L6.5 10 L12.5 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[13px] font-black text-amber-200 truncate">{save.capitan.nombre}</span>
          <span className="text-[11px] font-bold text-slate-400">Nv. {save.nivel}</span>
        </div>
        <div className="h-1.5 mt-1 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5 text-[12px] font-black tabular-nums">
        <span className="flex items-center gap-1 text-amber-300"><Doblon />{fmt(save.doblones)}</span>
        <span className="flex items-center gap-1 text-fuchsia-200"><Perla />{fmt(save.perlas)}</span>
      </div>
    </div>
  )
}

// --------------------------------------------------------------- NAVEGACIÓN
export function Navegacion() {
  const { vista, irA, save } = useCorsarios()
  const gratis = save ? tiradaGratis(save) : false
  const encargos = save ? encargosPendientes(save) : 0
  const tabs = [
    { id: 'islas' as const, label: 'Islas', d: 'M3 15 Q7 11 10 15 Q13 11 17 15 M6 11 L10 4 L14 11 Z' },
    { id: 'taberna' as const, label: 'Taberna', d: 'M5 6 H13 V16 H5 Z M13 8 H15.5 Q17 8 17 10 V12 Q17 14 15.5 14 H13 M5 9 H13' },
    { id: 'tripulacion' as const, label: 'Tripulación', d: 'M7 8 A2.5 2.5 0 1 0 7 3 A2.5 2.5 0 1 0 7 8 M13 8 A2.5 2.5 0 1 0 13 3 A2.5 2.5 0 1 0 13 8 M2.5 16 Q3 10 7 10 Q11 10 11.5 16 M10 16 Q10.5 10 13 10 Q17 10 17.5 16' },
    { id: 'puerto' as const, label: 'Puerto', d: 'M10 5.5 V17 M6.5 8.5 H13.5 M4 12 Q4 17 10 17 Q16 17 16 12 M10 5.5 A1.7 1.7 0 1 1 10.01 5.5' },
  ]
  return (
    <div className="shrink-0 grid grid-cols-4 gap-1 px-2 pb-3 pt-2 safe-bottom border-t border-slate-800/80 bg-slate-950/70 backdrop-blur">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => irA(t.id)}
          className={`relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-black uppercase tracking-wide transition active:scale-95 ${vista === t.id ? 'bg-amber-400/15 text-amber-300' : 'text-slate-400'}`}>
          <svg viewBox="0 0 20 20" className="w-5 h-5"><path d={t.d} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {t.label}
          {((t.id === 'taberna' && gratis) || (t.id === 'puerto' && encargos > 0)) && <span className="absolute top-1 right-[22%] w-2 h-2 rounded-full bg-rose-500" />}
        </button>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ CAPITÁN
const OFICIOS: { clase: Exclude<Clase, 'apoyo'>; texto: string }[] = [
  { clase: 'espada', texto: 'Equilibrado y rápido. Su especial barre a todos los rivales.' },
  { clase: 'puno', texto: 'Mucha vida y defensa. Su especial aturde al rival más peligroso.' },
  { clase: 'tirador', texto: 'Pega más que nadie, pero aguanta menos. Su especial es un disparo enorme.' },
]

export function SetupView() {
  const crear = useCorsarios((s) => s.crear)
  const salir = useCorsarios((s) => s.salir)
  const [nombre, setNombre] = useState('')
  const [clase, setClase] = useState<Exclude<Clase, 'apoyo'>>('espada')
  const def = capitanDef(nombre || 'Capitán', clase)
  return (
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 py-6 safe-top safe-bottom">
      <div className="max-w-sm mx-auto flex flex-col gap-4">
        <button onClick={salir} className="self-start text-[12px] font-bold text-slate-400">← Inicio</button>
        <div className="text-center">
          <img src={`${import.meta.env.BASE_URL}corsarios/logo.svg`} alt="Corsarios" className="h-16 mx-auto" />
          <p className="mt-2 text-[13px] text-slate-300 leading-snug">
            Empiezas con un bote, un grumete y muchas ganas. Recluta piratas en la taberna, conquista las seis islas y vence al Almirante.
          </p>
        </div>
        <div className="flex justify-center"><PirateFace look={def.look} rareza="E" size={104} /></div>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Nombre del capitán</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value.slice(0, 16))} placeholder="Capitán Luis"
            className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-2.5 text-[15px] font-bold text-slate-100 outline-none focus:border-amber-400" />
        </label>
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Oficio</span>
          {OFICIOS.map((o) => (
            <button key={o.clase} onClick={() => setClase(o.clase)}
              className={`text-left rounded-xl border px-3 py-2.5 transition active:scale-[0.98] ${clase === o.clase ? 'border-amber-400 bg-amber-400/10' : 'border-slate-700 bg-slate-900/70'}`}>
              <ClaseChip clase={o.clase} />
              <div className="mt-1 text-[12px] text-slate-300 leading-snug">{o.texto}</div>
            </button>
          ))}
          <Triangulo />
        </div>
        <Boton onClick={() => crear(nombre || 'Capitán', clase)} className="py-3 text-[14px]">¡Zarpar!</Boton>
      </div>
    </div>
  )
}

// -------------------------------------------------------------------- ISLAS
const CORTO = ['Tortuga', 'Carmesí', 'Ceniza', 'Calavera', 'Niebla', 'Fortaleza']

export function IslasView() {
  const { save, islaSel, elegirIsla, abordar, saquear, verEscena } = useCorsarios()
  const miPoder = useMemo(() => (save ? poderEquipo(unidadesAliadas(save)) : 0), [save])
  if (!save) return null
  const isla = ISLAS[islaSel]
  const abierta = islaAbierta(save, islaSel)
  const totalEstrellas = Object.values(save.estrellas).reduce((a, b) => a + b, 0)
  return (
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-3 pb-4">
      {/* Carta náutica: una pastilla por isla. */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-3 px-3">
        {ISLAS.map((is, i) => {
          const ab = islaAbierta(save, i)
          const ok = islaSuperada(save, i)
          return (
            <button key={i} onClick={() => elegirIsla(i)}
              className={`shrink-0 rounded-xl border px-2.5 py-1.5 text-[11px] font-black transition active:scale-95 ${i === islaSel ? 'text-slate-950' : ab ? 'text-slate-200 bg-slate-900/80' : 'text-slate-500 bg-slate-900/50'}`}
              style={{ borderColor: ab ? `${is.color}88` : '#334155', background: i === islaSel ? is.color : undefined }}>
              {i + 1}. {ab ? CORTO[i] : '???'}{ok ? ' ✓' : ''}
            </button>
          )
        })}
      </div>

      <div className="mt-2 rounded-2xl border p-3 relative overflow-hidden"
        style={{ borderColor: `${isla.color}55`, background: `radial-gradient(120% 90% at 100% 0%, ${isla.color}30, transparent 60%), #0f172acc` }}>
        <IslaDibujo color={isla.color} />
        <div className="relative">
          <div className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: isla.color }}>Isla {islaSel + 1} de {ISLAS.length}</div>
          <div className="text-[19px] font-black text-slate-50 leading-tight">{abierta ? isla.nombre : 'Aguas desconocidas'}</div>
          {abierta && (
            <button onClick={() => verEscena({ tipo: 'isla', isla: islaSel })}
              className="absolute top-0 right-0 rounded-full bg-slate-950/60 border border-slate-600 px-2 py-0.5 text-[10px] font-black text-slate-300 active:scale-95">
              Historia
            </button>
          )}
          <div className="text-[12px] text-slate-300">{abierta ? isla.lema : `Vence al jefe de ${ISLAS[islaSel - 1]?.nombre ?? 'la isla anterior'} para llegar.`}</div>
          <div className="mt-1.5 flex items-center gap-3 text-[11px] font-bold text-slate-400">
            <span>Tu poder: <b className="text-amber-300">{fmt(miPoder)}</b></span>
            <span>Formación {save.formacion.length}/{huecos(save)}</span>
            <span className="flex items-center gap-1"><Estrellas n={1} max={1} className="w-3 h-3" />{totalEstrellas}/{ISLAS.length * 12}</span>
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex flex-col gap-2">
        {isla.fases.map((fase, f) => {
          const ab = faseAbierta(save, islaSel, f)
          const est = save.estrellas[faseKey(islaSel, f)] ?? 0
          const rivales = unidadesFase(islaSel, f)
          const suPoder = poderEquipo(rivales)
          const ratio = miPoder / suPoder
          const aviso = ratio >= 1.1 ? { t: 'Fácil', c: '#4ade80' } : ratio >= 0.75 ? { t: 'Igualado', c: '#fbbf24' } : ratio >= 0.6 ? { t: 'Difícil', c: '#fb923c' } : { t: 'Muy difícil', c: '#f87171' }
          return (
            <div key={f} className={`rounded-2xl border p-2.5 ${fase.jefe ? 'border-rose-500/50 bg-rose-950/30' : 'border-slate-700/80 bg-slate-900/70'} ${ab ? '' : 'opacity-50'}`}>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {fase.jefe && <span className="rounded bg-rose-500 px-1.5 text-[9.5px] font-black uppercase text-white">Jefe</span>}
                    <span className="text-[13.5px] font-black text-slate-100 truncate">{f + 1}. {fase.nombre}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[10.5px] font-bold">
                    <Estrellas n={est} className="w-3 h-3" />
                    <span className="text-slate-400">Nv. {Math.max(...fase.rivales.map((r) => r.nivel))}</span>
                    {ab && <span style={{ color: aviso.c }}>{aviso.t}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Boton disabled={!ab} tono={fase.jefe ? 'rojo' : 'oro'} onClick={() => abordar(islaSel, f)}>
                    {est ? 'Repetir' : 'Abordar'}
                  </Boton>
                  {est === 3 && <Boton tono="gris" className="!py-1 !text-[10.5px]" onClick={() => saquear(islaSel, f)}>Saqueo rápido</Boton>}
                </div>
              </div>
              {ab && (
                <div className="mt-2 flex gap-1.5">
                  {fase.rivales.map((r, k) => {
                    const d = getPirata(r.id)
                    return (
                      <div key={k} className="flex flex-col items-center w-14">
                        <PirateFace look={d.look} rareza={d.rareza} size={fase.jefe && !r.id.startsWith('r-') ? 48 : 40} />
                        <span className="mt-0.5 text-[9px] font-bold text-slate-400 truncate w-full text-center">{d.nombre}</span>
                        <ClaseChip clase={d.clase} corto />
                      </div>
                    )
                  })}
                </div>
              )}
              {ab && !est && (
                <div className="mt-1.5 text-[10.5px] text-slate-400">
                  Primera vez: <span className="text-fuchsia-200 font-bold">+{fase.jefe ? 120 : 40} perlas</span>
                  {fase.jefe && <> · <span className="text-amber-200 font-bold">{getPirata(fase.rivales.find((r) => !r.id.startsWith('r-'))!.id).nombre} {getPirata(fase.rivales.find((r) => !r.id.startsWith('r-'))!.id).apodo}</span> entra en la taberna</>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Silueta de isla con palmera para el fondo de la tarjeta. */
function IslaDibujo({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 70" className="absolute -right-2 -bottom-2 w-36 opacity-30" aria-hidden>
      <path d="M0 62 Q30 56 60 62 T120 62 V70 H0Z" fill="#38bdf8" />
      <ellipse cx="70" cy="60" rx="38" ry="9" fill={color} />
      <path d="M72 58 Q70 36 78 22" fill="none" stroke="#78350f" strokeWidth="3" />
      <path d="M78 22 Q66 16 58 24 M78 22 Q88 12 98 20 M78 22 Q76 10 66 8 M78 22 Q92 24 96 34" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
