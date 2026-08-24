// Store del modo Dragon Ball Rogue. FSM propia (título → mapa → nodo →
// combate → resumen → mapa …), aislada del roguelike Pokémon: no toca
// `gameStore` salvo para volver a Inicio.
//
// Regla de oro heredada de Cyber e Inazuma: **el combate no se persiste**.
// Solo se guarda al volver al mapa, así que salir a mitad de una pelea
// equivale a no haberla jugado y no se puede esquivar una derrota cerrando la
// app.
import { create } from 'zustand'
import { RNG } from '@/utils/rng'
import { play } from '@/utils/sfx'
import { useGame } from '@/state/gameStore'
import { clearDragon, loadDragon, loadMeta, saveDragon, saveMeta } from '@/persistence/db'
import { currentUser, saveCloudMeta } from '@/persistence/supabase'
import { checkDragonAchievements } from '@/engine/dragon/achievements'
import { getSaga } from '@/data/dragon/sagas'
import { getItem, ITEMS, stockFor, type Item } from '@/data/dragon/items'
import { advance, chooseOption, setAuto } from '@/engine/dragon/battle'
import {
  advanceMap, applyBattleResult, applyInterlude, applyRest, applyTraining,
  BALLS_FOR_WISH, BOSS_LAYER, canRecruit, createSave, grantWish, isTeamWiped,
  applyMasterOffer, availableNodes, layerNodes, masterOffers, recruit, recruitCandidate,
  startNodeBattle, swapIn,
  useItemOutOfBattle, type BattleOutcome, type DragonSave, type MapNode, type MasterOffer,
} from '@/engine/dragon/run'
import { fighterMaxHp } from '@/engine/dragon/roster'
import type { Battle, Fighter } from '@/engine/dragon/types'

export type DragonPhase =
  | 'title' | 'intro' | 'map' | 'node' | 'battle' | 'outcome'
  | 'team' | 'shop' | 'master' | 'wish' | 'victory' | 'gameover'

/** Fases desde las que es seguro guardar (o sea: fuera de un combate). */
// 'node' entra aquí: ahora la previa es un modal SOBRE el mapa, así que estar
// mirándola es estar en el mapa y se puede guardar sin problema.
const SAFE_PHASES: DragonPhase[] = ['map', 'node', 'team', 'shop', 'master', 'wish', 'title', 'intro', 'victory', 'gameover']

/** RNG viva de la partida (se rehidrata del save y se vuelca al persistir). */
let rng: RNG | null = null
function getRng(save: DragonSave): RNG {
  if (!rng) {
    rng = new RNG(save.seed)
    rng.setState(save.rngState)
  }
  return rng
}

/** Fase de ENTRADA pedida desde fuera (el menú principal). */
let pendingEntry: DragonPhase | null = null
export function setDragonEntry(phase: DragonPhase): void {
  pendingEntry = phase
}

/**
 * TICKER de la retransmisión. El combate se cuenta evento a evento, y solo
 * cuando no queda nada por contar se pide el siguiente latido al motor. Así el
 * ritmo lo marca lo que estás leyendo y no un bucle cerrado — es el mismo
 * trato que en Inazuma, donde el partido no corre por delante de su relato.
 */
let ticker: ReturnType<typeof setTimeout> | null = null

export function stopTicker(): void {
  if (ticker) { clearTimeout(ticker); ticker = null }
}

function startTicker(): void {
  stopTicker()
  const { battle, playing, speed } = useDragon.getState()
  if (!battle || !playing) return
  // Contar lo que falta va rápido; pedir un latido nuevo, algo más pausado.
  ticker = setTimeout(() => { tickOnce() }, speed)
}

function tickOnce(): void {
  const st = useDragon.getState()
  const b = st.battle
  if (!b) { stopTicker(); return }

  // 1) ¿Queda relato por contar? Se cuenta.
  if (st.revealed < b.log.length) {
    useDragon.setState({ revealed: st.revealed + 1 })
    startTicker()
    return
  }
  // 2) Contado todo: si el motor espera una decisión o el combate acabó, para.
  if (b.phase === 'decision' || b.over) { stopTicker(); return }
  // 3) Si no, un latido más.
  advance(b)
  useDragon.setState({ battle: { ...b } })
  startTicker()
}

async function persist(save: DragonSave, phase: DragonPhase) {
  if (!SAFE_PHASES.includes(phase)) return
  if (rng) save.rngState = rng.getState()
  // Guardar es «lo mejor que se pueda»: sin IndexedDB (modo privado, tests) la
  // partida sigue en memoria y no se tumba la pantalla por ello.
  await saveDragon(save).catch(() => {})
}

/** Meta-progresión del modo. Es read-modify-write, así que va en cola. */
let metaQueue: Promise<void> = Promise.resolve()
export function persistDragonMeta(extra: {
  saga?: number
  won?: boolean
  started?: boolean
  balls?: number
  forms?: string[]
}): Promise<void> {
  metaQueue = metaQueue.then(async () => {
    const meta = await loadMeta()
    if (extra.started) meta.dragonRuns = (meta.dragonRuns ?? 0) + 1
    if (extra.won) meta.dragonWins = (meta.dragonWins ?? 0) + 1
    if (extra.saga != null) {
      meta.dragonBestSaga = Math.max(meta.dragonBestSaga ?? 0, extra.saga)
      meta.dragonSagasCleared = [...new Set([...(meta.dragonSagasCleared ?? []), extra.saga])]
    }
    if (extra.balls) meta.dragonBalls = Math.max(meta.dragonBalls ?? 0, extra.balls)
    if (extra.forms?.length) {
      meta.dragonForms = [...new Set([...(meta.dragonForms ?? []), ...extra.forms])]
    }
    const ach = checkDragonAchievements(meta)
    if (ach.length) meta.achievements = [...new Set([...meta.achievements, ...ach])]
    await saveMeta(meta)
    if (currentUser()) await saveCloudMeta(meta).catch(() => {})
    if (ach.length) useGame.setState((g) => ({ newAchievements: [...g.newAchievements, ...ach] }))
  }).catch(() => {})
  return metaQueue
}

interface DragonState {
  phase: DragonPhase
  save: DragonSave | null
  hasSave: boolean
  /** Combate en curso. En memoria: NUNCA se guarda. */
  battle: Battle | null
  /** Nodo elegido, a la espera de confirmarse. */
  node: MapNode | null
  /** Resultado del último combate, para la pantalla de resumen. */
  outcome: BattleOutcome | null
  /** Género de la tienda del nodo actual. */
  stock: Item[]
  /**
   * Fichaje esperando sitio: el equipo está lleno y hay que decidir a quién
   * sustituye (o si se rechaza). Sin esto el nodo se gastaba sin dar nada.
   */
  pendingRecruit: Fighter | null
  /** Panel de reglas abierto a mano desde el título. */
  showHelp: boolean
  message: string | null

  initDragon: () => Promise<void>
  exitDragon: () => void
  newRun: (starter: string) => Promise<void>
  continueRun: () => void
  abandonRun: () => Promise<void>
  goTo: (phase: DragonPhase) => void
  openTeam: () => void
  closeTeam: () => void
  clearMessage: () => void
  openHelp: () => void
  closeHelp: () => void
  /** A dónde vuelve la pantalla de equipo (mapa o tienda). */
  teamReturn: DragonPhase | null

  // mapa y nodos
  pickNode: (id: string) => void
  confirmNode: () => void
  leaveNode: () => void
  // combate
  /** Eventos del log ya contados. La retransmisión va por aquí. */
  revealed: number
  playing: boolean
  /** Milisegundos por evento revelado. */
  speed: number
  decide: (optionId: string) => void
  togglePlaying: () => void
  setSpeed: (ms: number) => void
  toggleAuto: () => void
  finishBattle: () => void
  // gestión
  buy: (itemId: string) => void
  leaveShop: () => void
  /** Lo que el maestro de la casilla puede enseñar a tu equipo. */
  offers: () => MasterOffer[]
  train: (offer: MasterOffer) => void
  /** Resuelve el fichaje pendiente: `null` = rechazarlo. */
  resolveRecruit: (saleUid: string | null) => void
  equip: (uid: string, itemId?: string) => void
  useField: (itemId: string, uid: string) => void
  wish: (wishId: string) => void
}

export const useDragon = create<DragonState>((set, get) => ({
  phase: 'title',
  save: null,
  hasSave: false,
  battle: null,
  node: null,
  outcome: null,
  stock: [],
  message: null,
  teamReturn: null,
  pendingRecruit: null,
  showHelp: false,
  revealed: 0,
  playing: true,
  speed: 420,

  initDragon: async () => {
    stopTicker()
    const save = await loadDragon()
    rng = null
    if (save) getRng(save)
    const entry = pendingEntry
    pendingEntry = null
    set({
      save, hasSave: !!save, phase: entry ?? 'title',
      battle: null, node: null, outcome: null, stock: [], message: null,
      pendingRecruit: null,
    })
  },

  exitDragon: () => {
    stopTicker()
    const { save, phase } = get()
    if (save) void persist(save, phase)
    useGame.getState().navigate('home')
  },

  newRun: async (starter: string) => {
    const seed = Math.floor(Math.random() * 0xffffffff)
    const save = createSave(seed, { starter })
    save.startedAt = Date.now()
    rng = new RNG(seed)
    rng.setState(save.rngState)
    await saveDragon(save).catch(() => {})
    void persistDragonMeta({ started: true })
    set({ save, hasSave: true, phase: 'intro', battle: null, node: null, outcome: null, message: null })
  },

  continueRun: () => {
    const { save } = get()
    if (!save) return
    set({ phase: save.finished === 'victoria' ? 'victory' : save.finished ? 'gameover' : 'map' })
  },

  abandonRun: async () => {
    stopTicker()
    await clearDragon().catch(() => {})
    rng = null
    set({ save: null, hasSave: false, phase: 'title', battle: null, node: null, outcome: null })
  },

  goTo: (phase) => {
    const { save } = get()
    if (save) void persist(save, phase)
    set({ phase })
  },

  /**
   * Abre el equipo recordando de dónde vienes. Sin esto, ir a Equipo desde la
   * tienda y volver te dejaba en el mapa con el nodo de tienda SIN consumir:
   * comprabas gratis y encima podías elegir otra casilla de la misma capa.
   */
  openTeam: () => {
    const { phase } = get()
    set({ teamReturn: phase === 'shop' ? 'shop' : 'map', phase: 'team' })
  },

  closeTeam: () => {
    const { save, teamReturn } = get()
    const back = teamReturn ?? 'map'
    if (save) void persist(save, back)
    set({ phase: back, teamReturn: null })
  },

  clearMessage: () => set({ message: null }),
  openHelp: () => set({ showHelp: true }),
  closeHelp: () => set({ showHelp: false }),

  // ------------------------------------------------------------- mapa ---

  pickNode: (id) => {
    const { save } = get()
    if (!save) return
    // Solo casillas a las que de verdad lleva tu camino: el mapa es un grafo,
    // no una lista, así que no vale saltar a cualquier casilla de la capa.
    const node = availableNodes(save).find((n) => n.id === id)
    if (!node) return
    play('select')
    // El aliado se resuelve AL ENTRAR, no al generar el mapa: si el candidato
    // ya está en tu equipo hay que ofrecer otro (si no, el nodo se gasta).
    if (node.kind === 'reclutar') recruitCandidate(save, node, getRng(save))
    // El género se fija en la primera visita y se queda en el nodo: entrar y
    // salir no puede servir para re-rolear la tienda hasta que salga lo bueno.
    if (node.kind === 'tienda' && !node.stock) {
      node.stock = stockFor(save.saga, (arr) => getRng(save).pick(arr)).map((i) => i.id)
    }
    const stock = (node.stock ?? [])
      .map((id) => getItem(id))
      .filter((i): i is Item => !!i)
    // Abrir la previa consume RNG (candidato a aliado, género de tienda), así
    // que hay que guardar o al volver a entrar saldría otra cosa distinta.
    void persist(save, 'node')
    set({ node, stock, phase: 'node' })
  },

  leaveNode: () => set({ phase: 'map', node: null }),

  /** Resuelve el nodo elegido: los de combate abren pelea, el resto se aplican. */
  confirmNode: () => {
    const { save, node } = get()
    if (!save || !node) return
    const r = getRng(save)

    if (node.kind === 'combate' || node.kind === 'elite' || node.kind === 'jefe') {
      play('select')
      save.currentNode = node.id
      const battle = startNodeBattle(save, node, r)
      set({ battle, phase: 'battle', revealed: 0, playing: true })
      startTicker()
      return
    }

    let message: string | null = null
    switch (node.kind) {
      case 'descanso':
        applyRest(save)
        message = 'El equipo recupera fuerzas.'
        break
      case 'entreno': {
        // Al que más lo necesita: el de menor nivel que siga en pie.
        const target = [...save.team].filter((f) => f.hp > 0).sort((a, b) => a.level - b.level)[0]
        if (target) {
          const learned = applyTraining(save, target.uid, node.levels ?? 3)
          message = `${target.name} entrena duro (+${node.levels ?? 3} niveles)`
          if (learned.length) message += ` y aprende algo nuevo`
        }
        break
      }
      case 'reclutar': {
        const cand = node.recruit
        if (!cand) { message = 'No queda nadie por aquí.' }
        else {
          const f = recruit(save, cand)
          if (f && !canRecruit(save) && !save.team.includes(f)) {
            // Equipo lleno: se pregunta a quién sustituye en vez de perder el
            // nodo. La casilla NO se cierra hasta que lo decidas.
            set({ pendingRecruit: f })
            return
          }
          message = f ? `¡${f.name} se une al equipo!` : 'Ya está contigo.'
        }
        break
      }
      case 'bola':
        save.balls += 1
        play('catch')
        message = `Bola de Dragón encontrada (${save.balls}/${BALLS_FOR_WISH})`
        void persistDragonMeta({ balls: save.balls })
        break
      case 'tienda':
        // La tienda no se «resuelve»: se abre y se sale cuando quieras.
        set({ phase: 'shop' })
        return
      case 'maestro':
        // El maestro tampoco: se elige qué aprender y eso cierra la casilla.
        set({ phase: 'master' })
        return
    }

    node.done = true
    save.currentNode = node.id
    applyInterlude(save, node ?? undefined)
    advanceMap(save, r)
    void persist(save, 'map')
    set({ save: { ...save }, node: null, message, phase: save.balls >= BALLS_FOR_WISH ? 'wish' : 'map' })
  },

  // ---------------------------------------------------------- combate ---

  /**
   * Resuelve el momento clave. El sonido va por la opción elegida, no por el
   * evento, para que suene en el instante en que pulsas.
   */
  decide: (optionId) => {
    const { battle } = get()
    if (!battle || battle.phase !== 'decision') return
    const kind = battle.decision?.kind
    if (kind === 'choque') play('crit')
    else if (optionId.startsWith('form:')) play('levelup')
    else if (optionId.startsWith('tech:')) play('mega')
    else if (optionId === 'golpe') play('hit')
    else play('select')
    chooseOption(battle, optionId)
    set({ battle: { ...battle } })
    startTicker()
  },

  togglePlaying: () => {
    const playing = !get().playing
    set({ playing })
    if (playing) startTicker()
    else stopTicker()
  },

  setSpeed: (ms) => {
    set({ speed: ms })
    startTicker()
  },

  toggleAuto: () => {
    const { battle } = get()
    if (!battle) return
    setAuto(battle, !battle.auto)
    set({ battle: { ...battle } })
    startTicker()
  },

  /** Cierra el combate: vuelca el resultado al save y decide a dónde ir. */
  finishBattle: () => {
    stopTicker()
    const { save, battle, node } = get()
    if (!save || !battle || !node) return
    if (!battle.over) { advance(battle) }
    const outcome = applyBattleResult(save, battle, node)
    play(outcome.win ? 'victory' : 'defeat')
    if (outcome.awakened.length) {
      void persistDragonMeta({ forms: outcome.awakened })
    }
    set({ save: { ...save }, battle: null, outcome, phase: 'outcome' })
  },

  // --------------------------------------------------------- gestión ---

  buy: (itemId) => {
    const { save } = get()
    if (!save) return
    const it = getItem(itemId)
    if (!it || save.zeni < it.price) { set({ message: 'No te llega el dinero.' }); return }
    save.zeni -= it.price
    save.bag[itemId] = (save.bag[itemId] ?? 0) + 1
    play('buy')
    void persist(save, 'shop')
    set({ save: { ...save }, message: `${it.name} comprado` })
  },

  /**
   * Salir de la tienda CONSUME el nodo y avanza el mapa: comprar y marcharse
   * son dos momentos distintos, por eso no se resuelve en `confirmNode`.
   */
  leaveShop: () => {
    const { save, node } = get()
    if (!save) return
    if (node) { node.done = true; save.currentNode = node.id }
    const r = getRng(save)
    applyInterlude(save, node ?? undefined)
    advanceMap(save, r)
    void persist(save, 'map')
    set({
      save: { ...save }, node: null,
      phase: save.balls >= BALLS_FOR_WISH ? 'wish' : 'map',
    })
  },

  resolveRecruit: (saleUid) => {
    const { save, node, pendingRecruit } = get()
    if (!save || !pendingRecruit) return
    let message: string | null = null
    if (saleUid) {
      const sale = save.team.find((f) => f.uid === saleUid)
      if (swapIn(save, pendingRecruit, saleUid)) {
        play('select')
        message = `${pendingRecruit.name} entra en el sitio de ${sale?.name ?? 'alguien'}.`
      }
    } else {
      message = `${pendingRecruit.name} se queda atrás.`
    }
    if (node) { node.done = true; save.currentNode = node.id }
    const r = getRng(save)
    applyInterlude(save, node ?? undefined)
    advanceMap(save, r)
    void persist(save, 'map')
    set({
      save: { ...save }, node: null, pendingRecruit: null, message,
      phase: save.balls >= BALLS_FOR_WISH ? 'wish' : 'map',
    })
  },

  offers: () => {
    const { save, node } = get()
    if (!save || !node?.master) return []
    return masterOffers(save, node.master)
  },

  train: (offer) => {
    const { save, node } = get()
    if (!save) return
    const msg = applyMasterOffer(save, offer)
    play('levelup')
    if (node) { node.done = true; save.currentNode = node.id }
    const r = getRng(save)
    applyInterlude(save, node ?? undefined)
    advanceMap(save, r)
    void persist(save, 'map')
    set({
      save: { ...save }, node: null, message: msg,
      phase: save.balls >= BALLS_FOR_WISH ? 'wish' : 'map',
    })
  },

  equip: (uid, itemId) => {
    const { save } = get()
    if (!save) return
    const f = save.team.find((x) => x.uid === uid)
    if (!f) return
    // El objeto sale de la bolsa y el anterior vuelve a ella: nada se pierde.
    if (f.item) save.bag[f.item] = (save.bag[f.item] ?? 0) + 1
    if (itemId) {
      if (!(save.bag[itemId] > 0)) return
      save.bag[itemId] -= 1
      if (save.bag[itemId] <= 0) delete save.bag[itemId]
    }
    f.item = itemId
    // El dominio va con el objeto CONCRETO: cambiarlo empieza de cero.
    f.itemXp = 0
    // Cambiar de objeto puede subir el tope de PS; nunca debe dejarlo por encima.
    f.hp = Math.min(f.hp, fighterMaxHp(f))
    play('select')
    void persist(save, get().phase)
    set({ save: { ...save } })
  },

  useField: (itemId, uid) => {
    const { save } = get()
    if (!save) return
    const msg = useItemOutOfBattle(save, itemId, uid)
    if (!msg) { set({ message: 'Ahí no hace nada.' }); return }
    play('heal')
    void persist(save, get().phase)
    set({ save: { ...save }, message: msg })
  },

  wish: (wishId) => {
    const { save } = get()
    if (!save || save.balls < BALLS_FOR_WISH) return
    const msg = grantWish(save, wishId)
    play('levelup')
    void persist(save, 'map')
    set({ save: { ...save }, message: msg, phase: 'map' })
  },
}))

/**
 * Cierra el resumen del combate y decide qué viene después. Vive fuera del
 * `create` porque necesita encadenar varias transiciones (fin de run, cambio
 * de saga, deseo pendiente) y así se lee de un tirón.
 */
export function afterOutcome(): void {
  const { save, outcome } = useDragon.getState()
  if (!save) return
  const r = getRng(save)

  if (save.finished === 'derrota' || isTeamWiped(save)) {
    save.finished = 'derrota'
    void persistDragonMeta({ saga: save.saga })
    void persist(save, 'gameover')
    useDragon.setState({ save: { ...save }, phase: 'gameover', outcome: null })
    return
  }

  const eraJefe = save.layer === BOSS_LAYER
  // OJO: `advanceMap` incrementa `save.saga`, así que la saga que acabas de
  // superar hay que leerla ANTES o se registra la siguiente.
  const sagaSuperada = save.saga
  const paso = advanceMap(save, r)

  if (paso === 'fin') {
    void persistDragonMeta({ saga: sagaSuperada, won: true })
    void persist(save, 'victory')
    useDragon.setState({ save: { ...save }, phase: 'victory', outcome: null })
    return
  }
  if (eraJefe) void persistDragonMeta({ saga: sagaSuperada })

  void persist(save, 'map')
  useDragon.setState({
    save: { ...save },
    phase: save.balls >= BALLS_FOR_WISH ? 'wish' : 'map',
    outcome: null,
    node: null,
    message: paso === 'saga' ? getSaga(save.saga).intro : outcome?.zenkai.length
      ? `¡${outcome.zenkai.join(' y ')} vuelve más fuerte tras rozar la muerte!`
      : null,
  })
}

/** Resumen de una línea para la tarjeta de Inicio. */
export function dragonSummary(save: DragonSave): string {
  if (save.finished === 'victoria') return 'Aventura completada'
  const s = getSaga(save.saga)
  return `${s.name} · ${save.layer >= BOSS_LAYER ? 'ante el jefe' : `tramo ${save.layer + 1}`}`
}

/** Objetos de la bolsa que se pueden usar fuera del combate. */
export function fieldItems(save: DragonSave): { item: Item; n: number }[] {
  return Object.entries(save.bag)
    .map(([id, n]) => ({ item: ITEMS.find((i) => i.id === id)!, n }))
    .filter((x) => x.item?.field && x.n > 0)
}

export { availableNodes, layerNodes }
