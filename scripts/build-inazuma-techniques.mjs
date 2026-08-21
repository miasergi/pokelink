// Construye el catálogo de supertécnicas a partir de la wiki de Fandom y baja
// la imagen de cada una.
//
//   node scripts/build-inazuma-techniques.mjs
//
// De la wiki salen los datos REALES de cada técnica (infobox `Hissatsu`):
//   |type=    Shoot / Dribble / Block / Catch   → tiro / regate / bloqueo / parada
//   |element= Fire / Wind / Earth / Wood        → fuego / aire / montaña / bosque
//   |tp_ie=   coste en TP del primer juego
//   |power=   potencia
//
// Lo que NO sale de la wiki es el equilibrio: las potencias del juego original
// van en otra escala y mezclan versiones (GO, Ares, Galaxy…), así que aquí se
// normalizan a la escala del modo (25-135) manteniendo el orden relativo.
//
// El NOMBRE que se pinta es el del doblaje español cuando lo conozco (tabla
// `ES`); si no, se queda el del doblaje inglés, que es el que usa la wiki.
//
// Las imágenes van a `public/inazuma/techniques/<id>.png`. Si alguna falta, la
// UI cae a su icono de elemento: el juego nunca depende de que estén.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_TS = join(ROOT, 'src', 'data', 'inazuma', 'techniques.ts')
const OUT_IMG = join(ROOT, 'public', 'inazuma', 'techniques')
const CACHE = join(ROOT, 'scripts', '.cache', 'inazuma-techniques.json')
const API = 'https://inazuma-eleven.fandom.com/api.php'
const UA = 'pokelink-inazuma-techniques/1.0 (script de un solo uso)'

/**
 * Categorías de la wiki de las que se saca el catálogo. De cada una se cogen
 * SOLO las técnicas de la SAGA ORIGINAL (`debut_game` con `{{Media|games|IE}}`,
 * `IE2` o `IE3`): las tres temporadas que cubre este modo. Sin ese filtro
 * entraban cientos de técnicas de GO, Ares y Galaxy.
 */
const CATEGORIES = [
  'Category:Shoot hissatsu',
  'Category:Dribble hissatsu',
  'Category:Block hissatsu',
  'Category:Catch hissatsu',
]

/**
 * Cuántas quedarse de cada clase Y ELEMENTO. Con 999 entra TODO lo que la wiki
 * tenga con imagen: al principio se muestreaba a ~53 para que el catálogo no
 * abrumara, pero con las cadenas, la tienda y las casillas repartiendo por
 * potencia, cuantas más reales haya, mejor.
 */
const PER_KIND_ELEMENT = { tiro: 999, regate: 999, bloqueo: 999, parada: 999 }
const ELEMENTS = ['fuego', 'bosque', 'aire', 'montana']

/**
 * Las que NO pueden faltar. Son las que cualquiera que haya visto la serie
 * espera encontrarse; el resto del catálogo se rellena muestreando la curva de
 * potencia de cada clase.
 */
const MUST_HAVE = [
  'Fire Tornado', 'Bakunetsu Storm', 'Dragon Crash', 'Inazuma Break', 'Death Zone', 'The Phoenix',
  'God Break', 'Eternal Blizzard', 'Wolf Legend', 'Dragon Tornado', 'Tri-Pegasus',
  'Illusion Ball', 'Spiral Draw', 'Heat Tackle',
  'The Tower', 'The Wall', 'Killer Slide', 'Ice Ground',
  'God Hand', 'Majin The Hand', 'Mugen The Hand', 'Nekketsu Punch', 'Full Power Shield',
]

/** Descripción de reserva por clase y elemento, para las que no tienen texto. */
const GENERIC = {
  tiro: {
    fuego: 'El balón sale ardiendo y el portero lo nota en los guantes.',
    bosque: 'La naturaleza empuja el disparo hacia la red.',
    aire: 'El aire se corta por donde pasa el balón.',
    montana: 'Pega como una roca cayendo desde arriba.',
  },
  regate: {
    fuego: 'Un quiebro con las botas humeando.',
    bosque: 'Se escurre entre la maleza y aparece por el otro lado.',
    aire: 'Acelera hasta que el defensa deja de verle.',
    montana: 'Se abre camino a hombros, sin frenar.',
  },
  bloqueo: {
    fuego: 'Un muro de fuego cierra el pasillo.',
    bosque: 'El terreno atrapa las piernas del rival.',
    aire: 'Una ráfaga le quita el balón de los pies.',
    montana: 'Aquí no pasa nadie.',
  },
  parada: {
    fuego: 'Detiene el disparo con las manos al rojo.',
    bosque: 'Una malla vegetal frena el balón en seco.',
    aire: 'Una corriente lo levanta por encima del larguero.',
    montana: 'Firme como un muro de piedra.',
  },
}

/**
 * Nombre en español, cuando lo conozco (doblaje de España o el que usa el
 * fandom). Se busca por TÍTULO de la wiki y también por `name_dub`: antes solo
 * se miraba una de las dos claves y la mitad de las traducciones no aplicaba
 * (salía «Legendary Wolf» con «Wolf Legend» traducido en la tabla).
 */
const ES = {
  'Legendary Wolf': 'Leyenda del Lobo',
  'Bakunetsu Storm': 'Tormenta Explosiva',
  'Land Of Ice': 'Suelo Helado',
  'Fireball Knuckle': 'Puño Ardiente',
  'Pressure Punch': 'Puño de Presión',
  'Killer Blade': 'Cuchilla Asesina',
  'Black Hole': 'Agujero Negro',
  'Flower Power': 'Poder Floral',
  Wormhole: 'Agujero de Gusano',
  'Tornado Catch': 'Parada Tornado',
  'Defence Scan': 'Escáner Defensivo',
  'Coil Turn': 'Giro Espiral',
  'Sumo Stomp': 'Pisotón de Sumo',
  'Fake Bomber': 'Amago Explosivo',
  'Planet Shield': 'Escudo Planetario',
  'Flame Dance': 'Danza de Fuego',
  'No Escape': 'Sin Escapatoria',
  'Sleeping Dust': 'Polvo Somnífero',
  'Attack Scan': 'Escáner Ofensivo',
  'Whirlwind Twister': 'Torbellino',
  'Dash Accelerator': 'Aceleración',
  Breakthrough: 'Avance Imparable',
  'Three-Legged Rush': 'Carrera a Tres',
  Moonsault: 'Salto Mortal',
  'Triple Dash': 'Triple Aceleración',
  'Southern Cross': 'Cruz del Sur',
  "Heaven's Time": 'Tiempo Celestial',
  'Lightning Sprint': 'Esprint Relámpago',
  'Grenade Shot': 'Disparo Granada',
  'Tarzan Kick': 'Patada de Tarzán',
  'Spectacle Crash': 'Choque de Gafas',
  'Utter Gutsiness Club': 'Club del Coraje',
  'Butterfly Trance': 'Sueño de Mariposa',
  'Shine Drive': 'Disparo Luminoso',
  'Majin The Hand': 'Mano Demoníaca',
  'Fire Tornado': 'Tornado de Fuego',
  'Dragon Crash': 'Golpe de Dragón',
  'Death Zone': 'Zona Mortal',
  'The Phoenix': 'El Fénix',
  'God Break': 'Golpe Divino',
  'Spinning Cut': 'Corte Giratorio',
  'Dragon Tornado': 'Tornado de Dragón',
  'Tri-Pegasus': 'Tri-Pegaso',
  'Twin Boost': 'Doble Impulso',
  'Megaton Head': 'Cabezazo Megatón',
  'Wolf Legend': 'Leyenda del Lobo',
  'Eternal Blizzard': 'Ventisca Eterna',
  'Northern Impact': 'Impacto Polar',
  'Prime Legend': 'Leyenda Suprema',
  'Grand Fire': 'Gran Fuego',
  'Atomic Flare': 'Llamarada Atómica',
  'The Earth': 'La Tierra',
  'Bakunetsu Screw': 'Rosca Ardiente',
  'Dragon Slayer': 'Mata Dragones',
  'Tsunami Boost': 'Impulso Tsunami',
  'Dark Phoenix': 'Fénix Oscuro',
  'Dark Tornado': 'Tornado Oscuro',
  'Illusion Ball': 'Balón Ilusión',
  'Spiral Draw': 'Espiral',
  Cyclone: 'Ciclón',
  'Butterfly Dream': 'Sueño de Mariposa',
  'Deep Mist': 'Niebla Densa',
  'Rolling Kick': 'Patada Giratoria',
  'Frozen Steal': 'Robo Helado',
  'The Wall': 'El Muro',
  'The Tower': 'La Torre',
  'Killer Slide': 'Entrada Asesina',
  'Ice Ground': 'Suelo Helado',
  'Heat Tackle': 'Entrada Ardiente',
  'Wild Dunk': 'Mate Salvaje',
  'Iron Wall': 'Muro de Hierro',
  Earthquake: 'Terremoto',
  'Perfect Tower': 'Torre Perfecta',
  'God Hand': 'Mano Celestial',
  'Mugen The Hand': 'Mano Infinita',
  'Nekketsu Punch': 'Puño Ardiente',
  'Full Power Shield': 'Escudo Total',
  'Power Shield': 'Escudo',
  'Beast Fang': 'Colmillo de Bestia',
  // --- resto del catálogo, todo en español ---
  'Fake Ball': 'Balón Falso',
  'Ghost Pull': 'Tirón Fantasma',
  'Quick Draw': 'Robo Rápido',
  'Blade Attack': 'Ataque Cuchilla',
  'About Face': 'Media Vuelta',
  'Volcano Cut': 'Corte Volcánico',
  'Shadow Stitch': 'Costura de Sombras',
  Gravitation: 'Gravitación',
  'Shooting Star': 'Estrella Fugaz',
  'Circus Block': 'Bloqueo Circense',
  'Mega Quake': 'Mega Terremoto',
  'Ignite Steal': 'Robo Ígneo',
  'Dual Storm': 'Tormenta Dual',
  Harvest: 'Cosecha',
  'Whale Guard': 'Guardia Ballena',
  'Supreme Spin': 'Giro Supremo',
  Doppelganger: 'Doble Fantasma',
  'Perimeter Zone': 'Zona Perimetral',
  'Heavy Mettle': 'Temple de Acero',
  'Photon Crash': 'Choque de Fotones',
  'Super Sumo Stomp': 'Súper Pisotón de Sumo',
  'Stone Wall': 'Muro de Piedra',
  'Hurricane Arrows': 'Flechas Huracán',
  'Mega Wall': 'Mega Muro',
  'Road Roller': 'Apisonadora',
  'Asteroid Belt': 'Cinturón de Asteroides',
  'Double Cyclone': 'Ciclón Doble',
  'Bamboo Pattern': 'Celosía de Bambú',
  'Spider Web': 'Telaraña',
  'Sigma Zone': 'Zona Sigma',
  'Body Shield': 'Escudo Corporal',
  'Whirlwind Force': 'Fuerza Torbellino',
  'Toughness Block': 'Bloqueo Férreo',
  'Rocket Kobushi': 'Puño Cohete',
  'Warp Space': 'Espacio Curvado',
  'Aurora Curtain': 'Cortina Aurora',
  'Wood Chopper': 'Leñador',
  'Wild Claw': 'Zarpa Salvaje',
  'Table-Turner': 'Vuelca Mesas',
  'Sliding Goal': 'Portería Móvil',
  'Drill Smasher': 'Taladro Demoledor',
  Whirlwind: 'Remolino',
  'Double Rocket': 'Cohete Doble',
  'Tsunami Wall': 'Muro Tsunami',
  'Procyon Net': 'Red de Proción',
  'Counter Strike': 'Contragolpe',
  'Dual Smash': 'Doble Palmeo',
  Burnout: 'Combustión',
  'Temporal Wall': 'Muro Temporal',
  'Infinite Wall': 'Muro Infinito',
  'Flame Breath': 'Aliento de Fuego',
  'Fireball Head': 'Cabezazo Ígneo',
  'Claw Slash': 'Zarpazo',
  'Safety First': 'Seguridad Ante Todo',
  'Swan Dive': 'Palomita del Cisne',
  'Utter Gutsiness Catch': 'Parada del Coraje',
  'Ice Block': 'Bloque de Hielo',
  'Shot Pocket': 'Bolsillo Guardián',
  'Triple God Hand': 'Triple Mano Celestial',
  'Fist of Justice': 'Puño Justiciero',
  'Triple Defence': 'Defensa Triple',
  'Gigant Wall': 'Muro Gigante',
  Magic: 'Magia',
  'Super Armadillo': 'Súper Armadillo',
  Afterimage: 'Espejismo',
  'Warp Drive': 'Regate Espacial',
  'Whirlwind Cut': 'Cuchilla de Viento',
  'Prima Donna': 'Prima Donna',
  'Aurora Dribble': 'Regate Aurora',
  'Big Fan': 'Gran Abanico',
  'Mole Shuffle': 'Baile del Topo',
  'Monkey Turn': 'Giro del Mono',
  'Flame Veil': 'Velo de Fuego',
  'Breakthrough 2': 'Avance Imparable 2',
  'Clone Faker': 'Amago Clon',
  'Dash Storm': 'Carrera Tormenta',
  'Water Veil': 'Velo de Agua',
  'Black Magic': 'Magia Negra',
  'Dark Whirlwind': 'Torbellino Oscuro',
  'Poison Fog': 'Niebla Venenosa',
  'Rodeo Clown': 'Payaso de Rodeo',
  'Mole Fake': 'Amago del Topo',
  'Armadillo Circus': 'Circo Armadillo',
  'Deceptor Dribble': 'Regate Espejismo',
  Bewildered: 'Desconcierto',
  'Invisible Fake': 'Amago Invisible',
  'Double Touch': 'Doble Toque',
  'Boost Glider': 'Planeador',
  'Gale Dash': 'Carrera Vendaval',
  'Dual Pass': 'Pase Dual',
  Aikido: 'Aikido',
  'Rolling Hell': 'Rueda Infernal',
  'Bubble Gum': 'Chicle Pegajoso',
  'Ribbon Shower': 'Lluvia de Cintas',
  'Flurry Dash': 'Carrera Ventisca',
  'Zigzag Spark': 'Chispa Zigzag',
  'Meteor Shower': 'Lluvia de Meteoros',
  'Patriot Shot': 'Disparo Patriota',
  'Spinning Shot': 'Disparo Giratorio',
  'Wrath Shot': 'Disparo Furioso',
  'Double Wrath Shot': 'Doble Disparo Furioso',
  'Back Tornado': 'Chilena Tornado',
  'Cross Drive': 'Tiro Cruzado',
  'Comet Shot': 'Disparo Cometa',
  'Dirt Ball': 'Bola de Barro',
  'Psycho Shot': 'Disparo Psíquico',
  'Kung Fu Header': 'Cabezazo Kung-Fu',
  'Kung Fu Fighting': 'Ataque Kung-Fu',
  'Phantom Shot': 'Disparo Fantasma',
  'Freeze Shot': 'Disparo Helado',
  'Run Ball Run': 'Corre Balón Corre',
  'Rainbow Arc': 'Arco Iris',
  'Reflect Buster': 'Rebote Explosivo',
  'Clone Shot': 'Disparo Clon',
  'Clone Block': 'Bloqueo Clon',
  'Dual Strike': 'Golpe Dual',
  'Divine Arrows': 'Flechas Divinas',
  'Inazuma-1': 'Inazuma Uno',
  'Inazuma Drop': 'Caída Inazuma',
  'Inazuma-1 Drop': 'Caída Inazuma Uno',
  'Wyvern Crash': 'Golpe de Guiverno',
  'Wyvern Blizzard': 'Ventisca de Guiverno',
  'Heel Kick': 'Taconazo',
  'Meteor Attack': 'Ataque Meteoro',
  'Condor Dive': 'Picado del Cóndor',
  'Hawk Shot': 'Disparo Halcón',
  'Revolution V': 'Revolución V',
  'Spiral Shot': 'Disparo Espiral',
  'Snake Shot': 'Disparo Serpiente',
  'Triangle Z': 'Triángulo Z',
  'Triple Boost': 'Triple Impulso',
  'Fire Rooster': 'Gallo de Fuego',
  'Emperor Penguin No. 1': 'Pingüino Emperador Nº 1',
  'Emperor Penguin No. 2': 'Pingüino Emperador Nº 2',
  'Space Penguin': 'Pingüino Espacial',
  'Utter Gutsiness Bat': 'Bate del Coraje',
  'Double Grenade': 'Granada Doble',
  'Dynamite Shot': 'Disparo Dinamita',
  'Steeple Shot': 'Disparo Campanario',
  'Death Zone 2': 'Zona Mortal 2',
  'Security Shot': 'Disparo Escolta',
  'Acrobat Bomber': 'Bomba Acróbata',
  'Baby Dragon': 'Dragón Bebé',
  'Eagle Buster': 'Disparo Águila',
  'Leaping Thunder': 'Trueno Saltarín',
  'Teleport Shot': 'Disparo Teletransporte',
  'Gyro Head': 'Cabezazo Giroscópico',
  'Dragon Cannon': 'Cañón Dragón',
  'Cosmic Blast': 'Explosión Cósmica',
  'Land Dragon': 'Dragón de Tierra',
  'Assault Shot': 'Disparo de Asalto',
  'Gaia Break': 'Golpe de Gaia',
  'Neo Galaxy': 'Neo Galaxia',
  'The Galaxy': 'La Galaxia',
  'Ganymede Ray': 'Rayo de Ganimedes',
  'God Knows': 'Solo Dios Sabe',
  'Twin Boost F': 'Doble Impulso F',
  'Double Tornado': 'Tornado Doble',
  // --- INAZUMA ELEVEN GO (Holy Road). Oficiales del juego donde los hay;
  //     el resto, traducción fiel del nombre del doblaje inglés.
  'Almighty Cannon': 'Cañón Todopoderoso',
  'Anchors Aweigh': 'Levar Anclas',
  'Armoured Cavalry Black Knight': 'Caballo Negro Acorazado',
  'Armoured Cavalry White Knight': 'Caballo Blanco Acorazado',
  "Athena's Anthem": 'Himno de Atenea',
  'Atomic Harmonic': 'Armonía Atómica',
  'Back Slash': 'Tajo Invertido',
  'Ball Lightning': 'Balón Relámpago',
  'Ballista Barrage': 'Lluvia de Balista',
  'Big Ball Trick': 'Truco del Balón Gigante',
  'Black Ash': 'Ceniza Negra',
  'Black Briars': 'Zarzas Negras',
  'Blast Mine': 'Mina Explosiva',
  'Boomerang Bluff': 'Amago Bumerán',
  'Brave Samurai Musashi': 'Samurái Valiente Musashi',
  'Bridge to Nowhere': 'Puente a Ninguna Parte',
  'Brimstone Rain': 'Lluvia de Azufre',
  'Bringer of Dreams Sand Man': 'Señor de los Sueños Sandman',
  'Bushin Blades': 'Hojas Gemelas',
  'Capable Hands': 'Manos Seguras',
  'Card Shark': 'Tahúr',
  Checkmate: 'Jaque Mate',
  'Close Counter': 'Contraataque Cercano',
  'Combustion Catch': 'Parada Ígnea',
  'Crimson Sphere': 'Esfera Carmesí',
  'Criss-Cross': 'Zigzag Cruzado',
  'Crown Fire': 'Corona de Fuego',
  'Dark Space': 'Espacio Oscuro',
  'Defender of Earth Atlas': 'Guardián de la Tierra Atlas',
  'Destrier Charge': 'Carga del Corcel',
  'Dicey Dicer Lot': 'Dado del Destino Lot',
  'Dinosaur Roar': 'Rugido de Dinosaurio',
  'Divine Messenger Black Bishop': 'Alfil Negro Divino',
  'Divine Messenger White Bishop': 'Alfil Blanco Divino',
  'Doom Break': 'Ruptura Fatal',
  'Doom Dive Drive': 'Caída Fatal',
  'Doomsword Slash': 'Tajo Mortal',
  'Dragon Storm': 'Tormenta de Dragones',
  Dragster: 'Bólido',
  'Drake Chevalier Dragoon': 'Caballero Dragón Dragoon',
  'Easy Breezy': 'Brisa Ligera',
  'Emperor Penguin 7': 'Pingüino Emperador Nº 7',
  "Executioner's Axe": 'Hacha del Verdugo',
  'Faster Than Light Tachyon': 'Más Veloz que la Luz Taquión',
  'Feathers of Flames Firebird': 'Plumas de Fuego Fénix',
  'Femme Fatale Sirena': 'Mujer Fatal Sirena',
  'Ferocious Bird of Fable Roc': 'Ave Legendaria Roc',
  'Fingers of Gaia': 'Dedos de Gaia',
  'Fire Jotun Surtr': 'Gigante de Fuego Surtr',
  'Fire Tornado DD': 'Tornado de Fuego DD',
  Flamberge: 'Flamberga',
  'Flapjack Defence': 'Defensa Tortita',
  'Fortissimo Foot': 'Pie Fortissimo',
  'Frenzied Fighter Berserker': 'Guerrero Frenético Berserker',
  'Front-Line Fighter Black Pawn': 'Peón Negro de Vanguardia',
  'Front-Line Fighter White Pawn': 'Peón Blanco de Vanguardia',
  Frosticle: 'Carámbano',
  'Fugue Wave': 'Onda de Fuga',
  'Future Eye': 'Ojo del Futuro',
  'Giant Usurper Gigante': 'Usurpador Gigante',
  'Giga Knuckle Sandwich': 'Puñetazo Gigante',
  'Gigantic Garrison Gargantua': 'Guarnición Gigante Gargantúa',
  'God Hand V': 'Mano Celestial V',
  'Grand Finale': 'Gran Final',
  'Grand Inquisitor Judge': 'Gran Inquisidor Judge',
  'Great Wall': 'Gran Muralla',
  Headbanger: 'Cabezazo Salvaje',
  'Heavenly Horse Arch Pegasus': 'Corcel Celestial Arco Pegaso',
  'Heroic Swordsman Lancelot': 'Espadachín Heroico Lancelot',
  'Hey Presto': '¡Tachán!',
  'High Roller Las Vega': 'Gran Apostador Las Vega',
  "Hunter's Net": 'Red de Cazador',
  Hyperdrive: 'Hipervelocidad',
  'Hypersonic Fighter Scramjet': 'Caza Hipersónico Scramjet',
  'Icicle Road': 'Camino Helado',
  'Infernal Dragon Lord Koro-Koro-Gon': 'Señor Dragón Infernal Korogon',
  'Inferno Fist': 'Puño Infernal',
  'Jumbo Sandwich': 'Sándwich Gigante',
  'Jumping Jack': 'Muelle Saltarín',
  'Katana Kick': 'Patada Katana',
  'Killer Whale': 'Orca Asesina',
  'King of Beasts Leon': 'Rey de las Bestias León',
  'Lancelot Lunge': 'Estocada de Lancelot',
  'Living Nightmare Phantasma': 'Pesadilla Viviente Fantasma',
  'Log Roll': 'Rodillo de Tronco',
  'Lord of All Waters Neptune': 'Señor de las Aguas Neptuno',
  'Lord of Birds and Beasts Griffin': 'Señor de Aves y Bestias Grifo',
  'Lucky Dice': 'Dados de la Suerte',
  "Magician's Box": 'Caja del Mago',
  'Majin the Great': 'Majin el Grande',
  'Master Conductor Maestro': 'Director de Orquesta Maestro',
  'Master Magician Trickster': 'Mago Supremo Trickster',
  'Metal Mammoth Behemoth': 'Mamut de Metal Behemot',
  'Mystifying Mist': 'Niebla Desconcertante',
  'Optimal Trajectory': 'Trayectoria Óptima',
  'Ozone Flayer': 'Desgarrador de Ozono',
  'Pegasus Bolt': 'Rayo Pegaso',
  'Pegasus Punch': 'Puño Pegaso',
  'Pincer Pinch': 'Pinza Tenaza',
  'Power Spike': 'Remate Potente',
  Pyroclastic: 'Piroclasto',
  Pyrokinetic: 'Piroquinesis',
  'Rainbow Bubble Burst': 'Burbujas Arcoíris',
  'Rat-a-Tat Pass': 'Pase Metralleta',
  'Rising Dragon': 'Dragón Ascendente',
  'Roc and Roll': 'Vuelo del Roc',
  'Royal Enchantress Black Queen': 'Reina Negra Hechicera',
  'Royal Enchantress White Queen': 'Reina Blanca Hechicera',
  'Ruler of the Seven Seas Poseidon': 'Señor de los Siete Mares Poseidón',
  'Runaway Train': 'Tren Desbocado',
  'Sacred Serpent White Wyvern': 'Sierpe Sagrada Guiverno Blanco',
  Scattershot: 'Perdigonada',
  'Seal Matrix': 'Matriz de Sellado',
  'Shadow Catch': 'Parada Sombría',
  'Shadow Shooter Trigger': 'Tirador de las Sombras Trigger',
  'Shot Stopper': 'Paradón Total',
  Sidewinder: 'Crótalo',
  'Slice and Dice': 'Corte y Recorte',
  Snakebite: 'Mordedura de Serpiente',
  'Snow Nymph Chione': 'Ninfa de las Nieves Quíone',
  'Snowstorm Leopard': 'Leopardo de la Ventisca',
  'Solar Flare': 'Llamarada Solar',
  'Solar Surprise': 'Sorpresa Solar',
  'Somersault Stamp': 'Voltereta Aplastante',
  'Sonic Shot': 'Tiro Sónico',
  'Spatial Portal': 'Portal Espacial',
  'Sun Deity Apollo': 'Dios del Sol Apolo',
  'Supernatural Strike': 'Golpe Sobrenatural',
  'Supernatural Wingman Thunderbird': 'Ave del Trueno Thunderbird',
  'Tale of the Dragon': 'Leyenda del Dragón',
  'The Great Genie Majin': 'Gran Genio Majin',
  "Thief's Eye": 'Ojo de Ladrón',
  Thunderclaw: 'Garra de Trueno',
  'Tin Titan Goliath': 'Titán de Hojalata Goliat',
  'Titanic Shield': 'Escudo Titánico',
  'Titanic Slam': 'Golpe Titánico',
  'Triangle Double Z': 'Triángulo ZZ',
  'Trident Torpedo': 'Torpedo Tridente',
  'Triple Threat': 'Triple Amenaza',
  Ultrasonic: 'Ultrasónico',
  'Wall of Atlantis': 'Muralla de la Atlántida',
  Warhead: 'Ojiva',
  'Watchtower Sentinel Black Rook': 'Torre Negra Vigía',
  'Watchtower Sentinel White Rook': 'Torre Blanca Vigía',
  'Whip Crack': 'Latigazo',
  Whirlpool: 'Remolino',
  'White Breath': 'Aliento Blanco',
  'White Hurricane': 'Huracán Blanco',
  "Will-o'-the-Wisp Shot": 'Tiro Fuego Fatuo',
  'Winged Steed Pegasus': 'Corcel Alado Pegaso',
  'Wise Monarch Black King': 'Rey Negro Sabio',
  'Wise Monarch White King': 'Rey Blanco Sabio',
  'Zephyr Shot': 'Tiro Céfiro',
  // --- REZAGADAS de la auditoría de agosto de 2026: nombres que seguían en
  //     inglés en la clásica y en VR. Claves por el nombre dub exacto.
  'Divine Stamp': 'Sello Divino',
  "Hell's Descent": 'Descenso Infernal',
  'Racing Flame': 'Llama Rasante',
  'Rolling Slide': 'Barrida Rodante',
  'Zigzag Flame': 'Llama Zigzag',
  'Yo-Yo Ball': 'Balón Yoyó',
  'Dark Mist': 'Niebla Oscura',
  'Deep Diver': 'Buceo Profundo',
  'Snow Angel': 'Ángel de Nieve',
  'Wall Titan Warborg': 'Titán Muralla Warborg',
  'Power Charge': 'Carga de Potencia',
  'Stone Prison': 'Prisión de Piedra',
  'Metal Hammer': 'Martillo de Metal',
  'Diabolical Cut': 'Corte Diabólico',
  "Heaven's Ascent": 'Ascenso Celestial',
  'Barbarian Shield': 'Escudo Bárbaro',
  'The Mountain': 'La Montaña',
  'The Stronghold': 'El Bastión',
  'Desert Blast': 'Ráfaga del Desierto',
  'Vac Attack': 'Succión de Vacío',
  'Fortress of Despair': 'Fortaleza de la Desesperación',
  'The End': 'El Final',
  'Pinch and Save': 'Pellizco Salvador',
  'The Stinger': 'El Aguijón',
  'Needle Hammer': 'Martillo de Agujas',
  'Storm Rider': 'Jinete de la Tormenta',
  'Colosseum Guard': 'Guardia del Coliseo',
  'Flash Upper': 'Gancho Relámpago',
  'Dimensional Hand': 'Mano Dimensional',
  "Bigman's Hammer": 'Martillo del Gigante',
  'Mega Marinara Barrier': 'Mega Barrera Marinera',
  'Hammer of Fury': 'Martillo de la Ira',
  'Maw-Ment of Truth': 'Bocado de la Verdad',
  'Super God Hand': 'Súper Mano Celestial',
  'Shot Trap': 'Trampa de Tiros',
  'Royal Shield': 'Escudo Real',
  'Tiger God Hand': 'Mano Celestial Tigre',
  'God Hand EV': 'Mano Celestial EV',
  "Mama's Helping Hand": 'La Mano de Mamá',
  'Fiend Hand': 'Mano Diabólica',
  'Majin the Wave': 'Ola Majin',
  'God Catch': 'Parada Celestial',
  'Omega Hand': 'Mano Omega',
  'God Catch FT': 'Parada Celestial FT',
  'God Hand of Friendship': 'Mano Celestial de la Amistad',
  'Soul Hand': 'Mano del Alma',
  'God Hand X': 'Mano Celestial X',
  'Kangaroo Kick': 'Patada Canguro',
  'Bewilder Blast': 'Explosión Desconcertante',
  'Endeavor Rush': 'Carrera Tenaz',
  'Liar Shot': 'Tiro Mentiroso',
  'Amp Beat': 'Ritmo Amplificado',
  'Echo Ball': 'Balón Eco',
  'Ultra Moon': 'Ultra Luna',
  'Look! A Rice Ball': '¡Mira! Una Bola de Arroz',
  "Wind God's Dance": 'Danza del Dios del Viento',
  'Devil Ball': 'Balón Diabólico',
  'Angel Ball': 'Balón Angelical',
  "Marshal's Light": 'Luz del Mariscal',
  'The Ikaros': 'El Ícaro',
  'Field of Force': 'Campo de Fuerza',
  'Air Ride': 'Surf Aéreo',
  'Swirly Shot': 'Tiro Remolino',
  'Sniper Shot': 'Tiro Francotirador',
  'The Victory Genie Majin': 'Genio de la Victoria Majin',
  'Solution Boost': 'Impulso Certero',
  'Legendary Silver Wolf': 'Lobo Plateado Legendario',
  'Force Flash': 'Destello de Fuerza',
  'Tiger Drive': 'Disparo del Tigre',
  'Gun Shot': 'Balazo',
  'Mirage Shot': 'Disparo Espejismo',
  'Eiffel Tower': 'Torre Eiffel',
  'Paladin Strike': 'Golpe de Paladín',
  'Bahamut Crash': 'Impacto Bahamut',
  'Capoeira Kick': 'Patada Capoeira',
  'Twin Spur': 'Doble Espuela',
  'Doom Spear': 'Lanza Fatal',
  'The Typhoon': 'El Tifón',
  'Pegasus Shot': 'Tiro Pegaso',
  'Thunder Beast': 'Bestia del Trueno',
  'Doom Rain': 'Lluvia Fatal',
  'Royal Penguin Parade': 'Desfile Real de Pingüinos',
  'Regal Eagle': 'Águila Regia',
  'Super Megaton Head': 'Súper Cabezazo Megatón',
  'Celestial Smash': 'Remate Celestial',
  'Odin Sword': 'Espada de Odín',
  'Samba Strike': 'Golpe de Samba',
  'Double Jaw': 'Doble Mandíbula',
  'Tiger Storm': 'Tormenta del Tigre',
  'Dark Matter': 'Materia Oscura',
  'The Dawn': 'El Amanecer',
  'The Hurricane': 'El Huracán',
  'Heavenly Drive': 'Impulso Celestial',
  'Unicorn Boost': 'Impulso Unicornio',
  'Perseus Strike': 'Golpe de Perseo',
  'Inazuma Break': 'Rayo Inazuma',
  'Inazuma Break CG': 'Rayo Inazuma CG',
  'Brave Shot': 'Tiro Valiente',
  'Meteor Blade': 'Hoja Meteoro',
  'X-Blast': 'Explosión X',
  'Chaos Break': 'Ruptura del Caos',
  'Shadow Empress': 'Emperatriz de las Sombras',
  'Hot Head': 'Cabeza Caliente',
}


/** Descripción de sabor. Sin ella la ficha de la técnica queda desnuda. */
const DESC = {
  'Fire Tornado': 'El balón entra en combustión y arrastra al portero.',
  'Dragon Crash': 'Un dragón de energía escolta el disparo.',
  'Inazuma Break': 'Técnica combinada: dos compañeros catapultan al rematador.',
  'Death Zone': 'Tres jugadores hunden el balón en la portería.',
  'The Phoenix': 'Un ave de fuego renace sobre el área pequeña.',
  'God Break': 'Alas doradas y un disparo que no admite discusión.',
  'Spinning Cut': 'Rosca imposible: el balón dobla a media trayectoria.',
  'Dragon Tornado': 'Dos dragones enroscados alrededor del balón.',
  'Tri-Pegasus': 'Tres caballos alados empujan a la vez.',
  'Twin Boost': 'Dos rematadores al mismo tiempo, un solo disparo.',
  'Megaton Head': 'Un cabezazo que suena a demolición.',
  'Wolf Legend': 'Una manada de lobos de nieve cruza el área.',
  'Eternal Blizzard': 'El campo se hiela por donde pasa el balón.',
  'Northern Impact': 'El hielo estalla bajo la portería.',
  'Prime Legend': 'La bestia legendaria despierta detrás del disparo.',
  'Grand Fire': 'Una columna de fuego sube desde el césped.',
  'Atomic Flare': 'Un fogonazo y ya está dentro.',
  'The Earth': 'El planeta entero empuja el balón.',
  'Bakunetsu Screw': 'Rosca al rojo vivo.',
  'Dragon Slayer': 'Una espada de energía parte la defensa.',
  'Tsunami Boost': 'Una ola levanta el balón por encima de todos.',
  'Dark Phoenix': 'El fénix, pero de sombra.',
  'Dark Tornado': 'El tornado se traga la luz del área.',
  'Illusion Ball': 'Se multiplica en cinco copias y solo una lleva el balón.',
  'Spiral Draw': 'Gira sobre sí mismo y sale por el otro lado.',
  Cyclone: 'Acelera hasta convertirse en un remolino.',
  'Butterfly Dream': 'Una nube de mariposas tapa el regate.',
  'Deep Mist': 'La niebla se traga al que defiende.',
  'Rolling Kick': 'Rueda por encima del rival con el balón pegado.',
  'Frozen Steal': 'El suelo se congela y el balón cambia de dueño.',
  'The Wall': 'Un muro se levanta del césped y el balón se estrella.',
  'The Tower': 'Una torre de piedra corta el pasillo.',
  'Killer Slide': 'Entrada limpia y demoledora.',
  'Ice Ground': 'El suelo se congela bajo los pies del atacante.',
  'Heat Tackle': 'Entra en llamas, y no es una forma de hablar.',
  'Wild Dunk': 'Se lleva por delante balón y delantero.',
  'Iron Wall': 'Dos defensas hacen de pared viviente.',
  Earthquake: 'El terreno tiembla y nadie mantiene el equilibrio.',
  'Perfect Tower': 'La torre, pero sin grietas.',
  'God Hand': 'Una mano gigante emerge y detiene lo indetenible.',
  'Majin The Hand': 'La mano del demonio atrapa el balón en el aire.',
  'Mugen The Hand': 'La mano se estira todo lo que haga falta.',
  'Nekketsu Punch': 'Un puñetazo ardiente contra el disparo.',
  'Full Power Shield': 'El portero se planta y no cede un centímetro.',
  'Power Shield': 'Manos seguras, sin florituras.',
  'Beast Fang': 'Unas fauces enormes muerden el balón.',
}

const TYPE = { shoot: 'tiro', dribble: 'regate', block: 'bloqueo', catch: 'parada' }
// Los elementos de la serie son Fire / Wood / Wind / Mountain (en las entregas
// nuevas «Earth»). OJO: la wiki escribe «Mountain», no «Earth», y con el mapa
// equivocado se descartaba media wiki por «sin infobox utilizable».
const ELEMENT = {
  // La wiki escribe «Forest» y «Mountain». Con «Wood» y «Earth» (que es como se
  // llaman en las entregas nuevas) se caía TODO el bosque del catálogo y los
  // jugadores de ese elemento se quedaban sin nada que aprender.
  fire: 'fuego', forest: 'bosque', wood: 'bosque', wind: 'aire',
  mountain: 'montana', earth: 'montana',
}
/**
 * Elemento a mano para las fichas cuyo campo `element` de la wiki viene roto
 * (algunas repiten ahí el nombre de la técnica).
 */
const ELEMENT_FIX = {
  'God Hand': 'montana',
  'Majin The Hand': 'montana',
  'Mugen The Hand': 'montana',
}

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

/** Primer número de un campo del infobox, que suele traer varias versiones. */
function firstNumber(text) {
  const m = /(\d+)/.exec(text ?? '')
  return m ? Number(m[1]) : null
}

function field(wikitext, name) {
  const re = new RegExp(`\\|\\s*${name}\\s*=\\s*([^|}]*)`, 'i')
  const m = re.exec(wikitext)
  return m ? m[1].trim() : ''
}

/**
 * Campo que puede llevar plantillas con `|` dentro (`{{Media|games|IE}}`), así
 * que se lee hasta el siguiente campo del infobox y no hasta el primer `|`.
 */
function longField(wikitext, name) {
  const re = new RegExp(`\\n\\|\\s*${name}\\s*=\\s*([\\s\\S]*?)(?=\\n\\|)`, 'i')
  const m = re.exec(wikitext)
  return m ? m[1].trim() : ''
}

/** Nombre del doblaje inglés, sin viñetas ni variantes entre paréntesis. */
function dubName(wikitext, fallback) {
  const raw = longField(wikitext, 'name_dub') || field(wikitext, 'name_dub')
  const first = raw.split('\n').map((l) => l.replace(/^\*+/, '').trim()).filter(Boolean)[0]
  if (!first) return fallback
  const clean = first
    // Bastantes fichas ponen {{PAGENAME}} en vez de repetir el nombre.
    .replace(/\{\{PAGENAME\}\}/gi, fallback)
    // Y alguna mete {{Hover|texto|tooltip}}: se queda el texto visible
    // («Triangle {{Hover|Double Z|ZZ}}» → «Triangle Double Z»).
    .replace(/\{\{Hover\|([^}|]*)\|[^}]*\}\}/gi, '$1')
    .replace(/''.*?''/g, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
  return clean || fallback
}

async function fetchTechnique(title) {
  const parsed = await api({ action: 'parse', prop: 'wikitext', page: title, redirects: '1' })
  const wt = parsed?.parse?.wikitext?.['*']
  if (!wt) return null

  // Las TRES entregas de la saga original: Football Frontier, Instituto Alius
  // y el Mundial. Con solo IE1-IE2, las selecciones de la FFI (Fire Dragon,
  // The Kingdom, Ogre…) se quedaban sin sus técnicas de verdad.
  // OJO: `debut_game` suele ser el ÚLTIMO campo del infobox y el parser de
  // campos exige un salto+pipe detrás — todas las fichas de VR con esa forma
  // devolvían null y sus técnicas no existían. Ventana acotada y listo.
  const debut = /\|\s*debut_game\s*=\s*([\s\S]{0,160})/i.exec(wt)?.[1] ?? ''
  const clasica = /\{\{Media\|games\|IE([23])?\}\}/.test(debut)
  // VICTORY ROAD es otra ÉPOCA: sus técnicas entran, pero marcadas, para que
  // el relleno de cadenas no le cuelgue una técnica de VR a Mark Evans (ni al
  // revés). Ver `ERA` en el emisor de jugadores.
  const vr = /\{\{Media\|games\|VR/i.test(debut)
  // INAZUMA ELEVEN GO (solo la temporada 1 y su película): códigos GO, 2011 y
  // TO. Chrono Stone (CS) y Galaxy (GAL) quedan FUERA a propósito. Las
  // técnicas de espíritu guerrero del anime entran aquí como supertécnicas
  // NORMALES (su ficha ya trae type/element de siempre) — regla Entretainer.
  const go = /\{\{Media\|games\|(GO|2011|TO)\}\}/i.test(debut)
  if (!clasica && !vr && !go) return null
  const name = dubName(wt, title)

  // Algunas técnicas son de dos clases (`type` y `type2`). Se queda la
  // defensiva si la hay: en este modo un bloqueo y un regate no son
  // intercambiables, los usan demarcaciones distintas.
  // Manda el tipo PRINCIPAL. Al preferir el secundario defensivo se colaban
  // cosas raras (el Corte Giratorio, que es un tiro, acababa de bloqueo).
  const type = TYPE[field(wt, 'type').toLowerCase().replace(/[^a-z]/g, '')]
  const element = ELEMENT_FIX[name]
    ?? ELEMENT[field(wt, 'element').toLowerCase().replace(/[^a-z]/g, '')]
  if (!type || !element) return null

  const power = firstNumber(field(wt, 'power'))
  const tp = firstNumber(field(wt, 'tp_ie')) ?? firstNumber(field(wt, 'tp_ie2'))

  const img = await api({
    action: 'query', prop: 'pageimages', piprop: 'thumbnail', pithumbsize: '256', titles: title,
  })
  const pages = img?.query?.pages ?? {}
  let thumb = null
  for (const k of Object.keys(pages)) {
    if (k !== '-1' && pages[k]?.thumbnail?.source) thumb = pages[k].thumbnail.source
  }

  return { title, name, type, element, power, tp, thumb, era: clasica ? 'clasica' : vr ? 'vr' : 'go' }
}

/**
 * Normaliza a la escala del modo. Las potencias de la wiki mezclan juegos y
 * versiones (de 40 a 200), así que se comprimen a 25-135 conservando el orden.
 */
function balance(list) {
  const powers = list.map((t) => t.power ?? 60)
  const lo = Math.min(...powers)
  const hi = Math.max(...powers)
  return list.map((t) => {
    const raw = t.power ?? 60
    const norm = hi > lo ? (raw - lo) / (hi - lo) : 0.5
    const power = Math.round(25 + norm * 110)
    // El coste sale de la potencia, no del TP de la wiki: así no hay técnicas
    // baratísimas y demoledoras que rompan la economía de PT del modo.
    // 0.42 y no 0.29: con el coste antiguo un jugador tiraba 4-5 supertécnicas
    // por partido y ni él ni el rival se agotaban nunca — no había decisión.
    const cost = Math.max(8, Math.round(power * 0.42))
    return { ...t, power, cost }
  })
}

async function main() {
  await mkdir(OUT_IMG, { recursive: true })

  // Barrer la wiki entera lleva unos minutos, así que se cachea: para retocar
  // el reparto o los nombres no hace falta volver a pedirle nada.
  let cached = null
  try { cached = JSON.parse(await readFile(CACHE, 'utf8')) } catch { /* primera vez */ }
  if (cached) {
    // `--rescue`: repasa el catálogo cacheado buscando las técnicas que los
    // jugadores nombran y aún faltan, sin volver a barrer la wiki entera.
    if (process.argv.includes('--rescue')) {
      await rescueNamed(cached)
      await writeFile(CACHE, JSON.stringify(cached, null, 1), 'utf8')
    }
    return emit(cached)
  }

  const titles = []
  for (const cat of CATEGORIES) {
    const j = await api({ action: 'query', list: 'categorymembers', cmtitle: cat, cmlimit: '500' })
    const members = (j?.query?.categorymembers ?? []).map((m) => m.title)
    console.log(`${cat}: ${members.length} fichas`)
    titles.push(...members)
    await new Promise((r) => setTimeout(r, 250))
  }

  const found = []
  const seenTitles = new Set()
  for (const title of titles) {
    // Una técnica puede estar en dos categorías (Heat Tackle es regate y
    // bloqueo) y se colaba dos veces con el mismo id.
    if (seenTitles.has(title)) continue
    seenTitles.add(title)
    try {
      const t = await fetchTechnique(title)
      if (!t) continue
      // Sin imagen SÍ entra: la UI cae al icono de su elemento. Descartarlas
      // dejaba a jugadores sin sus técnicas canónicas (el Excalibur de Edgar
      // y compañía), que es mucho peor que un hueco de ilustración.
      found.push(t)
      console.log(`  ✓ ${t.name} · ${t.type} · ${t.element} · pot.${t.power ?? '?'}`)
    } catch (err) {
      console.log(`  ✗ ${title} — ${err.message}`)
    }
    await new Promise((r) => setTimeout(r, 120))
  }

  // REPESCA: las categorías de la wiki no lo listan todo, así que se recorre
  // lo que USAN los jugadores del roster (`Module:Moveset/Users`, ya volcado
  // en la caché del crawler) y se busca una a una la que falte. Es lo que
  // garantiza que si un jugador tiene Excalibur, Excalibur existe.
  await rescueNamed(found)

  await mkdir(dirname(CACHE), { recursive: true })
  await writeFile(CACHE, JSON.stringify(found, null, 1), 'utf8')
  return emit(found)
}

/** Elige el catálogo definitivo y escribe el fichero y las imágenes. */
/**
 * Repesca las técnicas que los jugadores del roster NOMBRAN y no están en el
 * catálogo. Las categorías de la wiki se dejan cosas (y las plantillas de
 * moveset no aparecen en ninguna), así que esta pasada es la que cierra el
 * círculo: si alguien la usa, existe.
 */
async function rescueNamed(found) {
  let roster = null
  try {
    roster = JSON.parse(await readFile(join(ROOT, 'scripts', '.cache', 'inazuma-roster.json'), 'utf8'))
  } catch { return }
  // Por NOMBRE dub y por TÍTULO: los movesets del módulo van en romaji y
  // comparar solo el dub hacía refetchear cientos de fichas en cada pasada.
  const have = new Set(found.flatMap((t) => [slug(t.name), slug(t.title)]))
  const wanted = new Map()
  for (const list of Object.values(roster)) {
    for (const p of list) {
      for (const h of p.hissatsu ?? []) {
        const key = slug(h)
        if (!have.has(key) && !wanted.has(key)) wanted.set(key, h)
      }
    }
  }
  if (!wanted.size) return
  console.log(`repesca: ${wanted.size} técnicas nombradas por jugadores que no están en el catálogo`)
  let ok = 0
  for (const name of wanted.values()) {
    try {
      const t = await fetchTechnique(name)
      if (t) { found.push(t); ok++; console.log(`  + ${t.name} · ${t.type} · ${t.element}`) }
      else console.log(`  ? ${name}: la ficha no se pudo interpretar`)
    } catch (err) { console.log(`  ✗ ${name}: ${err.message}`) }
    await new Promise((r) => setTimeout(r, 90))
  }
  console.log(`repesca: ${ok} recuperadas`)
}

/** Técnicas que ALGÚN jugador del roster usa: entran SIEMPRE al catálogo. */
async function rosterUsedSlugs() {
  try {
    const roster = JSON.parse(await readFile(join(ROOT, 'scripts', '.cache', 'inazuma-roster.json'), 'utf8'))
    const used = new Set()
    for (const list of Object.values(roster)) {
      for (const p of list) for (const h of p.hissatsu ?? []) used.add(slug(h))
    }
    return used
  } catch { return new Set() }
}

async function emit(found) {
  // Reparto por clase Y elemento (ver `PER_KIND_ELEMENT`).
  const must = new Set(MUST_HAVE)
  // Y lo que USA la gente del roster NUNCA se muestrea fuera: la repesca las
  // recuperaba… y este muestreo por cupos las volvía a tirar (Tenkuu Thunder
  // del protagonista de VR, sin ir más lejos).
  const used = await rosterUsedSlugs()
  const list = []
  for (const [kind, max] of Object.entries(PER_KIND_ELEMENT)) {
    for (const element of ELEMENTS) {
      const pool = found
        .filter((t) => t.type === kind && t.element === element)
        .sort((a, b) => (a.power ?? 0) - (b.power ?? 0))
      if (!pool.length) {
        console.log(`  ! sin técnicas de ${kind}/${element} en la wiki`)
        continue
      }
      // Primero las imprescindibles y el resto muestreando la curva de potencia,
      // para que haya básicas, medias y definitivas de cada elemento.
      const picked = pool.filter((t) => must.has(t.name) || must.has(t.title) || used.has(slug(t.title)) || used.has(slug(t.name)))
      const rest = pool.filter((t) => !picked.includes(t))
      const room = Math.max(0, max - picked.length)
      for (let i = 0; i < room && rest.length; i++) {
        picked.push(rest[Math.round((i * (rest.length - 1)) / Math.max(1, room - 1))])
      }
      list.push(...new Set(picked))
    }
  }

  // SIN DUPLICADOS: las repescas encadenadas apilaban la misma técnica en el
  // caché (mismo título varias veces) y el catálogo salía con ids repetidos.
  // Y DEDUPE POR NOMBRE: la repesca guardaba las técnicas de espíritu
  // guerrero bajo su nombre CORTO de moveset («Lancelot») además del título
  // completo («Kensei Lancelot») — misma técnica dos veces, y la corta sin
  // imagen. Gana la que tiene imagen (o el título más largo, que es el
  // canónico); el alias del emisor de jugadores resuelve el nombre corto.
  const byNameKey = new Map()
  for (const t of list) {
    const key = `${slug(t.name)}|${t.type}|${t.element}`
    const prev = byNameKey.get(key)
    if (!prev || (!prev.thumb && t.thumb) || (Boolean(t.thumb) === Boolean(prev.thumb) && t.title.length > prev.title.length)) {
      byNameKey.set(key, t)
    }
  }
  const seenIds = new Set()
  const deduped = balance([...new Set([...byNameKey.values()])]).filter((t) => {
    const id = slug(t.title)
    if (seenIds.has(id)) return false
    seenIds.add(id)
    return true
  })
  const balanced = deduped
    .sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : a.power - b.power))

  // Imágenes
  let imgs = 0
  for (const t of balanced) {
    if (!t.thumb) continue
    try {
      const res = await fetch(t.thumb, { headers: { 'User-Agent': UA } })
      if (!res.ok) throw new Error(String(res.status))
      // La wiki cuela de vez en cuando el ORIGINAL en vez de la miniatura (un
      // GIF animado de 7 MB, por ejemplo). Eso reventaba el build al no caber
      // en el precache del service worker, y sobre todo es un ladrillo para
      // quien juega: si pesa demasiado, mejor sin imagen (cae al icono de su
      // elemento).
      const bytes = Buffer.from(await res.arrayBuffer())
      if (bytes.byteLength > 1_200_000) {
        console.log(`  ✗ imagen de ${t.name}: ${Math.round(bytes.byteLength / 1024)} KB, demasiado pesada`)
        continue
      }
      // El nombre del fichero es el ID (que sale del TÍTULO de la wiki), no el
      // nombre traducido: si no, la ficha buscaba `tornado-de-fuego.png` y la
      // imagen estaba guardada como `fire-tornado.png`.
      await writeFile(join(OUT_IMG, `${slug(t.title)}.png`), bytes)
      imgs++
    } catch (err) {
      console.log(`  ✗ imagen de ${t.name}: ${err.message}`)
    }
    await new Promise((r) => setTimeout(r, 180))
  }

  const lines = []
  lines.push('// Catálogo de supertécnicas. GENERADO — se regenera con')
  lines.push('// `node scripts/build-inazuma-techniques.mjs`.')
  lines.push('//')
  lines.push('// TODAS son técnicas REALES de la serie: el nombre, la clase (tiro/regate/')
  lines.push('// bloqueo/parada) y el elemento salen del infobox `Hissatsu` de la wiki de')
  lines.push('// Fandom, y la imagen de `public/inazuma/techniques/<id>.png` es la de esa')
  lines.push('// misma ficha. Antes había técnicas de relleno inventadas; ya no queda ninguna.')
  lines.push('//')
  lines.push('// La POTENCIA y el COSTE sí están reescalados: los números del juego original')
  lines.push('// mezclan versiones y no encajan en la economía de PT de este modo.')
  lines.push("import type { Technique } from '@/engine/inazuma/types'")
  lines.push('')
  lines.push('export const TECHNIQUES: Technique[] = [')
  // TÉCNICAS EXTRA fuera del filtro de debut (canon de la saga cubierta que
  // la wiki fecha en juegos posteriores): la Mano Ultradimensional y la
  // Parada Celestial de Endou. La imagen se baja aparte (una vez).
  lines.push('  // -------------------- EXTRA (canon fuera del filtro de debut)')
  lines.push(`  { id: 'ijigen-the-hand', name: "Mano Ultradimensional", kind: 'parada', element: 'aire', power: 101, cost: 42, desc: "Abre una grieta dimensional que se traga el disparo." },`)
  lines.push(`  { id: 'god-catch', name: "Parada Celestial", kind: 'parada', element: 'montana', power: 150, cost: 63, desc: "Dos manos divinas cierran la portería entera." },`)
  // Con el filtro de GO abierto, el barrido AHORA encuentra estas dos y
  // salían DUPLICADAS (dos `god-catch` con potencias distintas). Mandan las
  // curadas de arriba: son las definitivas de Mark, con su potencia afinada.
  const curatedExtras = new Set(['ijigen-the-hand', 'god-catch'])
  let lastType = ''
  for (const t of balanced.filter((x) => !curatedExtras.has(slug(x.title)))) {
    if (t.type !== lastType) {
      lastType = t.type
      lines.push(`  // ${'-'.repeat(20)} ${t.type.toUpperCase()}`)
    }
    // El id sale del TÍTULO de la wiki, que es único; el nombre puede repetirse
    // entre variantes y dejaba dos técnicas con la misma clave.
    const id = slug(t.title)
    // El caché puede traer nombres con {{Hover|..}} de pasadas viejas.
    const raw = t.name.replace(/\{\{Hover\|([^}|]*)\|[^}]*\}\}/gi, '$1')
    const name = ES[raw] ?? ES[t.title] ?? raw
    const desc = DESC[raw] ?? DESC[t.title] ?? GENERIC[t.type][t.element]
    // `era` solo en las de otra época (VR y GO): las clásicas se quedan sin
    // el campo, que son la inmensa mayoría.
    const era = t.era === 'vr' ? ", era: 'vr'" : t.era === 'go' ? ", era: 'go'" : ''
    lines.push(`  { id: '${id}', name: ${JSON.stringify(name)}, kind: '${t.type}', element: '${t.element}', power: ${t.power}, cost: ${t.cost}${era}, desc: ${JSON.stringify(desc)} },`)
  }
  lines.push(']')
  lines.push('')
  lines.push('export const TECHNIQUE_BY_ID = new Map(TECHNIQUES.map((t) => [t.id, t]))')
  lines.push('')
  lines.push('export function getTechnique(id: string): Technique | undefined {')
  lines.push('  return TECHNIQUE_BY_ID.get(id)')
  lines.push('}')
  lines.push('')
  lines.push('/** Técnicas de una clase concreta, para el draft y el aprendizaje. */')
  lines.push("export function techniquesOfKind(kind: Technique['kind']): Technique[] {")
  lines.push('  return TECHNIQUES.filter((t) => t.kind === kind)')
  lines.push('}')
  lines.push('')
  lines.push('/** Qué clase de técnica usa cada demarcación al atacar/defender. */')
  lines.push("export const KIND_LABEL: Record<Technique['kind'], string> = {")
  lines.push("  tiro: 'Tiro',")
  lines.push("  regate: 'Regate',")
  lines.push("  bloqueo: 'Bloqueo',")
  lines.push("  parada: 'Parada',")
  lines.push('}')
  lines.push('')
  lines.push('/** Lo que cuesta un manual de supertécnica: proporcional a su potencia. */')
  lines.push('export function techniquePrice(t: Technique): number {')
  lines.push('  return Math.round(500 + t.power * 22)')
  lines.push('}')
  lines.push('')
  lines.push('/**')
  lines.push(' * Manuales a la venta. Es un surtido FIJO por partida (depende de la semilla)')
  lines.push(' * que se renueva según avanzas: si la tienda ofreciera el catálogo entero,')
  lines.push(' * comprar dejaría de ser una decisión y sería una lista de la compra.')
  lines.push(' */')
  lines.push('export function techniqueStock(seed: number, progress: number): Technique[] {')
  lines.push('  const maxPower = 55 + progress * 12')
  lines.push('  const pool = TECHNIQUES.filter((t) => t.power <= maxPower)')
  lines.push('  const out: Technique[] = []')
  lines.push('  let h = (seed ^ (progress * 2654435761)) >>> 0')
  lines.push('  for (let i = 0; i < 4 && pool.length; i++) {')
  lines.push('    h = (Math.imul(h ^ (h >>> 15), 2246822507) >>> 0)')
  lines.push('    const pick = pool[h % pool.length]')
  lines.push('    if (!out.includes(pick)) out.push(pick)')
  lines.push('  }')
  lines.push('  return out')
  lines.push('}')
  lines.push('')

  await writeFile(OUT_TS, lines.join('\n'), 'utf8')
  const count = {}
  for (const t of balanced) count[t.type] = (count[t.type] ?? 0) + 1
  console.log(`\n${balanced.length} técnicas escritas · ${imgs} imágenes`)
  console.log('  ' + Object.entries(count).map(([k, n]) => `${k}:${n}`).join('  '))
}

main().catch((err) => { console.error(err); process.exit(1) })
