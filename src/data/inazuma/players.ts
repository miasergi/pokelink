// Base de datos de jugadores. GENERADA — no editar a mano el bloque de
// jugadores: se regenera con `node scripts/emit-inazuma-players.mjs`.
//
// NOMBRE, POSICIÓN y ELEMENTO son REALES: salen del infobox de cada personaje
// en la wiki de Fandom (`name_dub`, `position`, `element`), así que Mark Evans
// es portero de Montaña porque lo es, no porque me lo haya parecido.
//
// Los ATRIBUTOS y la RAREZA sí son inventados: no existen en ninguna fuente con
// una escala comparable, así que se reparten por demarcación y por el puesto que
// ocupa el jugador en la plantilla de la wiki (los primeros son los titulares).
// Presupuesto por rareza: ★1≈200 ★2≈240 ★3≈285 ★4≈330 ★5≈375.
import { bestFormationFor, getFormation } from '@/data/inazuma/formations'
import type { PlayerBase } from '@/engine/inazuma/types'

export const PLAYERS: PlayerBase[] = [
  // ============================== RAIMON
  {
    id: 'mark-evans', name: 'Mark Evans', team: 'raimon', position: 'POR', element: 'montana', rarity: 4,
    stats: { tiro: 33, control: 42, fisico: 54, defensa: 102, velocidad: 40, aguante: 64 },
    techniques: ['p-mano-celestial', 'p-blocaje'],
    spirit: 'majin',
  },
  {
    id: 'nathan-swift', name: 'Nathan Swift', team: 'raimon', position: 'DEF', element: 'aire', rarity: 3,
    stats: { tiro: 29, control: 42, fisico: 68, defensa: 82, velocidad: 33, aguante: 42 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'jack-wallside', name: 'Jack Wallside', team: 'raimon', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 30, control: 39, fisico: 65, defensa: 73, velocidad: 37, aguante: 36 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'jim-wraith', name: 'Jim Wraith', team: 'raimon', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 29, control: 38, fisico: 65, defensa: 74, velocidad: 30, aguante: 44 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'tod-ironside', name: 'Tod Ironside', team: 'raimon', position: 'DEF', element: 'fuego', rarity: 3,
    stats: { tiro: 27, control: 44, fisico: 69, defensa: 79, velocidad: 38, aguante: 38 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'steve-grim', name: 'Steve Grim', team: 'raimon', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 41, control: 79, fisico: 39, defensa: 47, velocidad: 45, aguante: 35 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'tim-saunders', name: 'Tim Saunders', team: 'raimon', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 40, control: 81, fisico: 38, defensa: 47, velocidad: 44, aguante: 36 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'sam-kincaid', name: 'Sam Kincaid', team: 'raimon', position: 'MED', element: 'fuego', rarity: 2,
    stats: { tiro: 38, control: 64, fisico: 30, defensa: 38, velocidad: 45, aguante: 30 },
    techniques: ['r-recorte'],
  },
  {
    id: 'paul-peabody', name: 'Paul Peabody', team: 'raimon', position: 'DEF', element: 'aire', rarity: 2,
    stats: { tiro: 25, control: 29, fisico: 62, defensa: 61, velocidad: 32, aguante: 33 },
    techniques: ['b-entrada'],
  },
  {
    id: 'maxwell-carson', name: 'Maxwell Carson', team: 'raimon', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 69, control: 47, fisico: 32, defensa: 20, velocidad: 45, aguante: 22 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'axel-blaze', name: 'Axel Blaze', team: 'raimon', position: 'DEL', element: 'fuego', rarity: 1,
    stats: { tiro: 61, control: 40, fisico: 30, defensa: 18, velocidad: 32, aguante: 22 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'kevin-dragonfly', name: 'Kevin Dragonfly', team: 'raimon', position: 'DEL', element: 'bosque', rarity: 1,
    stats: { tiro: 60, control: 40, fisico: 31, defensa: 18, velocidad: 34, aguante: 23 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'william-glass', name: 'William Glass', team: 'raimon', position: 'DEL', element: 'bosque', rarity: 1,
    stats: { tiro: 60, control: 47, fisico: 32, defensa: 20, velocidad: 36, aguante: 20 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'bobby-shearer', name: 'Bobby Shearer', team: 'raimon', position: 'DEF', element: 'bosque', rarity: 1,
    stats: { tiro: 18, control: 24, fisico: 44, defensa: 55, velocidad: 28, aguante: 30 },
    techniques: ['b-entrada'],
  },
  // ============================== OCCULT
  {
    id: 'nathan-jones', name: 'Nathan Jones', team: 'occult', position: 'POR', element: 'aire', rarity: 4,
    stats: { tiro: 33, control: 41, fisico: 60, defensa: 100, velocidad: 41, aguante: 61 },
    techniques: ['p-mano-celestial', 'p-blocaje'],
    spirit: 'kraken',
  },
  {
    id: 'russell-walk', name: 'Russell Walk', team: 'occult', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 24, control: 42, fisico: 71, defensa: 75, velocidad: 35, aguante: 40 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'jason-jones', name: 'Jason Jones', team: 'occult', position: 'DEF', element: 'aire', rarity: 3,
    stats: { tiro: 23, control: 39, fisico: 66, defensa: 77, velocidad: 31, aguante: 38 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'ken-furan', name: 'Ken Furan', team: 'occult', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 23, control: 40, fisico: 73, defensa: 76, velocidad: 38, aguante: 42 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'jerry-fulton', name: 'Jerry Fulton', team: 'occult', position: 'DEF', element: 'fuego', rarity: 3,
    stats: { tiro: 27, control: 43, fisico: 73, defensa: 78, velocidad: 39, aguante: 36 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'ray-mannings', name: 'Ray Mannings', team: 'occult', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 46, control: 75, fisico: 35, defensa: 41, velocidad: 52, aguante: 35 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'hugh-mumford', name: 'Hugh Mumford', team: 'occult', position: 'MED', element: 'montana', rarity: 3,
    stats: { tiro: 46, control: 75, fisico: 41, defensa: 46, velocidad: 48, aguante: 35 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'alexander-brave', name: 'Alexander Brave', team: 'occult', position: 'MED', element: 'fuego', rarity: 2,
    stats: { tiro: 40, control: 70, fisico: 31, defensa: 43, velocidad: 42, aguante: 28 },
    techniques: ['r-recorte'],
  },
  {
    id: 'johan-tassman', name: 'Johan Tassman', team: 'occult', position: 'DEL', element: 'bosque', rarity: 2,
    stats: { tiro: 72, control: 55, fisico: 32, defensa: 20, velocidad: 43, aguante: 22 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'troy-moon', name: 'Troy Moon', team: 'occult', position: 'MED', element: 'fuego', rarity: 2,
    stats: { tiro: 38, control: 68, fisico: 28, defensa: 35, velocidad: 44, aguante: 25 },
    techniques: ['r-recorte'],
  },
  {
    id: 'burt-wolf', name: 'Burt Wolf', team: 'occult', position: 'MED', element: 'montana', rarity: 1,
    stats: { tiro: 29, control: 51, fisico: 24, defensa: 28, velocidad: 39, aguante: 26 },
    techniques: ['r-recorte'],
  },
  {
    id: 'rob-crombie', name: 'Rob Crombie', team: 'occult', position: 'DEF', element: 'montana', rarity: 1,
    stats: { tiro: 18, control: 33, fisico: 50, defensa: 52, velocidad: 28, aguante: 28 },
    techniques: ['b-entrada'],
  },
  {
    id: 'chuck-dollman', name: 'Chuck Dollman', team: 'occult', position: 'DEL', element: 'bosque', rarity: 1,
    stats: { tiro: 64, control: 46, fisico: 32, defensa: 18, velocidad: 30, aguante: 23 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'uxley-allen', name: 'Uxley Allen', team: 'occult', position: 'DEL', element: 'aire', rarity: 1,
    stats: { tiro: 62, control: 38, fisico: 27, defensa: 21, velocidad: 35, aguante: 22 },
    techniques: ['t-tiro-raso'],
  },
  // ============================== OTAKU
  {
    id: 'sam-idol', name: 'Sam Idol', team: 'otaku', position: 'POR', element: 'montana', rarity: 4,
    stats: { tiro: 33, control: 40, fisico: 59, defensa: 102, velocidad: 44, aguante: 63 },
    techniques: ['p-mano-celestial', 'p-blocaje'],
    spirit: 'majin',
  },
  {
    id: 'marcus-train', name: 'Marcus Train', team: 'otaku', position: 'DEF', element: 'fuego', rarity: 3,
    stats: { tiro: 23, control: 41, fisico: 72, defensa: 73, velocidad: 35, aguante: 45 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'light-nobel', name: 'Light Nobel', team: 'otaku', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 41, control: 75, fisico: 33, defensa: 43, velocidad: 50, aguante: 38 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'walter-valiant', name: 'Walter Valiant', team: 'otaku', position: 'MED', element: 'fuego', rarity: 3,
    stats: { tiro: 41, control: 77, fisico: 34, defensa: 43, velocidad: 52, aguante: 35 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'spencer-gates', name: 'Spencer Gates', team: 'otaku', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 24, control: 42, fisico: 73, defensa: 75, velocidad: 36, aguante: 41 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'josh-spear', name: 'Josh Spear', team: 'otaku', position: 'DEL', element: 'bosque', rarity: 3,
    stats: { tiro: 82, control: 57, fisico: 39, defensa: 23, velocidad: 45, aguante: 29 },
    techniques: ['t-meteorito', 't-tiro-raso'],
  },
  {
    id: 'gaby-farmer', name: 'Gaby Farmer', team: 'otaku', position: 'DEL', element: 'aire', rarity: 3,
    stats: { tiro: 89, control: 57, fisico: 41, defensa: 19, velocidad: 51, aguante: 29 },
    techniques: ['t-meteorito', 't-tiro-raso'],
  },
  {
    id: 'a-woodbridge', name: 'A. Woodbridge', team: 'otaku', position: 'MED', element: 'aire', rarity: 2,
    stats: { tiro: 34, control: 69, fisico: 33, defensa: 35, velocidad: 45, aguante: 31 },
    techniques: ['r-recorte'],
  },
  {
    id: 'gus-gamer', name: 'Gus Gamer', team: 'otaku', position: 'DEL', element: 'fuego', rarity: 2,
    stats: { tiro: 70, control: 48, fisico: 37, defensa: 18, velocidad: 42, aguante: 22 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'mark-gambling', name: 'Mark Gambling', team: 'otaku', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 75, control: 52, fisico: 33, defensa: 18, velocidad: 41, aguante: 26 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'theodore-master', name: 'Theodore Master', team: 'otaku', position: 'DEL', element: 'bosque', rarity: 1,
    stats: { tiro: 57, control: 38, fisico: 27, defensa: 21, velocidad: 35, aguante: 18 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'grant-eldorado', name: 'Grant Eldorado', team: 'otaku', position: 'DEL', element: 'fuego', rarity: 1,
    stats: { tiro: 63, control: 43, fisico: 24, defensa: 18, velocidad: 31, aguante: 25 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'ham-signalman', name: 'Ham Signalman', team: 'otaku', position: 'MED', element: 'aire', rarity: 1,
    stats: { tiro: 26, control: 59, fisico: 31, defensa: 37, velocidad: 32, aguante: 28 },
    techniques: ['r-recorte'],
  },
  {
    id: 'bill-formby', name: 'Bill Formby', team: 'otaku', position: 'DEF', element: 'montana', rarity: 1,
    stats: { tiro: 18, control: 30, fisico: 52, defensa: 52, velocidad: 20, aguante: 29 },
    techniques: ['b-entrada'],
  },
  // ============================== WILD
  {
    id: 'charlie-boardfield', name: 'Charlie Boardfield', team: 'wild', position: 'POR', element: 'fuego', rarity: 4,
    stats: { tiro: 26, control: 48, fisico: 56, defensa: 103, velocidad: 44, aguante: 55 },
    techniques: ['p-mano-celestial', 'p-blocaje'],
    spirit: 'pegaso',
  },
  {
    id: 'hugo-tallgeese', name: 'Hugo Tallgeese', team: 'wild', position: 'MED', element: 'fuego', rarity: 3,
    stats: { tiro: 43, control: 78, fisico: 41, defensa: 49, velocidad: 51, aguante: 35 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'wilson-fishman', name: 'Wilson Fishman', team: 'wild', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 23, control: 42, fisico: 68, defensa: 76, velocidad: 39, aguante: 38 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'peter-johnson', name: 'Peter Johnson', team: 'wild', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 26, control: 39, fisico: 70, defensa: 78, velocidad: 30, aguante: 45 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'hellion', name: 'Hellion', team: 'wild', position: 'DEL', element: 'montana', rarity: 3,
    stats: { tiro: 86, control: 63, fisico: 38, defensa: 19, velocidad: 46, aguante: 26 },
    techniques: ['t-meteorito', 't-tiro-raso'],
  },
  {
    id: 'cham-lion', name: 'Cham Lion', team: 'wild', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 39, control: 82, fisico: 41, defensa: 44, velocidad: 47, aguante: 37 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'steve-eagle', name: 'Steve Eagle', team: 'wild', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 46, control: 77, fisico: 39, defensa: 43, velocidad: 45, aguante: 37 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'bruce-monkey', name: 'Bruce Monkey', team: 'wild', position: 'MED', element: 'aire', rarity: 2,
    stats: { tiro: 33, control: 61, fisico: 27, defensa: 42, velocidad: 41, aguante: 29 },
    techniques: ['r-recorte'],
  },
  {
    id: 'gary-lancaster', name: 'Gary Lancaster', team: 'wild', position: 'DEL', element: 'montana', rarity: 2,
    stats: { tiro: 76, control: 49, fisico: 32, defensa: 20, velocidad: 45, aguante: 26 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'harry-snake', name: 'Harry Snake', team: 'wild', position: 'DEL', element: 'bosque', rarity: 2,
    stats: { tiro: 68, control: 51, fisico: 34, defensa: 20, velocidad: 41, aguante: 28 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'adrian-speed', name: 'Adrian Speed', team: 'wild', position: 'DEL', element: 'aire', rarity: 1,
    stats: { tiro: 63, control: 42, fisico: 29, defensa: 18, velocidad: 39, aguante: 20 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'chad-bullford', name: 'Chad Bullford', team: 'wild', position: 'DEF', element: 'fuego', rarity: 1,
    stats: { tiro: 20, control: 24, fisico: 52, defensa: 55, velocidad: 28, aguante: 27 },
    techniques: ['b-entrada'],
  },
  {
    id: 'alan-coe', name: 'Alan Coe', team: 'wild', position: 'MED', element: 'bosque', rarity: 1,
    stats: { tiro: 30, control: 52, fisico: 23, defensa: 28, velocidad: 33, aguante: 23 },
    techniques: ['r-recorte'],
  },
  {
    id: 'philip-anders', name: 'Philip Anders', team: 'wild', position: 'DEL', element: 'fuego', rarity: 1,
    stats: { tiro: 60, control: 41, fisico: 29, defensa: 18, velocidad: 30, aguante: 18 },
    techniques: ['t-tiro-raso'],
  },
  // ============================== SHURIKEN
  {
    id: 'juno-hundertmark', name: 'Juno Hundertmark', team: 'shuriken', position: 'DEF', element: 'aire', rarity: 4,
    stats: { tiro: 26, control: 51, fisico: 83, defensa: 93, velocidad: 43, aguante: 46 },
    techniques: ['b-muro', 'b-entrada'],
    spirit: 'kraken',
  },
  {
    id: 'newton-flust', name: 'Newton Flust', team: 'shuriken', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 27, control: 44, fisico: 67, defensa: 73, velocidad: 36, aguante: 36 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'oleander-meadows', name: 'Oleander Meadows', team: 'shuriken', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 25, control: 40, fisico: 71, defensa: 80, velocidad: 32, aguante: 38 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'galen-thunderbird', name: 'Galen Thunderbird', team: 'shuriken', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 21, control: 38, fisico: 72, defensa: 81, velocidad: 35, aguante: 43 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'finn-stoned', name: 'Finn Stoned', team: 'shuriken', position: 'DEF', element: 'fuego', rarity: 3,
    stats: { tiro: 29, control: 36, fisico: 70, defensa: 82, velocidad: 31, aguante: 42 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'phil-wingate', name: 'Phil Wingate', team: 'shuriken', position: 'MED', element: 'montana', rarity: 3,
    stats: { tiro: 39, control: 80, fisico: 41, defensa: 46, velocidad: 45, aguante: 34 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'jez-shell', name: 'Jez Shell', team: 'shuriken', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 46, control: 73, fisico: 38, defensa: 47, velocidad: 51, aguante: 35 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'jupiter-jumper', name: 'Jupiter Jumper', team: 'shuriken', position: 'MED', element: 'aire', rarity: 2,
    stats: { tiro: 33, control: 62, fisico: 28, defensa: 41, velocidad: 41, aguante: 29 },
    techniques: ['r-recorte'],
  },
  {
    id: 'thierry-reyes', name: 'Thierry Reyes', team: 'shuriken', position: 'MED', element: 'montana', rarity: 2,
    stats: { tiro: 38, control: 66, fisico: 31, defensa: 40, velocidad: 38, aguante: 33 },
    techniques: ['r-recorte'],
  },
  {
    id: 'hank-sullivan', name: 'Hank Sullivan', team: 'shuriken', position: 'MED', element: 'bosque', rarity: 2,
    stats: { tiro: 32, control: 62, fisico: 30, defensa: 38, velocidad: 45, aguante: 29 },
    techniques: ['r-recorte'],
  },
  {
    id: 'sail-bluesea-game', name: 'Sail Bluesea (game)', team: 'shuriken', position: 'DEL', element: 'fuego', rarity: 1,
    stats: { tiro: 62, control: 46, fisico: 25, defensa: 18, velocidad: 36, aguante: 21 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'kevin-castle', name: 'Kevin Castle', team: 'shuriken', position: 'POR', element: 'aire', rarity: 1,
    stats: { tiro: 18, control: 31, fisico: 37, defensa: 56, velocidad: 26, aguante: 39 },
    techniques: ['p-blocaje'],
  },
  {
    id: 'john-reynolds', name: 'John Reynolds', team: 'shuriken', position: 'DEL', element: 'aire', rarity: 1,
    stats: { tiro: 60, control: 43, fisico: 30, defensa: 18, velocidad: 34, aguante: 24 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'dan-hopper', name: 'Dan Hopper', team: 'shuriken', position: 'DEF', element: 'montana', rarity: 1,
    stats: { tiro: 19, control: 25, fisico: 45, defensa: 52, velocidad: 20, aguante: 25 },
    techniques: ['b-entrada'],
  },
  // ============================== FARM
  {
    id: 'charlie-boardfield-2', name: 'Charlie Boardfield', team: 'farm', position: 'POR', element: 'fuego', rarity: 4,
    stats: { tiro: 35, control: 41, fisico: 61, defensa: 101, velocidad: 44, aguante: 57 },
    techniques: ['p-mano-celestial', 'p-blocaje'],
    spirit: 'pegaso',
  },
  {
    id: 'hugo-tallgeese-2', name: 'Hugo Tallgeese', team: 'farm', position: 'MED', element: 'fuego', rarity: 3,
    stats: { tiro: 41, control: 80, fisico: 41, defensa: 49, velocidad: 49, aguante: 31 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'wilson-fishman-2', name: 'Wilson Fishman', team: 'farm', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 29, control: 44, fisico: 67, defensa: 73, velocidad: 37, aguante: 45 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'peter-johnson-2', name: 'Peter Johnson', team: 'farm', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 24, control: 42, fisico: 72, defensa: 75, velocidad: 36, aguante: 43 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'hellion-2', name: 'Hellion', team: 'farm', position: 'DEL', element: 'montana', rarity: 3,
    stats: { tiro: 86, control: 57, fisico: 39, defensa: 22, velocidad: 45, aguante: 26 },
    techniques: ['t-meteorito', 't-tiro-raso'],
  },
  {
    id: 'cham-lion-2', name: 'Cham Lion', team: 'farm', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 40, control: 78, fisico: 40, defensa: 44, velocidad: 50, aguante: 36 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'steve-eagle-2', name: 'Steve Eagle', team: 'farm', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 42, control: 76, fisico: 39, defensa: 43, velocidad: 47, aguante: 35 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'bruce-monkey-2', name: 'Bruce Monkey', team: 'farm', position: 'MED', element: 'aire', rarity: 2,
    stats: { tiro: 40, control: 68, fisico: 27, defensa: 39, velocidad: 37, aguante: 26 },
    techniques: ['r-recorte'],
  },
  {
    id: 'gary-lancaster-2', name: 'Gary Lancaster', team: 'farm', position: 'DEL', element: 'montana', rarity: 2,
    stats: { tiro: 68, control: 55, fisico: 34, defensa: 19, velocidad: 43, aguante: 22 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'harry-snake-2', name: 'Harry Snake', team: 'farm', position: 'DEL', element: 'bosque', rarity: 2,
    stats: { tiro: 77, control: 55, fisico: 37, defensa: 18, velocidad: 38, aguante: 28 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'adrian-speed-2', name: 'Adrian Speed', team: 'farm', position: 'DEL', element: 'aire', rarity: 1,
    stats: { tiro: 58, control: 44, fisico: 26, defensa: 18, velocidad: 30, aguante: 18 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'chad-bullford-2', name: 'Chad Bullford', team: 'farm', position: 'DEF', element: 'fuego', rarity: 1,
    stats: { tiro: 18, control: 32, fisico: 47, defensa: 52, velocidad: 26, aguante: 26 },
    techniques: ['b-entrada'],
  },
  {
    id: 'alan-coe-2', name: 'Alan Coe', team: 'farm', position: 'MED', element: 'bosque', rarity: 1,
    stats: { tiro: 28, control: 55, fisico: 26, defensa: 29, velocidad: 35, aguante: 24 },
    techniques: ['r-recorte'],
  },
  {
    id: 'philip-anders-2', name: 'Philip Anders', team: 'farm', position: 'DEL', element: 'fuego', rarity: 1,
    stats: { tiro: 58, control: 42, fisico: 27, defensa: 18, velocidad: 33, aguante: 25 },
    techniques: ['t-tiro-raso'],
  },
  // ============================== KIRKWOOD
  {
    id: 'john-neville-game', name: 'John Neville (game)', team: 'kirkwood', position: 'POR', element: 'fuego', rarity: 4,
    stats: { tiro: 30, control: 44, fisico: 60, defensa: 101, velocidad: 39, aguante: 60 },
    techniques: ['p-mano-celestial', 'p-blocaje'],
    spirit: 'pegaso',
  },
  {
    id: 'malcolm-night', name: 'Malcolm Night', team: 'kirkwood', position: 'DEF', element: 'fuego', rarity: 3,
    stats: { tiro: 23, control: 39, fisico: 67, defensa: 81, velocidad: 36, aguante: 41 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'alfred-meenan', name: 'Alfred Meenan', team: 'kirkwood', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 23, control: 36, fisico: 69, defensa: 75, velocidad: 31, aguante: 41 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'dan-mirthful', name: 'Dan Mirthful', team: 'kirkwood', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 29, control: 41, fisico: 73, defensa: 81, velocidad: 39, aguante: 36 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'ricky-clover-game', name: 'Ricky Clover (game)', team: 'kirkwood', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 30, control: 41, fisico: 72, defensa: 80, velocidad: 34, aguante: 42 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'toby-damian', name: 'Toby Damian', team: 'kirkwood', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 40, control: 81, fisico: 40, defensa: 47, velocidad: 45, aguante: 35 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'york-nashmith', name: 'York Nashmith', team: 'kirkwood', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 39, control: 78, fisico: 41, defensa: 46, velocidad: 50, aguante: 31 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'zachary-moore', name: 'Zachary Moore', team: 'kirkwood', position: 'MED', element: 'bosque', rarity: 2,
    stats: { tiro: 38, control: 68, fisico: 31, defensa: 41, velocidad: 44, aguante: 28 },
    techniques: ['r-recorte'],
  },
  {
    id: 'marvin-murdock', name: 'Marvin Murdock', team: 'kirkwood', position: 'DEL', element: 'fuego', rarity: 2,
    stats: { tiro: 69, control: 50, fisico: 29, defensa: 22, velocidad: 42, aguante: 25 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'thomas-murdock', name: 'Thomas Murdock', team: 'kirkwood', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 74, control: 46, fisico: 35, defensa: 18, velocidad: 40, aguante: 26 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'tyler-murdock', name: 'Tyler Murdock', team: 'kirkwood', position: 'DEL', element: 'montana', rarity: 1,
    stats: { tiro: 60, control: 45, fisico: 27, defensa: 18, velocidad: 33, aguante: 19 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'simon-calier', name: 'Simon Calier', team: 'kirkwood', position: 'MED', element: 'bosque', rarity: 1,
    stats: { tiro: 28, control: 52, fisico: 24, defensa: 31, velocidad: 33, aguante: 20 },
    techniques: ['r-recorte'],
  },
  {
    id: 'brody-gloom', name: 'Brody Gloom', team: 'kirkwood', position: 'MED', element: 'montana', rarity: 1,
    stats: { tiro: 28, control: 56, fisico: 29, defensa: 30, velocidad: 38, aguante: 20 },
    techniques: ['r-recorte'],
  },
  {
    id: 'victor-talis', name: 'Victor Talis', team: 'kirkwood', position: 'MED', element: 'bosque', rarity: 1,
    stats: { tiro: 34, control: 54, fisico: 24, defensa: 32, velocidad: 37, aguante: 22 },
    techniques: ['r-recorte'],
  },
  // ============================== ROYAL
  {
    id: 'joseph-king', name: 'Joseph King', team: 'royal', position: 'POR', element: 'fuego', rarity: 5,
    stats: { tiro: 31, control: 48, fisico: 61, defensa: 114, velocidad: 53, aguante: 66 },
    techniques: ['p-mano-celestial', 'p-blocaje'],
    spirit: 'pegaso',
  },
  {
    id: 'peter-drent', name: 'Peter Drent', team: 'royal', position: 'DEF', element: 'montana', rarity: 4,
    stats: { tiro: 32, control: 42, fisico: 78, defensa: 92, velocidad: 38, aguante: 50 },
    techniques: ['b-muro', 'b-entrada'],
    spirit: 'majin',
  },
  {
    id: 'ben-simmons', name: 'Ben Simmons', team: 'royal', position: 'DEF', element: 'bosque', rarity: 4,
    stats: { tiro: 35, control: 46, fisico: 83, defensa: 93, velocidad: 43, aguante: 50 },
    techniques: ['b-muro', 'b-entrada'],
    spirit: 'ent',
  },
  {
    id: 'alan-master', name: 'Alan Master', team: 'royal', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 41, control: 79, fisico: 40, defensa: 49, velocidad: 53, aguante: 31 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'gus-martin', name: 'Gus Martin', team: 'royal', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 23, control: 39, fisico: 73, defensa: 81, velocidad: 32, aguante: 44 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'herman-waldon', name: 'Herman Waldon', team: 'royal', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 47, control: 77, fisico: 41, defensa: 43, velocidad: 52, aguante: 38 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'john-bloom', name: 'John Bloom', team: 'royal', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 40, control: 79, fisico: 41, defensa: 47, velocidad: 46, aguante: 33 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'derek-swing', name: 'Derek Swing', team: 'royal', position: 'MED', element: 'aire', rarity: 2,
    stats: { tiro: 38, control: 61, fisico: 31, defensa: 35, velocidad: 38, aguante: 26 },
    techniques: ['r-recorte'],
  },
  {
    id: 'daniel-hatch', name: 'Daniel Hatch', team: 'royal', position: 'DEL', element: 'bosque', rarity: 2,
    stats: { tiro: 68, control: 53, fisico: 37, defensa: 23, velocidad: 42, aguante: 23 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'david-samford', name: 'David Samford', team: 'royal', position: 'DEL', element: 'bosque', rarity: 2,
    stats: { tiro: 74, control: 50, fisico: 29, defensa: 22, velocidad: 43, aguante: 22 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'alessandro-il-grande', name: 'Alessandro il Grande', team: 'royal', position: 'POR', element: 'montana', rarity: 2,
    stats: { tiro: 20, control: 36, fisico: 41, defensa: 68, velocidad: 30, aguante: 44 },
    techniques: ['p-blocaje'],
  },
  {
    id: 'cliff-tomlinson', name: 'Cliff Tomlinson', team: 'royal', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 68, control: 52, fisico: 34, defensa: 19, velocidad: 42, aguante: 29 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'jim-lawrenson', name: 'Jim Lawrenson', team: 'royal', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 68, control: 55, fisico: 38, defensa: 20, velocidad: 41, aguante: 25 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'barry-potts', name: 'Barry Potts', team: 'royal', position: 'MED', element: 'aire', rarity: 2,
    stats: { tiro: 32, control: 64, fisico: 35, defensa: 42, velocidad: 39, aguante: 31 },
    techniques: ['r-recorte'],
  },
  // ============================== ZEUS
  {
    id: 'paul-siddon', name: 'Paul Siddon', team: 'zeus', position: 'POR', element: 'montana', rarity: 5,
    stats: { tiro: 39, control: 46, fisico: 67, defensa: 116, velocidad: 54, aguante: 65 },
    techniques: ['p-mano-celestial', 'p-blocaje'],
    spirit: 'majin',
  },
  {
    id: 'apollo-light', name: 'Apollo Light', team: 'zeus', position: 'DEF', element: 'bosque', rarity: 4,
    stats: { tiro: 35, control: 50, fisico: 80, defensa: 90, velocidad: 44, aguante: 46 },
    techniques: ['b-muro', 'b-entrada'],
    spirit: 'ent',
  },
  {
    id: 'jeff-iron', name: 'Jeff Iron', team: 'zeus', position: 'DEF', element: 'fuego', rarity: 4,
    stats: { tiro: 29, control: 49, fisico: 82, defensa: 93, velocidad: 35, aguante: 50 },
    techniques: ['b-muro', 'b-entrada'],
    spirit: 'pegaso',
  },
  {
    id: 'lane-war', name: 'Lane War', team: 'zeus', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 29, control: 39, fisico: 67, defensa: 79, velocidad: 35, aguante: 39 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'danny-wood', name: 'Danny Wood', team: 'zeus', position: 'DEF', element: 'aire', rarity: 3,
    stats: { tiro: 27, control: 39, fisico: 69, defensa: 82, velocidad: 30, aguante: 41 },
    techniques: ['b-raices', 'b-entrada'],
  },
  {
    id: 'artie-mishman', name: 'Artie Mishman', team: 'zeus', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 42, control: 80, fisico: 38, defensa: 49, velocidad: 53, aguante: 34 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'arion-matlock', name: 'Arion Matlock', team: 'zeus', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 39, control: 80, fisico: 33, defensa: 49, velocidad: 51, aguante: 31 },
    techniques: ['r-paso-montana', 'r-recorte'],
  },
  {
    id: 'wesley-knox', name: 'Wesley Knox', team: 'zeus', position: 'MED', element: 'bosque', rarity: 2,
    stats: { tiro: 32, control: 62, fisico: 27, defensa: 40, velocidad: 43, aguante: 29 },
    techniques: ['r-recorte'],
  },
  {
    id: 'jonas-demetrius', name: 'Jonas Demetrius', team: 'zeus', position: 'DEL', element: 'fuego', rarity: 2,
    stats: { tiro: 74, control: 53, fisico: 37, defensa: 20, velocidad: 43, aguante: 26 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'byron-love', name: 'Byron Love', team: 'zeus', position: 'MED', element: 'bosque', rarity: 2,
    stats: { tiro: 38, control: 64, fisico: 28, defensa: 40, velocidad: 42, aguante: 25 },
    techniques: ['r-recorte'],
  },
  {
    id: 'henry-house', name: 'Henry House', team: 'zeus', position: 'MED', element: 'fuego', rarity: 2,
    stats: { tiro: 39, control: 67, fisico: 29, defensa: 37, velocidad: 44, aguante: 28 },
    techniques: ['r-recorte'],
  },
  {
    id: 'iggy-russ', name: 'Iggy Russ', team: 'zeus', position: 'POR', element: 'aire', rarity: 2,
    stats: { tiro: 24, control: 29, fisico: 40, defensa: 76, velocidad: 32, aguante: 43 },
    techniques: ['p-blocaje'],
  },
  {
    id: 'gus-heeley', name: 'Gus Heeley', team: 'zeus', position: 'DEL', element: 'montana', rarity: 2,
    stats: { tiro: 73, control: 52, fisico: 32, defensa: 18, velocidad: 40, aguante: 21 },
    techniques: ['t-tiro-raso'],
  },
  {
    id: 'harry-closs', name: 'Harry Closs', team: 'zeus', position: 'DEF', element: 'fuego', rarity: 2,
    stats: { tiro: 26, control: 32, fisico: 62, defensa: 69, velocidad: 26, aguante: 31 },
    techniques: ['b-entrada'],
  },
]

export const PLAYER_BY_ID = new Map(PLAYERS.map((p) => [p.id, p]))

export function getPlayerBase(id: string): PlayerBase {
  const p = PLAYER_BY_ID.get(id)
  if (!p) throw new Error(`Jugador desconocido: ${id}`)
  return p
}

/** Jugadores de un instituto concreto. */
export function playersOfTeam(teamId: string): PlayerBase[] {
  return PLAYERS.filter((p) => p.team === teamId)
}

/**
 * Once con el que arranca cada instituto: su portero, cuatro defensas, cuatro
 * centrocampistas y dos delanteros, cogidos por orden de plantilla (los
 * primeros de la wiki son los titulares). Si a alguna línea le falta gente se
 * completa con lo que quede, para que siempre salgan 11.
 */
export function squadCounts(teamId: string): { DEF: number; MED: number; DEL: number } {
  const own = playersOfTeam(teamId)
  const n = (pos: PlayerBase['position']) => own.filter((p) => p.position === pos).length
  return { DEF: n('DEF'), MED: n('MED'), DEL: n('DEL') }
}

/** Formación que este instituto puede alinear con su plantilla real. */
export function formationFor(teamId: string): string {
  return bestFormationFor(squadCounts(teamId)).id
}

export function startingSquad(teamId: string, formationId?: string): string[] {
  const own = playersOfTeam(teamId)
  const f = getFormation(formationId ?? formationFor(teamId))
  const line = (pos: PlayerBase['position'], n: number) =>
    own.filter((p) => p.position === pos).slice(0, n).map((p) => p.id)
  const picked = [...line('POR', 1), ...line('DEF', f.defs), ...line('MED', f.mids), ...line('DEL', f.fwds)]
  if (picked.length < 11) {
    const rest = own.filter((p) => !picked.includes(p.id)).map((p) => p.id)
    picked.push(...rest.slice(0, 11 - picked.length))
  }
  return picked.slice(0, 11)
}

/** Plantilla inicial del Raimon (compatibilidad). */
export const RAIMON_STARTING_XI: string[] = startingSquad('raimon')
