// La tripulación: formación (con sus huecos), colección y ficha de cada pirata
// con su entrenamiento.
import { useState } from 'react'
import { useCorsarios } from '@/state/corsariosStore'
import { capitanDef, CLASE_INFO, getPirata, PIRATAS } from '@/data/corsarios/piratas'
import { crearUnidad, poder } from '@/engine/corsarios/battle'
import {
  bonusEquipo, costeEntreno, huecos, pieza, portadorDe, poderEquipo, puedeEntrenar, unidadesAliadas, xpParaNivel, ESTRELLAS_MAX,
} from '@/engine/corsarios/game'
import type { PirataDef, TipoPieza } from '@/engine/corsarios/types'
import { IconoPieza, textoBonus } from './PuertoView'
import { nombrePieza } from '@/data/corsarios/mods'
import PirateFace from './PirateFace'
import { Boton, ClaseChip, Doblon, fmt, RarezaChip } from './Bits'

const ORDEN_RAREZA = { L: 0, E: 1, R: 2, C: 3 }

export default function TripulacionView() {
  const { save } = useCorsarios()
  const [sel, setSel] = useState<string | null>(null)
  if (!save) return null
  const capi = capitanDef(save.capitan.nombre, save.capitan.clase)
  const h = huecos(save)
  const tengo = new Set(save.tripulacion.map((t) => t.id))
  const conocidos = [...PIRATAS].sort((a, b) =>
    Number(tengo.has(b.id)) - Number(tengo.has(a.id)) || ORDEN_RAREZA[a.rareza] - ORDEN_RAREZA[b.rareza] || a.nombre.localeCompare(b.nombre))
  return (
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-3 pb-4">
      <div className="rounded-2xl border border-amber-500/30 bg-slate-900/70 p-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wide text-amber-300">Formación {save.formacion.length}/{h}</span>
          <span className="text-[11px] font-bold text-slate-400">Poder <b className="text-amber-300">{fmt(poderEquipo(unidadesAliadas(save)))}</b></span>
        </div>
        <div className="mt-2 flex gap-1.5 justify-between">
          {Array.from({ length: 5 }, (_, k) => {
            const id = save.formacion[k]
            if (k >= h) {
              return (
                <div key={k} className="w-[19%] aspect-square rounded-[14px] border border-dashed border-slate-700 grid place-items-center text-center text-[8.5px] font-bold text-slate-500 leading-tight p-1">
                  {k === 3 ? 'Vence la isla 1' : 'Vence la isla 3'}
                </div>
              )
            }
            if (!id) return <div key={k} className="w-[19%] aspect-square rounded-[14px] border border-dashed border-slate-600 grid place-items-center text-slate-500 text-[18px]">+</div>
            const d = id === 'capitan' ? capi : getPirata(id)
            return (
              <button key={k} onClick={() => setSel(id)} className="w-[19%] flex flex-col items-center active:scale-95">
                <PirateFace look={d.look} rareza={d.rareza} size={56} className="w-full h-auto" />
                <span className="text-[9px] font-bold text-slate-300 truncate w-full text-center">{d.nombre}</span>
              </button>
            )
          })}
        </div>
        <div className="mt-1.5 text-[10.5px] text-slate-500">Toca un pirata de abajo para meterlo o sacarlo. El capitán siempre pelea.</div>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Colección</span>
        <span className="text-[11px] font-bold text-slate-500">{tengo.size}/{PIRATAS.length} piratas</span>
      </div>
      <div className="mt-1.5 grid grid-cols-4 gap-2">
        <Carta d={capi} nivel={save.nivel} estrellas={1} enFormacion onClick={() => setSel('capitan')} />
        {conocidos.map((d) => {
          const t = save.tripulacion.find((x) => x.id === d.id)
          if (!t) {
            return (
              <div key={d.id} className="flex flex-col items-center opacity-60">
                <div className="w-full aspect-square rounded-[14px] border border-slate-700 bg-slate-900 grid place-items-center text-[22px] font-black text-slate-600">?</div>
                <span className="mt-0.5 text-[9px] font-bold text-slate-600">{d.desbloqueaIsla != null ? `Jefe isla ${d.desbloqueaIsla + 1}` : '???'}</span>
              </div>
            )
          }
          return <Carta key={d.id} d={d} nivel={t.nivel} estrellas={t.estrellas} enFormacion={save.formacion.includes(d.id)} puedeSubir={puedeEntrenar(save, d.id)} onClick={() => setSel(d.id)} />
        })}
      </div>

      {sel && <Ficha id={sel} onClose={() => setSel(null)} />}
    </div>
  )
}

function Carta({ d, nivel, estrellas, enFormacion, puedeSubir, onClick }: {
  d: PirataDef; nivel: number; estrellas: number; enFormacion?: boolean; puedeSubir?: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} className="relative flex flex-col items-center active:scale-95">
      <PirateFace look={d.look} rareza={d.rareza} size={72} className="w-full h-auto" />
      {enFormacion && <span className="absolute top-1 left-1 rounded bg-amber-400 px-1 text-[8px] font-black text-slate-950">EN FORMACIÓN</span>}
      {puedeSubir && <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950" />}
      <span className="mt-0.5 text-[9.5px] font-bold text-slate-200 truncate w-full text-center">{d.nombre} {d.apodo}</span>
      <span className="text-[9px] font-bold text-slate-400">Nv. {nivel} <span className="text-amber-300">{'★'.repeat(estrellas)}</span></span>
    </button>
  )
}

function Ficha({ id, onClose }: { id: string; onClose: () => void }) {
  const { save, entrenar, alternar, equipar, desequipar } = useCorsarios()
  const [eligiendo, setEligiendo] = useState<TipoPieza | null>(null)
  if (!save) return null
  const esCapi = id === 'capitan'
  const d = esCapi ? capitanDef(save.capitan.nombre, save.capitan.clase) : getPirata(id)
  const t = save.tripulacion.find((x) => x.id === id)
  const nivel = esCapi ? save.nivel : t!.nivel
  const estrellas = esCapi ? 1 : t!.estrellas
  const u = crearUnidad(d, nivel, 'a', 'x', { estrellas, equipo: bonusEquipo(save, id) })
  const equipo = esCapi ? save.equipoCapitan : t!
  const enForm = save.formacion.includes(id)
  const lleno = save.formacion.length >= huecos(save)
  const coste = costeEntreno(nivel)
  const c = CLASE_INFO[d.clase]
  return (
    <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-slate-700 bg-slate-900 p-4 animate-pop-in safe-bottom max-h-[92%] overflow-y-auto no-scrollbar" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-3">
          <PirateFace look={d.look} rareza={d.rareza} size={88} />
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-black text-slate-50 leading-tight">{d.nombre} {d.apodo}</div>
            <div className="mt-1 flex gap-1 flex-wrap"><RarezaChip rareza={d.rareza} /><ClaseChip clase={d.clase} /></div>
            <div className="mt-1 text-[11.5px] font-bold text-slate-300">Nv. {nivel}{!esCapi && <> · <span className="text-amber-300">{'★'.repeat(estrellas)}</span><span className="text-slate-600">{'★'.repeat(ESTRELLAS_MAX - estrellas)}</span></>}</div>
            {!esCapi && t && nivel < save.nivel && (
              <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-sky-400" style={{ width: `${Math.round(((t.xp ?? 0) / xpParaNivel(nivel)) * 100)}%` }} />
              </div>
            )}
          </div>
        </div>
        {d.frase && <div className="mt-2 text-[12px] italic text-slate-400">«{d.frase}»</div>}
        <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
          {([['Vida', u.maxHp], ['Ataque', u.atk], ['Defensa', u.def], ['Velocidad', u.spd]] as const).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-slate-800/80 py-1.5">
              <div className="text-[9.5px] font-bold uppercase text-slate-400">{k}</div>
              <div className="text-[14px] font-black text-slate-100 tabular-nums">{fmt(v)}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {(['arma', 'amuleto'] as TipoPieza[]).map((tipo) => {
            const p = pieza(save, equipo[tipo])
            return (
              <button key={tipo} onClick={() => setEligiendo(eligiendo === tipo ? null : tipo)}
                className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 text-left active:scale-[0.98] ${eligiendo === tipo ? 'border-violet-400 bg-violet-500/10' : 'border-slate-700 bg-slate-800/60'}`}>
                {p ? <IconoPieza p={p} size={28} /> : <div className="w-7 h-7 rounded-lg border border-dashed border-slate-600 grid place-items-center text-slate-500">+</div>}
                <div className="min-w-0">
                  <div className="text-[9.5px] font-black uppercase text-slate-400">{tipo === 'arma' ? 'Arma' : 'Amuleto'}</div>
                  <div className="text-[11px] font-bold text-slate-100 truncate">{p ? nombrePieza(p) : 'Vacío'}</div>
                </div>
              </button>
            )
          })}
        </div>
        {eligiendo && (
          <SelectorPieza tipo={eligiendo} quien={id} actual={equipo[eligiendo]}
            onElegir={(uid) => { equipar(id, uid); setEligiendo(null) }}
            onQuitar={() => { desequipar(id, eligiendo); setEligiendo(null) }} />
        )}
        <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5">
          <div className="text-[10.5px] font-black uppercase tracking-wide text-amber-300">Especial · {d.skill.nombre}</div>
          <div className="text-[12px] text-slate-200">{d.skill.desc}</div>
          <div className="text-[10.5px] text-slate-400 mt-0.5">Se lanza al llenar la barra de energía (atacando y recibiendo golpes).</div>
        </div>
        <div className="mt-1.5 text-[11px] text-slate-400">
          {c.vence ? <>Hace un 30% más de daño a los <b style={{ color: CLASE_INFO[c.vence].color }}>{CLASE_INFO[c.vence].plural}</b>.</> : 'Sin ventaja de oficio: está para cuidar del resto.'}
          {' '}Poder: <b className="text-amber-300">{fmt(poder(u))}</b>
        </div>
        {esCapi ? (
          <div className="mt-3 text-[11.5px] text-slate-400">El capitán sube de nivel con la experiencia de los combates y marca el tope de nivel de la tripulación.</div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Boton tono="gris" disabled={!enForm && lleno} onClick={() => alternar(id)}>
              {enForm ? 'Sacar' : lleno ? 'Formación llena' : 'A la formación'}
            </Boton>
            <Boton disabled={!puedeEntrenar(save, id)} onClick={() => entrenar(id)}>
              {nivel >= save.nivel
                ? 'Tope: nivel capitán'
                : <span className="inline-flex items-center gap-1">Entrenar · <Doblon />{fmt(coste)}</span>}
            </Boton>
          </div>
        )}
      </div>
    </div>
  )
}

const ORDEN_PIEZA = { L: 0, E: 1, R: 2, C: 3 }

function SelectorPieza({ tipo, quien, actual, onElegir, onQuitar }: {
  tipo: TipoPieza; quien: string; actual?: string; onElegir: (uid: string) => void; onQuitar: () => void
}) {
  const { save } = useCorsarios()
  if (!save) return null
  const piezas = save.inventario.filter((p) => p.tipo === tipo && p.uid !== actual)
    .sort((a, b) => ORDEN_PIEZA[a.rareza] - ORDEN_PIEZA[b.rareza])
  return (
    <div className="mt-1.5 rounded-xl border border-violet-500/30 bg-slate-950/60 p-2 flex flex-col gap-1.5 max-h-52 overflow-y-auto no-scrollbar">
      {actual && <button onClick={onQuitar} className="text-left text-[11.5px] font-bold text-rose-300 px-1">Quitar lo que lleva</button>}
      {piezas.length === 0 && <div className="text-[11.5px] text-slate-400 px-1">No hay {tipo === 'arma' ? 'armas' : 'amuletos'} en la bodega. Los combates los sueltan.</div>}
      {piezas.map((p) => {
        const otro = portadorDe(save, p.uid)
        return (
          <button key={p.uid} onClick={() => onElegir(p.uid)} className="flex items-center gap-2 rounded-lg bg-slate-800/70 px-2 py-1.5 text-left active:scale-[0.98]">
            <IconoPieza p={p} size={26} />
            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] font-bold text-slate-100 truncate">{nombrePieza(p)}</div>
              <div className="text-[10px] text-slate-400">{textoBonus(p)}{otro && otro !== quien && <> · se lo quita a {otro === 'capitan' ? save.capitan.nombre : getPirata(otro).nombre}</>}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
