// La taberna: el gacha del modo. Dos carteles — la jarra de doblones (barata,
// sobre todo comunes; una gratis al día) y el cofre de perlas (lo bueno, con
// garantía de Legendario).
import { useEffect, useState } from 'react'
import { useCorsarios } from '@/state/corsariosStore'
import { play } from '@/utils/sfx'
import { getPirata, RAREZA_INFO } from '@/data/corsarios/piratas'
import {
  COSTE_PERLAS, COSTE_PERLAS_10, COSTE_TABERNA, disponibles, PIEDAD_MAX, puedeTirar, tiradaGratis,
} from '@/engine/corsarios/game'
import PirateFace from './PirateFace'
import { Boton, ClaseChip, Doblon, fmt, Perla, RarezaChip } from './Bits'

export default function TabernaView() {
  const { save, tirar, tiradas } = useCorsarios()
  if (!save) return null
  const gratis = tiradaGratis(save)
  const pool = disponibles(save)
  const jefes = pool.filter((d) => d.desbloqueaIsla != null)
  return (
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-3 pb-4 flex flex-col gap-3">
      <div className="text-center pt-1">
        <div className="text-[19px] font-black text-amber-200">Taberna del Ancla Rota</div>
        <div className="text-[12px] text-slate-400">Invita a una ronda y alguien se apuntará a tu tripulación.</div>
      </div>

      {/* Jarra de doblones */}
      <div className="rounded-2xl border border-amber-700/50 p-3"
        style={{ background: 'radial-gradient(100% 80% at 0% 0%, #b4530933, transparent 60%), #0f172acc' }}>
        <div className="flex items-start gap-3">
          <Jarra />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-black text-amber-300">Ronda de grog</div>
            <div className="text-[11.5px] text-slate-300 leading-snug">Marineros de puerto: comunes y raros, algún épico despistado.</div>
            <div className="mt-1 text-[10.5px] font-bold text-slate-400">Común 70% · Raro 26% · Épico 4%</div>
          </div>
        </div>
        <Boton className="w-full mt-2.5" disabled={!puedeTirar(save, 'taberna', 1)} onClick={() => tirar('taberna', 1)}>
          {gratis ? '¡Ronda gratis del día!' : <span className="inline-flex items-center gap-1">Invitar · <Doblon />{COSTE_TABERNA}</span>}
        </Boton>
      </div>

      {/* Cofre de perlas */}
      <div className="rounded-2xl border border-fuchsia-500/40 p-3"
        style={{ background: 'radial-gradient(100% 80% at 100% 0%, #a855f740, transparent 60%), #0f172acc' }}>
        <div className="flex items-start gap-3">
          <Cofre />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-black text-fuchsia-200">Cofre del capitán</div>
            <div className="text-[11.5px] text-slate-300 leading-snug">Lobos de mar de verdad. 10 de golpe aseguran un Épico.</div>
            <div className="mt-1 text-[10.5px] font-bold text-slate-400">Raro 72% · Épico 24% · Legendario 4%</div>
            <div className="mt-1 text-[10.5px] font-bold text-amber-300">Legendario asegurado en {PIEDAD_MAX - save.piedad} tiradas</div>
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <Boton tono="perla" disabled={!puedeTirar(save, 'perlas', 1)} onClick={() => tirar('perlas', 1)}>
            <span className="inline-flex items-center gap-1">x1 · <Perla />{COSTE_PERLAS}</span>
          </Boton>
          <Boton tono="perla" disabled={!puedeTirar(save, 'perlas', 10)} onClick={() => tirar('perlas', 10)}>
            <span className="inline-flex items-center gap-1">x10 · <Perla />{COSTE_PERLAS_10}</span>
          </Boton>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/80 bg-slate-900/60 p-3">
        <div className="text-[11px] font-black uppercase tracking-wide text-slate-400">Jefes en la taberna</div>
        {jefes.length === 0
          ? <div className="mt-1 text-[11.5px] text-slate-400">Cada jefe de isla que derrotes se pasará por aquí buscando barco.</div>
          : (
            <div className="mt-1.5 flex gap-2 flex-wrap">
              {jefes.map((d) => (
                <div key={d.id} className="flex flex-col items-center w-14">
                  <PirateFace look={d.look} rareza={d.rareza} size={44} />
                  <span className="text-[9px] font-bold text-slate-300 truncate w-full text-center">{d.nombre} {d.apodo}</span>
                </div>
              ))}
            </div>
          )}
        <div className="mt-2 text-[10.5px] text-slate-500 leading-snug">
          Repetidos: +1 estrella (hasta 5, +12% a todo por estrella). A 5 estrellas, se cambian por doblones.
        </div>
      </div>

      {tiradas && <Revelado />}
    </div>
  )
}

function Revelado() {
  const { tiradas, cerrarTiradas, save } = useCorsarios()
  const [vistas, setVistas] = useState(0)
  const n = tiradas?.length ?? 0
  useEffect(() => {
    if (!tiradas || vistas >= n) return
    const t = setTimeout(() => {
      const r = tiradas[vistas].rareza
      play(r === 'L' ? 'mega' : r === 'E' ? 'levelup' : 'select')
      setVistas((v) => v + 1)
    }, vistas === 0 ? 350 : tiradas[vistas].rareza === 'L' ? 700 : 260)
    return () => clearTimeout(t)
  }, [tiradas, vistas, n])
  if (!tiradas || !save) return null
  const hayL = tiradas.slice(0, vistas).some((t) => t.rareza === 'L')
  return (
    <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4"
      onClick={() => (vistas < n ? setVistas(n) : cerrarTiradas())}>
      {hayL && <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(60% 40% at 50% 45%, #fbbf2440, transparent 70%)' }} />}
      <div className={`grid gap-2 w-full max-w-sm ${n > 1 ? 'grid-cols-5' : 'grid-cols-1 place-items-center'}`}>
        {tiradas.map((t, k) => {
          const d = getPirata(t.id)
          const r = RAREZA_INFO[t.rareza]
          if (k >= vistas) {
            return <div key={k} className={`${n > 1 ? 'aspect-[3/4]' : 'w-40 h-52'} rounded-xl border border-slate-700 bg-slate-900`} />
          }
          return (
            <div key={k} className={`animate-pop-in rounded-xl border flex flex-col items-center justify-center p-1 ${n > 1 ? 'aspect-[3/4]' : 'w-44 py-4'}`}
              style={{ borderColor: r.color, background: `radial-gradient(90% 70% at 50% 30%, ${r.color}40, #0f172a)`, boxShadow: t.rareza === 'L' ? `0 0 24px ${r.color}` : undefined }}>
              <PirateFace look={d.look} rareza={d.rareza} size={n > 1 ? 46 : 110} />
              <div className={`mt-1 font-black text-slate-100 text-center leading-tight ${n > 1 ? 'text-[8.5px]' : 'text-[15px]'}`}>{n > 1 ? d.nombre : `${d.nombre} ${d.apodo}`}</div>
              {t.nuevo
                ? <span className={`font-black text-emerald-300 ${n > 1 ? 'text-[8px]' : 'text-[11px]'}`}>¡NUEVO!</span>
                : <span className={`font-black text-amber-300 ${n > 1 ? 'text-[8px]' : 'text-[11px]'}`}>{t.consuelo ? `+${fmt(t.consuelo)} dob.` : `${'★'.repeat(t.estrellas)}`}</span>}
              {n === 1 && (
                <div className="mt-1 flex flex-col items-center gap-1">
                  <div className="flex gap-1"><RarezaChip rareza={d.rareza} /><ClaseChip clase={d.clase} /></div>
                  {t.nuevo && <div className="text-[11px] text-slate-300 text-center leading-snug px-2">«{d.frase}»</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-5 text-[11.5px] font-bold text-slate-400">{vistas < n ? 'Toca para verlos todos' : 'Toca para seguir'}</div>
    </div>
  )
}

function Jarra() {
  return (
    <svg viewBox="0 0 48 48" className="w-14 h-14 shrink-0" aria-hidden>
      <path d="M10 14 H32 V40 Q32 43 29 43 H13 Q10 43 10 40 Z" fill="#92400e" stroke="#451a03" strokeWidth="2" />
      <path d="M32 18 H37 Q41 18 41 22 V30 Q41 34 37 34 H32" fill="none" stroke="#451a03" strokeWidth="3" />
      <path d="M8 14 Q10 6 17 9 Q21 4 26 8 Q33 6 34 14 Z" fill="#fef3c7" />
      <path d="M15 20 V38 M21 20 V38 M27 20 V38" stroke="#b45309" strokeWidth="2" />
    </svg>
  )
}

function Cofre() {
  return (
    <svg viewBox="0 0 48 48" className="w-14 h-14 shrink-0" aria-hidden>
      <path d="M6 22 Q6 10 24 10 Q42 10 42 22 Z" fill="#7c2d12" stroke="#431407" strokeWidth="2" />
      <rect x="6" y="22" width="36" height="18" rx="2" fill="#9a3412" stroke="#431407" strokeWidth="2" />
      <rect x="6" y="20" width="36" height="4" fill="#fbbf24" />
      <rect x="20" y="20" width="8" height="10" rx="1.5" fill="#fbbf24" stroke="#92400e" strokeWidth="1.2" />
      <circle cx="24" cy="26" r="1.6" fill="#431407" />
      <circle cx="14" cy="17" r="2.5" fill="#f5d0fe" /><circle cx="34" cy="16" r="2" fill="#f5d0fe" />
    </svg>
  )
}
