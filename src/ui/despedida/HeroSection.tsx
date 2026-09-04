// EL HERO. Lo primero que ve quien abre el enlace, y lo único que tiene que
// entender sin leer: qué es, cuándo es y cuánto falta.
//
// Tres estados, porque el mismo enlace se abre la semana de antes, durante y
// el lunes siguiente: cuenta atrás → en directo → se acabó.
import { BLOQUES } from '@/data/despedida'
import { useDespedida } from '@/state/despedidaStore'
import {
  ARRANQUE, ChapaDirecto, DIRECTO, FILETE, FINAL, LIMA, NEGRO,
  Antetitulo, BotonLima, BotonLinea, bloqueActual, cuentaAtras, duracion, irA, useAhora,
} from './despedidaKit'
import { rangoDe } from '@/data/despedida'
import Marca, { type MarcaId } from './Marcas'

const TITULARES = [
  '26 horas de directo',
  '47 retos',
  '7 premios bajo llave',
  '1 disfraz de Sailor Moon',
  '8 asaltantes',
  'Elfia 12 será raideado',
]

export default function HeroSection() {
  const ahora = useAhora()
  const fijado = useDespedida((s) => s.save.bloqueFijado)
  const puntos = useDespedida((s) => s.puntos())
  const actual = bloqueActual(ahora, fijado)
  const cuenta = cuentaAtras(ahora, ARRANQUE)
  const acabado = ahora >= FINAL

  return (
    <header className="relative overflow-hidden" style={{ background: NEGRO }}>
      {/* Resplandor de lima arriba: la única licencia decorativa del hero. */}
      <div
        aria-hidden
        className="absolute inset-x-0 -top-1/3 h-[70vh] pointer-events-none"
        style={{ background: `radial-gradient(50% 55% at 50% 50%, ${LIMA}1f, transparent 70%)` }}
      />
      {/* Rejilla técnica de fondo, muy tenue. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.55]"
        style={{
          backgroundImage: `linear-gradient(${FILETE} 1px, transparent 1px), linear-gradient(90deg, ${FILETE} 1px, transparent 1px)`,
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(70% 60% at 50% 30%, #000, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(70% 60% at 50% 30%, #000, transparent 75%)',
        }}
      />

      <div className="relative px-5 sm:px-8 lg:px-14 pt-24 sm:pt-32 pb-12 sm:pb-16 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center gap-3">
          <Antetitulo color={LIMA}>12 — 13 septiembre 2026</Antetitulo>
          <span className="h-3 w-px" style={{ background: FILETE }} />
          <Antetitulo>Elfia 12 · Benicarló</Antetitulo>
        </div>

        <h1 className="font-fest uppercase text-white leading-[0.96] tracking-[-0.02em] mt-5 text-[19vw] sm:text-[13vw] lg:text-[11rem]">
          Despedida
          <br />
          <span style={{ color: LIMA }}>Óscar</span>
        </h1>

        <p className="font-festui text-[14px] sm:text-lg text-zinc-400 mt-6 max-w-2xl leading-relaxed">
          Dos días, ocho amigos y una lista de retos. Todo lo que haga suma puntos,
          y los puntos abren cajas que no sabe lo que llevan dentro.
        </p>

        {/* --- El estado del evento --- */}
        <div className="mt-10 sm:mt-12">
          {acabado ? (
            <Final puntos={puntos} />
          ) : cuenta.llegada ? (
            <EnMarcha puntos={puntos} bloque={actual} ahora={ahora} fijado={!!fijado} />
          ) : (
            <Reloj cuenta={cuenta} />
          )}
        </div>

        <div className="flex flex-wrap gap-3 mt-10">
          <BotonLima onClick={() => irA('programa')}>Ver el programa</BotonLima>
          <BotonLinea onClick={() => irA('invitacion')}>La invitación</BotonLinea>
        </div>
      </div>

      {/* Cinta de titulares. Duplicada para que el bucle no tenga costura. */}
      <div className="relative border-y overflow-hidden" style={{ borderColor: FILETE, background: '#0B0B0E' }}>
        <div className="flex w-max animate-marquesina">
          {[0, 1].map((copia) => (
            <div key={copia} className="flex items-center shrink-0" aria-hidden={copia === 1}>
              {TITULARES.map((t) => (
                <span key={t} className="flex items-center gap-5 sm:gap-8 px-5 sm:px-8 py-3.5">
                  <span className="font-festui text-[11px] sm:text-[13px] font-bold uppercase tracking-[0.22em] text-zinc-400 whitespace-nowrap">
                    {t}
                  </span>
                  <span className="w-1.5 h-1.5 rotate-45 shrink-0" style={{ background: LIMA }} />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </header>
  )
}

/** Antes del sábado: lo único que importa es cuánto falta. */
function Reloj({ cuenta }: { cuenta: ReturnType<typeof cuentaAtras> }) {
  const casillas = [
    { v: cuenta.dias, e: 'días' },
    { v: cuenta.horas, e: 'horas' },
    { v: cuenta.minutos, e: 'min' },
    { v: cuenta.segundos, e: 'seg' },
  ]
  return (
    <div>
      <Antetitulo>Empieza en</Antetitulo>
      <div className="grid grid-cols-4 gap-2 sm:gap-4 mt-3 max-w-2xl">
        {casillas.map((c) => (
          <div key={c.e} className="border px-2 py-4 sm:py-6 text-center" style={{ borderColor: FILETE, background: '#0C0C10' }}>
            <div className="font-fest text-[10vw] sm:text-6xl leading-none tabular-nums text-white">
              {String(c.v).padStart(2, '0')}
            </div>
            <div className="font-festui text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500 mt-2">
              {c.e}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Durante: qué se está jugando y por cuánto va. */
function EnMarcha({ puntos, bloque, ahora, fijado }: {
  puntos: number
  bloque: ReturnType<typeof bloqueActual>
  ahora: Date
  fijado: boolean
}) {
  const restante = bloque && !fijado ? rangoDe(bloque).hasta.getTime() - ahora.getTime() : null
  return (
    <div className="border" style={{ borderColor: `${DIRECTO}44`, background: `${DIRECTO}0A` }}>
      <div className="flex flex-col sm:flex-row">
        <div className="flex-1 p-5 sm:p-7 min-w-0">
          <ChapaDirecto grande />
          <div className="flex items-center gap-3 sm:gap-4 font-fest uppercase text-white text-[11vw] sm:text-6xl leading-[0.9] mt-4">
            {bloque && <Marca id={bloque.marca as MarcaId} className="w-9 h-9 sm:w-14 sm:h-14 shrink-0" style={{ color: DIRECTO }} />}
            <span className="min-w-0 break-words">{bloque ? bloque.titulo : 'Pausa'}</span>
          </div>
          {bloque && (
            <div className="font-festui text-[13px] sm:text-base text-zinc-400 mt-3">
              {bloque.inicio} – {bloque.fin}
              {restante !== null && restante > 0 && <> · quedan {duracion(restante)}</>}
              <span className="block text-zinc-500 mt-1">{bloque.participantes.join(' · ')}</span>
            </div>
          )}
        </div>
        <div
          className="sm:w-56 shrink-0 border-t sm:border-t-0 sm:border-l p-5 sm:p-7 flex sm:flex-col items-center sm:items-start justify-between gap-3"
          style={{ borderColor: `${DIRECTO}33` }}
        >
          <Antetitulo>Marcador</Antetitulo>
          <div className="font-fest text-6xl sm:text-7xl leading-none tabular-nums" style={{ color: LIMA }}>{puntos}</div>
        </div>
      </div>
    </div>
  )
}

/** Después: el resultado, que es lo que quedará para la posteridad. */
function Final({ puntos }: { puntos: number }) {
  return (
    <div className="border p-6 sm:p-8" style={{ borderColor: FILETE, background: '#0C0C10' }}>
      <Antetitulo color={LIMA}>Se acabó</Antetitulo>
      <div className="font-fest uppercase text-white text-[13vw] sm:text-6xl leading-[0.9] mt-3">
        Óscar sobrevivió
      </div>
      <div className="flex items-baseline gap-4 mt-5">
        <span className="font-fest text-7xl leading-none tabular-nums" style={{ color: LIMA }}>{puntos}</span>
        <span className="font-festui text-sm font-bold uppercase tracking-[0.24em] text-zinc-500">
          puntos de {BLOQUES.length} bloques
        </span>
      </div>
    </div>
  )
}
