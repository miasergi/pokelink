import type { PokemonType } from '@/types'

// Pokémon oficiales capturados por los científicos de Mistery Island para
// inyectarles el gen del tipo Sonoro. (De momento es LORE/Dossier: el tipo Sonoro
// aún no entra en la tabla de tipos del combate; eso llegará en próximas
// iteraciones con los Viales de Frecuencia.)

export type ExpType = PokemonType | 'sonoro'

export interface Experiment {
  /** Especie representativa (normalmente la evolución final). */
  id: number
  role: 'prototipo' | 'modificado' | 'inestable'
  original: PokemonType[]
  result: ExpType[]
  lore: string
}

export const ROLE_ES: Record<Experiment['role'], string> = {
  prototipo: 'Prototipos perfectos',
  modificado: 'Modificados con éxito',
  inestable: 'Experimentos inestables',
}

export const EXPERIMENTS: Experiment[] = [
  // 📢 Prototipos perfectos (líneas de sonido puro)
  { id: 295, role: 'prototipo', original: ['normal'], result: ['sonoro'], lore: 'El conejillo de indias perfecto: ampliaron sus altavoces biológicos con cirugía molecular.' }, // Exploud
  { id: 441, role: 'prototipo', original: ['normal', 'flying'], result: ['sonoro', 'flying'], lore: 'Su imitación de voces fue alterada para emitir frecuencias ultrasónicas paralizantes.' }, // Chatot
  { id: 402, role: 'prototipo', original: ['bug'], result: ['bug', 'sonoro'], lore: 'Sus brazos de violín rasgan ahora frecuencias subsónicas capaces de agrietar el suelo.' }, // Kricketune
  { id: 358, role: 'prototipo', original: ['psychic'], result: ['psychic', 'sonoro'], lore: 'Sus campanas ya no curan: repican alterando el sistema nervioso.' }, // Chimecho

  // 🧬 Modificados con éxito (se les extirpó un tipo para inyectar el gen Sonoro)
  { id: 715, role: 'modificado', original: ['flying', 'dragon'], result: ['sonoro', 'dragon'], lore: 'Sus orejas de murciélago se volvieron su arma; cambió agilidad de vuelo por potencia acústica.' }, // Noivern
  { id: 40, role: 'modificado', original: ['normal', 'fairy'], result: ['sonoro', 'fairy'], lore: 'Su canto de cuna fue amplificado artificialmente para inducir comas y control mental.' }, // Wigglytuff
  { id: 648, role: 'modificado', original: ['normal', 'psychic'], result: ['sonoro', 'psychic'], lore: 'La pieza central de la mitología musical: capturada para extraer la "frecuencia madre".' }, // Meloetta
  { id: 849, role: 'modificado', original: ['electric', 'poison'], result: ['electric', 'sonoro'], lore: 'Su veneno mutó hasta actuar como un amplificador de bajo eléctrico de alta tensión.' }, // Toxtricity
  { id: 730, role: 'modificado', original: ['water', 'fairy'], result: ['water', 'sonoro'], lore: 'Su canto de sirena perdió la magia: mecanizaron sus cuerdas para un arma de presión hidracústica.' }, // Primarina
  { id: 911, role: 'modificado', original: ['fire', 'ghost'], result: ['fire', 'sonoro'], lore: 'El pájaro de fuego de su hocico es ahora un micrófono espectral que distorsiona sus rugidos.' }, // Skeledirge

  // ⚠️ Experimentos inestables (glitches y mutaciones)
  { id: 437, role: 'inestable', original: ['steel', 'psychic'], result: ['steel', 'sonoro'], lore: 'Una campana de bronce a la que golpean con frecuencias extremas: un tanque que devuelve vibraciones insoportables.' }, // Bronzong
  { id: 330, role: 'inestable', original: ['ground', 'dragon'], result: ['sonoro', 'dragon'], lore: 'El "Espíritu del Desierto": perdió su conexión con la tierra para flotar mediante vibración.' }, // Flygon
  { id: 469, role: 'inestable', original: ['bug', 'flying'], result: ['bug', 'sonoro'], lore: 'Sus alas baten tan rápido que generan ondas de choque. Una quimera perfecta de mitad de juego.' }, // Yanmega
  { id: 200, role: 'inestable', original: ['ghost'], result: ['ghost', 'sonoro'], lore: 'Se alimenta de gritos de miedo; lo encerraron en un bucle infinito de su propio eco espectral.' }, // Misdreavus
  { id: 131, role: 'inestable', original: ['water', 'ice'], result: ['water', 'sonoro'], lore: 'Su melodía oceánica fue retorcida en un arma sónica de aguas profundas.' }, // Lapras
]
