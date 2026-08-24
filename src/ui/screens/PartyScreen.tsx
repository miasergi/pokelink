// LA PREVIA: sección de juegos para beber en grupo, con un solo móvil que va
// pasando de mano en mano. Aislada del resto (patrón Cyber/Inazuma): sin
// runs, sin nube — lo único que persiste son los nombres de la cuadrilla y
// el toggle del pack picante (localStorage).
import { useState } from 'react'
import { useGame } from '@/state/gameStore'
import Icon from '@/ui/components/Icon'
import { play } from '@/utils/sfx'
import { PlayersEditor, loadPlayers } from '@/ui/party/partyKit'
import PicoloView from '@/ui/party/PicoloView'
import YoNuncaView from '@/ui/party/YoNuncaView'
import BotellaView from '@/ui/party/BotellaView'
import KingsView from '@/ui/party/KingsView'
import OcaView from '@/ui/party/OcaView'

type PartyGame = 'picolo' | 'yonunca' | 'botella' | 'kings' | 'oca'

const GAMES: Array<{ id: PartyGame; emoji: string; title: string; desc: string; color: string; needsPlayers?: boolean }> = [
  { id: 'picolo', emoji: '🎡', title: 'Ruleta de retos', desc: 'Retos, preguntas y virus con vuestros nombres', color: '#a78bfa', needsPlayers: true },
  { id: 'yonunca', emoji: '🙊', title: 'Yo Nunca', desc: 'Quien lo haya hecho, bebe', color: '#38bdf8' },
  { id: 'botella', emoji: '🍾', title: 'La Botella', desc: 'Gírala y que decida el destino', color: '#4ade80' },
  { id: 'kings', emoji: '👑', title: 'El Rey de Copas', desc: 'La baraja maldita del vaso del centro', color: '#fbbf24' },
  { id: 'oca', emoji: '🦆', title: 'Ocalimocho', desc: 'De oca a oca y bebe porque te toca', color: '#f472b6', needsPlayers: true },
]

export default function PartyScreen() {
  const { navigate } = useGame()
  const [game, setGame] = useState<PartyGame | null>(null)
  const [players, setPlayers] = useState<string[]>(loadPlayers)
  const [editing, setEditing] = useState(false)

  const back = () => setGame(null)

  const view = (() => {
    switch (game) {
      case 'picolo': return <PicoloView players={players} onBack={back} />
      case 'yonunca': return <YoNuncaView onBack={back} />
      case 'botella': return <BotellaView players={players} onBack={back} />
      case 'kings': return <KingsView onBack={back} />
      case 'oca': return <OcaView players={players} onBack={back} />
      default: return null
    }
  })()

  return (
    <div
      className="flex flex-col flex-1 min-h-0 relative"
      style={{
        background: 'radial-gradient(90% 60% at 85% -10%, #a78bfa22, transparent 55%), radial-gradient(80% 60% at 5% 110%, #f472b61f, transparent 60%), #0b1220',
      }}
    >
      {view ?? (
        <>
          {/* Cabecera del hub */}
          <div className="safe-top sticky top-0 z-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
            <div className="flex items-center justify-between px-3 h-12 gap-2">
              <button
                onClick={() => { play('back'); navigate('home') }}
                className="shrink-0 w-9 h-9 grid place-items-center rounded-full border border-slate-700 bg-slate-800/80 text-slate-300 active:scale-95 transition"
                aria-label="Salir a Inicio"
              >
                <Icon name="arrowRight" className="w-4 h-4 rotate-180" />
              </button>
              <div className="flex-1 text-center font-extrabold tracking-wide">🎉 La Previa</div>
              <span className="shrink-0 w-9" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-5 flex flex-col gap-3 max-w-sm w-full mx-auto">
            {/* La cuadrilla */}
            <button
              onClick={() => { play('tap'); setEditing(true) }}
              className="w-full flex items-center justify-between rounded-2xl border border-violet-500/40 bg-violet-500/10 px-4 py-3 active:scale-[0.98] transition"
            >
              <div className="text-left min-w-0">
                <div className="text-sm font-extrabold text-violet-300 inline-flex items-center gap-1.5"><Icon name="people" className="w-4 h-4" /> La cuadrilla</div>
                <div className="text-[12px] text-slate-300 truncate">
                  {players.length > 0 ? players.join(', ') : 'Apuntad vuestros nombres para jugar'}
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-bold text-violet-300">Editar ›</span>
            </button>

            {/* Los juegos */}
            {GAMES.map((g) => {
              const locked = !!g.needsPlayers && players.length < 2
              return (
                <button
                  key={g.id}
                  onClick={() => {
                    if (locked) { play('error'); setEditing(true); return }
                    play('confirm')
                    setGame(g.id)
                  }}
                  className="w-full flex items-center gap-3.5 rounded-2xl border bg-slate-900/70 px-4 py-3.5 text-left active:scale-[0.98] transition"
                  style={{ borderColor: `${g.color}44`, boxShadow: `0 12px 28px -16px ${g.color}66` }}
                >
                  <span className="shrink-0 w-12 h-12 grid place-items-center rounded-xl text-2xl" style={{ background: `${g.color}1f`, border: `1px solid ${g.color}44` }}>
                    {g.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold" style={{ color: g.color }}>{g.title}</div>
                    <div className="text-[12px] text-slate-400 truncate">{g.desc}</div>
                  </div>
                  {locked
                    ? <Icon name="lock" className="w-4 h-4 shrink-0 text-slate-500" />
                    : <Icon name="play" className="w-4 h-4 shrink-0" style={{ color: g.color }} />}
                </button>
              )
            })}

            {/* Bebe con cabeza */}
            <p className="text-center text-[10px] text-slate-500 leading-relaxed mt-1 pb-2">
              +18 · Los «tragos» siempre se pueden cambiar por sorbos, agua o pagar prenda.
              Bebed con cabeza, comed algo y nadie conduce. 🚰🚕
            </p>
          </div>
        </>
      )}

      {editing && <PlayersEditor players={players} onChange={setPlayers} onClose={() => setEditing(false)} />}
    </div>
  )
}
