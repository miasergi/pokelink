// Base de datos de jugadores.
//
// FUENTES / LICENCIAS: los nombres son los del doblaje europeo de la serie
// (Mark Evans, Axel Blaze, Jude Sharp…). Los ATRIBUTOS y los ELEMENTOS **no**
// son un volcado del juego de DS: están puestos a mano para que el roguelite
// esté equilibrado (ver `rarity` → presupuesto de puntos más abajo). Los
// jugadores marcados `// original` no existen en la serie: son relleno para
// completar las plantillas rivales sin inventarme canon que no conozco.
//
// Presupuesto de atributos por rareza (suma de los 6 valores base):
//   ★1 ≈ 200   ★2 ≈ 240   ★3 ≈ 285   ★4 ≈ 330   ★5 ≈ 375
// Repartido según demarcación: POR carga en `defensa`, DEL en `tiro`, etc.
//
// El `id` se usa también como `portrait` por defecto, así que el script
// `scripts/fetch-inazuma-portraits.mjs` guarda las imágenes en
// `public/inazuma/players/<id>.webp`. Si el fichero no existe, la UI pinta la
// carta generada y no pasa nada.
import type { PlayerBase } from '@/engine/inazuma/types'

export const PLAYERS: PlayerBase[] = [
  // ======================================================= RAIMON (tu base) ==
  {
    id: 'mark-evans', name: 'Mark Evans', team: 'raimon', position: 'POR', element: 'montana', rarity: 5,
    stats: { tiro: 40, control: 55, fisico: 70, defensa: 82, velocidad: 52, aguante: 76 },
    techniques: ['p-mano-celestial', 'p-blocaje'],
  },
  {
    id: 'axel-blaze', name: 'Axel Blaze', team: 'raimon', position: 'DEL', element: 'fuego', rarity: 5,
    stats: { tiro: 84, control: 68, fisico: 60, defensa: 38, velocidad: 72, aguante: 53 },
    techniques: ['t-tornado-fuego', 't-brasa'],
  },
  {
    id: 'jude-sharp', name: 'Jude Sharp', team: 'raimon', position: 'MED', element: 'bosque', rarity: 5,
    stats: { tiro: 66, control: 84, fisico: 52, defensa: 58, velocidad: 62, aguante: 53 },
    techniques: ['r-ilusion', 't-pinguinos-1'],
  },
  {
    id: 'shawn-frost', name: 'Shawn Frost', team: 'raimon', position: 'DEL', element: 'aire', rarity: 5,
    stats: { tiro: 80, control: 70, fisico: 50, defensa: 62, velocidad: 66, aguante: 47 },
    techniques: ['t-ventisca', 'b-barrera-hielo'],
  },
  {
    id: 'nathan-swift', name: 'Nathan Swift', team: 'raimon', position: 'DEF', element: 'aire', rarity: 4,
    stats: { tiro: 42, control: 62, fisico: 44, defensa: 68, velocidad: 82, aguante: 52 },
    techniques: ['r-torbellino', 'b-entrada'],
  },
  {
    id: 'kevin-dragonfly', name: 'Kevin Dragonfly', team: 'raimon', position: 'DEL', element: 'bosque', rarity: 4,
    stats: { tiro: 76, control: 58, fisico: 66, defensa: 40, velocidad: 58, aguante: 52 },
    techniques: ['t-golpe-dragon', 'r-recorte'],
  },
  {
    id: 'jack-wallside', name: 'Jack Wallside', team: 'raimon', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 30, control: 38, fisico: 76, defensa: 74, velocidad: 26, aguante: 61 },
    techniques: ['b-muro'],
  },
  {
    id: 'erik-eagle', name: 'Erik Eagle', team: 'raimon', position: 'DEL', element: 'fuego', rarity: 3,
    stats: { tiro: 68, control: 50, fisico: 48, defensa: 34, velocidad: 60, aguante: 45 },
    techniques: ['t-brasa', 'r-recorte'],
  },
  {
    id: 'bobby-shearer', name: 'Bobby Shearer', team: 'raimon', position: 'DEF', element: 'montana', rarity: 2,
    stats: { tiro: 26, control: 36, fisico: 52, defensa: 58, velocidad: 38, aguante: 46 },
    techniques: ['b-entrada'],
  },
  {
    id: 'tod-ironside', name: 'Tod Ironside', team: 'raimon', position: 'DEF', element: 'bosque', rarity: 2,
    stats: { tiro: 28, control: 40, fisico: 54, defensa: 60, velocidad: 34, aguante: 44 },
    techniques: ['b-raices'],
  },
  {
    id: 'steve-grim', name: 'Steve Grim', team: 'raimon', position: 'MED', element: 'bosque', rarity: 2,
    stats: { tiro: 36, control: 54, fisico: 40, defensa: 46, velocidad: 42, aguante: 42 },
    techniques: ['r-danza-hojas'],
  },
  {
    id: 'sam-kincaid', name: 'Sam Kincaid', team: 'raimon', position: 'MED', element: 'montana', rarity: 2,
    stats: { tiro: 34, control: 50, fisico: 50, defensa: 44, velocidad: 40, aguante: 42 },
    techniques: ['r-paso-montana'],
  },
  {
    id: 'timmy-saunders', name: 'Timmy Saunders', team: 'raimon', position: 'MED', element: 'aire', rarity: 2,
    stats: { tiro: 32, control: 52, fisico: 36, defensa: 42, velocidad: 54, aguante: 44 },
    techniques: ['r-recorte'],
  },
  {
    id: 'maxwell-carson', name: 'Maxwell Carson', team: 'raimon', position: 'MED', element: 'aire', rarity: 2,
    stats: { tiro: 38, control: 50, fisico: 34, defensa: 40, velocidad: 56, aguante: 42 },
    techniques: ['r-recorte'],
  },
  {
    id: 'darren-lachance', name: 'Darren LaChance', team: 'raimon', position: 'POR', element: 'aire', rarity: 3,
    stats: { tiro: 26, control: 44, fisico: 48, defensa: 66, velocidad: 46, aguante: 55 },
    techniques: ['p-blocaje', 'p-corriente'],
  },
  {
    id: 'hurley-kane', name: 'Hurley Kane', team: 'raimon', position: 'DEF', element: 'aire', rarity: 3,
    stats: { tiro: 44, control: 52, fisico: 62, defensa: 64, velocidad: 44, aguante: 54 },
    techniques: ['b-tormenta-arena', 'r-recorte'],
  },

  // ============================================== INSTITUTO OCCULT (ronda 1) ==
  {
    id: 'jim-wraith', name: 'Jim Wraith', team: 'occult', position: 'POR', element: 'bosque', rarity: 3,
    stats: { tiro: 24, control: 42, fisico: 46, defensa: 68, velocidad: 44, aguante: 52 },
    techniques: ['p-blocaje', 'p-red-hojas'],
  },
  {
    id: 'ozzy-blake', name: 'Ozzy Blake', team: 'occult', position: 'DEL', element: 'bosque', rarity: 2, // original
    stats: { tiro: 58, control: 44, fisico: 40, defensa: 30, velocidad: 46, aguante: 40 },
    techniques: ['t-cuchilla-sombra'],
  },
  {
    id: 'mona-crypt', name: 'Mona Crypt', team: 'occult', position: 'MED', element: 'bosque', rarity: 2, // original
    stats: { tiro: 34, control: 52, fisico: 38, defensa: 46, velocidad: 44, aguante: 42 },
    techniques: ['r-danza-hojas'],
  },
  {
    id: 'victor-grave', name: 'Victor Grave', team: 'occult', position: 'DEF', element: 'bosque', rarity: 2, // original
    stats: { tiro: 24, control: 34, fisico: 56, defensa: 60, velocidad: 32, aguante: 46 },
    techniques: ['b-raices'],
  },

  // =============================================== INSTITUTO OTAKU (ronda 2) ==
  {
    id: 'tobias-quill', name: 'Tobias Quill', team: 'otaku', position: 'POR', element: 'aire', rarity: 3, // original
    stats: { tiro: 26, control: 50, fisico: 40, defensa: 70, velocidad: 50, aguante: 52 },
    techniques: ['p-corriente', 'p-blocaje'],
  },
  {
    id: 'noel-pixel', name: 'Noel Pixel', team: 'otaku', position: 'MED', element: 'aire', rarity: 3, // original
    stats: { tiro: 46, control: 68, fisico: 34, defensa: 48, velocidad: 62, aguante: 46 },
    techniques: ['r-torbellino'],
  },
  {
    id: 'ken-arcade', name: 'Ken Arcade', team: 'otaku', position: 'DEL', element: 'aire', rarity: 3, // original
    stats: { tiro: 68, control: 56, fisico: 38, defensa: 32, velocidad: 64, aguante: 44 },
    techniques: ['t-huracan-doble'],
  },

  // ================================================ INSTITUTO WILD (ronda 3) ==
  {
    id: 'bruno-stagg', name: 'Bruno Stagg', team: 'wild', position: 'DEL', element: 'montana', rarity: 4, // original
    stats: { tiro: 78, control: 46, fisico: 76, defensa: 44, velocidad: 50, aguante: 62 },
    techniques: ['t-meteorito', 'r-paso-montana'],
  },
  {
    id: 'gus-boulder', name: 'Gus Boulder', team: 'wild', position: 'DEF', element: 'montana', rarity: 3, // original
    stats: { tiro: 30, control: 34, fisico: 78, defensa: 72, velocidad: 28, aguante: 60 },
    techniques: ['b-muro'],
  },
  {
    id: 'rex-thorn', name: 'Rex Thorn', team: 'wild', position: 'MED', element: 'montana', rarity: 3, // original
    stats: { tiro: 44, control: 54, fisico: 66, defensa: 56, velocidad: 40, aguante: 54 },
    techniques: ['b-tormenta-arena', 'r-paso-montana'],
  },

  // ============================================ INSTITUTO SHURIKEN (ronda 4) ==
  {
    id: 'kaze-shindo', name: 'Kaze Shindo', team: 'shuriken', position: 'MED', element: 'aire', rarity: 4, // original
    stats: { tiro: 58, control: 76, fisico: 44, defensa: 56, velocidad: 78, aguante: 50 },
    techniques: ['r-relampago', 't-huracan-doble'],
  },
  {
    id: 'rin-kagemori', name: 'Rin Kagemori', team: 'shuriken', position: 'DEL', element: 'bosque', rarity: 4, // original
    stats: { tiro: 76, control: 66, fisico: 42, defensa: 40, velocidad: 72, aguante: 48 },
    techniques: ['t-cuchilla-sombra', 'r-sombra-doble'],
  },
  {
    id: 'goro-tetsu', name: 'Goro Tetsu', team: 'shuriken', position: 'POR', element: 'aire', rarity: 3, // original
    stats: { tiro: 24, control: 48, fisico: 50, defensa: 74, velocidad: 54, aguante: 54 },
    techniques: ['p-corriente'],
  },

  // ================================================ INSTITUTO FARM (ronda 5) ==
  {
    id: 'silas-hayfield', name: 'Silas Hayfield', team: 'farm', position: 'DEL', element: 'bosque', rarity: 4, // original
    stats: { tiro: 80, control: 54, fisico: 70, defensa: 42, velocidad: 48, aguante: 68 },
    techniques: ['t-golpe-dragon', 't-volea'],
  },
  {
    id: 'martha-reap', name: 'Martha Reap', team: 'farm', position: 'DEF', element: 'bosque', rarity: 3, // original
    stats: { tiro: 32, control: 42, fisico: 70, defensa: 74, velocidad: 34, aguante: 64 },
    techniques: ['b-raices'],
  },
  {
    id: 'otto-barn', name: 'Otto Barn', team: 'farm', position: 'POR', element: 'montana', rarity: 3, // original
    stats: { tiro: 28, control: 40, fisico: 62, defensa: 76, velocidad: 36, aguante: 62 },
    techniques: ['p-muralla'],
  },

  // ============================================ INSTITUTO KIRKWOOD (ronda 6) ==
  {
    id: 'adrian-kirk', name: 'Adrian Kirk', team: 'kirkwood', position: 'MED', element: 'fuego', rarity: 4, // original
    stats: { tiro: 70, control: 78, fisico: 52, defensa: 58, velocidad: 62, aguante: 54 },
    techniques: ['r-espejismo', 't-brasa'],
  },
  {
    id: 'lucia-ember', name: 'Lucía Ember', team: 'kirkwood', position: 'DEL', element: 'fuego', rarity: 4, // original
    stats: { tiro: 84, control: 60, fisico: 48, defensa: 38, velocidad: 68, aguante: 50 },
    techniques: ['t-tornado-fuego', 'r-espejismo'],
  },
  {
    id: 'hector-ash', name: 'Héctor Ash', team: 'kirkwood', position: 'DEF', element: 'fuego', rarity: 3, // original
    stats: { tiro: 36, control: 44, fisico: 68, defensa: 72, velocidad: 42, aguante: 56 },
    techniques: ['b-cerco-llamas'],
  },

  // ========================================== ROYAL ACADEMY (semifinal, r. 7) ==
  {
    id: 'caleb-stonewall', name: 'Caleb Stonewall', team: 'royal', position: 'DEL', element: 'bosque', rarity: 5,
    stats: { tiro: 82, control: 74, fisico: 54, defensa: 46, velocidad: 68, aguante: 52 },
    techniques: ['t-pinguinos-1', 'r-ilusion'],
  },
  {
    id: 'joe-king', name: 'Joe King', team: 'royal', position: 'POR', element: 'montana', rarity: 4,
    stats: { tiro: 30, control: 50, fisico: 66, defensa: 82, velocidad: 48, aguante: 62 },
    techniques: ['p-muralla', 'p-blocaje'],
  },
  {
    id: 'herman-waldon', name: 'Herman Waldon', team: 'royal', position: 'DEF', element: 'montana', rarity: 4, // original
    stats: { tiro: 34, control: 48, fisico: 78, defensa: 80, velocidad: 40, aguante: 62 },
    techniques: ['b-torre-doble'],
  },
  {
    id: 'sue-marlow', name: 'Sue Marlow', team: 'royal', position: 'MED', element: 'bosque', rarity: 4, // original
    stats: { tiro: 60, control: 80, fisico: 48, defensa: 62, velocidad: 64, aguante: 52 },
    techniques: ['r-sombra-doble', 't-cuchilla-sombra'],
  },

  // ================================================ INSTITUTO ZEUS (final, r.8) ==
  {
    id: 'byron-love', name: 'Byron Love', team: 'zeus', position: 'DEL', element: 'fuego', rarity: 5,
    stats: { tiro: 92, control: 76, fisico: 52, defensa: 44, velocidad: 74, aguante: 60 },
    techniques: ['t-fenix', 't-tiro-celestial'],
  },
  {
    id: 'torch-hades', name: 'Torch', team: 'zeus', position: 'DEL', element: 'fuego', rarity: 4,
    stats: { tiro: 84, control: 58, fisico: 68, defensa: 42, velocidad: 62, aguante: 56 },
    techniques: ['t-tiro-celestial', 't-brasa'],
  },
  {
    id: 'atlas-vane', name: 'Atlas Vane', team: 'zeus', position: 'POR', element: 'fuego', rarity: 5, // original
    stats: { tiro: 34, control: 56, fisico: 72, defensa: 90, velocidad: 56, aguante: 66 },
    techniques: ['p-puno-justiciero', 'p-muralla'],
  },
  {
    id: 'helios-crown', name: 'Helios Crown', team: 'zeus', position: 'MED', element: 'fuego', rarity: 4, // original
    stats: { tiro: 68, control: 78, fisico: 56, defensa: 60, velocidad: 66, aguante: 56 },
    techniques: ['r-espejismo', 't-torre-babel'],
  },
  {
    id: 'nyx-lorne', name: 'Nyx Lorne', team: 'zeus', position: 'DEF', element: 'fuego', rarity: 4, // original
    stats: { tiro: 40, control: 56, fisico: 76, defensa: 82, velocidad: 52, aguante: 58 },
    techniques: ['b-cerco-llamas', 'b-torre-doble'],
  },

  // ========================================== AGENTES LIBRES (solo en ojeador) ==
  {
    id: 'xavier-foster', name: 'Xavier Foster', team: 'libre', position: 'DEL', element: 'fuego', rarity: 5,
    stats: { tiro: 88, control: 72, fisico: 54, defensa: 46, velocidad: 76, aguante: 54 },
    techniques: ['t-fenix', 'r-espejismo'],
  },
  {
    id: 'jordan-greenway', name: 'Jordan Greenway', team: 'libre', position: 'MED', element: 'bosque', rarity: 4,
    stats: { tiro: 58, control: 78, fisico: 46, defensa: 58, velocidad: 70, aguante: 50 },
    techniques: ['r-sombra-doble'],
  },
  {
    id: 'austin-hobbes', name: 'Austin Hobbes', team: 'libre', position: 'DEF', element: 'aire', rarity: 3,
    stats: { tiro: 34, control: 48, fisico: 58, defensa: 70, velocidad: 58, aguante: 52 },
    techniques: ['b-barrera-hielo'],
  },
  {
    id: 'nelly-raimon', name: 'Nelly Raimon', team: 'libre', position: 'MED', element: 'montana', rarity: 3,
    stats: { tiro: 44, control: 62, fisico: 42, defensa: 50, velocidad: 54, aguante: 48 },
    techniques: ['r-paso-montana'],
  },
  {
    id: 'celia-hills', name: 'Celia Hills', team: 'libre', position: 'DEL', element: 'bosque', rarity: 3,
    stats: { tiro: 64, control: 58, fisico: 38, defensa: 36, velocidad: 62, aguante: 46 },
    techniques: ['t-cuchilla-sombra'],
  },
  {
    id: 'silvia-woods', name: 'Silvia Woods', team: 'libre', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 46, control: 66, fisico: 36, defensa: 46, velocidad: 66, aguante: 46 },
    techniques: ['r-torbellino'],
  },
]

export const PLAYER_BY_ID = new Map(PLAYERS.map((p) => [p.id, p]))

export function getPlayerBase(id: string): PlayerBase {
  const p = PLAYER_BY_ID.get(id)
  if (!p) throw new Error(`Jugador desconocido: ${id}`)
  return p
}

/** Plantilla inicial del Raimon: el once con el que arranca toda partida. */
export const RAIMON_STARTING_XI: string[] = [
  'mark-evans',
  'jack-wallside', 'bobby-shearer', 'tod-ironside', 'nathan-swift',
  'jude-sharp', 'steve-grim', 'sam-kincaid', 'timmy-saunders',
  'axel-blaze', 'erik-eagle',
]

/** Jugadores de un instituto concreto. */
export function playersOfTeam(teamId: string): PlayerBase[] {
  return PLAYERS.filter((p) => p.team === teamId)
}
