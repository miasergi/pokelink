// Vistas de arranque del modo: título (continuar/nueva), elección de región y
// elección de inicial. TÁCTIL: se toca directamente en la pantalla.
import { useState } from 'react'
import { useCyber } from '@/state/cyberStore'
import { GENERATIONS } from '@/data/generations'
import { STARTERS_BY_GEN } from '@/data/starters'
import { getSpecies } from '@/data'
import { LcdTitle, LcdText, LcdButton, LcdSprite } from './lcd'

// ---- Título ----
export function TitleView() {
  const { hasSave, continueAdventure, newAdventure, abandonAdventure, save } = useCyber()
  const [confirmNew, setConfirmNew] = useState(false)
  const region = save ? GENERATIONS.find((g) => g.gen === save.gen)?.region.toUpperCase() ?? '' : ''

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3">
      <div className="text-center">
        <LcdTitle>CYBER</LcdTitle>
        <div className="text-[16px] text-emerald-100 tracking-tight">POKÉBALL</div>
        <LcdText dim center>SCORNELLES</LcdText>
      </div>
      <LcdSprite speciesId={25} size="md" className="animate-float" />

      <div className="flex flex-col gap-1.5 w-full max-w-[13rem]">
        {hasSave && !confirmNew && (
          <LcdButton active onClick={continueAdventure} className="text-center">
            ► CONTINUAR{region ? ` · ${region}` : ''}
          </LcdButton>
        )}
        {hasSave ? (
          confirmNew ? (
            <>
              <LcdText center className="text-red-300">¿Borrar la aventura guardada?</LcdText>
              <LcdButton onClick={() => void abandonAdventure()} className="text-center">SÍ, EMPEZAR DE CERO</LcdButton>
              <LcdButton onClick={() => setConfirmNew(false)} className="text-center">NO, VOLVER</LcdButton>
            </>
          ) : (
            <LcdButton onClick={() => setConfirmNew(true)} className="text-center">NUEVA AVENTURA</LcdButton>
          )
        ) : (
          <LcdButton active onClick={newAdventure} className="text-center">► NUEVA AVENTURA</LcdButton>
        )}
      </div>
      <LcdText dim center>AGITA · CAPTURA · ENTRENA</LcdText>
    </div>
  )
}

// ---- Región ----
export function RegionView() {
  const { chooseRegion } = useCyber()
  const [idx, setIdx] = useState(0)
  const gen = GENERATIONS[idx]
  const starters = STARTERS_BY_GEN[gen.gen] ?? STARTERS_BY_GEN[1]

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2">
      <LcdTitle>ELIGE REGIÓN</LcdTitle>

      <div className="flex items-center gap-2 w-full">
        <LcdButton onClick={() => setIdx((i) => (i + GENERATIONS.length - 1) % GENERATIONS.length)} className="text-base px-3">◄</LcdButton>
        <div className="flex-1 text-center">
          <div className="text-[13px] text-emerald-100">{gen.region.toUpperCase()}</div>
          <LcdText dim center>GEN {gen.gen}</LcdText>
        </div>
        <LcdButton onClick={() => setIdx((i) => (i + 1) % GENERATIONS.length)} className="text-base px-3">►</LcdButton>
      </div>

      <div className="flex gap-2 my-1">
        {starters.map((id) => <LcdSprite key={id} speciesId={id} size="sm" />)}
      </div>
      <div className="flex gap-1">
        {GENERATIONS.map((_, i) => (
          <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === idx ? 'bg-emerald-300' : 'bg-emerald-800'}`} />
        ))}
      </div>
      <LcdText dim center>CON LOS LÍDERES Y EL RIVAL DE {gen.region.toUpperCase()}</LcdText>
      <LcdButton active onClick={() => chooseRegion(gen.gen)} className="text-center w-full mt-1">► VIAJAR</LcdButton>
    </div>
  )
}

// ---- Inicial ----
export function StarterView() {
  const { pendingGen, chooseStarter } = useCyber()
  // Guiño al juguete: en Kanto también puedes elegir a Pikachu.
  const starters = [...(STARTERS_BY_GEN[pendingGen] ?? STARTERS_BY_GEN[1]), ...(pendingGen === 1 ? [25] : [])]
  const [idx, setIdx] = useState(0)
  const sp = getSpecies(starters[idx % starters.length])

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2">
      <LcdTitle>ELIGE COMPAÑERO</LcdTitle>

      {/* Todos visibles y tocables */}
      <div className="flex gap-1.5 justify-center flex-wrap">
        {starters.map((id, i) => (
          <button
            key={id}
            onClick={() => setIdx(i)}
            className={`rounded-lg border-2 p-1 transition active:scale-95 ${
              i === idx % starters.length ? 'border-emerald-300 bg-emerald-400/20' : 'border-emerald-900 opacity-60'
            }`}
          >
            <LcdSprite speciesId={id} size="sm" />
          </button>
        ))}
      </div>

      <LcdSprite speciesId={sp.id} size="lg" className="animate-float" />
      <div className="text-[12px] text-emerald-100">{sp.displayName.toUpperCase()}</div>
      <LcdText dim center>{sp.types.map((t) => t.toUpperCase()).join(' / ')} · NIVEL 3</LcdText>

      <LcdButton active onClick={() => chooseStarter(sp.id)} className="text-center w-full mt-1">► ¡TE ELIJO A TI!</LcdButton>
    </div>
  )
}
