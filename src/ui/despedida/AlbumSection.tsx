// 06 — EL ÁLBUM. Los recortes de Óscar con su pie, todos juntos.
//
// Existe por dos motivos. Uno: en el móvil los stickers sueltos de los
// titulares no salen (no hay hueco), y sin esto la mitad de la cuadrilla no
// vería ninguno. Y dos: puestos en fila y con el mismo tratamiento, dejan de
// ser un pegote y pasan a ser una sección del cartel, que es lo que hace
// cualquier sitio de festival con las fotos de los artistas.
import { MEMES } from '@/data/memes'
import { Antetitulo, FILETE, Seccion } from './despedidaKit'
import { AlbumMemes } from './Memes'

export default function AlbumSection() {
  return (
    <Seccion
      id="album"
      n="05"
      titulo="El álbum"
      apunte="Material recopilado por la cuadrilla a lo largo de los años. Todo real, nada montado."
    >
      <AlbumMemes />
      <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t" style={{ borderColor: FILETE }}>
        <Antetitulo>{MEMES.length} pruebas documentales</Antetitulo>
        <Antetitulo>Sin photoshop</Antetitulo>
      </div>
    </Seccion>
  )
}
