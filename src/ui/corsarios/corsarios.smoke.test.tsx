// @vitest-environment jsdom
// Humo de Corsarios: cada vista se pinta sin romper, tanto con una partida
// recién empezada como con una avanzada (equipo, Mar Abierto, escenas, jefe).
import { describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'
import { createElement } from 'react'
import CorsariosScreen from '@/ui/screens/CorsariosScreen'
import { useCorsarios, type Vista } from '@/state/corsariosStore'
import {
  aplicarMar, aplicarResultado, combatir, combatirMar, equipar, nuevaPartida, tirar,
} from '@/engine/corsarios/game'
import { ISLAS } from '@/data/corsarios/islas'
import { modVacio } from '@/data/corsarios/mods'
import type { CorsariosSave } from '@/engine/corsarios/types'

function avanzada(): CorsariosSave {
  let s = nuevaPartida('Luis', 'puno', 7)
  s = { ...s, nivel: 60, perlas: 5000, doblones: 99999 }
  for (let k = 0; k < 4; k++) s = tirar(s, 'perlas', 10, 100 + k).save
  for (let i = 0; i < ISLAS.length; i++) for (let f = 0; f < 4; f++) s.estrellas[`${i}-${f}`] = 3
  s.tripulacion = s.tripulacion.map((t) => ({ ...t, nivel: 60, estrellas: 5 }))
  s.formacion = ['capitan', ...s.tripulacion.slice(0, 4).map((t) => t.id)]
  s.inventario = [
    { uid: 'p1', tipo: 'arma', rareza: 'L', nombre: 'Colmillo del Kraken', bonus: 0.25 },
    { uid: 'p2', tipo: 'amuleto', rareza: 'E', nombre: 'Perla negra', bonus: 0.16 },
    { uid: 'p3', tipo: 'arma', rareza: 'C', nombre: 'Cuchillo oxidado', bonus: 0.06 },
  ]
  s.piezasSeq = 3
  s = equipar(s, 'capitan', 'p1')
  s = equipar(s, s.formacion[1], 'p2')
  s.vistos = ['tuto', 'fin']
  s.marPiso = 9
  return s
}

// El combate y la taberna arrancan temporizadores: aquí solo importa el
// primer pintado, así que cada prueba monta, lee y desmonta.
function pinta(): string {
  const el = document.createElement('div')
  const root = createRoot(el)
  act(() => { root.render(createElement(CorsariosScreen)) })
  const html = el.innerHTML
  act(() => { root.unmount() })
  return html
}

describe('Corsarios · humo de la UI', () => {
  it('pinta la creación del capitán', () => {
    useCorsarios.setState({ cargado: true, save: null, vista: 'setup', batalla: null, tiradas: null, escena: null })
    expect(pinta()).toContain('Zarpar')
  })

  for (const save of [nuevaPartida('Nuevo', 'espada', 1), avanzada()]) {
    for (const vista of ['islas', 'taberna', 'tripulacion', 'puerto'] as Vista[]) {
      it(`pinta ${vista} (${save.capitan.nombre})`, () => {
        useCorsarios.setState({ cargado: true, save, vista, islaSel: 5, batalla: null, tiradas: null, escena: null, aviso: 'Aviso de prueba' })
        const html = pinta()
        expect(html.length).toBeGreaterThan(500)
        expect(html).toContain('Aviso de prueba')
      })
    }
  }

  it('pinta las escenas de historia', () => {
    const save = avanzada()
    for (const escena of [{ tipo: 'tuto' as const }, { tipo: 'fin' as const }, { tipo: 'isla' as const, isla: 3 }]) {
      useCorsarios.setState({ cargado: true, save, vista: 'islas', batalla: null, escena })
      expect(pinta().length).toBeGreaterThan(500)
    }
  })

  it('pinta un combate de jefe y uno del Mar Abierto', () => {
    const save = avanzada()
    const r = combatir(save, 5, 3)
    const { botin } = aplicarResultado(save, 5, 3, r)
    useCorsarios.setState({ cargado: true, save, vista: 'batalla', escena: null, batalla: { isla: 5, fase: 3, resultado: r, botin } })
    expect(pinta()).toContain('Almirante')

    const rm = combatirMar(save)
    const bm = aplicarMar(save, rm).botin
    useCorsarios.setState({ batalla: { isla: -1, fase: 10, mar: true, resultado: rm, botin: bm } })
    expect(pinta()).toContain('Mar Abierto')
  })

  it('pinta la lista de mods', () => {
    const m = modVacio('Pack de prueba')
    m.piratas.tomas = { nombre: 'Pepe' }
    useCorsarios.setState({ cargado: true, save: avanzada(), vista: 'mods', mods: [m], modActivo: m.id, escena: null, batalla: null })
    const html = pinta()
    expect(html).toContain('Pack de prueba')
    expect(html).toContain('ACTIVO')
  })

  it('pinta el revelado de la taberna', () => {
    const save = avanzada()
    const { tiradas } = tirar(save, 'perlas', 10, 3)
    useCorsarios.setState({ cargado: true, save, vista: 'taberna', tiradas, escena: null, batalla: null })
    expect(pinta().length).toBeGreaterThan(500)
  })
})
