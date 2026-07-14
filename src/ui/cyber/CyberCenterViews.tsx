// Centro Pokémon (curar + tienda), PC (caja), Pokédex del modo y mochila.
import { useMemo, useState } from 'react'
import { useCyber } from '@/state/cyberStore'
import { getSpecies, speciesByGeneration } from '@/data'
import { CYBER_SHOP } from '@/engine/cyber/cyberEngine'
import { CYBER_PARTY_MAX } from '@/engine/cyber/types'
import { play } from '@/utils/sfx'
import { LcdTitle, LcdText, LcdButton, LcdSprite, LcdHpBar } from './lcd'

// ---- Centro Pokémon ----
export function CenterView() {
  const { save, healParty, buyItem, goTo } = useCyber()
  const [healed, setHealed] = useState(false)
  if (!save) return null
  return (
    <div className="flex-1 flex flex-col gap-1.5 min-h-0">
      <LcdTitle>CENTRO POKÉMON</LcdTitle>
      <LcdButton
        active
        onClick={() => { healParty(); play('heal'); setHealed(true) }}
        className="text-center"
      >
        {healed ? '¡EQUIPO RECUPERADO! ♪' : '♥ CURAR EQUIPO'}
      </LcdButton>
      <div className="flex justify-center gap-2">
        {save.party.map((m) => (
          <div key={m.uid} className="text-center">
            <LcdSprite speciesId={m.speciesId} shiny={m.shiny} size="sm" className={m.currentHp <= 0 ? 'opacity-30' : ''} />
            <div className="text-[7px] text-emerald-400">{m.currentHp}/{m.stats.hp}</div>
          </div>
        ))}
      </div>

      <div className="border-t border-emerald-900 pt-1.5 flex-1 min-h-0 overflow-y-auto no-scrollbar">
        <LcdText dim>TIENDA · {save.money} ₽</LcdText>
        <div className="flex flex-col gap-1 mt-1">
          {CYBER_SHOP.map((it) => (
            <LcdButton
              key={it.id}
              disabled={save.money < it.price}
              onClick={() => { buyItem(it.id) }}
              className="flex justify-between"
            >
              <span className="flex justify-between w-full">
                <span>{it.label} ×{save.items[it.id] ?? 0}</span>
                <span className="text-emerald-400">{it.price} ₽</span>
              </span>
            </LcdButton>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <LcdButton onClick={() => goTo('pc')} className="text-center">PC</LcdButton>
        <LcdButton onClick={() => goTo('online')} className="text-center">LINK ⇄</LcdButton>
        <LcdButton active onClick={() => goTo('map')} className="text-center">◄ MAPA</LcdButton>
      </div>
    </div>
  )
}

// ---- PC / Caja ----
export function PcView() {
  const { save, deposit, withdraw, goTo } = useCyber()
  const [page, setPage] = useState(0)
  const perPage = 3
  const pages = Math.max(1, Math.ceil((save?.box.length ?? 0) / perPage))
  if (!save) return null
  const boxPage = save.box.slice(page * perPage, page * perPage + perPage)
  return (
    <div className="flex-1 flex flex-col gap-1 min-h-0">
      <LcdTitle>PC · BILL</LcdTitle>
      <LcdText dim>EQUIPO ({save.party.length}/{CYBER_PARTY_MAX}) — toca para DEPOSITAR</LcdText>
      <div className="flex flex-col gap-1">
        {save.party.map((m) => (
          <LcdButton key={m.uid} disabled={save.party.length <= 1} onClick={() => deposit(m.uid)}>
            <span className="inline-flex items-center gap-2 w-full">
              <LcdSprite speciesId={m.speciesId} shiny={m.shiny} size="sm" />
              <span>{getSpecies(m.speciesId).displayName.toUpperCase()} Nv.{m.level}</span>
            </span>
          </LcdButton>
        ))}
      </div>
      <LcdText dim className="mt-1">CAJA ({save.box.length}) — toca para RETIRAR · pág {page + 1}/{pages}</LcdText>
      <div className="flex-1 min-h-0 flex flex-col gap-1">
        {boxPage.length === 0 && <LcdText dim center>— VACÍA —</LcdText>}
        {boxPage.map((m) => (
          <LcdButton key={m.uid} disabled={save.party.length >= CYBER_PARTY_MAX} onClick={() => withdraw(m.uid)}>
            <span className="inline-flex items-center gap-2 w-full">
              <LcdSprite speciesId={m.speciesId} shiny={m.shiny} size="sm" />
              <span>{getSpecies(m.speciesId).displayName.toUpperCase()} Nv.{m.level}</span>
            </span>
          </LcdButton>
        ))}
      </div>
      {pages > 1 && (
        <div className="grid grid-cols-2 gap-1.5">
          <LcdButton onClick={() => setPage((p) => (p + pages - 1) % pages)} className="text-center">◄ PÁG</LcdButton>
          <LcdButton onClick={() => setPage((p) => (p + 1) % pages)} className="text-center">PÁG ►</LcdButton>
        </div>
      )}
      <LcdButton active onClick={() => goTo('center')} className="text-center">◄ VOLVER</LcdButton>
    </div>
  )
}

// ---- Pokédex del modo (3 filas visibles, como el juguete) ----
export function DexView() {
  const { save, goTo } = useCyber()
  const species = useMemo(() => (save ? speciesByGeneration(save.gen) : []), [save?.gen])
  const [cursor, setCursor] = useState(0)
  const max = Math.max(0, species.length - 3)
  if (!save) return null
  const visible = species.slice(cursor, cursor + 3)
  const caught = save.dexCaught.length
  return (
    <div className="flex-1 flex flex-col gap-1 min-h-0">
      <LcdTitle>POKÉDEX</LcdTitle>
      <LcdText dim center>VISTOS {save.dexSeen.length} · CAPTURADOS {caught} / {species.length}</LcdText>
      <div className="flex-1 flex flex-col justify-center gap-2">
        {visible.map((sp) => {
          const seen = save.dexSeen.includes(sp.id)
          const got = save.dexCaught.includes(sp.id)
          return (
            <div key={sp.id} className="flex items-center gap-2 border border-emerald-900 rounded px-2 py-1.5 bg-emerald-950/40">
              <span className="text-[8px] text-emerald-500 w-8">Nº{String(sp.id).padStart(3, '0')}</span>
              {seen ? <LcdSprite speciesId={sp.id} size="sm" className={got ? '' : 'grayscale opacity-70'} /> : <div className="w-10 h-10 grid place-items-center text-emerald-800">?</div>}
              <span className="text-[9px] flex-1">{seen ? sp.displayName.toUpperCase() : '---------'}</span>
              {got && <span className="text-[10px]" title="Capturado">◓</span>}
            </div>
          )
        })}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <LcdButton onClick={() => setCursor((c) => Math.max(0, c - 3))} className="text-center">◄ ANTERIOR</LcdButton>
        <LcdButton onClick={() => setCursor((c) => Math.min(max, c + 3))} className="text-center">SIGUIENTE ►</LcdButton>
      </div>
      <LcdButton active onClick={() => goTo('map')} className="text-center">◄ VOLVER</LcdButton>
    </div>
  )
}

// ---- Mochila + estado del equipo ----
export function BagView() {
  const { save, useItem, goTo } = useCyber()
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  if (!save) return null
  const usable = ['potion', 'super-potion', 'revive'].filter((id) => (save.items[id] ?? 0) > 0)
  const labelOf: Record<string, string> = { potion: 'POCIÓN', 'super-potion': 'SUPERPOCIÓN', revive: 'REVIVIR', ball: 'POKÉ BALL' }
  return (
    <div className="flex-1 flex flex-col gap-1.5 min-h-0">
      <LcdTitle>EQUIPO</LcdTitle>
      <div className="flex flex-col gap-1.5">
        {save.party.map((m) => (
          <button
            key={m.uid}
            onClick={() => {
              if (!selectedItem) return
              const r = useItem(selectedItem, m.uid)
              setMsg(r ?? 'No tiene efecto…')
              setSelectedItem(null)
              if (r) play('heal')
            }}
            className={`text-left border rounded px-2 py-1.5 transition ${selectedItem ? 'border-yellow-300 bg-yellow-300/10' : 'border-emerald-900 bg-emerald-950/40'}`}
          >
            <div className="flex items-center gap-2">
              <LcdSprite speciesId={m.speciesId} shiny={m.shiny} size="sm" className={m.currentHp <= 0 ? 'opacity-30' : ''} />
              <div className="flex-1 min-w-0">
                <LcdHpBar mon={m} label={getSpecies(m.speciesId).displayName.toUpperCase()} />
              </div>
            </div>
            <div className="text-[7px] text-emerald-500 mt-0.5">
              {m.moves.map((mv) => mv.moveId).map((id) => id).length > 0 &&
                m.moves.map((mv) => `${mv.pp}PP`).join(' · ')}
              {m.shiny ? ' · ✨' : ''}
            </div>
          </button>
        ))}
      </div>

      <div className="border-t border-emerald-900 pt-1.5">
        <LcdText dim>MOCHILA · BALLS ×{save.items['ball'] ?? 0} · {save.money} ₽</LcdText>
        {msg && <LcdText center className="text-yellow-200">{msg}</LcdText>}
        <div className="grid grid-cols-3 gap-1.5 mt-1">
          {usable.length === 0 && <LcdText dim className="col-span-3 text-center">— SIN OBJETOS —</LcdText>}
          {usable.map((id) => (
            <LcdButton
              key={id}
              active={selectedItem === id}
              onClick={() => { setMsg(null); setSelectedItem(selectedItem === id ? null : id) }}
              className="text-center"
            >
              {labelOf[id]} ×{save.items[id]}
            </LcdButton>
          ))}
        </div>
        {selectedItem && <LcdText dim center className="mt-1">TOCA UN POKÉMON PARA USARLO</LcdText>}
      </div>
      <LcdButton active onClick={() => goTo('map')} className="text-center mt-auto">◄ VOLVER</LcdButton>
    </div>
  )
}
