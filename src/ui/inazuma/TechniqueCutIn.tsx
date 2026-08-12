// CORTE DE SUPERTÉCNICA: la pantalla que se come el partido cuando alguien
// lanza una técnica, con su imagen real y su nombre.
//
// Es lo que hace que una supertécnica se sienta como tal. El motor no sabe nada
// de esto: la pantalla del partido mira los eventos que van llegando y, cuando
// ve una técnica, la enseña aquí un segundo antes de seguir con la narración.
import { useEffect, useState } from 'react'
import { ImgFallback } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { getTechnique, TECHNIQUES } from '@/data/inazuma/techniques'
import { ELEMENT_ICON, techniqueImage } from '@/ui/inazuma/Glyphs'
import { portraitUrl } from '@/ui/inazuma/PlayerCard'
import type { MatchEvent } from '@/engine/inazuma/types'

/** Cuánto se queda en pantalla. Corto a propósito: no interrumpe el ritmo. */
const HOLD_MS = 1500

export interface CutIn {
  /** Clave única para reiniciar la animación aunque se repita la técnica. */
  key: number
  name: string
  id: string | null
  mine: boolean
  /** Quién la lanza: su nombre y su retrato. */
  playerName?: string
  playerBaseId?: string
}

/**
 * Saca de un evento la técnica que hay que enseñar, si la hay. La comparación
 * es por NOMBRE porque es lo que traen los eventos; se resuelve al catálogo
 * para poder pintar la imagen.
 */
export function cutInFrom(
  event: MatchEvent,
  mineSide: 'home' | 'away',
  seq: number,
  /** Resuelve un uid del partido a su `baseId`, para pintar el retrato. */
  baseOf?: (uid: string) => string | undefined,
): CutIn | null {
  const named = (
    name: string | undefined, mine: boolean, playerName?: string, playerUid?: string,
  ): CutIn | null => {
    if (!name) return null
    const tech = getTechnique(idOf(name)) ?? findByName(name)
    return {
      key: seq,
      name,
      id: tech?.id ?? null,
      mine,
      playerName,
      playerBaseId: playerUid ? baseOf?.(playerUid) : undefined,
    }
  }
  switch (event.kind) {
    case 'duel':
      // La del atacante manda; si solo respondió el defensor, la suya.
      if (event.technique) return named(event.technique, event.side === mineSide, event.attacker, event.attackerUid)
      return named(event.counter, event.side !== mineSide, event.defender, event.defenderUid)
    case 'goal':
      return named(event.technique, event.side === mineSide, event.scorer, event.scorerUid)
    case 'save':
      return named(event.technique, event.side !== mineSide, event.keeper, event.keeperUid)
    case 'penalty':
      return named(event.technique, event.side === mineSide, event.shooter, event.shooterUid)
    default:
      return null
  }
}

const idOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

/** Índice nombre → id, construido una vez: el catálogo no cambia en runtime. */
const BY_NAME = new Map(TECHNIQUES.map((t) => [t.name.toLowerCase(), t.id]))
function findByName(name: string) {
  const id = BY_NAME.get(name.toLowerCase())
  return id ? getTechnique(id) : undefined
}

/** Id de una técnica a partir del nombre que traen los eventos del motor. */
export function techniqueIdByName(name: string): string | null {
  return (getTechnique(idOf(name)) ?? findByName(name))?.id ?? null
}

export default function TechniqueCutIn({ cut, onDone }: { cut: CutIn | null; onDone: () => void }) {
  const [shown, setShown] = useState<CutIn | null>(null)

  useEffect(() => {
    if (!cut) return
    setShown(cut)
    const t = setTimeout(() => { setShown(null); onDone() }, HOLD_MS)
    return () => clearTimeout(t)
  }, [cut, onDone])

  if (!shown) return null
  const tech = shown.id ? getTechnique(shown.id) : undefined
  const info = ELEMENT_INFO[tech?.element ?? 'aire']

  return (
    <div
      key={shown.key}
      className="absolute inset-0 z-[60] grid place-items-center pointer-events-none animate-cutin"
    >
      {/* Bandas diagonales: el recurso de toda la vida del anime. */}
      <div
        className="absolute inset-x-0 h-48"
        style={{
          background: `linear-gradient(90deg, transparent, ${info.color}55 18%, ${info.color}aa 50%, ${info.color}55 82%, transparent)`,
          transform: 'skewY(-6deg)',
        }}
      />
      <div className="relative flex flex-col items-center gap-1.5">
        {/* La técnica, EN GRANDE: es el fotograma estrella del partido. */}
        <div className="relative">
          <div
            className="w-48 h-48 rounded-3xl overflow-hidden border-4 grid place-items-center bg-slate-950 animate-pop-in"
            style={{ borderColor: info.color, boxShadow: `0 0 40px ${info.color}` }}
          >
            <ImgFallback
              src={shown.id ? techniqueImage(shown.id) : ''}
              alt={shown.name}
              className="w-full h-full object-cover"
              fallback={<Icon name={ELEMENT_ICON[tech?.element ?? 'aire']} className="w-20 h-20" style={{ color: info.color }} />}
            />
          </div>
          {/* Quien la lanza, asomando por la esquina como en los cortes del anime. */}
          {shown.playerBaseId && (
            <div
              className="absolute -bottom-3 -left-4 w-16 h-16 rounded-full overflow-hidden border-4 bg-slate-900 shadow-xl"
              style={{ borderColor: shown.mine ? '#22c55e' : '#f43f5e' }}
            >
              <ImgFallback
                src={portraitUrl(shown.playerBaseId)}
                alt={shown.playerName ?? ''}
                className="w-full h-full object-cover"
                fallback={<span className="grid place-items-center w-full h-full text-sm font-extrabold text-white">
                  {(shown.playerName ?? '?').slice(0, 2).toUpperCase()}
                </span>}
              />
            </div>
          )}
        </div>
        <div
          className="px-4 py-1 rounded-full text-base font-extrabold uppercase tracking-wider bg-slate-950/85 border"
          style={{ color: info.color, borderColor: `${info.color}88` }}
        >
          {shown.name}
        </div>
        {shown.playerName && (
          <div
            className="px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-slate-950/80 border"
            style={{ borderColor: shown.mine ? '#22c55e88' : '#f43f5e88', color: shown.mine ? '#bbf7d0' : '#fecdd3' }}
          >
            {shown.playerName}
          </div>
        )}
      </div>
    </div>
  )
}
