// 00 — EL MANIFIESTO. Lo primero que pasa a las 10:00: Óscar lo lee a cámara,
// de pie y sin reírse, y con eso se abre el directo (reto `ina-1`, 5 puntos).
//
// Va antes del programa porque en el orden del día va antes que todo, y lleva
// número 00 para no renumerar las cinco secciones que ya existían.
//
// El MODO LECTURA existe por un motivo práctico: a las diez de la mañana nadie
// quiere estar haciendo scroll en un móvil delante de una cámara. Se pulsa, se
// pone el texto enorme sobre negro y se lee de un tirón.
import { useEffect, useState } from 'react'
import { MANIFIESTO } from '@/data/despedida'
import { play } from '@/utils/sfx'
import { Sticker } from './Memes'
import { meme } from '@/data/memes'
import { Antetitulo, FILETE, LIMA, NEGRO, Seccion } from './despedidaKit'

export default function ManifiestoSection() {
  const [leyendo, setLeyendo] = useState(false)

  return (
    <>
      <Seccion
        id="manifiesto"
        n="00"
        titulo="El manifiesto"
        apunte="Se lee a cámara antes de empezar, de pie y sin reírse. Si se ríe, se repite. Son cinco puntos y es la primera vez que va a mirar a la cámara sabiendo que ya no manda."
        sticker={<Sticker meme={meme('resignado')!} ancho={140} giro={-4} />}
      >
        <div className="border" style={{ borderColor: FILETE, background: '#0B0B0E' }}>
          <div className="p-6 sm:p-10 lg:p-14">
            <p className="font-festui text-[14px] sm:text-lg text-zinc-300 leading-relaxed max-w-3xl">
              {MANIFIESTO.entradilla}
            </p>

            <ol className="mt-8 sm:mt-10 border-t" style={{ borderColor: FILETE }}>
              {MANIFIESTO.articulos.map((t, i) => (
                <li
                  key={i}
                  className="flex items-baseline gap-4 sm:gap-7 py-4 sm:py-5 border-b"
                  style={{ borderColor: FILETE }}
                >
                  <span
                    className="font-fest text-xl sm:text-3xl leading-none tabular-nums shrink-0 w-8 sm:w-12"
                    style={{ color: LIMA }}
                  >
                    {romano(i + 1)}
                  </span>
                  <span className="font-festui text-[14px] sm:text-[17px] text-zinc-200 leading-snug">{t}</span>
                </li>
              ))}
            </ol>

            <p className="font-festui text-[13px] sm:text-[15px] italic text-zinc-500 mt-8">{MANIFIESTO.cierre}</p>
            <p className="font-fest uppercase text-white text-2xl sm:text-4xl leading-none mt-3">Óscar</p>
            <p className="font-festui text-[10.5px] font-bold uppercase tracking-[0.22em] text-zinc-600 mt-2">
              {MANIFIESTO.firma}
            </p>
          </div>

          <button
            onClick={() => { play('confirm'); setLeyendo(true) }}
            className="w-full font-festui text-[12px] font-bold uppercase tracking-[0.24em] py-5 transition active:scale-[0.99] hover:brightness-110"
            style={{ background: LIMA, color: NEGRO }}
          >
            Modo lectura · a pantalla completa
          </button>
        </div>
      </Seccion>

      {leyendo && <Lectura onSalir={() => setLeyendo(false)} />}
    </>
  )
}

/**
 * A pantalla completa y en grande, para leerlo a cámara sin pelearse con el
 * móvil. No se cierra tocando en cualquier sitio: a mitad del artículo VI se
 * cerraría solo de un roce.
 */
function Lectura({ onSalir }: { onSalir: () => void }) {
  // Con el manifiesto puesto la pantalla no se apaga: son dos minutos de leer
  // sin tocar nada y el móvil se bloquearía justo por el artículo cuatro.
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null
    let vivo = true
    void navigator.wakeLock?.request('screen').then((s) => {
      if (!vivo) { void s.release(); return }
      sentinel = s
    }).catch(() => { /* sin wake lock: que alguien le dé al móvil de vez en cuando */ })
    return () => { vivo = false; void sentinel?.release().catch(() => {}) }
  }, [])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onSalir() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onSalir])

  return (
    <div className="fixed inset-0 z-[55] overflow-y-auto no-scrollbar font-festui" style={{ background: NEGRO }}>
      <div className="min-h-full max-w-4xl mx-auto px-6 sm:px-10 py-16 sm:py-24">
        <div className="flex items-center justify-between gap-4">
          <Antetitulo color={LIMA}>El manifiesto</Antetitulo>
          <button
            onClick={() => { play('tap'); onSalir() }}
            className="font-festui text-[11px] font-bold uppercase tracking-[0.2em] px-4 py-2.5 border text-zinc-400 hover:text-white transition"
            style={{ borderColor: FILETE }}
          >
            Cerrar
          </button>
        </div>

        <p className="text-[18px] sm:text-[26px] text-zinc-300 leading-snug mt-10">{MANIFIESTO.entradilla}</p>

        <ol className="mt-10 sm:mt-14 flex flex-col gap-8 sm:gap-12">
          {MANIFIESTO.articulos.map((t, i) => (
            <li key={i} className="flex items-baseline gap-5 sm:gap-9">
              <span
                className="font-fest text-3xl sm:text-6xl leading-none tabular-nums shrink-0 w-12 sm:w-24"
                style={{ color: LIMA }}
              >
                {romano(i + 1)}
              </span>
              <span className="text-[19px] sm:text-[30px] text-white leading-snug">{t}</span>
            </li>
          ))}
        </ol>

        <div className="border-t mt-14 sm:mt-20 pt-8" style={{ borderColor: FILETE }}>
          <p className="text-[16px] sm:text-[22px] italic text-zinc-500">{MANIFIESTO.cierre}</p>
          <p className="font-fest uppercase text-white text-5xl sm:text-8xl leading-none mt-4">Óscar</p>
          <p className="text-[10.5px] sm:text-[12px] font-bold uppercase tracking-[0.22em] text-zinc-600 mt-4">
            {MANIFIESTO.firma}
          </p>
        </div>
      </div>
    </div>
  )
}

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

/** Numeración de acta notarial: el chiste es que esto parezca serio. */
function romano(n: number) {
  return ROMANOS[n - 1] ?? String(n)
}
