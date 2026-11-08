// Pantalla del modo Corsarios: gacha de piratas y conquista de islas. Igual
// que los otros modos de la sala, es su única puerta y no comparte estado con
// el roguelike Pokémon.
import { useEffect } from 'react'
import { startMusic, stopMusic } from '@/utils/music'
import { useSettings } from '@/state/settingsStore'
import { useCorsarios } from '@/state/corsariosStore'
import { ISLAS } from '@/data/corsarios/islas'
import { Cabecera, IslasView, Navegacion, SetupView } from '@/ui/corsarios/Views'
import BattleView from '@/ui/corsarios/BattleView'
import TabernaView from '@/ui/corsarios/TabernaView'
import TripulacionView from '@/ui/corsarios/TripulacionView'
import PuertoView, { Aviso, EscenaOverlay } from '@/ui/corsarios/PuertoView'

export default function CorsariosScreen() {
  const { cargado, vista, init, batalla } = useCorsarios()
  useEffect(() => { void init() }, [init])

  const music = useSettings((s) => s.music)
  const jefe = batalla ? (batalla.mar ? batalla.fase % 5 === 0 : !!ISLAS[batalla.isla].fases[batalla.fase].jefe) : false
  useEffect(() => {
    if (!music || vista === 'setup') { stopMusic(); return }
    startMusic(vista === 'batalla' ? (jefe ? 'boss' : 'battle') : 'map')
    return () => stopMusic()
  }, [vista, music, jefe])

  return (
    <div className="flex flex-col flex-1 min-h-0 relative"
      style={{ background: 'radial-gradient(90% 55% at 85% -10%, #f59e0b1f, transparent 60%), radial-gradient(90% 60% at 0% 110%, #0284c733, transparent 60%), #071022' }}>
      {!cargado ? null
        : vista === 'setup' ? <SetupView />
        : vista === 'batalla' ? <BattleView />
        : (
          <>
            <Cabecera />
            {vista === 'islas' && <IslasView />}
            {vista === 'taberna' && <TabernaView />}
            {vista === 'tripulacion' && <TripulacionView />}
            {vista === 'puerto' && <PuertoView />}
            <Navegacion />
          </>
        )}
      <EscenaOverlay />
      <Aviso />
    </div>
  )
}
