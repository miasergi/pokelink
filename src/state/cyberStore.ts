// Store del modo Cyber PokéBall. FSM propia (título → región → inicial → mapa
// → radar/combate → …) para que el marco Poké Ball quede montado y el
// gameStore no engorde. El único punto de contacto con el juego principal es
// la meta (dex del modo, logros) vía persistCyberMeta.
import { create } from 'zustand'
import type { PokemonInstance } from '@/types'
import { getSpecies } from '@/data'
import { RNG } from '@/utils/rng'
import { saveCyber, loadCyber, clearCyber, loadMeta, saveMeta } from '@/persistence/db'
import { currentUser, saveCloudMeta } from '@/persistence/supabase'
import { useGame } from '@/state/gameStore'
import { levelEvolutionTargets, evolve } from '@/engine/team/evolution'
import { nextUid } from '@/engine/team/instance'
import { healParty as healPartyFull, anyAlive } from '@/engine/run/party'
import {
  createAdventure, saveRng, commitRng, getLocations, rollEncounter, makeWildInstance,
  buildLocationBattle, applyTrainerVictory, applyDefeat, dexSee, dexCatch,
  buyShopItem, useCyberItem,
} from '@/engine/cyber/cyberEngine'
import {
  createRadar, turnLeft, turnRight, stepForward, radarRings, radarExpired, type RadarState,
} from '@/engine/cyber/radar'
import {
  buildCarousel, resolveStop, enemyAct, endOfTurn, maybeRecoverStatus, attemptFlee, awardExp,
  isMashMove, displayName, MASH_BOOST, type StopPrecision,
} from '@/engine/cyber/timingBattle'
import { resolveCapture } from '@/engine/cyber/capture'
import { checkCyberAchievements } from '@/engine/cyber/achievements'
import {
  SAFE_PHASES, CYBER_PARTY_MAX,
  type CyberBattleState, type CyberPhase, type CyberSave, type CyberTrainerInfo, type CarouselSlot,
} from '@/engine/cyber/types'

/** RNG vivo de la partida (rehidratado del save; se vuelca al persistir). */
let rng: RNG | null = null
function getRng(save: CyberSave): RNG {
  if (!rng) rng = saveRng(save)
  return rng
}

interface PendingStop {
  slot: CarouselSlot
  precision: StopPrecision
}

interface CyberState {
  phase: CyberPhase
  save: CyberSave | null
  hasSave: boolean
  /** Región elegida en la pantalla de región (antes de crear el save). */
  pendingGen: number
  radar: RadarState | null
  /** Especie/nivel que persigue el radar. */
  radarTarget: { species: number; level: number } | null
  battle: CyberBattleState | null
  /** Stop pendiente de resolver tras el minijuego de machaque. */
  pendingStop: PendingStop | null
  /** Evoluciones pendientes de confirmar tras un combate. */
  evoPending: { uid: string; options: number[] }[]
  /** Mensaje efímero del mapa («No hay nada por aquí…»). */
  mapMessage: string | null

  // ciclo de vida
  initCyber: () => Promise<void>
  exitCyber: () => void
  newAdventure: () => void
  abandonAdventure: () => Promise<void>
  continueAdventure: () => void
  chooseRegion: (gen: number) => void
  chooseStarter: (starterId: number) => void

  // navegación interna
  goTo: (phase: CyberPhase) => void

  // mapa / rutas
  setLocation: (index: number) => void
  travel: () => void
  clearMapMessage: () => void

  // radar
  radarTurn: (dir: 'left' | 'right') => void
  radarStep: () => void
  radarEngage: () => void
  radarLeave: () => void

  // combate
  stopCarousel: (slotIndex: number, precision: StopPrecision) => void
  finishMash: (count: number, goal: number) => void
  battleAnimDone: () => void
  requestSwitch: () => void
  switchTo: (partyIndex: number, voluntary: boolean) => void
  cancelSwitch: () => void
  tryFlee: (mashScore: number) => void
  attemptCapture: (shakeScore: number) => void
  acknowledgeEnd: () => void

  // evolución
  confirmEvolution: (uid: string, toId: number) => void
  skipEvolution: (uid: string) => void

  // online (Cable Link)
  /** Entrega un Pokémon en un intercambio (lo quita de equipo/caja). */
  tradeAway: (uid: string) => PokemonInstance | null
  /** Recibe un Pokémon de otro jugador (uid nuevo, a equipo o caja). */
  receiveMon: (mon: PokemonInstance) => void
  /** Devuelve un Pokémon propio (oferta cancelada / fallo de red). NO cuenta
   *  como intercambio ni toca la dex. */
  restoreMon: (mon: PokemonInstance) => void
  /** Recompensa por ganar un combate fantasma (solo la 1ª vez contra cada rival). */
  grantGhostReward: (ghostId: string) => void

  // centro / pc / mochila
  healParty: () => void
  buyItem: (id: string) => void
  useItem: (itemId: string, uid: string) => string | null
  deposit: (uid: string) => void
  withdraw: (uid: string) => void
}

function persist(save: CyberSave, phase: CyberPhase): void {
  if (!SAFE_PHASES.includes(phase)) return
  save.phase = phase === 'victory' ? 'map' : phase
  if (rng) commitRng(save, rng)
  void saveCyber(save)
}

/** Cola de escritura: persistCyberMeta es un read-modify-write sobre la meta;
 *  dos llamadas solapadas (captura + evolución seguidas) se pisarían la una a
 *  la otra. Se serializan aquí. */
let metaQueue: Promise<void> = Promise.resolve()

/** Embudo ÚNICO de escritura de meta del modo: dex, aventuras completadas,
 *  online. Comprueba logros y los notifica con el modal global de Home. */
export function persistCyberMeta(
  save: CyberSave | null,
  extra?: { completedGen?: number; trade?: boolean; ghostWin?: boolean },
): Promise<void> {
  metaQueue = metaQueue.then(async () => {
    const meta = await loadMeta()
    if (save) {
      meta.cyberDexSeen = [...new Set([...(meta.cyberDexSeen ?? []), ...save.dexSeen])]
      meta.cyberDexCaught = [...new Set([...(meta.cyberDexCaught ?? []), ...save.dexCaught])]
    }
    if (extra?.completedGen != null) {
      meta.cyberCompleted = [...new Set([...(meta.cyberCompleted ?? []), extra.completedGen])]
    }
    if (extra?.trade) meta.cyberTrades = (meta.cyberTrades ?? 0) + 1
    if (extra?.ghostWin) meta.cyberGhostWins = (meta.cyberGhostWins ?? 0) + 1
    const ach = checkCyberAchievements(meta)
    if (ach.length) meta.achievements = [...new Set([...meta.achievements, ...ach])]
    await Promise.all([
      saveMeta(meta),
      currentUser() ? saveCloudMeta(meta).catch(() => {}) : Promise.resolve(false),
    ])
    if (ach.length) useGame.setState((s) => ({ newAchievements: [...s.newAchievements, ...ach] }))
  }).catch(() => {})
  return metaQueue
}

function newBattle(kind: 'wild' | 'trainer', enemy: PokemonInstance, playerIndex: number, trainer?: CyberTrainerInfo): CyberBattleState {
  return {
    kind,
    trainer,
    enemy,
    enemyIndex: 0,
    playerIndex,
    turn: 1,
    carousel: [],
    phase: 'intro',
    log: kind === 'wild'
      ? [`¡${displayName(enemy)} salvaje!`]
      : [`¡${trainer!.name} quiere luchar!`, trainer?.quote ?? ''].filter(Boolean),
  }
}

function firstAlive(party: PokemonInstance[]): number {
  const i = party.findIndex((m) => m.currentHp > 0)
  return i < 0 ? 0 : i
}

/** Contraataque del enemigo tras una acción del jugador que consume turno
 *  (cambio voluntario, huida fallida, captura fallida): actúa, daño residual,
 *  posible recuperación de estado, y decide relevo/derrota. Muta `next`/log. */
function enemyRetaliation(
  save: CyberSave, next: CyberBattleState, log: string[], rng: RNG,
): void {
  const mon = save.party[next.playerIndex]
  log.push(...enemyAct(next.enemy, mon, rng).messages)
  log.push(...endOfTurn(mon))
  log.push(...maybeRecoverStatus(mon, rng))
  next.turn += 1
  if (mon.currentHp <= 0) {
    if (!anyAlive(save.party)) {
      next.phase = 'end'
      next.outcome = 'lose'
      log.push('¡No te quedan Pokémon!')
    } else {
      next.phase = 'switch'
    }
  }
}

/** El enemigo activo ha caído: exp, siguiente Pokémon del entrenador o fin. */
function enemyDown(save: CyberSave, next: CyberBattleState, log: string[]): void {
  const playerMon = save.party[next.playerIndex]
  const gained = awardExp(playerMon, next.enemy)
  if (gained > 0) log.push(`${displayName(playerMon)} sube a Nv.${playerMon.level}!`)
  const t = next.trainer
  if (t && next.enemyIndex + 1 < t.team.length) {
    const nextEnemy = t.team[next.enemyIndex + 1]
    log.push(`${t.name} envía a ${displayName(nextEnemy)}.`)
    next.enemy = nextEnemy
    next.enemyIndex += 1
  } else {
    next.phase = 'end'
    next.outcome = 'win'
    if (t) log.push(`¡Has derrotado a ${t.name}!`, `Ganas ${t.money} ₽.`)
  }
}

export const useCyber = create<CyberState>((set, get) => ({
  phase: 'title',
  save: null,
  hasSave: false,
  pendingGen: 1,
  radar: null,
  radarTarget: null,
  battle: null,
  pendingStop: null,
  evoPending: [],
  mapMessage: null,

  initCyber: async () => {
    const save = await loadCyber()
    rng = save ? saveRng(save) : null
    set({ save, hasSave: !!save, phase: 'title', battle: null, radar: null, radarTarget: null, evoPending: [], mapMessage: null })
  },

  exitCyber: () => {
    const { save, phase } = get()
    // En fase segura, guarda. A MITAD de combate NO: persistir aquí guardaría
    // el equipo dañado saltándose el resultado (trampa para esquivar el
    // gameover); salir equivale a recargar → rollback al último punto seguro.
    if (save && SAFE_PHASES.includes(phase)) persist(save, phase)
    useGame.getState().navigate('home')
  },

  newAdventure: () => set({ phase: 'region' }),

  abandonAdventure: async () => {
    await clearCyber()
    rng = null
    set({ save: null, hasSave: false, phase: 'region' })
  },

  continueAdventure: () => {
    const { save } = get()
    if (!save) return
    getRng(save)
    set({ phase: SAFE_PHASES.includes(save.phase) && save.phase !== 'title' ? save.phase : 'map' })
  },

  chooseRegion: (gen) => set({ pendingGen: gen, phase: 'starter' }),

  chooseStarter: (starterId) => {
    const gen = get().pendingGen
    const seed = Math.floor(Math.random() * 2 ** 31)
    const save = createAdventure(gen, starterId, seed)
    rng = saveRng(save)
    persist(save, 'map')
    set({ save, hasSave: true, phase: 'map' })
  },

  goTo: (phase) => {
    const { save } = get()
    if (save) persist(save, phase)
    set({ phase, mapMessage: null })
  },

  setLocation: (index) => {
    const { save } = get()
    if (!save) return
    save.locationIndex = index
    set({ save: { ...save } })
  },

  travel: () => {
    const { save } = get()
    if (!save) return
    const r = getRng(save)
    const locations = getLocations(save)
    const loc = locations[Math.min(save.locationIndex, locations.length - 1)]
    if (!loc) return
    if (loc.kind === 'center') { get().goTo('center'); return }
    if (loc.kind === 'route') {
      const enc = rollEncounter(save, loc.index, r)
      if (enc.type === 'wild') {
        dexSee(save, enc.species)
        set({ radar: createRadar(r), radarTarget: { species: enc.species, level: enc.level }, phase: 'radar', save: { ...save } })
        return
      }
      if (enc.type === 'trainer') {
        for (const m of enc.trainer.team) dexSee(save, m.speciesId)
        const battle = newBattle('trainer', enc.trainer.team[0], firstAlive(save.party), enc.trainer)
        set({ battle, phase: 'battle', save: { ...save } })
        return
      }
      set({ mapMessage: 'No hay nada por aquí…', save: { ...save } })
      persist(save, 'map')
      return
    }
    // gimnasio / rival / liga
    const trainer = buildLocationBattle(save, loc, r)
    if (!trainer) return
    for (const m of trainer.team) dexSee(save, m.speciesId)
    const battle = newBattle('trainer', trainer.team[0], firstAlive(save.party), trainer)
    set({ battle, phase: 'battle', save: { ...save } })
  },

  clearMapMessage: () => set({ mapMessage: null }),

  // ---- radar ----
  radarTurn: (dir) => {
    const { radar } = get()
    if (!radar) return
    set({ radar: dir === 'left' ? turnLeft(radar) : turnRight(radar) })
  },
  radarStep: () => {
    const { radar, save } = get()
    if (!radar || !save) return
    const next = stepForward(radar)
    if (radarExpired(next)) {
      set({ radar: null, radarTarget: null, phase: 'map', mapMessage: '¡El Pokémon ha huido!' })
      persist(save, 'map')
      return
    }
    set({ radar: next })
  },
  radarEngage: () => {
    const { radar, radarTarget, save } = get()
    if (!radar || !radarTarget || !save || radarRings(radar) < 2) return
    const r = getRng(save)
    const wild = makeWildInstance(radarTarget.species, radarTarget.level, r)
    const battle = newBattle('wild', wild, firstAlive(save.party))
    set({ battle, phase: 'battle', radar: null, radarTarget: null })
  },
  radarLeave: () => {
    const { save } = get()
    set({ radar: null, radarTarget: null, phase: 'map' })
    if (save) persist(save, 'map')
  },

  // ---- combate ----
  stopCarousel: (slotIndex, precision) => {
    const { battle, save } = get()
    if (!battle || !save || battle.phase !== 'carousel') return
    const slot = battle.carousel[slotIndex]
    if (!slot) return
    const playerMon = save.party[battle.playerIndex]
    if (slot.kind === 'move' && isMashMove(playerMon, slot)) {
      set({ battle: { ...battle, phase: 'mash' }, pendingStop: { slot, precision } })
      return
    }
    resolveTurn(set, get, slot, precision, 1)
  },

  finishMash: (count, goal) => {
    const { pendingStop } = get()
    if (!pendingStop) return
    const boost = 1 + MASH_BOOST * Math.min(1, count / Math.max(1, goal))
    set({ pendingStop: null })
    resolveTurn(set, get, pendingStop.slot, pendingStop.precision, boost)
  },

  battleAnimDone: () => {
    const { battle, save } = get()
    if (!battle || !save) return
    if (battle.phase === 'end') return
    // Reconstruye el carrusel para el siguiente turno.
    const playerMon = save.party[battle.playerIndex]
    const harder = battle.trainer && (battle.trainer.kind === 'gym' || battle.trainer.kind === 'elite' || battle.trainer.kind === 'champion') ? 1 : 0
    set({
      battle: {
        ...battle,
        phase: 'carousel',
        carousel: buildCarousel(playerMon, harder),
        log: [],
      },
    })
  },

  requestSwitch: () => {
    const { battle } = get()
    if (!battle || battle.phase !== 'carousel' || battle.turn < 2) return
    set({ battle: { ...battle, phase: 'switch' } })
  },

  switchTo: (partyIndex, voluntary) => {
    const { battle, save } = get()
    if (!battle || !save) return
    const mon = save.party[partyIndex]
    if (!mon || mon.currentHp <= 0 || partyIndex === battle.playerIndex) return
    const r = getRng(save)
    const log = [`¡Adelante, ${displayName(mon)}!`]
    const next: CyberBattleState = { ...battle, playerIndex: partyIndex, log, phase: 'anim' }
    // Cambiar voluntariamente consume el turno: el enemigo golpea al que entra.
    if (voluntary) enemyRetaliation(save, next, log, r)
    set({ battle: next, save: { ...save } })
  },

  cancelSwitch: () => {
    const { battle } = get()
    if (!battle || battle.phase !== 'switch') return
    // Solo cancelable si el activo sigue en pie (cambio voluntario).
    const { save } = get()
    if (!save || save.party[battle.playerIndex].currentHp <= 0) return
    set({ battle: { ...battle, phase: 'carousel' } })
  },

  tryFlee: (mashScore) => {
    const { battle, save } = get()
    if (!battle || !save || battle.kind !== 'wild' || battle.turn < 2) return
    const r = getRng(save)
    const playerMon = save.party[battle.playerIndex]
    if (attemptFlee(playerMon, battle.enemy, mashScore, r)) {
      set({ battle: { ...battle, phase: 'end', outcome: 'fled', log: ['¡Escapaste sin problemas!'] } })
      return
    }
    const log = ['¡No puedes escapar!']
    const next: CyberBattleState = { ...battle, log, phase: 'anim' }
    enemyRetaliation(save, next, log, r)
    set({ battle: next, save: { ...save } })
  },

  attemptCapture: (shakeScore) => {
    const { battle, save } = get()
    if (!battle || !save || battle.kind !== 'wild') return
    if ((save.items['ball'] ?? 0) <= 0) {
      set({ battle: { ...battle, phase: 'carousel', log: ['¡No te quedan Poké Balls!'] } })
      return
    }
    save.items['ball'] -= 1
    const r = getRng(save)
    const result = resolveCapture(battle.enemy, getSpecies(battle.enemy.speciesId), shakeScore, r)
    if (result.caught) {
      dexCatch(save, battle.enemy.speciesId)
      const log = [`¡${displayName(battle.enemy)} atrapado!`]
      if (save.party.length < CYBER_PARTY_MAX) save.party.push(battle.enemy)
      else { save.box.push(battle.enemy); log.push('Enviado al PC.') }
      set({ battle: { ...battle, phase: 'end', outcome: 'caught', log }, save: { ...save } })
      void persistCyberMeta(save)
      return
    }
    if (result.escaped) {
      set({ battle: { ...battle, phase: 'end', outcome: 'fled', log: ['¡Oh, no! ¡El Pokémon escapó!'] }, save: { ...save } })
      return
    }
    // Sigue el combate: el enemigo actúa.
    const log = ['¡Casi! ¡Se ha soltado!']
    const next: CyberBattleState = { ...battle, log, phase: 'anim' }
    enemyRetaliation(save, next, log, r)
    set({ battle: next, save: { ...save } })
  },

  acknowledgeEnd: () => {
    const { battle, save } = get()
    if (!battle || !save || battle.phase !== 'end') return
    let phase: CyberPhase = 'map'
    if (battle.outcome === 'win' && battle.trainer) {
      const finished = applyTrainerVictory(save, battle.trainer)
      if (finished) {
        phase = 'victory'
        void persistCyberMeta(save, { completedGen: save.gen })
      }
    } else if (battle.outcome === 'lose') {
      applyDefeat(save)
      phase = 'gameover'
    } else if (battle.outcome === 'caught' || battle.outcome === 'win') {
      void persistCyberMeta(save)
    }
    // Evoluciones pendientes tras el combate (subidas de nivel).
    const evoPending = (battle.outcome === 'win' || battle.outcome === 'caught')
      ? save.party
          .map((m) => ({ uid: m.uid, options: levelEvolutionTargets(m).map((s) => s.id) }))
          .filter((e) => e.options.length > 0)
      : []
    set({ battle: null, phase: phase === 'gameover' ? 'gameover' : phase, evoPending, save: { ...save } })
    persist(save, phase === 'gameover' ? 'center' : phase)
  },

  confirmEvolution: (uid, toId) => {
    const { save, evoPending } = get()
    if (!save) return
    const mon = save.party.find((m) => m.uid === uid)
    if (mon) {
      evolve(mon, getSpecies(toId))
      dexSee(save, toId)
      void persistCyberMeta(save)
    }
    set({ evoPending: evoPending.filter((e) => e.uid !== uid), save: { ...save } })
    persist(save, get().phase)
  },

  skipEvolution: (uid) => {
    set({ evoPending: get().evoPending.filter((e) => e.uid !== uid) })
  },

  // ---- online (Cable Link) ----
  tradeAway: (uid) => {
    const { save } = get()
    if (!save) return null
    const pi = save.party.findIndex((m) => m.uid === uid)
    if (pi >= 0) {
      if (save.party.length <= 1) return null // nunca te quedas sin equipo
      const [mon] = save.party.splice(pi, 1)
      set({ save: { ...save } })
      persist(save, get().phase)
      return mon
    }
    const bi = save.box.findIndex((m) => m.uid === uid)
    if (bi < 0) return null
    const [mon] = save.box.splice(bi, 1)
    set({ save: { ...save } })
    persist(save, get().phase)
    return mon
  },

  receiveMon: (mon) => {
    const { save } = get()
    if (!save) return
    // uid nuevo para evitar colisiones con instancias de otro dispositivo.
    const fresh: PokemonInstance = { ...structuredClone(mon), uid: nextUid(), locked: false }
    if (save.party.length < CYBER_PARTY_MAX) save.party.push(fresh)
    else save.box.push(fresh)
    dexCatch(save, fresh.speciesId)
    set({ save: { ...save } })
    persist(save, get().phase)
    void persistCyberMeta(save, { trade: true })
  },

  restoreMon: (mon) => {
    const { save } = get()
    if (!save) return
    if (save.party.length < CYBER_PARTY_MAX) save.party.push(mon)
    else save.box.push(mon)
    set({ save: { ...save } })
    persist(save, get().phase)
  },

  grantGhostReward: (ghostId) => {
    const { save } = get()
    if (!save) return
    // Anti-farmeo: cada fantasma paga solo su PRIMERA derrota.
    const beaten = save.ghostsBeaten ?? []
    if (beaten.includes(ghostId)) return
    save.ghostsBeaten = [...beaten, ghostId]
    save.money += 500
    set({ save: { ...save } })
    persist(save, get().phase)
    void persistCyberMeta(save, { ghostWin: true })
  },

  // ---- centro / pc / mochila ----
  healParty: () => {
    const { save } = get()
    if (!save) return
    healPartyFull(save.party)
    set({ save: { ...save } })
    persist(save, 'center')
  },

  buyItem: (id) => {
    const { save } = get()
    if (!save) return
    if (buyShopItem(save, id)) {
      set({ save: { ...save } })
      persist(save, get().phase)
    }
  },

  useItem: (itemId, uid) => {
    const { save } = get()
    if (!save) return null
    const mon = save.party.find((m) => m.uid === uid)
    if (!mon) return null
    const msg = useCyberItem(save, itemId, mon)
    if (msg) {
      set({ save: { ...save } })
      persist(save, get().phase)
    }
    return msg
  },

  deposit: (uid) => {
    const { save } = get()
    if (!save || save.party.length <= 1) return
    const i = save.party.findIndex((m) => m.uid === uid)
    if (i < 0) return
    const [mon] = save.party.splice(i, 1)
    save.box.push(mon)
    set({ save: { ...save } })
    persist(save, 'pc')
  },

  withdraw: (uid) => {
    const { save } = get()
    if (!save || save.party.length >= CYBER_PARTY_MAX) return
    const i = save.box.findIndex((m) => m.uid === uid)
    if (i < 0) return
    const [mon] = save.box.splice(i, 1)
    save.party.push(mon)
    set({ save: { ...save } })
    persist(save, 'pc')
  },
}))

/** Resuelve un turno completo tras parar el carrusel (con o sin machaque). */
function resolveTurn(
  set: (partial: Partial<CyberState>) => void,
  get: () => CyberState,
  slot: CarouselSlot,
  precision: StopPrecision,
  boost: number,
): void {
  const { battle, save } = get()
  if (!battle || !save) return
  const r = getRng(save)
  const playerMon = save.party[battle.playerIndex]
  const log: string[] = []
  const next: CyberBattleState = { ...battle, log, phase: 'anim', turn: battle.turn + 1 }

  // 1) Turno del jugador
  const pv = resolveStop(playerMon, next.enemy, slot, precision, boost, r)
  log.push(...pv.messages)

  // 2) Si el enemigo sigue en pie: su turno + daño residual de ambos +
  //    posible recuperación de dormido/congelado del jugador.
  if (next.enemy.currentHp > 0) {
    log.push(...enemyAct(next.enemy, playerMon, r).messages)
    log.push(...endOfTurn(playerMon))
    log.push(...endOfTurn(next.enemy))
    log.push(...maybeRecoverStatus(playerMon, r))
  }

  // 3) ¿Cayó el enemigo (por el golpe o por el residual)?
  if (next.enemy.currentHp <= 0) enemyDown(save, next, log)

  // 4) ¿Cayó también el jugador? (puede ocurrir A LA VEZ que el enemigo:
  //    su ataque te debilita y luego él cae por veneno — hay que forzar el
  //    relevo igualmente, no seguir combatiendo a 0 PS.)
  if (next.phase !== 'end' && playerMon.currentHp <= 0) {
    if (!anyAlive(save.party)) {
      next.phase = 'end'
      next.outcome = 'lose'
      log.push('¡No te quedan Pokémon!')
    } else {
      next.phase = 'switch'
    }
  }

  set({ battle: next, save: { ...save } })
}
