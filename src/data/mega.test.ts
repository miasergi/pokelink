import { describe, it, expect } from 'vitest'
import { getMegaForms, hasMega, getSpecies, tryGetSpecies } from '@/data'
import { createInstance } from '@/engine/team/instance'
import { evolve } from '@/engine/team/evolution'
import { RNG } from '@/utils/rng'

describe('megaevolución', () => {
  it('Charizard tiene formas mega X e Y resolubles', () => {
    expect(hasMega(6)).toBe(true)
    const forms = getMegaForms(6)
    expect(forms.length).toBeGreaterThanOrEqual(2)
    for (const f of forms) {
      expect(f.isMega).toBe(true)
      expect(f.baseId).toBe(6)
      // la forma mega es resoluble por getSpecies (está en el mapa de búsqueda)
      expect(tryGetSpecies(f.id)).toBeTruthy()
    }
  })

  it('mega-evolucionar mejora las stats y mantiene el nivel', () => {
    const rng = new RNG(1)
    const charizard = createInstance(6, 50, rng)
    const beforeAtk = charizard.stats.atk
    const beforeLevel = charizard.level
    const mega = getMegaForms(6)[0]
    evolve(charizard, getSpecies(mega.id))
    expect(charizard.speciesId).toBe(mega.id)
    expect(charizard.level).toBe(beforeLevel)
    // Mega Charizard X/Y tienen mejor ataque/at.esp que el base
    const after = charizard.stats.atk + charizard.stats.spa
    expect(after).toBeGreaterThan(beforeAtk)
  })

  it('Pokémon sin mega devuelve lista vacía', () => {
    expect(hasMega(19)).toBe(false) // Rattata
    expect(getMegaForms(19)).toHaveLength(0)
  })
})
