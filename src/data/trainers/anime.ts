// Personajes (anime / protagonistas / leyendas) para la Liga Pokémon.
// `team` = especies base; el generador de la Liga las lleva a nivel 100, les
// equipa objetos y asigna 1 megaevolución y 1 Movimiento Z.

const SHOWDOWN = (slug: string) => `https://play.pokemonshowdown.com/sprites/trainers/${slug}.png`

export interface AnimeTrainer {
  id: string
  name: string
  sprite: string
  team: number[] // ids de especie (6)
}

export const ANIME_TRAINERS: AnimeTrainer[] = [
  { id: 'ash', name: 'Ash', sprite: SHOWDOWN('ash'), team: [25, 6, 254, 658, 94, 149] }, // Pikachu, Charizard, Sceptile, Greninja, Gengar, Dragonite
  { id: 'red', name: 'Red', sprite: SHOWDOWN('red'), team: [25, 3, 6, 9, 143, 130] }, // Pikachu, Venusaur, Charizard, Blastoise, Snorlax, Gyarados
  { id: 'gary', name: 'Gary', sprite: SHOWDOWN('blue'), team: [9, 130, 18, 59, 65, 112] }, // Blastoise, Gyarados, Pidgeot, Arcanine, Alakazam, Rhydon
  { id: 'ethan', name: 'Oro', sprite: SHOWDOWN('ethan'), team: [157, 248, 130, 232, 197, 212] }, // Typhlosion, Tyranitar, Gyarados, Donphan, Umbreon, Scizor
  { id: 'lyra', name: 'Lyra', sprite: SHOWDOWN('lyra'), team: [154, 199, 181, 234, 209, 241] }, // Meganium, Slowking, Ampharos, Stantler, Granbull, Miltank
  { id: 'brendan', name: 'Bruno (Hoenn)', sprite: SHOWDOWN('brendan'), team: [254, 260, 257, 376, 373, 350] }, // Sceptile, Swampert, Blaziken, Metagross, Salamence, Milotic
  { id: 'may', name: 'Aura', sprite: SHOWDOWN('may'), team: [257, 282, 311, 350, 376, 373] }, // Blaziken, Gardevoir, Plusle, Milotic, Metagross, Salamence
  { id: 'lucas', name: 'Lucas', sprite: SHOWDOWN('lucas'), team: [392, 395, 405, 448, 461, 442] }, // Infernape, Empoleon, Luxray, Lucario, Weavile, Spiritomb
  { id: 'dawn', name: 'Maya', sprite: SHOWDOWN('dawn'), team: [395, 407, 419, 478, 460, 473] }, // Empoleon, Roserade, Floatzel, Froslass, Abomasnow, Mamoswine
  { id: 'hilbert', name: 'Hilberto', sprite: SHOWDOWN('hilbert'), team: [503, 612, 635, 637, 530, 604] }, // Samurott, Haxorus, Hydreigon, Volcarona, Excadrill, Eelektross
  { id: 'hilda', name: 'Blanca', sprite: SHOWDOWN('hilda'), team: [497, 609, 596, 537, 553, 567] }, // Serperior, Chandelure, Galvantula, Seismitoad, Krookodile, Archeops
  { id: 'n', name: 'N', sprite: SHOWDOWN('n'), team: [571, 635, 564, 567, 547, 553] }, // Zoroark, Hydreigon, Carracosta, Archeops, Whimsicott, Krookodile
  { id: 'calem', name: 'Calem', sprite: SHOWDOWN('calem'), team: [658, 663, 671, 681, 700, 706] }, // Greninja, Talonflame, Florges, Aegislash, Sylveon, Goodra
  { id: 'serena', name: 'Serena', sprite: SHOWDOWN('serena'), team: [655, 700, 671, 706, 681, 762] }, // Delphox, Sylveon, Florges, Goodra, Aegislash, Steenee
  { id: 'elio', name: 'Elio', sprite: SHOWDOWN('elio'), team: [724, 745, 727, 730, 738, 784] }, // Decidueye, Lycanroc, Incineroar, Primarina, Vikavolt, Kommo-o
  { id: 'selene', name: 'Selene', sprite: SHOWDOWN('selene'), team: [727, 760, 738, 754, 745, 778] }, // Incineroar, Bewear, Vikavolt, Lurantis, Lycanroc, Mimikyu
  { id: 'victor', name: 'Víctor', sprite: SHOWDOWN('victor'), team: [887, 681, 462, 248, 823, 884] }, // Dragapult, Aegislash, Magnezone, Tyranitar, Corviknight, Duraludon
  { id: 'gloria', name: 'Gloria', sprite: SHOWDOWN('gloria'), team: [892, 869, 879, 858, 845, 818] }, // Urshifu, Alcremie, Copperajah, Hatterene, Cramorant, Inteleon
]
