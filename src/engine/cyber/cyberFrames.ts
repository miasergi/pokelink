// Eventos del combate Cyber → FOTOGRAMAS animados.
// Mismo patrón que el combate principal (BattleScreen: buildFrames + DURATION +
// cursor temporizado): el motor emite eventos, la UI los reproduce como
// animación. Así el modo Cyber tiene embestidas, números de daño flotantes,
// destellos en críticos, barras de PS que bajan y debilitamiento animado.
import type { ExtType, StatusCondition } from '@/types'
import type { Sfx } from '@/utils/sfx'
import type { CyberEvent, Side } from './types'

/** Efecto flotante sobre un lado (número de daño, eficacia, impacto). */
export interface CyberFx {
  side: Side
  kind: 'damage' | 'heal' | 'noEffect'
  amount: number
  crit?: boolean
  eff?: number
  moveType?: ExtType
}

export interface CyberFrame {
  /** PS de cada lado EN ESTE fotograma (las barras se animan solas al cambiar). */
  hp: Record<Side, number>
  status: Record<Side, StatusCondition>
  message: string
  /** Animación del sprite: golpeado / debilitado. */
  anim: Partial<Record<Side, 'hit' | 'faint'>>
  /** Quién ataca en este fotograma (embestida). */
  acting?: { side: Side; moveName: string; moveType: ExtType }
  fx?: CyberFx
  flash?: string
  sound?: Sfx
  /** Animación de la Poké Ball al capturar. */
  ball?: 'throw' | 'caught' | 'broke'
}

/** Duración (ms) de cada evento. Se divide por `battleSpeed` de los ajustes. */
export const CYBER_DURATION: Record<CyberEvent['kind'], number> = {
  intro: 900,
  move: 520,
  sad: 700,
  miss: 620,
  noEffect: 820,
  damage: 760,
  status: 700,
  statusDamage: 660,
  recover: 620,
  faint: 850,
  heal: 640,
  levelUp: 800,
  sendOut: 700,
  throwBall: 1700, // la ball cae y tiembla (fx-pokeball)
  caught: 1100,
  broke: 900,
  message: 720,
  end: 300,
}

export interface FrameSeed {
  hp: Record<Side, number>
  status: Record<Side, StatusCondition>
}

/**
 * Pliega los eventos en una lista de fotogramas: cada uno es una FOTO completa
 * del combate en ese instante. La UI solo avanza un índice.
 */
export function buildCyberFrames(events: CyberEvent[], seed: FrameSeed): CyberFrame[] {
  const hp: Record<Side, number> = { ...seed.hp }
  const status: Record<Side, StatusCondition> = { ...seed.status }
  const frames: CyberFrame[] = []

  const push = (f: Partial<CyberFrame> & { message: string }) => {
    frames.push({
      hp: { ...hp },
      status: { ...status },
      anim: {},
      ...f,
    })
  }

  for (const ev of events) {
    switch (ev.kind) {
      case 'intro':
      case 'message':
      case 'sendOut':
        push({ message: ev.text })
        break

      case 'move':
        push({
          message: `${ev.moveName.toUpperCase()}`,
          acting: { side: ev.side, moveName: ev.moveName, moveType: ev.moveType },
        })
        break

      case 'sad':
        push({ message: ev.text, sound: 'noEffect' })
        break

      case 'miss':
        push({ message: ev.text })
        break

      case 'noEffect':
        push({
          message: ev.text,
          fx: { side: ev.side, kind: 'noEffect', amount: 0 },
          sound: 'noEffect',
        })
        break

      case 'damage': {
        hp[ev.side] = ev.hp
        const superEff = ev.effectiveness > 1
        push({
          message: ev.crit ? '¡Golpe crítico!' : superEff ? '¡Es supereficaz!' : ev.effectiveness < 1 ? 'No es muy eficaz…' : '',
          anim: { [ev.side]: 'hit' },
          fx: {
            side: ev.side, kind: 'damage', amount: ev.amount,
            crit: ev.crit, eff: ev.effectiveness, moveType: ev.moveType,
          },
          flash: ev.crit ? 'rgba(255,255,255,0.85)' : superEff ? 'rgba(253,224,71,0.6)' : undefined,
          sound: ev.crit ? 'crit' : 'hit',
        })
        break
      }

      case 'status':
        status[ev.side] = ev.status
        push({ message: ev.text, sound: 'status' })
        break

      case 'statusDamage':
        hp[ev.side] = ev.hp
        push({
          message: ev.text,
          anim: { [ev.side]: 'hit' },
          fx: { side: ev.side, kind: 'damage', amount: ev.amount },
          sound: 'hit',
        })
        break

      case 'recover':
        status[ev.side] = 'none'
        push({ message: ev.text, sound: 'heal' })
        break

      case 'heal':
        hp[ev.side] = ev.hp
        push({
          message: ev.text,
          fx: { side: ev.side, kind: 'heal', amount: ev.amount },
          sound: 'heal',
        })
        break

      case 'faint':
        hp[ev.side] = 0
        push({ message: ev.text, anim: { [ev.side]: 'faint' }, sound: 'faint' })
        break

      case 'levelUp':
        push({ message: ev.text, sound: 'levelup' })
        break

      case 'throwBall':
        push({ message: ev.text, ball: 'throw', sound: 'catch' })
        break

      case 'caught':
        push({ message: ev.text, ball: 'caught', sound: 'victory' })
        break

      case 'broke':
        push({ message: ev.text, ball: 'broke', sound: 'noEffect' })
        break

      case 'end':
        push({ message: ev.text, sound: ev.won ? 'victory' : 'defeat' })
        break
    }
  }

  return frames
}

/** Duración total (ms) de una lista de eventos, a velocidad 1×. */
export function totalDuration(events: CyberEvent[]): number {
  return events.reduce((sum, e) => sum + CYBER_DURATION[e.kind], 0)
}
