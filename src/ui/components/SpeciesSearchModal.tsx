import { useEffect, useMemo, useRef, useState } from 'react'
import type { SpeciesData } from '@/types'
import Sprite from '@/ui/components/Sprite'
import TypeBadge from '@/ui/components/TypeBadge'
import { Button } from '@/ui/components/kit'

/** Normaliza para buscar: sin tildes, sin mayúsculas y sin signos (Nidoran♀,
 *  Porygon-Z, Mr. Mime...). Así "nidoran", "porygon z" o "mr mime" encuentran. */
export function searchKey(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Puntúa una especie contra la consulta. Menor = mejor.
 * Prioriza que EMPIECE por lo escrito (escribes "cha" y sale Charmander antes
 * que Pikachu), luego que lo contenga, y a igualdad ordena por nº de Pokédex.
 * Devuelve null si no casa.
 */
function score(sp: SpeciesData, q: string): number | null {
  const name = searchKey(sp.displayName)
  if (!q) return sp.id
  const i = name.indexOf(q)
  if (i === 0) return sp.id / 10000 // empieza por: lo mejor
  if (i > 0) return 1 + i + sp.id / 10000 // lo contiene
  if (String(sp.id) === q) return 0.5 // búsqueda por número de Pokédex
  return null
}

export default function SpeciesSearchModal({
  pool, onPick, onClose, title = 'Elige tu Pokémon',
}: {
  pool: SpeciesData[]
  onPick: (id: number) => void
  onClose: () => void
  title?: string
}) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Foco automático: se escribe nada más abrir, sin tener que tocar el campo.
  useEffect(() => { inputRef.current?.focus() }, [])

  const results = useMemo(() => {
    const key = searchKey(q)
    return pool
      .map((sp) => ({ sp, s: score(sp, key) }))
      .filter((r): r is { sp: SpeciesData; s: number } => r.s !== null)
      .sort((a, b) => a.s - b.s)
      .slice(0, 60) // el listado es largo: recortamos para que el scroll vuele
      .map((r) => r.sp)
  }, [pool, q])

  // Sugerencia inline: el primer resultado que EMPIEZA por lo escrito.
  const hint = useMemo(() => {
    const key = searchKey(q)
    if (!key) return null
    const first = results[0]
    if (!first) return null
    return searchKey(first.displayName).startsWith(key) ? first.displayName : null
  }, [results, q])

  return (
    <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col" onClick={onClose}>
      <div
        className="m-3 mt-6 flex flex-col min-h-0 flex-1 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(180deg, rgba(30,41,59,0.98), rgba(15,23,42,0.99))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b border-slate-700/70">
          <div className="flex items-center justify-between mb-2">
            <div className="font-extrabold">{title}</div>
            <button onClick={onClose} className="text-slate-400 text-xl leading-none px-2" aria-label="Cerrar">×</button>
          </div>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Escribe un nombre o un nº de Pokédex…"
            className="w-full rounded-xl bg-slate-900/80 border border-slate-600 px-3 py-2.5 text-base outline-none focus:border-red-400"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
          />
          <div className="text-[11px] mt-1 h-4 text-slate-500">
            {hint && searchKey(hint) !== searchKey(q)
              ? <>¿<button className="text-amber-300 font-bold" onClick={() => setQ(hint)}>{hint}</button>?</>
              : `${results.length}${results.length === 60 ? '+' : ''} resultado${results.length === 1 ? '' : 's'}`}
          </div>
        </div>

        {/* content-start: sin esto la rejilla reparte el alto y con pocos
            resultados salían flotando en mitad de la pantalla. */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-2 grid gap-1.5 content-start">
          {results.length === 0 && (
            <div className="text-center text-slate-500 text-sm py-8 px-6">
              Ningún Pokémon coincide con «{q}».
              <div className="text-[11px] mt-1.5">
                Solo salen los de las regiones que elegiste (y sin legendarios).
              </div>
            </div>
          )}
          {results.map((sp) => (
            <button
              key={sp.id}
              onClick={() => onPick(sp.id)}
              className="flex items-center gap-3 rounded-xl px-2 py-1.5 bg-slate-800/60 border border-slate-700/60 active:scale-[0.99] text-left"
            >
              {/* "front" (pixel art) y no el artwork: son 60 imágenes a la vez,
                  y estas pesan ~1 KB y las sirve el propio juego. */}
              <Sprite speciesId={sp.id} variant="front" className="w-12 h-12 object-contain shrink-0 [image-rendering:pixelated]" />
              <div className="min-w-0 flex-1">
                <div className="font-bold truncate">
                  <span className="text-slate-500 text-[11px] tabular-nums mr-1">#{sp.id}</span>
                  {sp.displayName}
                </div>
                <div className="flex gap-1 mt-0.5">
                  {sp.types.map((t) => <TypeBadge key={t} type={t} />)}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="p-3 safe-bottom border-t border-slate-700/70">
          <Button full variant="secondary" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  )
}
