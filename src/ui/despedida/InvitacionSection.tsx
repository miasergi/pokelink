// 05 — LA INVITACIÓN. La parte de la página pensada para que la vea ÓSCAR
// antes del día: un aviso de raid a su propia casa, con sus requisitos de
// entrada. Se le manda el enlace y ya está avisado, a su manera.
import { useState } from 'react'
import { Antetitulo, BotonLima, FILETE, LIMA, Seccion } from './despedidaKit'

const REQUISITOS = [
  { n: '01', texto: 'Deshazte de mujeres y mascotas antes del asalto' },
  { n: '02', texto: 'Dos PCs encendidos y el OBS listo para el directo' },
  { n: '03', texto: 'Discord abierto: la banda entra por ahí' },
  { n: '04', texto: 'Sin planes hasta el domingo por la tarde' },
  { n: '05', texto: 'Obediencia. Ya no mandas en tu casa' },
]

/** Enlace directo a la sección, para pegarlo en el grupo. */
function enlace(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}${import.meta.env.BASE_URL}#/despedidaOscar`
}

export default function InvitacionSection() {
  const [copiado, setCopiado] = useState(false)

  const compartir = async () => {
    const url = enlace()
    const texto = 'ELFIA 12 VA A SER RAIDEADO. Sábado 12 de septiembre, 10:00. Preséntate.'
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Despedida de Óscar', text: texto, url })
        return
      }
      await navigator.clipboard.writeText(`${texto} ${url}`)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      /* el usuario ha cancelado el diálogo de compartir: sin ruido */
    }
  }

  return (
    <Seccion
      id="invitacion"
      n="05"
      titulo="Aviso de raid"
      apunte="Esto es lo que le llega a Óscar. Todo lo demás de esta página se lo puede mirar también: los premios ya se encargan de guardar el secreto."
    >
      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-14 items-start">
        <div className="border p-6 sm:p-10" style={{ borderColor: FILETE, background: '#0B0B0E' }}>
          <Antetitulo color={LIMA}>Objetivo marcado</Antetitulo>
          <h3 className="font-fest uppercase text-white text-[11vw] sm:text-6xl leading-[0.85] mt-4">
            El servidor<br /><span style={{ color: LIMA }}>Elfia 12</span><br />va a caer
          </h3>
          <p className="font-festui text-[14px] sm:text-base text-zinc-400 mt-6 leading-relaxed max-w-lg">
            Una banda de ocho ha marcado tu casa como objetivo. No hay forma de cancelarlo:
            te casas, y esto va incluido en el paquete.
          </p>

          <div className="grid grid-cols-2 gap-px mt-8" style={{ background: FILETE }}>
            <Dato rotulo="Inicio" valor="Sáb 12 · 10:00" />
            <Dato rotulo="Duración" valor="Hasta el domingo" />
            <Dato rotulo="Banda" valor="8 asaltantes" />
            <Dato rotulo="Zona" valor="Tu propio salón" />
          </div>

          <div className="border-l-2 pl-5 mt-8" style={{ borderColor: LIMA }}>
            <Antetitulo color={LIMA}>Botín garantizado</Antetitulo>
            <p className="font-fest uppercase text-white text-2xl sm:text-3xl leading-none mt-2">
              Un disfraz. Y no lo eliges tú.
            </p>
          </div>

          <div className="mt-9">
            <BotonLima onClick={compartir}>{copiado ? 'Enlace copiado' : 'Enviar la invitación'}</BotonLima>
            <p className="font-festui text-[12px] text-zinc-600 mt-3 max-w-sm leading-relaxed">
              Se comparte el enlace de esta página: quien lo abra ve el programa y el marcador en directo.
            </p>
          </div>
        </div>

        <div>
          <Antetitulo>Requisitos de entrada</Antetitulo>
          <div className="mt-4 border-t" style={{ borderColor: FILETE }}>
            {REQUISITOS.map((r) => (
              <div key={r.n} className="flex items-baseline gap-5 py-4 border-b" style={{ borderColor: FILETE }}>
                <span className="font-festui text-[11px] font-bold tabular-nums shrink-0" style={{ color: LIMA }}>{r.n}</span>
                <span className="font-festui text-[14px] text-zinc-300 leading-snug">{r.texto}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Seccion>
  )
}

function Dato({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="p-4" style={{ background: '#0B0B0E' }}>
      <div className="font-festui text-[9.5px] font-bold uppercase tracking-[0.24em] text-zinc-600">{rotulo}</div>
      <div className="font-festui text-[14px] font-bold text-white mt-1">{valor}</div>
    </div>
  )
}
