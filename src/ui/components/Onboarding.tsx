import { useState } from 'react'
import { Button } from './kit'

const STEPS = [
  { icon: '🗺️', title: 'Explora el mapa', text: 'Avanzas por rutas ramificadas. Elige bien tu camino: al entrar en un nodo bloqueas las alternativas de esa capa.' },
  { icon: '⚔️', title: 'Combates automáticos', text: 'Los combates se resuelven solos según tipos, stats y movimientos. Ajusta la velocidad (1×/2×/4×) o salta la animación.' },
  { icon: '👥', title: 'Construye tu equipo', text: 'Captura Pokémon, equípales objetos y reordénalos arrastrando el asa ⠿. El primero del equipo es el líder.' },
  { icon: '🏅', title: 'Jefes y Liga Pokémon', text: 'Vence a los 8 líderes, al Alto Mando y al Campeón. Toca un jefe para ver su equipo y debilidades antes de luchar.' },
  { icon: '💠', title: 'Megaevolución', text: 'Equipa una Mega Piedra a un Pokémon compatible (Charizard, Venusaur…) y megaevolucionará al entrar en combate.' },
  { icon: '🎒', title: 'Objetos con estrategia', text: 'Equipables (Banda Experto, Mineraluz, Amuleto Relevo…), Mejoras de potencia, Metamorfosis para formas regionales y más. En el equipo, toca "⚖ Comparar" para decidir mejor.' },
  { icon: '💎', title: 'Nodos arriesgados', text: 'Algunos combates de ruta (💎) traen enemigos más fuertes pero doble dinero y un objeto garantizado. Siempre tendrás una alternativa segura.' },
  { icon: '🏅', title: 'Logros y ranking', text: 'Gana logros, elige un compañero para Inicio y sube tus mejores tiempos al ranking online. ¡Prueba el Reto diario, igual para todos cada día!' },
]

export default function Onboarding({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const step = STEPS[i]
  const last = i === STEPS.length - 1
  return (
    <div className="absolute inset-0 z-[60] bg-slate-950/90 backdrop-blur grid place-items-center p-6">
      <div className="w-full max-w-sm flex flex-col items-center text-center gap-4 animate-pop-in">
        <div className="text-6xl">{step.icon}</div>
        <h2 className="text-2xl font-extrabold">{step.title}</h2>
        <p className="text-slate-300 text-sm min-h-[4.5rem]">{step.text}</p>
        <div className="flex gap-1.5">
          {STEPS.map((_, idx) => (
            <span key={idx} className={`w-2 h-2 rounded-full ${idx === i ? 'bg-red-500' : 'bg-slate-600'}`} />
          ))}
        </div>
        <div className="w-full flex gap-2 mt-2">
          {!last && (
            <Button variant="ghost" className="flex-1" onClick={onClose}>Saltar</Button>
          )}
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => (last ? onClose() : setI(i + 1))}
          >
            {last ? '¡Jugar!' : 'Siguiente ›'}
          </Button>
        </div>
      </div>
    </div>
  )
}
