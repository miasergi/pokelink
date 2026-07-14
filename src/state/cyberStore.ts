// Store del modo Cyber PokéBall. FSM propia (título → región → inicial → mapa
// → exploración/combate → …). TÁCTIL: no hay botones físicos; las vistas
// interactúan directamente con estas acciones.
//
// El combate emite CyberEvent[] que la UI reproduce como fotogramas animados
// (cyberFrames.ts) — igual que el combate principal del juego.
import { create } from 'zustand'
import type { PokemonInstance, StatusCondition } from '@/types'
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
  buyShopItem, useCyberItem, secretLegendary, markSecretCaught, SECRET_LEVEL,
} from '@/engine/cyber/cyberEngine'
import {
  createExplore, turn as exploreTurn, stepForward, canEngage, expired,
  type ExploreState,
} from '@/engine/cyber/explore'
import {
  buildReel, firstToPick, enemyReelStop, performAttack, endOfTurn, maybeRecoverStatus,
  attemptFlee, awardExp, isMashMove, displayName, MASH_BOOST, PRECISION_MULT,
  type StopPrecision,
} from '@/engine/cyber/reelBattle'
import { resolveCapture } from '@/engine/cyber/capture'
import { checkCyberAchievements } from '@/engine/cyber/achievements'
import {
  SAFE_PHASES, CYBER_PARTY_MAX,
  type CyberBattleState, type CyberEvent, type CyberPhase, type CyberSave,
  type CyberTerrain, type CyberTrainerInfo, type ReelSlot, type Side,
} from '@/engine/cyber/types'

/** RNG vivo de la partida (rehidratado del save; se vuelca al persistir). */
let rng: RNG | null = null
function getRng(save: CyberSave): RNG {
  if (!rng) rng = saveRng(save)
  return rng
}

interface CyberState {
  phase: CyberPhase
  save: CyberSave | null
  hasSave: boolean
  pendingGen: number
  /** Exploración en 1ª persona. */
  explore: ExploreState | null
  exploreTarget: { species: number; level: number; secretIndex?: number } | null
  exploreTerrain: CyberTerrain
  battle: CyberBattleState | null
  /** Stop del jugador pendiente del minijuego de machaque. */
  pendingStop: { slot: ReelSlot; precision: StopPrecision } | null
  evoPending: { uid: string; options: number[] }[]
  mapMessage: string | null

  initCyber: () => Promise<void>
  exitCyber: () => void
  newAdventure: () => void
  abandonAdventure: () => Promise<void>
  continueAdventure: () => void
  chooseRegion: (gen: number) => void
  chooseStarter: (starterId: number) => void
  goTo: (phase: CyberPhase) => void

  // mapa
  travelTo: (index: number) => void
  clearMapMessage: () => void

  // exploración
  exploreTurnBy: (deg: number) => void
  exploreStep: () => void
  exploreEngage: () => void
  exploreLeave: () => void

  // combate
  stopReel: (slotIndex: number, precision: StopPrecision) => void
  finishMash: (count: number, goal: number) => void
  battleAnimDone: () => void
  requestSwitch: () => void
  switchTo: (partyIndex: number, voluntary: boolean) => void
  cancelSwitch: () => void
  tryFlee: (mashScore: number) => void
  throwBall: (shakeScore: number) => void
  acknowledgeEnd: () => void

  // evolución
  confirmEvolution: (uid: string, toId: number) => void
  skipEvolution: (uid: string) => void

  // online
  tradeAway: (uid: string) => PokemonInstance | null
  receiveMon: (mon: PokemonInstance) => void
  restoreMon: (mon: PokemonInstance) => void
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

/** Cola de escritura: persistCyberMeta es read-modify-write sobre la meta; dos
 *  llamadas solapadas se pisarían. Se serializan aquí. */
let metaQueue: Promise<void> = Promise.resolve()

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

function firstAlive(party: PokemonInstance[]): number {
  const i = party.findIndex((m) => m.currentHp > 0)
  return i < 0 ? 0 : i
}

/** Prepara las tiras de ambos lados y decide quién para primero (por Velocidad). */
function freshReels(
  player: PokemonInstance, enemy: PokemonInstance, hardSad: number, r: RNG,
): Pick<CyberBattleState, 'reels' | 'first'> {
  return {
    reels: {
      player: buildReel(player, hardSad),
      enemy: buildReel(enemy),
    },
    first: firstToPick(player, enemy, r),
  }
}

/** Caras tristes extra para el jugador según la dureza del rival. */
function hardSadFor(trainer?: CyberTrainerInfo): number {
  if (!trainer) return 0
  return trainer.kind === 'gym' || trainer.kind === 'elite' || trainer.kind === 'champion' ? 1 : 0
}

function newBattle(
  kind: 'wild' | 'trainer',
  enemy: PokemonInstance,
  player: PokemonInstance,
  playerIndex: number,
  r: RNG,
  trainer?: CyberTrainerInfo,
  secretIndex?: number,
): CyberBattleState {
  const events: CyberEvent[] = [{
    kind: 'intro',
    text: kind === 'wild'
      ? (secretIndex != null ? `¡${displayName(enemy)} LEGENDARIO!` : `¡${displayName(enemy)} salvaje!`)
      : `¡${trainer!.name} quiere luchar!`,
  }]
  if (trainer?.quote) events.push({ kind: 'message', text: trainer.quote })
  events.push({ kind: 'sendOut', side: 'player', text: `¡Adelante, ${displayName(player)}!` })
  return {
    kind,
    trainer,
    secretIndex,
    enemy,
    enemyIndex: 0,
    playerIndex,
    turn: 1,
    phase: 'intro',
    events,
    ...freshReels(player, enemy, hardSadFor(trainer), r),
  }
}

export const useCyber = create<CyberState>((set, get) => ({
  phase: 'title',
  save: null,
  hasSave: false,
  pendingGen: 1,
  explore: null,
  exploreTarget: null,
  exploreTerrain: 'grass',
  battle: null,
  pendingStop: null,
  evoPending: [],
  mapMessage: null,

  initCyber: async () => {
    const save = await loadCyber()
    rng = save ? saveRng(save) : null
    set({
      save, hasSave: !!save, phase: 'title', battle: null,
      explore: null, exploreTarget: null, evoPending: [], mapMessage: null,
    })
  },

  exitCyber: () => {
    const { save, phase } = get()
    // A mitad de combate NO se guarda: salir equivale a recargar (rollback al
    // último punto seguro), para que no se pueda esquivar una derrota.
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

  // ---- mapa ----
  travelTo: (index) => {
    const { save } = get()
    if (!save) return
    const r = getRng(save)
    const locations = getLocations(save)
    const loc = locations[index]
    if (!loc) return
    save.locationIndex = index

    if (loc.kind === 'center') { get().goTo('center'); return }

    // Zona secreta: te espera un legendario, sin rodeos.
    if (loc.kind === 'secret') {
      const speciesId = secretLegendary(save, loc.index)
      dexSee(save, speciesId)
      set({
        explore: createExplore(r),
        exploreTarget: { species: speciesId, level: SECRET_LEVEL, secretIndex: loc.index },
        exploreTerrain: 'secret',
        phase: 'explore',
        save: { ...save },
      })
      return
    }

    if (loc.kind === 'route') {
      const enc = rollEncounter(save, loc.index, r)
      if (enc.type === 'wild') {
        dexSee(save, enc.species)
        set({
          explore: createExplore(r),
          exploreTarget: { species: enc.species, level: enc.level },
          exploreTerrain: loc.terrain ?? 'grass',
          phase: 'explore',
          save: { ...save },
        })
        return
      }
      if (enc.type === 'trainer') {
        for (const m of enc.trainer.team) dexSee(save, m.speciesId)
        const pi = firstAlive(save.party)
        set({
          battle: newBattle('trainer', enc.trainer.team[0], save.party[pi], pi, r, enc.trainer),
          phase: 'battle',
          save: { ...save },
        })
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
    const pi = firstAlive(save.party)
    set({
      battle: newBattle('trainer', trainer.team[0], save.party[pi], pi, r, trainer),
      phase: 'battle',
      save: { ...save },
    })
  },

  clearMapMessage: () => set({ mapMessage: null }),

  // ---- exploración en 1ª persona ----
  exploreTurnBy: (deg) => {
    const { explore } = get()
    if (!explore) return
    set({ explore: exploreTurn(explore, deg) })
  },

  exploreStep: () => {
    const { explore, save } = get()
    if (!explore || !save) return
    const next = stepForward(explore)
    if (expired(next)) {
      set({ explore: null, exploreTarget: null, phase: 'map', mapMessage: '¡El Pokémon se ha escapado!' })
      persist(save, 'map')
      return
    }
    set({ explore: next })
  },

  exploreEngage: () => {
    const { explore, exploreTarget, save } = get()
    if (!explore || !exploreTarget || !save || !canEngage(explore)) return
    const r = getRng(save)
    const wild = makeWildInstance(exploreTarget.species, exploreTarget.level, r)
    const pi = firstAlive(save.party)
    set({
      battle: newBattle('wild', wild, save.party[pi], pi, r, undefined, exploreTarget.secretIndex),
      phase: 'battle',
      explore: null,
      exploreTarget: null,
    })
  },

  exploreLeave: () => {
    const { save } = get()
    set({ explore: null, exploreTarget: null, phase: 'map' })
    if (save) persist(save, 'map')
  },

  // ---- combate: los dos rodillos ----
  stopReel: (slotIndex, precision) => {
    const { battle, save } = get()
    if (!battle || !save || battle.phase !== 'reels') return
    const slot = battle.reels.player[slotIndex]
    if (!slot) return
    const playerMon = save.party[battle.playerIndex]
    // El golpe más fuerte dispara el machaque ◄ ► (fiel al juguete).
    if (isMashMove(playerMon, slot)) {
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
    if (!battle || !save || battle.phase === 'end' || battle.phase === 'switch') return
    const r = getRng(save)
    const playerMon = save.party[battle.playerIndex]
    set({
      battle: {
        ...battle,
        phase: 'reels',
        events: [],
        ...freshReels(playerMon, battle.enemy, hardSadFor(battle.trainer), r),
      },
    })
  },

  requestSwitch: () => {
    const { battle, save } = get()
    if (!battle || battle.phase !== 'reels' || battle.turn < 2) return
    if (!save || save.party.filter((m) => m.currentHp > 0).length < 2) return
    set({ battle: { ...battle, phase: 'switch' } })
  },

  switchTo: (partyIndex, voluntary) => {
    const { battle, save } = get()
    if (!battle || !save) return
    const mon = save.party[partyIndex]
    if (!mon || mon.currentHp <= 0 || partyIndex === battle.playerIndex) return
    const r = getRng(save)
    const events: CyberEvent[] = [{ kind: 'sendOut', side: 'player', text: `¡Adelante, ${displayName(mon)}!` }]
    const next: CyberBattleState = { ...battle, playerIndex: partyIndex, events, phase: 'anim' }
    // Cambiar consume el turno: el enemigo golpea al que entra.
    if (voluntary) enemyFreeHit(save, next, events, r)
    set({ battle: next, save: { ...save } })
  },

  cancelSwitch: () => {
    const { battle, save } = get()
    if (!battle || battle.phase !== 'switch' || !save) return
    if (save.party[battle.playerIndex].currentHp <= 0) return // relevo obligado
    set({ battle: { ...battle, phase: 'reels' } })
  },

  tryFlee: (mashScore) => {
    const { battle, save } = get()
    if (!battle || !save || battle.kind !== 'wild' || battle.turn < 2) return
    const r = getRng(save)
    const playerMon = save.party[battle.playerIndex]
    if (attemptFlee(playerMon, battle.enemy, mashScore, r)) {
      set({
        battle: {
          ...battle, phase: 'end', outcome: 'fled',
          events: [{ kind: 'end', won: false, text: '¡Escapaste sin problemas!' }],
        },
      })
      return
    }
    const events: CyberEvent[] = [{ kind: 'message', text: '¡No puedes escapar!' }]
    const next: CyberBattleState = { ...battle, events, phase: 'anim' }
    enemyFreeHit(save, next, events, r)
    set({ battle: next, save: { ...save } })
  },

  throwBall: (shakeScore) => {
    const { battle, save } = get()
    if (!battle || !save || battle.kind !== 'wild') return
    if ((save.items['ball'] ?? 0) <= 0) {
      set({ battle: { ...battle, events: [{ kind: 'message', text: '¡No te quedan Poké Balls!' }], phase: 'anim' } })
      return
    }
    save.items['ball'] -= 1
    const r = getRng(save)
    const events: CyberEvent[] = [{ kind: 'throwBall', text: '¡Adelante, Poké Ball!' }]
    const result = resolveCapture(battle.enemy, getSpecies(battle.enemy.speciesId), shakeScore, r)

    if (result.caught) {
      dexCatch(save, battle.enemy.speciesId)
      if (battle.secretIndex != null) markSecretCaught(save, battle.secretIndex)
      events.push({ kind: 'caught', text: `¡${displayName(battle.enemy)} atrapado!` })
      if (save.party.length < CYBER_PARTY_MAX) save.party.push(battle.enemy)
      else {
        save.box.push(battle.enemy)
        events.push({ kind: 'message', text: 'Enviado al PC.' })
      }
      set({ battle: { ...battle, phase: 'end', outcome: 'caught', events }, save: { ...save } })
      void persistCyberMeta(save)
      return
    }

    events.push({ kind: 'broke', text: '¡Casi! ¡Se ha soltado!' })
    if (result.escaped) {
      events.push({ kind: 'end', won: false, text: '¡Oh, no! ¡El Pokémon escapó!' })
      set({ battle: { ...battle, phase: 'end', outcome: 'fled', events }, save: { ...save } })
      return
    }
    const next: CyberBattleState = { ...battle, events, phase: 'anim' }
    enemyFreeHit(save, next, events, r)
    set({ battle: next, save: { ...save } })
  },

  acknowledgeEnd: () => {
    const { battle, save } = get()
    if (!battle || !save || battle.phase !== 'end') return
    let phase: CyberPhase = 'map'
    if (battle.outcome === 'win' && battle.trainer) {
      if (applyTrainerVictory(save, battle.trainer)) {
        phase = 'victory'
        void persistCyberMeta(save, { completedGen: save.gen })
      }
    } else if (battle.outcome === 'lose') {
      applyDefeat(save)
      phase = 'gameover'
    } else if (battle.outcome === 'caught' || battle.outcome === 'win') {
      void persistCyberMeta(save)
    }
    const evoPending = (battle.outcome === 'win' || battle.outcome === 'caught')
      ? save.party
          .map((m) => ({ uid: m.uid, options: levelEvolutionTargets(m).map((s) => s.id) }))
          .filter((e) => e.options.length > 0)
      : []
    set({ battle: null, phase, evoPending, save: { ...save } })
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
      if (save.party.length <= 1) return null
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
    const beaten = save.ghostsBeaten ?? []
    if (beaten.includes(ghostId)) return // cada rival paga solo su 1ª derrota
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

// ---- Resolución de turno ----

/** El enemigo pega gratis (cambio voluntario, huida fallida, ball fallada). */
function enemyFreeHit(
  save: CyberSave, next: CyberBattleState, events: CyberEvent[], r: RNG,
): void {
  const mon = save.party[next.playerIndex]
  const enemyReel = buildReel(next.enemy)
  const slot = enemyReel[enemyReelStop(next.enemy, mon, enemyReel, r)]
  attackIfAble(next.enemy, 'enemy', mon, slot, 1, r, events)
  endOfTurn(mon, 'player', events)
  maybeRecoverStatus(mon, 'player', r, events)
  next.turn += 1
  if (mon.currentHp <= 0) closeOrSwitch(save, next, events)
}

/** Un lado ataca, salvo que su estado se lo impida (dormido/congelado). */
function attackIfAble(
  attacker: PokemonInstance, side: Side, defender: PokemonInstance,
  slot: ReelSlot, mult: number, r: RNG, events: CyberEvent[],
): void {
  if (attacker.currentHp <= 0) return
  if (blockedByStatus(attacker, side, r, events)) return
  performAttack(side, attacker, defender, slot, mult, r, events)
}

/** Sueño/congelación/parálisis pueden anular el turno. */
function blockedByStatus(mon: PokemonInstance, side: Side, r: RNG, events: CyberEvent[]): boolean {
  const st: StatusCondition = mon.status
  if (st === 'slp' || st === 'frz') {
    if (r.chance(0.4)) {
      mon.status = 'none'
      events.push({ kind: 'recover', side, text: `¡${displayName(mon)} se recuperó!` })
      return false
    }
    events.push({
      kind: 'sad', side,
      text: st === 'slp' ? `${displayName(mon)} está dormido…` : `${displayName(mon)} está congelado…`,
    })
    return true
  }
  if (st === 'par' && r.chance(0.25)) {
    events.push({ kind: 'sad', side, text: `¡${displayName(mon)} está paralizado y no se mueve!` })
    return true
  }
  return false
}

/** El enemigo activo ha caído: exp, siguiente Pokémon del entrenador o fin. */
function enemyDown(save: CyberSave, next: CyberBattleState, events: CyberEvent[]): void {
  const playerMon = save.party[next.playerIndex]
  if (awardExp(playerMon, next.enemy) > 0) {
    events.push({ kind: 'levelUp', text: `¡${displayName(playerMon)} sube a Nv.${playerMon.level}!` })
  }
  const t = next.trainer
  if (t && next.enemyIndex + 1 < t.team.length) {
    const nextEnemy = t.team[next.enemyIndex + 1]
    next.enemy = nextEnemy
    next.enemyIndex += 1
    events.push({ kind: 'sendOut', side: 'enemy', text: `${t.name} envía a ${displayName(nextEnemy)}.` })
    return
  }
  next.phase = 'end'
  next.outcome = 'win'
  events.push({
    kind: 'end', won: true,
    text: t ? `¡Has derrotado a ${t.name}! Ganas ${t.money} ₽.` : '¡Combate ganado!',
  })
}

/** El jugador ha caído: relevo obligado o derrota. */
function closeOrSwitch(save: CyberSave, next: CyberBattleState, events: CyberEvent[]): void {
  if (!anyAlive(save.party)) {
    next.phase = 'end'
    next.outcome = 'lose'
    events.push({ kind: 'end', won: false, text: '¡No te quedan Pokémon!' })
  } else {
    next.phase = 'switch'
  }
}

/** Turno completo: paras tu rodillo, el rival para el suyo, y atacan en orden
 *  de Velocidad (el que elige primero, pega primero — fiel al juguete). */
function resolveTurn(
  set: (partial: Partial<CyberState>) => void,
  get: () => CyberState,
  playerSlot: ReelSlot,
  precision: StopPrecision,
  boost: number,
): void {
  const { battle, save } = get()
  if (!battle || !save) return
  const r = getRng(save)
  const playerMon = save.party[battle.playerIndex]
  const events: CyberEvent[] = []
  const next: CyberBattleState = { ...battle, events, phase: 'anim', turn: battle.turn + 1 }

  // Dónde ha parado el rodillo del rival.
  const enemySlot = battle.reels.enemy[enemyReelStop(next.enemy, playerMon, battle.reels.enemy, r)]
  const playerMult = PRECISION_MULT[precision] * boost

  const order: Side[] = battle.first === 'player' ? ['player', 'enemy'] : ['enemy', 'player']
  for (const side of order) {
    if (next.phase === 'end') break
    if (side === 'player') {
      attackIfAble(playerMon, 'player', next.enemy, playerSlot, playerMult, r, events)
      if (next.enemy.currentHp <= 0) { enemyDown(save, next, events); continue }
    } else {
      attackIfAble(next.enemy, 'enemy', playerMon, enemySlot, 1, r, events)
      if (playerMon.currentHp <= 0) break // se resuelve abajo
    }
  }

  // Daño residual y recuperaciones, si el combate sigue.
  if (next.phase !== 'end' && playerMon.currentHp > 0 && next.enemy.currentHp > 0) {
    endOfTurn(playerMon, 'player', events)
    endOfTurn(next.enemy, 'enemy', events)
    maybeRecoverStatus(playerMon, 'player', r, events)
    if (next.enemy.currentHp <= 0) enemyDown(save, next, events)
  }

  // El jugador puede haber caído por el ataque enemigo O por el residual.
  if (next.phase !== 'end' && playerMon.currentHp <= 0) closeOrSwitch(save, next, events)

  set({ battle: next, save: { ...save } })
}
