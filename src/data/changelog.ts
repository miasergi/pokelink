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
    version: 'v6.54',
    date: '2026-08-11',
    title: 'Inazuma Rogue ahora es un MAPA, con pachangas de barrio',
    changes: [
      'SE ACABÓ EL CUADRO DE TORNEO: ahora hay un MAPA por capas, como el del roguelike Pokémon. Cada tramo son tres capas de casillas a elegir y al final te espera el instituto de turno. Ves de un vistazo lo que queda hasta el jefe, con su escudo en la cabecera.',
      'PACHANGAS. Los partidillos de barrio hacen de "combate salvaje": una tanda rápida de mano a mano a cinco rondas, primero que llegue a 3, y si hay empate se va a muerte súbita. Se juegan en cinco toques. Si ganas, los que hayan jugado suben de nivel; ganes o pierdas, el equipo vuelve cansado. Ahí está la decisión: subir nivel o llegar entero al instituto.',
      'CASILLAS DE OBJETO Y DE SUPERTÉCNICA. Ahora te encuentras equipamiento tirado por el camino y entrenadores veteranos que enseñan una supertécnica al jugador que tú elijas. El ojeador, la tienda y el descanso también son casillas del mapa, y el fichaje ya no depende solo de ganar eliminatorias.',
      'CASILLAS ARRIESGADAS. Algunas pachangas salen "a cara de perro": rival cuatro niveles por encima, pero +3 niveles y 300 ₽ si te sale bien.',
      'ESCUDOS DE LOS INSTITUTOS. Los nueve equipos llevan su escudo real en el mapa, en la previa y en las casillas de jefe.',
      'RETRATOS NUEVOS. Los jugadores pasan a lucir los bustos de Inazuma Eleven: Victory Road, mucho más limpios que las capturas de anime que había antes. Están 25 de los 27; los dos que faltan mantienen el retrato viejo.',
    ],
  },
  {
    version: 'v6.53',
    date: '2026-08-11',
    title: 'INAZUMA ROGUE: un roguelite de fútbol dentro del juego',
    changes: [
      'NUEVO JUEGO — INAZUMA ROGUE. Coges al Instituto Raimon y cruzas el Football Frontier: ocho eliminatorias, una sola derrota y a casa. Entre partido y partido eliges qué hacer (ojear fichajes, entrenar, descansar o pasar por la tienda), y al ganar te llevas una carta de recompensa. Está dentro de la misma app pero es un juego aparte, con su propia partida guardada.',
      'LOS PARTIDOS NO SE MIRAN, SE JUEGAN. El encuentro se narra minuto a minuto, pero se PARA en las jugadas clave y decides tú: ¿Tornado de Fuego gastando 20 PT, regate simple gratis, o se la pasas al compañero que tiene ventaja de elemento? Cada opción enseña sus estrellas de probabilidad antes de elegir. Si prefieres verlo sin tocar nada, el botón AUTO decide por ti.',
      'FUEGO ▶ BOSQUE ▶ AIRE ▶ MONTAÑA ▶ FUEGO. El ciclo elemental de la saga, sin elemento dominante: la ventaja se gana eligiendo a quién pones en cada línea y a quién le pasas el balón, no fichando "al mejor". La previa del partido te dice cuántos de tus titulares llegan con el elemento a favor.',
      'SUPERTÉCNICAS Y SUPERVIBRACIÓN. Mano Celestial, Pingüinos Emperador nº1, Ilusión, Muro de Piedra, El Fénix… cada una cuesta PT, así que no puedes tirarlas todas. Y encadenando jugadas buenas se llena la barra de Ruptura: al activarla, tres acciones gratis y con un 40 % más de potencia.',
      'JUGAR 90 MINUTOS CANSA. Los titulares se desgastan partido a partido y rinden peor por debajo del 40 % de aguante; los suplentes suben de nivel igual que ellos y llegan frescos. Rotar la plantilla es una decisión de verdad, no un castigo.',
      'LA PANTALLA DE INICIO, REORGANIZADA. Era una pila de seis botones donde convivían "Liga Pokémon" y "Ajustes" como si fueran lo mismo. Ahora hay dos niveles: arriba los cuatro JUEGOS en tarjetas (PokéRogue, Modo Historia, Inazuma Rogue y Cyber PokéBall), cada una avisando si tienes partida a medias, y abajo una barra discreta con Pokédex, Récords, Logros y Ajustes.',
    ],
  },
  {
    version: 'v6.52',
    date: '2026-08-07',
    title: 'Las ciudades de los juegos y líderes que ya no te esperan',
    changes: [
      'LAS RUTAS SON DE LOS JUEGOS: cada tramo se ilustra con la localidad REAL donde está ese gimnasio —Ciudad Plateada, Ciudad Malva, Ciudad Férrica, Cortondo…— en las nueve regiones, y el último tramo con su Calle Victoria o su Liga. Se acabaron las fotos de paisajes reales que no pintaban nada (una pradera de la Toscana en Kanto, un estadio de fútbol en la Liga). La cabecera del mapa dice además a qué ciudad vas.',
      'CADA DIFICULTAD TIENE SU PROPIA CURVA DE LÍDERES. En Difícil y Nuzlocke, la del pokelike original: primer gimnasio a nivel 14 y +9 en cada uno (23, 32, 41, 50, 59, 68 y 77 el octavo), Alto Mando 84-97 y Campeón a 100. En Normal: 11 y +8 (19, 27, 35, 43, 51, 59 y 67), Alto Mando 75-95 y Campeón a 100.',
      'EL NIVEL QUE VES ES EL QUE PELEAS. Difícil sumaba unos niveles extra por encima de la curva, así que el primer gimnasio, puesto a 14, se leía "Nv.16" y el número de la ficha no cuadraba con el del combate. Ese extra desaparece: la dificultad está en la curva, no en un recargo escondido.',
      'AVISO: la región se ha vuelto MUCHO más exigente. Cada medalla son 8 casillas, los niveles solo salen de pelear (salvaje +1, entrenador +2, Team Rocket —que ahora paga como jefe— y jefes +3) y los líderes han subido: llegar al primero en condiciones ya no está garantizado ni jugando bien. Es a propósito.',
      'Toda capa de ruta tiene ahora al menos una casilla de COMBATE. Antes salían capas enteras de tienda, objeto, captura e intercambio donde era imposible subir de nivel aunque quisieras: perdías el tramo por mala suerte del mapa, no por tus decisiones. Esquivar peleas sigue siendo una opción; ahora es tuya.',
      'Sigues empezando a NIVEL 5, que es donde está la gracia, y la primera ruta ya no reparte esos 9 niveles en línea recta: arranca pegada a tu nivel (4, 4, 5, 6) y el repecho llega al final (9, 11, 12) justo antes del gimnasio, cuando ya tienes equipo.',
      'Los Pokémon salvajes que salen en cada zona ya no dependen del NÚMERO de nivel sino de por dónde vas en la región, así que en la primera ruta siguen apareciendo Pokémon de primera ruta aunque ahora vayan a más nivel.',
    ],
  },
  {
    version: 'v6.51',
    date: '2026-08-06',
    title: 'Jefes coherentes, Nuzlocke con vidas y botín con sentido',
    changes: [
      'ARREGLADO: en Difícil, los acompañantes que añadí a los líderes y al Alto Mando salían de cualquier tipo (a Lance le tocaban Pokémon sin nada de Dragón). Ahora son SIEMPRE de su especialidad, y si la región no tiene suficientes de ese tipo se rellena menos en vez de meter cualquier cosa.',
      'Curva más dura: ganar a un jefe sube +3 niveles en vez de +5. Llegas al Campeón alrededor del nivel 92 en lugar de plantarte en el tope, así que la Liga exige de verdad.',
      'NUZLOCKE REHECHO: ahora pelea con la MISMA dificultad que Difícil (mismos niveles, misma tienda, mismas capturas). Lo que lo hace Nuzlocke es que un Pokémon debilitado se pierde para siempre… y ahora eliges cuántas VIDAS quieres (0, 1, 2, 3 o 5): cada vida te deja perder un combate y seguir adelante.',
      'Gafas Elección y Cinta Fuerte suben un 40% en vez de un 50%.',
      'Team Rocket ya no es el combate más duro del tramo: iban por encima del nivel de la zona y encima sumaban el Pokémon secuestrado. Ahora van por debajo.',
      'Las casillas de objeto pueden dar CUALQUIER objeto del juego, pero con coherencia: la Piedra Evolutiva sale desde el principio y con mucho peso (al empezar, evolucionar cambia la run más que unos niveles), el Supercaramelo se va a la segunda mitad, las pociones básicas dejan de salir camino de la Liga y las buenas aparecen a su tiempo.',
      'Los fondos de ruta se ven de verdad: estaban tan oscurecidos y borrosos que no se reconocía el paisaje.',
    ],
  },
  {
    version: 'v6.50',
    date: '2026-08-06',
    title: 'Mapas de verdad, líderes con equipo completo y más lo-fi',
    changes: [
      'EL MAPA YA ES UN MAPA: cada tramo se dibuja con el TERRENO de su bioma —hierba del bosque, arena del desierto, nieve del paso helado, roca del cañón, agua de la costa…— con maleza cerrando los lados y un sendero de tierra uniendo las casillas. Se acabó el fondo borroso.',
      'DIFÍCIL, el arreglo de fondo: los líderes iban con 2-3 Pokémon mientras tú llevabas 6, así que peleabas 6 contra 3 y ganabas por número aunque los niveles cuadrasen. Ahora en Difícil y Nuzlocke traen EQUIPO COMPLETO (de 3 al principio a 6 al final), con Pokémon de su propio tipo, y sus niveles van mucho más apretados alrededor de su mejor Pokémon. Tu ventaja media pasa de +2,8 a −1,5 niveles.',
      'Las casillas del mapa ahora son fichas claras con sombra, para que se lean sobre el terreno en vez de parecer agujeros.',
      'Música lo-fi mejorada: bamboleo de cinta gastada, caja suave en los tiempos 2 y 4, y el tema de las runs pasa de 4 a 8 compases (antes se repetía cada 6 segundos).',
    ],
  },
  {
    version: 'v6.49',
    date: '2026-08-05',
    title: 'El tope de nivel ahora TOPA de verdad',
    changes: [
      'ARREGLADO: en Difícil con tope activado seguías llegando a cada gimnasio 2 niveles POR ENCIMA del as del líder, así que se hacía sensación de ir sobrado. Peor aún: las tres dificultades acababan dando el mismo tope real, o sea que el ajuste no diferenciaba nada. Ahora en Difícil como mucho IGUALAS el nivel del as (nunca lo superas) y en Nuzlocke llegas 1 nivel por debajo. Normal sigue con sus 5 de colchón.',
      'La dificultad y el tope de nivel se eligen ahora en la pantalla de CONFIGURACIÓN de la partida, junto a las regiones, el Modo Random y el Monolocke: todo lo que define la run se decide de una vez, antes de elegir compañero. La pantalla del inicial te recuerda lo elegido y puedes tocarlo para volver.',
      'Las descripciones de cada dificultad dicen ahora exactamente cuánto puedes subir respecto al jefe, en vez de hablar en general.',
    ],
  },
  {
    version: 'v6.48',
    date: '2026-08-05',
    title: 'Elige tu Pokémon, elige tu tope, y sprites al instante',
    changes: [
      'BUSCADOR DE INICIAL: además de los tres de siempre, ahora puedes empezar con el Pokémon que tú quieras. Escribe su nombre (o su número de Pokédex) y aparece al momento; da igual las tildes, los guiones o los símbolos raros: «mr mime», «flabebe» o «porygon z» encuentran lo que buscas.',
      'TÚ DECIDES EL TOPE DE NIVEL: al empezar una partida eliges entre «Con tope» (tus Pokémon no pasan del nivel del próximo jefe, como hasta ahora) o «Nivel libre» (sin límite hasta el 100, si te apetece sobrelevelear y arrasar).',
      'Los sprites ya no se descargan de un servidor externo: vienen con el juego. Aparecen al instante, funcionan sin conexión y no dependen de que un tercero esté disponible.',
      'Los JEFES siempre enseñan su equipo antes del combate, aunque tengas activado «omitir información de casilla». Perder contra un jefe acaba la partida: no se entra a ciegas.',
      'Al terminar una partida ves cuánto dinero ganaste en total (y cuánto te quedó sin gastar).',
      'ARREGLADO: en Difícil y Nuzlocke, la ficha de un jefe se contradecía a sí misma — arriba ponía «Nv. 46-52» y las tarjetas de sus Pokémon, «Nv.43-49». Ahora todas muestran el nivel real que vas a pelear. La casilla del guardián legendario tampoco enseñaba su nivel.',
      'Tu progreso (Pokédex, logros, récords) tiene ahora una copia de seguridad automática en el propio dispositivo: si el navegador borra los datos del juego, se restaura sola al volver a entrar.',
    ],
  },
  {
    version: 'v6.47',
    date: '2026-08-05',
    title: 'El paisaje de cada ruta, y niveles con más sentido',
    changes: [
      'TODA la run tiene ahora el PAISAJE del tramo de fondo: el cañón, el bosque, la costa o la zona industrial que toque según el gimnasio al que te diriges, y te acompaña en el mapa, el combate, las capturas y la tienda. Se acabó el fondo gris con el patrón de Pokémon mientras juegas.',
      'Los combates de ruta suben menos nivel (+1 los salvajes, +2 los entrenadores) y los JEFES suben más (+5): el ritmo lo marcan los gimnasios, que son los que no puedes esquivar. Sigues llegando a nivel 100 ante el Campeón.',
      'DIFÍCIL más justo: el extra de nivel de los enemigos baja de +4 a +3 (y de +6 a +5 en Nuzlocke).',
      'DIFÍCIL: se acabó el límite de 1 compra por tienda. Compra lo que quieras y puedas pagar; el reto está en la curva de nivel, no en racionarte los objetos. (En Nuzlocke sigue habiendo 1 compra por visita.)',
      'La vista previa de cada casilla ya dice los niveles correctos que vas a ganar (prometía las cifras antiguas).',
    ],
  },
  {
    version: 'v6.46',
    date: '2026-08-04',
    title: 'Difícil vuelve a ser difícil (y no imposible)',
    changes: [
      'ARREGLADO el desnivel de la dificultad Difícil: los enemigos iban multiplicados ×1.4, así que la separación crecía sin parar (+3 niveles en el primer gimnasio… pero +13 en el cuarto, +20 en el sexto y +27 en el octavo, con todo el Alto Mando clavado a nivel 100). A partir del 3er o 4º gimnasio la partida era matemáticamente imposible. Ahora el extra de nivel tiene techo: la curva del rival va PARALELA a la tuya de principio a fin.',
      'El TOPE DE NIVEL y el nivel del líder ya cuadran: antes el tope se calculaba con el nivel base del jefe y el jefe se multiplicaba aparte, así que el mapa te decía "Nv.32", el tope decía "46" y peleabas contra un 45. Los niveles que ves en el mapa y en la ficha de cada casilla son ya los REALES que vas a pelear.',
      'Las casillas ARRIESGADAS ya no son una trampa mortal al empezar: sumaban +4 niveles fijos, que sobre un rival de nivel 5 es un +80% y cerca de la Liga un +6%. Ahora el extra escala con la zona y nunca supera al gimnasio al que lleva esa ruta.',
      'Nuzlocke: ninguna casilla puede pedirte ya más nivel del que el propio tope te deja alcanzar.',
    ],
  },
  {
    version: 'v6.45',
    date: '2026-07-18',
    title: 'La gran renivelada: rumbo al nivel 100 (y adiós al cheto de caramelos)',
    changes: [
      'El mapa ahora se juega POR TRAMOS: una pantalla por cada medalla, con una imagen del paisaje de la ruta (bosque, costa, volcán…) según el gimnasio al que te diriges. Usa las flechas de la cabecera para repasar tramos pasados o espiar los que vienen.',
      'TOPE DE NIVEL POR MEDALLAS: nadie puede superar el nivel del próximo jefe + 5 (en Difícil +1 sobre su nivel real, en Nuzlocke +0, como siempre). Se acabó chetar a un solo Pokémon con caramelos y pasearse por la región: ahora el reto es de verdad.',
      'A cambio, TODO tu equipo sube mucho más rápido: +2 niveles por combate salvaje, +3 por entrenadores y gimnasios y +4 en la Liga. Ya no hace falta ir dopando a uno: el equipo entero viaja pegado a la curva.',
      'La curva llega al FINAL DE VERDAD: gimnasios de 8 a 67, Alto Mando 74–94 y el Campeón espera al NIVEL 100. Llegar a 100 ya no es un sueño: es el clímax de cada run completada.',
      'Los Caramelos Raros y Supercaramelos siguen ahí, pero ahora sirven para lo que debían: poner al día a tus capturas nuevas hasta el tope de la zona.',
    ],
  },
  {
    version: 'v6.44',
    date: '2026-07-14',
    title: 'Cyber PokéBall: la tragaperras de dos rodillos (rediseño a fondo)',
    changes: [
      '¡El combate ahora es el DE VERDAD! Dos rodillos enfrentados como en el juguete: el de la izquierda es tu ataque y el de la derecha el del rival. Se paran de uno en uno (el más rápido elige primero) y la mitad de quien está eligiendo parpadea. Ves tu tira entera, así que sabes qué viene… y qué caras tristes esquivar.',
      'Combate CON ANIMACIONES: embestidas, números de daño flotantes, destellos en críticos y supereficaces, barras de PS que bajan de verdad y Pokémon que se desploman al debilitarse. La Poké Ball cae y tiembla al capturar.',
      'Exploración nueva en PRIMERA PERSONA: arrastra el dedo para girar sobre el terreno (hierba, cueva, aguas) y avanza siguiendo el radar, que ahora se entiende: el punto te dice hacia dónde ir y los anillos, cuánto falta. Al llegar, agitas la bola.',
      'ZONAS SECRETAS: al conseguir las 8 medallas se abren áreas ocultas con Pokémon LEGENDARIOS. Y hay una tercera que solo aparece cuando capturas uno de los dos primeros.',
      'Todo se juega TOCANDO la pantalla: fuera los botones de la bola. El mapa es una rejilla táctil de destinos que se van iluminando con tus medallas.',
    ],
  },
  {
    version: 'v6.43',
    date: '2026-07-13',
    title: '¡Vuelve el año 2000! Llega la Cyber PokéBall',
    changes: [
      'NUEVO MODO: Cyber PokéBall — una recreación jugable del juguete de bolsillo del 2000, con su bola dibujada, pantalla LCD retro y sprites a color. Botón nuevo en Inicio.',
      'Aventura completa en cualquiera de las 9 regiones: inicial a nivel 3 (en Kanto también Pikachu), equipo de solo 3 Pokémon con PC en el Centro, y los líderes de gimnasio, el rival y el Alto Mando REALES de la región elegida.',
      'Mecánicas del juguete: radar de encuentros con anillos de cercanía, combate por TIMING (para el carrusel… ¡y no caigas en la cara triste!), minijuego de machacar ◄ ► para potenciar el golpe fuerte, y captura AGITANDO el móvil de verdad (o pulsando rápido en PC).',
      'Cable Link online: publica tu equipo fantasma y combate contra los de otros jugadores, e intercambia Pokémon del modo entre cuentas (asíncrono, desde el Centro Pokémon → LINK).',
      'Pokédex propia del modo (se sincroniza con tu cuenta), progreso independiente del juego principal y 3 logros nuevos: «Leyenda de bolsillo», «Dex de bolsillo» y «Cable Link».',
    ],
  },
  {
    version: 'v6.42',
    date: '2026-06-11',
    title: 'Sincronización arreglada, historia con partida única y el Sonoro definitivo',
    changes: [
      'Arreglada la sincronización entre dispositivos: el progreso del Modo Historia (capítulos y equipos) hecho en el móvil ya aparece al entrar desde el PC y viceversa, y la nube se fusiona ANTES de cargar lo local al abrir la app.',
      'Modo Historia con partida ÚNICA: si tienes una expedición a medias, el hub te ofrece CONTINUARLA; empezar otro capítulo avisa de que se borrará la anterior.',
      'Tipo Sonoro definitivo: ahora es supereficaz contra TODO (2×, sin acumular en dobles tipos); a él solo le hacen daño extra el tipo Normal y otros Sonoro.',
      'Niveles de la historia rebalanceados: jefes algo más suaves (Vega y Lyra con 4 Pokémon, escalera de niveles menos abrupta), capítulos 4-6 recortados (aces 33/40/46) y +2 niveles de ventaja si empiezas un capítulo de cero.',
      '¡Recompensa final del Modo Historia! Al completar el último capítulo se desbloquea el «Gen Sonoro»: un modo activable en tus runs normales donde los Pokémon del dossier (y sus líneas evolutivas) aparecen y se capturan con su tipo Sonoro.',
    ],
  },
  {
    version: 'v6.41',
    date: '2026-06-11',
    title: 'Equipo a la vista en la tienda + pulido del Modo Historia',
    changes: [
      'En cualquier tienda ahora tienes el botón «👥 Equipo»: consulta los PS, objetos y ataques de tu equipo sin salir, para comprar con cabeza.',
      'Modo Historia: tu compañero inicial y el Lapras del Capitán son INTRANSFERIBLES (no se pueden intercambiar ni liberar para hacer hueco).',
      'Modo Historia: la llegada a la Costa Prohibida (Cap. 2) ahora continúa de verdad el final del Capítulo 1: llegas a lomos del Lapras del Capitán.',
    ],
  },
  {
    version: 'v6.40',
    date: '2026-06-11',
    title: '¡El tipo Sonoro entra en combate! + el Lapras del Capitán',
    changes: [
      'Modo Historia: desde el Capítulo 2 (ya en la isla) los experimentos del dossier — y sus líneas evolutivas completas (Whismur, Kricketot, Chingling, Noibat, Toxel…) — pelean con el tipo SONORO de verdad: eficacias, STAB, ataques propios (Chirrido → Vozarrón → Estruendo) y su insignia con degradado. ¡También puedes capturarlos!',
      'Capítulo 1: El Capitán ahora lleva 3 Pokémon de agua con su Lapras como as… y al vencerle te deja a medio camino de la isla y TE REGALA su Lapras.',
      'Capítulo 3: las cubas de bioacústica despiertan el gen dormido de tu Lapras, que muta a tipo Agua/Sonoro (con sus nuevos ataques).',
      'Los compañeros iniciales del Modo Historia ahora son Pichu o Pikachu (se acabaron los iniciales de Kanto).',
      'Créditos: Modo Historia desarrollado por «Scornelles».',
    ],
  },
  {
    version: 'v6.39',
    date: '2026-06-11',
    title: 'Ilustraciones propias para los capítulos 3-6',
    changes: [
      'Cada capítulo nuevo de la historia tiene ya su ambientación: el túnel del acuario de los Laboratorios Sumergidos, la caverna iluminada del Coro de los Inestables, la cámara de energía del Núcleo de Resonancia y la torre al crepúsculo de La Frecuencia Madre (fondos de cinemática y de mapa distintos por capítulo).',
    ],
  },
  {
    version: 'v6.38',
    date: '2026-06-11',
    title: 'Gran tanda de mejoras: balance, objetos nuevos y la historia completa',
    changes: [
      'Historia COMPLETA: 4 capítulos nuevos (Los Laboratorios Sumergidos, El Coro de los Inestables, El Núcleo de Resonancia y La Frecuencia Madre, con Meloetta y el Arquitecto como final del arco).',
      'Continuidad entre capítulos: al empezar uno puedes CONTINUAR con el equipo con el que terminaste el anterior; si empiezas de cero, tu compañero llega al nivel de la zona (no a Nv. 5).',
      'Balance: ya no salen Pokémon superevolucionados (Garchomp, Empoleon…) en el inicio de la aventura con entrenadores de tipos escasos.',
      'Team Rocket ahora da +2 niveles, como promete la casilla (antes +1: no salía a cuenta).',
      'Movimientos Z con nombre real por tipo (Hidrovórtice Abisal, Hecatombe Pírica, Gigavoltio Destructor…) y con su CRISTAL Z oficial como icono.',
      'Objetos nuevos: Supermejora (potencia máxima directa, desde la 5ª medalla), Baya Zidra (cura el 50% al caer a media vida, 1 vez por combate, no se gasta), Metrónomo (+25% de daño acumulable por golpe), Gafas Elección (+50% At. Esp., solo especiales) y Cinta Fuerte (+50% Ataque, solo físicos).',
      'Vidasfera mejorada: ahora DUPLICA el daño a cambio del 10% de PS por golpe.',
      'Pociones con descuento por tamaño: Superpoción 700 ₽, Hiperpoción 1000 ₽ y Poción Máxima 1300 ₽ (la grande siempre sale más a cuenta que varias pequeñas).',
      'Retirado el Pañuelo Veloz (la Garra Rápida ya hace su trabajo, mejor).',
    ],
  },
  {
    version: 'v6.37',
    date: '2026-06-09',
    title: 'Eficacias del tipo Sonoro + fondo del Cap.1 atenuado',
    changes: [
      'Implementadas las eficacias del tipo Sonoro (ataque: supereficaz contra Psíquico/Hielo/Agua, sin efecto contra Tierra…; defensa: débil a Normal/Acero/Roca…).',
      'El fondo del mapa del Capítulo 1 (tu nueva versión) ahora va desenfocado y oscurecido para que se lean bien las casillas del roguelike.',
    ],
  },
  {
    version: 'v6.36',
    date: '2026-06-09',
    title: 'Modo Historia: nuevas ilustraciones de fondo',
    changes: [
      'Nuevo fondo del prólogo (la isla y su torre) en las cinemáticas del Capítulo 1.',
      'Nuevo fondo del mapa del Capítulo 1: el puerto de Azulona. (Ambas imágenes optimizadas para que no pesen.)',
    ],
  },
  {
    version: 'v6.35',
    date: '2026-06-09',
    title: 'Capítulo 2 + selección de capítulos',
    changes: [
      '¡Nuevo Capítulo 2 «La Costa Prohibida»! Infíltrate en el perímetro de seguridad (guardias, técnicos, vallas electrificadas) hasta el Comandante Vega, con su escenario y fondos propios.',
      'El Modo Historia ahora tiene selección de capítulos: completa uno para desbloquear el siguiente.',
      'Arreglado: en la Liga, abrir el equipo de un entrenador desde la clasificación ya no aparece por debajo del modal.',
    ],
  },
  {
    version: 'v6.34',
    date: '2026-06-09',
    title: 'Capítulo 1: fondo de ciudad portuaria + música por archivo',
    changes: [
      'El mapa del Capítulo 1 usa ahora un fondo de ciudad portuaria con su muelle y ferris, fundido con el mar y la niebla.',
      'La música puede usar archivos propios: deja pistas libres (CC0) en public/music/ (runs.mp3, league.mp3, story.mp3) y sonarán; si faltan, se mantiene la música sintetizada.',
    ],
  },
  {
    version: 'v6.33',
    date: '2026-06-09',
    title: 'Música lo-fi por modo',
    changes: [
      'Nuevo motor de música lo-fi (original, sintetizado): acordes suaves, bajo cálido, percusión sutil, crackle de vinilo y filtro cálido.',
      'Una pista propia para cada ambiente: runs, Liga Pokémon y Modo Historia.',
    ],
  },
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
