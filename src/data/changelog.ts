// Registro de cambios visible para el usuario (botón "Novedades" en Inicio).
// Ordenado de MÁS NUEVO a más antiguo. Mantén solo entradas con sabor de cara
// al jugador (no detalles técnicos). El botón muestra las 3 más recientes.

export interface ChangelogEntry {
  version: string
  date: string // YYYY-MM-DD
  title: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v5.6',
    date: '2026-06-07',
    title: 'Arreglo del icono de tipo Hielo',
    changes: [
      'El icono del tipo Hielo (y cualquiera con varias piezas) ahora se ve completo: antes solo se dibujaba un trozo.',
      'Los iconos de tipo llevan una sombra sutil para verse mejor sobre colores claros (Hielo, Eléctrico, Hada…).',
    ],
  },
  {
    version: 'v5.5',
    date: '2026-06-07',
    title: 'Dinero inicial igual para todos',
    changes: [
      'Todas las partidas empiezan ahora con el mismo dinero (1000 ₽): se retira el bono de dinero por Pokédex.',
      'Recordatorio: ganar el Reto diario desbloquea el logro «Reto superado» (si no lo veías, era la caché del PWA; recarga para actualizar).',
    ],
  },
  {
    version: 'v5.4',
    date: '2026-06-07',
    title: 'Arreglos del Reto diario',
    changes: [
      'Ganar el Reto diario ahora desbloquea el logro «Reto superado».',
      'Al reiniciar un Reto diario, se vuelve a jugar EXACTAMENTE el mismo desafío (misma semilla, mapa e inicial); antes generaba un mapa distinto.',
      'El Reto diario empieza siempre con el mismo dinero (1000 ₽) para que sea justo para todos. Las partidas normales mantienen el bono de dinero por Pokédex.',
    ],
  },
  {
    version: 'v5.3',
    date: '2026-06-07',
    title: 'Arreglo: objetos de eventos',
    changes: [
      'Corregido el evento «Aguas termales»: ahora SÍ te da los Restos que prometía (antes solo curaba).',
      'Revisadas todas las situaciones aleatorias: cada opción que promete un objeto lo entrega de verdad.',
    ],
  },
  {
    version: 'v5.2',
    date: '2026-06-07',
    title: 'Reajuste de objetos y nuevos equipables',
    changes: [
      'Nuevo · Roca del Rey: cada golpe tiene un 25% de amedrentar al enemigo (le hace perder su turno).',
      'Nuevo · Huevo Suerte: +1 nivel extra por combate al Pokémon que lo lleve.',
      'Nuevo · Garra Rápida: el portador ataca siempre primero.',
      'Banda Experto ahora DUPLICA el daño de los ataques supereficaces (+100%).',
      'Pañuelo Veloz ahora DUPLICA la Velocidad (+100%).',
      'Lastre de Hierro: −25% Velocidad y +75% de daño.',
      'Casco Dentado: el atacante pierde un 10% de sus PS máximos cada vez que te golpea.',
      'Guante Doble: golpea 2 veces (100% + 25% del daño) y estrena icono de guante.',
      'Mineraluz y Supermineral pasan a llamarse Mineral Evo. y Supermineral Evo. (icono nuevo).',
      'Retirado el Amuleto Relevo.',
    ],
  },
  {
    version: 'v5.1',
    date: '2026-06-07',
    title: 'Tablas, Monolocke y Random a la carta',
    changes: [
      'Nuevo modo Monolocke: elige un tipo y SOLO podrás llevar Pokémon de ese tipo (inicial, capturas, intercambios y eventos).',
      'El Modo Random ahora se elige por categorías: randomiza por separado iniciales y capturables, salvajes, entrenadores y jefes, y el Alto Mando.',
      'Los objetos de tipo (Imán, Carbón, Aguamística…) se sustituyen por las Tablas: una por tipo (Tabla Acero, Tabla Agua, Tabla Fuego…). Mismo efecto: +50% al daño de ese tipo.',
      'La «Banda Focal» pasa a llamarse «Cinta Focus».',
      'Cada tipo muestra ahora su icono oficial junto al nombre en todas las pantallas.',
      'Cuando un ataque NO afecta (inmunidad por tipo, p. ej. Tierra contra Volador) ahora se ve claramente en la arena con un «No afecta».',
    ],
  },
  {
    version: 'v5.0',
    date: '2026-06-07',
    title: 'Pulido y balance',
    changes: [
      'Las megaevoluciones que no mostraban su imagen ahora se ven siempre.',
      'El antiguo 💎 de las casillas difíciles es ahora un indicador de dificultad por estrellas (★/★★/★★★) que avisa de CUALQUIER enemigo más fuerte que tu equipo, no solo de algunos.',
      'Los combates arriesgados ya no disparan el nivel del rival: suman unos pocos niveles fijos en vez de multiplicarlo.',
      'La pantalla de captura estrena el mismo aspecto que elegir inicial (con stats), sin animación de Poké Ball y con icono de Poké Ball en el botón.',
      'Modo Nuzlocke: al capturar solo se ofrece 1 Pokémon (un intento por zona).',
      'Corregido el desbalance de niveles entre jefes (un jefe ya no aparece con nivel mayor que el siguiente).',
      'Los Pokémon capturados ya no salen a un nivel pegado al próximo jefe.',
      'Los shiny se ven claramente al capturarlos y al recibirlos por intercambio (antes solo se notaba en el menú del equipo).',
      'La Pokédex se actualiza al instante al capturar (antes a veces marcaba como nuevo algo ya capturado).',
      'El Centro Pokémon muestra a la Enfermera Joy en vez de un símbolo «+».',
      'Precios de Caramelo Raro y Supercaramelo reajustados para que compensen mejor.',
      'Más variedad en los objetos de regalo (menos Restos y Campana Concha repetidos).',
      'El objeto Metamorfosis ahora se gasta al usarlo.',
    ],
  },
  {
    version: 'v4.9',
    date: '2026-06-06',
    title: 'Capturas, evoluciones e intercambios',
    changes: [
      'Al capturar, eliges entre 3 Pokémon salvajes.',
      'Las evoluciones con varias ramas siempre te dejan elegir.',
      'El intercambio te devuelve el objeto que llevaba equipado el Pokémon entregado.',
      'Pokédex base con los Pokémon que vas capturando.',
    ],
  },
  {
    version: 'v4.8',
    date: '2026-06-05',
    title: 'Tutorial y combate más vivo',
    changes: [
      'Tutorial ampliado para los primeros pasos.',
      'Registro de combate para seguir lo que pasa turno a turno.',
      'Nuevas animaciones de captura y evolución.',
      'Formas regionales y el objeto Metamorfosis.',
    ],
  },
]
