import { describe, it, expect } from 'vitest'
// `?raw` (de Vite) en vez de node:fs: este proyecto compila con la librería del
// navegador, así que importar módulos de Node aquí rompe `tsc -b`.
import src from './music.ts?raw'

/**
 * El secuenciador lee `bass[i]`, `chords[i]` y `lead[i]` con `i = step % steps`.
 * Si un array es más corto que `steps`, esos pasos salen `undefined` y la pista
 * se queda muda a mitad del compás sin que salte ningún error. Este test lo
 * caza al editar las secuencias (que es justo cuando se cuelan descuadres).
 */
describe('secuencias de música', () => {
  it('cada pista declara tantos pasos como notas tiene', () => {
    // Extrae cada bloque `nombre: { ... },` de dentro de SEQ.
    const seqBlock = src.slice(src.indexOf('const SEQ'))
    const tracks = [...seqBlock.matchAll(/^  (\w+): \{([\s\S]*?)^  \},$/gm)]
    expect(tracks.length).toBeGreaterThanOrEqual(5) // map, league, story, battle, boss

    for (const [, name, body] of tracks) {
      const steps = Number(/steps:\s*(\d+)/.exec(body)?.[1])
      expect(steps, `${name}.steps`).toBeGreaterThan(0)

      for (const key of ['bass', 'chords', 'lead'] as const) {
        const arr = new RegExp(`${key}:\\s*\\[([\\s\\S]*?)\\],\\n`).exec(body)?.[1]
        expect(arr, `${name}.${key} no encontrado`).toBeTruthy()
        // Cuenta elementos de primer nivel (los acordes son arrays anidados).
        let depth = 0, count = 1
        for (const ch of arr!) {
          if (ch === '[') depth++
          else if (ch === ']') depth--
          else if (ch === ',' && depth === 0) count++
        }
        // Una coma final deja un hueco vacío: no cuenta.
        if (/,\s*$/.test(arr!)) count--
        expect(count, `${name}.${key} tiene ${count} pasos y steps=${steps}`).toBe(steps)
      }
    }
  })
})
