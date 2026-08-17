// ANIMACIÓN PROCEDURAL FIEL de cada supertécnica.
//
// El objetivo: que la Mano Celestial sea UNA MANO que para, que la Mano
// Demoníaca saque AL DEMONIO, que el Tornado de Fuego envuelva el balón en un
// tornado de llamas. Con 500+ técnicas no se dibujan 500 vídeos: se dibuja
// una BIBLIOTECA DE MOTIVOS (mano gigante, demonio, dragón, tornado,
// ventisca, pingüinos, alas, tajo, ola, rayo, muralla, bruma, meteoro, puño,
// espejismos) y cada técnica COMPONE los suyos:
//   1º su entrada CURADA a mano (las famosas),
//   2º si no, sus motivos se deducen del NOMBRE (es sorprendentemente fiel:
//      «Mano Fantasma» → mano + bruma; «Ventisca Eterna» → ventisca),
//   3º y si nada casa, el arquetipo de su clase (tiro/regate/bloqueo/parada).
// El elemento pinta color y partículas; la potencia, la intensidad.
import Icon from '@/ui/components/Icon'
import { ELEMENT_INFO } from '@/engine/inazuma/elements'
import { SvgBall } from '@/ui/inazuma/Glyphs'
import type { Element, Technique, TechniqueKind } from '@/engine/inazuma/types'

type Motif =
  | 'mano' | 'demonio' | 'sacro' | 'tornado' | 'ventisca' | 'dragon'
  | 'pinguino' | 'rayo' | 'alas' | 'tajo' | 'muralla' | 'ola' | 'bruma'
  | 'meteoro' | 'puno' | 'espejismo'

/** Entradas CURADAS: las técnicas famosas, con sus motivos exactos. */
const CURATED: Record<string, Motif[]> = {
  'god-hand': ['mano', 'sacro'],
  'majin-the-hand': ['demonio', 'mano'],
  'mugen-the-hand': ['mano', 'espejismo'],
  'ijigen-the-hand': ['mano', 'bruma'],
  'god-catch': ['sacro', 'mano'],
  'fire-tornado': ['tornado'],
  'eternal-blizzard': ['ventisca'],
  'dragon-crash': ['dragon'],
  'dragon-tornado': ['dragon', 'tornado'],
  'wyvern-crash': ['dragon', 'alas'],
  excalibur: ['tajo', 'sacro'],
  'the-wall': ['muralla'],
  'the-mountain': ['muralla'],
  'inabikari-dash': ['rayo', 'espejismo'],
  'lightning-accel': ['rayo'],
  'god-wind': ['alas', 'sacro'],
  tsunami: ['ola'],
  'the-typhoon': ['tornado', 'ola'],
  'majin-the-wave': ['demonio', 'ola'],
  'shadow-ray': ['bruma', 'rayo'],
  'oni-kick': ['demonio', 'puno'],
  'space-penguin': ['pinguino', 'meteoro'],
  // Segunda tanda de curación: los huecos y los fallos de deducción del
  // top-120 de técnicas más vistas en juego.
  'the-ikaros': ['alas', 'sacro'],
  gorimuchuu: ['demonio', 'bruma'],
  'southern-crosscut': ['tajo', 'meteoro'],
  'dokonjou-bat': ['puno'],
  'shine-drive': ['rayo'],
  'aurora-dribble': ['ventisca', 'sacro'],
  'super-armadillo': ['tornado', 'puno'],
  'kangaroo-kick': ['puno'],
  'shoot-pocket': ['mano'],
  'run-ball-run': ['espejismo'],
  'super-elastico': ['espejismo'],
  'paladin-strike': ['tajo', 'sacro'],
  'judge-through': ['sacro', 'espejismo'],
  'judge-through-3': ['sacro', 'espejismo'],
  'dynamite-shoot': ['meteoro'],
  'triangle-z': ['espejismo', 'rayo'],
  'niagara-falls': ['ola'],
  'kung-fu-attack': ['puno'],
  'cross-drive': ['tajo'],
  'tsuchi-daruma': ['muralla'],
  'makiwari-chop': ['tajo', 'puno'],
  'fuusen-gum': ['muralla'],
  'freeze-shot': ['ventisca'],
  'rocket-kobushi': ['puno', 'meteoro'],
  'drill-smasher': ['puno', 'tornado'],
  'honoo-no-kazamidori': ['alas', 'tornado'],
  'northern-impact': ['ventisca', 'meteoro'],
  'killer-fields': ['muralla', 'rayo'],
  'death-zone': ['bruma', 'meteoro'],
  'frozen-steal': ['ventisca', 'espejismo'],
  'sabaki-no-tettsui': ['sacro', 'puno'],
  'zigzag-spark': ['rayo', 'espejismo'],
  'ryuusei-blade': ['meteoro', 'tajo'],
  'gaia-break': ['puno', 'muralla'],
  'atomic-flare': ['tornado', 'meteoro'],
  'mogura-feint': ['muralla', 'espejismo'],
}

/**
 * Deducción por NOMBRE (id inglés + nombre español a la vez): la mayoría de
 * las técnicas DICEN lo que hacen. Orden = prioridad.
 */
const RULES: [RegExp, Motif][] = [
  [/pinguino|penguin/, 'pinguino'],
  [/demon|majin|diablo|oni\b|akuma|bestia|beast|ogr/, 'demonio'],
  [/mano|hand|palm|catch\b/, 'mano'],
  [/celestial|god|divin|sagrad|angel|heaven|arcangel|santo|holy/, 'sacro'],
  [/tornado|ciclon|cyclone|huracan|hurricane|torbellino|espiral|spiral|tifon|typhoon|vortice|storm|tormenta/, 'tornado'],
  [/ventisca|blizzard|hielo|\bice\b|nieve|snow|glacial|frost|congel/, 'ventisca'],
  [/dragon|drago|ryuu|wyvern|guiverno/, 'dragon'],
  [/rayo|relampago|thunder|lightning|trueno|volt|electr|plasma|inazuma/, 'rayo'],
  [/pajaro|bird|aguila|eagle|fenix|phoenix|\bala\b|alas|wing|pluma|feather|halcon|falcon|golondrina|swallow|garuda|cuervo/, 'alas'],
  [/corte|\bcut\b|slash|espada|sword|blade|filo|cuchilla|guadaña|scythe|zanba|claw|garra/, 'tajo'],
  [/muro|wall|torre|tower|fortaleza|fortress|castillo|castle|barrera|barrier|escudo|shield|montaña|mountain|rock|roca/, 'muralla'],
  [/\bola\b|wave|tsunami|marea|aqua|agua|hidro|hydro|surf|ocean|splash/, 'ola'],
  [/sombra|shadow|oscur|dark|fantasma|phantom|ghost|niebla|mist|humo|smoke|bruja|witch|espectro/, 'bruma'],
  [/meteor|cometa|comet|estrella|star|cosmic|cosmos|espac|space|galax|nova|astro|lunar|luna|moon/, 'meteoro'],
  [/puño|punch|fist|knuckle|smash|golpe/, 'puno'],
  [/clon|clone|espejismo|mirage|ilusion|illusion|doble|zanzo|bunshin|fantasia|copia/, 'espejismo'],
  // Segunda pasada de vocabulario: lo que el catálogo usa de verdad.
  [/hell|infern|hades|averno/, 'demonio'],
  [/terremoto|quake|seism|temblor|tierra|earth/, 'muralla'],
  [/gravit|orbita|orbit|agujero|hole|dimension/, 'meteoro'],
  [/sumo|pisoton|stomp|placaje|tackle|carga|charge|embestida/, 'puno'],
  [/explos|bomba|bomb|blast|impacto|impact|granada|grenade|misil|missile|torpedo|bala|bullet|cañon|cannon|flecha|arrow|lanza|spear/, 'meteoro'],
  [/circo|circense|circus|acrobat|pirueta|voltereta|salto|jump|aereo|mortal/, 'espejismo'],
  [/falso|fake|amago|feint|finta|engaño|trick|truco/, 'espejismo'],
  [/escaner|scan|laser|beam|foton|photon|luz|light/, 'rayo'],
  [/giro|spin|vuelta|rotacion|molino|rueda|peonza|trompo|rodillo|roll/, 'tornado'],
  [/volcan|erupcion|erup|magma|lava/, 'muralla'],
  [/red|net|tela|web|araña|spider|cadena|chain|atadura|bind/, 'muralla'],
  [/viento|wind|vendaval|brisa|gale|aire/, 'tornado'],
  [/samurai|shogun|kabuto|ninja|shuriken|katana/, 'tajo'],
  [/gigante|giant|coloso|titan|golem|mole/, 'puno'],
  [/robo|steal|ladron|thief|intercep/, 'espejismo'],
  [/flame|llama|blaze|igni|igneo|fire|fuego|ardiente/, 'tornado'],
  [/zona|zone|perimetr|area|presion|press|marca/, 'muralla'],
  [/acero|steel|hierro|iron|metal|temple/, 'muralla'],
  [/ballena|whale|tiburon|shark|kraken|pulpo|octopus|orca|delfin|dolphin|pez|fish|marino|kaiju|monstruo|monster/, 'demonio'],
  [/cosecha|harvest|raiz|root|hiedra|ivy|espina|thorn|bosque|forest|selva|jungla|flor|flower|petalo|petal|semilla|seed/, 'muralla'],
  [/zigzag|relampag|racing|turbo|acele|accel|sprint|dash|veloz|rapido|quick|sonic|mach/, 'espejismo'],
  [/cabeza|head|cabezazo|remate|volea|volley|chilena|tijera|scissor/, 'puno'],
  [/tiempo|time|reloj|clock|pausa|freeze|deten/, 'meteoro'],
  [/piedra|stone|grave|tumba|tomb|prision|prison|jaula|cage|celosia|bambu|bamboo|empalizada/, 'muralla'],
  [/asteroide|asteroid|planeta|planet|satelite|satellite|universo|universe/, 'meteoro'],
  [/asesin|killer|deadly|mortal|swipe|barrida|segada|slide/, 'tajo'],
  [/polvo|dust|somnifero|sleep|veneno|poison|gas|aroma|perfume/, 'bruma'],
  [/vac|vacio|void|absorb|succion|suction|iman|magnet/, 'meteoro'],
  [/escapatoria|escape|trampa|trap|candado|lock|cierre|cerrojo/, 'muralla'],
  [/baile|dance|danza|samba|tango|ritmo|rhythm|fiesta|carnaval/, 'espejismo'],
]

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Motivos de una técnica: curado → por nombre (máx. 2) → ninguno. */
export function motifsFor(tech: { id: string; name: string }): Motif[] {
  if (CURATED[tech.id]) return CURATED[tech.id]
  const hay = `${norm(tech.id.replace(/-/g, ' '))} ${norm(tech.name)}`
  const out: Motif[] = []
  for (const [re, m] of RULES) {
    if (out.length >= 2) break
    if (re.test(hay) && !out.includes(m)) out.push(m)
  }
  return out
}

/** Forma de partícula por elemento: llama, ráfaga, hoja, roca. */
function Particle({ element, color, size }: { element: Element; color: string; size: number }) {
  if (element === 'aire') {
    return <span className="block blur-[1px]" style={{ width: size * 2.4, height: Math.max(2, size * 0.35), background: color, transform: 'skewX(-30deg)', borderRadius: 999 }} />
  }
  if (element === 'bosque') {
    return <span className="block blur-[0.5px]" style={{ width: size, height: size, background: color, borderRadius: '80% 0 80% 0', transform: 'rotate(45deg)' }} />
  }
  if (element === 'montana') {
    return <span className="block" style={{ width: size, height: size, background: color, transform: 'rotate(45deg)', borderRadius: 2 }} />
  }
  return <span className="block blur-[2px] rounded-full" style={{ width: size, height: size, background: `radial-gradient(circle, #ffffff77, ${color})` }} />
}

// ---------------------------------------------------------------------------
// LA BIBLIOTECA DE MOTIVOS (SVG estilizado + animación)
// ---------------------------------------------------------------------------

function ManoGigante({ color }: { color: string }) {
  // La palma abierta plantada ante el balón: God Hand y familia.
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-x-0 bottom-0 h-[86%] w-full fx-loom" style={{ filter: `drop-shadow(0 0 14px ${color})` }}>
      <g fill={color} opacity=".92">
        <rect x="30" y="46" width="40" height="44" rx="12" />
        <rect x="30" y="18" width="9" height="38" rx="4.5" />
        <rect x="41" y="12" width="9" height="44" rx="4.5" />
        <rect x="52" y="14" width="9" height="42" rx="4.5" />
        <rect x="63" y="20" width="8" height="36" rx="4" />
        <rect x="20" y="48" width="12" height="9" rx="4.5" transform="rotate(-28 26 52)" />
      </g>
      <g fill="#ffffff" opacity=".25">
        <rect x="34" y="50" width="32" height="6" rx="3" />
      </g>
    </svg>
  )
}

function Demonio({ color }: { color: string }) {
  // El demonio asomando tras la portería: cuernos, hombros y ojos encendidos.
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-x-0 bottom-0 h-[92%] w-full fx-loom" style={{ filter: `drop-shadow(0 0 16px ${color})` }}>
      <g fill="#0b0716" opacity=".96">
        <path d="M18 100 C14 62 30 44 50 44 C70 44 86 62 82 100 Z" />
        <circle cx="50" cy="34" r="16" />
        <path d="M36 26 C30 12 24 10 20 4 C30 8 36 12 40 20 Z" />
        <path d="M64 26 C70 12 76 10 80 4 C70 8 64 12 60 20 Z" />
      </g>
      <g className="fx-crackle">
        <circle cx="44" cy="33" r="3.4" fill={color} />
        <circle cx="56" cy="33" r="3.4" fill={color} />
      </g>
      <path d="M42 42 C46 45 54 45 58 42 L56 47 L44 47 Z" fill={color} opacity=".8" />
    </svg>
  )
}

function Dragon({ color }: { color: string }) {
  // La serpiente dragón ondulando alrededor de la escena.
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full fx-undulate" style={{ filter: `drop-shadow(0 0 12px ${color})` }}>
      <path d="M6 74 C22 58 30 82 46 66 C62 50 66 74 84 58" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" opacity=".9" />
      <path d="M6 74 C22 58 30 82 46 66 C62 50 66 74 84 58" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" opacity=".5" />
      <g transform="translate(80 50)">
        <path d="M0 8 L16 0 L4 14 L14 16 L0 22 Z" fill={color} />
        <circle cx="7" cy="9" r="2" fill="#ffffff" />
      </g>
    </svg>
  )
}

function Tornado({ color, element }: { color: string; element: Element }) {
  // El cono de viento: elipses apiladas girando a velocidades distintas.
  return (
    <div className="absolute inset-0 grid place-items-center">
      {[64, 50, 38, 26, 16].map((w, i) => (
        <span
          key={i}
          className="absolute rounded-[999px] border-2 fx-orbit"
          style={{
            width: `${w}%`,
            height: `${9 - i}%`,
            bottom: `${14 + i * 15}%`,
            borderColor: color,
            opacity: 0.85 - i * 0.1,
            ['--fx-r' as string]: '3px',
            ['--fx-t' as string]: `${0.55 + i * 0.12}s`,
            boxShadow: `0 0 10px ${color}66`,
          }}
        />
      ))}
      <span className="absolute bottom-[8%]"><Particle element={element} color={color} size={10} /></span>
    </div>
  )
}

function Ventisca({ color }: { color: string }) {
  // Cristales de hielo cruzando en diagonal con viento blanco.
  return (
    <div className="absolute inset-0">
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="absolute fx-dash" style={{ top: `${8 + i * 10}%`, left: '6%', width: '88%', animationDelay: `-${i * 0.13}s` }}>
          <span className="block" style={{ width: 10 + (i % 3) * 5, height: 10 + (i % 3) * 5, background: `linear-gradient(135deg, #ffffff, ${color})`, clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
        </span>
      ))}
      <div className="absolute inset-0" style={{ background: `linear-gradient(105deg, transparent 30%, ${color}22 50%, transparent 70%)` }} />
    </div>
  )
}

function Pinguinos({ color }: { color: string }) {
  // Los pingüinos emperador en formación, escoltando el disparo.
  const P = ({ x, d }: { x: number; d: number }) => (
    <svg viewBox="0 0 40 52" className="absolute bottom-[12%] w-[22%] fx-march" style={{ left: `${x}%`, animationDelay: `${d}s`, filter: `drop-shadow(0 0 8px ${color})` }}>
      <ellipse cx="20" cy="30" rx="13" ry="18" fill="#101828" />
      <ellipse cx="20" cy="33" rx="8" ry="12" fill="#f8fafc" />
      <circle cx="20" cy="12" r="9" fill="#101828" />
      <circle cx="17" cy="10" r="1.8" fill="#fff" />
      <circle cx="23" cy="10" r="1.8" fill="#fff" />
      <path d="M17 14 L23 14 L20 19 Z" fill={color} />
      <path d="M7 26 C4 32 5 38 9 42 L12 30 Z" fill="#101828" />
      <path d="M33 26 C36 32 35 38 31 42 L28 30 Z" fill="#101828" />
    </svg>
  )
  return (
    <div className="absolute inset-0">
      <P x={12} d={0} /><P x={39} d={0.18} /><P x={66} d={0.36} />
    </div>
  )
}

function Rayo({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full fx-crackle" style={{ filter: `drop-shadow(0 0 12px ${color})` }}>
      <path d="M56 2 L30 44 L46 46 L36 78 L70 36 L52 34 L64 2 Z" fill={color} opacity=".95" />
      <path d="M56 2 L30 44 L46 46 L36 78" fill="none" stroke="#ffffff" strokeWidth="2" opacity=".6" />
    </svg>
  )
}

function Alas({ color }: { color: string }) {
  // Dos alas batiendo con plumas sueltas.
  return (
    <div className="absolute inset-0 grid place-items-center">
      <svg viewBox="0 0 100 60" className="w-[86%]">
        <g className="fx-flap" style={{ transformOrigin: '50% 60%' }}>
          <path d="M50 42 C34 18 16 12 2 18 C14 26 20 34 26 44 C32 40 42 40 50 42 Z" fill={color} opacity=".9" style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
        </g>
        <g className="fx-flap" style={{ transformOrigin: '50% 60%', animationDelay: '.1s', transform: 'scaleX(-1)', transformBox: 'fill-box' }}>
          <path d="M50 42 C66 18 84 12 98 18 C86 26 80 34 74 44 C68 40 58 40 50 42 Z" fill={color} opacity=".9" style={{ filter: `drop-shadow(0 0 10px ${color})` }} />
        </g>
      </svg>
      {[0, 1, 2].map((i) => (
        <span key={i} className="absolute fx-float-up" style={{ left: `${28 + i * 22}%`, bottom: '30%', animationDelay: `-${i * 0.5}s` }}>
          <span className="block" style={{ width: 8, height: 12, background: color, borderRadius: '80% 0 80% 0', opacity: 0.8 }} />
        </span>
      ))}
    </div>
  )
}

function Tajo({ color }: { color: string }) {
  // El arco del corte barriendo la escena, con su destello.
  return (
    <div className="absolute inset-0 overflow-hidden">
      {[0, 1].map((i) => (
        <span
          key={i}
          className="absolute left-0 top-1/2 w-full fx-slash"
          style={{ height: 5 - i * 2, background: `linear-gradient(90deg, transparent, #ffffff, ${color}, transparent)`, animationDelay: `${i * 0.5}s`, boxShadow: `0 0 12px ${color}` }}
        />
      ))}
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
        <path d="M18 82 C40 60 60 40 84 16" fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="4 7" opacity=".7" />
      </svg>
    </div>
  )
}

function Muralla({ color, element }: { color: string; element: Element }) {
  return (
    <div
      className="absolute inset-x-3 bottom-0 h-[64%] fx-rise"
      style={{
        background: `linear-gradient(to top, ${color}, ${color}55 70%, transparent)`,
        clipPath: element === 'montana'
          ? 'polygon(0% 100%, 12% 46%, 26% 72%, 40% 22%, 55% 60%, 70% 10%, 84% 55%, 100% 100%)'
          : 'polygon(0% 100%, 0% 40%, 10% 40%, 10% 30%, 24% 30%, 24% 40%, 40% 40%, 40% 28%, 56% 28%, 56% 40%, 72% 40%, 72% 30%, 88% 30%, 88% 40%, 100% 40%, 100% 100%)',
        filter: `drop-shadow(0 0 12px ${color}88)`,
      }}
    />
  )
}

function Ola({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 60" className="absolute inset-x-0 bottom-0 w-full h-[70%] fx-undulate" style={{ filter: `drop-shadow(0 0 12px ${color})` }}>
      <path d="M0 60 L0 34 C12 22 20 40 32 30 C44 20 50 38 62 26 C74 16 84 30 100 18 L100 60 Z" fill={color} opacity=".85" />
      <path d="M0 34 C12 22 20 40 32 30 C44 20 50 38 62 26 C74 16 84 30 100 18" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity=".6" />
    </svg>
  )
}

function Bruma({ color }: { color: string }) {
  return (
    <div className="absolute inset-0">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className="absolute rounded-full blur-xl fx-sway"
          style={{ width: '46%', height: '34%', left: `${(i * 17) % 60}%`, top: `${12 + (i * 19) % 55}%`, background: i % 2 ? '#0b0716cc' : `${color}55`, animationDelay: `-${i * 0.6}s` }}
        />
      ))}
    </div>
  )
}

function Meteoro({ color }: { color: string }) {
  return (
    <div className="absolute inset-0">
      {[0, 1, 2].map((i) => (
        <span key={i} className="absolute fx-dash" style={{ top: `${14 + i * 22}%`, left: '4%', width: '92%', animationDelay: `-${i * 0.45}s`, transform: 'rotate(18deg)' }}>
          <span className="relative block w-4 h-4 rounded-full" style={{ background: `radial-gradient(circle, #ffffff, ${color})`, boxShadow: `-14px 0 16px 2px ${color}88` }} />
        </span>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <span key={`s${i}`} className="absolute fx-crackle" style={{ left: `${15 + i * 22}%`, top: `${20 + (i * 23) % 50}%`, animationDelay: `-${i * 0.3}s` }}>
          <span className="block w-1.5 h-1.5 rounded-full bg-white" />
        </span>
      ))}
    </div>
  )
}

function Puno({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-x-0 bottom-0 h-[80%] w-full fx-punch" style={{ filter: `drop-shadow(0 0 14px ${color})` }}>
      <g fill={color} opacity=".92">
        <rect x="28" y="40" width="44" height="34" rx="12" />
        <rect x="30" y="30" width="10" height="16" rx="5" />
        <rect x="42" y="27" width="10" height="18" rx="5" />
        <rect x="54" y="28" width="10" height="17" rx="5" />
        <rect x="66" y="32" width="8" height="14" rx="4" />
        <rect x="36" y="72" width="28" height="20" rx="9" />
      </g>
    </svg>
  )
}

function Espejismo({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      {[0, 1, 2].map((i) => (
        <span key={i} className="absolute fx-dash" style={{ top: `${34 + i * 12}%`, left: '8%', width: '84%', animationDelay: `-${i * 0.33}s` }}>
          <SvgBall className="w-9 h-9" />
        </span>
      ))}
      <span className="absolute inset-0" style={{ background: `linear-gradient(90deg, transparent, ${color}18, transparent)` }} />
    </div>
  )
}

function MotifLayer({ motif, color, element }: { motif: Motif; color: string; element: Element }) {
  switch (motif) {
    case 'mano': return <ManoGigante color={color} />
    case 'demonio': return <Demonio color={color} />
    case 'sacro': return (
      <div className="absolute inset-0">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="absolute bottom-0 blur-[2px]" style={{ left: `${12 + i * 18}%`, width: 8, height: '85%', background: `linear-gradient(to top, ${color}00, #fff7 40%, ${color}00)`, transform: `rotate(${(i - 2) * 7}deg)`, transformOrigin: 'bottom' }} />
        ))}
      </div>
    )
    case 'tornado': return <Tornado color={color} element={element} />
    case 'ventisca': return <Ventisca color={color} />
    case 'dragon': return <Dragon color={color} />
    case 'pinguino': return <Pinguinos color={color} />
    case 'rayo': return <Rayo color={color} />
    case 'alas': return <Alas color={color} />
    case 'tajo': return <Tajo color={color} />
    case 'muralla': return <Muralla color={color} element={element} />
    case 'ola': return <Ola color={color} />
    case 'bruma': return <Bruma color={color} />
    case 'meteoro': return <Meteoro color={color} />
    case 'puno': return <Puno color={color} />
    case 'espejismo': return <Espejismo color={color} />
  }
}

// ---------------------------------------------------------------------------
// Arquetipos base por clase (el fondo sobre el que actúan los motivos)
// ---------------------------------------------------------------------------

function BaseKind({ kind, element, color, n }: { kind: TechniqueKind; element: Element; color: string; n: number }) {
  const parts = Array.from({ length: n }, (_, i) => i)
  if (kind === 'tiro') {
    return (
      <div className="absolute inset-0 grid place-items-center">
        <div className="relative">
          <SvgBall className="w-12 h-12 fx-charge drop-shadow-lg" />
          {parts.map((i) => (
            <span key={i} className="absolute left-1/2 top-1/2 fx-orbit" style={{ ['--fx-r' as string]: `${40 + (i % 3) * 13}px`, ['--fx-t' as string]: `${0.9 + (i % 4) * 0.18}s`, animationDelay: `-${(i / n) * 1.1}s` }}>
              <Particle element={element} color={color} size={9 + (i % 3) * 4} />
            </span>
          ))}
        </div>
      </div>
    )
  }
  if (kind === 'regate') {
    return (
      <div className="absolute inset-0">
        {parts.slice(0, Math.ceil(n / 2)).map((i) => (
          <span key={i} className="absolute fx-dash" style={{ top: `${16 + (i * 70) / Math.ceil(n / 2)}%`, left: '10%', width: '80%', animationDelay: `-${(i / n) * 1.05}s` }}>
            <Particle element={element} color={color} size={8 + (i % 3) * 4} />
          </span>
        ))}
      </div>
    )
  }
  if (kind === 'bloqueo') {
    return (
      <div className="absolute inset-0">
        {parts.slice(0, Math.ceil(n / 2)).map((i) => (
          <span key={i} className="absolute fx-float-up" style={{ left: `${15 + (i * 70) / Math.ceil(n / 2)}%`, bottom: '16%', animationDelay: `-${(i / n) * 1.5}s` }}>
            <Particle element={element} color={color} size={7 + (i % 3) * 3} />
          </span>
        ))}
      </div>
    )
  }
  return (
    <div className="absolute inset-0 grid place-items-center">
      {[0, 1, 2].map((i) => (
        <span key={i} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-4 fx-ring" style={{ borderColor: color, animationDelay: `${i * 0.38}s` }} />
      ))}
    </div>
  )
}

export default function TechniqueFX({ tech, className = '', bare = false }: {
  tech: Pick<Technique, 'id' | 'name' | 'kind' | 'element' | 'power'>
  className?: string
  /** EN EL CÉSPED: sin caja, sin fondo oscuro ni recorte — los motivos y las
      partículas brotan directamente sobre la hierba, con un AURA del elemento
      como base. La versión con caja queda para escenarios (penaltis). */
  bare?: boolean
}) {
  const color = ELEMENT_INFO[tech.element].color
  const n = Math.max(6, Math.min(12, Math.round(tech.power / 12)))
  const motifs = motifsFor(tech)

  const layers = (
    <>
      {/* El fondo de su clase (partículas), y encima SUS motivos. */}
      <BaseKind kind={tech.kind} element={tech.element} color={color} n={n} />
      {motifs.length === 0 && tech.kind === 'parada' && (
        <div className="absolute inset-0 grid place-items-center">
          <Icon name="glove" className="w-16 h-16 fx-charge" style={{ color }} />
        </div>
      )}
      {motifs.map((m, i) => (
        <div key={m} className="absolute inset-0" style={{ opacity: i === 0 ? 1 : 0.65 }}>
          <MotifLayer motif={m} color={color} element={tech.element} />
        </div>
      ))}
    </>
  )

  if (bare) {
    return (
      <div className={`relative w-full h-full ${className}`}>
        {/* AURA en la hierba: la luz del elemento bajo los pies, en lugar del
            fondo negro de la versión de escenario. */}
        <div
          className="absolute inset-x-[-12%] bottom-[-7%] h-[42%] animate-flame-flicker"
          style={{ background: `radial-gradient(ellipse at 50% 100%, ${color}66, ${color}22 45%, transparent 72%)` }}
        />
        {layers}
      </div>
    )
  }

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`} style={{ background: `radial-gradient(circle at 50% 55%, ${color}2e, #020617 78%)` }}>
      <div className="absolute inset-0 animate-flame-flicker" style={{ background: `radial-gradient(circle at 50% 55%, ${color}22, transparent 60%)` }} />
      {layers}
    </div>
  )
}
