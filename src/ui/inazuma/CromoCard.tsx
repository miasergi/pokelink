// EL CROMO: la tarjeta coleccionable de un jugador, estilo carta Pokémon.
// Se abre tocando el RETRATO en cualquier ficha (y desde el Álbum): imagen en
// grande sobre el brillo de su elemento con el escudo de su club de marca de
// agua, estrellas de peso en la serie, atributos y su cadena de técnicas.
// Con instancia (uno TUYO) enseña sus números reales; sin ella, el cromo de
// catálogo.
import { create } from 'zustand'
import { createPortal } from 'react-dom'
import Icon from '@/ui/components/Icon'
import { ImgFallback } from '@/ui/components/kit'
import { getPlayerBase, PLAYERS, TEAM_NAMES } from '@/data/inazuma/players'
import { getTechnique } from '@/data/inazuma/techniques'
import { TEAM_BY_ID } from '@/data/inazuma/teams'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { effectiveStats, RARITY_GRADIENT, RARITY_LABEL, rarityOf, scaleStats } from '@/engine/inazuma/roster'
import { portraitUrl, StatGrid } from '@/ui/inazuma/PlayerCard'
import { ELEMENT_ICON, rarityBorder, TechIcons } from '@/ui/inazuma/Glyphs'
import type { PlayerInstance } from '@/engine/inazuma/types'

interface CromoState {
  baseId: string | null
  player: PlayerInstance | null
  open: (baseId: string, player?: PlayerInstance | null) => void
  close: () => void
}
export const useCromo = create<CromoState>((set) => ({
  baseId: null,
  player: null,
  open: (baseId, player) => set({ baseId, player: player ?? null }),
  close: () => set({ baseId: null, player: null }),
}))

export default function CromoOverlay() {
  const { baseId, player, close } = useCromo()
  if (!baseId) return null
  const base = getPlayerBase(baseId)
  const info = ELEMENT_INFO[base.element]
  const tier = player ? rarityOf(player) : 0
  const stats = player ? effectiveStats(player) : scaleStats(base.stats, 1)
  const teamName = base.team === 'libre' ? 'Resto del mundo' : TEAM_BY_ID.get(base.team)?.name ?? TEAM_NAMES[base.team] ?? base.team
  const numero = PLAYERS.findIndex((p) => p.id === baseId) + 1
  const chain = base.signature ?? []
  const marco = tier === 4
    ? { background: RARITY_GRADIENT }
    : { background: `linear-gradient(160deg, ${info.color}, ${tier > 0 ? rarityBorder(tier) : '#1e293b'} 55%, ${info.color}66)` }

  return createPortal(
    <div className="fixed inset-0 z-[97] bg-black/85 backdrop-blur-sm grid place-items-center p-4" onClick={close}>
      <style>{`
        @keyframes cromoShine { 0% { transform: translateX(-130%) rotate(10deg) } 100% { transform: translateX(230%) rotate(10deg) } }
        @keyframes cromoIn { from { transform: scale(.8) rotate(-3deg); opacity: 0 } to { transform: scale(1) rotate(0); opacity: 1 } }
      `}</style>
      <div
        className="relative w-full max-w-[340px] rounded-[22px] p-[5px]"
        style={{ ...marco, boxShadow: `0 0 50px ${info.color}55, 0 18px 40px rgba(0,0,0,.6)`, animation: 'cromoIn .28s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative rounded-[18px] bg-slate-950 overflow-hidden">
          {/* Cabecera: nombre y las estrellas de su peso en la serie. */}
          <div className="flex items-center gap-2 px-3 pt-2.5">
            <Icon name={ELEMENT_ICON[base.element]} className="w-5 h-5 shrink-0" style={{ color: info.color }} />
            <div className="min-w-0 flex-1">
              <div className="text-[17px] font-black leading-tight truncate" style={{ color: info.color }}>{base.name}</div>
            </div>
            <div className="shrink-0 flex gap-[1px]" title={`Peso en la serie: ${base.fame}/5`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Icon key={i} name="star" className="w-3.5 h-3.5" style={{ color: i < base.fame ? '#fbbf24' : '#334155' }} />
              ))}
            </div>
          </div>

          {/* LA VENTANA DE ARTE: brillo del elemento, escudo de marca de agua,
              retrato en grande y el destello que barre el cromo. */}
          <div
            className="relative mx-3 mt-2 h-64 rounded-2xl overflow-hidden border"
            style={{
              borderColor: `${info.color}55`,
              background: `radial-gradient(circle at 50% 30%, ${info.color}40, #0b1220 75%)`,
            }}
          >
            <img
              src={`${import.meta.env.BASE_URL}inazuma/teams/${base.team}.png`}
              alt=""
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-52 h-52 object-contain opacity-[0.13]"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
            <ImgFallback
              src={portraitUrl(base.id)}
              alt={base.name}
              className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,.6)]"
              fallback={
                <span className="absolute inset-0 grid place-items-center text-5xl font-black" style={{ color: info.color }}>
                  {base.name.slice(0, 2).toUpperCase()}
                </span>
              }
            />
            <span
              className="pointer-events-none absolute -inset-y-8 w-20"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.28), transparent)',
                animation: 'cromoShine 2.8s ease-in-out infinite',
              }}
            />
          </div>

          {/* Placa: club, demarcación y (si es tuyo) nivel y rareza. */}
          <div className="mx-3 mt-2 flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/70 px-2.5 py-1.5">
            <ImgFallback
              src={`${import.meta.env.BASE_URL}inazuma/teams/${base.team}.png`}
              className="w-6 h-6 object-contain shrink-0"
              alt={teamName}
              fallback={<Icon name="crest" className="w-5 h-5 text-slate-500" />}
            />
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-extrabold truncate">{teamName}</div>
              <div className="text-[9px] text-slate-400">
                {base.position} · {info.label}
                {player && <> · Nv.{player.level}</>}
              </div>
            </div>
            {tier > 0 && (
              <span className="shrink-0 text-[9px] font-extrabold uppercase tracking-widest" style={{ color: rarityBorder(tier) }}>
                {RARITY_LABEL[tier]}
              </span>
            )}
          </div>

          {/* Atributos: los suyos reales si es tuyo, los de catálogo si no. */}
          <div className="mx-3 mt-2">
            <div className="text-[8px] uppercase tracking-widest text-slate-600 mb-1">
              {player ? 'Atributos actuales' : 'Atributos de catálogo'}
            </div>
            <StatGrid stats={stats} />
          </div>

          {/* Su cadena, en miniatura. */}
          {chain.length > 0 && (
            <div className="mx-3 mt-2 flex flex-wrap gap-1">
              {chain.map((id) => {
                const t = getTechnique(id)
                if (!t) return null
                const ti = ELEMENT_INFO[t.element]
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold"
                    style={{ color: ti.color, borderColor: `${ti.color}44`, background: `${ti.color}10` }}
                  >
                    <TechIcons tech={t} className="w-2.5 h-2.5" />
                    {t.name}
                  </span>
                )
              })}
            </div>
          )}

          {/* El pie de cromo, con su número de colección. */}
          <div className="px-3 py-2 mt-1 flex items-center justify-between text-[8px] uppercase tracking-widest text-slate-600">
            <span>Inazuma Rogue · Cromo</span>
            <span className="tabular-nums">Nº {numero}/{PLAYERS.length}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
