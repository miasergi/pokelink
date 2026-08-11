// La capa roguelite: el cuadro del Football Frontier y lo que te ofrece cada
// ronda.
//
// El torneo alterna rondas de PARTIDO con rondas de INTERLUDIO:
//   ronda 0  partido 1 (Occult)      ronda 1  interludio
//   ronda 2  partido 2 (Otaku)       ronda 3  interludio
//   …                                 …
//   ronda 14 FINAL (Zeus)
//
// En un torneo real no eliges rival, así que la decisión de las rondas de
// partido no es «contra quién» sino «cómo»: salir a competir o salir a por
// todas (rival más fuerte, premio doble). Es el mismo patrón que los nodos
// `risky` del roguelike Pokémon, que ya funciona bien en este proyecto.
import type { RNG } from '@/utils/rng'
import { BRACKET, getTeam } from '@/data/inazuma/teams'
import type { TournamentNode } from './types'

/**
 * Nivel del rival de cada eliminatoria: sube de 3 en 3.
 *
 * Ganar da 4 niveles (`LEVELS_BY_RESULT`), así que la ventaja del jugador CRECE
 * una unidad por eliminatoria ganada: +2 contra Occult, +9 contra Zeus. Es
 * deliberado y es el motor del modo — empiezas siendo el Raimon de la serie, un
 * equipo del montón, y acabas arrollando… pero solo si vas GANANDO (empatar da
 * 2 y perder 1, así que un tropiezo te descuelga de la curva).
 *
 * La versión anterior subía de 4 en 4, igual que tú: la ventaja se quedaba
 * clavada en +2 toda la partida y cada ronda era una moneda al aire. Medido con
 * el bot: 0 títulos en 60 torneos y caídas repartidas por igual entre todas las
 * rondas, que es la firma de un torneo donde la habilidad no puntúa.
 */
export const RIVAL_LEVELS = [6, 9, 12, 15, 18, 21, 24, 27]
/** Niveles extra del rival si sales «a por todas». */
export const AGGRESSIVE_LEVEL_BONUS = 4

export const MATCH_ROUNDS = BRACKET.length
/** Rondas totales: 8 partidos + 7 interludios intercalados. */
export const TOTAL_ROUNDS = MATCH_ROUNDS * 2 - 1

export function isMatchRound(round: number): boolean {
  return round % 2 === 0
}

export function matchIndex(round: number): number {
  return Math.floor(round / 2)
}

/** Nombre visible de la ronda («Cuartos», «Entre partidos»…). */
export function roundName(round: number): string {
  return isMatchRound(round) ? BRACKET[matchIndex(round)].name : 'Entre partidos'
}

/** Premio en metálico por ganar la eliminatoria `i`. */
export function prizeMoney(i: number): number {
  return 600 + i * 260
}

/**
 * Nodos que se ofrecen en la ronda actual. Solo se puede elegir uno; al
 * resolverlo se avanza de ronda.
 */
export function buildOffer(round: number, rng: RNG): TournamentNode[] {
  if (round >= TOTAL_ROUNDS) return []
  return isMatchRound(round) ? matchNodes(round) : interludeNodes(round, rng)
}

function matchNodes(round: number): TournamentNode[] {
  const i = matchIndex(round)
  const entry = BRACKET[i]
  const team = getTeam(entry.teamId)
  const level = RIVAL_LEVELS[i]
  const isFinal = i === BRACKET.length - 1
  const nodes: TournamentNode[] = [{
    id: `r${round}-oficial`,
    kind: isFinal ? 'final' : 'partido',
    teamId: entry.teamId,
    level,
    title: team.name,
    subtitle: `${entry.name} · nivel medio ${level}`,
    reward: `${prizeMoney(i)} ₽ + 1 carta de fichaje`,
  }]
  // La final no admite planteamiento: es la final.
  if (!isFinal) {
    nodes.push({
      id: `r${round}-todas`,
      kind: 'partido',
      teamId: entry.teamId,
      level: level + AGGRESSIVE_LEVEL_BONUS,
      title: `${team.name} · a por todas`,
      subtitle: `Salen con su mejor once (nivel ${level + AGGRESSIVE_LEVEL_BONUS})`,
      reward: `${prizeMoney(i) * 2} ₽ + 2 cartas de fichaje`,
    })
  }
  return nodes
}

const INTERLUDE_POOL: { kind: TournamentNode['kind']; title: string; subtitle: string; reward: string }[] = [
  {
    kind: 'ojeador',
    title: 'Sesión de ojeo',
    subtitle: 'Un cazatalentos te trae tres fichas',
    reward: 'Fichas un jugador nuevo',
  },
  {
    kind: 'entrenamiento',
    title: 'Entrenamiento intensivo',
    subtitle: 'Toda la tarde en el campo del río',
    reward: '+3 niveles a dos jugadores',
  },
  {
    kind: 'descanso',
    title: 'Día de descanso',
    subtitle: 'Baños, fisio y nada de balón',
    reward: 'Recupera aguante y PT de toda la plantilla',
  },
  {
    kind: 'tienda',
    title: 'Tienda de deportes',
    subtitle: 'El material bueno se paga',
    reward: 'Compra equipamiento y consumibles',
  },
  {
    kind: 'amistoso',
    title: 'Amistoso de barrio',
    subtitle: 'Un rival flojo, pero es fútbol',
    reward: 'Partido fácil · +2 niveles y 400 ₽',
  },
]

function interludeNodes(round: number, rng: RNG): TournamentNode[] {
  const picked = rng.sample(INTERLUDE_POOL, 3)
  return picked.map((p, i) => ({
    id: `r${round}-${p.kind}-${i}`,
    kind: p.kind,
    title: p.title,
    subtitle: p.subtitle,
    reward: p.reward,
    // El amistoso es un partido de verdad: se juega contra un rival genérico de
    // nivel bajo, para poder rodar suplentes sin arriesgar la eliminatoria.
    ...(p.kind === 'amistoso'
      ? { teamId: 'occult', level: Math.max(4, RIVAL_LEVELS[Math.min(RIVAL_LEVELS.length - 1, matchIndex(round))] - 6) }
      : {}),
  }))
}

/** Institutos ya derrotados: definen a quién puedes fichar en el ojeador. */
export function beatenTeams(round: number): string[] {
  const done = matchIndex(round)
  return BRACKET.slice(0, done).map((b) => b.teamId)
}
