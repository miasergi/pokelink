// LESIONES EN PANTALLA, con la seriedad que merecen:
//  - `InjuryRogueOverlay`: modal del ROGUE (entrenamientos y eventos) — se
//    queda hasta que lo cierras, que un toast entre mensajes se perdía.
//  - `InjuryBanner`: el aviso del PARTIDO — overlay grande que se retira solo
//    (el partido no puede quedarse esperando un botón).
import { createPortal } from 'react-dom'
import { Button, ImgFallback } from '@/ui/components/kit'
import { useInazuma } from '@/state/inazumaStore'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import { InjuryCross } from '@/ui/inazuma/Glyphs'

/** La ficha del caído: retrato apagado con su cruz encima. */
function InjuredFace({ baseId, name, size = 'w-20 h-20' }: { baseId: string; name: string; size?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`relative ${size}`}>
        <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-rose-500/70 bg-slate-900 grid place-items-center">
          <ImgFallback
            src={portraitUrl(baseId)}
            className="w-full h-full object-cover object-top grayscale-[.7] opacity-80"
            alt={name}
            fallback={<span className="text-lg font-extrabold text-slate-400">{name.slice(0, 2).toUpperCase()}</span>}
          />
        </div>
        <InjuryCross className="absolute -top-2 -right-2 w-7 h-7 drop-shadow" />
      </div>
      <div className="text-[13px] font-extrabold text-rose-100">{name}</div>
    </div>
  )
}

/** MODAL del rogue: quién ha caído en el entrenamiento. Cierra el usuario. */
export default function InjuryRogueOverlay() {
  const { injuredFx, clearInjuredFx } = useInazuma()
  if (!injuredFx?.length) return null
  return createPortal(
    <div className="fixed inset-0 z-[94] bg-black/80 backdrop-blur-sm grid place-items-center p-5">
      <div className="w-full max-w-sm rounded-3xl border-2 border-rose-500/60 bg-slate-900 p-5 text-center animate-pop-in"
        style={{ boxShadow: '0 0 40px rgba(244,63,94,.35)' }}>
        <div className="text-xl font-black uppercase tracking-widest text-rose-400 mb-3">¡Lesión!</div>
        <div className="flex justify-center gap-4 flex-wrap mb-3">
          {injuredFx.map((r) => <InjuredFace key={r.baseId + r.name} baseId={r.baseId} name={r.name} />)}
        </div>
        <p className="text-[11px] text-slate-400 leading-snug mb-4">
          {injuredFx.length === 1 ? 'No jugará ni entrenará' : 'No jugarán ni entrenarán'} hasta pasar por el
          fisio (plan de la rueda, objeto o descanso) o terminar el próximo partido oficial.
        </p>
        <Button variant="primary" full onClick={clearInjuredFx}>Aceptar</Button>
      </div>
    </div>,
    document.body,
  )
}

/** AVISO del partido: grande, encima del césped, y se retira solo. */
export function InjuryBanner({ name, baseId }: { name: string; baseId?: string }) {
  return (
    <div className="absolute inset-0 z-[62] grid place-items-center pointer-events-none">
      <div className="absolute inset-0 animate-inazuma-flash" style={{ background: '#7f1d1d' }} />
      <div className="relative flex flex-col items-center gap-2 rounded-3xl border-2 border-rose-500/70 bg-slate-950/90 px-6 py-4 animate-pop-in"
        style={{ boxShadow: '0 0 34px rgba(244,63,94,.45)' }}>
        <div className="text-lg font-black uppercase tracking-widest text-rose-400">¡Lesión!</div>
        <InjuredFace baseId={baseId ?? ''} name={name} size="w-16 h-16" />
        <div className="text-[10px] text-rose-200/80">Se retira a la banda</div>
      </div>
    </div>
  )
}
