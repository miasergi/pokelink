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
    id: 'mark-evans', name: 'Mark Evans', team: 'raimon', position: 'POR', element: 'montana', rarity: 5,
    stats: { tiro: 37, control: 48, fisico: 61, defensa: 116, velocidad: 46, aguante: 72 },
    techniques: ['mugen-the-hand', 'god-hand'],
    spirit: 'majin',
  },
  {
    id: 'axel-blaze', name: 'Axel Blaze', team: 'raimon', position: 'DEL', element: 'fuego', rarity: 5,
    stats: { tiro: 113, control: 77, fisico: 55, defensa: 26, velocidad: 62, aguante: 40 },
    techniques: ['dragon-tornado', 'grenade-shot'],
    spirit: 'pegaso',
  },
  {
    id: 'nathan-swift', name: 'Nathan Swift', team: 'raimon', position: 'DEF', element: 'aire', rarity: 4,
    stats: { tiro: 33, control: 48, fisico: 79, defensa: 94, velocidad: 38, aguante: 48 },
    techniques: ['coil-turn'],
    spirit: 'kraken',
  },
  {
    id: 'kevin-dragonfly', name: 'Kevin Dragonfly', team: 'raimon', position: 'DEL', element: 'bosque', rarity: 4,
    stats: { tiro: 99, control: 68, fisico: 49, defensa: 23, velocidad: 56, aguante: 36 },
    techniques: ['death-zone', 'rolling-kick'],
    spirit: 'ent',
  },
  {
    id: 'jack-wallside', name: 'Jack Wallside', team: 'raimon', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 30, control: 39, fisico: 65, defensa: 73, velocidad: 37, aguante: 36 },
    techniques: ['shikofumi'],
  },
  {
    id: 'tod-ironside', name: 'Tod Ironside', team: 'raimon', position: 'DEF', element: 'fuego', rarity: 3,
    stats: { tiro: 27, control: 44, fisico: 69, defensa: 79, velocidad: 38, aguante: 38 },
    techniques: ['fake-bomber'],
  },
  {
    id: 'steve-grim', name: 'Steve Grim', team: 'raimon', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 41, control: 79, fisico: 39, defensa: 47, velocidad: 45, aguante: 35 },
    techniques: ['tatsumaki-senpuu'],
  },
  {
    id: 'tim-saunders', name: 'Tim Saunders', team: 'raimon', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 40, control: 81, fisico: 38, defensa: 47, velocidad: 44, aguante: 36 },
    techniques: ['super-scan-of'],
  },
  {
    id: 'sam-kincaid', name: 'Sam Kincaid', team: 'raimon', position: 'MED', element: 'fuego', rarity: 3,
    stats: { tiro: 45, control: 76, fisico: 36, defensa: 45, velocidad: 53, aguante: 35 },
    techniques: ['heat-tackle'],
  },
  {
    id: 'maxwell-carson', name: 'Maxwell Carson', team: 'raimon', position: 'DEL', element: 'aire', rarity: 3,
    stats: { tiro: 83, control: 56, fisico: 39, defensa: 23, velocidad: 53, aguante: 26 },
    techniques: ['god-break'],
  },
  {
    id: 'bobby-shearer', name: 'Bobby Shearer', team: 'raimon', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 25, control: 36, fisico: 64, defensa: 78, velocidad: 38, aguante: 42 },
    techniques: ['super-scan-df'],
  },
  {
    id: 'jim-wraith', name: 'Jim Wraith', team: 'raimon', position: 'DEF', element: 'bosque', rarity: 2,
    stats: { tiro: 25, control: 32, fisico: 54, defensa: 62, velocidad: 25, aguante: 38 },
    techniques: ['super-scan-df'],
  },
  {
    id: 'paul-peabody', name: 'Paul Peabody', team: 'raimon', position: 'DEF', element: 'aire', rarity: 2,
    stats: { tiro: 25, control: 29, fisico: 62, defensa: 61, velocidad: 32, aguante: 33 },
    techniques: ['coil-turn'],
  },
  {
    id: 'william-glass', name: 'William Glass', team: 'raimon', position: 'DEL', element: 'bosque', rarity: 2,
    stats: { tiro: 72, control: 55, fisico: 37, defensa: 23, velocidad: 43, aguante: 24 },
    techniques: ['rolling-kick'],
  },
  // ============================== OCCULT
  {
    id: 'nathan-jones', name: 'Nathan Jones', team: 'occult', position: 'POR', element: 'aire', rarity: 5,
    stats: { tiro: 37, control: 47, fisico: 67, defensa: 113, velocidad: 47, aguante: 69 },
    techniques: ['kogarashi', 'tornado-catch'],
    spirit: 'kraken',
  },
  {
    id: 'russell-walk', name: 'Russell Walk', team: 'occult', position: 'DEF', element: 'bosque', rarity: 4,
    stats: { tiro: 29, control: 48, fisico: 82, defensa: 87, velocidad: 40, aguante: 46 },
    techniques: ['super-scan-df'],
    spirit: 'ent',
  },
  {
    id: 'jason-jones', name: 'Jason Jones', team: 'occult', position: 'DEF', element: 'aire', rarity: 4,
    stats: { tiro: 27, control: 45, fisico: 77, defensa: 89, velocidad: 37, aguante: 44 },
    techniques: ['coil-turn'],
    spirit: 'kraken',
  },
  {
    id: 'ken-furan', name: 'Ken Furan', team: 'occult', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 23, control: 40, fisico: 73, defensa: 76, velocidad: 38, aguante: 42 },
    techniques: ['shikofumi'],
  },
  {
    id: 'jerry-fulton', name: 'Jerry Fulton', team: 'occult', position: 'DEF', element: 'fuego', rarity: 3,
    stats: { tiro: 27, control: 43, fisico: 73, defensa: 78, velocidad: 39, aguante: 36 },
    techniques: ['fake-bomber'],
  },
  {
    id: 'ray-mannings', name: 'Ray Mannings', team: 'occult', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 46, control: 75, fisico: 35, defensa: 41, velocidad: 52, aguante: 35 },
    techniques: ['tatsumaki-senpuu'],
  },
  {
    id: 'hugh-mumford', name: 'Hugh Mumford', team: 'occult', position: 'MED', element: 'montana', rarity: 3,
    stats: { tiro: 46, control: 75, fisico: 41, defensa: 46, velocidad: 48, aguante: 35 },
    techniques: ['dash-accel'],
  },
  {
    id: 'alexander-brave', name: 'Alexander Brave', team: 'occult', position: 'MED', element: 'fuego', rarity: 3,
    stats: { tiro: 47, control: 82, fisico: 37, defensa: 50, velocidad: 50, aguante: 34 },
    techniques: ['heat-tackle'],
  },
  {
    id: 'johan-tassman', name: 'Johan Tassman', team: 'occult', position: 'DEL', element: 'bosque', rarity: 3,
    stats: { tiro: 86, control: 64, fisico: 38, defensa: 23, velocidad: 50, aguante: 26 },
    techniques: ['rolling-kick'],
  },
  {
    id: 'troy-moon', name: 'Troy Moon', team: 'occult', position: 'MED', element: 'fuego', rarity: 2,
    stats: { tiro: 38, control: 68, fisico: 28, defensa: 35, velocidad: 44, aguante: 25 },
    techniques: ['heat-tackle'],
  },
  {
    id: 'burt-wolf', name: 'Burt Wolf', team: 'occult', position: 'MED', element: 'montana', rarity: 2,
    stats: { tiro: 35, control: 62, fisico: 29, defensa: 34, velocidad: 46, aguante: 31 },
    techniques: ['dash-accel'],
  },
  {
    id: 'rob-crombie', name: 'Rob Crombie', team: 'occult', position: 'DEF', element: 'montana', rarity: 2,
    stats: { tiro: 19, control: 38, fisico: 59, defensa: 62, velocidad: 32, aguante: 34 },
    techniques: ['shikofumi'],
  },
  {
    id: 'chuck-dollman', name: 'Chuck Dollman', team: 'occult', position: 'DEL', element: 'bosque', rarity: 1,
    stats: { tiro: 64, control: 46, fisico: 32, defensa: 18, velocidad: 30, aguante: 23 },
    techniques: ['rolling-kick'],
  },
  {
    id: 'uxley-allen', name: 'Uxley Allen', team: 'occult', position: 'DEL', element: 'aire', rarity: 1,
    stats: { tiro: 62, control: 38, fisico: 27, defensa: 21, velocidad: 35, aguante: 22 },
    techniques: ['god-break'],
  },
  // ============================== OTAKU
  {
    id: 'sam-idol', name: 'Sam Idol', team: 'otaku', position: 'POR', element: 'montana', rarity: 5,
    stats: { tiro: 37, control: 46, fisico: 66, defensa: 116, velocidad: 50, aguante: 71 },
    techniques: ['mugen-the-hand', 'god-hand'],
    spirit: 'majin',
  },
  {
    id: 'marcus-train', name: 'Marcus Train', team: 'otaku', position: 'DEF', element: 'fuego', rarity: 4,
    stats: { tiro: 27, control: 47, fisico: 83, defensa: 86, velocidad: 40, aguante: 51 },
    techniques: ['fake-bomber'],
    spirit: 'pegaso',
  },
  {
    id: 'light-nobel', name: 'Light Nobel', team: 'otaku', position: 'MED', element: 'bosque', rarity: 4,
    stats: { tiro: 48, control: 87, fisico: 39, defensa: 50, velocidad: 57, aguante: 44 },
    techniques: ['super-scan-of'],
    spirit: 'ent',
  },
  {
    id: 'walter-valiant', name: 'Walter Valiant', team: 'otaku', position: 'MED', element: 'fuego', rarity: 3,
    stats: { tiro: 41, control: 77, fisico: 34, defensa: 43, velocidad: 52, aguante: 35 },
    techniques: ['heat-tackle'],
  },
  {
    id: 'spencer-gates', name: 'Spencer Gates', team: 'otaku', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 24, control: 42, fisico: 73, defensa: 75, velocidad: 36, aguante: 41 },
    techniques: ['shikofumi'],
  },
  {
    id: 'josh-spear', name: 'Josh Spear', team: 'otaku', position: 'DEL', element: 'bosque', rarity: 3,
    stats: { tiro: 82, control: 57, fisico: 39, defensa: 23, velocidad: 45, aguante: 29 },
    techniques: ['rolling-kick'],
  },
  {
    id: 'gaby-farmer', name: 'Gaby Farmer', team: 'otaku', position: 'DEL', element: 'aire', rarity: 3,
    stats: { tiro: 89, control: 57, fisico: 41, defensa: 19, velocidad: 51, aguante: 29 },
    techniques: ['god-break'],
  },
  {
    id: 'a-woodbridge', name: 'A. Woodbridge', team: 'otaku', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 40, control: 81, fisico: 39, defensa: 42, velocidad: 53, aguante: 36 },
    techniques: ['tatsumaki-senpuu'],
  },
  {
    id: 'gus-gamer', name: 'Gus Gamer', team: 'otaku', position: 'DEL', element: 'fuego', rarity: 3,
    stats: { tiro: 83, control: 57, fisico: 44, defensa: 21, velocidad: 50, aguante: 26 },
    techniques: ['grenade-shot'],
  },
  {
    id: 'mark-gambling', name: 'Mark Gambling', team: 'otaku', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 75, control: 52, fisico: 33, defensa: 18, velocidad: 41, aguante: 26 },
    techniques: ['god-break'],
  },
  {
    id: 'theodore-master', name: 'Theodore Master', team: 'otaku', position: 'DEL', element: 'bosque', rarity: 2,
    stats: { tiro: 69, control: 46, fisico: 33, defensa: 24, velocidad: 42, aguante: 22 },
    techniques: ['rolling-kick'],
  },
  {
    id: 'grant-eldorado', name: 'Grant Eldorado', team: 'otaku', position: 'DEL', element: 'fuego', rarity: 2,
    stats: { tiro: 75, control: 52, fisico: 29, defensa: 18, velocidad: 38, aguante: 29 },
    techniques: ['grenade-shot'],
  },
  {
    id: 'ham-signalman', name: 'Ham Signalman', team: 'otaku', position: 'MED', element: 'aire', rarity: 1,
    stats: { tiro: 26, control: 59, fisico: 31, defensa: 37, velocidad: 32, aguante: 28 },
    techniques: ['tatsumaki-senpuu'],
  },
  {
    id: 'bill-formby', name: 'Bill Formby', team: 'otaku', position: 'DEF', element: 'montana', rarity: 1,
    stats: { tiro: 18, control: 30, fisico: 52, defensa: 52, velocidad: 20, aguante: 29 },
    techniques: ['shikofumi'],
  },
  // ============================== WILD
  {
    id: 'charlie-boardfield', name: 'Charlie Boardfield', team: 'wild', position: 'POR', element: 'fuego', rarity: 5,
    stats: { tiro: 30, control: 54, fisico: 64, defensa: 116, velocidad: 49, aguante: 63 },
    techniques: ['pressure-punch', 'nekketsu-punch'],
    spirit: 'pegaso',
  },
  {
    id: 'hugo-tallgeese', name: 'Hugo Tallgeese', team: 'wild', position: 'MED', element: 'fuego', rarity: 4,
    stats: { tiro: 50, control: 90, fisico: 47, defensa: 56, velocidad: 59, aguante: 40 },
    techniques: ['heat-tackle'],
    spirit: 'pegaso',
  },
  {
    id: 'wilson-fishman', name: 'Wilson Fishman', team: 'wild', position: 'DEF', element: 'bosque', rarity: 4,
    stats: { tiro: 27, control: 49, fisico: 79, defensa: 88, velocidad: 44, aguante: 44 },
    techniques: ['super-scan-df'],
    spirit: 'ent',
  },
  {
    id: 'peter-johnson', name: 'Peter Johnson', team: 'wild', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 26, control: 39, fisico: 70, defensa: 78, velocidad: 30, aguante: 45 },
    techniques: ['super-scan-df'],
  },
  {
    id: 'hellion', name: 'Hellion', team: 'wild', position: 'DEL', element: 'montana', rarity: 3,
    stats: { tiro: 86, control: 63, fisico: 38, defensa: 19, velocidad: 46, aguante: 26 },
    techniques: ['tarzan-kick'],
  },
  {
    id: 'cham-lion', name: 'Cham Lion', team: 'wild', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 39, control: 82, fisico: 41, defensa: 44, velocidad: 47, aguante: 37 },
    techniques: ['tatsumaki-senpuu'],
  },
  {
    id: 'steve-eagle', name: 'Steve Eagle', team: 'wild', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 46, control: 77, fisico: 39, defensa: 43, velocidad: 45, aguante: 37 },
    techniques: ['tatsumaki-senpuu'],
  },
  {
    id: 'bruce-monkey', name: 'Bruce Monkey', team: 'wild', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 40, control: 73, fisico: 33, defensa: 49, velocidad: 49, aguante: 34 },
    techniques: ['tatsumaki-senpuu'],
  },
  {
    id: 'gary-lancaster', name: 'Gary Lancaster', team: 'wild', position: 'DEL', element: 'montana', rarity: 3,
    stats: { tiro: 90, control: 59, fisico: 39, defensa: 24, velocidad: 53, aguante: 31 },
    techniques: ['tarzan-kick'],
  },
  {
    id: 'harry-snake', name: 'Harry Snake', team: 'wild', position: 'DEL', element: 'bosque', rarity: 2,
    stats: { tiro: 68, control: 51, fisico: 34, defensa: 20, velocidad: 41, aguante: 28 },
    techniques: ['rolling-kick'],
  },
  {
    id: 'adrian-speed', name: 'Adrian Speed', team: 'wild', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 75, control: 50, fisico: 35, defensa: 18, velocidad: 46, aguante: 24 },
    techniques: ['god-break'],
  },
  {
    id: 'chad-bullford', name: 'Chad Bullford', team: 'wild', position: 'DEF', element: 'fuego', rarity: 2,
    stats: { tiro: 23, control: 30, fisico: 62, defensa: 66, velocidad: 32, aguante: 32 },
    techniques: ['fake-bomber'],
  },
  {
    id: 'alan-coe', name: 'Alan Coe', team: 'wild', position: 'MED', element: 'bosque', rarity: 1,
    stats: { tiro: 30, control: 52, fisico: 23, defensa: 28, velocidad: 33, aguante: 23 },
    techniques: ['super-scan-of'],
  },
  {
    id: 'philip-anders', name: 'Philip Anders', team: 'wild', position: 'DEL', element: 'fuego', rarity: 1,
    stats: { tiro: 60, control: 41, fisico: 29, defensa: 18, velocidad: 30, aguante: 18 },
    techniques: ['grenade-shot'],
  },
  // ============================== SHURIKEN
  {
    id: 'juno-hundertmark', name: 'Juno Hundertmark', team: 'shuriken', position: 'DEF', element: 'aire', rarity: 5,
    stats: { tiro: 30, control: 57, fisico: 94, defensa: 105, velocidad: 49, aguante: 52 },
    techniques: ['the-tower', 'coil-turn'],
    spirit: 'kraken',
  },
  {
    id: 'newton-flust', name: 'Newton Flust', team: 'shuriken', position: 'DEF', element: 'montana', rarity: 4,
    stats: { tiro: 31, control: 50, fisico: 77, defensa: 86, velocidad: 41, aguante: 42 },
    techniques: ['shikofumi'],
    spirit: 'majin',
  },
  {
    id: 'oleander-meadows', name: 'Oleander Meadows', team: 'shuriken', position: 'DEF', element: 'montana', rarity: 4,
    stats: { tiro: 29, control: 46, fisico: 82, defensa: 92, velocidad: 37, aguante: 44 },
    techniques: ['shikofumi'],
    spirit: 'majin',
  },
  {
    id: 'galen-thunderbird', name: 'Galen Thunderbird', team: 'shuriken', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 21, control: 38, fisico: 72, defensa: 81, velocidad: 35, aguante: 43 },
    techniques: ['shikofumi'],
  },
  {
    id: 'finn-stoned', name: 'Finn Stoned', team: 'shuriken', position: 'DEF', element: 'fuego', rarity: 3,
    stats: { tiro: 29, control: 36, fisico: 70, defensa: 82, velocidad: 31, aguante: 42 },
    techniques: ['fake-bomber'],
  },
  {
    id: 'phil-wingate', name: 'Phil Wingate', team: 'shuriken', position: 'MED', element: 'montana', rarity: 3,
    stats: { tiro: 39, control: 80, fisico: 41, defensa: 46, velocidad: 45, aguante: 34 },
    techniques: ['dash-accel'],
  },
  {
    id: 'jez-shell', name: 'Jez Shell', team: 'shuriken', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 46, control: 73, fisico: 38, defensa: 47, velocidad: 51, aguante: 35 },
    techniques: ['tatsumaki-senpuu'],
  },
  {
    id: 'jupiter-jumper', name: 'Jupiter Jumper', team: 'shuriken', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 40, control: 74, fisico: 33, defensa: 49, velocidad: 49, aguante: 35 },
    techniques: ['tatsumaki-senpuu'],
  },
  {
    id: 'thierry-reyes', name: 'Thierry Reyes', team: 'shuriken', position: 'MED', element: 'montana', rarity: 3,
    stats: { tiro: 45, control: 78, fisico: 37, defensa: 47, velocidad: 45, aguante: 38 },
    techniques: ['dash-accel'],
  },
  {
    id: 'hank-sullivan', name: 'Hank Sullivan', team: 'shuriken', position: 'MED', element: 'bosque', rarity: 2,
    stats: { tiro: 32, control: 62, fisico: 30, defensa: 38, velocidad: 45, aguante: 29 },
    techniques: ['super-scan-of'],
  },
  {
    id: 'sail-bluesea', name: 'Sail Bluesea', team: 'shuriken', position: 'DEL', element: 'fuego', rarity: 2,
    stats: { tiro: 71, control: 50, fisico: 36, defensa: 22, velocidad: 40, aguante: 22 },
    techniques: ['grenade-shot'],
  },
  {
    id: 'kevin-castle', name: 'Kevin Castle', team: 'shuriken', position: 'POR', element: 'aire', rarity: 2,
    stats: { tiro: 18, control: 36, fisico: 44, defensa: 68, velocidad: 31, aguante: 46 },
    techniques: ['tornado-catch'],
  },
  {
    id: 'john-reynolds', name: 'John Reynolds', team: 'shuriken', position: 'DEL', element: 'aire', rarity: 1,
    stats: { tiro: 60, control: 43, fisico: 30, defensa: 18, velocidad: 34, aguante: 24 },
    techniques: ['god-break'],
  },
  {
    id: 'dan-hopper', name: 'Dan Hopper', team: 'shuriken', position: 'DEF', element: 'montana', rarity: 1,
    stats: { tiro: 19, control: 25, fisico: 45, defensa: 52, velocidad: 20, aguante: 25 },
    techniques: ['shikofumi'],
  },
  // ============================== FARM
  {
    id: 'charlie-boardfield-2', name: 'Charlie Boardfield', team: 'farm', position: 'POR', element: 'fuego', rarity: 5,
    stats: { tiro: 39, control: 47, fisico: 69, defensa: 115, velocidad: 50, aguante: 65 },
    techniques: ['pressure-punch', 'nekketsu-punch'],
    spirit: 'pegaso',
  },
  {
    id: 'hugo-tallgeese-2', name: 'Hugo Tallgeese', team: 'farm', position: 'MED', element: 'fuego', rarity: 4,
    stats: { tiro: 48, control: 92, fisico: 47, defensa: 56, velocidad: 57, aguante: 37 },
    techniques: ['heat-tackle'],
    spirit: 'pegaso',
  },
  {
    id: 'wilson-fishman-2', name: 'Wilson Fishman', team: 'farm', position: 'DEF', element: 'bosque', rarity: 4,
    stats: { tiro: 33, control: 50, fisico: 77, defensa: 85, velocidad: 42, aguante: 51 },
    techniques: ['super-scan-df'],
    spirit: 'ent',
  },
  {
    id: 'peter-johnson-2', name: 'Peter Johnson', team: 'farm', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 24, control: 42, fisico: 72, defensa: 75, velocidad: 36, aguante: 43 },
    techniques: ['super-scan-df'],
  },
  {
    id: 'hellion-2', name: 'Hellion', team: 'farm', position: 'DEL', element: 'montana', rarity: 3,
    stats: { tiro: 86, control: 57, fisico: 39, defensa: 22, velocidad: 45, aguante: 26 },
    techniques: ['tarzan-kick'],
  },
  {
    id: 'cham-lion-2', name: 'Cham Lion', team: 'farm', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 40, control: 78, fisico: 40, defensa: 44, velocidad: 50, aguante: 36 },
    techniques: ['tatsumaki-senpuu'],
  },
  {
    id: 'steve-eagle-2', name: 'Steve Eagle', team: 'farm', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 42, control: 76, fisico: 39, defensa: 43, velocidad: 47, aguante: 35 },
    techniques: ['tatsumaki-senpuu'],
  },
  {
    id: 'bruce-monkey-2', name: 'Bruce Monkey', team: 'farm', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 46, control: 81, fisico: 33, defensa: 46, velocidad: 45, aguante: 31 },
    techniques: ['tatsumaki-senpuu'],
  },
  {
    id: 'gary-lancaster-2', name: 'Gary Lancaster', team: 'farm', position: 'DEL', element: 'montana', rarity: 3,
    stats: { tiro: 82, control: 64, fisico: 41, defensa: 22, velocidad: 50, aguante: 27 },
    techniques: ['tarzan-kick'],
  },
  {
    id: 'harry-snake-2', name: 'Harry Snake', team: 'farm', position: 'DEL', element: 'bosque', rarity: 2,
    stats: { tiro: 77, control: 55, fisico: 37, defensa: 18, velocidad: 38, aguante: 28 },
    techniques: ['rolling-kick'],
  },
  {
    id: 'adrian-speed-2', name: 'Adrian Speed', team: 'farm', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 70, control: 52, fisico: 32, defensa: 19, velocidad: 37, aguante: 21 },
    techniques: ['god-break'],
  },
  {
    id: 'chad-bullford-2', name: 'Chad Bullford', team: 'farm', position: 'DEF', element: 'fuego', rarity: 2,
    stats: { tiro: 20, control: 38, fisico: 57, defensa: 62, velocidad: 31, aguante: 31 },
    techniques: ['fake-bomber'],
  },
  {
    id: 'alan-coe-2', name: 'Alan Coe', team: 'farm', position: 'MED', element: 'bosque', rarity: 1,
    stats: { tiro: 28, control: 55, fisico: 26, defensa: 29, velocidad: 35, aguante: 24 },
    techniques: ['super-scan-of'],
  },
  {
    id: 'philip-anders-2', name: 'Philip Anders', team: 'farm', position: 'DEL', element: 'fuego', rarity: 1,
    stats: { tiro: 58, control: 42, fisico: 27, defensa: 18, velocidad: 33, aguante: 25 },
    techniques: ['grenade-shot'],
  },
  // ============================== KIRKWOOD
  {
    id: 'john-neville', name: 'John Neville', team: 'kirkwood', position: 'POR', element: 'fuego', rarity: 5,
    stats: { tiro: 36, control: 53, fisico: 67, defensa: 111, velocidad: 50, aguante: 67 },
    techniques: ['pressure-punch', 'nekketsu-punch'],
    spirit: 'pegaso',
  },
  {
    id: 'malcolm-night', name: 'Malcolm Night', team: 'kirkwood', position: 'DEF', element: 'fuego', rarity: 4,
    stats: { tiro: 27, control: 45, fisico: 77, defensa: 93, velocidad: 41, aguante: 47 },
    techniques: ['fake-bomber'],
    spirit: 'pegaso',
  },
  {
    id: 'alfred-meenan', name: 'Alfred Meenan', team: 'kirkwood', position: 'DEF', element: 'bosque', rarity: 4,
    stats: { tiro: 27, control: 42, fisico: 80, defensa: 87, velocidad: 37, aguante: 47 },
    techniques: ['super-scan-df'],
    spirit: 'ent',
  },
  {
    id: 'dan-mirthful', name: 'Dan Mirthful', team: 'kirkwood', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 29, control: 41, fisico: 73, defensa: 81, velocidad: 39, aguante: 36 },
    techniques: ['super-scan-df'],
  },
  {
    id: 'ricky-clover', name: 'Ricky Clover', team: 'kirkwood', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 22, control: 42, fisico: 67, defensa: 78, velocidad: 37, aguante: 38 },
    techniques: ['shikofumi'],
  },
  {
    id: 'toby-damian', name: 'Toby Damian', team: 'kirkwood', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 40, control: 81, fisico: 40, defensa: 47, velocidad: 45, aguante: 35 },
    techniques: ['tatsumaki-senpuu'],
  },
  {
    id: 'york-nashmith', name: 'York Nashmith', team: 'kirkwood', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 39, control: 78, fisico: 41, defensa: 46, velocidad: 50, aguante: 31 },
    techniques: ['super-scan-of'],
  },
  {
    id: 'zachary-moore', name: 'Zachary Moore', team: 'kirkwood', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 45, control: 81, fisico: 36, defensa: 49, velocidad: 51, aguante: 34 },
    techniques: ['super-scan-of'],
  },
  {
    id: 'marvin-murdock', name: 'Marvin Murdock', team: 'kirkwood', position: 'DEL', element: 'fuego', rarity: 3,
    stats: { tiro: 83, control: 60, fisico: 36, defensa: 25, velocidad: 50, aguante: 30 },
    techniques: ['grenade-shot'],
  },
  {
    id: 'thomas-murdock', name: 'Thomas Murdock', team: 'kirkwood', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 74, control: 46, fisico: 35, defensa: 18, velocidad: 40, aguante: 26 },
    techniques: ['god-break'],
  },
  {
    id: 'tyler-murdock', name: 'Tyler Murdock', team: 'kirkwood', position: 'DEL', element: 'montana', rarity: 2,
    stats: { tiro: 72, control: 53, fisico: 32, defensa: 18, velocidad: 40, aguante: 23 },
    techniques: ['tarzan-kick'],
  },
  {
    id: 'simon-calier', name: 'Simon Calier', team: 'kirkwood', position: 'MED', element: 'bosque', rarity: 2,
    stats: { tiro: 34, control: 63, fisico: 29, defensa: 38, velocidad: 40, aguante: 25 },
    techniques: ['super-scan-of'],
  },
  {
    id: 'brody-gloom', name: 'Brody Gloom', team: 'kirkwood', position: 'MED', element: 'montana', rarity: 1,
    stats: { tiro: 28, control: 56, fisico: 29, defensa: 30, velocidad: 38, aguante: 20 },
    techniques: ['dash-accel'],
  },
  {
    id: 'victor-talis', name: 'Victor Talis', team: 'kirkwood', position: 'MED', element: 'bosque', rarity: 1,
    stats: { tiro: 34, control: 54, fisico: 24, defensa: 32, velocidad: 37, aguante: 22 },
    techniques: ['super-scan-of'],
  },
  // ============================== ROYAL
  {
    id: 'david-samford', name: 'David Samford', team: 'royal', position: 'DEL', element: 'bosque', rarity: 4,
    stats: { tiro: 101, control: 69, fisico: 42, defensa: 29, velocidad: 58, aguante: 31 },
    techniques: ['death-zone', 'rolling-kick'],
    spirit: 'ent',
  },
  {
    id: 'joseph-king', name: 'Joseph King', team: 'royal', position: 'POR', element: 'fuego', rarity: 4,
    stats: { tiro: 27, control: 42, fisico: 53, defensa: 100, velocidad: 47, aguante: 58 },
    techniques: ['nekketsu-punch'],
    spirit: 'pegaso',
  },
  {
    id: 'peter-drent', name: 'Peter Drent', team: 'royal', position: 'DEF', element: 'montana', rarity: 4,
    stats: { tiro: 32, control: 42, fisico: 78, defensa: 92, velocidad: 38, aguante: 50 },
    techniques: ['shikofumi'],
    spirit: 'majin',
  },
  {
    id: 'ben-simmons', name: 'Ben Simmons', team: 'royal', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 30, control: 40, fisico: 73, defensa: 81, velocidad: 38, aguante: 44 },
    techniques: ['super-scan-df'],
  },
  {
    id: 'alan-master', name: 'Alan Master', team: 'royal', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 41, control: 79, fisico: 40, defensa: 49, velocidad: 53, aguante: 31 },
    techniques: ['tatsumaki-senpuu'],
  },
  {
    id: 'gus-martin', name: 'Gus Martin', team: 'royal', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 23, control: 39, fisico: 73, defensa: 81, velocidad: 32, aguante: 44 },
    techniques: ['super-scan-df'],
  },
  {
    id: 'herman-waldon', name: 'Herman Waldon', team: 'royal', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 47, control: 77, fisico: 41, defensa: 43, velocidad: 52, aguante: 38 },
    techniques: ['tatsumaki-senpuu'],
  },
  {
    id: 'john-bloom', name: 'John Bloom', team: 'royal', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 40, control: 79, fisico: 41, defensa: 47, velocidad: 46, aguante: 33 },
    techniques: ['super-scan-of'],
  },
  {
    id: 'derek-swing', name: 'Derek Swing', team: 'royal', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 45, control: 73, fisico: 37, defensa: 42, velocidad: 45, aguante: 32 },
    techniques: ['tatsumaki-senpuu'],
  },
  {
    id: 'daniel-hatch', name: 'Daniel Hatch', team: 'royal', position: 'DEL', element: 'bosque', rarity: 2,
    stats: { tiro: 68, control: 53, fisico: 37, defensa: 23, velocidad: 42, aguante: 23 },
    techniques: ['rolling-kick'],
  },
  {
    id: 'alessandro-il-grande', name: 'Alessandro il Grande', team: 'royal', position: 'POR', element: 'montana', rarity: 2,
    stats: { tiro: 20, control: 36, fisico: 41, defensa: 68, velocidad: 30, aguante: 44 },
    techniques: ['god-hand'],
  },
  {
    id: 'cliff-tomlinson', name: 'Cliff Tomlinson', team: 'royal', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 68, control: 52, fisico: 34, defensa: 19, velocidad: 42, aguante: 29 },
    techniques: ['god-break'],
  },
  {
    id: 'jim-lawrenson', name: 'Jim Lawrenson', team: 'royal', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 68, control: 55, fisico: 38, defensa: 20, velocidad: 41, aguante: 25 },
    techniques: ['god-break'],
  },
  {
    id: 'barry-potts', name: 'Barry Potts', team: 'royal', position: 'MED', element: 'aire', rarity: 2,
    stats: { tiro: 32, control: 64, fisico: 35, defensa: 42, velocidad: 39, aguante: 31 },
    techniques: ['tatsumaki-senpuu'],
  },
  // ============================== ZEUS
  {
    id: 'byron-love', name: 'Byron Love', team: 'zeus', position: 'MED', element: 'bosque', rarity: 5,
    stats: { tiro: 58, control: 100, fisico: 46, defensa: 62, velocidad: 65, aguante: 41 },
    techniques: ['illusion-ball', 'super-scan-of'],
    spirit: 'ent',
  },
  {
    id: 'paul-siddon', name: 'Paul Siddon', team: 'zeus', position: 'POR', element: 'montana', rarity: 4,
    stats: { tiro: 35, control: 41, fisico: 59, defensa: 102, velocidad: 48, aguante: 57 },
    techniques: ['god-hand'],
    spirit: 'majin',
  },
  {
    id: 'apollo-light', name: 'Apollo Light', team: 'zeus', position: 'DEF', element: 'bosque', rarity: 4,
    stats: { tiro: 35, control: 50, fisico: 80, defensa: 90, velocidad: 44, aguante: 46 },
    techniques: ['super-scan-df'],
    spirit: 'ent',
  },
  {
    id: 'jeff-iron', name: 'Jeff Iron', team: 'zeus', position: 'DEF', element: 'fuego', rarity: 3,
    stats: { tiro: 24, control: 43, fisico: 71, defensa: 81, velocidad: 30, aguante: 44 },
    techniques: ['fake-bomber'],
  },
  {
    id: 'lane-war', name: 'Lane War', team: 'zeus', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 29, control: 39, fisico: 67, defensa: 79, velocidad: 35, aguante: 39 },
    techniques: ['shikofumi'],
  },
  {
    id: 'danny-wood', name: 'Danny Wood', team: 'zeus', position: 'DEF', element: 'aire', rarity: 3,
    stats: { tiro: 27, control: 39, fisico: 69, defensa: 82, velocidad: 30, aguante: 41 },
    techniques: ['coil-turn'],
  },
  {
    id: 'artie-mishman', name: 'Artie Mishman', team: 'zeus', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 42, control: 80, fisico: 38, defensa: 49, velocidad: 53, aguante: 34 },
    techniques: ['tatsumaki-senpuu'],
  },
  {
    id: 'arion-matlock', name: 'Arion Matlock', team: 'zeus', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 39, control: 80, fisico: 33, defensa: 49, velocidad: 51, aguante: 31 },
    techniques: ['super-scan-of'],
  },
  {
    id: 'wesley-knox', name: 'Wesley Knox', team: 'zeus', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 39, control: 75, fisico: 33, defensa: 47, velocidad: 51, aguante: 34 },
    techniques: ['super-scan-of'],
  },
  {
    id: 'jonas-demetrius', name: 'Jonas Demetrius', team: 'zeus', position: 'DEL', element: 'fuego', rarity: 2,
    stats: { tiro: 74, control: 53, fisico: 37, defensa: 20, velocidad: 43, aguante: 26 },
    techniques: ['grenade-shot'],
  },
  {
    id: 'henry-house', name: 'Henry House', team: 'zeus', position: 'MED', element: 'fuego', rarity: 2,
    stats: { tiro: 39, control: 67, fisico: 29, defensa: 37, velocidad: 44, aguante: 28 },
    techniques: ['heat-tackle'],
  },
  {
    id: 'iggy-russ', name: 'Iggy Russ', team: 'zeus', position: 'POR', element: 'aire', rarity: 2,
    stats: { tiro: 24, control: 29, fisico: 40, defensa: 76, velocidad: 32, aguante: 43 },
    techniques: ['tornado-catch'],
  },
  {
    id: 'gus-heeley', name: 'Gus Heeley', team: 'zeus', position: 'DEL', element: 'montana', rarity: 2,
    stats: { tiro: 73, control: 52, fisico: 32, defensa: 18, velocidad: 40, aguante: 21 },
    techniques: ['tarzan-kick'],
  },
  {
    id: 'harry-closs', name: 'Harry Closs', team: 'zeus', position: 'DEF', element: 'fuego', rarity: 2,
    stats: { tiro: 26, control: 32, fisico: 62, defensa: 69, velocidad: 26, aguante: 31 },
    techniques: ['fake-bomber'],
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

export function squadCounts(teamId: string): { DEF: number; MED: number; DEL: number } {
  const own = playersOfTeam(teamId)
  const n = (pos: PlayerBase['position']) => own.filter((p) => p.position === pos).length
  return { DEF: n('DEF'), MED: n('MED'), DEL: n('DEL') }
}

/** Formación que este instituto puede alinear con su plantilla real. */
export function formationFor(teamId: string): string {
  return bestFormationFor(squadCounts(teamId)).id
}

/**
 * Once con el que arranca cada instituto, según la formación que pueda
 * alinear: las plantillas son las reales y cada equipo trae su reparto, así
 * que un 4-4-2 fijo dejaba a varios con el once inválido de salida.
 */
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
