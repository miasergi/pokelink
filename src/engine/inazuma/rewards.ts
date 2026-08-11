// Recompensas: las cartas que se ofrecen tras un partido y en el ojeador.
// Puro: decide QUÉ se ofrece; aplicar la elección es cosa del store (necesita
// que el usuario señale a quién entrenar o a quién equipar).
import type { RNG } from '@/utils/rng'
import { ITEMS } from '@/data/inazuma/items'
import { getPlayerBase } from '@/data/inazuma/players'
import { getTechnique, TECHNIQUES } from '@/data/inazuma/techniques'
import { signablePool, transferValue } from './roster'
import type { DraftOption, InazumaSave, PlayerBase } from './types'
import { beatenTeams } from './tournament'

const RARITY_STARS = ['', '★', '★★', '★★★', '★★★★', '★★★★★']

/** Nivel al que llega un fichaje: el del resto de tu plantilla, para que sirva. */
export function signingLevel(save: InazumaSave): number {
  if (!save.roster.length) return 8
  const avg = save.roster.reduce((a, p) => a + p.level, 0) / save.roster.length
  return Math.max(6, Math.round(avg))
}

/**
 * Peso de rareza según lo avanzado que vaya el torneo: al principio no aparecen
 * leyendas (arruinaría la curva) y al final no aparecen suplentes (no servirían
 * de nada).
 */
function rarityWeight(rarity: number, round: number): number {
  const progress = Math.min(1, round / 12)
  const target = 1.6 + progress * 2.6 // 1.6 → 4.2
  const d = Math.abs(rarity - target)
  return Math.max(0.05, 1 - d * 0.42)
}

function weightedPick<T>(items: T[], weight: (t: T) => number, rng: RNG): T | undefined {
  const total = items.reduce((a, t) => a + weight(t), 0)
  if (total <= 0) return items[0]
  let r = rng.next() * total
  for (const t of items) {
    r -= weight(t)
    if (r <= 0) return t
  }
  return items[items.length - 1]
}

/** Jugadores fichables ahora mismo, sin repetir los que ya tienes. */
export function availableSignings(save: InazumaSave): PlayerBase[] {
  const owned = new Set(save.roster.map((p) => p.baseId))
  return signablePool(beatenTeams(save.round)).filter((p) => !owned.has(p.id))
}

function signingOption(save: InazumaSave, rng: RNG, exclude: Set<string>): DraftOption | null {
  const pool = availableSignings(save).filter((p) => !exclude.has(p.id))
  if (!pool.length) return null
  const pick = weightedPick(pool, (p) => rarityWeight(p.rarity, save.round), rng)
  if (!pick) return null
  exclude.add(pick.id)
  const level = signingLevel(save)
  return {
    kind: 'fichaje',
    id: `sign-${pick.id}`,
    title: `Fichar a ${pick.name}`,
    desc: `${RARITY_STARS[pick.rarity]} · ${pick.position} · valor ${transferValue(pick, level).toLocaleString('es-ES')} ₽`,
    playerId: pick.id,
    level,
  }
}

/** Las tres fichas del ojeador. Todas son fichajes: es su razón de existir. */
export function buildScoutOffer(save: InazumaSave, rng: RNG): DraftOption[] {
  const seen = new Set<string>()
  const out: DraftOption[] = []
  for (let i = 0; i < 3; i++) {
    const o = signingOption(save, rng, seen)
    if (o) out.push(o)
  }
  // Si ya has fichado a todo el mundo, el ojeador paga en metálico.
  if (!out.length) {
    out.push({ kind: 'dinero', id: 'scout-cash', title: 'Comisión del ojeador', desc: 'No queda nadie por fichar: te paga la visita', amount: 1500 })
  }
  return out
}

/**
 * Las cartas post-partido: una de fichaje (si queda alguien), una de mejora y
 * una comodín. Siempre se ofrecen tres cosas distintas entre sí.
 */
export function buildDraft(save: InazumaSave, rng: RNG): DraftOption[] {
  const out: DraftOption[] = []
  const seen = new Set<string>()

  const sign = signingOption(save, rng, seen)
  if (sign) out.push(sign)

  // Mejora: entrenamiento o una técnica nueva.
  if (rng.chance(0.5)) {
    out.push({
      kind: 'entrenamiento',
      id: 'draft-train',
      title: 'Sesión extra',
      desc: '+4 niveles a un jugador que elijas',
      levels: 4,
    })
  } else {
    const tech = weightedPick(
      TECHNIQUES.filter((t) => t.power >= 40 && t.power <= 60 + save.round * 5),
      (t) => 1 / (1 + Math.abs(t.power - (45 + save.round * 4)) / 20),
      rng,
    )
    if (tech) {
      out.push({
        kind: 'tecnica',
        id: `draft-tech-${tech.id}`,
        title: `Aprender «${tech.name}»`,
        desc: `${tech.kind} · potencia ${tech.power} · ${tech.cost} PT`,
        techniqueId: tech.id,
      })
    }
  }

  // Comodín: objeto, dinero o descanso.
  const roll = rng.next()
  if (roll < 0.5) {
    const item = weightedPick(
      ITEMS.filter((i) => i.kind !== 'consumible' || save.round < 8),
      (i) => 1 / (1 + Math.abs(i.price - (700 + save.round * 200)) / 700),
      rng,
    )
    if (item) out.push({ kind: 'objeto', id: `draft-item-${item.id}`, title: item.name, desc: item.desc, itemId: item.id })
  } else if (roll < 0.8) {
    const amount = 500 + save.round * 120
    out.push({ kind: 'dinero', id: 'draft-cash', title: `${amount.toLocaleString('es-ES')} ₽`, desc: 'Taquilla y patrocinadores', amount })
  } else {
    out.push({ kind: 'descanso', id: 'draft-rest', title: 'Recuperación completa', desc: 'Toda la plantilla recupera aguante y PT' })
  }

  // Relleno defensivo: si algo devolvió `null`, completa con dinero.
  while (out.length < 3) {
    out.push({ kind: 'dinero', id: `draft-cash-${out.length}`, title: '800 ₽', desc: 'Recaudación del partido', amount: 800 })
  }
  return out
}

/**
 * Técnicas que un jugador puede aprender en un entrenamiento: de su clase
 * (según demarcación) y que no conozca ya.
 */
export function learnableTechniques(baseId: string, known: string[]): string[] {
  const pos = getPlayerBase(baseId).position
  const kind = pos === 'POR' ? 'parada' : pos === 'DEF' ? 'bloqueo' : pos === 'MED' ? 'regate' : 'tiro'
  return TECHNIQUES.filter((t) => t.kind === kind && !known.includes(t.id)).map((t) => t.id)
}

/** ¿Alguna técnica del jugador puede evolucionar con un Manual avanzado? */
export function evolvableTechniques(known: string[]): { from: string; to: string }[] {
  return known
    .map((id) => getTechnique(id))
    .filter((t): t is NonNullable<typeof t> => !!t && !!t.evolvesTo)
    .map((t) => ({ from: t.id, to: t.evolvesTo! }))
}
