import { describe, expect, it } from 'vitest'
import { ISLAS } from '@/data/corsarios/islas'
import { getPirata, PIRATAS } from '@/data/corsarios/piratas'
import { crearUnidad, simular } from './battle'
import {
  alternarFormacion, aplicarMar, aplicarResultado, bonusEquipo, cobrarEncargo, combatir, combatirMar,
  costeEntreno, desequipar, diarioHoy, disponibles, encargoListo, entrenar, equipar, faseAbierta, huecos,
  INVENTARIO_MAX, islaSuperada, migrar, nuevaPartida, PIEDAD_MAX, portadorDe, puedeEntrenar, puedeTirar,
  tirar, unidadesAliadas, unidadesMar, vender, venderSobrantes,
} from './game'
import type { CorsariosSave } from './types'

const RAREZA_ORDEN = { C: 0, R: 1, E: 2, L: 3 }

/** Bot sencillo: juega como alguien que no se lee nada. */
function bot(seed: number, maxCombates = 900) {
  let s: CorsariosSave = nuevaPartida('Bot', 'espada', seed)
  let dia = 0
  let derrotasSeguidas = 0
  const derrotasPorFase: Record<string, number> = {}
  for (let c = 0; c < maxCombates; c++) {
    // Siguiente fase por jugar.
    let objetivo: [number, number] | null = null
    for (let i = 0; i < ISLAS.length && !objetivo; i++) {
      for (let f = 0; f < 4; f++) {
        if (faseAbierta(s, i, f) && !(s.estrellas[`${i}-${f}`] > 0)) { objetivo = [i, f]; break }
      }
    }
    if (!objetivo) return { s, combates: c, terminado: true, derrotasPorFase, mar: mar(s, seed) }

    // Gasta: perlas en el cofre, doblones en entrenar a la formación.
    while (puedeTirar(s, 'perlas', 1)) s = tirar(s, 'perlas', 1, seed * 31 + s.combates * 7 + s.perlas).save
    if (puedeTirar(s, 'taberna', 1, `d${dia}`)) s = tirar(s, 'taberna', 1, seed + dia * 13, `d${dia}`).save
    if (c % 5 === 0) dia++
    // Formación: los mejores por rareza*estrellas*nivel.
    const orden = [...s.tripulacion].sort((a, b) =>
      (RAREZA_ORDEN[getPirata(b.id).rareza] * 10 + b.estrellas * 3 + b.nivel / 5) -
      (RAREZA_ORDEN[getPirata(a.id).rareza] * 10 + a.estrellas * 3 + a.nivel / 5))
    s = { ...s, formacion: ['capitan', ...orden.slice(0, huecos(s) - 1).map((t) => t.id)] }
    // Equipo: lo mejor de la bodega a los primeros de la formación.
    const val = { C: 0, R: 1, E: 2, L: 3 }
    for (const tipo of ['arma', 'amuleto'] as const) {
      const libres = [...s.inventario].filter((p) => p.tipo === tipo).sort((a, b) => val[b.rareza] - val[a.rareza])
      s.formacion.forEach((id, k) => { if (libres[k]) s = equipar(s, id, libres[k].uid) })
    }
    let entreno = true
    while (entreno) {
      entreno = false
      for (const id of s.formacion.slice(1)) if (puedeEntrenar(s, id)) { s = entrenar(s, id); entreno = true }
    }

    // Si pierde mucho seguido, repite la última fase superada para farmear.
    let [i, f] = objetivo
    if (derrotasSeguidas >= 2) {
      const prev = f > 0 ? [i, f - 1] : [i - 1, 3]
      if (prev[0] >= 0) [i, f] = prev as [number, number]
    }
    const r = combatir(s, i, f)
    const { save, botin } = aplicarResultado(s, i, f, r)
    s = save
    if (i === objetivo[0] && f === objetivo[1]) {
      if (botin.gana) derrotasSeguidas = 0
      else { derrotasSeguidas++; derrotasPorFase[`${i}-${f}`] = (derrotasPorFase[`${i}-${f}`] ?? 0) + 1 }
    } else derrotasSeguidas = 0
  }
  return { s, combates: maxCombates, terminado: false, derrotasPorFase, mar: 0 }
}

/** Tras la campaña: 150 intentos en el Mar Abierto, devuelve el piso alcanzado. */
function mar(s0: CorsariosSave, seed: number): number {
  let s = s0
  for (let k = 0; k < 150; k++) {
    while (puedeTirar(s, 'perlas', 1)) s = tirar(s, 'perlas', 1, seed * 17 + s.combates).save
    for (const id of s.formacion.slice(1)) while (puedeEntrenar(s, id)) s = entrenar(s, id)
    s = aplicarMar(s, combatirMar(s)).save
  }
  return s.marPiso
}

describe('Corsarios · combate', () => {
  it('es determinista con la misma semilla', () => {
    const a = [crearUnidad(getPirata('bruna'), 5, 'a', 'a0')]
    const e = [crearUnidad(getPirata('r-bruto'), 5, 'e', 'e0')]
    expect(simular(a, e, 42)).toEqual(simular(a, e, 42))
  })

  it('termina siempre y los HP no salen de rango', () => {
    for (let seed = 1; seed < 40; seed++) {
      const s = nuevaPartida('X', 'puno', seed)
      const r = combatir(s, 0, 0)
      expect(['a', 'e']).toContain(r.gana)
      for (const ev of r.eventos) {
        if (ev.t === 'accion' || ev.t === 'veneno') {
          for (const im of ev.impactos) expect(im.hp).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('la primera fase se gana con el equipo inicial casi siempre', () => {
    let wins = 0
    for (let seed = 1; seed <= 50; seed++) if (combatir(nuevaPartida('X', 'espada', seed), 0, 0).gana === 'a') wins++
    expect(wins).toBeGreaterThanOrEqual(40)
  })
})

describe('Corsarios · taberna', () => {
  it('cobra, garantiza Épico en x10 y Legendario por piedad', () => {
    let s = { ...nuevaPartida('X', 'espada', 1), perlas: 100000 }
    const r10 = tirar(s, 'perlas', 10, 7)
    expect(r10.tiradas).toHaveLength(10)
    expect(r10.tiradas.some((t) => t.rareza === 'E' || t.rareza === 'L')).toBe(true)
    expect(r10.save.perlas).toBe(100000 - 900)
    let sinL = 0
    let max = 0
    for (let k = 0; k < 400; k++) {
      const res = tirar(s, 'perlas', 1, 1000 + k)
      s = res.save
      if (res.tiradas[0].rareza === 'L') sinL = 0
      else max = Math.max(max, ++sinL)
    }
    expect(max).toBeLessThan(PIEDAD_MAX)
  })

  it('la tirada gratis es una al día', () => {
    let s = { ...nuevaPartida('X', 'espada', 1), doblones: 0 }
    expect(puedeTirar(s, 'taberna', 1, 'd1')).toBe(true)
    s = tirar(s, 'taberna', 1, 3, 'd1').save
    expect(puedeTirar(s, 'taberna', 1, 'd1')).toBe(false)
    expect(puedeTirar(s, 'taberna', 1, 'd2')).toBe(true)
  })

  it('los jefes solo salen tras vencerlos', () => {
    const s = nuevaPartida('X', 'espada', 1)
    expect(disponibles(s).some((d) => d.id === 'gallardo')).toBe(false)
    const tras = { ...s, estrellas: { '0-3': 1 } }
    expect(disponibles(tras).some((d) => d.id === 'gallardo')).toBe(true)
    // Cada rareza tiene al menos un pirata disponible desde el principio.
    for (const r of ['C', 'R', 'E', 'L'] as const) expect(disponibles(s).some((d) => d.rareza === r)).toBe(true)
    expect(PIRATAS.filter((d) => d.desbloqueaIsla != null)).toHaveLength(ISLAS.length)
  })

  it('la formación respeta los huecos y el capitán no sale', () => {
    let s = nuevaPartida('X', 'espada', 1)
    s = { ...s, tripulacion: [...s.tripulacion, { id: 'bruna', nivel: 1, estrellas: 1 }, { id: 'algas', nivel: 1, estrellas: 1 }] }
    s = alternarFormacion(s, 'bruna')
    s = alternarFormacion(s, 'algas') // no cabe: 3 huecos
    expect(s.formacion).toEqual(['capitan', 'tomas', 'bruna'])
    expect(alternarFormacion(s, 'capitan').formacion).toContain('capitan')
    expect(unidadesAliadas(s)).toHaveLength(3)
    expect(costeEntreno(10)).toBeGreaterThan(costeEntreno(2))
  })
})

describe('Corsarios · curva de la campaña (bots)', () => {
  it('un bot completa las seis islas en un número razonable de combates', () => {
    const res = Array.from({ length: 12 }, (_, k) => bot(100 + k))
    const combates = res.map((r) => r.combates).sort((a, b) => a - b)
    const terminados = res.filter((r) => r.terminado).length
    // Informe para calibrar a mano.
    const muros: Record<string, number> = {}
    for (const r of res) for (const [k, v] of Object.entries(r.derrotasPorFase)) muros[k] = (muros[k] ?? 0) + v
    console.log('combates para acabar:', combates.join(', '), '| terminados', terminados, '/ 12')
    console.log('derrotas por fase:', JSON.stringify(muros))
    console.log('nivel final:', res.map((r) => r.s.nivel).join(', '))
    console.log('Mar Abierto (150 intentos):', res.map((r) => r.mar).join(', '))
    // El Mar Abierto ni se acaba en dos tardes ni se atasca en el primer piso.
    const pisos = res.filter((r) => r.terminado).map((r) => r.mar)
    expect(Math.min(...pisos)).toBeGreaterThanOrEqual(3)
    expect(Math.max(...pisos)).toBeLessThan(140)
    expect(terminados).toBeGreaterThanOrEqual(10)
    // Ni regalado ni eterno: entre ~40 y ~400 combates.
    expect(combates[Math.floor(combates.length / 2)]).toBeGreaterThan(40)
    expect(combates[Math.floor(combates.length / 2)]).toBeLessThan(400)
    expect(res.every((r) => !r.terminado || islaSuperada(r.s, ISLAS.length - 1))).toBe(true)
  })
})

describe('Corsarios · equipo y botín', () => {
  const conPiezas = (): CorsariosSave => {
    const s = nuevaPartida('X', 'espada', 1)
    s.inventario = [
      { uid: 'p1', tipo: 'arma', rareza: 'E', nombre: 'Alfanje', bonus: 0.16 },
      { uid: 'p2', tipo: 'amuleto', rareza: 'C', nombre: 'Diente', bonus: 0.06 },
      { uid: 'p3', tipo: 'arma', rareza: 'C', nombre: 'Cuchillo', bonus: 0.06 },
    ]
    s.piezasSeq = 3
    return s
  }

  it('equipar sube las estadísticas y mueve la pieza entre portadores', () => {
    let s = conPiezas()
    const antes = unidadesAliadas(s)[0].atk
    s = equipar(s, 'capitan', 'p1')
    expect(unidadesAliadas(s)[0].atk).toBeGreaterThan(antes)
    expect(bonusEquipo(s, 'capitan').atk).toBeCloseTo(0.16)
    s = equipar(s, 'tomas', 'p1')
    expect(portadorDe(s, 'p1')).toBe('tomas')
    expect(s.equipoCapitan.arma).toBeUndefined()
    s = desequipar(s, 'tomas', 'arma')
    expect(portadorDe(s, 'p1')).toBeUndefined()
  })

  it('vender quita la pieza (aunque esté equipada) y paga', () => {
    let s = equipar(conPiezas(), 'tomas', 'p1')
    const d = s.doblones
    s = vender(s, 'p1')
    expect(s.inventario.some((p) => p.uid === 'p1')).toBe(false)
    expect(s.tripulacion[0].arma).toBeUndefined()
    expect(s.doblones).toBeGreaterThan(d)
    const r = venderSobrantes(equipar(s, 'capitan', 'p3'), 'C')
    expect(r.vendidas).toBe(1) // el cuchillo equipado no se vende
    expect(r.save.inventario.map((p) => p.uid)).toEqual(['p3'])
  })

  it('los jefes siempre sueltan botín y con la bodega llena se vende solo', () => {
    let s = nuevaPartida('X', 'espada', 1)
    s = { ...s, nivel: 60, tripulacion: [{ id: 'oleg', nivel: 60, estrellas: 5 }, { id: 'faro', nivel: 60, estrellas: 5 }], formacion: ['capitan', 'oleg', 'faro'] }
    const r = combatir(s, 0, 3)
    expect(r.gana).toBe('a')
    const { save, botin } = aplicarResultado(s, 0, 3, r)
    expect(botin.pieza).toBeDefined()
    expect(save.inventario).toHaveLength(1)
    const llena = { ...s, inventario: Array.from({ length: INVENTARIO_MAX }, (_, k) => ({ uid: `x${k}`, tipo: 'arma' as const, rareza: 'C' as const, nombre: 'x', bonus: 0.06 })) }
    const res = aplicarResultado(llena, 0, 3, combatir(llena, 0, 3))
    expect(res.botin.piezaVendida).toBe(true)
    expect(res.save.inventario).toHaveLength(INVENTARIO_MAX)
  })
})

describe('Corsarios · encargos, Mar Abierto y saves viejos', () => {
  it('los encargos cuentan, se cobran una vez y se reinician al cambiar de día', () => {
    let s = { ...nuevaPartida('X', 'espada', 1), doblones: 10000 }
    s = tirar(s, 'taberna', 1, 5, 'd1').save
    expect(encargoListo(s, 1, 'd1')).toBe(true)
    const p = s.perlas
    s = cobrarEncargo(s, 1, 'd1')
    expect(s.perlas).toBe(p + 20)
    expect(cobrarEncargo(s, 1, 'd1')).toBe(s)
    expect(diarioHoy(s, 'd2').tiradas).toBe(0)
    expect(encargoListo(s, 1, 'd2')).toBe(false)
  })

  it('el Mar Abierto es determinista por piso y sube de dificultad', () => {
    expect(unidadesMar(7)).toEqual(unidadesMar(7))
    const fuerza = (n: number) => unidadesMar(n).reduce((t, u) => t + u.maxHp * u.atk, 0)
    expect(fuerza(30)).toBeGreaterThan(fuerza(10))
    expect(unidadesMar(5).length).toBe(4)
    expect(unidadesMar(5).some((u) => u.defId === 'hierro' || u.defId === 'brasa' || u.defId === 'gallardo' || u.defId === 'medusa' || u.defId === 'huesos' || u.defId === 'viuda')).toBe(true)
  })

  it('migrar rellena lo que no tenían las partidas antiguas', () => {
    const viejo = nuevaPartida('X', 'espada', 1) as Partial<CorsariosSave>
    delete viejo.inventario; delete viejo.diario; delete viejo.marPiso; delete viejo.vistos; delete viejo.equipoCapitan
    const s = migrar(viejo as CorsariosSave)
    expect(s.inventario).toEqual([])
    expect(s.marPiso).toBe(0)
    expect(unidadesAliadas(s)).toHaveLength(2)
  })
})
