// Combate automático del modo Corsarios. PURO y determinista: con la misma
// semilla sale el mismo combate, y se simula entero de golpe. La UI solo
// reproduce la lista de eventos a su ritmo.
import { RNG } from '@/utils/rng'
import { CLASE_INFO } from '@/data/corsarios/piratas'
import type { Clase, Evento, Impacto, PirataDef, Resultado, SkillKind, Unidad } from './types'

export const MAX_RONDAS = 25
const ENERGIA_ATAQUE = 34
const ENERGIA_GOLPE = 12
const FACTOR_DANO = 2.2

/** Multiplicador de estadísticas por nivel y estrellas. */
export function escala(nivel: number, estrellas = 1): number {
  return (1 + 0.09 * (nivel - 1)) * (1 + 0.12 * (estrellas - 1))
}

export interface OpcionesUnidad {
  estrellas?: number
  jefe?: boolean
  /** Bonus del equipo: fracción extra de ataque y de vida/defensa. */
  equipo?: { atk: number; vida: number }
  /** Multiplicador general (pisos altos del Mar Abierto). */
  mult?: number
}

export function crearUnidad(def: PirataDef, nivel: number, lado: 'a' | 'e', uid: string, opts: OpcionesUnidad = {}): Unidad {
  const m = escala(nivel, opts.estrellas ?? 1) * (opts.mult ?? 1)
  const eqAtk = 1 + (opts.equipo?.atk ?? 0)
  const eqVida = 1 + (opts.equipo?.vida ?? 0)
  const jefeHp = opts.jefe ? (def.rareza === 'L' ? 1.35 : 1.6) : 1
  const jefeAtk = 1
  const maxHp = Math.round(def.base.hp * m * jefeHp * eqVida)
  return {
    uid, defId: def.id, nombre: `${def.nombre} ${def.apodo}`.trim(), clase: def.clase, rareza: def.rareza,
    look: def.look, skill: def.skill, nivel, lado,
    maxHp, hp: maxHp,
    atk: Math.round(def.base.atk * m * jefeAtk * eqAtk),
    def: Math.round(def.base.def * m * eqVida),
    spd: def.base.spd,
    energia: 0, escudo: 0, aturdido: 0, veneno: null, rabia: 0,
  }
}

/** Ventaja de oficio: 1.3 si el atacante vence, 0.8 si pierde, 1 si nada. */
export function ventaja(atk: Clase, def: Clase): number {
  if (CLASE_INFO[atk].vence === def) return 1.3
  if (CLASE_INFO[def].vence === atk) return 0.8
  return 1
}

/** Poder orientativo de una unidad (para el «poder de combate» de la UI). */
export function poder(u: Pick<Unidad, 'maxHp' | 'atk' | 'def' | 'spd'>): number {
  return Math.round(u.maxHp * 0.25 + u.atk * 3 + u.def * 2 + u.spd * 0.5)
}

export function simular(aliados: Unidad[], enemigos: Unidad[], seed: number): Resultado {
  const rng = new RNG(seed)
  const todos = [...aliados, ...enemigos].map((u) => ({ ...u }))
  const inicial = todos.map((u) => ({ ...u }))
  const eventos: Evento[] = []
  const vivos = (lado: 'a' | 'e') => todos.filter((u) => u.lado === lado && u.hp > 0)

  const golpear = (a: Unidad, t: Unidad, mult: number): Impacto => {
    const v = ventaja(a.clase, t.clase)
    const critico = rng.chance(0.12)
    const ratio = a.atk / (a.atk + t.def)
    let dano = a.atk * (1 + a.rabia) * mult * ratio * FACTOR_DANO * v * rng.float(0.92, 1.08) * (critico ? 1.6 : 1)
    dano = Math.max(1, Math.round(dano))
    let restante = dano
    if (t.escudo > 0) {
      const abs = Math.min(t.escudo, restante)
      t.escudo -= abs
      restante -= abs
    }
    t.hp = Math.max(0, t.hp - restante)
    if (t.hp > 0) t.energia = Math.min(100, t.energia + ENERGIA_GOLPE)
    return { uid: t.uid, dano, critico, ventaja: v > 1, ko: t.hp === 0, hp: t.hp, escudoRestante: t.escudo }
  }

  let ronda = 0
  let gana: 'a' | 'e' | null = null
  while (!gana && ronda < MAX_RONDAS) {
    ronda++
    eventos.push({ t: 'ronda', n: ronda })
    const orden = todos.filter((u) => u.hp > 0).sort((x, y) => y.spd - x.spd || (x.uid < y.uid ? -1 : 1))
    for (const a of orden) {
      if (a.hp <= 0) continue
      // Veneno: pica al empezar su turno.
      if (a.veneno) {
        const dano = Math.min(a.hp, a.veneno.dano)
        a.hp -= dano
        a.veneno.turnos--
        if (a.veneno.turnos <= 0) a.veneno = null
        eventos.push({ t: 'veneno', impactos: [{ uid: a.uid, dano, veneno: true, ko: a.hp === 0, hp: a.hp, escudoRestante: a.escudo }] })
        if (a.hp <= 0) { gana = comprobar(); if (gana) break; continue }
      }
      if (a.aturdido > 0) {
        a.aturdido--
        eventos.push({ t: 'aturdido', actor: a.uid })
        continue
      }
      const rivales = vivos(a.lado === 'a' ? 'e' : 'a')
      const amigos = vivos(a.lado)
      if (!rivales.length) break

      const especial = a.energia >= 100
      const impactos: Impacto[] = []
      let kind: SkillKind | 'basico' = 'basico'
      let nombre = 'Ataque'
      if (!especial) {
        // Básico: prefiere al rival al que tiene ventaja, con algo de azar.
        const conVentaja = rivales.filter((r) => ventaja(a.clase, r.clase) > 1)
        const t = conVentaja.length && rng.chance(0.6) ? rng.pick(conVentaja) : rng.pick(rivales)
        impactos.push(golpear(a, t, a.clase === 'apoyo' ? 0.8 : 1))
        a.energia = Math.min(100, a.energia + ENERGIA_ATAQUE)
      } else {
        const s = a.skill
        kind = s.kind
        nombre = s.nombre
        a.energia = 0
        switch (s.kind) {
          case 'golpe': {
            const t = rivales.reduce((m, r) => (ventaja(a.clase, r.clase) > ventaja(a.clase, m.clase) || (ventaja(a.clase, r.clase) === ventaja(a.clase, m.clase) && r.hp < m.hp) ? r : m))
            impactos.push(golpear(a, t, s.mult))
            break
          }
          case 'barrido':
            for (const t of rivales) impactos.push(golpear(a, t, s.mult))
            break
          case 'doble':
            for (const t of rng.sample(rivales, 2)) impactos.push(golpear(a, t, s.mult))
            break
          case 'aturde': {
            const t = rivales.reduce((m, r) => (r.atk > m.atk ? r : m))
            const imp = golpear(a, t, s.mult)
            if (t.hp > 0) { t.aturdido = 1; imp.aturde = true }
            impactos.push(imp)
            break
          }
          case 'veneno': {
            const t = rivales.reduce((m, r) => (r.hp > m.hp ? r : m))
            const imp = golpear(a, t, s.mult)
            if (t.hp > 0) { t.veneno = { turnos: 3, dano: Math.round(a.atk * s.mult * 0.55) }; imp.veneno = true }
            impactos.push(imp)
            break
          }
          case 'rabia': {
            a.rabia = Math.min(1, a.rabia + 0.3)
            const t = rng.pick(rivales)
            impactos.push(golpear(a, t, s.mult))
            break
          }
          case 'remate': {
            const t = rivales.reduce((m, r) => (r.hp < m.hp ? r : m))
            const imp = golpear(a, t, s.mult)
            if (imp.ko) a.energia = 60
            impactos.push(imp)
            break
          }
          case 'cura':
            for (const t of amigos) {
              const cura = Math.min(t.maxHp - t.hp, Math.round(a.atk * s.mult * 1.5))
              t.hp += cura
              impactos.push({ uid: t.uid, cura, hp: t.hp, escudoRestante: t.escudo })
            }
            break
          case 'escudo':
            for (const t of amigos) {
              const escudo = Math.round(a.atk * s.mult * 1.8)
              t.escudo += escudo
              impactos.push({ uid: t.uid, escudo, hp: t.hp, escudoRestante: t.escudo })
            }
            break
        }
      }
      eventos.push({ t: 'accion', actor: a.uid, especial, nombre, kind, impactos, energia: a.energia })
      gana = comprobar()
      if (gana) break
    }
  }
  if (!gana) gana = 'e' // se acaba el tiempo: el que defiende gana
  eventos.push({ t: 'fin', gana })
  return { gana, eventos, inicial, vivos: vivos('a').length, rondas: ronda }

  function comprobar(): 'a' | 'e' | null {
    if (!vivos('e').length) return 'a'
    if (!vivos('a').length) return 'e'
    return null
  }
}
