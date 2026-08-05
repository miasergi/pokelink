import { describe, it, expect } from 'vitest'
import { searchKey } from './SpeciesSearchModal'

describe('buscador de Pokémon: normalización del texto', () => {
  it('ignora mayúsculas, tildes y signos', () => {
    // Los nombres reales tienen de todo: Nidoran♀, Mr. Mime, Porygon-Z, Flabébé.
    expect(searchKey('Nidoran♀')).toBe('nidoran')
    expect(searchKey('Mr. Mime')).toBe('mrmime')
    expect(searchKey('Porygon-Z')).toBe('porygonz')
    expect(searchKey('Flabébé')).toBe('flabebe')
    expect(searchKey('Farfetch’d')).toBe('farfetchd')
  })

  it('lo que escribe el jugador casa con el nombre aunque no ponga los signos', () => {
    const matches = (q: string, name: string) => searchKey(name).includes(searchKey(q))
    expect(matches('mr mime', 'Mr. Mime')).toBe(true)
    expect(matches('MIME', 'Mr. Mime')).toBe(true)
    expect(matches('flabebe', 'Flabébé')).toBe(true)
    expect(matches('porygon z', 'Porygon-Z')).toBe(true)
    expect(matches('pika', 'Pikachu')).toBe(true)
    expect(matches('zzz', 'Pikachu')).toBe(false)
  })
})
