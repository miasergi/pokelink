// Recompensas: las cartas que se ofrecen tras un partido y en el ojeador.
// Puro: decide QUÉ se ofrece; aplicar la elección es cosa del store (necesita
// que el usuario señale a quién entrenar o a quién equipar).
import type { RNG } from '@/utils/rng'
import { ITEMS } from '@/data/inazuma/items'
import { TACTICS } from '@/data/inazuma/tactics'
import { getTeam, regionOfTeam } from '@/data/inazuma/teams'
import { getPlayerBase, PLAYERS, playersOfTeam } from '@/data/inazuma/players'
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
 * Peso del PERSONAJE (`PlayerBase.fame`) según lo avanzado que vaya el torneo:
 * al principio no aparecen leyendas (arruinaría la curva) y al final no
 * aparecen suplentes de plantilla (no servirían de nada). Nada que ver con la
 * rareza Normal/Avanzado/Ídolo/Legendario, que siempre empieza en Normal.
 */
function rarityWeight(rarity: number, bossIndex: number): number {
  const progress = Math.min(1, bossIndex / 7)
  // Curva recalibrada a la FAMA OFICIAL de Victory Road: el catálogo viejo
  // tenía mediana ★1 y el objetivo arrancaba en 1.6; con los pesos reales la
  // mediana es ★3, y dejarlo en 1.6 confinaba las ofertas tempranas a los
  // fondos de armario auténticos (cadenas flojas) — la banda del bot cayó a
  // 0 títulos por inanición de plantilla, no por el rival.
  const target = 2.3 + progress * 2.2 // 2.3 → 4.5
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
 * los que ya tienes. El peso del personaje en la serie (`fame`) sigue mandando
 * en QUIÉN sale más a menudo según lo avanzado que vayas.
 */
/**
 * El catálogo trae al MISMO chaval en varias plantillas (los suplentes
 * clásicos rellenan muchos institutos). Para sorteos y ofertas se colapsa por
 * NOMBRE quedándose su mejor versión — sin esto, quien aparece en 6 equipos
 * salía 6 veces más que nadie («siempre me tocan los mismos»).
 */
export function uniqueByName(pool: PlayerBase[]): PlayerBase[] {
  const best = new Map<string, PlayerBase>()
  for (const p of pool) {
    const cur = best.get(p.name)
    if (!cur || p.fame > cur.fame) best.set(p.name, p)
  }
  return [...best.values()]
}

export function availableSignings(save: InazumaSave): PlayerBase[] {
  // Se descarta por NOMBRE, no por id: el catálogo tiene al mismo chaval en
  // varias plantillas (y con nombres alternativos), y filtrando solo por id te
  // ofrecían «otra vez» a alguien que ya estaba en tu vestuario.
  const owned = new Set(save.roster.map((p) => getPlayerBase(p.baseId).name))
  // ÉPOCAS ELEGIDAS: si has configurado la run para jugar solo con gente de
  // IE1 y de Victory Road, el ojeador no te ofrece a nadie más. Sin elegir
  // nada, vale todo el catálogo (que es como funcionaba antes).
  const eras = new Set(save.pools ?? [])
  const pool = PLAYERS
    .filter((p) => !owned.has(p.name))
    // Los AGENTES LIBRES (equipo 'libre', como Scor Nelles) son de TODAS las
    // épocas: el filtro de eras los dejaba infichables.
    .filter((p) => !eras.size || p.team === 'libre' || eras.has(regionOfTeam(p.team)))
    // MONOTIPO: a tu club solo entra gente del elemento elegido.
    .filter((p) => !save.random?.monotipo || p.element === save.random.monotipo)
  // Los OFRECIDOS hace poco no se repiten («siempre salen los mismos») —
  // salvo que el pool se quede en los huesos, que entonces vale cualquiera.
  const seen = new Set(save.scoutSeen ?? [])
  const uniq = uniqueByName(pool)
  const fresh = uniq.filter((p) => !seen.has(p.id))
  return fresh.length >= 6 ? fresh : uniq
}

function signingOption(save: InazumaSave, rng: RNG, exclude: Set<string>, excludeNames: Set<string>): DraftOption | null {
  // Se excluye por id Y por NOMBRE: el catálogo trae al mismo chaval con
  // varios ids, y la oferta canónica podía duplicarse con la aleatoria.
  const pool = availableSignings(save).filter((p) => !exclude.has(p.id) && !excludeNames.has(p.name))
  if (!pool.length) return null
  const pick = weightedPick(pool, (p) => rarityWeight(p.fame, bossIndexForLayer(save.layer)), rng)
  if (!pick) return null
  exclude.add(pick.id)
  excludeNames.add(pick.name)
  const level = signingLevel(save)
  return {
    kind: 'fichaje',
    id: `sign-${pick.id}`,
    title: `Fichar a ${pick.name}`,
    // Los fichajes NO cuestan dinero: son la recompensa de la casilla, como
    // una captura en el modo Pokémon. El dinero es solo para la tienda.
    // Sin etiqueta de rareza: todo fichaje llega en Normal, y la carta ya
    // pinta sus atributos reales — informan más que «titular» o «de rotación».
    desc: `${pick.position} · nivel ${level}`,
    playerId: pick.id,
    level,
  }
}

/**
 * LAS TRES FILOSOFÍAS que se ofrecen tras ganar un instituto. Es LA elección
 * de identidad de la partida: no da números, cambia cómo se juega. Nunca se
 * repite una que ya tengas.
 */
export function buildTacticOffer(save: InazumaSave, rng: RNG): DraftOption[] {
  const owned = new Set(save.tactics ?? [])
  const pool = TACTICS.filter((t) => !owned.has(t.id))
  if (!pool.length) return []
  const picked: typeof pool = []
  const rest = pool.slice()
  for (let i = 0; i < 3 && rest.length; i++) {
    picked.push(...rest.splice(rng.int(0, rest.length - 1), 1))
  }
  return picked.map((t) => ({
    kind: 'tactica' as const,
    id: `tactica-${t.id}`,
    title: t.name,
    desc: t.desc,
    tacticId: t.id,
  }))
}

/** Lo que cobra el ojeador por su agenda (el Fichaje estrella). */
export const SCOUT_STAR_PRICE = 1000

/** Las tres fichas del ojeador. Todas son fichajes: es su razón de existir. */
/**
 * La oferta CANÓNICA del ojeador: un compañero de equipo (canon) de tu
 * inicial — reconstruir tu club, fichaje a fichaje. Con el randomizador de
 * plantillas la run es random y no aplica; y nunca ofrece a alguien que ya
 * tienes (por NOMBRE) ni repetido en la misma oferta.
 */
/** El EQUIPO CANON de la run: el del ESCUDO elegido al fundar el club (si
 * ese club tiene plantilla en el catálogo); si no, el equipo de tu inicial. */
export function canonTeamOf(save: InazumaSave): string | null {
  if (save.random?.plantillas || save.random?.inicial) return null
  if (save.customCrest && playersOfTeam(save.customCrest).length) return save.customCrest
  const starterId = save.starterBaseId ?? save.roster.find((p) => p.bond != null)?.baseId
  return starterId ? getPlayerBase(starterId).team : null
}

function canonOption(save: InazumaSave, rng: RNG, exclude: Set<string>, excludeNames: Set<string>): DraftOption | null {
  const team = canonTeamOf(save)
  if (!team) return null
  const owned = new Set(save.roster.map((p) => getPlayerBase(p.baseId).name))
  const seenIds = new Set(save.scoutSeen ?? [])
  const pool = uniqueByName(PLAYERS.filter((p) => p.team === team))
    .filter((p) => !owned.has(p.name) && !exclude.has(p.id) && !excludeNames.has(p.name))
    // MONOTIPO: el canon del club también tiene que ser del elemento.
    .filter((p) => !save.random?.monotipo || p.element === save.random.monotipo)
  if (!pool.length) return null
  const fresh = pool.filter((p) => !seenIds.has(p.id))
  // SORTEO UNIFORME, sin pesos de fama: reconstruir TU club debe ir al azar
  // puro. Con los pesos globales (que frenan a las leyendas al principio),
  // el puñado de ★4 de la plantilla salía casi siempre por delante de los ★5
  // y cada run parecía repartir a los mismos en el mismo orden.
  const pick = rng.pick(fresh.length ? fresh : pool)
  if (!pick) return null
  exclude.add(pick.id)
  excludeNames.add(pick.name)
  const level = signingLevel(save)
  return {
    kind: 'fichaje',
    id: `sign-${pick.id}`,
    title: `Fichar a ${pick.name}`,
    desc: `${pick.position} · nivel ${level} · Fichaje CANON del ${getTeam(team).name}`,
    playerId: pick.id,
    level,
  }
}

export function buildScoutOffer(save: InazumaSave, rng: RNG): DraftOption[] {
  const seen = new Set<string>()
  const seenNames = new Set<string>()
  const out: DraftOption[] = []
  // La primera ficha sobre la mesa: el CANON de tu club (si queda alguien).
  const canon = canonOption(save, rng, seen, seenNames)
  if (canon) out.push(canon)
  while (out.length < 3) {
    const o = signingOption(save, rng, seen, seenNames)
    if (!o) break
    out.push(o)
  }
  // Y SIEMPRE, la cuarta carta: el FICHAJE PERSONALIZADO — pagas 1.000 ₽ y
  // eliges EXACTAMENTE a quién fichar del catálogo. En una run random
  // (plantillas al azar) el ojeador no la ofrece: ahí manda el caos.
  if (out.length && !save.random?.plantillas && !save.random?.inicial) {
    out.push({
      kind: 'objeto',
      id: 'scout-custom',
      title: 'Fichaje personalizado',
      desc: `Busca y ficha al jugador EXACTO que quieras del catálogo. Cuesta ${SCOUT_STAR_PRICE.toLocaleString('es-ES')} IEcoins.`,
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
  const seenNames = new Set<string>()
  // Lo avanzada que va la partida, 0-7. Sustituye a la antigua «ronda» ahora
  // que el torneo es un mapa por capas y no un cuadro de eliminatorias.
  const prog = bossIndexForLayer(save.layer)

  const sign = signingOption(save, rng, seen, seenNames)
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
    out.push({ kind: 'dinero', id: 'draft-cash', title: `${amount.toLocaleString('es-ES')} IEcoins`, desc: 'Taquilla y patrocinadores', amount })
  } else {
    out.push({ kind: 'descanso', id: 'draft-rest', title: 'Recuperación completa', desc: 'Toda la plantilla recupera aguante y PT' })
  }

  // Relleno defensivo: si algo devolvió `null`, completa con dinero.
  while (out.length < 3) {
    out.push({ kind: 'dinero', id: `draft-cash-${out.length}`, title: '800 IEcoins', desc: 'Recaudación del partido', amount: 800 })
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
