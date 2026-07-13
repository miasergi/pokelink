// Cable Link de la Cyber PokéBall: intercambios asíncronos y combates fantasma
// entre cuentas (Supabase, sin realtime: pull manual + refresco suave).
//
// Flujo de intercambio (v1, sin funciones de servidor):
//  - El dueño OFRECE un Pokémon: sale de su consola y queda en depósito en la
//    oferta (cancelar la oferta ABIERTA lo devuelve).
//  - Otro jugador ACEPTA aportando el suyo (también sale de su consola);
//    mientras el dueño no confirme, puede RETIRARSE y recuperarlo.
//  - El dueño CONFIRMA: recoge el Pokémon aportado (estado completed).
//  - El aceptante ve completed y RECOGE el ofrecido (estado closed).
// Todas las transiciones van GUARDADAS por estado esperado (si otra pestaña o
// jugador se adelantó, la petición no toca filas y aquí no se entrega nada),
// y las recogidas se anotan en localStorage para poder reintentarlas si la
// respuesta se perdió a mitad (idempotencia).
import { useCallback, useEffect, useState } from 'react'
import { useCyber } from '@/state/cyberStore'
import { useGame } from '@/state/gameStore'
import { getSpecies } from '@/data'
import {
  cyberListOpenTrades, cyberMyTrades, cyberCreateTrade, cyberAcceptTrade,
  cyberSetTradeStatus, cyberWithdrawTrade,
  cyberPublishGhost, cyberFetchGhosts, cyberSubmitResult, currentUser,
  type CyberTradeRow, type CyberGhostRow,
} from '@/persistence/supabase'
import { simulateGhostBattle } from '@/engine/cyber/ghost'
import { play } from '@/utils/sfx'
import { useShellControls } from './CyberShell'
import { LcdTitle, LcdText, LcdButton, LcdSprite } from './lcd'

type Tab = 'trades' | 'mine' | 'ghosts'

// Registro local de recogidas (por si la respuesta de la red se pierde tras
// aplicar el cambio en el servidor: el botón RECOGER reaparece y es seguro).
const COLLECTED_KEY = 'pokerogue:cyber-collected'
function collectedSet(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(COLLECTED_KEY) || '[]') as number[]) } catch { return new Set() }
}
function markCollected(id: number): void {
  try {
    const s = collectedSet()
    s.add(id)
    localStorage.setItem(COLLECTED_KEY, JSON.stringify([...s].slice(-200)))
  } catch { /* ignore */ }
}

export function OnlineView() {
  const { save, goTo, tradeAway, receiveMon, restoreMon, grantGhostReward } = useCyber()
  const { cloudUser, alias } = useGame()
  const [tab, setTab] = useState<Tab>('trades')
  const [trades, setTrades] = useState<CyberTradeRow[] | null>(null)
  const [mine, setMine] = useState<CyberTradeRow[] | null>(null)
  const [ghosts, setGhosts] = useState<CyberGhostRow[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [pickFor, setPickFor] = useState<'offer' | number | null>(null) // number = id de oferta a aceptar
  const [ghostLog, setGhostLog] = useState<string[] | null>(null)
  const [collected, setCollected] = useState<Set<number>>(collectedSet)
  const gen = save?.gen

  // El botón central cierra el sub-flujo activo, no te expulsa al mapa.
  useShellControls({
    onCenter: () => {
      if (ghostLog) setGhostLog(null)
      else if (pickFor !== null) setPickFor(null)
      else goTo('map')
    },
    centerLabel: ghostLog || pickFor !== null ? 'CERRAR' : 'VOLVER',
  }, [goTo, ghostLog, pickFor])

  const refresh = useCallback(async () => {
    if (gen == null || !currentUser()) return
    setBusy(true)
    const [t, m, g] = await Promise.all([
      cyberListOpenTrades(gen),
      cyberMyTrades(),
      cyberFetchGhosts(gen),
    ])
    setTrades(t)
    setMine(m)
    setGhosts(g)
    setBusy(false)
  }, [gen])

  useEffect(() => {
    void refresh()
    const iv = setInterval(() => void refresh(), 30000)
    return () => clearInterval(iv)
  }, [refresh])

  if (!save) return null

  if (!cloudUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <LcdTitle>CABLE LINK</LcdTitle>
        <LcdText center>Necesitas iniciar sesión en la nube para conectar con otros jugadores.</LcdText>
        <LcdText dim center>Inicio → botón de cuenta (arriba)</LcdText>
        <LcdButton active onClick={() => goTo('map')} className="text-center">◄ VOLVER</LcdButton>
      </div>
    )
  }

  // Candidatos a entregar: caja + equipo (si quedan ≥2), nunca los bloqueados.
  const giveables = [...save.party.filter(() => save.party.length > 1), ...save.box].filter((m) => !m.locked)

  const collect = (tradeId: number, mon: CyberTradeRow['offered']) => {
    receiveMon(mon)
    markCollected(tradeId)
    setCollected(collectedSet())
    play('victory')
    setMsg(`¡RECIBES ${getSpecies(mon.speciesId).displayName.toUpperCase()}!`)
  }

  const doCreateOffer = async (uid: string) => {
    const mon = save.party.find((m) => m.uid === uid) ?? save.box.find((m) => m.uid === uid)
    if (!mon) return
    setBusy(true)
    const removed = tradeAway(uid)
    if (!removed) { setBusy(false); return }
    const ok = await cyberCreateTrade(save.gen, removed, null, alias)
    if (!ok) {
      restoreMon(removed) // fallo de red: el Pokémon no sale de la consola
      setMsg('ERROR DE CONEXIÓN')
    } else {
      play('catch')
      setMsg(`${getSpecies(removed.speciesId).displayName.toUpperCase()} OFRECIDO AL LINK`)
    }
    setPickFor(null)
    setBusy(false)
    void refresh()
  }

  const doAccept = async (trade: CyberTradeRow, uid: string) => {
    setBusy(true)
    const removed = tradeAway(uid)
    if (!removed) { setBusy(false); return }
    const ok = await cyberAcceptTrade(trade.id, removed, alias)
    if (!ok) {
      restoreMon(removed)
      setMsg('LA OFERTA YA NO ESTÁ DISPONIBLE')
    } else {
      play('catch')
      setMsg('¡TRATO ACEPTADO! ESPERA LA CONFIRMACIÓN')
    }
    setPickFor(null)
    setBusy(false)
    void refresh()
  }

  const doOwnerConfirm = async (trade: CyberTradeRow) => {
    if (!trade.counter) return
    setBusy(true)
    // Guardado: solo si sigue 'accepted' (otra pestaña pudo confirmar ya).
    if (await cyberSetTradeStatus(trade.id, 'completed', 'accepted')) {
      collect(trade.id, trade.counter)
    } else {
      setMsg('EL TRATO CAMBIÓ DE ESTADO · ACTUALIZA')
    }
    setBusy(false)
    void refresh()
  }

  const doTakerCollect = async (trade: CyberTradeRow) => {
    setBusy(true)
    if (await cyberSetTradeStatus(trade.id, 'closed', 'completed')) {
      collect(trade.id, trade.offered)
    } else {
      setMsg('EL TRATO CAMBIÓ DE ESTADO · ACTUALIZA')
    }
    setBusy(false)
    void refresh()
  }

  const doTakerWithdraw = async (trade: CyberTradeRow) => {
    if (!trade.counter) return
    setBusy(true)
    if (await cyberWithdrawTrade(trade.id)) {
      restoreMon(structuredClone(trade.counter))
      setMsg('TE RETIRASTE · POKÉMON DEVUELTO')
    } else {
      setMsg('EL TRATO CAMBIÓ DE ESTADO · ACTUALIZA')
    }
    setBusy(false)
    void refresh()
  }

  const doCancel = async (trade: CyberTradeRow) => {
    setBusy(true)
    // Guardado: solo cancela si sigue 'open' — si alguien la aceptó entre
    // medias, cancelar destruiría el Pokémon aportado por el otro jugador.
    if (await cyberSetTradeStatus(trade.id, 'cancelled', 'open')) {
      restoreMon(structuredClone(trade.offered))
      setMsg('OFERTA CANCELADA · POKÉMON DEVUELTO')
    } else {
      setMsg('ALGUIEN ACEPTÓ TU OFERTA · ACTUALIZA')
    }
    setBusy(false)
    void refresh()
  }

  const doPublishGhost = async () => {
    setBusy(true)
    const ok = await cyberPublishGhost(save.gen, save.party, save.progress.badges, alias)
    setMsg(ok ? 'EQUIPO FANTASMA PUBLICADO' : 'ERROR DE CONEXIÓN')
    setBusy(false)
    void refresh()
  }

  const doChallenge = (ghost: CyberGhostRow) => {
    const seed = Math.floor(Math.random() * 2 ** 31)
    const result = simulateGhostBattle(save.party, ghost.team, seed)
    setGhostLog(result.log)
    play(result.won ? 'victory' : 'defeat')
    void cyberSubmitResult({ ghost_id: ghost.user_id, gen: save.gen, seed, challenger_won: result.won })
    if (result.won) grantGhostReward(ghost.user_id)
  }

  // ---- reproducción del combate fantasma ----
  if (ghostLog) {
    return <GhostLogView log={ghostLog} onClose={() => setGhostLog(null)} />
  }

  // ---- selector de Pokémon a entregar ----
  if (pickFor !== null) {
    return (
      <div className="flex-1 flex flex-col gap-1 min-h-0">
        <LcdTitle>{pickFor === 'offer' ? '¿QUÉ OFRECES?' : '¿QUÉ ENTREGAS?'}</LcdTitle>
        <LcdText dim center>El Pokémon saldrá de tu consola</LcdText>
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-1">
          {giveables.length === 0 && <LcdText dim center>— NADA DISPONIBLE —</LcdText>}
          {giveables.map((m) => (
            <LcdButton key={m.uid} disabled={busy} onClick={() => {
              if (pickFor === 'offer') void doCreateOffer(m.uid)
              else {
                const t = trades?.find((x) => x.id === pickFor)
                if (t) void doAccept(t, m.uid)
              }
            }}>
              <span className="inline-flex items-center gap-2">
                <LcdSprite speciesId={m.speciesId} shiny={m.shiny} size="sm" />
                {getSpecies(m.speciesId).displayName.toUpperCase()} Nv.{m.level}
              </span>
            </LcdButton>
          ))}
        </div>
        <LcdButton onClick={() => setPickFor(null)} className="text-center">CANCELAR</LcdButton>
      </div>
    )
  }

  const me = currentUser()

  return (
    <div className="flex-1 flex flex-col gap-1 min-h-0">
      <LcdTitle>CABLE LINK</LcdTitle>
      <div className="grid grid-cols-3 gap-1">
        <LcdButton active={tab === 'trades'} onClick={() => setTab('trades')} className="text-center">OFERTAS</LcdButton>
        <LcdButton active={tab === 'mine'} onClick={() => setTab('mine')} className="text-center">MIS TRATOS</LcdButton>
        <LcdButton active={tab === 'ghosts'} onClick={() => setTab('ghosts')} className="text-center">VS</LcdButton>
      </div>
      {msg && <LcdText center className="text-yellow-200">{msg}</LcdText>}

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-1">
        {tab === 'trades' && (
          <>
            <LcdButton active disabled={busy || giveables.length === 0} onClick={() => setPickFor('offer')} className="text-center">
              ＋ OFRECER UN POKÉMON
            </LcdButton>
            {trades === null && <LcdText dim center>{busy ? 'CONECTANDO…' : 'SIN DATOS (¿SIN RED?)'}</LcdText>}
            {trades?.length === 0 && <LcdText dim center>— NO HAY OFERTAS EN GEN {save.gen} —</LcdText>}
            {trades?.map((t) => (
              <div key={t.id} className="border border-emerald-900 rounded px-2 py-1.5 bg-emerald-950/40 flex items-center gap-2">
                <LcdSprite speciesId={t.offered.speciesId} shiny={t.offered.shiny} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-[9px]">{getSpecies(t.offered.speciesId).displayName.toUpperCase()} Nv.{t.offered.level}</div>
                  <div className="text-[7px] text-emerald-500">DE {t.owner_alias.toUpperCase()}</div>
                </div>
                <LcdButton disabled={busy || giveables.length === 0} onClick={() => setPickFor(t.id)}>TRATO</LcdButton>
              </div>
            ))}
          </>
        )}

        {tab === 'mine' && (
          <>
            {mine?.length === 0 && <LcdText dim center>— SIN TRATOS —</LcdText>}
            {mine?.map((t) => {
              const isOwner = t.owner_id === me?.id
              return (
                <div key={t.id} className="border border-emerald-900 rounded px-2 py-1.5 bg-emerald-950/40">
                  <div className="flex items-center gap-2">
                    <LcdSprite speciesId={t.offered.speciesId} size="sm" />
                    <span className="text-[8px] flex-1">
                      {getSpecies(t.offered.speciesId).displayName.toUpperCase()}
                      {t.counter ? ` ⇄ ${getSpecies(t.counter.speciesId).displayName.toUpperCase()}` : ''}
                    </span>
                    <span className="text-[7px] text-emerald-500">{statusLabel(t.status)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {isOwner && t.status === 'open' && (
                      <LcdButton disabled={busy} onClick={() => void doCancel(t)}>CANCELAR</LcdButton>
                    )}
                    {isOwner && t.status === 'accepted' && t.counter && (
                      <LcdButton active disabled={busy} onClick={() => void doOwnerConfirm(t)}>
                        CONFIRMAR Y RECIBIR {getSpecies(t.counter.speciesId).displayName.toUpperCase()}
                      </LcdButton>
                    )}
                    {/* Red caída a mitad: la fila avanzó pero no llegamos a recoger. */}
                    {isOwner && t.status !== 'open' && t.status !== 'accepted' && t.status !== 'cancelled' && t.counter && !collected.has(t.id) && (
                      <LcdButton active disabled={busy} onClick={() => collect(t.id, t.counter!)}>
                        RECOGER {getSpecies(t.counter.speciesId).displayName.toUpperCase()}
                      </LcdButton>
                    )}
                    {!isOwner && t.status === 'accepted' && (
                      <LcdButton disabled={busy} onClick={() => void doTakerWithdraw(t)}>RETIRARME</LcdButton>
                    )}
                    {!isOwner && t.status === 'completed' && (
                      <LcdButton active disabled={busy} onClick={() => void doTakerCollect(t)}>
                        RECOGER {getSpecies(t.offered.speciesId).displayName.toUpperCase()}
                      </LcdButton>
                    )}
                    {!isOwner && t.status === 'closed' && !collected.has(t.id) && (
                      <LcdButton active disabled={busy} onClick={() => collect(t.id, t.offered)}>
                        RECOGER {getSpecies(t.offered.speciesId).displayName.toUpperCase()}
                      </LcdButton>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}

        {tab === 'ghosts' && (
          <>
            <LcdButton active disabled={busy || save.party.length === 0} onClick={() => void doPublishGhost()} className="text-center">
              ⇪ PUBLICAR MI EQUIPO ({save.progress.badges} MEDALLAS)
            </LcdButton>
            {ghosts === null && <LcdText dim center>{busy ? 'CONECTANDO…' : 'SIN DATOS'}</LcdText>}
            {ghosts?.length === 0 && <LcdText dim center>— SIN RIVALES EN GEN {save.gen} —</LcdText>}
            {ghosts?.map((g) => (
              <div key={g.user_id} className="border border-emerald-900 rounded px-2 py-1.5 bg-emerald-950/40 flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {g.team.slice(0, 3).map((m) => <LcdSprite key={m.uid} speciesId={m.speciesId} size="sm" />)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[8px]">{g.alias.toUpperCase()}{save.ghostsBeaten?.includes(g.user_id) ? ' ✓' : ''}</div>
                  <div className="text-[7px] text-emerald-500">{g.badges} MEDALLAS</div>
                </div>
                <LcdButton disabled={busy} onClick={() => doChallenge(g)}>¡VS!</LcdButton>
              </div>
            ))}
            <LcdText dim center className="mt-1">1ª victoria contra cada rival: +500 ₽ (simulación justa por semilla)</LcdText>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <LcdButton disabled={busy} onClick={() => void refresh()} className="text-center">⟳ ACTUALIZAR</LcdButton>
        <LcdButton active onClick={() => goTo('map')} className="text-center">◄ VOLVER</LcdButton>
      </div>
    </div>
  )
}

function statusLabel(s: string): string {
  switch (s) {
    case 'open': return 'ABIERTO'
    case 'accepted': return 'ACEPTADO'
    case 'completed': return 'COMPLETADO'
    case 'closed': return 'CERRADO'
    case 'cancelled': return 'CANCELADO'
    default: return s.toUpperCase()
  }
}

function GhostLogView({ log, onClose }: { log: string[]; onClose: () => void }) {
  const [shown, setShown] = useState(1)
  useEffect(() => {
    const iv = setInterval(() => {
      setShown((n) => {
        if (n + 1 >= log.length) clearInterval(iv) // no dejar el timer vivo al terminar
        return Math.min(log.length, n + 1)
      })
    }, 600)
    return () => clearInterval(iv)
  }, [log.length])
  const done = shown >= log.length
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <LcdTitle>COMBATE LINK</LcdTitle>
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-0.5 mt-1">
        {log.slice(0, shown).map((l, i) => (
          <LcdText key={i} className={i === shown - 1 ? 'text-emerald-100' : 'text-emerald-500/80'}>{l}</LcdText>
        ))}
      </div>
      {done
        ? <LcdButton active onClick={onClose} className="text-center">► OK</LcdButton>
        : <LcdButton onClick={() => setShown(log.length)} className="text-center">» SALTAR</LcdButton>}
    </div>
  )
}
