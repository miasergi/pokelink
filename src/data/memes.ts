// LOS MEMES. Fotos de Óscar recortadas con
// `scripts/recortar-oscar.py` y su pie correspondiente.
//
// Los pies son mitad meme clásico y mitad chiste otaku, que es lo que pidió la
// cuadrilla. Los que tiran de un chiste interno (María, los puntos) pegan más
// fuerte si se dejan cerca de la sección que habla de eso.
//
// `ratio` es alto/ancho de cada fichero. Está a mano y no calculado porque el
// navegador necesita saberlo ANTES de descargar la imagen: sin él, la página
// da un salto cuando cada sticker aparece.

export interface Meme {
  id: string
  /** Nombre del fichero en public/despedida/oscar, sin extensión. */
  archivo: string
  texto: string
  ratio: number
  /** Los primeros planos van con máscara circular en vez de recortados. */
  redondo?: boolean
}

export const MEMES: Meme[] = [
  { id: 'morros', archivo: 'morros', texto: 'Su forma final', ratio: 1, redondo: true },
  { id: 'onepiece', archivo: 'onepiece', texto: 'Nakama detectado', ratio: 1.823 },
  { id: 'facepalm', archivo: 'facepalm', texto: 'Cuando le pillan hablando con María', ratio: 0.988 },
  { id: 'resignado', archivo: 'resignado', texto: 'Aceptando su destino', ratio: 1.851 },
  { id: 'paseando', archivo: 'paseando', texto: 'Entrenamiento previo al torneo', ratio: 2.418 },
  { id: 'mascarilla', archivo: 'mascarilla', texto: 'Transformación fase 2', ratio: 1.325 },
  { id: 'maria', archivo: 'maria', texto: 'Menos veinte puntos', ratio: 1.168 },
  { id: 'pulgar', archivo: 'pulgar', texto: 'Todo según el plan', ratio: 2.190 },
  { id: 'jersey', archivo: 'jersey', texto: 'El elegido', ratio: 2.454 },
]

export function meme(id: string): Meme | undefined {
  return MEMES.find((m) => m.id === id)
}

export function rutaMeme(m: Meme): string {
  return `${import.meta.env.BASE_URL}despedida/oscar/${m.archivo}.webp`
}
