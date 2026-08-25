// Motor de combate. Puro y determinista: mismo `seed` + mismas decisiones →
// mismo combate. La UI solo reproduce `battle.log`.
//
// EL BUCLE, en una frase: todo lo que hace ganar (técnicas, transformarse,
// empujar en un choque de rayos) sale del MISMO depósito de ki, y la única
// forma rápida de llenarlo —cargar— te deja al descubierto un turno. Esa
// tensión es el juego; el resto son adornos.
import { RNG } from '@/utils/rng'
import { getTechnique } from '@/data/dragon/techniques'
import { getForm } from '@/data/dragon/transformations'
import { getItem } from '@/data/dragon/items'
import { FUSIONS, fusedStats, fusionOf } from '@/data/dragon/fusions'
import {
  actorTechnique, effStats, KI_MAX, KI_REGEN_LINEAGE, maxHp, styleMultiplier, toCombatant,
} from './roster'
import type {
  Action, Battle, BattleEvent, Combatant, Decision, DecisionOption, Fighter, Side, StatKey, Technique,
} from './types'

// ------------------------------------------------------------ constantes ---

/** Potencia del golpe a puño limpio (gratis, y encima carga ki). */
export const PUNCH_POWER = 30

/**
 * Escala global del daño. Sube esto y los combates duran menos.
 *
 * Va emparejada con `levelFactor` (ver `strike`) y las dos juntas están
 * calibradas para que hagan falta ~9 impactos para tumbar a alguien A
 * CUALQUIER NIVEL. `DMG_K` sola no basta porque el daño depende del RATIO
 * ataque/defensa, que es constante al subir de nivel, mientras que los PS
 * salen del aguante, que sí crece: sin el factor de nivel, a nivel 65 los PS
 * son 4,8 veces los iniciales y el daño es exactamente el mismo. Medido: los
 * combates contra Cell y Buu duraban 120 turnos y NINGUNA run los ganaba.
 */
const DMG_K = 0.111
/** Cuánto absorbe la guardia. */
const GUARD_MULT = 0.42
/** Cada golpe extra de una técnica múltiple se cuela más por la guardia. */
const GUARD_PER_HIT = 0.12
/**
 * Multiplicador contra alguien que cargó ki el turno anterior. Bajado de 1,5:
 * con 1,5 castigar la carga era tan rentable que cargar nunca compensaba, y
 * cargar TIENE que ser una opción viva o el combate se queda sin economía.
 */
const EXPOSED_MULT = 1.35
const CRIT_MULT = 1.6

/**
 * Ki por golpear. Es la palanca que fija el RITMO: con 20, golpear dos veces
 * paga una técnica media, así que la mitad de tus turnos son técnicas. Con los
 * 14 de antes salía una de cada tres y los combates se hacían eternos.
 */
export const KI_PUNCH = 20
export const KI_CHARGE = 45
export const KI_GUARD = 22
/** Ki que ganas por encajar un golpe (la rabia también carga). */
export const KI_ON_HIT = 10

/** Opciones de empuje en un choque de rayos. */
export const PUSH_OPTIONS = [0, 15, 30] as const

// --------------------------------------------------------------- helpers ---

function rngOf(b: Battle): RNG {
  const r = new RNG(b.seed)
  r.setState(b.rngState)
  return r
}
function commit(b: Battle, r: RNG): void {
  b.rngState = r.getState()
}

export function ally(b: Battle): Combatant { return b.allies[b.active] }
export function foe(b: Battle): Combatant { return b.enemies[b.enemyActive] }
function sideOf(b: Battle, c: Combatant): Side {
  return b.allies.includes(c) ? 'aliado' : 'rival'
}
function log(b: Battle, e: BattleEvent): void { b.log.push(e) }

export function techOf(id: string | undefined): Technique | undefined {
  return id ? getTechnique(id) : undefined
}

/**
 * Las que puede pagar ahora mismo, YA CON SU NIVEL aplicado (ver
 * `actorTechnique`): un Kamehameha V3 pega más y cuesta menos que uno de serie.
 */
export function affordableTechs(c: Combatant): Technique[] {
  return c.techniques
    .map((id) => actorTechnique(c, id))
    .filter((t): t is Technique => !!t && t.cost <= c.ki && !(t.ultimate && c.ultUsed))
}

/** La técnica tal como la lanza ESTE luchador. */
export function techFor(c: Combatant, id: string | undefined): Technique | undefined {
  return id ? actorTechnique(c, id) : undefined
}

/** Transformaciones que puede activar ahora (desbloqueadas y pagables). */
export function availableForms(c: Combatant): string[] {
  return c.forms.filter((id) => {
    if (id === c.form) return false
    const f = getForm(id)
    return !!f && f.cost <= c.ki
  })
}

// ------------------------------------------------------------- arranque ---

export interface BattleOptions {
  seed: number
  title: string
  scene: string
  /** Transformaciones que el jefe encadena al caer (multifase). */
  phases?: string[]
  bag?: Record<string, number>
  auto?: boolean
}

export function startBattle(party: Fighter[], enemies: Fighter[], opts: BattleOptions): Battle {
  // Los vínculos se resuelven con el equipo ENTERO, no solo con quien salta al
  // campo: llevar a Krilín en el banquillo también cuenta para Goku.
  const misIds = party.map((f) => f.baseId)
  const susIds = enemies.map((f) => f.baseId)
  const allies = party.map((f) => toCombatant(f, misIds))
  const first = allies.findIndex((c) => !c.fainted)
  const b: Battle = {
    seed: opts.seed,
    rngState: new RNG(opts.seed).getState(),
    turn: 0,
    allies,
    enemies: enemies.map((f) => toCombatant(f, susIds)),
    active: first < 0 ? 0 : first,
    enemyActive: 0,
    log: [],
    phase: 'idle',
    decision: null,
    round: 1,
    over: false,
    bossPhase: 0,
    phases: opts.phases,
    title: opts.title,
    scene: opts.scene,
    bag: { ...(opts.bag ?? {}) },
    auto: opts.auto ?? false,
  }
  log(b, { t: 'text', text: opts.title })
  return b
}

// ----------------------------------------------------------------- daño ---

interface HitResult { dealt: number; crit: boolean; ko: boolean }

function critChance(atk: Combatant, def: Combatant): number {
  const a = effStats(atk).velocidad
  const d = effStats(def).velocidad
  const edge = Math.max(-0.05, Math.min(0.14, (a - d) / Math.max(1, d) * 0.22))
  return 0.06 + edge
}

/**
 * Un impacto. `power` ya viene repartido si la técnica pega varias veces.
 * Devuelve el daño REAL aplicado (recortado a los PS que quedaban).
 */
function strike(
  b: Battle, atk: Combatant, def: Combatant, power: number,
  kind: 'fisica' | 'energia', hits: number, pierce: boolean, rng: RNG,
): HitResult {
  const ea = effStats(atk)
  const ed = effStats(def)
  const atkStat = kind === 'fisica' ? ea.poder : ea.ki
  // El nivel entra EXPLÍCITAMENTE (como en la fórmula de Pokémon) porque el
  // ratio ataque/defensa no cambia al subir: sin esto, el daño se quedaría
  // clavado mientras las barras de vida se multiplican por cinco.
  const levelFactor = atk.level / 8 + 2
  let dmg = power * (atkStat / Math.max(1, ed.defensa)) * DMG_K * levelFactor
  const eff = styleMultiplier(atk.style, def.style)
  dmg *= eff
  if (def.guarding && !pierce) dmg *= Math.min(0.95, GUARD_MULT + (hits - 1) * GUARD_PER_HIT)
  if (def.exposed) dmg *= EXPOSED_MULT
  const crit = rng.chance(critChance(atk, def))
  if (crit) dmg *= CRIT_MULT
  dmg *= rng.float(0.92, 1.08)
  const amount = Math.max(1, Math.round(dmg))
  const dealt = Math.min(def.hp, amount)
  def.hp -= dealt
  log(b, { t: 'damage', side: sideOf(b, def), uid: def.uid, amount: dealt, crit, eff })
  // La rabia también carga: encajar da ki (menos si estabas en guardia, que
  // ya cobraste por defenderte).
  gainKi(b, def, def.guarding ? Math.round(KI_ON_HIT / 2) : KI_ON_HIT)
  return { dealt, crit, ko: def.hp <= 0 }
}

function gainKi(b: Battle, c: Combatant, amount: number): void {
  const before = c.ki
  c.ki = Math.max(0, Math.min(c.kiMax, c.ki + amount))
  const delta = c.ki - before
  if (delta) log(b, { t: 'ki', side: sideOf(b, c), uid: c.uid, amount: delta })
}

function heal(b: Battle, c: Combatant, amount: number): void {
  const before = c.hp
  c.hp = Math.min(c.hpMax, c.hp + amount)
  if (c.hp > before) log(b, { t: 'heal', side: sideOf(b, c), uid: c.uid, amount: c.hp - before })
}

function selfDamage(b: Battle, c: Combatant, amount: number): void {
  const dealt = Math.min(c.hp, Math.max(1, Math.round(amount)))
  c.hp -= dealt
  log(b, { t: 'damage', side: sideOf(b, c), uid: c.uid, amount: dealt })
}

// -------------------------------------------------------------- acciones ---

/** Prioridad de la acción: lo defensivo/reactivo sale antes que lo lento. */
function priority(a: Action): number {
  switch (a.kind) {
    case 'guardia': case 'transformar': case 'objeto': return 2
    case 'cargar': return 0
    default: return 1
  }
}

/**
 * Tope de acumulación de buffs y debuffs. Un atributo no puede pasar del doble
 * ni bajar de la mitad por mucho que insistas.
 *
 * Sin este tope, Concentración (12 de ki) repetida seis veces dejaba el ki
 * ×4,8 PERMANENTE y el Golpe del Sol dejaba al rival al 19 % de velocidad: los
 * `mods` no caducan ni se limpian por turno, así que apilar apoyo era la
 * estrategia dominante y se cargaba toda la calibración del daño. La IA ya
 * tenía su propio freno (solo buffea una vez), o sea que era además una
 * asimetría a favor del jugador.
 */
export const MOD_CAP = 2
export const MOD_FLOOR = 0.5

function stackMod(mods: Combatant['mods'], k: StatKey, mult: number): void {
  const next = (mods[k] ?? 1) * mult
  mods[k] = Math.max(MOD_FLOOR, Math.min(MOD_CAP, next))
}

function applyTechEffects(b: Battle, user: Combatant, target: Combatant, t: Technique, rng: RNG): void {
  if (t.buff) {
    user.buffed = true
    for (const k of Object.keys(t.buff) as StatKey[]) stackMod(user.mods, k, t.buff[k] ?? 1)
    log(b, { t: 'buff', side: sideOf(b, user), uid: user.uid, text: `${user.name} se concentra` })
  }
  if (t.debuff && !target.fainted) {
    for (const k of Object.keys(t.debuff) as StatKey[]) stackMod(target.mods, k, t.debuff[k] ?? 1)
    log(b, { t: 'buff', side: sideOf(b, target), uid: target.uid, text: `${target.name} pierde reflejos` })
  }
  if (t.heal) heal(b, user, Math.round(user.hpMax * (t.heal / 100)))
  if (t.stun && !target.fainted && rng.chance(t.stun)) {
    target.stunned = true
    log(b, { t: 'stun', side: sideOf(b, target), uid: target.uid })
  }
}

function performTechnique(b: Battle, user: Combatant, target: Combatant, t: Technique, rng: RNG): void {
  user.ki = Math.max(0, user.ki - t.cost)
  log(b, { t: 'action', side: sideOf(b, user), uid: user.uid, kind: 'tecnica', name: t.name })
  if (t.power > 0 && t.kind !== 'apoyo') {
    const hits = t.hits ?? 1
    const per = t.power / hits
    for (let i = 0; i < hits && !target.fainted && target.hp > 0; i++) {
      strike(b, user, target, per, t.kind === 'fisica' ? 'fisica' : 'energia', hits, !!t.pierce, rng)
    }
  }
  applyTechEffects(b, user, target, t, rng)
  if (t.recoil) selfDamage(b, user, user.hpMax * (t.recoil / 100))
}

function performAction(b: Battle, actor: Combatant, target: Combatant, a: Action, rng: RNG): void {
  if (actor.hp <= 0 || actor.fainted) return
  switch (a.kind) {
    case 'nada':
      return
    case 'golpe': {
      log(b, { t: 'action', side: sideOf(b, actor), uid: actor.uid, kind: 'golpe' })
      if (target.hp > 0) strike(b, actor, target, PUNCH_POWER, 'fisica', 1, false, rng)
      // Pegar carga: la alternativa barata a bajar la guardia y cargar.
      gainKi(b, actor, KI_PUNCH)
      return
    }
    case 'tecnica': {
      const t = techFor(actor, a.id)
      if (!t || t.cost > actor.ki) {
        // Sin ki para lo que pidió: se queda en un golpe, no en un turno perdido.
        performAction(b, actor, target, { kind: 'golpe' }, rng)
        return
      }
      // La DEFINITIVA se gasta para todo el combate: es una sola bala.
      if (t.ultimate) actor.ultUsed = true
      performTechnique(b, actor, target, t, rng)
      return
    }
    case 'cargar': {
      log(b, { t: 'action', side: sideOf(b, actor), uid: actor.uid, kind: 'cargar' })
      gainKi(b, actor, KI_CHARGE)
      actor.exposed = true
      return
    }
    case 'guardia': {
      log(b, { t: 'action', side: sideOf(b, actor), uid: actor.uid, kind: 'guardia' })
      log(b, { t: 'guard', side: sideOf(b, actor), uid: actor.uid })
      actor.guarding = true
      gainKi(b, actor, KI_GUARD)
      return
    }
    case 'transformar': {
      const f = a.id ? getForm(a.id) : undefined
      if (!f || f.cost > actor.ki) return
      actor.ki -= f.cost
      actor.form = f.id
      log(b, { t: 'transform', side: sideOf(b, actor), uid: actor.uid, form: f.id, name: f.name })
      return
    }
    case 'fusion': {
      const fus = a.id ? FUSIONS.find((f) => f.id === a.id) : undefined
      if (!fus) return
      const side = sideOf(b, actor)
      const equipo = side === 'aliado' ? b.allies : b.enemies
      // El compañero: el OTRO de la pareja, vivo y con ki para poner su parte.
      const otro = equipo.find((c) => (
        c.uid !== actor.uid && !c.fainted && c.hp > 0
        && (c.baseId === fus.a || c.baseId === fus.b) && c.baseId !== actor.baseId
        && c.ki >= fus.cost
      ))
      if (!otro || actor.ki < fus.cost) return

      const s1 = effStats(actor)
      const s2 = effStats(otro)
      const stats = fusedStats(s1, s2, fus.mult)
      const hpMax = maxHp(stats.aguante)
      const fusionado: Combatant = {
        uid: `fus-${actor.uid}-${otro.uid}`,
        baseId: fus.id,
        name: fus.name,
        lineage: actor.lineage,
        style: actor.style,
        level: Math.max(actor.level, otro.level),
        color: fus.color,
        plBase: actor.plBase,
        stats,
        // La vida es la SUMA de lo que les quedaba: fusionarse no cura, junta.
        hp: Math.min(hpMax, Math.round(actor.hp + otro.hp)),
        hpMax,
        ki: KI_MAX,
        kiMax: KI_MAX,
        techniques: fus.techniques.slice(),
        forms: [],
        mods: {},
        guarding: false,
        stunned: false,
        exposed: false,
        fainted: false,
        fusedFrom: [actor.uid, otro.uid],
      }
      // Los dos originales salen del combate: han GASTADO dos cuerpos por uno.
      actor.fainted = true
      otro.fainted = true
      const i = equipo.indexOf(actor)
      equipo.splice(i, 0, fusionado)
      if (side === 'aliado') b.active = i
      else b.enemyActive = i
      log(b, { t: 'action', side, uid: actor.uid, kind: 'fusion', name: fus.name })
      log(b, { t: 'transform', side, uid: fusionado.uid, form: fus.id, name: fus.name })
      log(b, { t: 'text', text: `¡${actor.name} y ${otro.name} se funden en ${fus.name}!` })
      return
    }
    case 'objeto': {
      const it = a.id ? getItem(a.id) : undefined
      // Solo objetos DE USO: sin esta guarda se podía «usar» una armadura de
      // repuesto, que no cura ni da ki, y perdías el turno Y el objeto (la
      // bolsa del combate se vuelca al save al terminar).
      if (!it || it.kind !== 'uso' || !(b.bag[it.id] > 0)) return
      b.bag[it.id] -= 1
      log(b, { t: 'action', side: sideOf(b, actor), uid: actor.uid, kind: 'objeto', name: it.name })
      if (it.revive) {
        // La Judía de Karin levanta a un compañero caído, que es lo que
        // promete su descripción. Antes curaba al activo y era el objeto más
        // caro del juego haciendo algo distinto justo cuando hace falta.
        const side = sideOf(b, actor)
        const equipo = side === 'aliado' ? b.allies : b.enemies
        const caido = equipo.find((c) => c.fainted || c.hp <= 0)
        if (caido) {
          caido.fainted = false
          caido.hp = Math.round(caido.hpMax * ((it.heal ?? 50) / 100))
          caido.ki = Math.round(caido.kiMax * 0.5)
          log(b, { t: 'heal', side, uid: caido.uid, amount: caido.hp })
          log(b, { t: 'text', text: `¡${caido.name} vuelve a ponerse en pie!` })
        }
        return
      }
      if (it.heal) heal(b, actor, Math.round(actor.hpMax * (it.heal / 100)))
      if (it.ki) gainKi(b, actor, it.ki)
      return
    }
  }
}

// -------------------------------------------------- choque de rayos (¡!) ---

function clashPower(c: Combatant, t: Technique, push: number, rng: RNG): number {
  // El empuje extra pesa MUCHO (×1.2 por cada 100 de ki): quemar media barra
  // para robar un choque tiene que ser una decisión de verdad, no un adorno.
  return effStats(c).ki * t.power * (1 + (push / 100) * 1.2) * rng.float(0.9, 1.1)
}

function resolveClash(b: Battle, me: Combatant, foeC: Combatant, myT: Technique, foeT: Technique, myPush: number, foePush: number, rng: RNG): void {
  me.ki = Math.max(0, me.ki - myT.cost - myPush)
  foeC.ki = Math.max(0, foeC.ki - foeT.cost - foePush)
  // El choque NO pasa por `performAction`, así que la DEFINITIVA hay que
  // marcarla aquí: si no, lanzarla contra otro rayo la devolvía intacta y se
  // podía repetir todo el combate.
  if (myT.ultimate) me.ultUsed = true
  if (foeT.ultimate) foeC.ultUsed = true
  log(b, { t: 'action', side: 'aliado', uid: me.uid, kind: 'tecnica', name: myT.name })
  log(b, { t: 'action', side: 'rival', uid: foeC.uid, kind: 'tecnica', name: foeT.name })

  const mine = clashPower(me, myT, myPush, rng)
  const theirs = clashPower(foeC, foeT, foePush, rng)
  const top = Math.max(mine, theirs)
  const margin = top > 0 ? Math.abs(mine - theirs) / top : 0

  if (margin < 0.08) {
    // Empate: la explosión se los lleva a los dos por delante.
    log(b, { t: 'clash', winner: 'empate', margin })
    strike(b, me, foeC, foeT.power * 0.4, 'energia', 1, false, rng)
    if (me.hp > 0) strike(b, foeC, me, myT.power * 0.4, 'energia', 1, false, rng)
    return
  }

  const iWin = mine > theirs
  log(b, { t: 'clash', winner: iWin ? 'aliado' : 'rival', margin })
  const winner = iWin ? me : foeC
  const loser = iWin ? foeC : me
  const wTech = iWin ? myT : foeT
  const lTech = iWin ? foeT : myT
  // El que gana el pulso se lleva el rayo entero más lo que haya sacado de
  // ventaja; el que pierde aún araña algo con lo que le quedaba.
  strike(b, winner, loser, wTech.power * (0.85 + margin * 0.9), 'energia', 1, true, rng)
  if (loser.hp > 0 && winner.hp > 0) {
    strike(b, loser, winner, lTech.power * 0.18 * (1 - margin), 'energia', 1, false, rng)
  }
}

// ------------------------------------------------------------------ IA ---

/**
 * Cerebro del rival (y del modo automático). `skill` 0-1: a 0 juega a lo bruto,
 * a 1 administra el ki y castiga las cargas. Los jefes suben de skill por saga
 * — es la palanca de dificultad que NO toca los números, así que subirla no
 * desequilibra nada más.
 */
export function aiAction(c: Combatant, target: Combatant, skill: number, rng: RNG, bag?: Record<string, number>): Action {
  const form = c.form ? getForm(c.form) : undefined
  const upkeep = form?.upkeep ?? 0
  const hpFrac = c.hp / c.hpMax
  const targetFrac = target.hp / target.hpMax

  // Curarse antes de morir (solo si tiene bolsa: los rivales no la tienen).
  if (bag && hpFrac < 0.3 && rng.chance(skill)) {
    const cure = Object.keys(bag).find((id) => bag[id] > 0 && (getItem(id)?.heal ?? 0) >= 50)
    if (cure) return { kind: 'objeto', id: cure }
  }

  // Transformarse: pronto si es buen jugador, y solo si puede SOSTENERLO un par
  // de turnos (si no, se le cae sola y ha regalado el ki).
  const forms = availableForms(c)
  if (forms.length && rng.chance(0.35 + skill * 0.5)) {
    const best = forms
      .map((id) => getForm(id)!)
      .filter((f) => c.ki >= f.cost + f.upkeep)
      .sort((x, y) => (y.mult.poder ?? 1) - (x.mult.poder ?? 1))[0]
    // Solo sube de forma si mejora la que lleva.
    if (best && (!form || (best.mult.poder ?? 1) > (form.mult.poder ?? 1))) {
      return { kind: 'transformar', id: best.id }
    }
  }

  const techs = affordableTechs(c).filter((t) => t.cost + upkeep <= c.ki)

  // Castigar al que cargó: si el rival está descubierto, la más gorda que pueda.
  if (target.exposed && techs.length) {
    const nuke = techs.filter((t) => t.kind !== 'apoyo').sort((x, y) => y.power - x.power)[0]
    if (nuke && rng.chance(0.5 + skill * 0.5)) return { kind: 'tecnica', id: nuke.id }
  }

  // Apoyo (curarse/buffear) cuando toca, no a lo loco.
  const support = techs.filter((t) => t.kind === 'apoyo')
  const healer = support.find((t) => (t.heal ?? 0) > 0)
  if (healer && hpFrac < 0.4 && rng.chance(0.4 + skill * 0.5)) return { kind: 'tecnica', id: healer.id }
  const buff = support.find((t) => t.buff || t.debuff)
  if (buff && c.ki > 60 && !c.buffed && rng.chance(0.2 + skill * 0.3)) {
    return { kind: 'tecnica', id: buff.id }
  }

  // La definitiva, cuando de verdad decide: para rematar o si va perdiendo.
  const ult = techs.find((t) => t.ultimate)
  if (ult && (targetFrac < 0.5 || hpFrac < 0.4) && rng.chance(0.5 + skill * 0.5)) {
    return { kind: 'tecnica', id: ult.id }
  }

  // Rematar: si con la más fuerte lo tumba, va sin pensarlo.
  const offense = techs.filter((t) => t.kind !== 'apoyo').sort((x, y) => y.power - x.power)
  if (offense.length && targetFrac < 0.25 && rng.chance(0.6 + skill * 0.4)) {
    return { kind: 'tecnica', id: offense[0].id }
  }

  // Sin gasolina: cargar. Ojo al umbral — golpear YA carga (+20), así que con
  // una transformación puesta lo correcto es pegar a puño y soltar técnica de
  // vez en cuando. Con el umbral atado al mantenimiento (`30 + upkeep*2`) se
  // pasaba el combate cargando y transformarse salía a pérdidas.
  const lowKi = c.ki < Math.max(upkeep * 2, 26)
  if (lowKi) {
    if (hpFrac < 0.35 && rng.chance(skill * 0.7)) return { kind: 'guardia' }
    if (rng.chance(0.55 + skill * 0.25)) return { kind: 'cargar' }
    return { kind: 'golpe' }
  }

  // Con depósito: técnica eficiente (daño por punto de ki) o golpe para acumular.
  if (offense.length && rng.chance(0.55 + skill * 0.3)) {
    const scored = offense
      .map((t) => ({ t, score: (t.power / Math.max(1, t.cost)) * (1 + (t.pierce && target.guarding ? 0.5 : 0)) }))
      .sort((x, y) => y.score - x.score)
    // El bueno afina; el malo tira de la más gorda y se queda seco.
    const pickFrom = rng.chance(skill) ? scored : scored.slice().reverse()
    return { kind: 'tecnica', id: pickFrom[0].t.id }
  }
  return { kind: 'golpe' }
}

/** Cuánto ki mete la IA en un choque de rayos. */
function aiPush(c: Combatant, skill: number, rng: RNG): number {
  const spare = c.ki
  const options = PUSH_OPTIONS.filter((p) => p <= spare)
  if (!options.length) return 0
  // Un jugador bueno empuja cuando le queda depósito; uno malo, al azar.
  if (rng.chance(skill)) return options[options.length - 1]
  return rng.pick(options)
}

// ---------------------------------------------------- ciclo de vida turno ---

function endOfTurn(b: Battle, rng: RNG): void {
  for (const c of [...b.allies, ...b.enemies]) {
    if (c.fainted || c.hp <= 0) continue
    const regen = KI_REGEN_LINEAGE[c.lineage]
    if (regen) gainKi(b, c, regen)
    const f = c.form ? getForm(c.form) : undefined
    if (!f) continue
    if (f.upkeep > c.ki) {
      // Se te cae la transformación: el momento en que el combate da la vuelta.
      c.form = undefined
      c.stunned = true
      log(b, { t: 'formEnd', side: sideOf(b, c), uid: c.uid, reason: 'ki' })
      continue
    }
    if (f.upkeep) {
      c.ki -= f.upkeep
      log(b, { t: 'ki', side: sideOf(b, c), uid: c.uid, amount: -f.upkeep })
    }
    if (f.burn) selfDamage(b, c, c.hpMax * (f.burn / 100))
  }
  void rng
}

function finish(b: Battle, win: boolean): void {
  b.over = true
  b.win = win
  b.phase = 'finished'
  b.decision = null
  log(b, { t: 'end', win })
}

/**
 * FURIA del relevo: el que entra después de ver caer a un compañero lo hace
 * con el depósito lleno y pegando más, para el resto del combate.
 *
 * No es un adorno narrativo, arregla un problema medido: un jefe concentra
 * todo su poder en un cuerpo y convertía sus PS en daño 5,7 veces mejor que un
 * equipo de cuatro, así que repartirse era matemáticamente peor que ir solo y
 * los jefes eran inganables. Ahora perder a alguien te DEVUELVE algo, que es
 * justo lo que pasa en el anime cada vez que matan a un amigo delante.
 */
export const RAGE_MULT = 1.25

function enrage(b: Battle, c: Combatant): void {
  stackMod(c.mods, 'poder', RAGE_MULT)
  stackMod(c.mods, 'ki', RAGE_MULT)
  c.raging = true
  c.ki = c.kiMax
  log(b, { t: 'buff', side: sideOf(b, c), uid: c.uid, text: `¡${c.name} estalla de rabia!` })
}

export function switchTo(b: Battle, uid: string, rage = false): void {
  const i = b.allies.findIndex((c) => c.uid === uid && !c.fainted && c.hp > 0)
  if (i < 0) return
  b.active = i
  b.decision = null
  b.phase = 'idle'
  log(b, { t: 'switch', side: 'aliado', uid, name: b.allies[i].name })
  if (rage) enrage(b, b.allies[i])
}

function askRelay(b: Battle): void {
  const vivos = b.allies.filter((c) => !c.fainted && c.hp > 0)
  b.decision = {
    kind: 'relevo',
    headline: '¿Quién sale ahora?',
    desc: 'El que entre lo hará furioso: con el ki lleno y pegando más fuerte.',
    actorUid: vivos[0]?.uid ?? '',
    rivalUid: foe(b).uid,
    options: vivos.map((c) => ({
      id: `relay:${c.uid}`,
      label: c.name,
      desc: `${Math.round(c.hp)}/${c.hpMax} PS · ${Math.round(c.ki)} ki`,
      chance: c.hp / c.hpMax,
      action: { kind: 'nada' as const },
    })),
  }
  b.phase = 'decision'
}

/** Marca caídos y resuelve fases de jefe, relevos y final del combate. */
function settle(b: Battle, rng: RNG): void {
  const f = foe(b)
  if (f.hp <= 0 && !f.fainted) {
    // ¿Le queda otra forma? Jefe multifase: se levanta más fuerte y a tope.
    const next = b.phases?.[b.bossPhase]
    if (next) {
      b.bossPhase += 1
      f.form = next
      // Cuanta más fases tenga el jefe, menos vida trae cada una. Con la barra
      // entera en todas, Freezer sumaba cuatro barras Y multiplicadores de
      // ×2,6: dos ventajas apiladas que hacían el combate inganable.
      const total = b.phases?.length ?? 1
      const refill = total >= 3 ? 0.5 : total === 2 ? 0.62 : 0.75
      f.hp = Math.round(f.hpMax * refill)
      f.ki = KI_MAX
      f.mods = {}
      f.buffed = false
      f.ultUsed = false
      f.stunned = false
      const def = getForm(next)
      log(b, { t: 'transform', side: 'rival', uid: f.uid, form: next, name: def?.name ?? next })
      log(b, { t: 'text', text: `¡${f.name} no había enseñado todo su poder!` })
    } else {
      f.fainted = true
      f.form = undefined
      log(b, { t: 'faint', side: 'rival', uid: f.uid })
      const alive = b.enemies.findIndex((e) => !e.fainted && e.hp > 0)
      if (alive < 0) {
        finish(b, true)
        return
      }
      b.enemyActive = alive
      for (const c of b.enemies) c.sawFall = true
      log(b, { t: 'switch', side: 'rival', uid: b.enemies[alive].uid, name: b.enemies[alive].name })
      enrage(b, b.enemies[alive])
    }
  }

  const me = ally(b)
  if (me.hp <= 0 && !me.fainted) {
    me.fainted = true
    me.form = undefined
    log(b, { t: 'faint', side: 'aliado', uid: me.uid })
    // Los que quedan lo han VISTO caer: es lo que enciende el rasgo Protector.
    for (const c of b.allies) c.sawFall = true
    const alive = b.allies.filter((c) => !c.fainted && c.hp > 0)
    if (!alive.length) {
      finish(b, false)
      return
    }
    if (b.auto || alive.length === 1) {
      switchTo(b, alive[0].uid, true)
    } else {
      askRelay(b)
    }
  }
  void rng
}

/** Dificultad de la IA rival, guardada fuera del save (se pasa al avanzar). */
let aiSkill = 0.55
export function setAiSkill(v: number): void { aiSkill = Math.max(0, Math.min(1, v)) }
export function getAiSkill(): number { return aiSkill }

// ------------------------------------------------------------ decisiones ---

/**
 * Cuántos intercambios pasan entre una decisión tuya y la siguiente. Con 2, en
 * un combate de doce turnos decides seis veces: bastante para que el ki siga
 * siendo cosa tuya, poco para que sea un turno-a-turno.
 */
export const ROUND_LENGTH = 2

/**
 * Tope duro de turnos. Con suficientes bonus de defensa apilados el daño cae
 * al mínimo de 1 por golpe y un combate puede irse a cientos de turnos sin que
 * nadie muera — pasó de verdad al meter el rasgo Protector. Al llegar aquí
 * gana quien conserve más porcentaje de vida, que es lo que decidiría un
 * jurado: nadie ha podido con el otro, pero uno está mejor que el otro.
 */
export const TURN_CAP = 60

/**
 * Cómo de bien pinta una jugada, de 0 a 1. Es una ESTIMACIÓN determinista (no
 * gasta RNG) del daño que harías frente al que vas a encajar, para poder
 * pintar las estrellas ANTES de decidir. Si tirase el dado aquí, el combate
 * dejaría de ser reproducible por semilla.
 */
export function optionOdds(b: Battle, action: Action): number {
  const me = ally(b)
  const rival = foe(b)
  const em = effStats(me)
  const er = effStats(rival)
  const lvl = me.level / 8 + 2

  // Lo que el rival te va a hacer de media si no te cubres.
  const suyo = PUNCH_POWER * (er.poder / Math.max(1, em.defensa)) * DMG_K * (rival.level / 8 + 2)

  let mio = 0
  let ahorro = 0
  switch (action.kind) {
    case 'golpe':
      mio = PUNCH_POWER * (em.poder / Math.max(1, er.defensa)) * DMG_K * lvl
      break
    case 'tecnica': {
      const t = techFor(me, action.id)
      if (!t) break
      if (t.kind === 'apoyo') {
        // El apoyo no pega: su valor es lo que cura o lo que te ahorra después.
        ahorro = t.heal ? me.hpMax * (t.heal / 100) : suyo * 0.5
        break
      }
      const stat = t.kind === 'fisica' ? em.poder : em.ki
      mio = t.power * (stat / Math.max(1, er.defensa)) * DMG_K * lvl
      if (t.pierce && rival.guarding) mio *= 1.6
      break
    }
    case 'cargar':
      // Cargar no hace daño y encima te deja descubierto: cuesta, no aporta.
      ahorro = -suyo * (EXPOSED_MULT - 1)
      break
    case 'guardia':
      ahorro = suyo * (1 - GUARD_MULT)
      break
    case 'transformar': {
      const f = action.id ? getForm(action.id) : undefined
      const mult = f?.mult.poder ?? 1
      mio = PUNCH_POWER * ((em.poder * mult) / Math.max(1, er.defensa)) * DMG_K * lvl
      break
    }
    case 'objeto': {
      const it = action.id ? getItem(action.id) : undefined
      ahorro = it?.heal ? me.hpMax * (it.heal / 100) : 0
      break
    }
    case 'fusion': {
      const fus = action.id ? FUSIONS.find((f) => f.id === action.id) : undefined
      mio = PUNCH_POWER * ((em.poder * (fus?.mult ?? 1.8)) / Math.max(1, er.defensa)) * DMG_K * lvl
      break
    }
    default:
      break
  }

  const valor = mio + ahorro
  // Normalizado contra lo que hace falta para tumbar al rival: una jugada que
  // le quita un cuarto de la vida que le queda es excelente.
  const ref = Math.max(1, rival.hp * 0.25)
  return Math.max(0.05, Math.min(0.97, valor / ref))
}

/** Estrellas 1-3 que pinta la UI en cada opción. */
export function oddsStars(chance: number): 1 | 2 | 3 {
  if (chance >= 0.6) return 3
  if (chance >= 0.32) return 2
  return 1
}

function option(
  b: Battle, id: string, label: string, action: Action, extra: Partial<DecisionOption> = {},
): DecisionOption {
  return { id, label, action, chance: optionOdds(b, action), ...extra }
}

/**
 * La jugada del asalto: lo que puedes hacer AHORA, ordenado para que lo
 * interesante esté arriba. No se listan las veintiocho técnicas — solo las tres
 * que mejor pintan de las que puedas pagar, más las opciones de siempre.
 */
function buildPlay(b: Battle): Decision {
  const me = ally(b)
  const rival = foe(b)
  const form = me.form ? getForm(me.form) : undefined
  const upkeep = form?.upkeep ?? 0
  const options: DecisionOption[] = []

  // Transformarse va PRIMERO: es el momento del que vive el juego.
  for (const id of availableForms(me)) {
    const f = getForm(id)!
    if (form && (f.mult.poder ?? 1) <= (form.mult.poder ?? 1)) continue
    options.push(option(b, `form:${id}`, f.name, { kind: 'transformar', id }, {
      cost: f.cost, tag: 'LÍMITE',
      desc: `${f.desc} Mantenerla cuesta ${f.upkeep} de ki por turno.`,
    }))
  }

  const pagables = affordableTechs(me).filter((t) => t.cost + upkeep <= me.ki)
  // La definitiva NUNCA se queda fuera del recorte a tres: llegar a poder
  // lanzarla es el premio de todo el asalto y sería absurdo esconderla.
  const ults = pagables.filter((t) => t.ultimate)
  const techs = [
    ...ults,
    ...pagables
      .filter((t) => !t.ultimate)
      .sort((x, y) => optionOdds(b, { kind: 'tecnica', id: y.id }) - optionOdds(b, { kind: 'tecnica', id: x.id }))
      .slice(0, 3),
  ]
  for (const t of techs) {
    options.push(option(b, `tech:${t.id}`, t.name, { kind: 'tecnica', id: t.id }, {
      cost: t.cost, desc: t.desc,
      tag: t.ultimate ? 'DEFINITIVA' : t.kind === 'energia' ? 'RAYO' : undefined,
    }))
  }

  // FUSIÓN: solo si el compañero está vivo y los dos tienen ki. Va arriba
  // porque es la jugada más gorda que existe.
  for (const c of b.allies) {
    if (c.uid === me.uid || c.fainted || c.hp <= 0) continue
    const fus = fusionOf(me.baseId, c.baseId)
    if (!fus || me.ki < fus.cost || c.ki < fus.cost) continue
    options.push(option(b, `fus:${fus.id}`, fus.name, { kind: 'fusion', id: fus.id }, {
      cost: fus.cost, tag: 'FUSIÓN',
      desc: `${fus.desc} Tú y ${c.name} os convertís en uno solo para el resto del combate.`,
    }))
  }

  options.push(option(b, 'golpe', 'Cuerpo a cuerpo', { kind: 'golpe' }, {
    desc: `Gratis y carga ${KI_PUNCH} de ki. Es como se sostiene una transformación.`,
  }))
  options.push(option(b, 'cargar', 'Concentrar ki', { kind: 'cargar' }, {
    desc: `+${KI_CHARGE} de ki, pero quedas descubierto y te pegarán más fuerte.`,
  }))
  options.push(option(b, 'guardia', 'Cubrirse', { kind: 'guardia' }, {
    desc: `Encajas mucho menos y ganas ${KI_GUARD} de ki.`,
  }))

  // Los objetos solo salen cuando pintan bastos: si no, ensucian cada asalto.
  if (me.hp < me.hpMax * 0.5) {
    for (const [id, n] of Object.entries(b.bag)) {
      const it = getItem(id)
      if (!it || it.kind !== 'uso' || !(n > 0)) continue
      options.push(option(b, `item:${id}`, it.name, { kind: 'objeto', id }, {
        desc: it.desc, tag: `×${n}`,
      }))
    }
  }

  const apuros = me.hp < me.hpMax * 0.3
  return {
    kind: 'jugada',
    headline: apuros ? `¡${me.name} está al límite!` : `Asalto ${b.round}`,
    desc: apuros ? 'Un golpe más y cae. Lo que decidas ahora es lo que hay.' : undefined,
    actorUid: me.uid,
    rivalUid: rival.uid,
    options,
  }
}

function askClash(b: Battle, mine: Technique, theirs: Technique): void {
  const me = ally(b)
  b.decision = {
    kind: 'choque',
    headline: '¡Choque de rayos!',
    desc: `${mine.name} contra ${theirs.name}. El que gane el pulso se lleva el impacto entero.`,
    actorUid: me.uid,
    rivalUid: foe(b).uid,
    rivalTech: theirs.id,
    options: PUSH_OPTIONS.filter((p) => p <= me.ki).map((p) => ({
      id: `push:${p}`,
      label: p === 0 ? 'Aguantar' : `Empujar +${p}`,
      desc: p === 0 ? 'Sin gastar nada de más.' : `Quemas ${p} de ki extra para ganar el pulso.`,
      cost: p,
      chance: Math.max(0.05, Math.min(0.95, 0.5 + (p / 100) * 1.1)),
      tag: p === 30 ? 'A TODO' : undefined,
      action: { kind: 'nada' as const },
    })),
  }
  b.phase = 'decision'
}

// -------------------------------------------------------------- el bucle ---

/** ¿Las dos acciones de este turno son rayos que van a chocar? */
function clashTechs(b: Battle, mine: Action, theirs: Action): [Technique, Technique] | null {
  if (mine.kind !== 'tecnica' || theirs.kind !== 'tecnica') return null
  const a = techFor(ally(b), mine.id)
  const c = techFor(foe(b), theirs.id)
  if (!a || !c) return null
  if (a.kind !== 'energia' || c.kind !== 'energia') return null
  return [a, c]
}

function resolveTurn(b: Battle, rng: RNG): void {
  const me = ally(b)
  const enemy = foe(b)
  const mine = b.chosen ?? { kind: 'golpe' as const }
  const theirs: Action = enemy.stunned
    ? { kind: 'nada' }
    : (b.foeChosen ?? aiAction(enemy, me, aiSkill, rng))
  if (enemy.stunned) { enemy.stunned = false; log(b, { t: 'stun', side: 'rival', uid: enemy.uid }) }

  // ¿Choque de rayos? Es el momento estrella: si mandas tú, se te pregunta
  // cuánto ki quemas para empujar antes de resolver nada.
  const clash = clashTechs(b, mine, theirs)
  if (clash) {
    if (b.push == null && !b.auto) {
      b.foeChosen = theirs
      askClash(b, clash[0], clash[1])
      return
    }
    const myPush = b.push ?? aiPush(me, 0.6, rng)
    resolveClash(b, me, enemy, clash[0], clash[1], myPush, aiPush(enemy, aiSkill, rng), rng)
    b.chosen = undefined
    b.foeChosen = undefined
    b.push = undefined
    endOfTurn(b, rng)
    settle(b, rng)
    return
  }

  // Orden: prioridad primero, velocidad después. Empate → gana el jugador.
  const meFirst = priority(mine) !== priority(theirs)
    ? priority(mine) > priority(theirs)
    : effStats(me).velocidad >= effStats(enemy).velocidad

  if (meFirst) {
    performAction(b, me, enemy, mine, rng)
    if (enemy.hp > 0) performAction(b, enemy, me, theirs, rng)
  } else {
    performAction(b, enemy, me, theirs, rng)
    if (me.hp > 0) performAction(b, me, enemy, mine, rng)
  }

  b.chosen = undefined
  b.foeChosen = undefined
  b.push = undefined
  endOfTurn(b, rng)
  settle(b, rng)
}

/**
 * UN LATIDO del combate. La UI lo llama cuando ha terminado de contar lo
 * anterior, así que el ritmo lo marca la retransmisión y no un bucle cerrado.
 *
 * Vuelve cuando el combate acaba o cuando hay que preguntarte algo: entre
 * medias, tu luchador se gestiona solo. Ese es el trato del modo — decides lo
 * que importa, no cada puñetazo.
 */
export function advance(b: Battle): void {
  if (b.over || b.phase === 'decision') return
  const rng = rngOf(b)

  if (b.chosen) {
    resolveTurn(b, rng)
    commit(b, rng)
    return
  }

  if (b.turn >= TURN_CAP) {
    // El desempate NO puede premiar al jugador por tener más cuerpos: con
    // «gana quien conserve más vida» le bastaba con aguantar, y llevar cuatro
    // luchadores contra uno hace que eso sea gratis. Si has llegado hasta aquí
    // sin tumbarlo, es que no podías: solo cuenta si lo dejaste agonizando.
    const rival = foe(b)
    log(b, { t: 'text', text: 'Ninguno de los dos puede con el otro…' })
    finish(b, rival.hp <= rival.hpMax * 0.25)
    commit(b, rng)
    return
  }

  b.turn += 1
  log(b, { t: 'turn', n: b.turn })
  // Lo que dura un turno: la guardia y el estar descubierto por haber cargado
  // se limpian AQUÍ, así que castigar una carga exige hacerlo ya.
  for (const c of [...b.allies, ...b.enemies]) { c.guarding = false; c.exposed = false }

  const me = ally(b)
  if (me.stunned) {
    me.stunned = false
    log(b, { t: 'stun', side: 'aliado', uid: me.uid })
    b.chosen = { kind: 'nada' }
    resolveTurn(b, rng)
    commit(b, rng)
    return
  }

  // ¿Te toca decidir? Al empezar cada asalto, y siempre que estés en la lona.
  const asalto = (b.turn - 1) % ROUND_LENGTH === 0
  const apuros = me.hp < me.hpMax * 0.3
  if (!b.auto && (asalto || apuros)) {
    b.round = Math.floor((b.turn - 1) / ROUND_LENGTH) + 1
    b.decision = buildPlay(b)
    b.phase = 'decision'
    commit(b, rng)
    return
  }

  // Si no, tu luchador se apaña solo con la misma cabeza que el rival.
  b.chosen = aiAction(me, foe(b), 0.7, rng, b.bag)
  resolveTurn(b, rng)
  commit(b, rng)
}

/**
 * Resuelve el momento clave con la opción elegida. Única puerta de entrada
 * desde la UI: `advance` no vuelve a correr hasta que esto se llama.
 */
export function chooseOption(b: Battle, optionId: string): void {
  const d = b.decision
  if (!d || b.phase !== 'decision') return
  const opt = d.options.find((o) => o.id === optionId)
  if (!opt || opt.disabled) return

  b.decision = null
  b.phase = 'idle'

  if (d.kind === 'relevo') {
    switchTo(b, optionId.slice('relay:'.length), true)
    return
  }
  if (d.kind === 'choque') {
    b.push = Math.max(0, Math.min(ally(b).ki, Number(optionId.slice('push:'.length)) || 0))
    advance(b)
    return
  }
  b.chosen = opt.action
  advance(b)
}

/** Activa/desactiva el piloto automático a mitad de combate. */
export function setAuto(b: Battle, on: boolean): void {
  b.auto = on
  if (!on || !b.decision) return
  // Con el automático puesto, lo que hubiera pendiente se resuelve solo.
  const d = b.decision
  b.decision = null
  b.phase = 'idle'
  if (d.kind === 'relevo') {
    const alive = b.allies.find((c) => !c.fainted && c.hp > 0)
    if (alive) switchTo(b, alive.uid, true)
  }
}
