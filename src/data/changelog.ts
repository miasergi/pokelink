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
    version: 'v6.32',
    date: '2026-06-09',
    title: 'Capítulo 1: fondo de muelle en el mapa',
    changes: [
      'El mapa de la run del Capítulo 1 tiene ahora su propio escenario de fondo: un muelle en la niebla que se adentra hacia la isla prohibida.',
    ],
  },
  {
    version: 'v6.31',
    date: '2026-06-09',
    title: 'Capítulo 1: más fácil, con fondo y música propia',
    changes: [
      'Bajada la dificultad del Capítulo 1: El Capitán pasa a nivel 12 y lleva 4 Pokémon (antes 6 a nivel 20).',
      'Nuevo fondo ambiental del Modo Historia: el Archipiélago de Niebla con la isla prohibida brillando a lo lejos.',
      'Música de fondo propia para el Modo Historia: un ambiente lento y enrarecido que pega con el misterio.',
    ],
  },
  {
    version: 'v6.30',
    date: '2026-06-09',
    title: 'Capítulo 1: diálogos del jefe y final',
    changes: [
      'Antes de enfrentarte a El Capitán aparece una escena de diálogo que da contexto al combate.',
      'Al superar el capítulo se reproduce un epílogo y una pantalla de «Capítulo completado» que insinúa lo que viene.',
    ],
  },
  {
    version: 'v6.29',
    date: '2026-06-09',
    title: 'Modo Historia: reinicio + dificultad del Capítulo 1',
    changes: [
      'Corregido: al perder y reiniciar en el Modo Historia volvía a empezar una run de Kanto en vez del capítulo.',
      'Rebajada la curva del Capítulo 1: El Capitán pasa de nivel 28 a 20 (más acorde a un primer capítulo).',
    ],
  },
  {
    version: 'v6.28',
    date: '2026-06-09',
    title: 'Arreglo: el Capítulo 1 abría Kanto',
    changes: [
      'Corregido: al empezar el Capítulo 1 se iniciaba una run normal de Kanto en vez del mapa temático del capítulo.',
    ],
  },
  {
    version: 'v6.27',
    date: '2026-06-09',
    title: 'Modo Historia: Capítulo 1 jugable + Dossier',
    changes: [
      'El Capítulo 1 «El Archipiélago de Niebla» ya es jugable: travesía propia con Pokémon costeros, contrabandistas, marineros y guardias, que culmina en el jefe El Capitán del ferry clandestino.',
      'Nuevo «Dossier clasificado» en el Modo Historia: la lista de Pokémon que los científicos convirtieron al tipo Sonoro (prototipos, modificados e inestables), con su transformación y su historia.',
      'El Modo Historia no afecta a tus estadísticas ni récords normales (pero sí completa tu Pokédex).',
    ],
  },
  {
    version: 'v6.26',
    date: '2026-06-09',
    title: '¡Nuevo Modo Historia! (1ª parte)',
    changes: [
      'Modo Historia (requiere iniciar sesión): desentraña la conspiración de Mistery Island.',
      'Capítulo 1 «El Archipiélago de Niebla»: cinemática de introducción con diálogos y elección de inicial de Kanto.',
      'Se presenta el tipo Sonoro, un tipo artificial (de momento solo en la historia) con su propio color y onda.',
    ],
  },
  {
    version: 'v6.25',
    date: '2026-06-09',
    title: 'Liga: cuadro de eliminatorias y marcadores',
    changes: [
      'Las eliminatorias se muestran ahora como un cuadro (rondas en columnas, con desplazamiento lateral) y la columna del Campeón.',
      'El resultado de cada combate se muestra como marcador de Pokémon debilitados (p. ej. «6-3») en grupos, eliminatorias y en el detalle.',
      'Nuevo botón «Clasificación» para consultar las tablas de la fase de grupos una vez terminada.',
      'Icono del Reto diario más sutil (un calendario con estrella).',
    ],
  },
  {
    version: 'v6.24',
    date: '2026-06-09',
    title: 'Piedra Z por tipo',
    changes: [
      'Los Movimientos Z ahora muestran una piedra Z (cristal facetado) con el color del tipo del movimiento, en vez del icono genérico.',
    ],
  },
  {
    version: 'v6.23',
    date: '2026-06-08',
    title: 'Liga: detalle de cada combate',
    changes: [
      'Toca un enfrentamiento (en eliminatorias o en los resultados de grupos) para ver el detalle del combate: ambos equipos, qué Pokémon cayeron y el marcador.',
    ],
  },
  {
    version: 'v6.22',
    date: '2026-06-08',
    title: 'Combate: retratos sin descuadrar',
    changes: [
      'Los retratos de entrenador ya no desplazan los cuadros de info: ahora flotan fuera del cuadro (el rival arriba, tú abajo), dejando los cuadros en su sitio.',
    ],
  },
  {
    version: 'v6.21',
    date: '2026-06-08',
    title: 'Tu personaje: sin fondo y debajo de tu info',
    changes: [
      'El sprite del jugador ya no tiene fondo blanco.',
      'En combate, tu personaje aparece ahora debajo de tu cuadro de info, con tu nombre de perfil (o «Invitaditto» si no has iniciado sesión).',
    ],
  },
  {
    version: 'v6.20',
    date: '2026-06-08',
    title: 'Tu sprite de entrenador',
    changes: [
      'Tu personaje aparece ahora en los combates (sobre tu cuadro de info, simétrico al entrenador rival) y como tu retrato en la Liga Pokémon.',
    ],
  },
  {
    version: 'v6.19',
    date: '2026-06-08',
    title: 'Nuevos iconos: Récords y Reto diario',
    changes: [
      'Nuevo icono para el botón de Récords (trofeo Pokémon).',
      'Nuevo icono para el Reto diario (símbolo de Arceus).',
    ],
  },
  {
    version: 'v6.18',
    date: '2026-06-08',
    title: 'De campeón directo a la Liga',
    changes: [
      'Al ganar una partida, nuevo botón «¡Ir a Liga Pokémon!» para entrar directamente al torneo con el equipo con el que te has pasado la run.',
    ],
  },
  {
    version: 'v6.17',
    date: '2026-06-08',
    title: 'Liga: gestiona tu equipo',
    changes: [
      'Nuevo botón «Mi equipo» en la Liga: mira tus Pokémon, reordénalos arrastrando (el primero es tu líder) y compáralos entre sí, igual que en una partida.',
    ],
  },
  {
    version: 'v6.16',
    date: '2026-06-08',
    title: 'Liga: modal centrado + nombres en español',
    changes: [
      'Arreglado: al ver el equipo de un rival en la Liga, la ventana ya se abre centrada (antes saltaba arriba).',
      'Nombres de entrenadores de Johto en español: Pegaso, Antón, Blanca, Morti, Aníbal, Yasmina y Fredo; y el rival de Kanto pasa a ser «Azul».',
    ],
  },
  {
    version: 'v6.15',
    date: '2026-06-08',
    title: 'Más logros + récords de la Liga',
    changes: [
      'Arreglado: la Liga Pokémon ya se desbloquea al iniciar sesión en una cuenta que tenga victorias.',
      'Muchos logros nuevos y más variados: velocidad, modos (Random, Monolocke, multi-región), composición de equipo (legendario, shiny, equipo completo), colección y más.',
      'Nuevos logros de la Liga Pokémon (clasificarte, semifinales, final, campeón, ganarla sin perder).',
      'Récords de la Liga: campeonatos ganados y mejor fase alcanzada (en la pantalla de Récords).',
    ],
  },
  {
    version: 'v6.14',
    date: '2026-06-08',
    title: 'Liga Pokémon: ajustes',
    changes: [
      'El botón de la Liga aparece siempre; si aún no la has desbloqueado, te explica qué es y cómo conseguirlo.',
      'Nuevo logo de la Liga Pokémon.',
      'Al elegir equipo puedes filtrar por región y ordenar por recientes o más rápidas.',
      'En la fase de grupos: botón de «Resultados» (por jornada y combate) y botón «Mi grupo».',
      'Los rivales llevan su Pokémon ya megaevolucionado de forma permanente (sin Megapiedra) y con objeto equipado.',
    ],
  },
  {
    version: 'v6.13',
    date: '2026-06-08',
    title: '¡Nueva modalidad: Liga Pokémon!',
    changes: [
      'Liga Pokémon (se desbloquea al ganar tu primera partida): elige uno de tus equipos campeones y disputa un torneo de 32.',
      'Fase de grupos (8 grupos de 4, todos contra todos) con clasificación por puntos, kills y enfrentamiento directo; ves todos los grupos y resultados para prepararte.',
      'Rivales: líderes, Alto Mando, campeones y personajes del anime (Ash, Red, Gary, Cynthia, Steven, Leon, N…) con equipos de 6 a nivel 100, objetos, megaevolución y Movimiento Z.',
      'Tienda gratis entre combates (solo equipables) y eliminatorias hasta la final.',
    ],
  },
  {
    version: 'v6.11',
    date: '2026-06-08',
    title: 'Más iconos: Jugar y Cuenta',
    changes: [
      'El botón de Jugar vuelve a usar un icono de «play».',
      'La pantalla/botón de Cuenta usa iconos propios (nube, sincronizar, cerrar) en vez de emojis.',
    ],
  },
  {
    version: 'v6.10',
    date: '2026-06-08',
    title: 'Icono de Ajustes',
    changes: [
      'El botón de Ajustes ahora usa un icono de llave inglesa (herramienta).',
    ],
  },
  {
    version: 'v6.9',
    date: '2026-06-08',
    title: 'Sin emojis: iconos propios (1ª parte)',
    changes: [
      'Nuevo logo del juego en la pantalla de Inicio.',
      'En la Pokédex, los Pokémon capturados se marcan con una Poké Ball (antes un puntito) y hay un nuevo filtro para ver solo los shinys.',
      'Empezamos a sustituir los emojis por iconos/imágenes propias (Inicio, Récords, Logros, Pokédex, Liga, Victoria). El resto llegará en próximas versiones.',
    ],
  },
  {
    version: 'v6.8',
    date: '2026-06-08',
    title: 'Reto diario: detecta victorias anteriores',
    changes: [
      'El «ya completado» del Reto diario ahora también reconoce la victoria de hoy aunque la lograras en una versión anterior (misma región e inicial del reto).',
    ],
  },
  {
    version: 'v6.7',
    date: '2026-06-08',
    title: 'Icono del Movimiento Z',
    changes: [
      'El Movimiento Z ahora usa el icono del Anillo Z (en la mochila/tienda y como indicador del ataque) en lugar de la «Z» blanca.',
    ],
  },
  {
    version: 'v6.6',
    date: '2026-06-08',
    title: 'Reto diario: ya completado',
    changes: [
      'Si ya ganaste el Reto diario de hoy, al abrirlo verás que ya lo completaste y las partidas con las que lo lograste (tiempo y equipo final, tocando para ver el detalle).',
      'Puedes volver a jugar el reto del día cuando quieras.',
    ],
  },
  {
    version: 'v6.5',
    date: '2026-06-08',
    title: 'Ajustes de potencia: Z y capturas',
    changes: [
      'El objeto Movimiento Z ahora solo se puede usar en un Pokémon que ya esté a potencia máxima (120).',
      'Los Pokémon que capturas vienen a potencia 1 hasta el nivel 35 y a potencia 2 desde el nivel 36; nunca a potencia 3 (tendrás que subirlos con Mejoras).',
    ],
  },
  {
    version: 'v6.4',
    date: '2026-06-08',
    title: 'Movimiento Z y Alto Mando más temible',
    changes: [
      'Nuevo objeto «Movimiento Z» (10 000 ₽, en la tienda desde la 7ª medalla): otorga el 4º y máximo nivel de ataque, potencia 160. Cada tipo tiene su Movimiento Z.',
      'Los ataques Z muestran el logo «Z» en blanco en lugar de las bolitas de potencia.',
      'Difícil y Nuzlocke: los jefes desde la 6ª medalla, el Alto Mando y el Campeón llevan su mejor Pokémon con Movimiento Z.',
      'Difícil y Nuzlocke: cada miembro del Alto Mando tiene SIEMPRE una megaevolución.',
    ],
  },
  {
    version: 'v6.3',
    date: '2026-06-08',
    title: 'Liberar al Pokémon de Team Rocket: tú decides',
    changes: [
      'Al liberar el Pokémon secuestrado de Team Rocket, ahora decides igual que con un legendario: añadirlo, o (si tienes 6) liberar a uno para hacerle hueco.',
      'Si liberas a uno de los tuyos para quedarte el rescatado, su objeto equipado vuelve a la mochila (no se pierde).',
      'Si decides no quedártelo, va a la caja (no se pierde).',
    ],
  },
  {
    version: 'v6.2',
    date: '2026-06-08',
    title: 'Team Rocket secuestra Pokémon',
    changes: [
      'Team Rocket lleva un Pokémon «secuestrado» (uno aleatorio). Si les ganas, lo LIBERAS y se une a tu equipo, además de dinero extra.',
      'Para no desequilibrar, su casilla solo sube +1 nivel a tu equipo (en vez de +2).',
      'El entrenador rival se muestra encima del cuadro de info de su Pokémon (sin mover al Pokémon).',
    ],
  },
  {
    version: 'v6.0',
    date: '2026-06-08',
    title: 'Entrenadores coherentes y Team Rocket',
    changes: [
      'Cada entrenador lleva ahora SOLO Pokémon de su tipo (un Pescador lleva tipo Agua, un Cazabichos tipo Bicho…). El «Entrenador/a Guay» sigue llevando tipos variados.',
      'Solo aparecen entrenadores cuyo tipo existe en la región elegida (p. ej. nada de tipo Siniestro en Kanto).',
      '¡Aparece Team Rocket! Con los Pokémon que usan en el anime de cada región.',
      'En combate, el entrenador rival se muestra más arriba y con su nombre debajo.',
      'Arreglado el rival de Paldea (Nemona), que mostraba un Pokémon en vez de su retrato.',
    ],
  },
  {
    version: 'v5.9',
    date: '2026-06-08',
    title: 'Duelos con entrenador y retoques visuales',
    changes: [
      'En los combates contra entrenadores, jefes y Alto Mando ahora se ve al entrenador detrás de su Pokémon.',
      'Los Pokémon de doble tipo recortan el nombre con «…» en una línea en vez de descuadrar la tarjeta del equipo.',
      'Las Poké Ball de los nodos del mapa se ven un poco más pequeñas.',
      'Nueva imagen para las casillas de Intercambio (más clara).',
    ],
  },
  {
    version: 'v5.8',
    date: '2026-06-08',
    title: 'Modo Sorpresa, reintentar mapa y arreglos',
    changes: [
      'Nuevo «Modo Sorpresa» en la elección de región: genera al azar región, Pokémon, Random y Monolocke, y te enseña la configuración para empezar, volver a tirar o salir.',
      'Al perder, ya puedes «Reintentar este mapa» (misma semilla) o reiniciar con un mapa nuevo.',
      'Los Pokémon de doble tipo ya no descuadran la tarjeta del equipo (los tipos se ajustan a dos líneas).',
      'La Tabla Normal ahora se ve como una tabla (Tabla Legendaria) en vez de un pañuelo.',
      'Al liberar un Pokémon para capturar/quedarte un legendario, su objeto equipado vuelve a la mochila (ya no se pierde).',
      'Nueva imagen de Poké Ball en capturas y en el mapa.',
    ],
  },
  {
    version: 'v5.7',
    date: '2026-06-07',
    title: 'El cronómetro solo cuenta el juego activo',
    changes: [
      'El tiempo de la partida ya NO cuenta los ratos con la app cerrada: al cerrar y volver con «Continuar run», el cronómetro se reanuda donde lo dejaste.',
      'Esto también arregla los tiempos del ranking de Glory Runs y el logro de velocidad.',
    ],
  },
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
