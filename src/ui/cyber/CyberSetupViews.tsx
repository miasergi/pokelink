// Vistas de arranque del modo: título (continuar/nueva), elección de región y
// elección de inicial. Navegación fiel al juguete: ◄ ► ciclan, ● confirma.
import { useState } from 'react'
import { useCyber } from '@/state/cyberStore'
import { GENERATIONS } from '@/data/generations'
import { STARTERS_BY_GEN } from '@/data/starters'
import { getSpecies } from '@/data'
import { useShellControls } from './CyberShell'
import { LcdTitle, LcdText, LcdButton, LcdSprite } from './lcd'

// ---- Título ----
export function TitleView() {
  const { hasSave, continueAdventure, newAdventure, abandonAdventure, save } = useCyber()
  const [confirmNew, setConfirmNew] = useState(false)

  useShellControls({
    onCenter: () => {
      if (confirmNew) return
      if (hasSave) continueAdventure()
      else newAdventure()
    },
    centerLabel: hasSave ? 'CONTINUAR' : 'EMPEZAR',
  }, [hasSave, confirmNew, continueAdventure, newAdventure])

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3">
      <div className="text-center">
        <LcdTitle>CYBER</LcdTitle>
        <div className="text-[16px] text-emerald-100 tracking-tight">POKÉBALL</div>
        <LcdText dim center>SCORNELLES · EST. 2000</LcdText>
      </div>
      <LcdSprite speciesId={25} size="md" className="animate-float" />
      <div className="flex flex-col gap-1.5 w-full max-w-[13rem]">
        {hasSave && !confirmNew && (
          <LcdButton onClick={continueAdventure} active>
            ► CONTINUAR{save ? ` · ${GENERATIONS.find((g) => g.gen === save.gen)?.region.toUpperCase() ?? ''}` : ''}
          </LcdButton>
        )}
        {hasSave ? (
          confirmNew ? (
            <>
              <LcdText center className="text-red-300">¿Borrar la aventura guardada?</LcdText>
              <LcdButton onClick={() => void abandonAdventure()}>SÍ, EMPEZAR DE CERO</LcdButton>
              <LcdButton onClick={() => setConfirmNew(false)}>NO, VOLVER</LcdButton>
            </>
          ) : (
            <LcdButton onClick={() => setConfirmNew(true)}>NUEVA AVENTURA</LcdButton>
          )
        ) : (
          <LcdButton onClick={newAdventure} active>► NUEVA AVENTURA</LcdButton>
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

  useShellControls({
    onLeft: () => setIdx((i) => (i + GENERATIONS.length - 1) % GENERATIONS.length),
    onRight: () => setIdx((i) => (i + 1) % GENERATIONS.length),
    onCenter: () => chooseRegion(gen.gen),
    centerLabel: 'OK',
  }, [gen.gen, chooseRegion])

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2">
      <LcdTitle>ELIGE REGIÓN</LcdTitle>
      <div className="flex items-center gap-3">
        <span className="text-emerald-500">◄</span>
        <div className="text-center w-32">
          <div className="text-[13px] text-emerald-100">{gen.region.toUpperCase()}</div>
          <LcdText dim center>GEN {gen.gen}</LcdText>
        </div>
        <span className="text-emerald-500">►</span>
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
      <LcdButton active onClick={() => chooseRegion(gen.gen)} className="mt-1">► VIAJAR</LcdButton>
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

  useShellControls({
    onLeft: () => setIdx((i) => (i + starters.length - 1) % starters.length),
    onRight: () => setIdx((i) => (i + 1) % starters.length),
    onCenter: () => chooseStarter(sp.id),
    centerLabel: 'ELEGIR',
  }, [sp.id, starters.length, chooseStarter])

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2">
      <LcdTitle>ELIGE COMPAÑERO</LcdTitle>
      <div className="flex items-center gap-2">
        <span className="text-emerald-500">◄</span>
        <LcdSprite speciesId={sp.id} size="lg" />
        <span className="text-emerald-500">►</span>
      </div>
      <div className="text-[12px] text-emerald-100">{sp.displayName.toUpperCase()}</div>
      <LcdText dim center>{sp.types.map((t) => t.toUpperCase()).join(' / ')} · NIVEL 3</LcdText>
      <div className="flex gap-1 mt-1">
        {starters.map((_, i) => (
          <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === idx % starters.length ? 'bg-emerald-300' : 'bg-emerald-800'}`} />
        ))}
      </div>
      <LcdButton active onClick={() => chooseStarter(sp.id)} className="mt-1">► ¡TE ELIJO A TI!</LcdButton>
    </div>
  )
}
