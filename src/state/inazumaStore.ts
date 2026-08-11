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
import { getItem } from '@/data/inazuma/items'
import { getPlayerBase } from '@/data/inazuma/players'
import { getTechnique } from '@/data/inazuma/techniques'
import {
  applyMatchResult, autoTraining, canLearn, createSave, fullRest, isEliminated, startMatch,
} from '@/engine/inazuma/game'
import { advance, chooseOption, playerScore } from '@/engine/inazuma/match'
import { buildDraft, buildScoutOffer } from '@/engine/inazuma/rewards'
import { autoLineup, createPlayer, levelUp, lineupError, ptMax } from '@/engine/inazuma/roster'
import { buildOffer, TOTAL_ROUNDS, isMatchRound } from '@/engine/inazuma/tournament'
import {
  ROSTER_MAX, TECHNIQUE_SLOTS,
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
const SAFE_PHASES: InazumaPhase[] = ['map', 'squad', 'shop', 'draft', 'victory', 'gameover', 'title']

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
    await saveMeta(meta)
    if (currentUser()) await saveCloudMeta(meta).catch(() => {})
  })
  return metaQueue
}

interface InazumaState {
  phase: InazumaPhase
  save: InazumaSave | null
  hasSave: boolean
  /** Partido en curso (en memoria; nunca se guarda). */
  match: MatchState | null
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

  // recompensas
  pickDraft: (optionId: string) => void
  applyToPlayer: (uid: string) => void
  cancelTarget: () => void

  // plantilla
  setLineup: (uids: string[]) => void
  toggleStarter: (uid: string) => void
  equip: (uid: string, itemId: string | undefined) => void
  useConsumable: (itemId: string, uid: string) => void
  release: (uid: string) => void
  buy: (itemId: string) => void
}

export const useInazuma = create<InazumaState>((set, get) => ({
  phase: 'title',
  save: null,
  hasSave: false,
  match: null,
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
      save, hasSave: !!save, phase: 'title', match: null, matchNode: null,
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
    set({ save, hasSave: true, phase: 'map', match: null, feed: [], draft: [], message: null })
  },

  continueTournament: () => {
    const { save } = get()
    if (!save) return
    set({ phase: save.round >= TOTAL_ROUNDS ? 'victory' : 'map' })
  },

  abandonTournament: async () => {
    stopTicker()
    await clearInazuma()
    rng = null
    set({ save: null, hasSave: false, phase: 'title', match: null, feed: [] })
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
    const node = save.offer.find((n) => n.id === nodeId)
    if (!node) return

    // Los nodos de partido pasan por la previa (ver rival y once); el resto se
    // resuelve al momento.
    if (node.kind === 'partido' || node.kind === 'final' || node.kind === 'amistoso') {
      set({ matchNode: node, phase: 'preview' })
      return
    }
    if (node.kind === 'tienda') {
      set({ matchNode: node, phase: 'shop' })
      return
    }

    const next = { ...save, roster: save.roster.slice() }
    let message: string
    if (node.kind === 'descanso') {
      fullRest(next)
      message = 'Toda la plantilla vuelve a estar fresca: aguante y PT al máximo.'
    } else if (node.kind === 'entrenamiento') {
      const names = autoTraining(next, 3, 2)
      message = names.length
        ? `Sesión dura. ${names.join(' y ')} suben 3 niveles.`
        : 'Sesión dura, pero no había a quién entrenar.'
    } else {
      // Ojeador: tres fichas, eliges una.
      const offer = buildScoutOffer(next, getRng(next))
      advanceRound(next, getRng(next))
      set({ save: next, draft: offer, draftPicks: 1, phase: 'draft' })
      void persist(next, 'draft')
      return
    }
    advanceRound(next, getRng(next))
    set({ save: next, phase: 'map', message })
    void persist(next, 'map')
  },

  confirmMatch: () => {
    const { save, matchNode } = get()
    if (!save || !matchNode) return
    const err = lineupError(save.roster, save.lineup)
    if (err) { set({ message: err }); return }
    const setup = startMatch(save, matchNode)
    if ('error' in setup) { set({ message: setup.error }); return }
    matchRng = setup.rng
    stopTicker()
    set({ match: setup.match, feed: setup.match.events.slice(), phase: 'match', playing: true })
    get().tick()
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
    const next: InazumaSave = { ...save, roster: save.roster.slice(), record: [...save.record] as [number, number, number] }
    applyMatchResult(next, match, matchNode)
    const result = match.result ?? 'draw'

    if (isEliminated(matchNode, result)) {
      next.finishedAt = Date.now()
      void persistInazumaMeta({ round: next.round })
      set({ save: next, phase: 'gameover', match: null, matchNode: null })
      void persist(next, 'gameover')
      play('defeat')
      return
    }

    // Cartas de recompensa: 2 si saliste «a por todas», 1 en el resto.
    const picks = matchNode.id.endsWith('-todas') ? 2 : 1
    advanceRound(next, getRng(next))
    const won = next.round >= TOTAL_ROUNDS
    if (won) {
      next.finishedAt = Date.now()
      void persistInazumaMeta({ title: true, round: next.round })
      set({ save: next, phase: 'victory', match: null, matchNode: null })
      void persist(next, 'victory')
      play('victory')
      return
    }
    void persistInazumaMeta({ round: next.round })
    set({
      save: next,
      draft: buildDraft(next, getRng(next)),
      draftPicks: matchNode.kind === 'amistoso' ? 0 : picks,
      phase: matchNode.kind === 'amistoso' ? 'map' : 'draft',
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
    if (!inXi && save.lineup.length >= 11) {
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
    const roster = save.roster.filter((x) => x.uid !== uid)
    const lineup = save.lineup.filter((u) => u !== uid)
    const next = { ...save, roster, lineup: lineup.length ? lineup : autoLineup(roster) }
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

/** Cierra la ronda actual y genera la oferta de la siguiente. */
function advanceRound(save: InazumaSave, r: RNG): void {
  const current = save.offer.map((n) => n.id)
  save.cleared = [...save.cleared, ...current]
  save.round += 1
  save.offer = buildOffer(save.round, r)
  save.rngState = r.getState()
}

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

/** ¿La ronda actual es de partido? Lo usa la cabecera del mapa. */
export function currentRoundIsMatch(save: InazumaSave | null): boolean {
  return !!save && isMatchRound(save.round)
}

/** Marcador del partido en curso, tal y como lo ve el usuario. */
export function currentScore(match: MatchState | null): [number, number] {
  return match ? playerScore(match) : [0, 0]
}
