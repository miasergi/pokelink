// AJUSTES del modo, en una hoja que se abre desde la cabecera.
//
// Los ajustes generales del juego viven en la pantalla de Inicio, pero desde
// dentro de una partida no se llega a ellos sin abandonar el torneo. Aquí están
// los que importan mientras juegas: ritmo del partido, ayudas y sonido.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { useSettings } from '@/state/settingsStore'
import { useInazuma } from '@/state/inazumaStore'
import { markOnboarded } from '@/ui/inazuma/ExtraViews'

/** Fila de interruptor. */
function Toggle({ label, hint, on, onClick }: {
  label: string
  hint?: string
  on: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-left active:scale-[0.99] transition"
    >
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-bold">{label}</div>
        {hint && <div className="text-[10px] text-slate-400 leading-snug">{hint}</div>}
      </div>
      <span
        className={`shrink-0 w-10 h-6 rounded-full border transition ${
          on ? 'bg-emerald-500/30 border-emerald-400/70' : 'bg-slate-700/60 border-slate-600'
        }`}
      >
        <span
          className={`block w-4 h-4 rounded-full bg-white mt-[3px] transition-all ${on ? 'ml-[22px]' : 'ml-[3px]'}`}
        />
      </span>
    </button>
  )
}

export function SettingsButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 grid place-items-center w-8 h-8 rounded-lg border border-slate-700 bg-slate-800/60 text-slate-300 active:scale-95 transition"
        title="Ajustes"
      >
        <Icon name="gear" className="w-4 h-4" />
      </button>
      {open && <SettingsSheet onClose={() => setOpen(false)} />}
    </>
  )
}

export default function SettingsSheet({ onClose }: { onClose: () => void }) {
  const {
    sound, music, showOdds, toggleSound, toggleMusic, toggleShowOdds,
  } = useSettings()
  const { speed, setSpeed, setAutoPlay, abandonTournament, exitInazuma } = useInazuma()
  const { inazumaMode, setInazumaMode } = useSettings()
  const [confirm, setConfirm] = useState(false)

  // El ritmo se guarda como milisegundos entre jugadas: menos es más rápido.
  const SPEEDS: { label: string; ms: number }[] = [
    { label: '×1', ms: 1100 },
    { label: '×2', ms: 450 },
    { label: '×4', ms: 220 },
  ]

  // PORTAL a <body>: el botón vive dentro de la cabecera, que lleva
  // `backdrop-blur`, y un `backdrop-filter` convierte a sus descendientes
  // `fixed` en relativos A LA CABECERA — la hoja se pintaba fuera de pantalla
  // (bbox con y negativa). Desde el body, `fixed` vuelve a ser la ventana.
  return createPortal(
    <div className="fixed inset-0 z-[95]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md max-h-[86svh] overflow-y-auto rounded-t-3xl border-t border-x border-slate-700 bg-slate-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-3">
          <Icon name="gear" className="w-5 h-5 text-amber-300" />
          <h2 className="font-extrabold">Ajustes</h2>
          <button className="ml-auto text-slate-500" onClick={onClose}>
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-1.5">Ritmo del partido</div>
        <div className="flex gap-1.5 mb-3">
          {SPEEDS.map((s) => (
            <button
              key={s.ms}
              onClick={() => setSpeed(s.ms)}
              className={`flex-1 rounded-xl border py-2 text-[13px] font-bold transition active:scale-95 ${
                speed === s.ms
                  ? 'border-amber-500/70 bg-amber-500/15 text-amber-200'
                  : 'border-slate-700 bg-slate-800/60 text-slate-400'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="text-[11px] uppercase tracking-widest text-slate-500 mb-1.5">Decisiones en el partido</div>
        <div className="flex gap-1.5 mb-1">
          {([
            ['auto', 'Auto'],
            ['dinamico', 'Dinámico'],
            ['completo', 'Completo'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setInazumaMode(id); if (id === 'auto') setAutoPlay(true); else setAutoPlay(false) }}
              className={`flex-1 rounded-xl border py-2 text-[12px] font-bold transition active:scale-95 ${
                inazumaMode === id
                  ? 'border-amber-500/70 bg-amber-500/15 text-amber-200'
                  : 'border-slate-700 bg-slate-800/60 text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 mb-3 leading-snug">
          {inazumaMode === 'auto'
            ? 'El banquillo lo juega todo: te sientas a mirar.'
            : inazumaMode === 'completo'
              ? 'TODAS las acciones pasan por ti, duelo a duelo. Partidos largos.'
              : 'Decides en las jugadas con chicha (tiros, técnicas); el resto fluye.'}
        </p>

        <div className="flex flex-col gap-1.5">
          <Toggle
            label="Mostrar porcentajes"
            hint="Junto a las estrellas de cada opción, la probabilidad real."
            on={showOdds}
            onClick={toggleShowOdds}
          />
          <Toggle label="Sonido" on={sound} onClick={toggleSound} />
          <Toggle label="Música" on={music} onClick={toggleMusic} />
        </div>

        <div className="text-[11px] uppercase tracking-widest text-slate-500 mt-4 mb-1.5">Partida</div>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => { markOnboarded(false); onClose() }}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-left text-[13px] font-bold active:scale-[0.99] transition"
          >
            Volver a ver el tutorial
            <div className="text-[10px] text-slate-400 font-normal">Se abrirá la próxima vez que entres al modo.</div>
          </button>

          {confirm ? (
            <div className="rounded-xl border border-rose-600/60 bg-rose-500/10 p-3">
              <p className="text-[12px] text-rose-200 mb-2">
                Se borra el torneo entero y vuelves al título. No hay vuelta atrás.
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" full onClick={() => setConfirm(false)}>Mejor no</Button>
                <Button variant="danger" full onClick={() => { void abandonTournament(); onClose() }}>Abandonar</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirm(true)}
              className="w-full rounded-xl border border-rose-700/50 bg-rose-500/5 px-3 py-2.5 text-left text-[13px] font-bold text-rose-300 active:scale-[0.99] transition"
            >
              Abandonar el torneo
            </button>
          )}
        </div>

        <Button variant="secondary" full className="mt-3" onClick={() => { exitInazuma(); onClose() }}>
          <span className="inline-flex items-center justify-center gap-1.5">
            <Icon name="home" className="w-4 h-4" /> Salir a Inicio
          </span>
        </Button>
      </div>
    </div>,
    document.body,
  )
}
