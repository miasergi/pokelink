// Reduce una imagen subida a un cuadrado pequeño (recorte centrado) para que
// los mods pesen poco: un retrato de 160 px en WebP ronda los 8-15 kB.
export function reducirImagen(file: File, lado = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('Eso no es una imagen.')); return }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = lado
      c.height = lado
      const ctx = c.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('No se pudo procesar la imagen.')); return }
      const m = Math.min(img.width, img.height)
      ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, lado, lado)
      URL.revokeObjectURL(url)
      let out = c.toDataURL('image/webp', 0.85)
      if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/jpeg', 0.85)
      resolve(out)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')) }
    img.src = url
  })
}

/**
 * Comparte un archivo con el menú del móvil (WhatsApp, Telegram, correo…).
 * Donde no se puede (ordenador, navegador antiguo) lo descarga. Devuelve
 * cómo ha ido para poder avisar.
 */
export async function compartirArchivo(nombre: string, contenido: string, titulo: string): Promise<'compartido' | 'descargado' | 'cancelado'> {
  try {
    const file = new File([contenido], nombre, { type: 'application/json' })
    if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: titulo, text: `Mod de Corsarios: ${titulo}. Ábrelo en Corsarios → Puerto → Mods → Importar.` })
      return 'compartido'
    }
  } catch (e) {
    // El usuario cerró el menú: no es un error y no hay que descargar nada.
    if ((e as Error).name === 'AbortError') return 'cancelado'
  }
  descargar(nombre, contenido)
  return 'descargado'
}

/** Descarga un texto como archivo. */
export function descargar(nombre: string, contenido: string, tipo = 'application/json') {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
