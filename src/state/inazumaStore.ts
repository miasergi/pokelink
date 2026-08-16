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
import { useSettings } from '@/state/settingsStore'
import { useGame } from '@/state/gameStore'
import { clearInazuma, loadInazuma, loadMeta, saveInazuma, saveMeta } from '@/persistence/db'
import { currentUser, saveCloudMeta } from '@/persistence/supabase'
import { checkInazumaAchievements } from '@/engine/inazuma/achievements'
import { getItem, lootPool } from '@/data/inazuma/items'
import { getEvent } from '@/data/inazuma/events'
import { getPlayerBase, playersOfTeam } from '@/data/inazuma/players'
import { getTechnique } from '@/data/inazuma/techniques'
import {
  advanceLayer, applyConsumable, applyConsumableToActor, applyEventEffect, applyMatchResult, matchMedals,
  applyPachangaResult, canLearn, createSave, fullRest, isEliminated, isMapComplete, learnSignature,
  type NewRunOptions,
  LEVELS_BY_RESULT, startMatch, startPachanga, subActor,
} from '@/engine/inazuma/game'
import { advance, chooseOption, playerScore, playerSide, reformation, rivalHalftimeSubs, sideOf, substitute, swapOnPitch } from '@/engine/inazuma/match'
import { nextRound, shoot, type PachangaState } from '@/engine/inazuma/pachanga'
import { availableSignings, buildScoutOffer, signingLevel } from '@/engine/inazuma/rewards'
import {
  autoLineup, canUpgradeTechnique, createPlayer, effectiveStats, levelUp, lineupError, ptMax,
  MAX_RARITY, RARITY_LABEL, rarityOf, rivalRarityMap, transferValue, upgradeTechnique,
} from '@/engine/inazuma/roster'
import { availableNextNodes, bossIndexForLayer, layerName } from '@/engine/inazuma/tournament'
import { getFormation } from '@/data/inazuma/formations'
import {
  ROSTER_MAX, SQUAD_SIZE, TECHNIQUE_SLOTS,
  type DecisionOption, type DraftOption, type InazumaPhase, type InazumaSave, type MatchEvent,
  type MatchPhase, type MatchState, type TournamentNode,
} from '@/engine/inazuma/types'

/** Barra animada del efecto de un objeto (de `from` a `to`). */
export interface ItemFxBar { label: string; from: number; to: number; max: number; color: string }

/**
 * Lo que un objeto acaba de hacer, para que la pantalla lo ENSEÑE: barras que
 * se curan, atributos que suben, niveles que saltan. Sin esto los objetos
 * funcionaban en silencio y parecía que no hacían nada.
 */
export interface ItemFx {
  key: number
  title: string
  /** id del objeto para su imagen; 'rairai' usa el icono del restaurante. */
  itemId?: string
  targetName: string
  targetBaseId?: string
  bars: ItemFxBar[]
  stats?: { label: string; from: number; to: number }[]
  level?: { from: number; to: number }
  /** Subida de rareza: el marco del retrato anima del color viejo al nuevo. */
  rarity?: { from: number; to: number }
}

const STAT_TAG: Record<string, string> = {
  tiro: 'TIR', control: 'CTR', fisico: 'FIS', defensa: 'DEF', velocidad: 'VEL', aguante: 'AGU',
}

/**
 * COLA de pantallas de subida de rareza: la pachanga puede subir a tres a la
 * vez y cada uno merece su pantalla — al cerrar una entra la siguiente.
 */
let itemFxQueue: ItemFx[] = []

/** Objetos que actúan sobre TODA la plantilla (para el rótulo y las medias). */
const TEAM_ITEMS = new Set(['gyoza', 'banquete', 'concentrado'])

/** Instantánea completa del equipo, para el historial al terminar el rogue. */
function teamSnapshot(save: InazumaSave, result: 'campeon' | 'eliminado') {
  return {
    finishedAt: Date.now(),
    teamId: save.teamId ?? 'raimon',
    result,
    round: bossIndexForLayer(save.layer),
    record: [...save.record] as [number, number, number],
    goalsFor: save.goalsFor,
    goalsAgainst: save.goalsAgainst,
    coins: save.coins,
    roster: save.roster.map((p) => ({
      baseId: p.baseId,
      level: p.level,
      techniques: p.techniques.slice(),
      item: p.item,
      captain: p.captain,
    })),
    lineup: save.lineup.slice(),
    formation: save.formation,
  }
}

/**
 * Cola de REVELADO de la retransmisión. El motor resuelve tiro+parada+gol en
 * el mismo latido; si se volcara todo de golpe al feed, el gol pasaría tan
 * deprisa como un pase. Los eventos esperan aquí y salen DE UNO EN UNO, cada
 * uno con su tiempo en pantalla — y el motor NO avanza (ni aparece el panel de
 * decisión) hasta que la cola está vacía.
 */
let revealQueue: MatchEvent[] = []

/**
 * Cuánto se queda cada evento en pantalla antes del siguiente (ms, a ×1).
 * Los duelos con técnica y TODOS los tiros abren el escenario de duelo, que
 * dura ~2.6 s: su hold tiene que cubrirlo entero o el siguiente evento se
 * pisaría con la animación (el «se superponen cosas» del playtest).
 */
function holdFor(e: MatchEvent): number {
  switch (e.kind) {
    case 'goal': return 2500        // la celebración entera (1.9s) + aire
    case 'penalty': return 4200     // escenario (2.3s) + celebración retardada
    case 'save': return 1200        // la línea respira tras el escenario del tiro
    case 'duel':
      // El tiro que ACABA en gol corta antes: el escenario no pone sello (eso
      // sería el spoiler) y la celebración del evento de gol toma el relevo.
      if (e.step === 'definicion' && e.success) return 2600
      if (e.step === 'definicion' || e.technique || e.counter) return 3700
      return 500
    case 'burst':
    case 'stage': return 1100
    case 'kickoff':
    case 'halftime':
    case 'fulltime': return 900
    default: return 420
  }
}

/** Sonido de cada evento, disparado AL REVELARSE (nunca antes de verse). */
function soundFor(e: MatchEvent): void {
  switch (e.kind) {
    case 'goal': play('gol'); break
    case 'penalty': play(e.scored ? 'gol' : 'parada'); break
    case 'save': play('parada'); break
    case 'duel':
      if (e.step === 'definicion') play('kick')
      else if (e.technique || e.counter) play('supertecnica')
      else play('hit')
      break
    case 'burst': play('supertecnica'); break
    case 'kickoff':
    case 'halftime':
    case 'fulltime':
    case 'stage': play('whistle'); break
    default: break
  }
}

/** RNG viva de la partida (se rehidrata del save y se vuelca al persistir). */
let rng: RNG | null = null
function getRng(save: InazumaSave): RNG {
  if (!rng) {
    rng = new RNG(save.seed)
    rng.setState(save.rngState)
  }
  return rng
}

/** Cambios hechos en el descanso, para anunciarlos al reanudar. */
let halftimeSubNotes: { inName: string; outName: string }[] = []

/** Fase de ENTRADA pedida desde fuera (el menú principal): p. ej. 'album'. */
let pendingEntry: InazumaPhase | null = null
export function setInazumaEntry(phase: InazumaPhase): void {
  pendingEntry = phase
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
  // Guardar es «lo mejor que se pueda»: si no hay IndexedDB (modo privado de
  // algunos navegadores, tests) la partida sigue en memoria y no se tumba la
  // pantalla por ello.
  await saveInazuma(save).catch(() => {})
}

/** Meta-progresión del modo. Es read-modify-write, así que va en cola. */
let metaQueue: Promise<void> = Promise.resolve()
export function persistInazumaMeta(extra: {
  title?: boolean
  round?: number
  signed?: string[]
  /** Equipo completo al terminar el torneo (se guardan los últimos 20). */
  team?: NonNullable<Awaited<ReturnType<typeof loadMeta>>['inazumaTeams']>[number]
}): Promise<void> {
  metaQueue = metaQueue.then(async () => {
    const meta = await loadMeta()
    if (extra.title) meta.inazumaTitles = (meta.inazumaTitles ?? 0) + 1
    if (extra.round != null) meta.inazumaBestRound = Math.max(meta.inazumaBestRound ?? 0, extra.round)
    if (extra.signed?.length) {
      meta.inazumaSigned = [...new Set([...(meta.inazumaSigned ?? []), ...extra.signed])]
    }
    if (extra.team) {
      meta.inazumaTeams = [...(meta.inazumaTeams ?? []), extra.team].slice(-20)
    }
    const ach = checkInazumaAchievements(meta)
    if (ach.length) meta.achievements = [...new Set([...meta.achievements, ...ach])]
    await saveMeta(meta)
    if (currentUser()) await saveCloudMeta(meta).catch(() => {})
    // Mismo patrón que el resto de modos: el aviso se pinta en Inicio.
    if (ach.length) useGame.setState((g) => ({ newAchievements: [...g.newAchievements, ...ach] }))
  // Si no hay almacenamiento, la meta-progresión se pierde pero la partida
  // sigue: nunca debe romper la cola ni dejar un rechazo suelto.
  }).catch(() => {})
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
  /** true si el draft viene de un PARTIDO: solo entonces se enseña su resultado. */
  draftFromMatch: boolean
  /** Carta que necesita que señales a un jugador. */
  pendingTarget: DraftOption | null
  /**
   * Fichaje ENTRANTE con la plantilla llena (16): hay que decidir — vender a
   * uno del equipo para hacerle hueco, o vender directamente al que llega
   * (dinero + medallas según su rareza en ambos casos).
   */
  pendingSigning: { baseId: string; level: number; rarity: number; title: string } | null
  /** Vende al RECIÉN LLEGADO sin ficharlo (resuelve `pendingSigning`). */
  resolveSigningSell: () => void
  /** Vende a `uid` de la plantilla y ficha al que llegaba. */
  resolveSigningSwap: (uid: string) => void
  /**
   * true mientras hay una cinemática (duelo, gol) en pantalla: la cola de
   * revelado NO avanza — revelar por debajo cambiaba el césped a mitad de
   * animación y encadenaba cinemáticas.
   */
  uiBusy: boolean
  setUiBusy: (v: boolean) => void
  message: string | null

  initInazuma: () => Promise<void>
  exitInazuma: () => void
  newTournament: (teamId?: string, opts?: NewRunOptions) => Promise<void>
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

  /** SIMULA lo que queda del partido y salta al resultado. */
  simulateMatch: () => void
  /** SIMULA lo que queda de la pachanga y salta al resultado. */
  simulatePachanga: () => void

  // pachanga
  pachangaShoot: (optionId: string) => void
  /** Modo AUTO: el banquillo elige la mejor opción pagable y tira/para él. */
  pachangaAutoShoot: () => void
  finishPachanga: () => void

  // recompensas
  pickDraft: (optionId: string) => void
  applyToPlayer: (uid: string) => void
  cancelTarget: () => void
  resolveEvent: (optionIndex: number) => void
  itemFx: ItemFx | null
  clearItemFx: () => void
  /** true mientras el panel del DESCANSO está abierto (el partido espera). */
  halftimeBreak: boolean
  /** Reanuda la segunda parte tras el panel del descanso. */
  resumeSecondHalf: () => void
  /** Consumible sobre un jugador DEL PARTIDO, en el descanso. */
  halftimeUseItem: (itemId: string, actorUid: string) => void
  /** Cambio en el descanso: sale `outUid` del campo, entra `benchUid`. */
  halftimeSubstitute: (outUid: string, benchUid: string) => void
  /** Cambia la FORMACIÓN en el descanso: recoloca a los mismos once. */
  halftimeFormation: (formationId: string) => void
  /** Intercambia dos jugadores del campo en el descanso (drag&drop). */
  halftimeSwap: (aUid: string, bUid: string) => void
  /** Carta de un jugador para ENSEÑAR (p. ej. el que llega en un intercambio). */
  revealPlayer: { uid: string; title: string } | null
  clearRevealPlayer: () => void
  /** Casilla de firma: el jugador elegido despierta su siguiente técnica. */
  resolveFirma: (uid: string) => void
  /** Firma con la cadena COMPLETA: mejora una técnica ya despertada (+25 %). */
  resolveFirmaUpgrade: (uid: string, techId?: string) => void
  /** Consume la casilla actual sin hacer nada (pasar de largo). */
  skipNode: () => void
  /** Casilla de intercambio: cambia al elegido por otro al azar (+3 niveles). */
  resolveTrade: (uid: string) => void

  // plantilla
  setLineup: (uids: string[]) => void
  swapPlayers: (a: string, b: string) => void
  /** Coloca a un jugador en un hueco concreto del once (alineación libre). */
  placeAt: (uid: string, slot: number) => void
  toggleStarter: (uid: string) => void
  equip: (uid: string, itemId: string | undefined) => void
  useConsumable: (itemId: string, uid: string, choiceId?: string) => void
  /** Fichaje estrella: gasta el objeto y ficha al jugador EXACTO elegido. */
  useFichajeEstrella: (baseId: string) => void
  /** Convierte técnicas sueltas de partidas viejas en Manuales avanzados. */
  convertLegacyTechniques: () => void
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
  draftFromMatch: false,
  pendingTarget: null,
  pendingSigning: null,
  uiBusy: false,
  message: null,
  itemFx: null,
  halftimeBreak: false,
  revealPlayer: null,

  setUiBusy: (v) => {
    if (get().uiBusy === v) return
    set({ uiBusy: v })
    // Al liberarse la pantalla, la retransmisión retoma el latido en el acto.
    if (!v && get().match) { stopTicker(); ticker = setTimeout(() => get().tick(), 120) }
  },

  initInazuma: async () => {
    stopTicker()
    revealQueue = []
    const save = await loadInazuma()
    rng = null
    matchRng = null
    if (save) getRng(save)
    // Entrada directa desde el menú principal (Álbum, etc.): se consume aquí.
    const entry = pendingEntry
    pendingEntry = null
    set({
      save, hasSave: !!save, phase: entry ?? 'title', match: null, pachanga: null, matchNode: null,
      feed: [], playing: false, draft: [], draftPicks: 0, pendingTarget: null, message: null,
    })
  },

  exitInazuma: () => {
    stopTicker()
    const { save, phase } = get()
    if (save) void persist(save, phase)
    useGame.getState().navigate('home')
  },

  newTournament: async (teamId = 'raimon', opts = {}) => {
    stopTicker()
    const seed = Math.floor(Math.random() * 0xffffffff)
    const save = createSave(seed, teamId, opts)
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

    // La PACHANGA arranca directa: entrar en la casilla es jugarla (si el
    // once no es válido, se cae a la previa para arreglarlo).
    if (node.kind === 'pachanga' && !lineupError(save.roster, save.lineup, save.formation)) {
      set({ matchNode: node })
      get().confirmMatch()
      return
    }
    // Jefes pasan por la previa (ver rival y once); el resto se
    // resuelve al momento, como las casillas del mapa del modo Pokémon.
    if (node.kind === 'jefe' || node.kind === 'final' || node.kind === 'pachanga') {
      set({ matchNode: node, phase: 'preview' })
      return
    }
    if (node.kind === 'tienda' || node.kind === 'rairai') {
      // El Rai Rai cura al entrar (es el centro Pokémon del modo) y ADEMÁS
      // te deja comprar comida para llevar.
      const next = { ...save, roster: save.roster.slice(), cleared: save.cleared.slice() }
      let fx: ItemFx | null = null
      if (node.kind === 'rairai') {
        // La cura de ENTRAR (gratis, como un centro Pokémon) se enseña con las
        // barras curándose: antes pasaba en silencio y parecía que había que
        // comprar comida para recuperarse.
        const n = Math.max(1, save.roster.length)
        const beforePt = save.roster.reduce((a, p) => a + p.pt, 0) / n
        const beforeAgu = save.roster.reduce((a, p) => a + p.stamina, 0) / n
        fullRest(next)
        const maxPt = next.roster.reduce((a, p) => a + ptMax(p), 0) / n
        fx = {
          key: Date.now(),
          title: 'Restaurante Rai Rai',
          itemId: 'rairai',
          targetName: 'Toda la plantilla, invitada a ramen',
          bars: [
            { label: 'PT', from: beforePt, to: maxPt, max: maxPt, color: '#38bdf8' },
            { label: 'AGU', from: beforeAgu, to: 100, max: 100, color: '#22c55e' },
          ],
        }
        play('heal')
      }
      advanceLayer(next, node)
      set({ save: next, matchNode: node, phase: 'shop', itemFx: fx ?? get().itemFx })
      void persist(next, 'shop')
      return
    }

    const next = { ...save, roster: save.roster.slice(), bag: save.bag.slice(), cleared: save.cleared.slice() }
    let message: string | null = null

    switch (node.kind) {

      case 'objeto': {
        // Se elige UN objeto de TRES. SOLO objetos: las supertécnicas tienen
        // su propia casilla. El mapa trae dos; el tercero sale del botín de la
        // ronda (los mapas viejos solo guardaban dos ids).
        const options: DraftOption[] = []
        for (const id of [node.itemId, node.itemId2]) {
          const item = id ? getItem(id) : undefined
          if (item) options.push({ kind: 'objeto', id: `node-item-${item.id}`, title: item.name, desc: item.desc, itemId: item.id })
        }
        const extraPool = lootPool(bossIndexForLayer(next.layer))
          .filter((i) => i.id !== node.itemId && i.id !== node.itemId2)
        const extra = extraPool[getRng(next).int(0, extraPool.length - 1)]
        if (extra) options.push({ kind: 'objeto', id: `node-item-${extra.id}`, title: extra.name, desc: extra.desc, itemId: extra.id })
        if (options.length) {
          advanceLayer(next, node)
          set({ save: next, matchNode: null, draft: options, draftPicks: 1, draftFromMatch: false, phase: 'draft' })
          void persist(next, 'draft')
          return
        }
        break
      }
      case 'tecnica':
        // LEGADO (mapas viejos): las técnicas sueltas ya no existen — solo se
        // aprende por CADENA. La casilla vieja paga con un Manual avanzado,
        // que es cadena embotellada.
        next.bag = [...next.bag, 'manual-avanzado']
        message = 'Manual avanzado a la mochila (avanza la cadena de un jugador).'
        break
      case 'evento':
        // La situación se resuelve en su propia pantalla: hay que elegir.
        set({ save: next, matchNode: node, phase: 'evento' })
        return
      case 'firma':
        // Elegir QUIÉN despierta su técnica es la gracia de la casilla.
        set({ save: next, matchNode: node, phase: 'firma' })
        return
      case 'trade':
        set({ save: next, matchNode: node, phase: 'trade' })
        return
      case 'concentracion': {
        // Tres cartas de BUILDEO puro, a elegir una: subir una rareza, meter
        // niveles o mejorar una técnica. Va a la mochila y se aplica cuando
        // quieras — la concentración es preparar el partido gordo.
        advanceLayer(next, node)
        set({
          save: next,
          matchNode: null,
          draft: [
            { kind: 'objeto', id: 'conc-medalla', title: 'Medalla de talento', desc: 'Sube UNA rareza a un jugador (a la mochila).', itemId: 'medalla-rareza' },
            { kind: 'objeto', id: 'conc-plan', title: 'Plan intensivo', desc: 'Sube 4 niveles a un jugador (a la mochila).', itemId: 'plan-intensivo' },
            { kind: 'objeto', id: 'conc-mejora', title: 'Mejora', desc: '+25 % de potencia a una técnica ya despertada (a la mochila).', itemId: 'mejora' },
          ],
          draftPicks: 1,
          draftFromMatch: false,
          phase: 'draft',
        })
        void persist(next, 'draft')
        return
      }
      case 'ojeador': {
        const offer = buildScoutOffer(next, getRng(next))
        // Memoria del ojeador: lo OFRECIDO no vuelve a salir en un buen rato
        // (lo cojas o no) — sin esto «siempre salen los mismos».
        const offered = offer.filter((o) => o.kind === 'fichaje').map((o) => (o as { playerId: string }).playerId)
        next.scoutSeen = [...(next.scoutSeen ?? []), ...offered].slice(-20)
        advanceLayer(next, node)
        set({ save: next, draft: offer, draftPicks: 1, draftFromMatch: false, phase: 'draft' })
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
      // Simulación instantánea (ajustes): directo al resultado.
      if (useSettings.getState().inazumaSimPachanga) get().simulatePachanga()
      return
    }

    // El modo de decisión sale de los ajustes; en «auto» el banquillo decide y
    // en «completo» el motor te pregunta TODAS las acciones.
    const mode = useSettings.getState().inazumaModeMatch
    const setup = startMatch(save, matchNode, mode)
    if ('error' in setup) { set({ message: setup.error }); return }
    matchRng = setup.rng
    revealQueue = []
    set({
      match: setup.match,
      feed: setup.match.events.slice(),
      phase: 'match',
      playing: true,
      autoPlay: mode === 'auto' ? true : get().autoPlay,
    })
    if (useSettings.getState().inazumaSimMatch) { get().simulateMatch(); return }
    get().tick()
  },

  simulateMatch: () => {
    const { match } = get()
    if (!match || !matchRng || match.phase === 'finished') return
    stopTicker()
    // El banquillo juega lo que queda con su criterio de siempre.
    let guard = 0
    while ((match.phase as MatchPhase) !== 'finished' && guard++ < 5000) {
      if (match.phase === 'decision' && match.decision) {
        const best = match.decision.options
          .filter((o) => !o.disabled)
          .sort((a, b) => b.chance - a.chance || a.cost - b.cost)[0]
        if (!best) break
        chooseOption(match, matchRng, best.id)
      } else {
        advance(match, matchRng)
      }
    }
    revealQueue = []
    set({ match: { ...match }, feed: match.events.slice(), playing: false })
  },

  simulatePachanga: () => {
    const { pachanga } = get()
    if (!pachanga || !matchRng || pachanga.phase === 'finished') return
    let guard = 0
    while ((pachanga.phase as PachangaState['phase']) !== 'finished' && guard++ < 100) {
      if (pachanga.phase === 'decision') get().pachangaAutoShoot()
      else nextRound(pachanga, matchRng)
    }
    set({ pachanga: { ...pachanga } })
  },

  // ---------------------------------------------------------- pachanga ----
  pachangaShoot: (optionId) => {
    const { pachanga } = get()
    if (!pachanga || !matchRng || pachanga.phase !== 'decision') return
    shoot(pachanga, matchRng, optionId)
    // Sonido NEUTRO: el desenlace suena cuando la vista lo revela. Sonar el
    // «crit» aquí destripaba el gol antes de ver el duelo.
    play('kick')
    // `nextRound` ya no hace nada si la tanda está decidida, así que se llama
    // sin condición: comprobar `phase` aquí no compila (TypeScript la da por
    // estrechada a 'decision' y no sabe que `shoot` la ha mutado).
    nextRound(pachanga, matchRng)
    set({ pachanga: { ...pachanga } })
  },

  pachangaAutoShoot: () => {
    const { pachanga } = get()
    if (!pachanga || pachanga.phase !== 'decision') return
    // La misma vara de medir que el banquillo del partido: la opción con más
    // probabilidad, con un pelín de tacañería para no fundir el PT en tiros
    // que la opción gratis ya gana casi igual.
    const usable = pachanga.options.filter((o) => !o.disabled)
    if (!usable.length) return
    const score = (o: DecisionOption) => o.chance - o.cost * 0.003
    const best = usable.reduce((a, b) => (score(b) > score(a) ? b : a))
    get().pachangaShoot(best.id)
  },

  finishPachanga: () => {
    const { pachanga, matchNode, save } = get()
    if (!pachanga || !matchNode || !save || pachanga.phase !== 'finished') return
    const next: InazumaSave = { ...save, roster: save.roster.slice(), cleared: save.cleared.slice() }
    const { rarityUps } = applyPachangaResult(next, pachanga, matchNode)
    // Cada subida de rareza, SU pantalla (encoladas): que se vea quién y qué gana.
    const upFx: ItemFx[] = rarityUps.map((u) => ({
      key: Date.now() + Math.random(),
      title: `¡Rareza ${RARITY_LABEL[u.rarity]}!`,
      itemId: 'medalla-rareza',
      targetName: u.name,
      targetBaseId: u.baseId,
      bars: [],
      stats: (Object.keys(u.statsBefore) as (keyof typeof u.statsBefore)[])
        .filter((k) => u.statsAfter[k] !== u.statsBefore[k])
        .map((k) => ({ label: STAT_TAG[String(k)] ?? String(k), from: u.statsBefore[k], to: u.statsAfter[k] })),
      rarity: { from: u.rarity - 1, to: u.rarity },
    }))
    const firstFx = upFx.shift() ?? null
    itemFxQueue = upFx
    if (firstFx) play('levelup')
    advanceLayer(next, matchNode)
    play(pachanga.result === 'win' ? 'victory' : 'defeat')
    set({
      save: next,
      pachanga: null,
      matchNode: null,
      phase: 'map',
      itemFx: firstFx,
      message: pachanga.result === 'win'
        ? `Pachanga ganada ${pachanga.goals[0]}-${pachanga.goals[1]}. Los que jugaron suben de nivel.`
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

    // CINEMÁTICA EN PANTALLA: el latido espera. Revelar por debajo movía el
    // césped a mitad de animación (los emparejamientos «bailaban») y dejaba
    // cinemáticas en cola una detrás de otra. `setUiBusy(false)` retoma.
    if (get().uiBusy) { ticker = setTimeout(() => get().tick(), 180); return }

    // 1) Si hay eventos esperando, se revela UNO y se le da su tiempo en
    //    pantalla. Mientras la cola no esté vacía el motor no avanza, así que
    //    el partido se PARA de verdad en el tiro, la parada y el gol — y el
    //    panel de decisión nunca aparece con jugadas a medio contar.
    if (revealQueue.length) {
      const e = revealQueue.shift()!
      soundFor(e)
      // El DESCANSO abre su panel (consumibles y cambios) y el partido espera.
      if (e.kind === 'halftime') {
        set({ match: { ...match }, feed: [...get().feed, e], playing: false, halftimeBreak: true })
        return
      }
      // El multiplicador de velocidad acelera el trámite, pero los momentos
      // gordos conservan un mínimo: a ×4 el gol y la parada SIGUEN viéndose.
      const factor = speed >= 1000 ? 1 : speed >= 400 ? 0.6 : 0.42
      const important = e.kind === 'goal' || e.kind === 'save' || e.kind === 'penalty'
      const hold = Math.max(Math.round(holdFor(e) * factor), important ? 1100 : 320)
      set({ match: { ...match }, feed: [...get().feed, e] })
      ticker = setTimeout(() => get().tick(), hold)
      return
    }

    // 2) Cola vacía: ahora sí, las condiciones de parada. Todas AQUÍ, al
    //    principio, y nunca después de `advance` (que muta el partido).
    const phase: MatchPhase = match.phase
    if (phase === 'finished') { set({ playing: false }); return }
    if (phase === 'decision') {
      if (!autoPlay) { set({ playing: false, match: { ...match } }); return }
      // Auto: por la probabilidad REAL de cada opción, no por estrellas — las
      // estrellas son un redondeo a tres tramos y empataban casi siempre, con
      // lo que el desempate «más barata» hacía jugar A PELO al banquillo
      // mientras el rival sí armaba técnicas. Mismo criterio que el bot con
      // el que se mide el balance.
      const best = (match.decision?.options ?? [])
        .filter((o) => !o.disabled)
        .slice()
        .sort((a, b) => b.chance - a.chance || a.cost - b.cost)[0]
      if (best) get().decide(best.id)
      return
    }
    if (!playing) return

    const events = advance(match, matchRng)
    revealQueue.push(...events)
    set({ match: { ...match } })
    ticker = setTimeout(() => get().tick(), events.length ? 40 : 120)
  },

  decide: (optionId) => {
    const { match, autoPlay } = get()
    if (!match || !matchRng || match.phase !== 'decision') return
    play('select')
    const events = chooseOption(match, matchRng, optionId)
    revealQueue.push(...events)
    set({ match: { ...match }, playing: true })
    stopTicker()
    ticker = setTimeout(() => get().tick(), autoPlay ? 300 : 150)
  },

  finishMatch: () => {
    stopTicker()
    revealQueue = []
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
      // El equipo completo queda guardado en la meta: material para modos
      // futuros (revanchas, exhibición, exportar tu once).
      void persistInazumaMeta({ team: teamSnapshot(next, 'eliminado') })
      void persistInazumaMeta({ round: bossIndexForLayer(next.layer) })
      set({ save: next, phase: 'gameover', match: null, matchNode: null })
      void persist(next, 'gameover')
      play('defeat')
      return
    }

    advanceLayer(next, matchNode)
    if (isMapComplete(next)) {
      next.finishedAt = Date.now()
      void persistInazumaMeta({ title: true, round: 8, team: teamSnapshot(next, 'campeon') })
      set({ save: next, phase: 'victory', match: null, matchNode: null })
      void persist(next, 'victory')
      play('victory')
      return
    }
    void persistInazumaMeta({ round: bossIndexForLayer(next.layer) })
    // RECOMPENSA FIJA, sin carta al azar: dinero + niveles (ya aplicados en
    // `applyMatchResult`) + 3 medallas + UN objeto random + un FICHAJE del
    // equipo VENCIDO (al azar, con la rareza que llevaba en el partido, y
    // nunca alguien que ya tengas — por NOMBRE, que el catálogo trae clones).
    const gained = LEVELS_BY_RESULT[result]
    const pool = lootPool(bossIndexForLayer(next.layer))
    const prize = pool[getRng(next).int(0, pool.length - 1)]
    if (prize) next.bag = [...next.bag, prize.id]

    let recruitMsg = ''
    let reveal: InazumaState['revealPlayer'] = null
    let pendingSigning: InazumaState['pendingSigning'] = null
    if (result === 'win' && matchNode.teamId && (matchNode.kind === 'jefe' || matchNode.kind === 'final')) {
      const ownedNames = new Set(next.roster.map((p) => getPlayerBase(p.baseId).name))
      const beatenPool = playersOfTeam(matchNode.teamId).filter((b) => !ownedNames.has(b.name))
      const pick = beatenPool.length ? beatenPool[getRng(next).int(0, beatenPool.length - 1)] : null
      if (pick) {
        const rarity = rivalRarityMap(matchNode.teamId, bossIndexForLayer(matchNode.layer)).get(pick.id) ?? 1
        // AL NIVEL DE TU EQUIPO: el nivel de la casilla es el del RIVAL de esa
        // ronda y se queda corto enseguida — el fichaje entraba en desuso el
        // mismo día que llegaba. Se queda con el mayor de los dos.
        const level = Math.max(matchNode.level ?? 0, signingLevel(next))
        if (next.roster.length < ROSTER_MAX) {
          const nuevo = createPlayer(pick.id, level, { rarity })
          next.roster = [...next.roster, nuevo]
          void persistInazumaMeta({ signed: [pick.id] })
          reveal = { uid: nuevo.uid, title: `¡${getPlayerBase(pick.id).name} se une tras la derrota de su equipo!` }
        } else {
          // Plantilla LLENA (16): a decidir — vender a uno o vender al que llega.
          pendingSigning = {
            baseId: pick.id,
            level,
            rarity,
            title: `¡${pick.name} quiere unirse tras caer su equipo!`,
          }
        }
        recruitMsg = ` · ${pick.name} (${RARITY_LABEL[Math.max(1, Math.min(4, rarity))]}) quiere unirse`
      }
    }

    set({
      save: next,
      phase: 'map',
      match: null,
      matchNode: null,
      revealPlayer: reveal,
      pendingSigning,
      message: `Niveles +${gained}/+${Math.max(0, gained - 1)} · ${matchMedals(bossIndexForLayer(matchNode.layer))} Medallas de talento`
        + (prize ? ` · ${prize.name}` : '') + recruitMsg,
    })
    void persist(next, 'map')
  },

  resolveSigningSell: () => {
    const { save, pendingSigning } = get()
    if (!save || !pendingSigning) return
    const base = getPlayerBase(pendingSigning.baseId)
    const fee = transferValue(base, pendingSigning.level)
    const medals = Math.max(1, Math.min(MAX_RARITY, pendingSigning.rarity))
    const next: InazumaSave = {
      ...save,
      coins: save.coins + fee,
      bag: [...save.bag, ...Array.from({ length: medals }, () => 'medalla-rareza')],
    }
    set({
      save: next,
      pendingSigning: null,
      message: `${base.name} traspasado sin llegar a debutar: +${fee.toLocaleString('es-ES')} ₽ y ${medals} medalla${medals > 1 ? 's' : ''}.`,
    })
    void persist(next, get().phase)
  },

  resolveSigningSwap: (uid) => {
    const { save, pendingSigning } = get()
    if (!save || !pendingSigning) return
    const out = save.roster.find((p) => p.uid === uid)
    if (!out) return
    if (out.captain) { set({ message: 'El capitán no se traspasa.' }); return }
    const outBase = getPlayerBase(out.baseId)
    const fee = transferValue(outBase, out.level)
    const medals = Math.max(1, Math.min(MAX_RARITY, rarityOf(out)))
    const nuevo = createPlayer(pendingSigning.baseId, pendingSigning.level, { rarity: pendingSigning.rarity })
    const next: InazumaSave = {
      ...save,
      roster: [...save.roster.filter((p) => p.uid !== uid), nuevo],
      // El nuevo hereda el HUECO del vendido si era titular.
      lineup: save.lineup.map((u) => (u === uid ? nuevo.uid : u)),
      coins: save.coins + fee,
      bag: [...save.bag, ...Array.from({ length: medals }, () => 'medalla-rareza')],
    }
    void persistInazumaMeta({ signed: [pendingSigning.baseId] })
    play('levelup')
    set({
      save: next,
      pendingSigning: null,
      revealPlayer: { uid: nuevo.uid, title: `${outBase.name} se marcha (+${fee.toLocaleString('es-ES')} ₽, ${medals} medalla${medals > 1 ? 's' : ''}). ¡Y llega…!` },
    })
    void persist(next, get().phase)
  },

  // -------------------------------------------------------- recompensas ----
  pickDraft: (optionId) => {
    const { save, draft, draftPicks } = get()
    if (!save) return
    const opt = draft.find((o) => o.id === optionId)
    if (!opt) return

    // Las técnicas SUELTAS ya no existen (solo cadenas): cualquier carta vieja
    // de técnica paga con un Manual avanzado, y el entrenamiento se convierte
    // en su plan equivalente — todo a la mochila, nada de destinatarios ya.
    if (opt.kind === 'tecnica') {
      const next = { ...save, bag: [...save.bag, 'manual-avanzado'] }
      closeDraft(set, next, draft, draftPicks, optionId, 'Manual avanzado a la mochila.')
      return
    }
    if (opt.kind === 'entrenamiento') {
      const itemId = opt.levels >= 4 ? 'plan-intensivo' : 'plan-entrenamiento'
      const next = { ...save, bag: [...save.bag, itemId] }
      closeDraft(set, next, draft, draftPicks, optionId, `${getItem(itemId)?.name} a la mochila.`)
      return
    }

    const next = { ...save, roster: save.roster.slice(), bag: save.bag.slice() }
    let message: string | null = null
    if (opt.kind === 'fichaje') {
      if (next.roster.length >= ROSTER_MAX) {
        // Plantilla LLENA: la carta se consume y se abre la decisión de
        // vender (a uno tuyo o al que llega) — antes bloqueaba sin salida.
        closeDraft(set, next, draft, draftPicks, optionId, null)
        set({
          pendingSigning: {
            baseId: opt.playerId,
            level: opt.level,
            rarity: 1,
            title: `${getPlayerBase(opt.playerId).name} quiere firmar, pero el vestuario está lleno.`,
          },
        })
        return
      }
      // TODO fichaje llega en rareza NORMAL: la rareza la construyes tú con
      // medallas (a cambio, el ojeador puede traer a cualquiera del catálogo).
      next.roster.push(createPlayer(opt.playerId, opt.level, { rarity: 1 }))
      void persistInazumaMeta({ signed: [opt.playerId] })
      message = `${getPlayerBase(opt.playerId).name} firma por el Raimon.`
    } else if (opt.kind === 'objeto') {
      // Cartas de PAGO (la agenda del ojeador): si no llega el dinero, la
      // carta no se gasta — se avisa y se sigue eligiendo.
      if (opt.cost && next.coins < opt.cost) {
        set({ message: `Te faltan ${(opt.cost - next.coins).toLocaleString('es-ES')} ₽ para eso.` })
        return
      }
      if (opt.cost) next.coins -= opt.cost
      next.bag.push(opt.itemId)
      message = opt.cost
        ? `${getItem(opt.itemId)?.name ?? 'Objeto'} a la mochila (−${opt.cost.toLocaleString('es-ES')} ₽).`
        : `${getItem(opt.itemId)?.name ?? 'Objeto'} a la mochila.`
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

  /** Vuelve a la carta sin gastarla: la recompensa sigue esperando. */
  cancelTarget: () => set({ pendingTarget: null, phase: get().draft.length ? 'draft' : 'map' }),

  clearItemFx: () => {
    const next = itemFxQueue.shift() ?? null
    if (next) play('levelup')
    set({ itemFx: next })
  },

  clearRevealPlayer: () => set({ revealPlayer: null }),

  resumeSecondHalf: () => {
    const { match } = get()
    if (match) {
      // ANUNCIO de los cambios hechos en el descanso (los tuyos) y los del
      // RIVAL, que también tiene banquillo y derecho a 3 cambios: entran a la
      // cola de revelado y se narran al arrancar la segunda parte.
      const mySide = sideOf(match, playerSide(match))
      const evs: MatchEvent[] = halftimeSubNotes.map((n) => ({
        kind: 'possession',
        minute: match.minute,
        side: playerSide(match),
        text: `Cambio en ${mySide.name}: entra ${n.inName} por ${n.outName}.`,
      }))
      evs.push(...rivalHalftimeSubs(match))
      if (evs.length) {
        match.events.push(...evs)
        revealQueue.push(...evs)
      }
      halftimeSubNotes = []
      set({ match: { ...match } })
    }
    set({ halftimeBreak: false, playing: true })
    stopTicker()
    ticker = setTimeout(() => get().tick(), 250)
  },

  halftimeUseItem: (itemId, actorUid) => {
    const { match, save } = get()
    if (!match || !save || !get().halftimeBreak) return
    const i = save.bag.indexOf(itemId)
    if (i < 0) return
    const side = match.home.isPlayer ? match.home : match.away
    const actor = [side.keeper, ...side.defs, ...side.mids, ...side.fwds].find((a) => a.uid === actorUid)
    if (!actor) return
    const before = { pt: actor.pt, stamina: actor.stamina }
    const res = applyConsumableToActor(actor, itemId)
    if (!res.ok) { set({ message: res.message }); return }
    const bag = save.bag.slice()
    bag.splice(i, 1)
    const next = { ...save, bag }
    const bars: ItemFxBar[] = []
    if (actor.pt !== before.pt) bars.push({ label: 'PT', from: before.pt, to: actor.pt, max: actor.ptMax, color: '#38bdf8' })
    if (actor.stamina !== before.stamina) bars.push({ label: 'AGU', from: before.stamina, to: actor.stamina, max: 100, color: '#22c55e' })
    play('heal')
    set({
      save: next,
      match: { ...match },
      itemFx: {
        key: Date.now(),
        title: getItem(itemId)?.name ?? 'Objeto',
        itemId,
        targetName: actor.name,
        targetBaseId: actor.baseId,
        bars,
      },
    })
    void persist(next, get().phase)
  },

  halftimeSubstitute: (outUid, benchUid) => {
    const { match, save } = get()
    if (!match || !save || !get().halftimeBreak) return
    const side = match.home.isPlayer ? match.home : match.away
    const out = [side.keeper, ...side.defs, ...side.mids, ...side.fwds].find((a) => a.uid === outUid)
    const role = out?.position
    if (!out || !role) return
    const incoming = subActor(save, benchUid, role)
    if (!incoming) return
    const err = substitute(match, outUid, incoming)
    if (err) { set({ message: err }); return }
    play('select')
    // Se apunta para ANUNCIARLO al arrancar la segunda parte.
    halftimeSubNotes.push({ inName: incoming.name, outName: out.name })
    set({
      match: { ...match },
      message: `${incoming.name} entra por ${out.name}. Quedan ${match.subsLeft} cambios.`,
    })
  },

  halftimeSwap: (aUid, bUid) => {
    const { match } = get()
    if (!match || !get().halftimeBreak) return
    const err = swapOnPitch(match, aUid, bUid)
    if (err) { set({ message: err }); return }
    play('select')
    set({ match: { ...match } })
  },

  halftimeFormation: (formationId) => {
    const { match, save } = get()
    if (!match || !save || !get().halftimeBreak) return
    const f = getFormation(formationId)
    const err = reformation(match, f.defs, f.mids, f.fwds)
    if (err) { set({ message: err }); return }
    play('select')
    // También queda como formación de la partida: es la que verás al volver
    // al vestuario.
    const nextSave = { ...save, formation: formationId }
    set({ match: { ...match }, save: nextSave, message: `Formación: ${f.name}.` })
    void persist(nextSave, get().phase)
  },

  /**
   * Resuelve una situación del mapa. Las opciones con `chance` pueden salir mal
   * — es lo que las hace decisiones y no menús.
   */
  resolveEvent: (optionIndex) => {
    const { save, matchNode } = get()
    if (!save || !matchNode?.eventId) return
    const ev = getEvent(matchNode.eventId)
    const opt = ev?.options[optionIndex]
    if (!ev || !opt) return
    if (opt.cost && save.coins < opt.cost) { set({ message: 'No te llega el presupuesto.' }); return }

    const r = getRng(save)
    const ok = opt.chance == null || r.chance(opt.chance)
    const resolved = ok ? opt : (opt.fail ?? opt)

    const next: InazumaSave = {
      ...save,
      roster: save.roster.slice(),
      bag: save.bag.slice(),
      techniqueBag: save.techniqueBag.slice(),
      cleared: save.cleared.slice(),
      coins: save.coins - (opt.cost ?? 0),
    }
    const { signed } = applyEventEffect(next, resolved.effect, r)
    if (signed) void persistInazumaMeta({ signed: [signed] })
    advanceLayer(next, matchNode)
    set({ save: next, matchNode: null, phase: 'map', message: resolved.outcome })
    void persist(next, 'map')
  },

  resolveFirma: (uid) => {
    const { save, matchNode } = get()
    if (!save || matchNode?.kind !== 'firma') return
    const next: InazumaSave = { ...save, roster: save.roster.slice(), cleared: save.cleared.slice() }
    const learnt = learnSignature(next, uid)
    if (!learnt) { set({ message: 'Ese jugador ya despertó toda su cadena.' }); return }
    const who = next.roster.find((p) => p.uid === uid)
    advanceLayer(next, matchNode)
    set({
      save: next,
      matchNode: null,
      phase: 'map',
      message: `¡${who ? getPlayerBase(who.baseId).name : 'Alguien'} despierta ${learnt.name}!`,
    })
    void persist(next, 'map')
  },

  resolveFirmaUpgrade: (uid, techId) => {
    const { save, matchNode } = get()
    if (!save || matchNode?.kind !== 'firma') return
    const target = save.roster.find((p) => p.uid === uid)
    // La técnica la ELIGE el jugador (`techId`); sin ella, la primera
    // mejorable (compatibilidad con el flujo de un toque).
    const up = target && techId && canUpgradeTechnique(target, techId)
      ? techId
      : target?.techniques.find((t) => canUpgradeTechnique(target, t))
    if (!target || !up) { set({ message: 'Ese jugador no tiene técnicas que mejorar.' }); return }
    const next: InazumaSave = {
      ...save,
      roster: save.roster.map((p) => (p.uid === uid ? upgradeTechnique(p, up) : p)),
      cleared: save.cleared.slice(),
    }
    advanceLayer(next, matchNode)
    set({
      save: next,
      matchNode: null,
      phase: 'map',
      message: `${getTechnique(up)?.name} de ${getPlayerBase(target.baseId).name} mejorada: +25 % de potencia.`,
    })
    void persist(next, 'map')
  },

  skipNode: () => {
    const { save, matchNode } = get()
    if (!save || !matchNode) return
    const next: InazumaSave = { ...save, cleared: save.cleared.slice() }
    advanceLayer(next, matchNode)
    set({ save: next, matchNode: null, phase: 'map' })
    void persist(next, 'map')
  },

  resolveTrade: (uid) => {
    const { save, matchNode } = get()
    if (!save || matchNode?.kind !== 'trade') return
    const out = save.roster.find((p) => p.uid === uid)
    if (!out) return
    if (out.captain) { set({ message: 'El capitán no se cambia.' }); return }

    const r = getRng(save)
    const pool = availableSignings(save)
    if (!pool.length) { set({ message: 'No queda nadie con quien cambiar.' }); return }
    const incoming = r.pick(pool)
    const level = out.level + 3
    // Mismo NIVEL DE RAREZA que el que se marcha: el cambio es lateral.
    const nuevo = createPlayer(incoming.id, level, { rarity: rarityOf(out) })

    const next: InazumaSave = {
      ...save,
      roster: [...save.roster.filter((p) => p.uid !== uid), nuevo],
      // El nuevo hereda el HUECO del que se va: el once no se descoloca.
      lineup: save.lineup.map((u) => (u === uid ? nuevo.uid : u)),
      cleared: save.cleared.slice(),
      // El llegado en un intercambio tampoco se repite en un buen rato.
      scoutSeen: [...(save.scoutSeen ?? []), incoming.id].slice(-20),
    }
    advanceLayer(next, matchNode)
    void persistInazumaMeta({ signed: [incoming.id] })
    set({
      save: next,
      matchNode: null,
      phase: 'map',
      // La carta COMPLETA del que llega, con sus stats: un nombre en un toast
      // no le hace justicia a un fichaje a ciegas.
      revealPlayer: { uid: nuevo.uid, title: `${getPlayerBase(out.baseId).name} se marcha. ¡Y llega…!` },
    })
    void persist(next, 'map')
  },

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
    revealQueue = []
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

  /**
   * Vacía la mochila de técnicas de una partida VIEJA: cada técnica suelta se
   * convierte en un Manual avanzado (las técnicas solo se aprenden por
   * CADENA desde que se suprimieron los objetos de supertécnica).
   */
  convertLegacyTechniques: () => {
    const { save } = get()
    if (!save || !save.techniqueBag.length) return
    const n = save.techniqueBag.length
    const next = {
      ...save,
      techniqueBag: [],
      bag: [...save.bag, ...Array.from({ length: n }, () => 'manual-avanzado')],
    }
    set({ save: next, message: `${n} técnica${n > 1 ? 's' : ''} suelta${n > 1 ? 's' : ''} convertida${n > 1 ? 's' : ''} en Manual avanzado.` })
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

  /**
   * Intercambia dos jugadores arrastrando en el campo. Si los dos son
   * titulares se reordena el once; si uno está en el banquillo, entra y sale
   * el otro. Se valida DESPUÉS con `lineupError`, así que puedes dejar el once
   * inválido a medias mientras recolocas — avisa, pero no te bloquea el gesto.
   */
  swapPlayers: (a, b) => {
    const { save } = get()
    if (!save || a === b) return
    const ia = save.lineup.indexOf(a)
    const ib = save.lineup.indexOf(b)
    const lineup = save.lineup.slice()
    if (ia >= 0 && ib >= 0) {
      lineup[ia] = b
      lineup[ib] = a
    } else if (ia >= 0) {
      lineup[ia] = b
    } else if (ib >= 0) {
      lineup[ib] = a
    } else {
      return
    }
    const next = { ...save, lineup }
    set({ save: next })
    void persist(next, get().phase)
  },

  placeAt: (uid, slot) => {
    const { save } = get()
    if (!save) return
    const lineup = save.lineup.filter((u) => u !== uid)
    lineup.splice(Math.max(0, Math.min(slot, lineup.length)), 0, uid)
    const next = { ...save, lineup: lineup.slice(0, SQUAD_SIZE) }
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

    // Al EQUIPAR, se enseña qué atributos suben y de cuánto a cuánto: el
    // porcentaje de la descripción no le dice nada a nadie.
    let fx: ItemFx | null = null
    if (itemId) {
      const before = effectiveStats(target)
      const after = effectiveStats({ ...target, item: itemId })
      const stats = (Object.keys(before) as (keyof typeof before)[])
        .filter((k) => after[k] !== before[k])
        .map((k) => ({ label: STAT_TAG[k] ?? k, from: before[k], to: after[k] }))
      if (stats.length) {
        fx = {
          key: Date.now(),
          title: getItem(itemId)?.name ?? 'Equipado',
          itemId,
          targetName: getPlayerBase(target.baseId).name,
          targetBaseId: target.baseId,
          bars: [],
          stats,
        }
        play('levelup')
      }
    }

    set({ save: next, itemFx: fx ?? get().itemFx })
    void persist(next, get().phase)
  },

  useFichajeEstrella: (baseId) => {
    const { save } = get()
    if (!save) return
    const i = save.bag.indexOf('fichaje-estrella')
    if (i < 0) { set({ message: 'No llevas ningún Fichaje estrella.' }); return }
    if (save.roster.some((p) => p.baseId === baseId)) { set({ message: 'Ya está en tu plantilla.' }); return }
    if (save.roster.length >= ROSTER_MAX) {
      // Plantilla LLENA: se consume el objeto y se abre la decisión de vender.
      const next = { ...save, bag: save.bag.filter((_, k) => k !== i) }
      set({
        save: next,
        pendingSigning: {
          baseId,
          level: signingLevel(next),
          rarity: 1,
          title: `${getPlayerBase(baseId).name} está listo para firmar, pero el vestuario está lleno.`,
        },
      })
      void persist(next, get().phase)
      return
    }
    const nuevo = createPlayer(baseId, signingLevel(save), { rarity: 1 })
    const next: InazumaSave = {
      ...save,
      bag: save.bag.filter((_, k) => k !== i),
      roster: [...save.roster, nuevo],
    }
    play('levelup')
    void persistInazumaMeta({ signed: [baseId] })
    set({
      save: next,
      revealPlayer: { uid: nuevo.uid, title: `¡El ojeador lo ha conseguido! Llega…` },
      message: `${getPlayerBase(baseId).name} firma por tu equipo.`,
    })
    void persist(next, get().phase)
  },

  useConsumable: (itemId, uid, choiceId) => {
    const { save } = get()
    if (!save) return
    const next: InazumaSave = { ...save, bag: save.bag.slice(), roster: save.roster.slice() }

    // Instantánea ANTES, para animar las barras del valor viejo al nuevo.
    const team = TEAM_ITEMS.has(itemId)
    const snap = (roster: typeof save.roster) => {
      if (team) {
        const n = Math.max(1, roster.length)
        return {
          pt: roster.reduce((a, p) => a + p.pt, 0) / n,
          ptMax: roster.reduce((a, p) => a + ptMax(p), 0) / n,
          stamina: roster.reduce((a, p) => a + p.stamina, 0) / n,
          level: 0,
        }
      }
      const p = roster.find((x) => x.uid === uid)
      return p ? { pt: p.pt, ptMax: ptMax(p), stamina: p.stamina, level: p.level } : null
    }
    const before = snap(save.roster)

    // El efecto vive en el motor (`applyConsumable`), no aquí: los tests de
    // balance también consumen objetos, y duplicar la tabla en dos sitios es
    // la forma más rápida de que dejen de medir el juego real.
    const rarityBefore = team ? 0 : rarityOf(save.roster.find((x) => x.uid === uid)!)
    const statsBefore = team ? null : effectiveStats(save.roster.find((x) => x.uid === uid)!)
    const res = applyConsumable(next, itemId, uid, choiceId)
    if (!res.ok) { set({ message: res.message }); return }

    const after = snap(next.roster)
    const target = next.roster.find((x) => x.uid === uid)

    // SUBIDA DE RAREZA: pantalla propia con la estrella nueva y los atributos
    // que ha ganado — que se VEA lo que la medalla acaba de hacer.
    if (!team && target && statsBefore && rarityOf(target) > rarityBefore) {
      const statsAfter = effectiveStats(target)
      const stats = (Object.keys(statsBefore) as (keyof typeof statsBefore)[])
        .filter((k) => statsAfter[k] !== statsBefore[k])
        .map((k) => ({ label: STAT_TAG[k] ?? k, from: statsBefore[k], to: statsAfter[k] }))
      play('levelup')
      set({
        save: next,
        itemFx: {
          key: Date.now(),
          title: `¡Rareza ${RARITY_LABEL[rarityOf(target)]}!`,
          itemId,
          targetName: getPlayerBase(target.baseId).name,
          targetBaseId: target.baseId,
          bars: [],
          stats,
          rarity: { from: rarityBefore, to: rarityOf(target) },
        },
      })
      void persist(next, get().phase)
      return
    }
    let fx: ItemFx | null = null
    if (before && after) {
      const bars: ItemFxBar[] = []
      if (Math.round(after.pt - before.pt) !== 0) {
        bars.push({ label: 'PT', from: before.pt, to: after.pt, max: after.ptMax, color: '#38bdf8' })
      }
      if (Math.round(after.stamina - before.stamina) !== 0) {
        bars.push({ label: 'AGU', from: before.stamina, to: after.stamina, max: 100, color: '#22c55e' })
      }
      fx = {
        key: Date.now(),
        title: getItem(itemId)?.name ?? 'Objeto',
        itemId,
        targetName: team ? 'Toda la plantilla' : (target ? getPlayerBase(target.baseId).name : ''),
        targetBaseId: team ? undefined : target?.baseId,
        bars,
        level: !team && target && before.level !== target.level
          ? { from: before.level, to: target.level }
          : undefined,
      }
      if (fx.bars.length || fx.level) play('heal')
      else fx = null
    }

    set({ save: next, message: fx ? null : res.message, itemFx: fx ?? get().itemFx })
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
    // Traspasar PAGA: antes solo borraba al jugador, que es todo coste y ningún
    // motivo para hacerlo.
    const fee = transferValue(getPlayerBase(p.baseId), p.level)
    // Y deja MEDALLAS según la rareza del vendido (Normal 1 … Legendario 4):
    // la inversión hecha en el jugador se recupera en material de rareza.
    const medals = Math.max(1, Math.min(MAX_RARITY, rarityOf(p)))
    const next = {
      ...save,
      roster,
      coins: save.coins + fee,
      bag: [...save.bag, ...Array.from({ length: medals }, () => 'medalla-rareza')],
      lineup: lineup.length ? lineup : autoLineup(roster, save.formation),
    }
    set({
      save: next,
      message: `${getPlayerBase(p.baseId).name} traspasado por ${fee.toLocaleString('es-ES')} ₽ y ${medals} medalla${medals > 1 ? 's' : ''}.`,
    })
    void persist(next, get().phase)
  },

  /** Compra un manual: la técnica va a la MOCHILA, no a un jugador. */
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
  return save ? layerName(save.layer, save.teamId, save.saga) : ''
}

/** Marcador del partido en curso, tal y como lo ve el usuario. */
export function currentScore(match: MatchState | null): [number, number] {
  return match ? playerScore(match) : [0, 0]
}
