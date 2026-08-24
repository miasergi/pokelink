// Todas las vistas del modo salvo el combate: título, mapa, nodo, resumen,
// equipo, tienda, deseo y final.
import { useState } from 'react'
import { getFighter, STARTERS } from '@/data/dragon/fighters'
import { getMaster, getSaga, SAGAS } from '@/data/dragon/sagas'
import { getItem, ITEMS } from '@/data/dragon/items'
import { getForm } from '@/data/dragon/transformations'
import { bondsFor, getTrait, TRAIT_BY_FIGHTER } from '@/data/dragon/personalities'
import { getTechnique } from '@/data/dragon/techniques'
import {
  availableNodes, avgLevel, BALLS_FOR_WISH, BOSS_LAYER, TEAM_MAX, WISHES,
} from '@/engine/dragon/run'
import { fighterMaxHp, itemLevel } from '@/engine/dragon/roster'
import { afterOutcome, dragonSummary, fieldItems, useDragon } from '@/state/dragonStore'
import { Avatar, FighterRow, Header, sceneBg, Scouter } from './Bits'
import MapBoard, { NODE_STYLE } from './MapBoard'

// ------------------------------------------------------------- título ---

export function TitleView() {
  const { hasSave, save, newRun, continueRun, abandonRun, exitDragon } = useDragon()
  const [eligiendo, setEligiendo] = useState(false)

  if (eligiendo) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <Header title="¿Quién te acompaña?" sub="Goku va siempre; el segundo lo eliges tú" onBack={() => setEligiendo(false)} />
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <p className="text-[12px] text-slate-400">
            Podrás reclutar hasta {TEAM_MAX} luchadores por el camino, pero con
            quién empiezas marca las primeras peleas.
          </p>
          {STARTERS.map((id) => {
            const d = getFighter(id)!
            return (
              <button
                key={id}
                type="button"
                onClick={() => void newRun(id)}
                className="w-full flex items-center gap-3 rounded-xl bg-slate-800/70 active:bg-slate-700 p-3 text-left"
              >
                <Avatar name={d.name} color={d.color} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{d.name}</div>
                  <div className="text-[11px] text-slate-400 capitalize">
                    {d.style} · {d.lineage}
                  </div>
                  <div className="text-[11px] text-sky-300 truncate mt-0.5">
                    {d.techniques.map((t) => getTechnique(t)?.name).filter(Boolean).join(' · ')}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title="Dragon Ball Rogue" sub="Cuatro sagas, una sola vida" onBack={exitDragon} />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center gap-3">
        <div className="text-center">
          <div className="text-3xl font-black tracking-tight" style={{ color: '#f97316' }}>
            DRAGON BALL
          </div>
          <div className="text-sm font-bold tracking-[0.3em] text-slate-400">ROGUE</div>
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
          onClick={() => setEligiendo(true)}
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
  const s = getSaga(save.saga)
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
  const { save, pickNode, openTeam, exitDragon } = useDragon()
  if (!save) return null
  const s = getSaga(save.saga)
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
            <span className="text-[11px] text-amber-300 tabular-nums">{save.zeni} ẑ</span>
            <button
              type="button"
              onClick={openTeam}
              className="text-[11px] px-2 py-1 rounded-lg bg-slate-800 active:bg-slate-700"
            >
              Equipo
            </button>
          </div>
        }
      />

      <div className="px-3 py-2 flex items-center gap-2 text-[11px] text-slate-400 border-b border-slate-800/60">
        <span>Nivel medio {avgLevel(save)}</span>
        <span className="text-slate-600">·</span>
        <span className={save.balls ? 'text-amber-300' : ''}>
          Bolas {save.balls}/{BALLS_FOR_WISH}
        </span>
        <span className="text-slate-600">·</span>
        <span>{save.team.filter((f) => f.hp > 0).length}/{save.team.length} en pie</span>
      </div>

      {/* El tablero se lee de abajo (donde estás) hacia arriba (el jefe). */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <MapBoard save={save} alcanzables={abiertas} onPick={pickNode} />
      </div>

      <div className="px-3 pb-3 shrink-0 flex flex-wrap gap-1.5">
        {abiertas.map((n) => {
          const st = NODE_STYLE[n.kind]
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => pickNode(n.id)}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900/80 px-2 py-1 active:bg-slate-800"
              style={{ boxShadow: `inset 0 0 0 1px ${st.color}66` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
              <span className="text-[11.5px] font-semibold">{n.label}</span>
              {n.level != null && <span className="text-[10px] text-slate-400 tabular-nums">Nv.{n.level}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function NodeView() {
  const { save, node, confirmNode, leaveNode } = useDragon()
  if (!save || !node) return null
  const st = NODE_STYLE[node.kind]
  const pelea = node.kind === 'combate' || node.kind === 'elite' || node.kind === 'jefe'
  const media = avgLevel(save)
  const diff = pelea && node.level != null ? node.level - media : 0

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header title={node.label} onBack={leaveNode} />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="rounded-xl p-3" style={{ background: '#0f172a', boxShadow: `inset 0 0 0 1.5px ${st.color}55` }}>
          <p className="text-[13px] text-slate-300 leading-snug">{node.desc}</p>
        </div>

        {pelea && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              {(node.enemies ?? []).map((id, i) => {
                const d = getFighter(id)
                if (!d) return null
                return (
                  <div key={`${id}-${i}`} className="flex items-center gap-2 rounded-xl bg-slate-800/70 p-2 pr-3">
                    <Avatar name={d.name} color={d.color} size={38} />
                    <div>
                      <div className="text-[13px] font-bold">{d.name}</div>
                      <div className="text-[11px] text-slate-400">
                        Nv.{node.level} · {d.style}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {node.phases?.length ? (
              <div className="text-[12px] text-red-300">
                Aviso: no cae a la primera. Tiene {node.phases.length + 1} formas.
              </div>
            ) : null}
            <div
              className={`text-[12px] font-semibold ${
                diff >= 4 ? 'text-red-400' : diff >= 1 ? 'text-orange-300' : 'text-green-300'
              }`}
            >
              {diff >= 4
                ? `Te saca ${diff} niveles. Va a doler.`
                : diff >= 1
                  ? `Un poco por encima de ti (+${diff}).`
                  : `Vas ${Math.abs(diff)} niveles por encima.`}
            </div>
            <div className="text-[11.5px] text-slate-400">
              Recompensa: +{node.kind === 'jefe' ? 6 : node.kind === 'elite' ? 6 : 4} niveles a todo el equipo y dinero.
            </div>
          </>
        )}

        {node.kind === 'maestro' && node.master && (() => {
          const m = getMaster(node.master)!
          return (
            <div className="rounded-xl bg-slate-800/70 p-3">
              <div className="font-bold text-sm text-cyan-300">{m.name}</div>
              <div className="text-[11.5px] text-slate-400 mt-1 leading-snug">{m.desc}</div>
              <div className="text-[11px] text-slate-500 mt-1.5">
                Puede enseñar: {m.teaches.map((t) => getTechnique(t)?.name).filter(Boolean).join(', ')}
              </div>
            </div>
          )
        })()}

        {node.kind === 'entreno' && (
          <div className="text-[12px] text-slate-400">
            +{node.levels} niveles al miembro más rezagado, sin arriesgar nada.
          </div>
        )}
        {node.kind === 'reclutar' && node.recruit && (() => {
          const d = getFighter(node.recruit)!
          return (
            <div className="flex items-center gap-3 rounded-xl bg-slate-800/70 p-3">
              <Avatar name={d.name} color={d.color} size={46} />
              <div className="min-w-0">
                <div className="font-bold text-sm">{d.name}</div>
                <div className="text-[11px] text-slate-400 capitalize">{d.style} · {d.lineage}</div>
                <div className="text-[11px] text-sky-300 truncate">
                  {d.techniques.map((t) => getTechnique(t)?.name).filter(Boolean).join(' · ')}
                </div>
              </div>
            </div>
          )
        })()}
      </div>
      <div className="p-3 shrink-0 flex gap-2">
        <button
          type="button"
          onClick={leaveNode}
          className="rounded-xl px-4 py-3 font-semibold bg-slate-800 active:bg-slate-700 text-slate-300"
        >
          Volver
        </button>
        <button
          type="button"
          onClick={confirmNode}
          className="flex-1 rounded-xl py-3 font-bold bg-amber-500 text-slate-900 active:bg-amber-400"
        >
          {pelea ? '¡Adelante!' : node.kind === 'tienda' ? 'Entrar' : node.kind === 'maestro' ? 'Escuchar' : 'Continuar'}
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
            <div className="rounded-xl bg-slate-800/60 p-3 space-y-1 text-[13px]">
              <div className="flex justify-between"><span className="text-slate-400">Niveles</span><span className="font-bold">+{outcome.levels} a todo el equipo</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Dinero</span><span className="font-bold text-amber-300">+{outcome.zeni} ẑ</span></div>
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

export function TeamView() {
  const { save, closeTeam, equip, useField } = useDragon()
  const [sel, setSel] = useState<string | null>(null)
  if (!save) return null
  const equipables = Object.entries(save.bag)
    .map(([id, n]) => ({ item: getItem(id)!, n }))
    .filter((x) => x.item?.kind === 'equipo' && x.n > 0)
  const curas = fieldItems(save)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header
        title="Tu equipo"
        sub={`${save.zeni} ẑ · nivel medio ${avgLevel(save)}`}
        onBack={closeTeam}
      />
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {save.team.map((f) => (
          <div key={f.uid}>
            <FighterRow
              f={f}
              saga={save.saga}
              selected={sel === f.uid}
              onClick={() => setSel(sel === f.uid ? null : f.uid)}
              right={
                f.item ? (
                  <span className="text-[10px] text-amber-300 shrink-0 max-w-[70px] truncate">
                    {getItem(f.item)?.name}
                  </span>
                ) : undefined
              }
            />
            {sel === f.uid && (
              <div className="mt-1.5 ml-2 rounded-xl bg-slate-900/70 p-3 space-y-2">
                {(() => {
                  const rasgo = getTrait(TRAIT_BY_FIGHTER[f.baseId] ?? '')
                  const vinculos = bondsFor(f.baseId, save.team.map((x) => x.baseId))
                  return (
                    <>
                      {rasgo && (
                        <div>
                          <span className="text-[11px] font-bold text-purple-300">{rasgo.name}</span>
                          <span className="text-[11px] text-slate-400"> · {rasgo.desc}</span>
                        </div>
                      )}
                      {vinculos.map((v) => (
                        <div key={v.name} className="text-[11px]">
                          <span className="font-bold text-emerald-300">{v.name}</span>
                          <span className="text-slate-400"> · {v.desc}</span>
                        </div>
                      ))}
                    </>
                  )
                })()}
                <div className="text-[11px] text-slate-400">
                  {f.techniques.map((t) => {
                    const lv = f.techLevels?.[t] ?? 0
                    const n = getTechnique(t)?.name
                    return n ? (lv ? `${n} V${lv + 1}` : n) : null
                  }).filter(Boolean).join(' · ')}
                </div>
                {!!f.forms.length && (
                  <div className="text-[11px] text-amber-300">
                    Transformaciones: {f.forms.map((id) => getForm(id)?.name).filter(Boolean).join(' · ')}
                  </div>
                )}

                <div>
                  <div className="text-[11px] text-slate-400 mb-1">Objeto</div>
                  <div className="flex gap-1.5 flex-wrap">
                    {f.item && (
                      <button
                        type="button"
                        onClick={() => equip(f.uid, undefined)}
                        className="text-[11px] px-2 py-1 rounded-lg bg-slate-800 active:bg-slate-700"
                      >
                        Quitar {getItem(f.item)?.name}
                      </button>
                    )}
                    {equipables.map(({ item, n }) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => equip(f.uid, item.id)}
                        className="text-[11px] px-2 py-1 rounded-lg bg-slate-800 active:bg-slate-700"
                      >
                        {item.name} ×{n}
                      </button>
                    ))}
                    {!equipables.length && !f.item && (
                      <span className="text-[11px] text-slate-500">Nada en la bolsa.</span>
                    )}
                  </div>
                </div>

                {!!curas.length && (
                  <div>
                    <div className="text-[11px] text-slate-400 mb-1">Usar ahora</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {curas.map(({ item, n }) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => useField(item.id, f.uid)}
                          className="text-[11px] px-2 py-1 rounded-lg bg-emerald-900/60 active:bg-emerald-800"
                        >
                          {item.name} ×{n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-[10px] text-slate-500">
                  PS {Math.max(0, Math.round(f.hp))}/{fighterMaxHp(f)}
                  {f.item && itemLevel(f) > 0 && ` · ${getItem(f.item)?.name} +${itemLevel(f)}`}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ------------------------------------------------------------- tienda ---

export function ShopView() {
  const { save, stock, buy, openTeam, leaveShop } = useDragon()
  if (!save) return null
  const genero = stock.length ? stock : ITEMS.slice(0, 5)
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <Header
        title="Tienda"
        sub={`${save.zeni} ẑ`}
        // Salir RESUELVE el nodo: no se puede entrar y salir para farmear.
        onBack={leaveShop}
      />
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {genero.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => buy(it.id)}
            disabled={save.zeni < it.price}
            className="w-full text-left rounded-xl bg-slate-800/70 active:bg-slate-700 p-3 disabled:opacity-40"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-[13px] flex-1 truncate">{it.name}</span>
              <span className="text-[12px] text-amber-300 tabular-nums">{it.price} ẑ</span>
            </div>
            <div className="text-[11px] text-slate-400 leading-snug mt-0.5">{it.desc}</div>
          </button>
        ))}
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
  const s = getSaga(save.saga)
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
