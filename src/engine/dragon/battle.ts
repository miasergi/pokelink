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
import { effStats, KI_MAX, KI_REGEN_LINEAGE, styleMultiplier, toCombatant } from './roster'
import type { Action, Battle, BattleEvent, Combatant, Fighter, Side, StatKey, Technique } from './types'

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

/** Las que puede pagar ahora mismo. */
export function affordableTechs(c: Combatant): Technique[] {
  return c.techniques
    .map((id) => getTechnique(id))
    .filter((t): t is Technique => !!t && t.cost <= c.ki)
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
  const allies = party.map(toCombatant)
  const first = allies.findIndex((c) => !c.fainted)
  const b: Battle = {
    seed: opts.seed,
    rngState: new RNG(opts.seed).getState(),
    turn: 0,
    allies,
    enemies: enemies.map(toCombatant),
    active: first < 0 ? 0 : first,
    enemyActive: 0,
    log: [],
    over: false,
    phase: 0,
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

function applyTechEffects(b: Battle, user: Combatant, target: Combatant, t: Technique, rng: RNG): void {
  if (t.buff) {
    for (const k of Object.keys(t.buff) as StatKey[]) {
      user.mods[k] = (user.mods[k] ?? 1) * (t.buff[k] ?? 1)
    }
    log(b, { t: 'buff', side: sideOf(b, user), uid: user.uid, text: `${user.name} se concentra` })
  }
  if (t.debuff && !target.fainted) {
    for (const k of Object.keys(t.debuff) as StatKey[]) {
      target.mods[k] = (target.mods[k] ?? 1) * (t.debuff[k] ?? 1)
    }
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
      const t = techOf(a.id)
      if (!t || t.cost > actor.ki) {
        // Sin ki para lo que pidió: se queda en un golpe, no en un turno perdido.
        performAction(b, actor, target, { kind: 'golpe' }, rng)
        return
      }
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
    case 'objeto': {
      const it = a.id ? getItem(a.id) : undefined
      if (!it || !(b.bag[it.id] > 0)) return
      b.bag[it.id] -= 1
      log(b, { t: 'action', side: sideOf(b, actor), uid: actor.uid, kind: 'objeto', name: it.name })
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

/** ¿Las dos acciones de este turno son rayos que van a chocar? */
function clashTechs(mine: Action, theirs: Action): [Technique, Technique] | null {
  if (mine.kind !== 'tecnica' || theirs.kind !== 'tecnica') return null
  const a = techOf(mine.id)
  const c = techOf(theirs.id)
  if (!a || !c) return null
  if (a.kind !== 'energia' || c.kind !== 'energia') return null
  return [a, c]
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
  if (buff && c.ki > 60 && !Object.keys(c.mods).length && rng.chance(0.2 + skill * 0.3)) {
    return { kind: 'tecnica', id: buff.id }
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

/** Marca caídos y resuelve fases de jefe, relevos y final del combate. */
function settle(b: Battle, rng: RNG): void {
  const f = foe(b)
  if (f.hp <= 0 && !f.fainted) {
    // ¿Le queda otra forma? Jefe multifase: se levanta más fuerte y a tope.
    const next = b.phases?.[b.phase]
    if (next) {
      b.phase += 1
      f.form = next
      // Cuanta más fases tenga el jefe, menos vida trae cada una. Con la barra
      // entera en todas, Freezer sumaba cuatro barras Y multiplicadores de
      // ×2,6: dos ventajas apiladas que hacían el combate inganable. Así el
      // total de vida del jefe se mantiene parecido tenga 1 fase o 3, y las
      // fases aportan lo que deben aportar: que el combate cambie de forma.
      const total = b.phases?.length ?? 1
      const refill = total >= 3 ? 0.5 : total === 2 ? 0.62 : 0.75
      f.hp = Math.round(f.hpMax * refill)
      f.ki = KI_MAX
      f.mods = {}
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
        b.over = true
        b.win = true
        log(b, { t: 'end', win: true })
        return
      }
      b.enemyActive = alive
      log(b, { t: 'switch', side: 'rival', uid: b.enemies[alive].uid, name: b.enemies[alive].name })
      enrage(b, b.enemies[alive])
    }
  }

  const me = ally(b)
  if (me.hp <= 0 && !me.fainted) {
    me.fainted = true
    me.form = undefined
    log(b, { t: 'faint', side: 'aliado', uid: me.uid })
    const alive = b.allies.filter((c) => !c.fainted && c.hp > 0)
    if (!alive.length) {
      b.over = true
      b.win = false
      log(b, { t: 'end', win: false })
      return
    }
    if (b.auto || alive.length === 1) {
      switchTo(b, alive[0].uid, true)
    } else {
      b.pending = { kind: 'relevo' }
    }
  }
  void rng
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
  c.mods.poder = (c.mods.poder ?? 1) * RAGE_MULT
  c.mods.ki = (c.mods.ki ?? 1) * RAGE_MULT
  c.ki = c.kiMax
  log(b, { t: 'buff', side: sideOf(b, c), uid: c.uid, text: `¡${c.name} estalla de rabia!` })
}

export function switchTo(b: Battle, uid: string, rage = false): void {
  const i = b.allies.findIndex((c) => c.uid === uid && !c.fainted && c.hp > 0)
  if (i < 0) return
  b.active = i
  b.pending = undefined
  log(b, { t: 'switch', side: 'aliado', uid, name: b.allies[i].name })
  if (rage) enrage(b, b.allies[i])
}

/** Dificultad de la IA rival, guardada fuera del save (se pasa al avanzar). */
let aiSkill = 0.55
export function setAiSkill(v: number): void { aiSkill = Math.max(0, Math.min(1, v)) }
export function getAiSkill(): number { return aiSkill }

function resolveTurn(b: Battle, rng: RNG): void {
  const me = ally(b)
  const enemy = foe(b)
  const mine = b.chosen ?? { kind: 'golpe' as const }
  const theirs: Action = enemy.stunned
    ? { kind: 'nada' }
    : (b.foeChosen ?? aiAction(enemy, me, aiSkill, rng))
  if (enemy.stunned) { enemy.stunned = false; log(b, { t: 'stun', side: 'rival', uid: enemy.uid }) }

  // ¿Choque de rayos? Es el momento estrella: si el jugador manda, se le
  // pregunta cuánto ki quema para empujar antes de resolver nada.
  const clash = clashTechs(mine, theirs)
  if (clash) {
    if (b.push == null && !b.auto) {
      b.foeChosen = theirs
      b.pending = { kind: 'choque', myTech: clash[0].id, enemyTech: clash[1].id }
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
 * Avanza el combate hasta que necesite al jugador o termine. Es la única
 * puerta: `choose`, `pushClash` y `switchTo` solo dejan el estado listo y
 * vuelven a llamar aquí.
 */
export function advance(b: Battle): void {
  const rng = rngOf(b)
  let guard = 0
  while (!b.over && !b.pending && guard++ < 600) {
    if (b.chosen) { resolveTurn(b, rng); continue }

    b.turn += 1
    log(b, { t: 'turn', n: b.turn })
    // Lo que dura un turno: la guardia y el estar descubierto por haber
    // cargado se limpian AQUÍ, así que castigar una carga exige hacerlo ya.
    for (const c of [...b.allies, ...b.enemies]) { c.guarding = false; c.exposed = false }

    const me = ally(b)
    if (me.stunned) {
      me.stunned = false
      log(b, { t: 'stun', side: 'aliado', uid: me.uid })
      b.chosen = { kind: 'nada' }
      continue
    }
    if (b.auto) { b.chosen = aiAction(me, foe(b), 0.7, rng, b.bag); continue }
    b.pending = { kind: 'accion' }
  }
  commit(b, rng)
}

/** El jugador elige su acción del turno. */
export function choose(b: Battle, action: Action): void {
  if (b.over || b.pending?.kind !== 'accion') return
  b.pending = undefined
  b.chosen = action
  advance(b)
}

/** El jugador decide cuánto ki quema para empujar en el choque de rayos. */
export function pushClash(b: Battle, ki: number): void {
  if (b.pending?.kind !== 'choque') return
  b.pending = undefined
  b.push = Math.max(0, Math.min(ally(b).ki, ki))
  advance(b)
}

/** El jugador elige relevo tras un KO. */
export function chooseSwitch(b: Battle, uid: string): void {
  if (b.pending?.kind !== 'relevo') return
  switchTo(b, uid, true)
  advance(b)
}

/** Activa/desactiva el piloto automático a mitad de combate. */
export function setAuto(b: Battle, on: boolean): void {
  b.auto = on
  if (on && b.pending) {
    if (b.pending.kind === 'relevo') {
      const alive = b.allies.find((c) => !c.fainted && c.hp > 0)
      if (alive) switchTo(b, alive.uid)
    }
    b.pending = undefined
    advance(b)
  }
}
