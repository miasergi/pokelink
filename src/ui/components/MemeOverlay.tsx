import { useMemo } from 'react'
import Sprite from './Sprite'

const WIN = [
  'GG, otro que muerde el polvo 🏆',
  '¿Eso era un líder? 😎',
  'Demasiado fácil... ¿hay más?',
  'El gimnasio entero llora 😭',
  'EZ Clap 👏',
  'Nadie puede conmigo 💪',
  'Otro más para la colección 📿',
  'Esto es arte 🎨',
]
const LOSE = [
  'Skill issue 💀',
  'Te confiaste, ¿eh? 🤡',
  'GG, a llorar a Pueblo Paleta 😢',
  'F en el chat 🪦',
  'Esto no estaba en el guion...',
  'Era buen equipo... era 🥀',
  'La próxima es la buena (mentira) 🙃',
  'Mis Pokémon dijeron "hoy no" 😴',
]

/** Mini "shitpost": un sprite + una frase tipo meme. Toca para continuar. */
export default function MemeOverlay({
  mood, speciesId, shiny, onClose,
}: {
  mood: 'win' | 'lose'
  speciesId: number
  shiny?: boolean
  onClose: () => void
}) {
  const caption = useMemo(() => {
    const pool = mood === 'win' ? WIN : LOSE
    return pool[Math.floor((speciesId * 7 + Date.now() / 1000) % pool.length)]
  }, [mood, speciesId])

  return (
    <div
      className="absolute inset-0 z-[70] grid place-items-center p-6 cursor-pointer"
      style={{ background: mood === 'win' ? 'rgba(2,30,12,0.92)' : 'rgba(30,2,6,0.92)' }}
      onClick={onClose}
    >
      <div className="flex flex-col items-center gap-3 text-center animate-pop-in max-w-sm">
        <div
          className="font-black uppercase leading-none"
          style={{ fontSize: 26, color: '#fff', textShadow: '0 0 2px #000, 0 3px 8px rgba(0,0,0,0.9)', letterSpacing: '-0.5px' }}
        >
          {caption}
        </div>
        <div
          className="rounded-3xl p-2"
          style={{ background: mood === 'win' ? 'radial-gradient(circle,#16a34a55,transparent 70%)' : 'radial-gradient(circle,#dc262655,transparent 70%)' }}
        >
          <Sprite speciesId={speciesId} shiny={shiny} className={`w-44 h-44 object-contain drop-shadow-2xl ${mood === 'lose' ? 'grayscale-[40%]' : ''}`} />
        </div>
        <div className="text-white/70 text-xs animate-pulse">toca para continuar ›</div>
      </div>
    </div>
  )
}
