// Store del modo Corsarios. A diferencia de los roguelikes de la sala, aquí la
// cuenta se guarda SIEMPRE: el combate se simula entero al pulsar «Abordar»,
// su resultado se aplica y se guarda en el acto, y la pantalla de combate solo
// lo reproduce. Cerrar la app a mitad no cambia nada (la semilla depende del
// número de combates, así que repetir da el mismo resultado).
import { create } from 'zustand'
import { play } from '@/utils/sfx'
import { useGame } from '@/state/gameStore'
import { clearCorsarios, loadCorsarios, saveCorsarios } from '@/persistence/db'
import {
  alternarFormacion, aplicarMar, aplicarResultado, cobrarEncargo, combatir, combatirMar, desequipar,
  entrenar, equipar, islaAbierta, marcarVisto, migrar, nuevaPartida, tirar, vender, venderSobrantes,
  type Banner, type Botin, type Portador, type Tirada,
} from '@/engine/corsarios/game'
import type { Clase, CorsariosSave, Rareza, Resultado, TipoPieza } from '@/engine/corsarios/types'
import { ISLAS } from '@/data/corsarios/islas'
import { fmt } from '@/ui/corsarios/fmt'

export type Vista = 'setup' | 'islas' | 'taberna' | 'tripulacion' | 'puerto' | 'batalla'

export interface BatallaActiva {
  /** -1 en el Mar Abierto. */
  isla: number
  fase: number
  mar?: boolean
  resultado: Resultado
  botin: Botin
}

/** Escena de texto superpuesta (tutorial, llegada a una isla, final). */
export type Escena = { tipo: 'tuto' } | { tipo: 'isla'; isla: number } | { tipo: 'fin' }

interface CorsariosState {
  cargado: boolean
  save: CorsariosSave | null
  vista: Vista
  islaSel: number
  batalla: BatallaActiva | null
  tiradas: Tirada[] | null
  escena: Escena | null
  aviso: string | null
  init: () => Promise<void>
  crear: (nombre: string, clase: Exclude<Clase, 'apoyo'>) => void
  irA: (v: Exclude<Vista, 'setup' | 'batalla'>) => void
  elegirIsla: (i: number) => void
  abordar: (isla: number, fase: number) => void
  saquear: (isla: number, fase: number) => void
  abordarMar: () => void
  cerrarBatalla: () => void
  tirar: (banner: Banner, n: 1 | 10) => void
  cerrarTiradas: () => void
  entrenar: (id: string) => void
  alternar: (id: string) => void
  equipar: (quien: Portador, uid: string) => void
  desequipar: (quien: Portador, tipo: TipoPieza) => void
  vender: (uid: string) => void
  venderSobrantes: (hasta: Rareza) => void
  cobrarEncargo: (k: number) => void
  verEscena: (e: Escena) => void
  cerrarEscena: () => void
  limpiarAviso: () => void
  borrarPartida: () => Promise<void>
  salir: () => void
}

const nuevaSemilla = () => (Math.random() * 2 ** 32) >>> 0

export const useCorsarios = create<CorsariosState>((set, get) => {
  /** Aplica un save nuevo: lo guarda y lo publica. */
  const poner = (save: CorsariosSave, extra: Partial<CorsariosState> = {}) => {
    void saveCorsarios(save)
    set({ save, ...extra })
  }

  /** Si la isla elegida no se ha presentado aún, toca su escena. */
  const escenaIsla = (s: CorsariosSave, i: number): Escena | null =>
    islaAbierta(s, i) && !s.vistos.includes(`isla-${i}`) ? { tipo: 'isla', isla: i } : null

  return {
    cargado: false,
    save: null,
    vista: 'islas',
    islaSel: 0,
    batalla: null,
    tiradas: null,
    escena: null,
    aviso: null,

    init: async () => {
      if (get().cargado) return
      const raw = await loadCorsarios()
      const save = raw ? migrar(raw) : null
      // Abre en la última isla abierta.
      let islaSel = 0
      if (save) while (islaSel < ISLAS.length - 1 && islaAbierta(save, islaSel + 1)) islaSel++
      set({ cargado: true, save, vista: save ? 'islas' : 'setup', islaSel, escena: save ? escenaIsla(save, islaSel) : null })
    },

    crear: (nombre, clase) => {
      const save = nuevaPartida(nombre, clase, nuevaSemilla())
      play('confirm')
      poner(save, { vista: 'islas', islaSel: 0, escena: { tipo: 'tuto' } })
    },

    irA: (vista) => { play('tap'); set({ vista }) },
    elegirIsla: (islaSel) => {
      play('tap')
      const s = get().save
      set({ islaSel, escena: s ? escenaIsla(s, islaSel) : null })
    },

    abordar: (isla, fase) => {
      const s = get().save
      if (!s) return
      const resultado = combatir(s, isla, fase)
      const { save, botin } = aplicarResultado(s, isla, fase, resultado)
      play('confirm')
      poner(save, { batalla: { isla, fase, resultado, botin }, vista: 'batalla' })
    },

    saquear: (isla, fase) => {
      const s = get().save
      if (!s) return
      const { save, botin } = aplicarResultado(s, isla, fase, combatir(s, isla, fase))
      if (!botin.gana) {
        play('defeat')
        poner(save, { aviso: 'El saqueo ha salido mal: os han echado a cañonazos. Prueba a abordar.' })
        return
      }
      play('buy')
      const partes = [`+${fmt(botin.doblones)} doblones`, `+${fmt(botin.xp)} XP`]
      if (botin.perlas) partes.push(`+${botin.perlas} perlas`)
      if (botin.pieza) partes.push(botin.piezaVendida ? `${botin.pieza.nombre} (vendido: bodega llena)` : botin.pieza.nombre)
      if (botin.subidas) partes.push(`¡nivel ${save.nivel}!`)
      poner(save, { aviso: `Saqueo: ${partes.join(' · ')}` })
    },

    abordarMar: () => {
      const s = get().save
      if (!s) return
      const resultado = combatirMar(s)
      const { save, botin } = aplicarMar(s, resultado)
      play('confirm')
      poner(save, { batalla: { isla: -1, fase: s.marPiso + 1, mar: true, resultado, botin }, vista: 'batalla' })
    },

    cerrarBatalla: () => {
      play('tap')
      const b = get().batalla
      const s = get().save
      // Tras un jefe: si hay isla nueva, se salta a ella (y a su presentación).
      let islaSel = get().islaSel
      let escena: Escena | null = null
      if (b?.botin.final && s && !s.vistos.includes('fin')) escena = { tipo: 'fin' }
      else if (b && !b.mar && b.botin.primera && ISLAS[b.isla].fases[b.fase].jefe && b.isla + 1 < ISLAS.length && s) {
        islaSel = b.isla + 1
        escena = escenaIsla(s, islaSel)
      }
      set({ batalla: null, vista: b?.mar ? 'puerto' : 'islas', islaSel, escena })
    },

    tirar: (banner, n) => {
      const s = get().save
      if (!s) return
      const { save, tiradas } = tirar(s, banner, n, nuevaSemilla())
      if (!tiradas.length) { play('error'); return }
      play('buy')
      poner(save, { tiradas })
    },
    cerrarTiradas: () => set({ tiradas: null }),

    entrenar: (id) => {
      const s = get().save
      if (!s) return
      const n = entrenar(s, id)
      if (n === s) { play('error'); return }
      play('levelup')
      poner(n)
    },

    alternar: (id) => {
      const s = get().save
      if (!s) return
      const n = alternarFormacion(s, id)
      if (n === s) { play('error'); return }
      play('select')
      poner(n)
    },

    equipar: (quien, uid) => {
      const s = get().save
      if (!s) return
      play('select')
      poner(equipar(s, quien, uid))
    },
    desequipar: (quien, tipo) => {
      const s = get().save
      if (!s) return
      play('back')
      poner(desequipar(s, quien, tipo))
    },
    vender: (uid) => {
      const s = get().save
      if (!s) return
      play('buy')
      poner(vender(s, uid))
    },
    venderSobrantes: (hasta) => {
      const s = get().save
      if (!s) return
      const r = venderSobrantes(s, hasta)
      if (!r.vendidas) { play('error'); set({ aviso: 'No hay nada que vender de esa rareza en la bodega.' }); return }
      play('buy')
      poner(r.save, { aviso: `Vendidas ${r.vendidas} piezas por ${fmt(r.doblones)} doblones.` })
    },

    cobrarEncargo: (k) => {
      const s = get().save
      if (!s) return
      const n = cobrarEncargo(s, k)
      if (n === s) { play('error'); return }
      play('levelup')
      poner(n)
    },

    verEscena: (escena) => { play('tap'); set({ escena }) },
    cerrarEscena: () => {
      const { escena, save, islaSel } = get()
      if (escena && save) {
        const clave = escena.tipo === 'isla' ? `isla-${escena.isla}` : escena.tipo
        const n = marcarVisto(save, clave)
        if (n !== save) poner(n)
        // Tras el tutorial, la isla en la que estás se presenta sola.
        if (escena.tipo === 'tuto') { set({ escena: escenaIsla(n, islaSel) }); return }
      }
      set({ escena: null })
    },
    limpiarAviso: () => set({ aviso: null }),

    borrarPartida: async () => {
      await clearCorsarios()
      set({ save: null, vista: 'setup', batalla: null, tiradas: null, islaSel: 0, escena: null })
    },

    salir: () => {
      play('back')
      set({ batalla: null, tiradas: null, escena: null, vista: get().save ? 'islas' : 'setup' })
      useGame.getState().navigate('home')
    },
  }
})
