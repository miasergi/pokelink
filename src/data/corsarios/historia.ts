// Hilo narrativo de Corsarios: la llegada a cada isla, lo que dice cada jefe
// antes de pelear y el final. Corto a propósito: se lee de un vistazo.

export interface Escena {
  titulo: string
  lineas: string[]
}

export const INTRO_ISLA: Escena[] = [
  {
    titulo: 'Isla Tortuga Gris',
    lineas: [
      'Un bote con más agujeros que tablas, un grumete que no sabe nadar y un mapa con seis cruces rojas.',
      'Dicen que quien conquiste las seis islas tendrá el mar entero. Dicen también que nadie ha pasado de la primera.',
      'En el muelle de Tortuga Gris manda el Tuerto Gallardo. Habrá que presentarse.',
    ],
  },
  {
    titulo: 'Arrecife Carmesí',
    lineas: [
      'El agua se vuelve roja como el vino barato. No es sangre: es coral. Casi siempre.',
      'La Reina Medusa cobra peaje a todo barco que cruza su arrecife. Hoy no piensas pagar.',
    ],
  },
  {
    titulo: 'Puerto Ceniza',
    lineas: [
      'Por primera vez ves banderas de la Armada. Muchas. Demasiadas.',
      'El Coronel Brasa ha jurado colgar a cada pirata que pise su puerto. Ya ha empezado a buscar soga.',
    ],
  },
  {
    titulo: 'Isla Calavera',
    lineas: [
      'Ni un pájaro. Ni una ola. Solo huesos en la arena y una cripta en lo alto.',
      'El Barón Huesos lleva cien años esperando visita. Tu tripulación se pone a rezar, por si acaso.',
    ],
  },
  {
    titulo: 'Mar de Niebla',
    lineas: [
      'La niebla es tan espesa que la proa no ve la popa. Se oye un violín. Nadie lo toca.',
      'En algún lugar navega el velero negro de la Viuda Gris. Tres capitanes la buscaron antes que tú.',
    ],
  },
  {
    titulo: 'Fortaleza del Almirante',
    lineas: [
      'Murallas de piedra, cien cañones y el último bastión de la Armada.',
      'El Almirante Hierro te espera en el puente de mando. Sabe tu nombre. Lo ha oído en cada isla que has liberado.',
    ],
  },
]

/** Lo que suelta cada jefe al empezar el combate. */
export const FRASE_JEFE: Record<string, string> = {
  gallardo: '¡Un capitán de bote de remos! Mi parche y yo nos vamos a reír mucho.',
  medusa: 'Nadie cruza mi arrecife sin pagar. Tú pagarás con tu barco.',
  brasa: 'En nombre de la Armada: ¡fuego a discreción!',
  huesos: 'Cien años sin visitas… Quédate. Para siempre.',
  viuda: 'Shhh. Escucha el violín. Es tu canción de despedida.',
  hierro: 'Seis islas. Impresionante. Esta es la séptima, y aquí se acaba tu historia.',
}

export const FINAL: Escena = {
  titulo: 'La bandera negra ondea',
  lineas: [
    'El Almirante Hierro deja caer su sable. Luego, para sorpresa de todos, se quita el bicornio y te lo ofrece.',
    'Las seis islas son libres. En cada taberna del mar se canta tu nombre, y la mitad de las canciones son casi verdad.',
    'Pero los viejos marineros hablan de aguas más allá del mapa: el Mar Abierto, donde nunca se acaban los rivales.',
    'Tu tripulación te mira. Nadie quiere volver a casa.',
  ],
}

export const TUTORIAL: Escena[] = [
  { titulo: 'Bienvenido a bordo', lineas: ['Eres un capitán con un bote y un grumete. Tu meta: conquistar las seis islas y vencer al Almirante.'] },
  { titulo: 'Islas', lineas: ['Cada isla tiene tres escaramuzas y un jefe. Los combates son automáticos: tú preparas la tripulación y miras.', 'Gana sin bajas para llevarte las 3 estrellas. Con 3 estrellas puedes saquear el escenario sin pelearlo.'] },
  { titulo: 'Taberna', lineas: ['Aquí se recluta. Una ronda de grog gratis al día; el cofre del capitán, con perlas, trae a los mejores.', 'Los repetidos suben estrellas. Los jefes que derrotes aparecerán por la taberna.'] },
  { titulo: 'Oficios', lineas: ['Espadachín vence a Luchador, Luchador a Tirador y Tirador a Espadachín (+30% de daño). El Navegante cura y protege.', 'Mira los oficios del rival antes de abordar.'] },
  { titulo: 'Tripulación y botín', lineas: ['Los piratas que pelean ganan experiencia. Entrénalos con doblones si se quedan atrás.', 'Los combates sueltan armas y amuletos: equípalos desde la ficha de cada pirata.'] },
]
