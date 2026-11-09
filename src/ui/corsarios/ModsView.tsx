// Editor de mods de Corsarios, dentro de la propia web: crear packs, cambiar
// retratos, nombres, frases y especiales de los piratas, los objetos y los
// textos de las islas; activarlos, exportarlos e importarlos.
import { useRef, useState } from 'react'
import { useCorsarios } from '@/state/corsariosStore'
import { capitanDef, CLASE_INFO, PIRATAS, RAREZA_INFO, RIVALES } from '@/data/corsarios/piratas'
import { NOMBRES } from '@/data/corsarios/equipo'
import {
  fraseOriginal, imagenValida, islaOriginal, modVacio, original, resumenMod, sanearMod, TIPOS_ESPECIAL,
  type Mod, type ModIsla, type ModObjeto, type ModPirata,
} from '@/data/corsarios/mods'
import type { Look, PirataDef, Rareza, SkillKind, TipoPieza } from '@/engine/corsarios/types'
import PirateFace from './PirateFace'
import { Boton, ClaseChip, RarezaChip } from './Bits'
import { compartirArchivo, reducirImagen } from './imagen'

const input = 'w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-[13px] text-slate-100 outline-none focus:border-amber-400 placeholder:text-slate-600'

export default function ModsView() {
  const [editando, setEditando] = useState<Mod | null>(null)
  return editando
    ? <Editor inicial={editando} onSalir={() => setEditando(null)} />
    : <Lista onEditar={setEditando} />
}

// ------------------------------------------------------------------- LISTA
function Lista({ onEditar }: { onEditar: (m: Mod) => void }) {
  const { mods, modActivo, activarMod, borrarMod, guardarMod, irA } = useCorsarios()
  const avisar = (aviso: string) => useCorsarios.setState({ aviso })
  const compartir = async (m: Mod) => {
    const r = await compartirArchivo(`${slug(m.nombre)}.corsarios.json`, JSON.stringify(m), m.nombre)
    if (r === 'descargado') avisar('Mod descargado. Envía el archivo a quien quieras.')
  }
  const [pegando, setPegando] = useState(false)
  const [texto, setTexto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [borrando, setBorrando] = useState<string | null>(null)
  const archivo = useRef<HTMLInputElement>(null)

  const importar = (raw: string) => {
    try {
      const mod = sanearMod(JSON.parse(raw))
      // Si ya existe uno con el mismo id, se actualiza; si no, entra nuevo.
      // Y se activa al momento: importar es para usarlo.
      guardarMod(mod)
      activarMod(mod.id)
      setError(null)
      setPegando(false)
      setTexto('')
    } catch (e) {
      setError(e instanceof SyntaxError ? 'Ese archivo no es un mod de Corsarios.' : (e as Error).message)
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <Barra titulo="Mods" onVolver={() => irA('puerto')} />
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-3 pb-6 flex flex-col gap-3">
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-3 text-[12px] text-slate-300 leading-snug flex flex-col gap-1.5">
          <div><b className="text-violet-200">Crear:</b> pulsa Nuevo y cambia retratos, nombres, especiales, objetos o islas.</div>
          <div><b className="text-violet-200">Pasarlo:</b> pulsa Compartir y mándalo por WhatsApp o donde quieras.</div>
          <div><b className="text-violet-200">Instalarlo:</b> quien lo reciba pulsa Importar y elige el archivo. Se activa solo.</div>
          <div className="text-[11px] text-slate-500">Tu partida vale igual con mod o sin él: las estadísticas no cambian.</div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Boton tono="perla" onClick={() => onEditar(modVacio())}>Nuevo</Boton>
          <Boton tono="gris" onClick={() => archivo.current?.click()}>Importar</Boton>
          <Boton tono="gris" onClick={() => setPegando((v) => !v)}>Pegar</Boton>
        </div>
        {/* Sin filtro de tipo: lo que llega por WhatsApp a veces no se marca como JSON. */}
        <input ref={archivo} type="file" className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void f.text().then(importar)
          }} />
        {pegando && (
          <div className="flex flex-col gap-2">
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} placeholder='Pega aquí el contenido del mod ({"formato":"corsarios-mod", …})' className={input} />
            <Boton onClick={() => importar(texto)} disabled={!texto.trim()}>Importar texto</Boton>
          </div>
        )}
        {error && <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-[12px] text-rose-200">{error}</div>}

        {mods.length === 0 && <div className="text-center text-[12px] text-slate-500 py-6">Aún no tienes mods. Crea uno o importa un archivo.</div>}
        {mods.map((m) => {
          const activo = modActivo === m.id
          return (
            <div key={m.id} className={`rounded-2xl border p-3 ${activo ? 'border-emerald-400/60 bg-emerald-500/5' : 'border-slate-700/80 bg-slate-900/70'}`}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14.5px] font-black text-slate-50 truncate">{m.nombre}</span>
                    {activo && <span className="rounded bg-emerald-400 px-1.5 text-[9.5px] font-black text-slate-950">ACTIVO</span>}
                  </div>
                  {m.autor && <div className="text-[11px] text-slate-400">por {m.autor}</div>}
                  <div className="text-[11px] text-slate-500 mt-0.5">{resumenMod(m)}</div>
                </div>
                <div className="flex -space-x-2">
                  {Object.entries(m.piratas).filter(([, p]) => p.retrato).slice(0, 3).map(([id, p]) => (
                    <img key={id} src={p.retrato} alt="" className="w-8 h-8 rounded-lg object-cover ring-2 ring-slate-900" />
                  ))}
                </div>
              </div>
              <div className="mt-2.5 grid grid-cols-4 gap-1.5">
                <Boton tono={activo ? 'gris' : 'oro'} className="!px-1 !text-[10.5px]" onClick={() => activarMod(activo ? null : m.id)}>{activo ? 'Quitar' : 'Activar'}</Boton>
                <Boton tono="gris" className="!px-1 !text-[10.5px]" onClick={() => onEditar(structuredClone(m))}>Editar</Boton>
                <Boton tono="gris" className="!px-1 !text-[10.5px]" onClick={() => void compartir(m)}>Compartir</Boton>
                <Boton tono="gris" className="!px-1 !text-[10.5px]" onClick={() => setBorrando(borrando === m.id ? null : m.id)}>Borrar</Boton>
              </div>
              {borrando === m.id && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="flex-1 text-[11.5px] text-rose-200">¿Borrar «{m.nombre}»? No se puede deshacer.</span>
                  <Boton tono="rojo" className="!py-1 !text-[10.5px]" onClick={() => { borrarMod(m.id); setBorrando(null) }}>Borrar</Boton>
                </div>
              )}
            </div>
          )
        })}

        <div className="text-[10.5px] text-slate-500 leading-snug">
          Los mods se guardan en este dispositivo. Las imágenes viajan dentro del archivo, así que no hace falta nada más.
        </div>
      </div>
    </div>
  )
}

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mod'

function Barra({ titulo, onVolver, derecha }: { titulo: string; onVolver: () => void; derecha?: React.ReactNode }) {
  return (
    <div className="shrink-0 px-3 pt-3 pb-2 safe-top flex items-center gap-2">
      <button onClick={onVolver} aria-label="Volver"
        className="w-9 h-9 grid place-items-center rounded-xl bg-slate-900/80 border border-slate-700 text-slate-300 active:scale-95">
        <svg viewBox="0 0 20 20" className="w-4 h-4"><path d="M12.5 4 L6.5 10 L12.5 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <div className="flex-1 text-[17px] font-black text-violet-200 truncate">{titulo}</div>
      {derecha}
    </div>
  )
}

// ------------------------------------------------------------------ EDITOR
type Pestana = 'piratas' | 'objetos' | 'islas'

/** Quita las claves vacías para que el mod solo guarde lo que cambia. */
function limpiar<T extends object>(o: T): T | undefined {
  const r = { ...o } as Record<string, unknown>
  for (const k of Object.keys(r)) {
    const v = r[k]
    if (v === undefined || v === '' || (Array.isArray(v) && v.every((x) => !x)) || (v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length)) delete r[k]
  }
  return Object.keys(r).length ? (r as T) : undefined
}

function Editor({ inicial, onSalir }: { inicial: Mod; onSalir: () => void }) {
  const { guardarMod, activarMod, modActivo, save } = useCorsarios()
  const [mod, setMod] = useState<Mod>(inicial)
  const [pestana, setPestana] = useState<Pestana>('piratas')
  const [sel, setSel] = useState<string | null>(null)
  const [cambios, setCambios] = useState(false)

  const cambiar = (f: (m: Mod) => void) => {
    setMod((m) => { const n = structuredClone(m); f(n); return n })
    setCambios(true)
  }
  const setPirata = (id: string, p: ModPirata | undefined) => cambiar((m) => {
    const l = p && limpiar({ ...p, especial: p.especial && limpiar(p.especial) })
    if (l) m.piratas[id] = l
    else delete m.piratas[id]
  })
  const setObjeto = (k: string, o: ModObjeto) => cambiar((m) => {
    const l = limpiar(o)
    if (l) m.objetos[k] = l
    else delete m.objetos[k]
  })
  const setIsla = (i: number, o: ModIsla) => cambiar((m) => {
    const l = limpiar(o)
    if (l) m.islas[String(i)] = l
    else delete m.islas[String(i)]
  })
  const setJefe = (id: string, frase: string) => cambiar((m) => {
    if (frase) m.jefes[id] = frase
    else delete m.jefes[id]
  })

  const guardar = (activar: boolean) => {
    guardarMod(mod)
    if (activar && modActivo !== mod.id) activarMod(mod.id)
    setCambios(false)
    onSalir()
  }

  const capi = capitanDef(save?.capitan.nombre ?? 'Capitán', save?.capitan.clase ?? 'espada')
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <Barra titulo="Editar mod" onVolver={() => { if (!cambios || confirm('¿Salir sin guardar los cambios?')) onSalir() }} />
      <div className="px-3 grid grid-cols-2 gap-2">
        <input value={mod.nombre} onChange={(e) => cambiar((m) => { m.nombre = e.target.value.slice(0, 60) })} placeholder="Nombre del mod" className={input} />
        <input value={mod.autor ?? ''} onChange={(e) => cambiar((m) => { m.autor = e.target.value.slice(0, 60) || undefined })} placeholder="Autor (opcional)" className={input} />
      </div>
      <div className="px-3 mt-2 grid grid-cols-3 gap-1.5">
        {(['piratas', 'objetos', 'islas'] as Pestana[]).map((p) => (
          <button key={p} onClick={() => setPestana(p)}
            className={`rounded-xl py-1.5 text-[11.5px] font-black uppercase tracking-wide ${pestana === p ? 'bg-violet-400 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>
            {p === 'piratas' ? 'Piratas' : p === 'objetos' ? 'Objetos' : 'Islas'}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-3 py-3">
        {pestana === 'piratas' && (
          <div className="flex flex-col gap-3">
            <Grupo titulo="Capitán" defs={[capi]} mod={mod} onSel={setSel} />
            <Grupo titulo="Taberna" defs={PIRATAS.filter((d) => d.desbloqueaIsla == null)} mod={mod} onSel={setSel} />
            <Grupo titulo="Jefes de isla" defs={PIRATAS.filter((d) => d.desbloqueaIsla != null)} mod={mod} onSel={setSel} />
            <Grupo titulo="Rivales de las islas" defs={RIVALES} mod={mod} onSel={setSel} />
          </div>
        )}
        {pestana === 'objetos' && <Objetos mod={mod} onCambio={setObjeto} />}
        {pestana === 'islas' && <Islas mod={mod} onIsla={setIsla} onJefe={setJefe} />}
      </div>

      <div className="shrink-0 px-3 pb-3 pt-2 safe-bottom grid grid-cols-2 gap-2 border-t border-slate-800">
        <Boton tono="gris" onClick={() => guardar(false)} disabled={!mod.nombre.trim()}>Guardar</Boton>
        <Boton tono="perla" onClick={() => guardar(true)} disabled={!mod.nombre.trim()}>Guardar y activar</Boton>
      </div>

      {sel && (
        <FichaPirata id={sel} base={sel === 'capitan' ? capi : original(sel)!} valor={mod.piratas[sel] ?? {}}
          onCambio={(p) => setPirata(sel, p)} onCerrar={() => setSel(null)} />
      )}
    </div>
  )
}

function lookCon(base: PirataDef, m?: ModPirata): Look {
  return m?.retrato ? { ...base.look, retrato: m.retrato } : { ...base.look, retrato: undefined }
}

function Grupo({ titulo, defs, mod, onSel }: { titulo: string; defs: PirataDef[]; mod: Mod; onSel: (id: string) => void }) {
  return (
    <div>
      <div className="text-[11px] font-black uppercase tracking-wide text-slate-400 mb-1.5">{titulo}</div>
      <div className="grid grid-cols-4 gap-2">
        {defs.map((d0) => {
          const d = d0.id === 'capitan' ? d0 : original(d0.id)!
          const m = mod.piratas[d.id]
          return (
            <button key={d.id} onClick={() => onSel(d.id)} className="relative flex flex-col items-center active:scale-95">
              <PirateFace look={lookCon(d, m)} rareza={d.rareza} size={68} className="w-full h-auto" />
              {m && <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-violet-400 ring-2 ring-slate-950" />}
              <span className={`mt-0.5 text-[9.5px] font-bold truncate w-full text-center ${m?.nombre || m?.apodo ? 'text-violet-200' : 'text-slate-300'}`}>
                {d.id === 'capitan' ? 'Capitán' : m?.nombre || d.nombre}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FichaPirata({ id, base, valor, onCambio, onCerrar }: {
  id: string; base: PirataDef; valor: ModPirata; onCambio: (p: ModPirata | undefined) => void; onCerrar: () => void
}) {
  const archivo = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const esCapi = id === 'capitan'
  const set = (patch: Partial<ModPirata>) => onCambio({ ...valor, ...patch })
  const setEsp = (patch: Partial<NonNullable<ModPirata['especial']>>) => onCambio({ ...valor, especial: { ...valor.especial, ...patch } })
  const kindEf: SkillKind = valor.especial?.kind ?? base.skill.kind

  return (
    <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onCerrar}>
      <div className="w-full max-w-sm max-h-[94%] overflow-y-auto no-scrollbar rounded-t-3xl sm:rounded-3xl border border-violet-500/40 bg-slate-900 p-4 safe-bottom animate-pop-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-3">
          <div className="flex flex-col items-center gap-1.5">
            <PirateFace look={lookCon(base, valor)} rareza={base.rareza} size={96} />
            <div className="flex gap-1"><RarezaChip rareza={base.rareza} /><ClaseChip clase={base.clase} corto /></div>
          </div>
          <div className="min-w-0 flex-1 flex flex-col gap-1.5">
            <Boton tono="perla" className="!py-1.5 !text-[11px]" onClick={() => archivo.current?.click()}>Subir imagen</Boton>
            <div className="flex gap-1">
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="o pega una URL https://…" className={`${input} !py-1.5 !text-[11.5px]`} />
              <button onClick={() => { const v = imagenValida(url.trim()); if (v) { set({ retrato: v }); setUrl(''); setError(null) } else setError('La URL tiene que empezar por https:// y ser una imagen.') }}
                className="shrink-0 rounded-lg bg-slate-700 px-2 text-[11px] font-black text-slate-100">OK</button>
            </div>
            {valor.retrato && <button onClick={() => set({ retrato: undefined })} className="text-left text-[11px] font-bold text-rose-300">Quitar imagen (vuelve el dibujo)</button>}
            {error && <div className="text-[11px] text-rose-300">{error}</div>}
            <div className="text-[10px] text-slate-500 leading-snug">Se recorta en cuadrado. Mejor una cara centrada.</div>
          </div>
        </div>
        <input ref={archivo} type="file" accept="image/*" className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) reducirImagen(f).then((r) => { set({ retrato: r }); setError(null) }).catch((err: Error) => setError(err.message))
          }} />

        <div className="mt-3 grid grid-cols-2 gap-2">
          {!esCapi && <Campo etiqueta="Nombre"><input value={valor.nombre ?? ''} onChange={(e) => set({ nombre: e.target.value.slice(0, 60) })} placeholder={base.nombre} className={input} /></Campo>}
          <Campo etiqueta={esCapi ? 'Título (tras tu nombre)' : 'Apodo'} ancho={esCapi}>
            <input value={valor.apodo ?? ''} onChange={(e) => set({ apodo: e.target.value.slice(0, 60) })} placeholder={base.apodo || '—'} className={input} />
          </Campo>
        </div>
        {!id.startsWith('r-') && (
          <Campo etiqueta="Frase al unirse">
            <textarea value={valor.frase ?? ''} onChange={(e) => set({ frase: e.target.value.slice(0, 400) })} rows={2} placeholder={base.frase || '—'} className={input} />
          </Campo>
        )}

        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 flex flex-col gap-2">
          <div className="text-[10.5px] font-black uppercase tracking-wide text-amber-300">Lo que hace · su especial</div>
          <Campo etiqueta="Nombre del especial"><input value={valor.especial?.nombre ?? ''} onChange={(e) => setEsp({ nombre: e.target.value.slice(0, 60) })} placeholder={base.skill.nombre} className={input} /></Campo>
          <Campo etiqueta="Efecto">
            <select value={valor.especial?.kind ?? ''} onChange={(e) => setEsp({ kind: (e.target.value || undefined) as SkillKind | undefined })} className={input}>
              <option value="">Original · {TIPOS_ESPECIAL.find((t) => t.kind === base.skill.kind)?.nombre}</option>
              {TIPOS_ESPECIAL.map((t) => <option key={t.kind} value={t.kind}>{t.nombre} — {t.desc}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Descripción">
            <input value={valor.especial?.desc ?? ''} onChange={(e) => setEsp({ desc: e.target.value.slice(0, 400) })}
              placeholder={valor.especial?.kind ? TIPOS_ESPECIAL.find((t) => t.kind === kindEf)!.desc : base.skill.desc} className={input} />
          </Campo>
          <div className="text-[10px] text-slate-500">La potencia se ajusta sola a la rareza: cambiar el efecto no rompe el equilibrio.</div>
        </div>

        <div className="mt-2 text-[10.5px] text-slate-500">
          Oficio {CLASE_INFO[base.clase].nombre} · rareza {RAREZA_INFO[base.rareza].nombre}. Las estadísticas son fijas.
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Boton tono="gris" onClick={() => onCambio(undefined)}>Restaurar original</Boton>
          <Boton onClick={onCerrar}>Listo</Boton>
        </div>
      </div>
    </div>
  )
}

function Campo({ etiqueta, children, ancho }: { etiqueta: string; children: React.ReactNode; ancho?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${ancho ? 'col-span-2' : ''}`}>
      <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">{etiqueta}</span>
      {children}
    </label>
  )
}

const RAREZAS: Rareza[] = ['C', 'R', 'E', 'L']

function Objetos({ mod, onCambio }: { mod: Mod; onCambio: (k: string, o: ModObjeto) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11.5px] text-slate-400 leading-snug">Cambia el nombre o el icono de cada objeto. El bonus (ataque o vida y defensa) depende de la rareza y no cambia.</div>
      {(['arma', 'amuleto'] as TipoPieza[]).map((tipo) => (
        <div key={tipo}>
          <div className="text-[11px] font-black uppercase tracking-wide text-slate-400 mb-1.5">{tipo === 'arma' ? 'Armas · +ataque' : 'Amuletos · +vida y defensa'}</div>
          <div className="flex flex-col gap-1.5">
            {RAREZAS.flatMap((r) => NOMBRES[tipo][r].map((n) => (
              <FilaObjeto key={n} original={n} rareza={r} valor={mod.objetos[n] ?? {}} onCambio={(o) => onCambio(n, o)} />
            )))}
          </div>
        </div>
      ))}
    </div>
  )
}

function FilaObjeto({ original: orig, rareza, valor, onCambio }: { original: string; rareza: Rareza; valor: ModObjeto; onCambio: (o: ModObjeto) => void }) {
  const archivo = useRef<HTMLInputElement>(null)
  const c = RAREZA_INFO[rareza].color
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => (valor.imagen ? onCambio({ ...valor, imagen: undefined }) : archivo.current?.click())}
        title={valor.imagen ? 'Quitar icono' : 'Subir icono'}
        className="shrink-0 w-10 h-10 rounded-lg border-2 overflow-hidden grid place-items-center text-[16px] text-slate-500"
        style={{ borderColor: c, background: `${c}22` }}>
        {valor.imagen ? <img src={valor.imagen} alt="" className="w-full h-full object-cover" /> : '+'}
      </button>
      <input ref={archivo} type="file" accept="image/*" className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void reducirImagen(f, 96).then((img) => onCambio({ ...valor, imagen: img })).catch(() => undefined)
        }} />
      <input value={valor.nombre ?? ''} onChange={(e) => onCambio({ ...valor, nombre: e.target.value.slice(0, 60) })} placeholder={orig} className={`${input} !py-1.5`} />
    </div>
  )
}

function Islas({ mod, onIsla, onJefe }: { mod: Mod; onIsla: (i: number, o: ModIsla) => void; onJefe: (id: string, frase: string) => void }) {
  const [abierta, setAbierta] = useState(0)
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 6 }, (_, i) => {
        const o = islaOriginal(i)
        const v = mod.islas[String(i)] ?? {}
        const jefe = PIRATAS.find((d) => d.desbloqueaIsla === i)!
        const set = (patch: Partial<ModIsla>) => onIsla(i, { ...v, ...patch })
        return (
          <div key={i} className="rounded-2xl border border-slate-700/80 bg-slate-900/70">
            <button onClick={() => setAbierta(abierta === i ? -1 : i)} className="w-full flex items-center justify-between px-3 py-2.5">
              <span className="text-[13px] font-black" style={{ color: o.color }}>{i + 1}. {v.nombre || o.nombre}</span>
              <span className="text-slate-500 text-[12px]">{abierta === i ? '▲' : '▼'}</span>
            </button>
            {abierta === i && (
              <div className="px-3 pb-3 flex flex-col gap-2">
                <Campo etiqueta="Nombre de la isla"><input value={v.nombre ?? ''} onChange={(e) => set({ nombre: e.target.value.slice(0, 60) })} placeholder={o.nombre} className={input} /></Campo>
                <Campo etiqueta="Lema"><input value={v.lema ?? ''} onChange={(e) => set({ lema: e.target.value.slice(0, 400) })} placeholder={o.lema} className={input} /></Campo>
                <Campo etiqueta="Historia al llegar (un párrafo por línea)">
                  <textarea rows={4} value={(v.intro ?? []).join('\n')} onChange={(e) => set({ intro: e.target.value.split('\n').slice(0, 6) })}
                    placeholder={o.intro.join('\n')} className={input} />
                </Campo>
                <div className="grid grid-cols-2 gap-2">
                  {o.fases.map((f, k) => (
                    <Campo key={k} etiqueta={k === 3 ? 'Guarida del jefe' : `Escenario ${k + 1}`}>
                      <input value={v.fases?.[k] ?? ''} onChange={(e) => { const fases = [...(v.fases ?? ['', '', '', ''])]; fases[k] = e.target.value.slice(0, 60); set({ fases }) }}
                        placeholder={f.nombre} className={input} />
                    </Campo>
                  ))}
                </div>
                <Campo etiqueta={`Frase del jefe (${jefe.nombre} ${jefe.apodo}) antes de pelear`}>
                  <input value={mod.jefes[jefe.id] ?? ''} onChange={(e) => onJefe(jefe.id, e.target.value.slice(0, 400))} placeholder={fraseOriginal(jefe.id)} className={input} />
                </Campo>
                <div className="text-[10px] text-slate-500">El retrato y el nombre del jefe se cambian en la pestaña Piratas.</div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
