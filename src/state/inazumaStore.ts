// Store del modo Inazuma Rogue. FSM propia (título → mapa → previa → partido →
// resumen → draft → mapa …), completamente aislada del roguelike Pokémon: no
// toca `gameStore` salvo para volver a Inicio.
//
// Regla de oro heredada del modo Cyber: **el partido no se persiste**. Solo se
// guarda al volver al mapa. Salir a mitad de un partido equivale a no haberlo
// jugado, así que no se puede esquivar una derrota cerrando la app.
import { create } from 'zustand'
import { RNG } from '@/utils/rng'
import { play } from '@/utils/sfx'
import { useGame } from '@/state/gameStore'
import { clearInazuma, loadInazuma, loadMeta, saveInazuma, saveMeta } from '@/persistence/db'
import { currentUser, saveCloudMeta } from '@/persistence/supabase'
import { checkInazumaAchievements } from '@/engine/inazuma/achievements'
import { getItem } from '@/data/inazuma/items'
import { getPlayerBase } from '@/data/inazuma/players'
import { getTechnique } from '@/data/inazuma/techniques'
import {
  advanceLayer, applyMatchResult, applyPachangaResult, canLearn, createSave, fullRest,
  isEliminated, isMapComplete, startMatch, startPachanga,
} from '@/engine/inazuma/game'
import { advance, chooseOption, playerScore } from '@/engine/inazuma/match'
import { nextRound, shoot, type PachangaState } from '@/engine/inazuma/pachanga'
import { buildDraft, buildScoutOffer } from '@/engine/inazuma/rewards'
import {
  autoLineup, canUpgradeTechnique, createPlayer, levelUp, lineupError, ptMax, upgradeTechnique,
} from '@/engine/inazuma/roster'
import { availableNextNodes, bossIndexForLayer, layerName } from '@/engine/inazuma/tournament'
import { getFormation } from '@/data/inazuma/formations'
import {
  ROSTER_MAX, SQUAD_SIZE, TECHNIQUE_SLOTS,
  type DraftOption, type InazumaPhase, type InazumaSave, type MatchEvent, type MatchPhase,
  type MatchState, type TournamentNode,
} from '@/engine/inazuma/types'

/** RNG viva de la partida (se rehidrata del save y se vuelca al persistir). */
let rng: RNG | null = null
function getRng(save: InazumaSave): RNG {
  if (!rng) {
    rng = new RNG(save.seed)
    rng.setState(save.rngState)
  }
  return rng
}

/** RNG del partido en curso. Muere con el partido: no se persiste nunca. */
let matchRng: RNG | null = null
/** Temporizador de la retransmisión. */
let ticker: ReturnType<typeof setTimeout> | null = null

function stopTicker() {
  if (ticker) { clearTimeout(ticker); ticker = null }
}

/** Fases desde las que es seguro guardar (fuera de un partido). */
const SAFE_PHASES: InazumaPhase[] = ['map', 'squad', 'shop', 'bag', 'stats', 'album', 'draft', 'victory', 'gameover', 'title']

async function persist(save: InazumaSave, phase: InazumaPhase) {
  if (!SAFE_PHASES.includes(phase)) return
  if (rng) save.rngState = rng.getState()
  await saveInazuma(save)
}

/** Meta-progresión del modo. Es read-modify-write, así que va en cola. */
let metaQueue: Promise<void> = Promise.resolve()
export function persistInazumaMeta(extra: { title?: boolean; round?: number; signed?: string[] }): Promise<void> {
  metaQueue = metaQueue.then(async () => {
    const meta = await loadMeta()
    if (extra.title) meta.inazumaTitles = (meta.inazumaTitles ?? 0) + 1
    if (extra.round != null) meta.inazumaBestRound = Math.max(meta.inazumaBestRound ?? 0, extra.round)
    if (extra.signed?.length) {
      meta.inazumaSigned = [...new Set([...(meta.inazumaSigned ?? []), ...extra.signed])]
    }
    const ach = checkInazumaAchievements(meta)
    if (ach.length) meta.achievements = [...new Set([...meta.achievements, ...ach])]
    await saveMeta(meta)
    if (currentUser()) await saveCloudMeta(meta).catch(() => {})
    // Mismo patrón que el resto de modos: el aviso se pinta en Inicio.
    if (ach.length) useGame.setState((g) => ({ newAchievements: [...g.newAchievements, ...ach] }))
  })
  return metaQueue
}

interface InazumaState {
  phase: InazumaPhase
  save: InazumaSave | null
  hasSave: boolean
  /** Partido en curso (en memoria; nunca se guarda). */
  match: MatchState | null
  /** Pachanga en curso (idem: no se persiste). */
  pachanga: PachangaState | null
  /** Nodo que originó el partido, para saber qué premio pagar al acabar. */
  matchNode: TournamentNode | null
  /** Eventos ya reproducidos, del más antiguo al más nuevo. */
  feed: MatchEvent[]
  /** true mientras la retransmisión corre sola. */
  playing: boolean
  /** Velocidad de la retransmisión (ms entre latidos). */
  speed: number
  /** Deja que el motor decida por ti las jugadas clave. */
  autoPlay: boolean
  /** Cartas de recompensa pendientes de elegir. */
  draft: DraftOption[]
  /** Cartas que quedan por elegir en esta tanda (salir «a por todas» da 2). */
  draftPicks: number
  /** Carta que necesita que señales a un jugador. */
  pendingTarget: DraftOption | null
  message: string | null

  initInazuma: () => Promise<void>
  exitInazuma: () => void
  newTournament: () => Promise<void>
  continueTournament: () => void
  abandonTournament: () => Promise<void>
  goTo: (phase: InazumaPhase) => void
  clearMessage: () => void

  // mapa
  chooseNode: (nodeId: string) => void
  confirmMatch: () => void

  // partido
  setPlaying: (v: boolean) => void
  setSpeed: (ms: number) => void
  setAutoPlay: (v: boolean) => void
  tick: () => void
  decide: (optionId: string) => void
  finishMatch: () => void

  // pachanga
  pachangaShoot: (optionId: string) => void
  finishPachanga: () => void

  // recompensas
  pickDraft: (optionId: string) => void
  applyToPlayer: (uid: string) => void
  cancelTarget: () => void

  // plantilla
  setLineup: (uids: string[]) => void
  toggleStarter: (uid: string) => void
  equip: (uid: string, itemId: string | undefined) => void
  useConsumable: (itemId: string, uid: string) => void
  teachTechnique: (techId: string, uid: string) => void
  setFormation: (id: string) => void
  pauseAtHalftime: () => void
  resumePausedMatch: () => void
  release: (uid: string) => void
  buy: (itemId: string) => void
}

export const useInazuma = create<InazumaState>((set, get) => ({
  phase: 'title',
  save: null,
  hasSave: false,
  match: null,
  pachanga: null,
  matchNode: null,
  feed: [],
  playing: false,
  speed: 1100,
  autoPlay: false,
  draft: [],
  draftPicks: 0,
  pendingTarget: null,
  message: null,

  initInazuma: async () => {
    stopTicker()
    const save = await loadInazuma()
    rng = null
    matchRng = null
    if (save) getRng(save)
    set({
      save, hasSave: !!save, phase: 'title', match: null, pachanga: null, matchNode: null,
      feed: [], playing: false, draft: [], draftPicks: 0, pendingTarget: null, message: null,
    })
  },

  exitInazuma: () => {
    stopTicker()
    const { save, phase } = get()
    if (save) void persist(save, phase)
    useGame.getState().navigate('home')
  },

  newTournament: async () => {
    stopTicker()
    const seed = Math.floor(Math.random() * 0xffffffff)
    const save = createSave(seed)
    rng = new RNG(seed)
    rng.setState(save.rngState)
    await saveInazuma(save)
    set({ save, hasSave: true, phase: 'map', match: null, pachanga: null, feed: [], draft: [], message: null })
  },

  continueTournament: () => {
    const { save } = get()
    if (!save) return
    set({ phase: isMapComplete(save) ? 'victory' : 'map' })
  },

  abandonTournament: async () => {
    stopTicker()
    await clearInazuma()
    rng = null
    set({ save: null, hasSave: false, phase: 'title', match: null, pachanga: null, feed: [] })
  },

  goTo: (phase) => {
    const { save } = get()
    if (save) void persist(save, phase)
    set({ phase })
  },

  clearMessage: () => set({ message: null }),

  // -------------------------------------------------------------- mapa ----
  chooseNode: (nodeId) => {
    const { save } = get()
    if (!save) return
    // Solo las casillas conectadas con la actual, como en el mapa Pokémon.
    const node = availableNextNodes(save.map, save.currentNodeId).find((n) => n.id === nodeId)
    if (!node) return

    // Jefes y pachangas pasan por la previa (ver rival y once); el resto se
    // resuelve al momento, como las casillas del mapa del modo Pokémon.
    if (node.kind === 'jefe' || node.kind === 'final' || node.kind === 'pachanga') {
      set({ matchNode: node, phase: 'preview' })
      return
    }
    if (node.kind === 'tienda') {
      set({ matchNode: node, phase: 'shop' })
      return
    }

    const next = { ...save, roster: save.roster.slice(), bag: save.bag.slice(), cleared: save.cleared.slice() }
    let message: string | null = null

    switch (node.kind) {
      case 'descanso':
        fullRest(next)
        message = 'Toda la plantilla vuelve a estar fresca: aguante y PT al máximo.'
        break
      case 'objeto':
        if (node.itemId) {
          next.bag.push(node.itemId)
          message = `${getItem(node.itemId)?.name ?? 'Objeto'} a la mochila.`
        }
        break
      case 'tecnica':
        // Va a la MOCHILA. Antes obligaba a elegir destinatario en el acto, y
        // eso es una decisión que casi siempre quieres tomar después de ver la
        // plantilla — ahora se guarda y se enseña cuando te venga bien.
        if (node.techniqueId) {
          next.techniqueBag = [...next.techniqueBag, node.techniqueId]
          message = `${getTechnique(node.techniqueId)?.name} guardada en la mochila.`
        }
        break
      case 'ojeador': {
        const offer = buildScoutOffer(next, getRng(next))
        advanceLayer(next, node)
        set({ save: next, draft: offer, draftPicks: 1, phase: 'draft' })
        void persist(next, 'draft')
        return
      }
      default:
        break
    }

    advanceLayer(next, node)
    set({ save: next, phase: 'map', message })
    void persist(next, 'map')
  },

  confirmMatch: () => {
    const { save, matchNode } = get()
    if (!save || !matchNode) return
    const err = lineupError(save.roster, save.lineup, save.formation)
    if (err) { set({ message: err }); return }
    stopTicker()

    // Pachanga: tanda rápida, no el partido de 90 minutos.
    if (matchNode.kind === 'pachanga') {
      const setup = startPachanga(save, matchNode)
      if ('error' in setup) { set({ message: setup.error }); return }
      matchRng = setup.rng
      nextRound(setup.pachanga, setup.rng)
      set({ pachanga: { ...setup.pachanga }, phase: 'pachanga' })
      return
    }

    const setup = startMatch(save, matchNode)
    if ('error' in setup) { set({ message: setup.error }); return }
    matchRng = setup.rng
    set({ match: setup.match, feed: setup.match.events.slice(), phase: 'match', playing: true })
    get().tick()
  },

  // ---------------------------------------------------------- pachanga ----
  pachangaShoot: (optionId) => {
    const { pachanga } = get()
    if (!pachanga || !matchRng || pachanga.phase !== 'decision') return
    const round = shoot(pachanga, matchRng, optionId)
    play(round?.scored ? 'crit' : 'hit')
    // `nextRound` ya no hace nada si la tanda está decidida, así que se llama
    // sin condición: comprobar `phase` aquí no compila (TypeScript la da por
    // estrechada a 'decision' y no sabe que `shoot` la ha mutado).
    nextRound(pachanga, matchRng)
    set({ pachanga: { ...pachanga } })
  },

  finishPachanga: () => {
    const { pachanga, matchNode, save } = get()
    if (!pachanga || !matchNode || !save || pachanga.phase !== 'finished') return
    const next: InazumaSave = { ...save, roster: save.roster.slice(), cleared: save.cleared.slice() }
    applyPachangaResult(next, pachanga, matchNode)
    advanceLayer(next, matchNode)
    play(pachanga.result === 'win' ? 'victory' : 'defeat')
    set({
      save: next,
      pachanga: null,
      matchNode: null,
      phase: 'map',
      message: pachanga.result === 'win'
        ? `Pachanga ganada ${pachanga.goals[0]}-${pachanga.goals[1]}. Los que jugaron suben ${matchNode.risky ? 3 : 2} niveles.`
        : `Pachanga perdida ${pachanga.goals[0]}-${pachanga.goals[1]}. Solo os llevasteis el cansancio.`,
    })
    void persist(next, 'map')
  },

  // ------------------------------------------------------------ partido ----
  setPlaying: (v) => {
    set({ playing: v })
    if (v) get().tick()
    else stopTicker()
  },
  setSpeed: (ms) => set({ speed: ms }),
  setAutoPlay: (v) => {
    set({ autoPlay: v })
    if (v && get().match?.phase === 'decision') get().tick()
  },

  /**
   * Un latido de la retransmisión. Se re-programa solo mientras `playing` sea
   * true y el motor no esté esperando una decisión tuya.
   */
  tick: () => {
    stopTicker()
    const { match, playing, speed, autoPlay } = get()
    if (!match || !matchRng) return

    // Todas las condiciones de parada se comprueban AQUÍ, al principio del
    // latido, y nunca después de `advance` (que muta el partido). Así el bucle
    // tiene un único sitio donde decidir si sigue.
    const phase: MatchPhase = match.phase
    if (phase === 'finished') { set({ playing: false }); return }
    if (phase === 'decision') {
      if (!autoPlay) { set({ playing: false }); return }
      // Auto: la opción con más estrellas y, a igualdad, la más barata en PT.
      const best = (match.decision?.options ?? [])
        .filter((o) => !o.disabled)
        .slice()
        .sort((a, b) => b.odds - a.odds || a.cost - b.cost)[0]
      if (best) get().decide(best.id)
      return
    }
    if (!playing) return

    const events = advance(match, matchRng)
    if (events.some((e) => e.kind === 'goal')) play('victory')
    else if (events.some((e) => e.kind === 'save')) play('heal')
    else if (events.some((e) => e.kind === 'duel')) play('hit')

    set({ match: { ...match }, feed: match.events.slice() })
    ticker = setTimeout(() => get().tick(), events.length ? speed : 120)
  },

  decide: (optionId) => {
    const { match, speed, autoPlay } = get()
    if (!match || !matchRng || match.phase !== 'decision') return
    play('select')
    chooseOption(match, matchRng, optionId)
    set({ match: { ...match }, feed: match.events.slice(), playing: true })
    stopTicker()
    ticker = setTimeout(() => get().tick(), autoPlay ? Math.min(speed, 700) : speed)
  },

  finishMatch: () => {
    stopTicker()
    const { match, matchNode, save } = get()
    if (!match || !matchNode || !save || match.phase !== 'finished') return
    const next: InazumaSave = {
      ...save,
      roster: save.roster.slice(),
      record: [...save.record] as [number, number, number],
      cleared: save.cleared.slice(),
    }
    applyMatchResult(next, match, matchNode)
    const result = match.result ?? 'draw'

    if (isEliminated(matchNode, result)) {
      next.finishedAt = Date.now()
      void persistInazumaMeta({ round: bossIndexForLayer(next.layer) })
      set({ save: next, phase: 'gameover', match: null, matchNode: null })
      void persist(next, 'gameover')
      play('defeat')
      return
    }

    advanceLayer(next, matchNode)
    if (isMapComplete(next)) {
      next.finishedAt = Date.now()
      void persistInazumaMeta({ title: true, round: 8 })
      set({ save: next, phase: 'victory', match: null, matchNode: null })
      void persist(next, 'victory')
      play('victory')
      return
    }
    void persistInazumaMeta({ round: bossIndexForLayer(next.layer) })
    set({
      save: next,
      draft: buildDraft(next, getRng(next)),
      draftPicks: 1,
      phase: 'draft',
      match: null,
      matchNode: null,
    })
    void persist(next, 'draft')
  },

  // -------------------------------------------------------- recompensas ----
  pickDraft: (optionId) => {
    const { save, draft, draftPicks } = get()
    if (!save) return
    const opt = draft.find((o) => o.id === optionId)
    if (!opt) return

    // Estas dos necesitan que señales a quién: se guardan y se abre la plantilla.
    if (opt.kind === 'entrenamiento' || opt.kind === 'tecnica') {
      set({ pendingTarget: opt })
      return
    }

    const next = { ...save, roster: save.roster.slice(), bag: save.bag.slice() }
    let message: string | null = null
    if (opt.kind === 'fichaje') {
      if (next.roster.length >= ROSTER_MAX) {
        set({ message: `Tu plantilla está llena (${ROSTER_MAX}). Traspasa a alguien antes de fichar.` })
        return
      }
      next.roster.push(createPlayer(opt.playerId, opt.level))
      void persistInazumaMeta({ signed: [opt.playerId] })
      message = `${getPlayerBase(opt.playerId).name} firma por el Raimon.`
    } else if (opt.kind === 'objeto') {
      next.bag.push(opt.itemId)
      message = `${getItem(opt.itemId)?.name ?? 'Objeto'} a la mochila.`
    } else if (opt.kind === 'dinero') {
      next.coins += opt.amount
      message = `+${opt.amount.toLocaleString('es-ES')} ₽`
    } else if (opt.kind === 'descanso') {
      fullRest(next)
      message = 'Plantilla recuperada al completo.'
    }
    closeDraft(set, next, draft, draftPicks, optionId, message)
  },

  applyToPlayer: (uid) => {
    const { save, pendingTarget, draft, draftPicks } = get()
    if (!save || !pendingTarget) return
    const target = save.roster.find((p) => p.uid === uid)
    if (!target) return
    const next = { ...save, roster: save.roster.slice() }
    let message: string
    if (pendingTarget.kind === 'entrenamiento') {
      next.roster = next.roster.map((p) => (p.uid === uid ? levelUp(p, pendingTarget.levels) : p))
      message = `${getPlayerBase(target.baseId).name} sube ${pendingTarget.levels} niveles.`
    } else if (pendingTarget.kind === 'tecnica') {
      if (!canLearn(target, pendingTarget.techniqueId)) {
        set({ message: 'Esa técnica no es de su demarcación.' })
        return
      }
      const techs = target.techniques.slice()
      if (techs.length >= TECHNIQUE_SLOTS) techs.shift()
      techs.push(pendingTarget.techniqueId)
      next.roster = next.roster.map((p) => (p.uid === uid ? { ...p, techniques: techs } : p))
      message = `${getPlayerBase(target.baseId).name} aprende ${getTechnique(pendingTarget.techniqueId)?.name}.`
    } else {
      return
    }
    set({ pendingTarget: null })
    closeDraft(set, next, draft, draftPicks, pendingTarget.id, message)
  },

  cancelTarget: () => set({ pendingTarget: null }),

  /** Cambia de formación y recoloca el once para que cuadre con ella. */
  setFormation: (id) => {
    const { save } = get()
    if (!save) return
    const next = { ...save, formation: id, lineup: autoLineup(save.roster, id) }
    set({ save: next, message: `Formación ${getFormation(id).name}. Once recolocado.` })
    void persist(next, get().phase)
  },

  /**
   * Guarda el partido en el descanso y sale al mapa. Es la ÚNICA excepción a
   * «el partido no se persiste»: 90 minutos del tirón en un móvil es mucho, y
   * como se guarda el marcador tal cual está, no sirve para esquivar derrotas.
   */
  pauseAtHalftime: () => {
    const { match, matchNode, save } = get()
    if (!match || !matchNode || !save || !matchRng) return
    if (!match.halftimeDone || match.phase === 'finished') return
    stopTicker()
    const next: InazumaSave = {
      ...save,
      pausedMatch: { nodeId: matchNode.id, rngState: matchRng.getState(), match },
    }
    set({ save: next, match: null, matchNode: null, feed: [], playing: false, phase: 'map' })
    void persist(next, 'map')
  },

  /** Retoma el partido guardado en el descanso. */
  resumePausedMatch: () => {
    const { save } = get()
    if (!save?.pausedMatch) return
    const node = save.map.nodes[save.pausedMatch.nodeId]
    if (!node) { set({ message: 'El partido guardado ya no existe.' }); return }
    matchRng = new RNG(save.seed)
    matchRng.setState(save.pausedMatch.rngState)
    const match = save.pausedMatch.match
    const next = { ...save }
    delete next.pausedMatch
    stopTicker()
    set({
      save: next,
      match,
      matchNode: node,
      feed: match.events.slice(),
      phase: 'match',
      playing: match.phase === 'playing',
    })
    void persist(next, 'match')
    get().tick()
  },

  /** Enseña a un jugador una supertécnica guardada en la mochila. */
  teachTechnique: (techId, uid) => {
    const { save } = get()
    if (!save) return
    const i = save.techniqueBag.indexOf(techId)
    if (i < 0) return
    const target = save.roster.find((p) => p.uid === uid)
    if (!target) return
    if (!canLearn(target, techId)) {
      set({ message: 'Esa técnica no es de su demarcación.' })
      return
    }
    const bag = save.techniqueBag.slice()
    bag.splice(i, 1)
    const techs = target.techniques.slice()
    // Con los 4 huecos llenos se descarta la más antigua.
    if (techs.length >= TECHNIQUE_SLOTS) techs.shift()
    techs.push(techId)
    const next = {
      ...save,
      techniqueBag: bag,
      roster: save.roster.map((p) => (p.uid === uid ? { ...p, techniques: techs } : p)),
    }
    set({
      save: next,
      message: `${getPlayerBase(target.baseId).name} aprende ${getTechnique(techId)?.name}.`,
    })
    void persist(next, get().phase)
  },

  // ----------------------------------------------------------- plantilla ---
  setLineup: (uids) => {
    const { save } = get()
    if (!save) return
    const next = { ...save, lineup: uids }
    set({ save: next })
    void persist(next, get().phase)
  },

  toggleStarter: (uid) => {
    const { save } = get()
    if (!save) return
    const inXi = save.lineup.includes(uid)
    const player = save.roster.find((p) => p.uid === uid)
    if (!player) return
    if (inXi && player.captain) {
      set({ message: 'El capitán no sale del once.' })
      return
    }
    if (!inXi && save.lineup.length >= SQUAD_SIZE) {
      set({ message: 'El once ya está completo. Saca a alguien primero.' })
      return
    }
    const lineup = inXi ? save.lineup.filter((u) => u !== uid) : [...save.lineup, uid]
    const next = { ...save, lineup }
    set({ save: next })
    void persist(next, get().phase)
  },

  equip: (uid, itemId) => {
    const { save } = get()
    if (!save) return
    const bag = save.bag.slice()
    const target = save.roster.find((p) => p.uid === uid)
    if (!target) return
    // Devolver a la mochila lo que llevara puesto, y quitar de la mochila lo nuevo.
    if (target.item) bag.push(target.item)
    if (itemId) {
      const i = bag.indexOf(itemId)
      if (i < 0) { set({ message: 'Ese objeto ya no está en la mochila.' }); return }
      bag.splice(i, 1)
    }
    const next = {
      ...save,
      bag,
      roster: save.roster.map((p) => (p.uid === uid ? { ...p, item: itemId } : p)),
    }
    set({ save: next })
    void persist(next, get().phase)
  },

  useConsumable: (itemId, uid) => {
    const { save } = get()
    if (!save) return
    const i = save.bag.indexOf(itemId)
    if (i < 0) return
    const bag = save.bag.slice()
    bag.splice(i, 1)
    let roster = save.roster.slice()
    let message = ''
    switch (itemId) {
      case 'bebida-isotonica':
        roster = roster.map((p) => (p.uid === uid ? { ...p, pt: Math.min(ptMax(p), p.pt + 40) } : p))
        message = '+40 PT'
        break
      case 'bebida-doble':
        roster = roster.map((p) => (p.uid === uid ? { ...p, pt: ptMax(p) } : p))
        message = 'Depósito de PT lleno'
        break
      case 'masaje':
        roster = roster.map((p) => (p.uid === uid ? { ...p, stamina: Math.min(100, p.stamina + 50) } : p))
        message = '+50 de aguante'
        break
      case 'concentrado':
        roster = roster.map((p) => ({ ...p, pt: ptMax(p), stamina: Math.min(100, p.stamina + 60) }))
        message = 'Toda la plantilla recuperada'
        break
      case 'plan-entrenamiento':
        roster = roster.map((p) => (p.uid === uid ? levelUp(p, 2) : p))
        message = '+2 niveles'
        break
      case 'mejora': {
        const target = roster.find((p) => p.uid === uid)
        const up = target?.techniques.find((t) => canUpgradeTechnique(target, t))
        if (!target || !up) {
          set({ message: 'Ese jugador no tiene ninguna técnica que se pueda mejorar más.' })
          return
        }
        roster = roster.map((p) => (p.uid === uid ? upgradeTechnique(p, up) : p))
        const t = getTechnique(up)
        message = `${t?.name} mejorada (+25 % de potencia)`
        break
      }
      case 'manual-avanzado': {
        const target = roster.find((p) => p.uid === uid)
        const evolvable = target?.techniques.map((t) => getTechnique(t)).find((t) => t?.evolvesTo)
        if (!target || !evolvable?.evolvesTo) {
          set({ message: 'Ese jugador no tiene ninguna técnica que pueda evolucionar.' })
          return
        }
        const to = evolvable.evolvesTo
        roster = roster.map((p) => (p.uid === uid
          ? { ...p, techniques: p.techniques.map((t) => (t === evolvable.id ? to : t)) }
          : p))
        message = `${evolvable.name} → ${getTechnique(to)?.name}`
        break
      }
      default:
        return
    }
    const next = { ...save, bag, roster }
    set({ save: next, message })
    void persist(next, get().phase)
  },

  release: (uid) => {
    const { save } = get()
    if (!save) return
    const p = save.roster.find((x) => x.uid === uid)
    if (!p) return
    if (p.captain) { set({ message: 'El capitán no se traspasa.' }); return }
    // Con 11 justos, traspasar deja el once incompleto y la partida muerta:
    // no habría forma de alinear y todo partido daría error.
    if (save.roster.length <= SQUAD_SIZE) {
      set({ message: `No puedes bajar de ${SQUAD_SIZE} jugadores: te quedarías sin once.` })
      return
    }
    const roster = save.roster.filter((x) => x.uid !== uid)
    const lineup = save.lineup.filter((u) => u !== uid)
    const next = { ...save, roster, lineup: lineup.length ? lineup : autoLineup(roster, save.formation) }
    set({ save: next, message: `${getPlayerBase(p.baseId).name} deja el equipo.` })
    void persist(next, get().phase)
  },

  buy: (itemId) => {
    const { save } = get()
    if (!save) return
    const item = getItem(itemId)
    if (!item) return
    if (save.coins < item.price) { set({ message: 'No te llega el presupuesto.' }); return }
    const next = { ...save, coins: save.coins - item.price, bag: [...save.bag, itemId] }
    set({ save: next, message: `${item.name} comprado.` })
    void persist(next, get().phase)
  },
}))

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Descuenta una carta de la tanda: si quedan más, se vuelve a barajar (sin la
 * que acabas de coger); si no, de vuelta al mapa.
 */
function closeDraft(
  set: (partial: Partial<InazumaState>) => void,
  save: InazumaSave,
  draft: DraftOption[],
  picks: number,
  takenId: string,
  message: string | null,
): void {
  const left = picks - 1
  if (left > 0) {
    set({ save, draft: draft.filter((o) => o.id !== takenId), draftPicks: left, message })
    void persist(save, 'draft')
    return
  }
  set({ save, draft: [], draftPicks: 0, phase: 'map', message })
  void persist(save, 'map')
}

/** Dónde estás del mapa, para la cabecera. */
export function currentPlaceName(save: InazumaSave | null): string {
  return save ? layerName(save.layer) : ''
}

/** Marcador del partido en curso, tal y como lo ve el usuario. */
export function currentScore(match: MatchState | null): [number, number] {
  return match ? playerScore(match) : [0, 0]
}
