// Vistas del modo salvo el combate y el equipo, que tienen fichero propio:
// título, intro, mapa, maestro, resumen, tienda, deseo y final.
import { useState } from 'react'
import { getMaster, SAGAS } from '@/data/dragon/sagas'
import { sagaOf } from '@/engine/dragon/run'
import { getItem, ITEMS, itemEffect, itemFamily } from '@/data/dragon/items'
import { getTechnique } from '@/data/dragon/techniques'
import {
  availableNodes, avgLevel, BALLS_FOR_WISH, BOSS_LAYER, TEAM_MAX, WISHES,
} from '@/engine/dragon/run'
import { afterOutcome, dragonSummary, useDragon } from '@/state/dragonStore'
import { Avatar, Header, sceneBg, Scouter, TeamStrip, Zeni } from './Bits'
import MapBoard from './MapBoard'
import StarterPicker from './StarterPicker'
import ArcPicker from './ArcPicker'
import NodePreview from './NodePreview'
import { ItemArt } from './ItemArt'
import Icon from '@/ui/components/Icon'

// ------------------------------------------------------------- título ---

export function TitleView() {
  const { hasSave, save, newRun, continueRun, abandonRun, exitDragon, openHelp } = useDragon()
  // Dos pasos antes de jugar: qué historia y con quién. En ese orden, porque
  // el arco decide contra quién peleas y eso condiciona a quién quieres llevar.
  const [paso, setPaso] = useState<null | 'arco' | 'inicial'>(null)
  const [arco, setArco] = useState('z')

  if (paso === 'arco') {
    return <ArcPicker onPick={(id) => { setArco(id); setPaso('inicial') }} onBack={() => setPaso(null)} />
  }
  if (paso === 'inicial') {
    return (
      <StarterPicker
        arc={arco}
        onPick={(id) => void newRun(id, arco)}
        onBack={() => setPaso('arco')}
      />
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title="Dragon Ball Rogue" sub="Cuatro sagas, una sola vida" onBack={exitDragon} />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center gap-3">
        <div className="text-center">
          <img
            src={`${import.meta.env.BASE_URL}dragon/logo.png`}
            alt="Dragon Ball Rogue"
            className="w-full max-w-[280px] mx-auto select-none"
            draggable={false}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
          <p className="text-[12.5px] text-slate-400 mt-3 leading-snug max-w-xs mx-auto">
            Administra tu ki, transfórmate cuando el cuerpo aguante y pelea al
            borde de la muerte: solo así despierta el poder que te falta.
          </p>
        </div>

        {hasSave && save && (
          <button
            type="button"
            onClick={continueRun}
            className="w-full rounded-xl py-3 font-bold bg-amber-500 text-slate-900 active:bg-amber-400"
          >
            Continuar · {dragonSummary(save)}
          </button>
        )}
        <button
          type="button"
          onClick={openHelp}
          className="w-full rounded-xl py-2.5 font-semibold bg-slate-800 active:bg-slate-700 text-slate-300 inline-flex items-center justify-center gap-1.5"
        >
          <Icon name="book" className="w-4 h-4" />Cómo se juega
        </button>
        <button
          type="button"
          onClick={() => setPaso('arco')}
          className={`w-full rounded-xl py-3 font-bold ${
            hasSave ? 'bg-slate-800 active:bg-slate-700' : 'bg-amber-500 text-slate-900 active:bg-amber-400'
          }`}
        >
          Nueva aventura
        </button>
        {hasSave && (
          <button
            type="button"
            onClick={() => { if (confirm('¿Seguro? Se borra la aventura guardada.')) void abandonRun() }}
            className="w-full rounded-xl py-2 text-[12px] text-slate-400 active:bg-slate-800"
          >
            Abandonar la partida guardada
          </button>
        )}
      </div>
    </div>
  )
}

// -------------------------------------------------------------- intro ---

export function IntroView() {
  const { save, goTo } = useDragon()
  if (!save) return null
  const s = sagaOf(save.arc, save.saga)
  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: sceneBg(s.scene) }}>
      <div className="flex-1 grid place-items-center p-6 text-center">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em]" style={{ color: s.color }}>
            Saga {save.saga + 1}
          </div>
          <div className="text-2xl font-black mt-1">{s.name}</div>
          <div className="text-sm text-slate-400">{s.subtitle}</div>
          <p className="text-[13px] text-slate-300 mt-5 leading-relaxed max-w-sm">{s.intro}</p>
        </div>
      </div>
      <div className="p-4 shrink-0">
        <button
          type="button"
          onClick={() => goTo('map')}
          className="w-full rounded-xl py-3 font-bold bg-amber-500 text-slate-900 active:bg-amber-400"
        >
          Empezar
        </button>
      </div>
    </div>
  )
}

// --------------------------------------------------------------- mapa ---

export function MapView() {
  const { save, node, pickNode, leaveNode, confirmNode, openTeam, exitDragon } = useDragon()
  if (!save) return null
  const s = sagaOf(save.arc, save.saga)
  const abiertas = availableNodes(save)
  const enJefe = save.layer >= BOSS_LAYER

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: sceneBg(s.scene) }}>
      <Header
        title={s.name}
        sub={enJefe ? 'Tramo final' : `Tramo ${save.layer + 1} de ${BOSS_LAYER}`}
        onBack={exitDragon}
        right={
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 tabular-nums">
              <Icon name="coin" className="w-3 h-3" />{save.zeni}
            </span>
            <button
              type="button"
              onClick={openTeam}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-slate-800 active:bg-slate-700"
            >
              <Icon name="people" className="w-3.5 h-3.5" />Equipo
            </button>
          </div>
        }
      />

      <div className="px-3 py-2 flex items-center gap-2.5 text-[11px] text-slate-400 border-b border-slate-800/60">
        <span className="inline-flex items-center gap-1">
          <Icon name="chartUp" className="w-3 h-3 text-purple-300" />Nivel {avgLevel(save)}
        </span>
        <span className={`inline-flex items-center gap-1 ${save.balls ? 'text-amber-300' : ''}`}>
          <Icon name="gem" className="w-3 h-3" />{save.balls}/{BALLS_FOR_WISH}
        </span>
        <span className="inline-flex items-center gap-1">
          <Icon name="people" className="w-3 h-3" />
          {save.team.length}/{TEAM_MAX} luchadores
        </span>
      </div>

      {/* El tablero: la salida arriba y el jefe abajo, como el resto del juego */}
      <MapBoard save={save} alcanzables={abiertas} onPick={(n) => pickNode(n.id)} />

      {/* El equipo, siempre a la vista. Tocar abre la ficha completa. */}
      <div className="shrink-0 border-t border-slate-800/70">
        <TeamStrip team={save.team} max={TEAM_MAX} onOpen={openTeam} />
      </div>

      {node && (
        <NodePreview node={node} save={save} onEnter={confirmNode} onClose={leaveNode} />
      )}
    </div>
  )
}

/**
 * Equipo lleno y alguien queriendo entrar. Se elige a quién sustituye o se le
 * dice que no: lo que no puede pasar es que la casilla se gaste sin dar nada,
 * que es lo que ocurría antes.
 */
export function RecruitSwapSheet() {
  const { save, pendingRecruit, resolveRecruit } = useDragon()
  if (!save || !pendingRecruit) return null
  const nuevo = pendingRecruit
  return (
    <div className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm grid place-items-center p-3">
      <div className="w-full max-w-sm max-h-[88svh] overflow-y-auto rounded-3xl border border-emerald-600/50 bg-slate-900 p-4 animate-pop-in">
        <div className="flex items-center gap-3">
          <Avatar name={nuevo.name} color={nuevo.color} size={52} baseId={nuevo.baseId} />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-emerald-300">Quiere unirse</div>
            <div className="font-extrabold text-base leading-tight">{nuevo.name}</div>
            <div className="text-[11px] text-slate-400">
              Nv.{nuevo.level} · {nuevo.style} ·{' '}
              {nuevo.techniques.map((t) => getTechnique(t)?.name).filter(Boolean).join(', ')}
            </div>
          </div>
        </div>
        <p className="text-[12px] text-slate-400 mt-3">
          El equipo está completo ({TEAM_MAX}). Elige a quién sustituye — el que
          salga se queda por el camino, con su nivel y lo que llevara encima.
        </p>
        <div className="space-y-1.5 mt-3">
          {save.team.map((f) => (
            <button
              key={f.uid}
              type="button"
              onClick={() => resolveRecruit(f.uid)}
              className="w-full flex items-center gap-2.5 rounded-xl bg-slate-800/80 active:bg-slate-700 p-2 text-left"
            >
              <Avatar name={f.name} color={f.color} size={36} baseId={f.baseId} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold truncate">{f.name}</div>
                <div className="text-[10.5px] text-slate-400">
                  Nv.{f.level}
                  {f.item && ` · ${getItem(f.item)?.name}`}
                  {!!f.forms.length && ` · ${f.forms.length} transformación(es)`}
                </div>
              </div>
              <span className="text-[10px] text-rose-300 shrink-0">sale</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => resolveRecruit(null)}
          className="w-full mt-2 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-[12.5px] font-bold text-slate-300 active:scale-95 transition"
        >
          Que se quede atrás
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------ resumen ---

export function OutcomeView() {
  const { save, outcome } = useDragon()
  if (!save || !outcome) return null
  const perdida = !outcome.win
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="text-center pt-4">
          <div className={`text-2xl font-black ${perdida ? 'text-red-400' : 'text-amber-300'}`}>
            {perdida ? 'Derrota' : '¡Victoria!'}
          </div>
        </div>

        {!perdida && (
          <>
            {/* QUIÉN sube y DE CUÁNTO A CUÁNTO. «+4 niveles» a secas no se
                entendía: hay que ver a cada luchador cambiar de número para
                caer en que sube el equipo entero, peleen o no. */}
            <div className="rounded-2xl bg-slate-800/60 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Icon name="chartUp" className="w-4 h-4 text-purple-300" />
                <span className="text-[12px] font-bold text-purple-300">
                  +{outcome.levels} niveles a TODO el equipo
                </span>
              </div>
              <div className="space-y-1.5">
                {outcome.levelUps.map((l) => (
                  <div key={l.uid} className="flex items-center gap-2">
                    <span className="text-[12.5px] font-semibold flex-1 truncate">{l.name}</span>
                    <span className="text-[12px] text-slate-500 tabular-nums">Nv.{l.from}</span>
                    <Icon name="arrowRight" className="w-3 h-3 text-purple-300" />
                    <span className="text-[13px] font-black text-purple-200 tabular-nums">Nv.{l.to}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 pt-2 border-t border-slate-700/60 text-[13px]">
                <span className="text-slate-400">Dinero</span>
                <span className="font-bold text-amber-300"><Zeni n={outcome.zeni} /></span>
              </div>
            </div>

            {outcome.awakened.map((t) => (
              <div key={t} className="rounded-xl p-3 text-center" style={{ background: '#78350f55', boxShadow: 'inset 0 0 0 1.5px #fde047' }}>
                <div className="text-[11px] uppercase tracking-widest text-amber-200">Despertar</div>
                <div className="font-black text-[15px] mt-0.5">{t}</div>
              </div>
            ))}

            {outcome.zenkai.map((n) => (
              <div key={n} className="rounded-xl p-3 text-center" style={{ background: '#7f1d1d55', boxShadow: 'inset 0 0 0 1.5px #f97316' }}>
                <div className="text-[11px] uppercase tracking-widest text-orange-200">Zenkai</div>
                <div className="font-bold text-[14px] mt-0.5">
                  {n} ha estado al borde de la muerte y vuelve más fuerte, para siempre.
                </div>
              </div>
            ))}

            {outcome.itemUp.map((t) => (
              <div key={t} className="text-[12px] text-emerald-300">
                {t} — el uso lo ha ido puliendo.
              </div>
            ))}

            {outcome.learned.map((l) => (
              <div key={l.name} className="text-[12px] text-sky-300">
                {l.name} aprende {l.techs.map((t) => getTechnique(t)?.name).filter(Boolean).join(', ')}.
              </div>
            ))}
          </>
        )}

        {perdida && (
          <p className="text-[13px] text-slate-400 text-center leading-snug">
            Tu equipo no ha podido más. La aventura termina aquí.
          </p>
        )}
      </div>
      <div className="p-3 shrink-0">
        <button
          type="button"
          onClick={afterOutcome}
          className="w-full rounded-xl py-3 font-bold bg-amber-500 text-slate-900 active:bg-amber-400"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------- equipo ---

// ------------------------------------------------------------- tienda ---

export function ShopView() {
  const { save, stock, buy, openTeam, leaveShop } = useDragon()
  if (!save) return null
  const genero = stock.length ? stock : ITEMS.slice(0, 5)
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header
        title="Tienda"
        sub="Los equipables se llevan puestos; los consumibles se gastan"
        // Salir RESUELVE el nodo: no se puede entrar y salir para farmear.
        onBack={leaveShop}
      />
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Cada artículo dice a QUÉ FAMILIA pertenece y QUÉ HACE en números:
            sin eso, la tienda era una lista de nombres bonitos. */}
        {genero.map((it) => {
          const fam = itemFamily(it)
          const caro = save.zeni < it.price
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => buy(it.id)}
              disabled={caro}
              className="w-full text-left rounded-2xl bg-slate-800/70 active:bg-slate-700 p-3 disabled:opacity-40 transition active:scale-[0.99]"
              style={{ boxShadow: `inset 0 0 0 1px ${fam.color}33` }}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="grid place-items-center rounded-xl shrink-0"
                  style={{ width: 40, height: 40, background: `${fam.color}22` }}
                >
                  {/* El escaparate enseña el objeto DIBUJADO; el color de
                      familia se queda para el fondo de la cajita. */}
                  <ItemArt id={it.id} className="w-8 h-8" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[13px] truncate">{it.name}</span>
                    <span
                      className="text-[8.5px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: `${fam.color}22`, color: fam.color }}
                    >
                      {fam.label}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-emerald-300 leading-snug">
                    {itemEffect(it).join(' · ')}
                  </div>
                  <div className="text-[10.5px] text-slate-500 leading-snug">{it.desc}</div>
                </div>
                <Zeni n={it.price} className={`text-[12px] shrink-0 ${caro ? 'text-red-400' : 'text-amber-300'}`} />
              </div>
            </button>
          )
        })}
      </div>
      <div className="p-3 shrink-0 flex gap-2">
        <button
          type="button"
          onClick={openTeam}
          className="rounded-xl px-4 py-3 font-semibold bg-slate-800 active:bg-slate-700"
        >
          Equipo
        </button>
        <button
          type="button"
          onClick={leaveShop}
          className="flex-1 rounded-xl py-3 font-bold bg-amber-500 text-slate-900 active:bg-amber-400"
        >
          Seguir camino
        </button>
      </div>
    </div>
  )
}

// ------------------------------------------------------------ maestro ---

export function MasterView() {
  const { save, node, offers, train } = useDragon()
  if (!save || !node?.master) return null
  const m = getMaster(node.master)!
  const lista = offers()
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title={m.name} sub="Elige a quién y qué" />
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="rounded-xl bg-slate-800/70 p-3">
          <p className="text-[12.5px] text-slate-300 leading-snug">{m.desc}</p>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Solo hay tiempo para una lección. Aprender algo nuevo abre opciones;
            pulir lo que ya sabes lo hace más potente y más barato.
          </p>
        </div>
        {lista.length === 0 && (
          <div className="text-[12px] text-slate-400 px-1">
            No tiene nada que enseñarle a este equipo.
          </div>
        )}
        {lista.map((o) => (
          <button
            key={`${o.uid}-${o.techId}-${o.kind}`}
            type="button"
            onClick={() => train(o)}
            className="w-full text-left rounded-xl bg-slate-800/80 active:bg-slate-700 p-3"
            style={{ boxShadow: `inset 0 0 0 1px ${o.kind === 'aprender' ? '#22d3ee66' : '#ffffff12'}` }}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-[13.5px] flex-1 truncate">
                {o.kind === 'aprender' ? o.techName : `${o.techName} V${o.level}`}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300">
                {o.kind === 'aprender' ? 'NUEVA' : 'MEJORA'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Para {o.fighterName} · {getTechnique(o.techId)?.desc}
            </div>
          </button>
        ))}
      </div>
      {lista.length === 0 && (
        <div className="p-3 shrink-0">
          <button
            type="button"
            onClick={() => train({ uid: save.team[0].uid, fighterName: '', kind: 'mejorar', techId: '', techName: '' })}
            className="w-full rounded-xl py-3 font-bold bg-slate-800 active:bg-slate-700"
          >
            Seguir camino
          </button>
        </div>
      )}
    </div>
  )
}

// -------------------------------------------------------------- deseo ---

export function WishView() {
  const { save, wish } = useDragon()
  if (!save) return null
  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: 'radial-gradient(80% 50% at 50% 20%, #f59e0b33, transparent 65%), #0b1220' }}>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="text-center pt-4">
          <div className="flex justify-center gap-1 mb-3">
            {Array.from({ length: BALLS_FOR_WISH }, (_, i) => (
              <span
                key={i}
                className="w-5 h-5 rounded-full"
                style={{ background: 'radial-gradient(circle at 35% 30%, #fef3c7, #f59e0b 60%, #b45309)' }}
              />
            ))}
          </div>
          <div className="text-2xl font-black text-amber-300">Las siete esferas</div>
          <p className="text-[12.5px] text-slate-300 mt-2 leading-snug max-w-sm mx-auto">
            El cielo se oscurece y una voz enorme pregunta qué deseas. Solo una cosa.
          </p>
        </div>
        {WISHES.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => wish(w.id)}
            className="w-full text-left rounded-xl bg-slate-800/80 active:bg-slate-700 p-3"
            style={{ boxShadow: 'inset 0 0 0 1px #f59e0b44' }}
          >
            <div className="font-bold text-[13.5px]">{w.name}</div>
            <div className="text-[11.5px] text-slate-400 mt-0.5">{w.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// -------------------------------------------------------------- final ---

export function EndView({ won }: { won: boolean }) {
  const { save, abandonRun, exitDragon } = useDragon()
  if (!save) return null
  const s = sagaOf(save.arc, save.saga)
  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: sceneBg(s.scene) }}>
      <div className="flex-1 grid place-items-center p-6 text-center">
        <div>
          <div className={`text-3xl font-black ${won ? 'text-amber-300' : 'text-red-400'}`}>
            {won ? '¡Lo habéis conseguido!' : 'Fin del camino'}
          </div>
          <p className="text-[13px] text-slate-300 mt-3 leading-relaxed max-w-sm">
            {won ? SAGAS[SAGAS.length - 1].boss.outro : s.boss.outro}
          </p>
          <div className="mt-5 rounded-xl bg-slate-900/70 p-3 text-left space-y-1 text-[12.5px]">
            <div className="flex justify-between"><span className="text-slate-400">Saga alcanzada</span><span className="font-bold">{s.name}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Combates</span><span className="font-bold">{save.wins}/{save.battles}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Nivel medio</span><span className="font-bold">{avgLevel(save)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Zenkais</span><span className="font-bold">{save.zenkais}</span></div>
            <div className="flex justify-between">
              <span className="text-slate-400">Equipo</span>
              <span className="font-bold truncate ml-2">{save.team.map((f) => f.name).join(', ')}</span>
            </div>
          </div>
          <div className="flex justify-center mt-3">
            <Scouter pl={Math.max(...save.team.map((f) => f.level)) * 1000} />
          </div>
        </div>
      </div>
      <div className="p-4 shrink-0 space-y-2">
        <button
          type="button"
          onClick={() => void abandonRun()}
          className="w-full rounded-xl py-3 font-bold bg-amber-500 text-slate-900 active:bg-amber-400"
        >
          Nueva aventura
        </button>
        <button
          type="button"
          onClick={exitDragon}
          className="w-full rounded-xl py-2.5 font-semibold bg-slate-800 active:bg-slate-700 text-slate-300"
        >
          Volver a Inicio
        </button>
      </div>
    </div>
  )
}
