// Reproducción del combate de Corsarios. El resultado ya está decidido (y
// guardado); aquí solo se cuenta evento a evento, a la velocidad que elijas.
import { useEffect, useMemo, useState } from 'react'
import { useCorsarios } from '@/state/corsariosStore'
import { play } from '@/utils/sfx'
import { getPirata } from '@/data/corsarios/piratas'
import { ISLAS } from '@/data/corsarios/islas'
import { FRASE_JEFE } from '@/data/corsarios/historia'
import { IconoPieza, textoBonus } from './PuertoView'
import type { Evento, Impacto, Unidad } from '@/engine/corsarios/types'
import PirateFace from './PirateFace'
import { Boton, ClaseChip, Doblon, Estrellas, fmt, Perla, Triangulo } from './Bits'

interface Vivo { hp: number; escudo: number; energia: number }

const PAUSA: Record<Evento['t'], number> = { ronda: 260, accion: 760, aturdido: 520, veneno: 520, fin: 400 }

function estadoTras(inicial: Unidad[], eventos: Evento[], paso: number): Record<string, Vivo> {
  const st: Record<string, Vivo> = {}
  for (const u of inicial) st[u.uid] = { hp: u.hp, escudo: u.escudo, energia: u.energia }
  for (let k = 0; k < paso; k++) {
    const ev = eventos[k]
    if (ev.t === 'accion') {
      for (const im of ev.impactos) {
        const s = st[im.uid]
        s.hp = im.hp
        s.escudo = im.escudoRestante
        if (im.dano != null && im.hp > 0) s.energia = Math.min(100, s.energia + 12)
      }
      st[ev.actor].energia = ev.energia
    } else if (ev.t === 'veneno') {
      for (const im of ev.impactos) st[im.uid].hp = im.hp
    }
  }
  return st
}

/** La velocidad elegida se mantiene entre combates (mientras dure la sesión). */
let velGuardada = 1

export default function BattleView() {
  const { batalla, cerrarBatalla, abordar, abordarMar } = useCorsarios()
  const [paso, setPaso] = useState(0)
  const [vel, setVelState] = useState(velGuardada)
  const setVel = (v: number) => { velGuardada = v; setVelState(v) }
  const r = batalla?.resultado
  const total = r?.eventos.length ?? 0
  const fin = paso >= total
  // El jefe (si lo hay) se presenta antes de empezar.
  const jefeU = r?.inicial.find((u) => u.lado === 'e' && FRASE_JEFE[u.defId])
  const [presentando, setPresentando] = useState(!!jefeU)

  // Reinicia la reproducción si cambia el combate (botón «Repetir»).
  useEffect(() => { setPaso(0); setPresentando(!!jefeU) }, [batalla])

  useEffect(() => {
    if (!presentando) return
    const t = setTimeout(() => setPresentando(false), 2600 / vel)
    return () => clearTimeout(t)
  }, [presentando, vel])

  useEffect(() => {
    if (!r || fin || presentando) return
    const ev = r.eventos[paso]
    const espera = (ev.t === 'accion' && ev.especial ? 1150 : PAUSA[ev.t]) / vel
    const t = setTimeout(() => {
      if (ev.t === 'accion') {
        if (ev.impactos.some((i) => i.ko)) play('faint')
        else if (ev.kind === 'cura' || ev.kind === 'escudo') play('heal')
        else if (ev.impactos.some((i) => i.critico)) play('crit')
        else play('hit')
      } else if (ev.t === 'fin') play(ev.gana === 'a' ? 'victory' : 'defeat')
      setPaso((p) => p + 1)
    }, espera)
    return () => clearTimeout(t)
  }, [r, paso, vel, fin, presentando])

  const st = useMemo(() => (r ? estadoTras(r.inicial, r.eventos, paso) : {}), [r, paso])
  if (!batalla || !r) return null

  // Último evento con contenido visual (para resaltar y poner números).
  let actual: Evento | null = null
  for (let k = paso - 1; k >= 0; k--) {
    const e = r.eventos[k]
    if (e.t !== 'ronda') { actual = e; break }
  }
  let ronda = 0
  for (let k = 0; k < paso; k++) { const e = r.eventos[k]; if (e.t === 'ronda') ronda = e.n }
  const impactos: Record<string, Impacto> = {}
  if (actual && (actual.t === 'accion' || actual.t === 'veneno')) for (const im of actual.impactos) impactos[im.uid] = im
  const actor = actual?.t === 'accion' || actual?.t === 'aturdido' ? actual.actor : null
  const porUid = Object.fromEntries(r.inicial.map((u) => [u.uid, u]))
  const enemigos = r.inicial.filter((u) => u.lado === 'e')
  const aliados = r.inicial.filter((u) => u.lado === 'a')
  const titulo = batalla.mar ? 'Mar Abierto' : ISLAS[batalla.isla].nombre
  const subtitulo = batalla.mar ? `Piso ${batalla.fase}` : ISLAS[batalla.isla].fases[batalla.fase].nombre
  const color = batalla.mar ? '#38bdf8' : ISLAS[batalla.isla].color

  const rotulo = (() => {
    if (!actual) return 'Preparando el abordaje…'
    if (actual.t === 'aturdido') return `${porUid[actual.actor].nombre} está aturdido`
    if (actual.t === 'veneno') return `El veneno hace efecto`
    if (actual.t === 'accion') return `${porUid[actual.actor].nombre} · ${actual.nombre}`
    return actual.gana === 'a' ? '¡Victoria!' : 'Derrota…'
  })()

  return (
    <div className="flex-1 min-h-0 flex flex-col relative">
      <style>{`
        @keyframes cors-golpe { 0%{transform:translateX(0)} 25%{transform:translateX(-5px)} 50%{transform:translateX(5px)} 75%{transform:translateX(-3px)} 100%{transform:translateX(0)} }
        @keyframes cors-num { 0%{opacity:0;transform:translateY(6px) scale(.8)} 20%{opacity:1;transform:translateY(0) scale(1.1)} 100%{opacity:0;transform:translateY(-20px) scale(1)} }
        @keyframes cors-salto { 0%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
      `}</style>
      <div className="shrink-0 px-3 pt-3 safe-top flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[10.5px] font-black uppercase tracking-[0.2em]" style={{ color }}>{titulo}</div>
          <div className="text-[14px] font-black text-slate-100 truncate">{subtitulo}</div>
        </div>
        <div className="text-[11px] font-black text-slate-400 tabular-nums">Ronda {ronda}</div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col justify-between px-2 py-3"
        style={{ background: 'linear-gradient(180deg, transparent, #0c4a6e22 45%, #0369a133 55%, transparent)' }}>
        <Fila unidades={enemigos} st={st} impactos={impactos} actor={actor} paso={paso} />
        <div className="text-center px-2">
          <div key={paso} className="inline-block rounded-full px-3 py-1 text-[12.5px] font-black animate-pop-in"
            style={actual?.t === 'accion' && actual.especial
              ? { background: 'linear-gradient(90deg,#f59e0b,#ef4444)', color: '#0b1220' }
              : { background: '#0f172acc', color: '#e2e8f0', border: '1px solid #334155' }}>
            {rotulo}
          </div>
        </div>
        <Fila unidades={aliados} st={st} impactos={impactos} actor={actor} paso={paso} />
      </div>

      <div className="shrink-0 px-3 pb-3 safe-bottom flex items-center gap-2">
        {[1, 2, 4].map((v) => (
          <button key={v} onClick={() => setVel(v)}
            className={`rounded-lg px-3 py-2 text-[12px] font-black ${vel === v ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>x{v}</button>
        ))}
        <div className="flex-1" />
        {!fin && <Boton tono="gris" onClick={() => { setPresentando(false); setPaso(total) }}>Saltar</Boton>}
      </div>

      {presentando && jefeU && (
        <div className="absolute inset-0 z-20 bg-black/60 grid place-items-center p-6" onClick={() => setPresentando(false)}>
          <div className="w-full max-w-xs rounded-3xl border border-rose-500/60 bg-slate-950/95 p-4 text-center animate-pop-in">
            <div className="text-[10.5px] font-black uppercase tracking-[0.25em] text-rose-400">¡Jefe!</div>
            <div className="mt-2 flex justify-center"><PirateFace look={jefeU.look} rareza={jefeU.rareza} size={92} /></div>
            <div className="mt-2 text-[16px] font-black text-slate-50">{jefeU.nombre}</div>
            <p className="mt-1 text-[13px] italic text-slate-300 leading-snug">«{FRASE_JEFE[jefeU.defId]}»</p>
          </div>
        </div>
      )}

      {fin && <Resumen onVolver={cerrarBatalla} onRepetir={() => (batalla.mar ? abordarMar() : abordar(batalla.isla, batalla.fase))} />}
    </div>
  )
}

function Fila({ unidades, st, impactos, actor, paso }: {
  unidades: Unidad[]
  st: Record<string, Vivo>
  impactos: Record<string, Impacto>
  actor: string | null
  paso: number
}) {
  return (
    <div className="flex justify-center gap-1.5">
      {unidades.map((u) => {
        const s = st[u.uid]
        const im = impactos[u.uid]
        const ko = s.hp <= 0
        const pct = Math.max(0, (s.hp / u.maxHp) * 100)
        const esActor = actor === u.uid
        return (
          <div key={u.uid} className="relative flex flex-col items-center w-[19%] max-w-[76px]">
            <div key={im || esActor ? `f${paso}` : 'f'} className={`rounded-[14px] ${esActor ? 'ring-2 ring-amber-300' : ''}`}
              style={{ animation: im?.dano ? 'cors-golpe .35s' : esActor ? 'cors-salto .4s' : undefined }}>
              <PirateFace look={u.look} rareza={u.rareza} size={60} apagado={ko} />
            </div>
            {im && <Numero key={`n${paso}`} im={im} />}
            <div className="w-full mt-1 h-2 rounded-full bg-slate-800 overflow-hidden relative">
              <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, background: pct > 50 ? '#4ade80' : pct > 25 ? '#facc15' : '#f87171' }} />
              {s.escudo > 0 && <div className="absolute inset-y-0 left-0 bg-sky-300/60" style={{ width: `${Math.min(100, (s.escudo / u.maxHp) * 100)}%` }} />}
            </div>
            <div className="w-full mt-0.5 h-1 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300" style={{ width: `${s.energia}%` }} />
            </div>
            <div className="mt-0.5 text-[9px] font-bold text-slate-300 truncate w-full text-center">{u.nombre.split(' ')[0]}</div>
            <div className="flex items-center gap-0.5">
              <ClaseChip clase={u.clase} corto />
              <span className="text-[8.5px] font-bold text-slate-500">{u.nivel}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Numero({ im }: { im: Impacto }) {
  const txt = im.dano != null ? `-${fmt(im.dano)}` : im.cura != null ? `+${fmt(im.cura)}` : im.escudo != null ? `+${fmt(im.escudo)}` : ''
  const color = im.dano != null ? (im.critico ? '#fbbf24' : '#f87171') : im.cura != null ? '#4ade80' : '#7dd3fc'
  const extra = im.ko ? 'KO' : im.critico ? '¡Crítico!' : im.aturde ? 'Aturdido' : im.veneno ? 'Veneno' : im.ventaja ? 'Ventaja' : im.escudo != null ? 'Escudo' : ''
  return (
    <div className="absolute top-2 left-0 right-0 text-center pointer-events-none" style={{ animation: 'cors-num 1s forwards' }}>
      <div className="text-[15px] font-black leading-none" style={{ color, textShadow: '0 2px 6px #000' }}>{txt}</div>
      {extra && <div className="text-[9px] font-black uppercase text-slate-100" style={{ textShadow: '0 1px 4px #000' }}>{extra}</div>}
    </div>
  )
}

function Resumen({ onVolver, onRepetir }: { onVolver: () => void; onRepetir: () => void }) {
  const { batalla, save } = useCorsarios()
  if (!batalla || !save) return null
  const b = batalla.botin
  const des = b.desbloqueado ? getPirata(b.desbloqueado) : null
  return (
    <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm grid place-items-center p-4">
      <div className="w-full max-w-sm rounded-3xl border p-4 animate-pop-in text-center"
        style={{ borderColor: b.gana ? '#fbbf2488' : '#f8717166', background: '#0f172a' }}>
        <div className="text-[24px] font-black" style={{ color: b.gana ? '#fbbf24' : '#f87171' }}>{b.gana ? '¡Victoria!' : 'Derrota'}</div>
        {b.gana && <div className="mt-1 flex justify-center"><Estrellas n={b.estrellas} className="w-7 h-7" /></div>}
        {b.gana && <div className="text-[11px] text-slate-400 mt-1">{b.estrellas === 3 ? 'Sin bajas. Impecable.' : b.estrellas === 2 ? 'Una baja en cubierta.' : 'Por los pelos.'}</div>}

        <div className="mt-3 flex justify-center gap-4 text-[13px] font-black tabular-nums">
          {b.doblones > 0 && <span className="flex items-center gap-1 text-amber-300"><Doblon className="w-4 h-4" />+{fmt(b.doblones)}</span>}
          {b.perlas > 0 && <span className="flex items-center gap-1 text-fuchsia-200"><Perla className="w-4 h-4" />+{fmt(b.perlas)}</span>}
          <span className="text-sky-300">+{fmt(b.xp)} XP</span>
        </div>
        {b.subidas > 0 && <div className="mt-2 rounded-xl bg-sky-500/15 border border-sky-500/40 py-1.5 text-[12.5px] font-black text-sky-200">¡El capitán sube al nivel {save.nivel}!</div>}
        {b.huecoNuevo && <div className="mt-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 py-1.5 text-[12.5px] font-black text-emerald-200">¡Nuevo hueco en la formación! Mete a otro pirata desde Tripulación.</div>}
        {b.pieza && (
          <div className="mt-2 rounded-xl bg-violet-500/10 border border-violet-500/40 p-2 flex items-center gap-2 text-left">
            <IconoPieza p={b.pieza} />
            <div className="min-w-0">
              <div className="text-[12.5px] font-black text-violet-100">{b.pieza.nombre}</div>
              <div className="text-[10.5px] text-slate-400">{textoBonus(b.pieza)}{b.piezaVendida ? ' · bodega llena: vendido' : ' · a la bodega'}</div>
            </div>
          </div>
        )}
        {b.piso && <div className="mt-2 rounded-xl bg-sky-500/15 border border-sky-500/40 py-1.5 text-[12.5px] font-black text-sky-200">Piso {b.piso} superado · nuevo récord</div>}
        {b.final && <div className="mt-2 rounded-xl bg-amber-400/15 border border-amber-400/50 py-1.5 text-[12.5px] font-black text-amber-200">¡Has vencido al Almirante! Los seis mares son tuyos.</div>}
        {des && (
          <div className="mt-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-2.5 flex items-center gap-3 text-left">
            <PirateFace look={des.look} rareza={des.rareza} size={56} />
            <div className="min-w-0">
              <div className="text-[13px] font-black text-amber-200">{des.nombre} {des.apodo}</div>
              <div className="text-[11.5px] text-slate-300 leading-snug">«{des.frase}»</div>
              <div className="text-[10.5px] font-bold text-amber-300 mt-0.5">Ahora puede salir en la taberna.</div>
            </div>
          </div>
        )}
        {!b.gana && (
          <div className="mt-3 text-[11.5px] text-slate-300 leading-snug text-left rounded-xl bg-slate-800/70 p-2.5">
            Tu tripulación ha ganado algo de experiencia. Prueba a entrenarla, a reclutar en la taberna o a cambiar la formación según los oficios rivales:
            <div className="mt-1.5"><Triangulo /></div>
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Boton tono="gris" onClick={onRepetir}>{batalla.mar ? (b.gana ? 'Siguiente piso' : 'Reintentar') : b.gana ? 'Repetir' : 'Reintentar'}</Boton>
          <Boton onClick={onVolver}>{batalla.mar ? 'Al puerto' : b.final ? 'Continuar' : 'Al mapa'}</Boton>
        </div>
      </div>
    </div>
  )
}
