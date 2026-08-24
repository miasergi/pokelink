// Contenido de los juegos de LA PREVIA (sección de juegos para beber).
// Todo el texto va aquí para poder ampliarlo/afinarlo sin tocar la UI.
// Placeholders: {j} = un jugador al azar, {j2} = OTRO jugador distinto.
// Regla de oro del contenido: SIEMPRE se puede pagar con tragos — nadie está
// obligado a nada, y eso lo dice la propia carta cuando toca.

// ---------------------------------------------------------------------------
// RULETA DE RETOS (estilo Picolo)
// ---------------------------------------------------------------------------

export type PicoloKind = 'reto' | 'pregunta' | 'juego' | 'todos' | 'virus'

export interface PicoloCard {
  kind: PicoloKind
  text: string
  /** Solo para virus: el texto de la carta que lo TERMINA. */
  end?: string
  /** true = pertenece al pack picante (solo entra si está activado). */
  spicy?: boolean
}

export const PICOLO_CARDS: PicoloCard[] = [
  // --- Retos individuales ---
  { kind: 'reto', text: '{j}, imita a alguien del grupo hasta que adivinen quién es. Si nadie acierta, bebes 2.' },
  { kind: 'reto', text: '{j}, enseña la última foto de tu galería o bebe 3.' },
  { kind: 'reto', text: '{j}, habla con acento andaluz hasta tu próximo turno. Cada despiste, 1 trago.' },
  { kind: 'reto', text: '{j}, deja que {j2} publique un estado/story desde tu móvil o bebe 4.' },
  { kind: 'reto', text: '{j}, cuenta tu peor cita en 30 segundos o bebe 2.' },
  { kind: 'reto', text: '{j}, haz 10 flexiones o bebe 3.' },
  { kind: 'reto', text: '{j}, canta el estribillo de la última canción que escuchaste o bebe 2.' },
  { kind: 'reto', text: '{j}, di el abecedario al revés. Si fallas, bebes 3.' },
  { kind: 'reto', text: '{j}, deja que el grupo revise tus últimos 3 emojis más usados o bebe 2.' },
  { kind: 'reto', text: '{j}, aguanta 20 segundos mirando fijamente a {j2} sin reírte. El que se ría, bebe 2.' },
  { kind: 'reto', text: '{j}, baila sin música durante 15 segundos o bebe 3.' },
  { kind: 'reto', text: '{j}, cuenta un chiste. Si nadie se ríe, bebes 2; si alguien se ríe, reparte 2.' },
  { kind: 'reto', text: '{j}, llama a un contacto al azar (elige {j2}) y pregúntale qué cenó. O bebe 5.' },
  { kind: 'reto', text: '{j}, intercambia una prenda con {j2} hasta el final de la partida o bebed 2 cada uno.' },
  { kind: 'reto', text: '{j}, di 5 marcas de cerveza en 10 segundos o bebe 2.' },
  { kind: 'reto', text: '{j}, tu codo derecho no puede tocar nada hasta tu próximo turno. Si lo apoyas, 2 tragos.' },
  { kind: 'reto', text: '{j}, describe a {j2} usando solo 3 palabras. Si no le gusta, bebes 1; si le gusta, bebe él/ella.' },
  { kind: 'reto', text: '{j}, habla en tercera persona hasta tu próximo turno. Cada fallo, 1 trago.' },
  { kind: 'reto', text: '{j}, enséñanos tu mejor paso de baile o bebe 2.' },
  { kind: 'reto', text: '{j}, aguanta la risa: el grupo tiene 20 segundos para hacerte reír. Si te ríes, bebes 3; si no, reparten 3.' },
  // --- Preguntas ---
  { kind: 'pregunta', text: '{j}, ¿a quién del grupo llamarías para que te sacara de la cárcel? Esa persona reparte 2 tragos.' },
  { kind: 'pregunta', text: '{j}, ¿cuál es tu peor borrachera? Cuéntala o bebe 3.' },
  { kind: 'pregunta', text: '{j}, ¿qué canción te da vergüenza admitir que te encanta? Dila o bebe 2.' },
  { kind: 'pregunta', text: '{j}, ¿cuál fue tu último mensaje enviado? Léelo en voz alta o bebe 3.' },
  { kind: 'pregunta', text: '{j}, ¿quién del grupo sobreviviría menos en un apocalipsis zombi? Esa persona bebe 2.' },
  { kind: 'pregunta', text: '{j}, confiesa algo que nunca hayas contado al grupo o bebe 4.' },
  { kind: 'pregunta', text: '{j}, ¿cuál es la tontería más cara que has comprado? Si el grupo la aprueba, reparte 2; si no, bebe 2.' },
  { kind: 'pregunta', text: '{j}, ¿qué apodo tenías de pequeño? Dilo o bebe 2. Si lo dices, el grupo te llama así el resto de la noche.' },
  // --- Juegos rápidos ---
  { kind: 'juego', text: 'Categorías: {j} dice una categoría (marcas de coche, futbolistas…) y vais por turnos. El primero que falle o repita, bebe 2.' },
  { kind: 'juego', text: 'Palabras encadenadas empezando por {j}. El que tarde más de 5 segundos, bebe 2.' },
  { kind: 'juego', text: '¡Duelo! {j} y {j2}: piedra, papel o tijera al mejor de 3. El perdedor bebe 3.' },
  { kind: 'juego', text: 'Pulso de miradas: {j} contra {j2}. El primero que parpadee, bebe 2.' },
  { kind: 'juego', text: '{j} piensa un número del 1 al 10. Todos decís uno: quien acierte reparte 3; si nadie acierta, todos bebéis 1.' },
  { kind: 'juego', text: 'Médico dice: {j} da 3 órdenes rápidas («tocaos la nariz»…). El último en obedecer cada una, bebe 1.' },
  { kind: 'juego', text: 'Sin nombres: hasta la próxima carta nadie puede decir nombres propios. Cada fallo, 1 trago.' },
  { kind: 'juego', text: 'La ola: empezando por {j}, haced la ola. El que la rompa o dude, bebe 2.' },
  // --- Todos ---
  { kind: 'todos', text: 'El más joven del grupo bebe 2. El mayor reparte 2. La edad es un grado.' },
  { kind: 'todos', text: 'Todos los que lleven algo negro beben 1.' },
  { kind: 'todos', text: 'El último que llegó a la previa bebe 2 por impuntual.' },
  { kind: 'todos', text: 'Quien tenga menos batería en el móvil bebe 3. La irresponsabilidad se paga.' },
  { kind: 'todos', text: 'Brindis general: todos bebéis 1 a la salud de {j}.' },
  { kind: 'todos', text: 'Los que tengan pareja beben 2. Los solteros reparten 2. Hoy se sale.' },
  { kind: 'todos', text: 'El último en tocar el suelo con la mano bebe 2.' },
  { kind: 'todos', text: 'Quien tenga las llaves de casa más lejos ahora mismo, bebe 2.' },
  { kind: 'todos', text: 'Votación: ¿quién es más probable que se pierda esta noche? El más votado bebe 3.' },
  { kind: 'todos', text: 'Votación: ¿quién acabará bailando encima de algo? El más votado bebe 2 y lo promete.' },
  // --- Virus (regla activa hasta que sale la carta de cierre) ---
  { kind: 'virus', text: 'VIRUS · {j}, cada vez que alguien diga «beber» o «trago», bebes 1.', end: 'FIN DEL VIRUS · {j}, ya puedes oír la palabra «beber» tranquilamente. Reparte 2 por las molestias.' },
  { kind: 'virus', text: 'VIRUS · Prohibido decir «sí» y «no». Quien lo diga, bebe 1.', end: 'FIN DEL VIRUS · Sí, no, sí, no. Ya se puede. El último que cayó, bebe 1 más.' },
  { kind: 'virus', text: 'VIRUS · {j} es la sombra de {j2}: repite su última palabra cada vez que hable. Si se le escapa, bebe 1.', end: 'FIN DEL VIRUS · {j} deja de ser un loro. {j2} le invita a 1 trago por el servicio.' },
  { kind: 'virus', text: 'VIRUS · Nadie puede señalar con el dedo. Quien señale, bebe 1.', end: 'FIN DEL VIRUS · Señalad libremente. {j} elige a alguien (señalándolo, claro) para que beba 2.' },
  { kind: 'virus', text: 'VIRUS · Antes de beber hay que decir «¡salud, campeones!». Quien lo olvide, bebe 1 extra.', end: 'FIN DEL VIRUS · Se acabó el protocolo. Todos bebéis 1 de despedida, sin decir nada.' },
  // ------------------------------------------------------------------
  // PACK PICANTE 🌶️ (solo entra si está activado)
  // ------------------------------------------------------------------
  { kind: 'pregunta', spicy: true, text: '{j}, ¿cuál es tu crush de este grupo o de vuestro círculo? Dilo o bebe 5.' },
  { kind: 'pregunta', spicy: true, text: '{j}, ¿cuál ha sido tu mayor cita desastre por una app? Cuéntala o bebe 3.' },
  { kind: 'pregunta', spicy: true, text: '{j}, ¿cuál es el sitio más raro donde has ligado? Confiesa o bebe 3.' },
  { kind: 'pregunta', spicy: true, text: '{j}, ¿stalkeas a tu ex? Responde con sinceridad o bebe 4.' },
  { kind: 'pregunta', spicy: true, text: '{j}, ¿a quién de esta sala le darías un beso si fuera obligatorio? O bebe 4.' },
  { kind: 'reto', spicy: true, text: '{j}, manda un «¿qué haces?» a tu último ex o crush, o bebe 5. El grupo verifica.' },
  { kind: 'reto', spicy: true, text: '{j}, dale un beso en la mejilla a {j2} o bebed 2 cada uno.' },
  { kind: 'reto', spicy: true, text: '{j}, haz tu mejor baile sensual durante 10 segundos o bebe 4.' },
  { kind: 'reto', spicy: true, text: '{j}, susurra algo bonito al oído de {j2}. Si se sonroja, reparte 2; si no, bebes 2.' },
  { kind: 'reto', spicy: true, text: '{j}, enseña tu perfil de citas (si tienes) o bebe 3.' },
  { kind: 'reto', spicy: true, text: '{j}, describe tu tipo ideal sin mirar a nadie del grupo. Si miras a alguien, esa persona reparte 3.' },
  { kind: 'reto', spicy: true, text: '{j} y {j2}, cambiaos los móviles durante una ronda (bloqueados no vale) o bebed 3 cada uno.' },
  { kind: 'todos', spicy: true, text: 'Todos los que hayan ligado alguna vez en esta ciudad beben 2.' },
  { kind: 'todos', spicy: true, text: 'Quien haya dado un beso este mes, bebe 1 por cada beso (máximo 5, no nos flipemos).' },
  { kind: 'todos', spicy: true, text: 'Votación: ¿quién es más probable que se enrolle con alguien esta noche? El más votado bebe 3.' },
  { kind: 'virus', spicy: true, text: 'VIRUS · {j} y {j2} son pareja: deben ir de la mano. Si se sueltan, beben 1 cada uno.', end: 'FIN DEL VIRUS · {j} y {j2} se divorcian amistosamente. Brindad juntos: 1 trago cada uno.' },
]

// ---------------------------------------------------------------------------
// YO NUNCA
// ---------------------------------------------------------------------------

export interface YoNuncaCard {
  text: string
  spicy?: boolean
}

export const YO_NUNCA: YoNuncaCard[] = [
  { text: 'Yo nunca me he dormido en el transporte público y me he pasado de parada.' },
  { text: 'Yo nunca he fingido que me sabía una canción moviendo los labios.' },
  { text: 'Yo nunca he mentido sobre mi edad.' },
  { text: 'Yo nunca he llorado con una película de dibujos.' },
  { text: 'Yo nunca he mandado un mensaje a la persona equivocada.' },
  { text: 'Yo nunca he stalkeado a alguien hasta 3 años atrás en su perfil.' },
  { text: 'Yo nunca me he hecho el/la dormido/a para no saludar a alguien.' },
  { text: 'Yo nunca he vuelto a casa andando porque no tenía para el taxi.' },
  { text: 'Yo nunca he cantado en la ducha a pleno pulmón.' },
  { text: 'Yo nunca he dicho «ya voy» estando todavía en la cama.' },
  { text: 'Yo nunca he perdido el móvil de fiesta.' },
  { text: 'Yo nunca he vomitado en casa de otra persona.' },
  { text: 'Yo nunca me he escapado de una fiesta sin despedirme (la salida ninja).' },
  { text: 'Yo nunca he llorado de risa hasta que me doliera la tripa.' },
  { text: 'Yo nunca he pedido comida a domicilio estando el súper a 5 minutos.' },
  { text: 'Yo nunca he suspendido un examen por salir la noche anterior.' },
  { text: 'Yo nunca he fingido una llamada para escapar de una conversación.' },
  { text: 'Yo nunca he roto algo en casa ajena y lo he escondido.' },
  { text: 'Yo nunca he dicho «te llamo luego» sin ninguna intención de llamar.' },
  { text: 'Yo nunca me he quedado dormido/a en el cine.' },
  { text: 'Yo nunca he cotilleado el móvil de otra persona sin permiso.' },
  { text: 'Yo nunca he comido algo que se había caído al suelo (regla de los 5 segundos).' },
  { text: 'Yo nunca he olvidado el cumpleaños de un buen amigo.' },
  { text: 'Yo nunca he hecho la croqueta borracho/a.' },
  { text: 'Yo nunca he ido a clase o al trabajo sin dormir nada.' },
  { text: 'Yo nunca he llamado «mamá» a una profesora o jefa.' },
  { text: 'Yo nunca he aplaudido cuando aterrizó el avión.' },
  { text: 'Yo nunca he mentido en este juego. (Piénsalo bien…)' },
  { text: 'Yo nunca he perdido una apuesta ridícula.' },
  { text: 'Yo nunca me he colado en una fiesta a la que no estaba invitado/a.' },
  { text: 'Yo nunca he usado la misma excusa dos veces con la misma persona.' },
  { text: 'Yo nunca he devuelto un tupper sin lavar.' },
  { text: 'Yo nunca he cantado en un karaoke.' },
  { text: 'Yo nunca me he reído en un momento totalmente inapropiado (funeral, bronca…).' },
  { text: 'Yo nunca he dormido con un peluche siendo ya adulto/a.' },
  { text: 'Yo nunca he dicho que me encantó un regalo que odié.' },
  { text: 'Yo nunca he salido de casa con dos calcetines distintos.' },
  { text: 'Yo nunca he tardado más de una hora en elegir qué ponerme.' },
  { text: 'Yo nunca he practicado una conversación en el espejo.' },
  { text: 'Yo nunca he llorado por hambre.' },
  // --- Pack picante 🌶️ ---
  { spicy: true, text: 'Yo nunca he besado a alguien de este grupo.' },
  { spicy: true, text: 'Yo nunca me he enrollado con alguien cuyo nombre no recordaba.' },
  { spicy: true, text: 'Yo nunca he tenido una cita con dos personas distintas la misma semana.' },
  { spicy: true, text: 'Yo nunca he mandado un mensaje a mi ex estando de fiesta.' },
  { spicy: true, text: 'Yo nunca me he arrepentido de un beso.' },
  { spicy: true, text: 'Yo nunca he ligado usando una frase hecha de esas horribles.' },
  { spicy: true, text: 'Yo nunca he tenido un rollo de verano.' },
  { spicy: true, text: 'Yo nunca me he hecho pasar por soltero/a sin serlo.' },
  { spicy: true, text: 'Yo nunca he besado a alguien la misma noche de conocerle.' },
  { spicy: true, text: 'Yo nunca he tenido un crush con alguien del trabajo o de clase.' },
  { spicy: true, text: 'Yo nunca he vuelto con un ex sabiendo que era mala idea.' },
  { spicy: true, text: 'Yo nunca he mentido sobre cuánta gente he besado.' },
  { spicy: true, text: 'Yo nunca he soñado (en plan romántico) con alguien de esta sala.' },
  { spicy: true, text: 'Yo nunca he dado mi número a un desconocido en un bar.' },
  { spicy: true, text: 'Yo nunca he fingido interés en una cita solo por educación.' },
]

// ---------------------------------------------------------------------------
// EL REY DE COPAS (Kings)
// ---------------------------------------------------------------------------

export interface KingsRule {
  value: string // 'A', '2'..'10', 'J', 'Q', 'K'
  title: string
  rule: string
}

export const KINGS_RULES: KingsRule[] = [
  { value: 'A', title: 'Cascada', rule: 'Todos bebéis en cadena empezando por quien sacó la carta. Nadie puede parar hasta que pare el de su derecha.' },
  { value: '2', title: 'Tú', rule: 'Elige a alguien: esa persona bebe 2.' },
  { value: '3', title: 'Yo', rule: 'Te ha tocado a ti: bebes 3.' },
  { value: '4', title: 'Suelo', rule: 'El último en tocar el suelo con la mano, bebe 2.' },
  { value: '5', title: 'Chicos', rule: 'Beben todos los chicos. Si no hay, bebe quien sacó la carta.' },
  { value: '6', title: 'Chicas', rule: 'Beben todas las chicas. Si no hay, bebe quien sacó la carta.' },
  { value: '7', title: 'Cielo', rule: 'El último en levantar la mano al cielo, bebe 2.' },
  { value: '8', title: 'Pareja', rule: 'Elige compañero/a de tragos: hasta el final de la partida, cuando bebas tú, bebe también.' },
  { value: '9', title: 'Rima', rule: 'Di una palabra; por turnos hay que rimar con ella. El primero que falle o repita, bebe 2.' },
  { value: '10', title: 'Categorías', rule: 'Di una categoría (marcas de refresco, países…). El primero que falle o repita, bebe 2.' },
  { value: 'J', title: 'Regla nueva', rule: 'Inventa una regla para el resto de la partida (ej.: prohibido decir nombres). Quien la incumpla, bebe 1.' },
  { value: 'Q', title: 'Pregunta', rule: 'Solo puedes hablar preguntando, y el resto debe responderte con otra pregunta. El primero que afirme algo, bebe 2.' },
  { value: 'K', title: '¡El Rey!', rule: 'Echa un poco de tu bebida al vaso del centro. Quien saque el CUARTO rey… se lo bebe entero.' },
]

// ---------------------------------------------------------------------------
// Utilidades compartidas
// ---------------------------------------------------------------------------

/** Elige dos jugadores DISTINTOS al azar (con fallbacks si hay pocos). */
function pickTwo(players: string[]): [string, string] {
  if (players.length === 0) return ['Alguien', 'otra persona']
  const i = Math.floor(Math.random() * players.length)
  if (players.length === 1) return [players[0], 'otra persona']
  let i2 = i
  while (i2 === i) i2 = Math.floor(Math.random() * players.length)
  return [players[i], players[i2]]
}

function fillWith(text: string, j: string, j2: string): string {
  return text.replace(/\{j\}/g, j).replace(/\{j2\}/g, j2)
}

/** Sustituye {j}/{j2} por dos jugadores DISTINTOS elegidos al azar. */
export function fillPlayers(text: string, players: string[]): string {
  const [a, b] = pickTwo(players)
  return fillWith(text, a, b)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export interface PicoloRoundCard {
  kind: PicoloKind | 'virusEnd'
  text: string
}

/**
 * Construye una ronda de Picolo lista para jugar: baraja los mazos, resuelve
 * los nombres y COLOCA el cierre de cada virus 4-8 cartas después de su
 * inicio (nunca fuera de la ronda: como muy tarde, la última carta).
 */
export function buildPicoloRound(players: string[], spicy: boolean, length = 30): PicoloRoundCard[] {
  const pool = PICOLO_CARDS.filter((c) => spicy || !c.spicy)
  const virus = shuffle(pool.filter((c) => c.kind === 'virus')).slice(0, 3)
  const normal = shuffle(pool.filter((c) => c.kind !== 'virus')).slice(0, Math.max(6, length - virus.length * 2))
  const round: PicoloRoundCard[] = normal.map((c) => ({ kind: c.kind, text: c.text }))
  for (const v of virus) {
    const start = Math.floor(Math.random() * Math.max(1, round.length - 6))
    // Los nombres se eligen UNA vez para que inicio y fin hablen de la misma gente.
    const [ja, jb] = pickTwo(players)
    round.splice(start, 0, { kind: 'virus', text: fillWith(v.text, ja, jb) })
    const endAt = Math.min(round.length, start + 4 + Math.floor(Math.random() * 5))
    round.splice(endAt, 0, { kind: 'virusEnd', text: fillWith(v.end ?? 'Fin del virus.', ja, jb) })
  }
  // El resto de cartas resuelven nombres al vuelo (cada una los suyos).
  return round.map((c) => (c.kind === 'virus' || c.kind === 'virusEnd' ? c : { ...c, text: fillPlayers(c.text, players) }))
}
