// Recompensas: las cartas que se ofrecen tras un partido y en el ojeador.
// Puro: decide QUÉ se ofrece; aplicar la elección es cosa del store (necesita
// que el usuario señale a quién entrenar o a quién equipar).
import type { RNG } from '@/utils/rng'
import { ITEMS } from '@/data/inazuma/items'
import { getPlayerBase, PLAYERS } from '@/data/inazuma/players'
import { getTechnique, TECHNIQUES } from '@/data/inazuma/techniques'
import type { DraftOption, InazumaSave, PlayerBase } from './types'
import { bossIndexForLayer } from './tournament'


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
function rarityWeight(rarity: number, bossIndex: number): number {
  const progress = Math.min(1, bossIndex / 7)
  const target = 1.6 + progress * 2.6 // 1.6 → 4.2
  const d = Math.abs(rarity - target)
  // Suelo subido (0.05 → 0.14) y pendiente más suave: el peso viejo confinaba
  // las ofertas tempranas al mismo mar de suplentes de catálogo bajo — otra
  // pata del «siempre salen los mismos».
  return Math.max(0.14, 1 - d * 0.36)
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

const KIND_FOR_POSITION: Record<string, string> = {
  POR: 'parada', DEF: 'bloqueo', MED: 'regate', DEL: 'tiro',
}

/** Técnicas que ALGUIEN de tu plantilla podría aprender ahora mismo. */
export function learnableByRoster(save: InazumaSave) {
  const combos = new Set(save.roster.map((p) => {
    const b = getPlayerBase(p.baseId)
    return `${KIND_FOR_POSITION[b.position]}|${b.element}`
  }))
  const out = TECHNIQUES.filter((t) => combos.has(`${t.kind}|${t.element}`))
  return out.length ? out : TECHNIQUES
}

/**
 * Jugadores fichables ahora mismo: el CATÁLOGO ENTERO (cualquier jugador
 * puede aparecer — todos llegan en rareza Normal y los subes tú), sin repetir
 * los que ya tienes. El peso por rareza de catálogo sigue mandando en QUIÉN
 * sale más a menudo según lo avanzado que vayas.
 */
export function availableSignings(save: InazumaSave): PlayerBase[] {
  // Se descarta por NOMBRE, no por id: el catálogo tiene al mismo chaval en
  // varias plantillas (y con nombres alternativos), y filtrando solo por id te
  // ofrecían «otra vez» a alguien que ya estaba en tu vestuario.
  const owned = new Set(save.roster.map((p) => getPlayerBase(p.baseId).name))
  const pool = PLAYERS.filter((p) => !owned.has(p.name))
  // Los OFRECIDOS hace poco no se repiten («siempre salen los mismos») —
  // salvo que el pool se quede en los huesos, que entonces vale cualquiera.
  const seen = new Set(save.scoutSeen ?? [])
  const fresh = pool.filter((p) => !seen.has(p.id))
  return fresh.length >= 6 ? fresh : pool
}

function signingOption(save: InazumaSave, rng: RNG, exclude: Set<string>): DraftOption | null {
  const pool = availableSignings(save).filter((p) => !exclude.has(p.id))
  if (!pool.length) return null
  const pick = weightedPick(pool, (p) => rarityWeight(p.rarity, bossIndexForLayer(save.layer)), rng)
  if (!pick) return null
  exclude.add(pick.id)
  const level = signingLevel(save)
  return {
    kind: 'fichaje',
    id: `sign-${pick.id}`,
    title: `Fichar a ${pick.name}`,
    // Los fichajes NO cuestan dinero: son la recompensa de la casilla, como
    // una captura en el modo Pokémon. El dinero es solo para la tienda.
    // Sin la palabra de rareza: la UI pinta las ESTRELLAS y los atributos
    // reales, que informan más que «titular» o «de rotación».
    desc: `${pick.position} · nivel ${level}`,
    playerId: pick.id,
    level,
  }
}

/** Lo que cobra el ojeador por su agenda (el Fichaje estrella). */
export const SCOUT_STAR_PRICE = 1000

/** Las tres fichas del ojeador. Todas son fichajes: es su razón de existir. */
export function buildScoutOffer(save: InazumaSave, rng: RNG): DraftOption[] {
  const seen = new Set<string>()
  const out: DraftOption[] = []
  for (let i = 0; i < 3; i++) {
    const o = signingOption(save, rng, seen)
    if (o) out.push(o)
  }
  // De vez en cuando el ojeador ofrece SU AGENDA (el Fichaje estrella): la
  // vía garantizada de encontrarse el objeto en una run sin depender del
  // botín ni de la última tienda.
  if (out.length && rng.chance(0.28)) {
    out.push({
      kind: 'objeto',
      id: 'scout-estrella',
      title: 'La agenda del ojeador',
      desc: `Fichaje estrella: busca y ficha al jugador EXACTO que quieras del catálogo. Cuesta ${SCOUT_STAR_PRICE.toLocaleString('es-ES')} ₽.`,
      itemId: 'fichaje-estrella',
      // A diferencia del resto de cartas, ESTA se paga: elegir tú al jugador
      // que quieras del catálogo entero es demasiado como para salir gratis.
      cost: SCOUT_STAR_PRICE,
    })
  }
  // Si ya has fichado a todo el mundo, el ojeador paga en metálico.
  if (!out.length) {
    out.push({ kind: 'dinero', id: 'scout-cash', title: 'Comisión del ojeador', desc: 'No queda nadie por fichar: te paga la visita', amount: 1500 })
  }
  return out
}

/**
 * UNA recompensa al azar tras ganar un instituto. Antes se elegía entre tres, y
 * jugando se vio que rompía el ritmo: acababas de jugar 90 minutos y te
 * plantaban otro menú. Al azar sorprende y se lee de un vistazo.
 */
export function buildSingleReward(save: InazumaSave, rng: RNG): DraftOption {
  return rng.pick(buildDraft(save, rng))
}

/**
 * La baraja de recompensas: una de fichaje (si queda alguien), una de mejora y
 * una comodín, distintas entre sí. `buildSingleReward` saca UNA de aquí; el
 * ojeador sigue repartiendo tres, porque ahí elegir jugador ES la casilla.
 */
export function buildDraft(save: InazumaSave, rng: RNG): DraftOption[] {
  const out: DraftOption[] = []
  const seen = new Set<string>()
  // Lo avanzada que va la partida, 0-7. Sustituye a la antigua «ronda» ahora
  // que el torneo es un mapa por capas y no un cuadro de eliminatorias.
  const prog = bossIndexForLayer(save.layer)

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
    // Solo técnicas que alguien de la plantilla pueda aprender: hacen falta
    // demarcación Y elemento, así que sortear del catálogo entero ofrecía
    // cartas imposibles de usar.
    const tech = weightedPick(
      learnableByRoster(save).filter((t) => t.power >= 40 && t.power <= 60 + prog * 9),
      (t) => 1 / (1 + Math.abs(t.power - (45 + prog * 7)) / 20),
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
      ITEMS.filter((i) => i.kind !== 'consumible' || prog < 5),
      (i) => 1 / (1 + Math.abs(i.price - (700 + prog * 350)) / 700),
      rng,
    )
    if (item) out.push({ kind: 'objeto', id: `draft-item-${item.id}`, title: item.name, desc: item.desc, itemId: item.id })
  } else if (roll < 0.8) {
    const amount = 500 + prog * 210
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
