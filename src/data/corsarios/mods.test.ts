import { afterEach, describe, expect, it } from 'vitest'
import { aplicarMod, imagenPieza, modVacio, multEspecial, nombrePieza, sanearMod, type Mod } from './mods'
import { capitanDef, getPirata } from './piratas'
import { ISLAS } from './islas'
import { FRASE_JEFE, INTRO_ISLA } from './historia'
import { combatir, nuevaPartida, unidadesAliadas } from '@/engine/corsarios/game'

const PNG = 'data:image/png;base64,iVBORw0KGgo='

function ejemplo(): Mod {
  const m = modVacio('Prueba')
  m.piratas.tomas = { nombre: 'Pepe', apodo: 'el Marinero', retrato: PNG, especial: { nombre: 'Patada', kind: 'barrido' } }
  m.piratas.capitan = { retrato: PNG, especial: { nombre: 'Grito', kind: 'cura' } }
  m.objetos['Cuchillo oxidado'] = { nombre: 'Navaja', imagen: PNG }
  m.islas['0'] = { nombre: 'Isla Uno', intro: ['Hola.'], fases: ['A', '', '', 'Guarida'] }
  m.jefes.gallardo = '¡A pelear!'
  return m
}

afterEach(() => aplicarMod(null))

describe('Corsarios · mods', () => {
  it('cambia lo que se ve y quitarlo lo deja todo como estaba', () => {
    const antes = structuredClone(getPirata('tomas'))
    aplicarMod(ejemplo())
    const t = getPirata('tomas')
    expect(t.nombre).toBe('Pepe')
    expect(t.look.retrato).toBe(PNG)
    expect(t.skill.kind).toBe('barrido')
    expect(t.skill.mult).toBe(multEspecial('barrido', 'C'))
    expect(ISLAS[0].nombre).toBe('Isla Uno')
    expect(ISLAS[0].fases[0].nombre).toBe('A')
    expect(ISLAS[0].fases[1].nombre).toBe('La taberna del Ancla')
    expect(INTRO_ISLA[0].lineas).toEqual(['Hola.'])
    expect(FRASE_JEFE.gallardo).toBe('¡A pelear!')
    expect(nombrePieza({ nombre: 'Cuchillo oxidado' })).toBe('Navaja')
    expect(imagenPieza({ nombre: 'Cuchillo oxidado' })).toBe(PNG)
    const c = capitanDef('Luis', 'espada')
    expect(c.look.retrato).toBe(PNG)
    expect(c.skill.kind).toBe('cura')

    aplicarMod(null)
    expect(getPirata('tomas')).toEqual(antes)
    expect(ISLAS[0].nombre).toBe('Isla Tortuga Gris')
    expect(nombrePieza({ nombre: 'Cuchillo oxidado' })).toBe('Cuchillo oxidado')
    expect(capitanDef('Luis', 'espada').look.retrato).toBeUndefined()
  })

  it('cambiar de mod no arrastra nada del anterior', () => {
    aplicarMod(ejemplo())
    const otro = modVacio('Otro')
    otro.piratas.bruna = { nombre: 'Rosa' }
    aplicarMod(otro)
    expect(getPirata('tomas').nombre).toBe('Tomás')
    expect(getPirata('bruna').nombre).toBe('Rosa')
  })

  it('no toca las estadísticas: la partida combate igual', () => {
    const s = nuevaPartida('X', 'espada', 3)
    const sin = unidadesAliadas(s).map((u) => [u.maxHp, u.atk, u.def, u.spd])
    aplicarMod(ejemplo())
    expect(unidadesAliadas(s).map((u) => [u.maxHp, u.atk, u.def, u.spd])).toEqual(sin)
    expect(['a', 'e']).toContain(combatir(s, 0, 0).gana)
  })

  it('al importar se limpia lo peligroso o desconocido', () => {
    const m = sanearMod({
      formato: 'corsarios-mod', nombre: 'X'.repeat(200),
      piratas: {
        tomas: { nombre: 'Ok', retrato: 'javascript:alert(1)', especial: { kind: 'explotar' } },
        inventado: { nombre: 'No' },
        bruna: { retrato: 'https://ejemplo.com/a.png' },
      },
      islas: { 9: { nombre: 'no' }, 1: { nombre: 'Sí' } },
      jefes: { gallardo: 'hola', nadie: 'x' },
    })
    expect(m.nombre).toHaveLength(60)
    expect(m.piratas.tomas).toEqual({ nombre: 'Ok' })
    expect(m.piratas.inventado).toBeUndefined()
    expect(m.piratas.bruna.retrato).toBe('https://ejemplo.com/a.png')
    expect(Object.keys(m.islas)).toEqual(['1'])
    expect(m.jefes).toEqual({ gallardo: 'hola' })
    expect(() => sanearMod({ nombre: 'sin formato' })).toThrow()
    // Ida y vuelta: exportar e importar da el mismo mod.
    const e = ejemplo()
    expect(sanearMod(JSON.parse(JSON.stringify(e)))).toEqual(e)
  })
})
