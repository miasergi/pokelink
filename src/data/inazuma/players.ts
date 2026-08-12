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
    techniques: ['god-hand', 'mugen-the-hand'],
    signature: ['god-hand', 'mugen-the-hand', 'majin-the-hand'],
    spirit: 'majin',
  },
  {
    id: 'axel-blaze', name: 'Axel Blaze', team: 'raimon', position: 'DEL', element: 'fuego', rarity: 5,
    stats: { tiro: 113, control: 77, fisico: 55, defensa: 26, velocidad: 62, aguante: 40 },
    techniques: ['fire-tornado', 'bakunetsu-storm'],
    signature: ['fire-tornado', 'bakunetsu-storm'],
    spirit: 'pegaso',
  },
  {
    id: 'nathan-swift', name: 'Nathan Swift', team: 'raimon', position: 'DEF', element: 'aire', rarity: 4,
    stats: { tiro: 33, control: 48, fisico: 79, defensa: 94, velocidad: 38, aguante: 48 },
    techniques: ['coil-turn', 'the-tower'],
    signature: ['coil-turn', 'the-tower'],
    spirit: 'kraken',
  },
  {
    id: 'kevin-dragonfly', name: 'Kevin Dragonfly', team: 'raimon', position: 'DEL', element: 'bosque', rarity: 4,
    stats: { tiro: 99, control: 68, fisico: 49, defensa: 23, velocidad: 56, aguante: 36 },
    techniques: ['dragon-crash', 'death-zone'],
    signature: ['dragon-crash', 'death-zone'],
    spirit: 'ent',
  },
  {
    id: 'jack-wallside', name: 'Jack Wallside', team: 'raimon', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 30, control: 39, fisico: 65, defensa: 73, velocidad: 37, aguante: 36 },
    techniques: ['shikofumi'],
    signature: ['shikofumi', 'the-wall'],
  },
  {
    id: 'tod-ironside', name: 'Tod Ironside', team: 'raimon', position: 'DEF', element: 'fuego', rarity: 3,
    stats: { tiro: 27, control: 44, fisico: 69, defensa: 79, velocidad: 38, aguante: 38 },
    techniques: ['fake-bomber'],
    signature: ['fake-bomber', 'planet-shield'],
  },
  {
    id: 'steve-grim', name: 'Steve Grim', team: 'raimon', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 41, control: 79, fisico: 39, defensa: 47, velocidad: 45, aguante: 35 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'tim-saunders', name: 'Tim Saunders', team: 'raimon', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 40, control: 81, fisico: 38, defensa: 47, velocidad: 44, aguante: 36 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'sam-kincaid', name: 'Sam Kincaid', team: 'raimon', position: 'MED', element: 'fuego', rarity: 3,
    stats: { tiro: 45, control: 76, fisico: 36, defensa: 45, velocidad: 53, aguante: 35 },
    techniques: ['heat-tackle'],
    signature: ['heat-tackle', 'judge-through'],
  },
  {
    id: 'maxwell-carson', name: 'Maxwell Carson', team: 'raimon', position: 'DEL', element: 'aire', rarity: 3,
    stats: { tiro: 83, control: 56, fisico: 39, defensa: 23, velocidad: 53, aguante: 26 },
    techniques: ['god-break'],
    signature: ['god-break', 'eternal-blizzard'],
  },
  {
    id: 'bobby-shearer', name: 'Bobby Shearer', team: 'raimon', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 25, control: 36, fisico: 64, defensa: 78, velocidad: 38, aguante: 42 },
    techniques: ['super-scan-df'],
    signature: ['super-scan-df', 'killer-slide'],
  },
  {
    id: 'jim-wraith', name: 'Jim Wraith', team: 'raimon', position: 'DEF', element: 'bosque', rarity: 2,
    stats: { tiro: 25, control: 32, fisico: 54, defensa: 62, velocidad: 25, aguante: 38 },
    techniques: ['super-scan-df'],
    signature: ['super-scan-df', 'killer-slide'],
  },
  {
    id: 'paul-peabody', name: 'Paul Peabody', team: 'raimon', position: 'DEF', element: 'aire', rarity: 2,
    stats: { tiro: 25, control: 29, fisico: 62, defensa: 61, velocidad: 32, aguante: 33 },
    techniques: ['coil-turn'],
    signature: ['coil-turn', 'the-tower'],
  },
  {
    id: 'william-glass', name: 'William Glass', team: 'raimon', position: 'DEL', element: 'bosque', rarity: 2,
    stats: { tiro: 72, control: 55, fisico: 37, defensa: 23, velocidad: 43, aguante: 24 },
    techniques: ['rolling-kick'],
    signature: ['rolling-kick', 'death-zone'],
  },
  // ============================== OCCULT
  {
    id: 'nathan-jones', name: 'Nathan Jones', team: 'occult', position: 'POR', element: 'aire', rarity: 5,
    stats: { tiro: 37, control: 47, fisico: 67, defensa: 113, velocidad: 47, aguante: 69 },
    techniques: ['tornado-catch', 'kogarashi'],
    signature: ['tornado-catch', 'kogarashi', 'hanafubuki'],
    spirit: 'kraken',
  },
  {
    id: 'russell-walk', name: 'Russell Walk', team: 'occult', position: 'DEF', element: 'bosque', rarity: 4,
    stats: { tiro: 29, control: 48, fisico: 82, defensa: 87, velocidad: 40, aguante: 46 },
    techniques: ['super-scan-df', 'killer-slide'],
    signature: ['super-scan-df', 'killer-slide', 'good-smell'],
    spirit: 'ent',
  },
  {
    id: 'jason-jones', name: 'Jason Jones', team: 'occult', position: 'DEF', element: 'aire', rarity: 4,
    stats: { tiro: 27, control: 45, fisico: 77, defensa: 89, velocidad: 37, aguante: 44 },
    techniques: ['coil-turn', 'the-tower'],
    signature: ['coil-turn', 'the-tower', 'ice-ground'],
    spirit: 'kraken',
  },
  {
    id: 'ken-furan', name: 'Ken Furan', team: 'occult', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 23, control: 40, fisico: 73, defensa: 76, velocidad: 38, aguante: 42 },
    techniques: ['shikofumi'],
    signature: ['shikofumi', 'the-wall'],
  },
  {
    id: 'jerry-fulton', name: 'Jerry Fulton', team: 'occult', position: 'DEF', element: 'fuego', rarity: 3,
    stats: { tiro: 27, control: 43, fisico: 73, defensa: 78, velocidad: 39, aguante: 36 },
    techniques: ['fake-bomber'],
    signature: ['fake-bomber', 'planet-shield'],
  },
  {
    id: 'ray-mannings', name: 'Ray Mannings', team: 'occult', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 46, control: 75, fisico: 35, defensa: 41, velocidad: 52, aguante: 35 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'hugh-mumford', name: 'Hugh Mumford', team: 'occult', position: 'MED', element: 'montana', rarity: 3,
    stats: { tiro: 46, control: 75, fisico: 41, defensa: 46, velocidad: 48, aguante: 35 },
    techniques: ['dash-accel'],
    signature: ['dash-accel', 'ninin-sankyaku'],
  },
  {
    id: 'alexander-brave', name: 'Alexander Brave', team: 'occult', position: 'MED', element: 'fuego', rarity: 3,
    stats: { tiro: 47, control: 82, fisico: 37, defensa: 50, velocidad: 50, aguante: 34 },
    techniques: ['heat-tackle'],
    signature: ['heat-tackle', 'judge-through'],
  },
  {
    id: 'johan-tassman', name: 'Johan Tassman', team: 'occult', position: 'DEL', element: 'bosque', rarity: 3,
    stats: { tiro: 86, control: 64, fisico: 38, defensa: 23, velocidad: 50, aguante: 26 },
    techniques: ['rolling-kick'],
    signature: ['rolling-kick', 'dragon-crash'],
  },
  {
    id: 'troy-moon', name: 'Troy Moon', team: 'occult', position: 'MED', element: 'fuego', rarity: 2,
    stats: { tiro: 38, control: 68, fisico: 28, defensa: 35, velocidad: 44, aguante: 25 },
    techniques: ['heat-tackle'],
    signature: ['heat-tackle', 'judge-through'],
  },
  {
    id: 'burt-wolf', name: 'Burt Wolf', team: 'occult', position: 'MED', element: 'montana', rarity: 2,
    stats: { tiro: 35, control: 62, fisico: 29, defensa: 34, velocidad: 46, aguante: 31 },
    techniques: ['dash-accel'],
    signature: ['dash-accel', 'ninin-sankyaku'],
  },
  {
    id: 'rob-crombie', name: 'Rob Crombie', team: 'occult', position: 'DEF', element: 'montana', rarity: 2,
    stats: { tiro: 19, control: 38, fisico: 59, defensa: 62, velocidad: 32, aguante: 34 },
    techniques: ['shikofumi'],
    signature: ['shikofumi', 'the-wall'],
  },
  {
    id: 'chuck-dollman', name: 'Chuck Dollman', team: 'occult', position: 'DEL', element: 'bosque', rarity: 1,
    stats: { tiro: 64, control: 46, fisico: 32, defensa: 18, velocidad: 30, aguante: 23 },
    techniques: ['rolling-kick'],
    signature: ['rolling-kick', 'death-zone'],
  },
  {
    id: 'uxley-allen', name: 'Uxley Allen', team: 'occult', position: 'DEL', element: 'aire', rarity: 1,
    stats: { tiro: 62, control: 38, fisico: 27, defensa: 21, velocidad: 35, aguante: 22 },
    techniques: ['god-break'],
    signature: ['god-break', 'tri-pegasus'],
  },
  // ============================== OTAKU
  {
    id: 'sam-idol', name: 'Sam Idol', team: 'otaku', position: 'POR', element: 'montana', rarity: 5,
    stats: { tiro: 37, control: 46, fisico: 66, defensa: 116, velocidad: 50, aguante: 71 },
    techniques: ['god-hand', 'mugen-the-hand'],
    signature: ['god-hand', 'mugen-the-hand', 'majin-the-hand'],
    spirit: 'majin',
  },
  {
    id: 'marcus-train', name: 'Marcus Train', team: 'otaku', position: 'DEF', element: 'fuego', rarity: 4,
    stats: { tiro: 27, control: 47, fisico: 83, defensa: 86, velocidad: 40, aguante: 51 },
    techniques: ['fake-bomber', 'planet-shield'],
    signature: ['fake-bomber', 'planet-shield', 'flame-dance'],
    spirit: 'pegaso',
  },
  {
    id: 'light-nobel', name: 'Light Nobel', team: 'otaku', position: 'MED', element: 'bosque', rarity: 4,
    stats: { tiro: 48, control: 87, fisico: 39, defensa: 50, velocidad: 57, aguante: 44 },
    techniques: ['super-scan-of', 'illusion-ball'],
    signature: ['super-scan-of', 'illusion-ball', 'southern-crosscut'],
    spirit: 'ent',
  },
  {
    id: 'walter-valiant', name: 'Walter Valiant', team: 'otaku', position: 'MED', element: 'fuego', rarity: 3,
    stats: { tiro: 41, control: 77, fisico: 34, defensa: 43, velocidad: 52, aguante: 35 },
    techniques: ['heat-tackle'],
    signature: ['heat-tackle', 'judge-through'],
  },
  {
    id: 'spencer-gates', name: 'Spencer Gates', team: 'otaku', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 24, control: 42, fisico: 73, defensa: 75, velocidad: 36, aguante: 41 },
    techniques: ['shikofumi'],
    signature: ['shikofumi', 'the-wall'],
  },
  {
    id: 'josh-spear', name: 'Josh Spear', team: 'otaku', position: 'DEL', element: 'bosque', rarity: 3,
    stats: { tiro: 82, control: 57, fisico: 39, defensa: 23, velocidad: 45, aguante: 29 },
    techniques: ['rolling-kick'],
    signature: ['rolling-kick', 'dragon-crash'],
  },
  {
    id: 'gaby-farmer', name: 'Gaby Farmer', team: 'otaku', position: 'DEL', element: 'aire', rarity: 3,
    stats: { tiro: 89, control: 57, fisico: 41, defensa: 19, velocidad: 51, aguante: 29 },
    techniques: ['god-break'],
    signature: ['god-break', 'eternal-blizzard'],
  },
  {
    id: 'a-woodbridge', name: 'A. Woodbridge', team: 'otaku', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 40, control: 81, fisico: 39, defensa: 42, velocidad: 53, aguante: 36 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'gus-gamer', name: 'Gus Gamer', team: 'otaku', position: 'DEL', element: 'fuego', rarity: 3,
    stats: { tiro: 83, control: 57, fisico: 44, defensa: 21, velocidad: 50, aguante: 26 },
    techniques: ['dragon-tornado'],
    signature: ['dragon-tornado', 'fire-tornado'],
  },
  {
    id: 'mark-gambling', name: 'Mark Gambling', team: 'otaku', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 75, control: 52, fisico: 33, defensa: 18, velocidad: 41, aguante: 26 },
    techniques: ['god-break'],
    signature: ['god-break', 'tri-pegasus'],
  },
  {
    id: 'theodore-master', name: 'Theodore Master', team: 'otaku', position: 'DEL', element: 'bosque', rarity: 2,
    stats: { tiro: 69, control: 46, fisico: 33, defensa: 24, velocidad: 42, aguante: 22 },
    techniques: ['rolling-kick'],
    signature: ['rolling-kick', 'death-zone'],
  },
  {
    id: 'grant-eldorado', name: 'Grant Eldorado', team: 'otaku', position: 'DEL', element: 'fuego', rarity: 2,
    stats: { tiro: 75, control: 52, fisico: 29, defensa: 18, velocidad: 38, aguante: 29 },
    techniques: ['dragon-tornado'],
    signature: ['dragon-tornado', 'the-phoenix'],
  },
  {
    id: 'ham-signalman', name: 'Ham Signalman', team: 'otaku', position: 'MED', element: 'aire', rarity: 1,
    stats: { tiro: 26, control: 59, fisico: 31, defensa: 37, velocidad: 32, aguante: 28 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'bill-formby', name: 'Bill Formby', team: 'otaku', position: 'DEF', element: 'montana', rarity: 1,
    stats: { tiro: 18, control: 30, fisico: 52, defensa: 52, velocidad: 20, aguante: 29 },
    techniques: ['shikofumi'],
    signature: ['shikofumi', 'the-wall'],
  },
  // ============================== WILD
  {
    id: 'charlie-boardfield', name: 'Charlie Boardfield', team: 'wild', position: 'POR', element: 'fuego', rarity: 5,
    stats: { tiro: 30, control: 54, fisico: 64, defensa: 116, velocidad: 49, aguante: 63 },
    techniques: ['nekketsu-punch', 'pressure-punch'],
    signature: ['nekketsu-punch', 'pressure-punch', 'full-power-shield'],
    spirit: 'pegaso',
  },
  {
    id: 'hugo-tallgeese', name: 'Hugo Tallgeese', team: 'wild', position: 'MED', element: 'fuego', rarity: 4,
    stats: { tiro: 50, control: 90, fisico: 47, defensa: 56, velocidad: 59, aguante: 40 },
    techniques: ['heat-tackle', 'judge-through'],
    signature: ['heat-tackle', 'judge-through', 'lightning-accel'],
    spirit: 'pegaso',
  },
  {
    id: 'wilson-fishman', name: 'Wilson Fishman', team: 'wild', position: 'DEF', element: 'bosque', rarity: 4,
    stats: { tiro: 27, control: 49, fisico: 79, defensa: 88, velocidad: 44, aguante: 44 },
    techniques: ['super-scan-df', 'killer-slide'],
    signature: ['super-scan-df', 'killer-slide', 'good-smell'],
    spirit: 'ent',
  },
  {
    id: 'peter-johnson', name: 'Peter Johnson', team: 'wild', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 26, control: 39, fisico: 70, defensa: 78, velocidad: 30, aguante: 45 },
    techniques: ['super-scan-df'],
    signature: ['super-scan-df', 'killer-slide'],
  },
  {
    id: 'hellion', name: 'Hellion', team: 'wild', position: 'DEL', element: 'montana', rarity: 3,
    stats: { tiro: 86, control: 63, fisico: 38, defensa: 19, velocidad: 46, aguante: 26 },
    techniques: ['tarzan-kick'],
    signature: ['tarzan-kick', 'dokonjou-club'],
  },
  {
    id: 'cham-lion', name: 'Cham Lion', team: 'wild', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 39, control: 82, fisico: 41, defensa: 44, velocidad: 47, aguante: 37 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'steve-eagle', name: 'Steve Eagle', team: 'wild', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 46, control: 77, fisico: 39, defensa: 43, velocidad: 45, aguante: 37 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'bruce-monkey', name: 'Bruce Monkey', team: 'wild', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 40, control: 73, fisico: 33, defensa: 49, velocidad: 49, aguante: 34 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'gary-lancaster', name: 'Gary Lancaster', team: 'wild', position: 'DEL', element: 'montana', rarity: 3,
    stats: { tiro: 90, control: 59, fisico: 39, defensa: 24, velocidad: 53, aguante: 31 },
    techniques: ['tarzan-kick'],
    signature: ['tarzan-kick', 'dokonjou-club'],
  },
  {
    id: 'harry-snake', name: 'Harry Snake', team: 'wild', position: 'DEL', element: 'bosque', rarity: 2,
    stats: { tiro: 68, control: 51, fisico: 34, defensa: 20, velocidad: 41, aguante: 28 },
    techniques: ['rolling-kick'],
    signature: ['rolling-kick', 'death-zone'],
  },
  {
    id: 'adrian-speed', name: 'Adrian Speed', team: 'wild', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 75, control: 50, fisico: 35, defensa: 18, velocidad: 46, aguante: 24 },
    techniques: ['god-break'],
    signature: ['god-break', 'tri-pegasus'],
  },
  {
    id: 'chad-bullford', name: 'Chad Bullford', team: 'wild', position: 'DEF', element: 'fuego', rarity: 2,
    stats: { tiro: 23, control: 30, fisico: 62, defensa: 66, velocidad: 32, aguante: 32 },
    techniques: ['fake-bomber'],
    signature: ['fake-bomber', 'planet-shield'],
  },
  {
    id: 'alan-coe', name: 'Alan Coe', team: 'wild', position: 'MED', element: 'bosque', rarity: 1,
    stats: { tiro: 30, control: 52, fisico: 23, defensa: 28, velocidad: 33, aguante: 23 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'philip-anders', name: 'Philip Anders', team: 'wild', position: 'DEL', element: 'fuego', rarity: 1,
    stats: { tiro: 60, control: 41, fisico: 29, defensa: 18, velocidad: 30, aguante: 18 },
    techniques: ['dragon-tornado'],
    signature: ['dragon-tornado', 'the-phoenix'],
  },
  // ============================== SHURIKEN
  {
    id: 'juno-hundertmark', name: 'Juno Hundertmark', team: 'shuriken', position: 'DEF', element: 'aire', rarity: 5,
    stats: { tiro: 30, control: 57, fisico: 94, defensa: 105, velocidad: 49, aguante: 52 },
    techniques: ['coil-turn', 'the-tower'],
    signature: ['coil-turn', 'the-tower', 'ice-ground'],
    spirit: 'kraken',
  },
  {
    id: 'newton-flust', name: 'Newton Flust', team: 'shuriken', position: 'DEF', element: 'montana', rarity: 4,
    stats: { tiro: 31, control: 50, fisico: 77, defensa: 86, velocidad: 41, aguante: 42 },
    techniques: ['shikofumi', 'the-wall'],
    signature: ['shikofumi', 'the-wall', 'no-escape'],
    spirit: 'majin',
  },
  {
    id: 'oleander-meadows', name: 'Oleander Meadows', team: 'shuriken', position: 'DEF', element: 'montana', rarity: 4,
    stats: { tiro: 29, control: 46, fisico: 82, defensa: 92, velocidad: 37, aguante: 44 },
    techniques: ['shikofumi', 'the-wall'],
    signature: ['shikofumi', 'the-wall', 'no-escape'],
    spirit: 'majin',
  },
  {
    id: 'galen-thunderbird', name: 'Galen Thunderbird', team: 'shuriken', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 21, control: 38, fisico: 72, defensa: 81, velocidad: 35, aguante: 43 },
    techniques: ['shikofumi'],
    signature: ['shikofumi', 'the-wall'],
  },
  {
    id: 'finn-stoned', name: 'Finn Stoned', team: 'shuriken', position: 'DEF', element: 'fuego', rarity: 3,
    stats: { tiro: 29, control: 36, fisico: 70, defensa: 82, velocidad: 31, aguante: 42 },
    techniques: ['fake-bomber'],
    signature: ['fake-bomber', 'planet-shield'],
  },
  {
    id: 'phil-wingate', name: 'Phil Wingate', team: 'shuriken', position: 'MED', element: 'montana', rarity: 3,
    stats: { tiro: 39, control: 80, fisico: 41, defensa: 46, velocidad: 45, aguante: 34 },
    techniques: ['dash-accel'],
    signature: ['dash-accel', 'ninin-sankyaku'],
  },
  {
    id: 'jez-shell', name: 'Jez Shell', team: 'shuriken', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 46, control: 73, fisico: 38, defensa: 47, velocidad: 51, aguante: 35 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'jupiter-jumper', name: 'Jupiter Jumper', team: 'shuriken', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 40, control: 74, fisico: 33, defensa: 49, velocidad: 49, aguante: 35 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'thierry-reyes', name: 'Thierry Reyes', team: 'shuriken', position: 'MED', element: 'montana', rarity: 3,
    stats: { tiro: 45, control: 78, fisico: 37, defensa: 47, velocidad: 45, aguante: 38 },
    techniques: ['dash-accel'],
    signature: ['dash-accel', 'ninin-sankyaku'],
  },
  {
    id: 'hank-sullivan', name: 'Hank Sullivan', team: 'shuriken', position: 'MED', element: 'bosque', rarity: 2,
    stats: { tiro: 32, control: 62, fisico: 30, defensa: 38, velocidad: 45, aguante: 29 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'sail-bluesea', name: 'Sail Bluesea', team: 'shuriken', position: 'DEL', element: 'fuego', rarity: 2,
    stats: { tiro: 71, control: 50, fisico: 36, defensa: 22, velocidad: 40, aguante: 22 },
    techniques: ['dragon-tornado'],
    signature: ['dragon-tornado', 'the-phoenix'],
  },
  {
    id: 'kevin-castle', name: 'Kevin Castle', team: 'shuriken', position: 'POR', element: 'aire', rarity: 2,
    stats: { tiro: 18, control: 36, fisico: 44, defensa: 68, velocidad: 31, aguante: 46 },
    techniques: ['tornado-catch'],
    signature: ['tornado-catch', 'kogarashi'],
  },
  {
    id: 'john-reynolds', name: 'John Reynolds', team: 'shuriken', position: 'DEL', element: 'aire', rarity: 1,
    stats: { tiro: 60, control: 43, fisico: 30, defensa: 18, velocidad: 34, aguante: 24 },
    techniques: ['god-break'],
    signature: ['god-break', 'tri-pegasus'],
  },
  {
    id: 'dan-hopper', name: 'Dan Hopper', team: 'shuriken', position: 'DEF', element: 'montana', rarity: 1,
    stats: { tiro: 19, control: 25, fisico: 45, defensa: 52, velocidad: 20, aguante: 25 },
    techniques: ['shikofumi'],
    signature: ['shikofumi', 'the-wall'],
  },
  // ============================== FARM
  {
    id: 'charlie-boardfield-2', name: 'Charlie Boardfield', team: 'farm', position: 'POR', element: 'fuego', rarity: 5,
    stats: { tiro: 39, control: 47, fisico: 69, defensa: 115, velocidad: 50, aguante: 65 },
    techniques: ['nekketsu-punch', 'pressure-punch'],
    signature: ['nekketsu-punch', 'pressure-punch', 'full-power-shield'],
    spirit: 'pegaso',
  },
  {
    id: 'hugo-tallgeese-2', name: 'Hugo Tallgeese', team: 'farm', position: 'MED', element: 'fuego', rarity: 4,
    stats: { tiro: 48, control: 92, fisico: 47, defensa: 56, velocidad: 57, aguante: 37 },
    techniques: ['heat-tackle', 'judge-through'],
    signature: ['heat-tackle', 'judge-through', 'lightning-accel'],
    spirit: 'pegaso',
  },
  {
    id: 'wilson-fishman-2', name: 'Wilson Fishman', team: 'farm', position: 'DEF', element: 'bosque', rarity: 4,
    stats: { tiro: 33, control: 50, fisico: 77, defensa: 85, velocidad: 42, aguante: 51 },
    techniques: ['super-scan-df', 'killer-slide'],
    signature: ['super-scan-df', 'killer-slide', 'good-smell'],
    spirit: 'ent',
  },
  {
    id: 'peter-johnson-2', name: 'Peter Johnson', team: 'farm', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 24, control: 42, fisico: 72, defensa: 75, velocidad: 36, aguante: 43 },
    techniques: ['super-scan-df'],
    signature: ['super-scan-df', 'killer-slide'],
  },
  {
    id: 'hellion-2', name: 'Hellion', team: 'farm', position: 'DEL', element: 'montana', rarity: 3,
    stats: { tiro: 86, control: 57, fisico: 39, defensa: 22, velocidad: 45, aguante: 26 },
    techniques: ['tarzan-kick'],
    signature: ['tarzan-kick', 'dokonjou-club'],
  },
  {
    id: 'cham-lion-2', name: 'Cham Lion', team: 'farm', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 40, control: 78, fisico: 40, defensa: 44, velocidad: 50, aguante: 36 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'steve-eagle-2', name: 'Steve Eagle', team: 'farm', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 42, control: 76, fisico: 39, defensa: 43, velocidad: 47, aguante: 35 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'bruce-monkey-2', name: 'Bruce Monkey', team: 'farm', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 46, control: 81, fisico: 33, defensa: 46, velocidad: 45, aguante: 31 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'gary-lancaster-2', name: 'Gary Lancaster', team: 'farm', position: 'DEL', element: 'montana', rarity: 3,
    stats: { tiro: 82, control: 64, fisico: 41, defensa: 22, velocidad: 50, aguante: 27 },
    techniques: ['tarzan-kick'],
    signature: ['tarzan-kick', 'dokonjou-club'],
  },
  {
    id: 'harry-snake-2', name: 'Harry Snake', team: 'farm', position: 'DEL', element: 'bosque', rarity: 2,
    stats: { tiro: 77, control: 55, fisico: 37, defensa: 18, velocidad: 38, aguante: 28 },
    techniques: ['rolling-kick'],
    signature: ['rolling-kick', 'death-zone'],
  },
  {
    id: 'adrian-speed-2', name: 'Adrian Speed', team: 'farm', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 70, control: 52, fisico: 32, defensa: 19, velocidad: 37, aguante: 21 },
    techniques: ['god-break'],
    signature: ['god-break', 'tri-pegasus'],
  },
  {
    id: 'chad-bullford-2', name: 'Chad Bullford', team: 'farm', position: 'DEF', element: 'fuego', rarity: 2,
    stats: { tiro: 20, control: 38, fisico: 57, defensa: 62, velocidad: 31, aguante: 31 },
    techniques: ['fake-bomber'],
    signature: ['fake-bomber', 'planet-shield'],
  },
  {
    id: 'alan-coe-2', name: 'Alan Coe', team: 'farm', position: 'MED', element: 'bosque', rarity: 1,
    stats: { tiro: 28, control: 55, fisico: 26, defensa: 29, velocidad: 35, aguante: 24 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'philip-anders-2', name: 'Philip Anders', team: 'farm', position: 'DEL', element: 'fuego', rarity: 1,
    stats: { tiro: 58, control: 42, fisico: 27, defensa: 18, velocidad: 33, aguante: 25 },
    techniques: ['dragon-tornado'],
    signature: ['dragon-tornado', 'the-phoenix'],
  },
  // ============================== KIRKWOOD
  {
    id: 'john-neville', name: 'John Neville', team: 'kirkwood', position: 'POR', element: 'fuego', rarity: 5,
    stats: { tiro: 36, control: 53, fisico: 67, defensa: 111, velocidad: 50, aguante: 67 },
    techniques: ['nekketsu-punch', 'pressure-punch'],
    signature: ['nekketsu-punch', 'pressure-punch', 'full-power-shield'],
    spirit: 'pegaso',
  },
  {
    id: 'malcolm-night', name: 'Malcolm Night', team: 'kirkwood', position: 'DEF', element: 'fuego', rarity: 4,
    stats: { tiro: 27, control: 45, fisico: 77, defensa: 93, velocidad: 41, aguante: 47 },
    techniques: ['fake-bomber', 'planet-shield'],
    signature: ['fake-bomber', 'planet-shield', 'flame-dance'],
    spirit: 'pegaso',
  },
  {
    id: 'alfred-meenan', name: 'Alfred Meenan', team: 'kirkwood', position: 'DEF', element: 'bosque', rarity: 4,
    stats: { tiro: 27, control: 42, fisico: 80, defensa: 87, velocidad: 37, aguante: 47 },
    techniques: ['super-scan-df', 'killer-slide'],
    signature: ['super-scan-df', 'killer-slide', 'good-smell'],
    spirit: 'ent',
  },
  {
    id: 'dan-mirthful', name: 'Dan Mirthful', team: 'kirkwood', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 29, control: 41, fisico: 73, defensa: 81, velocidad: 39, aguante: 36 },
    techniques: ['super-scan-df'],
    signature: ['super-scan-df', 'killer-slide'],
  },
  {
    id: 'ricky-clover', name: 'Ricky Clover', team: 'kirkwood', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 22, control: 42, fisico: 67, defensa: 78, velocidad: 37, aguante: 38 },
    techniques: ['shikofumi'],
    signature: ['shikofumi', 'the-wall'],
  },
  {
    id: 'toby-damian', name: 'Toby Damian', team: 'kirkwood', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 40, control: 81, fisico: 40, defensa: 47, velocidad: 45, aguante: 35 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'york-nashmith', name: 'York Nashmith', team: 'kirkwood', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 39, control: 78, fisico: 41, defensa: 46, velocidad: 50, aguante: 31 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'zachary-moore', name: 'Zachary Moore', team: 'kirkwood', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 45, control: 81, fisico: 36, defensa: 49, velocidad: 51, aguante: 34 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'marvin-murdock', name: 'Marvin Murdock', team: 'kirkwood', position: 'DEL', element: 'fuego', rarity: 3,
    stats: { tiro: 83, control: 60, fisico: 36, defensa: 25, velocidad: 50, aguante: 30 },
    techniques: ['dragon-tornado'],
    signature: ['dragon-tornado', 'fire-tornado'],
  },
  {
    id: 'thomas-murdock', name: 'Thomas Murdock', team: 'kirkwood', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 74, control: 46, fisico: 35, defensa: 18, velocidad: 40, aguante: 26 },
    techniques: ['god-break'],
    signature: ['god-break', 'tri-pegasus'],
  },
  {
    id: 'tyler-murdock', name: 'Tyler Murdock', team: 'kirkwood', position: 'DEL', element: 'montana', rarity: 2,
    stats: { tiro: 72, control: 53, fisico: 32, defensa: 18, velocidad: 40, aguante: 23 },
    techniques: ['tarzan-kick'],
    signature: ['tarzan-kick', 'megane-crash'],
  },
  {
    id: 'simon-calier', name: 'Simon Calier', team: 'kirkwood', position: 'MED', element: 'bosque', rarity: 2,
    stats: { tiro: 34, control: 63, fisico: 29, defensa: 38, velocidad: 40, aguante: 25 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'brody-gloom', name: 'Brody Gloom', team: 'kirkwood', position: 'MED', element: 'montana', rarity: 1,
    stats: { tiro: 28, control: 56, fisico: 29, defensa: 30, velocidad: 38, aguante: 20 },
    techniques: ['dash-accel'],
    signature: ['dash-accel', 'ninin-sankyaku'],
  },
  {
    id: 'victor-talis', name: 'Victor Talis', team: 'kirkwood', position: 'MED', element: 'bosque', rarity: 1,
    stats: { tiro: 34, control: 54, fisico: 24, defensa: 32, velocidad: 37, aguante: 22 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  // ============================== ROYAL
  {
    id: 'david-samford', name: 'David Samford', team: 'royal', position: 'DEL', element: 'bosque', rarity: 4,
    stats: { tiro: 101, control: 69, fisico: 42, defensa: 29, velocidad: 58, aguante: 31 },
    techniques: ['rolling-kick', 'dragon-crash'],
    signature: ['rolling-kick', 'dragon-crash', 'supernova'],
    spirit: 'ent',
  },
  {
    id: 'joseph-king', name: 'Joseph King', team: 'royal', position: 'POR', element: 'fuego', rarity: 4,
    stats: { tiro: 27, control: 42, fisico: 53, defensa: 100, velocidad: 47, aguante: 58 },
    techniques: ['nekketsu-punch', 'pressure-punch'],
    signature: ['nekketsu-punch', 'pressure-punch', 'full-power-shield'],
    spirit: 'pegaso',
  },
  {
    id: 'peter-drent', name: 'Peter Drent', team: 'royal', position: 'DEF', element: 'montana', rarity: 4,
    stats: { tiro: 32, control: 42, fisico: 78, defensa: 92, velocidad: 38, aguante: 50 },
    techniques: ['shikofumi', 'the-wall'],
    signature: ['shikofumi', 'the-wall', 'no-escape'],
    spirit: 'majin',
  },
  {
    id: 'ben-simmons', name: 'Ben Simmons', team: 'royal', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 30, control: 40, fisico: 73, defensa: 81, velocidad: 38, aguante: 44 },
    techniques: ['super-scan-df'],
    signature: ['super-scan-df', 'killer-slide'],
  },
  {
    id: 'alan-master', name: 'Alan Master', team: 'royal', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 41, control: 79, fisico: 40, defensa: 49, velocidad: 53, aguante: 31 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'gus-martin', name: 'Gus Martin', team: 'royal', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 23, control: 39, fisico: 73, defensa: 81, velocidad: 32, aguante: 44 },
    techniques: ['super-scan-df'],
    signature: ['super-scan-df', 'killer-slide'],
  },
  {
    id: 'herman-waldon', name: 'Herman Waldon', team: 'royal', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 47, control: 77, fisico: 41, defensa: 43, velocidad: 52, aguante: 38 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'john-bloom', name: 'John Bloom', team: 'royal', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 40, control: 79, fisico: 41, defensa: 47, velocidad: 46, aguante: 33 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'derek-swing', name: 'Derek Swing', team: 'royal', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 45, control: 73, fisico: 37, defensa: 42, velocidad: 45, aguante: 32 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'daniel-hatch', name: 'Daniel Hatch', team: 'royal', position: 'DEL', element: 'bosque', rarity: 2,
    stats: { tiro: 68, control: 53, fisico: 37, defensa: 23, velocidad: 42, aguante: 23 },
    techniques: ['rolling-kick'],
    signature: ['rolling-kick', 'death-zone'],
  },
  {
    id: 'alessandro-il-grande', name: 'Alessandro il Grande', team: 'royal', position: 'POR', element: 'montana', rarity: 2,
    stats: { tiro: 20, control: 36, fisico: 41, defensa: 68, velocidad: 30, aguante: 44 },
    techniques: ['god-hand'],
    signature: ['god-hand', 'mugen-the-hand'],
  },
  {
    id: 'cliff-tomlinson', name: 'Cliff Tomlinson', team: 'royal', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 68, control: 52, fisico: 34, defensa: 19, velocidad: 42, aguante: 29 },
    techniques: ['god-break'],
    signature: ['god-break', 'tri-pegasus'],
  },
  {
    id: 'jim-lawrenson', name: 'Jim Lawrenson', team: 'royal', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 68, control: 55, fisico: 38, defensa: 20, velocidad: 41, aguante: 25 },
    techniques: ['god-break'],
    signature: ['god-break', 'tri-pegasus'],
  },
  {
    id: 'barry-potts', name: 'Barry Potts', team: 'royal', position: 'MED', element: 'aire', rarity: 2,
    stats: { tiro: 32, control: 64, fisico: 35, defensa: 42, velocidad: 39, aguante: 31 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  // ============================== ZEUS
  {
    id: 'byron-love', name: 'Byron Love', team: 'zeus', position: 'MED', element: 'bosque', rarity: 5,
    stats: { tiro: 58, control: 100, fisico: 46, defensa: 62, velocidad: 65, aguante: 41 },
    techniques: ['god-break', 'inazuma-break'],
    signature: ['god-break', 'inazuma-break'],
    spirit: 'ent',
  },
  {
    id: 'paul-siddon', name: 'Paul Siddon', team: 'zeus', position: 'POR', element: 'montana', rarity: 4,
    stats: { tiro: 35, control: 41, fisico: 59, defensa: 102, velocidad: 48, aguante: 57 },
    techniques: ['god-hand', 'mugen-the-hand'],
    signature: ['god-hand', 'mugen-the-hand', 'majin-the-hand'],
    spirit: 'majin',
  },
  {
    id: 'apollo-light', name: 'Apollo Light', team: 'zeus', position: 'DEF', element: 'bosque', rarity: 4,
    stats: { tiro: 35, control: 50, fisico: 80, defensa: 90, velocidad: 44, aguante: 46 },
    techniques: ['super-scan-df', 'killer-slide'],
    signature: ['super-scan-df', 'killer-slide', 'good-smell'],
    spirit: 'ent',
  },
  {
    id: 'jeff-iron', name: 'Jeff Iron', team: 'zeus', position: 'DEF', element: 'fuego', rarity: 3,
    stats: { tiro: 24, control: 43, fisico: 71, defensa: 81, velocidad: 30, aguante: 44 },
    techniques: ['fake-bomber'],
    signature: ['fake-bomber', 'planet-shield'],
  },
  {
    id: 'lane-war', name: 'Lane War', team: 'zeus', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 29, control: 39, fisico: 67, defensa: 79, velocidad: 35, aguante: 39 },
    techniques: ['shikofumi'],
    signature: ['shikofumi', 'the-wall'],
  },
  {
    id: 'danny-wood', name: 'Danny Wood', team: 'zeus', position: 'DEF', element: 'aire', rarity: 3,
    stats: { tiro: 27, control: 39, fisico: 69, defensa: 82, velocidad: 30, aguante: 41 },
    techniques: ['coil-turn'],
    signature: ['coil-turn', 'the-tower'],
  },
  {
    id: 'artie-mishman', name: 'Artie Mishman', team: 'zeus', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 42, control: 80, fisico: 38, defensa: 49, velocidad: 53, aguante: 34 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'arion-matlock', name: 'Arion Matlock', team: 'zeus', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 39, control: 80, fisico: 33, defensa: 49, velocidad: 51, aguante: 31 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'wesley-knox', name: 'Wesley Knox', team: 'zeus', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 39, control: 75, fisico: 33, defensa: 47, velocidad: 51, aguante: 34 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'jonas-demetrius', name: 'Jonas Demetrius', team: 'zeus', position: 'DEL', element: 'fuego', rarity: 2,
    stats: { tiro: 74, control: 53, fisico: 37, defensa: 20, velocidad: 43, aguante: 26 },
    techniques: ['dragon-tornado'],
    signature: ['dragon-tornado', 'the-phoenix'],
  },
  {
    id: 'henry-house', name: 'Henry House', team: 'zeus', position: 'MED', element: 'fuego', rarity: 2,
    stats: { tiro: 39, control: 67, fisico: 29, defensa: 37, velocidad: 44, aguante: 28 },
    techniques: ['heat-tackle'],
    signature: ['heat-tackle', 'judge-through'],
  },
  {
    id: 'iggy-russ', name: 'Iggy Russ', team: 'zeus', position: 'POR', element: 'aire', rarity: 2,
    stats: { tiro: 24, control: 29, fisico: 40, defensa: 76, velocidad: 32, aguante: 43 },
    techniques: ['tornado-catch'],
    signature: ['tornado-catch', 'kogarashi'],
  },
  {
    id: 'gus-heeley', name: 'Gus Heeley', team: 'zeus', position: 'DEL', element: 'montana', rarity: 2,
    stats: { tiro: 73, control: 52, fisico: 32, defensa: 18, velocidad: 40, aguante: 21 },
    techniques: ['tarzan-kick'],
    signature: ['tarzan-kick', 'megane-crash'],
  },
  {
    id: 'harry-closs', name: 'Harry Closs', team: 'zeus', position: 'DEF', element: 'fuego', rarity: 2,
    stats: { tiro: 26, control: 32, fisico: 62, defensa: 69, velocidad: 26, aguante: 31 },
    techniques: ['fake-bomber'],
    signature: ['fake-bomber', 'planet-shield'],
  },
  // ============================== KFC
  {
    id: 'robert-silver', name: 'Robert Silver', team: 'kfc', position: 'DEF', element: 'aire', rarity: 5,
    stats: { tiro: 35, control: 49, fisico: 88, defensa: 103, velocidad: 49, aguante: 54 },
    techniques: ['coil-turn', 'the-tower'],
    signature: ['coil-turn', 'the-tower', 'ice-ground'],
    spirit: 'kraken',
  },
  {
    id: 'earl-eton', name: 'Earl Eton', team: 'kfc', position: 'MED', element: 'bosque', rarity: 4,
    stats: { tiro: 53, control: 94, fisico: 42, defensa: 55, velocidad: 58, aguante: 38 },
    techniques: ['super-scan-of', 'illusion-ball'],
    signature: ['super-scan-of', 'illusion-ball', 'southern-crosscut'],
    spirit: 'ent',
  },
  {
    id: 'sothern-newman', name: 'Sothern Newman', team: 'kfc', position: 'DEF', element: 'montana', rarity: 4,
    stats: { tiro: 27, control: 46, fisico: 80, defensa: 89, velocidad: 44, aguante: 47 },
    techniques: ['shikofumi', 'the-wall'],
    signature: ['shikofumi', 'the-wall', 'no-escape'],
    spirit: 'majin',
  },
  {
    id: 'taylor-higgins', name: 'Taylor Higgins', team: 'kfc', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 46, control: 82, fisico: 36, defensa: 46, velocidad: 47, aguante: 38 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'jamie-cool', name: 'Jamie Cool', team: 'kfc', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 42, control: 73, fisico: 36, defensa: 43, velocidad: 51, aguante: 39 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'hans-randall', name: 'Hans Randall', team: 'kfc', position: 'DEL', element: 'fuego', rarity: 3,
    stats: { tiro: 83, control: 65, fisico: 41, defensa: 19, velocidad: 45, aguante: 29 },
    techniques: ['dragon-tornado'],
    signature: ['dragon-tornado', 'fire-tornado'],
  },
  {
    id: 'michael-riverside', name: 'Michael Riverside', team: 'kfc', position: 'MED', element: 'montana', rarity: 3,
    stats: { tiro: 40, control: 75, fisico: 39, defensa: 47, velocidad: 47, aguante: 38 },
    techniques: ['dash-accel'],
    signature: ['dash-accel', 'ninin-sankyaku'],
  },
  {
    id: 'bart-grantham', name: 'Bart Grantham', team: 'kfc', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 24, control: 41, fisico: 70, defensa: 81, velocidad: 31, aguante: 44 },
    techniques: ['super-scan-df'],
    signature: ['super-scan-df', 'killer-slide'],
  },
  {
    id: 'karl-blue', name: 'Karl Blue', team: 'kfc', position: 'MED', element: 'montana', rarity: 3,
    stats: { tiro: 47, control: 73, fisico: 33, defensa: 41, velocidad: 48, aguante: 37 },
    techniques: ['dash-accel'],
    signature: ['dash-accel', 'ninin-sankyaku'],
  },
  {
    id: 'theakston-plank', name: 'Theakston Plank', team: 'kfc', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 72, control: 54, fisico: 37, defensa: 24, velocidad: 40, aguante: 25 },
    techniques: ['god-break'],
    signature: ['god-break', 'tri-pegasus'],
  },
  {
    id: 'ken-cake', name: 'Ken Cake', team: 'kfc', position: 'DEL', element: 'montana', rarity: 2,
    stats: { tiro: 73, control: 55, fisico: 35, defensa: 18, velocidad: 44, aguante: 27 },
    techniques: ['tarzan-kick'],
    signature: ['tarzan-kick', 'megane-crash'],
  },
  {
    id: 'mitch-grumble', name: 'Mitch Grumble', team: 'kfc', position: 'MED', element: 'aire', rarity: 2,
    stats: { tiro: 36, control: 68, fisico: 27, defensa: 35, velocidad: 37, aguante: 28 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  // ============================== OUMIHARA
  {
    id: 'rocky-black', name: 'Rocky Black', team: 'oumihara', position: 'POR', element: 'fuego', rarity: 5,
    stats: { tiro: 35, control: 50, fisico: 64, defensa: 110, velocidad: 52, aguante: 68 },
    techniques: ['nekketsu-punch', 'pressure-punch'],
    signature: ['nekketsu-punch', 'pressure-punch', 'full-power-shield'],
    spirit: 'pegaso',
  },
  {
    id: 'scuba', name: 'Scuba', team: 'oumihara', position: 'DEF', element: 'aire', rarity: 4,
    stats: { tiro: 27, control: 44, fisico: 77, defensa: 86, velocidad: 40, aguante: 43 },
    techniques: ['coil-turn', 'the-tower'],
    signature: ['coil-turn', 'the-tower', 'ice-ground'],
    spirit: 'kraken',
  },
  {
    id: 'victor-hills', name: 'Victor Hills', team: 'oumihara', position: 'DEF', element: 'montana', rarity: 4,
    stats: { tiro: 30, control: 44, fisico: 80, defensa: 93, velocidad: 44, aguante: 43 },
    techniques: ['shikofumi', 'the-wall'],
    signature: ['shikofumi', 'the-wall', 'no-escape'],
    spirit: 'majin',
  },
  {
    id: 'hurley-kane', name: 'Hurley Kane', team: 'oumihara', position: 'DEF', element: 'aire', rarity: 3,
    stats: { tiro: 21, control: 36, fisico: 67, defensa: 77, velocidad: 33, aguante: 42 },
    techniques: ['coil-turn'],
    signature: ['coil-turn', 'the-tower'],
  },
  {
    id: 'hector-redding', name: 'Hector Redding', team: 'oumihara', position: 'DEF', element: 'fuego', rarity: 3,
    stats: { tiro: 27, control: 36, fisico: 70, defensa: 75, velocidad: 32, aguante: 39 },
    techniques: ['fake-bomber'],
    signature: ['fake-bomber', 'planet-shield'],
  },
  {
    id: 'mackenzie-fordline', name: 'Mackenzie Fordline', team: 'oumihara', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 40, control: 79, fisico: 40, defensa: 47, velocidad: 53, aguante: 32 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'cadence-soundtown', name: 'Cadence Soundtown', team: 'oumihara', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 45, control: 80, fisico: 39, defensa: 41, velocidad: 48, aguante: 35 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'dora-delight', name: 'Dora Delight', team: 'oumihara', position: 'MED', element: 'fuego', rarity: 3,
    stats: { tiro: 39, control: 79, fisico: 35, defensa: 43, velocidad: 53, aguante: 33 },
    techniques: ['heat-tackle'],
    signature: ['heat-tackle', 'judge-through'],
  },
  {
    id: 'tom-contented', name: 'Tom Contented', team: 'oumihara', position: 'DEL', element: 'montana', rarity: 3,
    stats: { tiro: 87, control: 58, fisico: 37, defensa: 19, velocidad: 46, aguante: 24 },
    techniques: ['tarzan-kick'],
    signature: ['tarzan-kick', 'dokonjou-club'],
  },
  {
    id: 'joston-easton', name: 'Joston Easton', team: 'oumihara', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 72, control: 53, fisico: 35, defensa: 23, velocidad: 40, aguante: 28 },
    techniques: ['god-break'],
    signature: ['god-break', 'tri-pegasus'],
  },
  {
    id: 'gaston-cooley', name: 'Gaston Cooley', team: 'oumihara', position: 'POR', element: 'aire', rarity: 2,
    stats: { tiro: 25, control: 36, fisico: 37, defensa: 77, velocidad: 36, aguante: 47 },
    techniques: ['tornado-catch'],
    signature: ['tornado-catch', 'kogarashi'],
  },
  {
    id: 'bevan-breakfast', name: 'Bevan Breakfast', team: 'oumihara', position: 'DEF', element: 'bosque', rarity: 2,
    stats: { tiro: 18, control: 36, fisico: 60, defensa: 70, velocidad: 32, aguante: 38 },
    techniques: ['super-scan-df'],
    signature: ['super-scan-df', 'killer-slide'],
  },
  {
    id: 'jack-griddle', name: 'Jack Griddle', team: 'oumihara', position: 'MED', element: 'fuego', rarity: 1,
    stats: { tiro: 28, control: 51, fisico: 27, defensa: 35, velocidad: 34, aguante: 21 },
    techniques: ['heat-tackle'],
    signature: ['heat-tackle', 'judge-through'],
  },
  // ============================== MIKAGE
  {
    id: 'thomas-feldt', name: 'Thomas Feldt', team: 'mikage', position: 'POR', element: 'bosque', rarity: 5,
    stats: { tiro: 36, control: 51, fisico: 64, defensa: 110, velocidad: 49, aguante: 67 },
    techniques: ['killer-blade', 'black-hole'],
    signature: ['killer-blade', 'black-hole', 'wormhole'],
    spirit: 'ent',
  },
  {
    id: 'harry-leading', name: 'Harry Leading', team: 'mikage', position: 'DEF', element: 'aire', rarity: 4,
    stats: { tiro: 32, control: 43, fisico: 80, defensa: 92, velocidad: 44, aguante: 48 },
    techniques: ['coil-turn', 'the-tower'],
    signature: ['coil-turn', 'the-tower', 'ice-ground'],
    spirit: 'kraken',
  },
  {
    id: 'terry-stronger', name: 'Terry Stronger', team: 'mikage', position: 'DEF', element: 'fuego', rarity: 4,
    stats: { tiro: 33, control: 46, fisico: 83, defensa: 90, velocidad: 38, aguante: 48 },
    techniques: ['fake-bomber', 'planet-shield'],
    signature: ['fake-bomber', 'planet-shield', 'flame-dance'],
    spirit: 'pegaso',
  },
  {
    id: 'philip-marvel', name: 'Philip Marvel', team: 'mikage', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 26, control: 37, fisico: 66, defensa: 77, velocidad: 32, aguante: 41 },
    techniques: ['shikofumi'],
    signature: ['shikofumi', 'the-wall'],
  },
  {
    id: 'tyron-rock', name: 'Tyron Rock', team: 'mikage', position: 'MED', element: 'fuego', rarity: 3,
    stats: { tiro: 44, control: 79, fisico: 36, defensa: 47, velocidad: 51, aguante: 32 },
    techniques: ['heat-tackle'],
    signature: ['heat-tackle', 'judge-through'],
  },
  {
    id: 'francis-tell', name: 'Francis Tell', team: 'mikage', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 44, control: 73, fisico: 37, defensa: 41, velocidad: 50, aguante: 38 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'jonathan-seller', name: 'Jonathan Seller', team: 'mikage', position: 'DEL', element: 'aire', rarity: 3,
    stats: { tiro: 84, control: 56, fisico: 39, defensa: 23, velocidad: 47, aguante: 28 },
    techniques: ['god-break'],
    signature: ['god-break', 'eternal-blizzard'],
  },
  {
    id: 'ujin-shin', name: 'Ujin Shin', team: 'mikage', position: 'DEF', element: 'fuego', rarity: 3,
    stats: { tiro: 29, control: 39, fisico: 65, defensa: 75, velocidad: 35, aguante: 42 },
    techniques: ['fake-bomber'],
    signature: ['fake-bomber', 'planet-shield'],
  },
  {
    id: 'reg-underwood', name: 'Reg Underwood', team: 'mikage', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 43, control: 73, fisico: 38, defensa: 46, velocidad: 51, aguante: 31 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'patrick-stiller', name: 'Patrick Stiller', team: 'mikage', position: 'MED', element: 'aire', rarity: 2,
    stats: { tiro: 37, control: 70, fisico: 31, defensa: 37, velocidad: 39, aguante: 25 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'charles-oughtry', name: 'Charles Oughtry', team: 'mikage', position: 'MED', element: 'montana', rarity: 2,
    stats: { tiro: 33, control: 61, fisico: 36, defensa: 34, velocidad: 45, aguante: 26 },
    techniques: ['dash-accel'],
    signature: ['dash-accel', 'ninin-sankyaku'],
  },
  {
    id: 'clive-mooney', name: 'Clive Mooney', team: 'mikage', position: 'DEL', element: 'fuego', rarity: 2,
    stats: { tiro: 68, control: 50, fisico: 34, defensa: 21, velocidad: 40, aguante: 28 },
    techniques: ['dragon-tornado'],
    signature: ['dragon-tornado', 'the-phoenix'],
  },
  {
    id: 'neil-waters', name: 'Neil Waters', team: 'mikage', position: 'DEF', element: 'bosque', rarity: 1,
    stats: { tiro: 19, control: 24, fisico: 47, defensa: 56, velocidad: 20, aguante: 30 },
    techniques: ['super-scan-df'],
    signature: ['super-scan-df', 'killer-slide'],
  },
  // ============================== MANYUUJI
  {
    id: 'crane-kik', name: 'Crane Kik', team: 'manyuuji', position: 'POR', element: 'bosque', rarity: 5,
    stats: { tiro: 36, control: 48, fisico: 60, defensa: 108, velocidad: 48, aguante: 67 },
    techniques: ['killer-blade', 'black-hole'],
    signature: ['killer-blade', 'black-hole', 'wormhole'],
    spirit: 'ent',
  },
  {
    id: 'parry-waxon', name: 'Parry Waxon', team: 'manyuuji', position: 'DEF', element: 'aire', rarity: 4,
    stats: { tiro: 33, control: 43, fisico: 79, defensa: 91, velocidad: 35, aguante: 43 },
    techniques: ['coil-turn', 'the-tower'],
    signature: ['coil-turn', 'the-tower', 'ice-ground'],
    spirit: 'kraken',
  },
  {
    id: 'bri-spark', name: 'Bri Spark', team: 'manyuuji', position: 'DEF', element: 'montana', rarity: 4,
    stats: { tiro: 26, control: 46, fisico: 80, defensa: 90, velocidad: 44, aguante: 44 },
    techniques: ['shikofumi', 'the-wall'],
    signature: ['shikofumi', 'the-wall', 'no-escape'],
    spirit: 'majin',
  },
  {
    id: 'max-fortune', name: 'Max Fortune', team: 'manyuuji', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 29, control: 41, fisico: 67, defensa: 78, velocidad: 37, aguante: 41 },
    techniques: ['super-scan-df'],
    signature: ['super-scan-df', 'killer-slide'],
  },
  {
    id: 'brendan-water', name: 'Brendan Water', team: 'manyuuji', position: 'DEF', element: 'fuego', rarity: 3,
    stats: { tiro: 30, control: 40, fisico: 70, defensa: 76, velocidad: 35, aguante: 42 },
    techniques: ['fake-bomber'],
    signature: ['fake-bomber', 'planet-shield'],
  },
  {
    id: 'junior-fardream', name: 'Junior Fardream', team: 'manyuuji', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 48, control: 74, fisico: 41, defensa: 46, velocidad: 49, aguante: 34 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'berdy-caster', name: 'Berdy Caster', team: 'manyuuji', position: 'DEL', element: 'bosque', rarity: 3,
    stats: { tiro: 84, control: 60, fisico: 38, defensa: 21, velocidad: 47, aguante: 26 },
    techniques: ['rolling-kick'],
    signature: ['rolling-kick', 'dragon-crash'],
  },
  {
    id: 'lee-dinglite', name: 'Lee Dinglite', team: 'manyuuji', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 43, control: 74, fisico: 40, defensa: 45, velocidad: 49, aguante: 31 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'marshall-artz', name: 'Marshall Artz', team: 'manyuuji', position: 'DEL', element: 'fuego', rarity: 3,
    stats: { tiro: 86, control: 58, fisico: 45, defensa: 21, velocidad: 45, aguante: 27 },
    techniques: ['dragon-tornado'],
    signature: ['dragon-tornado', 'fire-tornado'],
  },
  {
    id: 'tyke-wando', name: 'Tyke Wando', team: 'manyuuji', position: 'DEL', element: 'bosque', rarity: 2,
    stats: { tiro: 75, control: 46, fisico: 37, defensa: 19, velocidad: 46, aguante: 28 },
    techniques: ['rolling-kick'],
    signature: ['rolling-kick', 'death-zone'],
  },
  {
    id: 'dirk-artz', name: 'Dirk Artz', team: 'manyuuji', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 76, control: 46, fisico: 34, defensa: 20, velocidad: 41, aguante: 26 },
    techniques: ['god-break'],
    signature: ['god-break', 'tri-pegasus'],
  },
  {
    id: 'scott-banyan', name: 'Scott Banyan', team: 'manyuuji', position: 'DEF', element: 'bosque', rarity: 2,
    stats: { tiro: 22, control: 36, fisico: 60, defensa: 67, velocidad: 32, aguante: 33 },
    techniques: ['super-scan-df'],
    signature: ['super-scan-df', 'killer-slide'],
  },
  {
    id: 'earnest-bookworm', name: 'Earnest Bookworm', team: 'manyuuji', position: 'POR', element: 'aire', rarity: 1,
    stats: { tiro: 22, control: 26, fisico: 32, defensa: 59, velocidad: 24, aguante: 40 },
    techniques: ['tornado-catch'],
    signature: ['tornado-catch', 'kogarashi'],
  },
  {
    id: 'ollie-gami', name: 'Ollie Gami', team: 'manyuuji', position: 'DEF', element: 'bosque', rarity: 1,
    stats: { tiro: 19, control: 33, fisico: 45, defensa: 51, velocidad: 20, aguante: 30 },
    techniques: ['super-scan-df'],
    signature: ['super-scan-df', 'killer-slide'],
  },
  // ============================== YOKATO
  {
    id: 'darren-lachance', name: 'Darren LaChance', team: 'yokato', position: 'POR', element: 'bosque', rarity: 5,
    stats: { tiro: 31, control: 48, fisico: 61, defensa: 117, velocidad: 48, aguante: 71 },
    techniques: ['killer-blade', 'black-hole'],
    signature: ['killer-blade', 'black-hole', 'wormhole'],
    spirit: 'ent',
  },
  {
    id: 'drancis-fake', name: 'Drancis Fake', team: 'yokato', position: 'DEF', element: 'aire', rarity: 4,
    stats: { tiro: 33, control: 43, fisico: 80, defensa: 86, velocidad: 43, aguante: 49 },
    techniques: ['coil-turn', 'the-tower'],
    signature: ['coil-turn', 'the-tower', 'ice-ground'],
    spirit: 'kraken',
  },
  {
    id: 'mick-mishap', name: 'Mick Mishap', team: 'yokato', position: 'DEF', element: 'bosque', rarity: 4,
    stats: { tiro: 28, control: 42, fisico: 75, defensa: 92, velocidad: 40, aguante: 43 },
    techniques: ['super-scan-df', 'killer-slide'],
    signature: ['super-scan-df', 'killer-slide', 'good-smell'],
    spirit: 'ent',
  },
  {
    id: 'louis-leave', name: 'Louis Leave', team: 'yokato', position: 'DEF', element: 'fuego', rarity: 3,
    stats: { tiro: 24, control: 36, fisico: 71, defensa: 75, velocidad: 37, aguante: 44 },
    techniques: ['fake-bomber'],
    signature: ['fake-bomber', 'planet-shield'],
  },
  {
    id: 'maurice-badgame', name: 'Maurice Badgame', team: 'yokato', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 23, control: 37, fisico: 65, defensa: 81, velocidad: 39, aguante: 38 },
    techniques: ['shikofumi'],
    signature: ['shikofumi', 'the-wall'],
  },
  {
    id: 'cannon-random', name: 'Cannon Random', team: 'yokato', position: 'MED', element: 'fuego', rarity: 3,
    stats: { tiro: 41, control: 74, fisico: 34, defensa: 44, velocidad: 50, aguante: 35 },
    techniques: ['heat-tackle'],
    signature: ['heat-tackle', 'judge-through'],
  },
  {
    id: 'ulric-richmen', name: 'Ulric Richmen', team: 'yokato', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 44, control: 75, fisico: 36, defensa: 43, velocidad: 53, aguante: 38 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'dave-fate', name: 'Dave Fate', team: 'yokato', position: 'DEL', element: 'montana', rarity: 3,
    stats: { tiro: 81, control: 61, fisico: 44, defensa: 19, velocidad: 50, aguante: 32 },
    techniques: ['tarzan-kick'],
    signature: ['tarzan-kick', 'dokonjou-club'],
  },
  {
    id: 'dany-destiny', name: 'Dany Destiny', team: 'yokato', position: 'DEF', element: 'fuego', rarity: 3,
    stats: { tiro: 24, control: 44, fisico: 73, defensa: 76, velocidad: 38, aguante: 44 },
    techniques: ['fake-bomber'],
    signature: ['fake-bomber', 'planet-shield'],
  },
  {
    id: 'spencer-duskplay', name: 'Spencer Duskplay', team: 'yokato', position: 'MED', element: 'aire', rarity: 2,
    stats: { tiro: 36, control: 68, fisico: 36, defensa: 38, velocidad: 42, aguante: 25 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'jonathan-luckyman', name: 'Jonathan Luckyman', team: 'yokato', position: 'DEL', element: 'bosque', rarity: 2,
    stats: { tiro: 77, control: 55, fisico: 31, defensa: 22, velocidad: 43, aguante: 21 },
    techniques: ['rolling-kick'],
    signature: ['rolling-kick', 'death-zone'],
  },
  {
    id: 'joe-poker', name: 'Joe Poker', team: 'yokato', position: 'DEL', element: 'fuego', rarity: 2,
    stats: { tiro: 73, control: 46, fisico: 31, defensa: 21, velocidad: 44, aguante: 28 },
    techniques: ['dragon-tornado'],
    signature: ['dragon-tornado', 'the-phoenix'],
  },
  {
    id: 'wiley-cracker', name: 'Wiley Cracker', team: 'yokato', position: 'POR', element: 'fuego', rarity: 1,
    stats: { tiro: 18, control: 30, fisico: 31, defensa: 56, velocidad: 22, aguante: 36 },
    techniques: ['nekketsu-punch'],
    signature: ['nekketsu-punch', 'pressure-punch'],
  },
  {
    id: 'mark-failing', name: 'Mark Failing', team: 'yokato', position: 'DEL', element: 'bosque', rarity: 1,
    stats: { tiro: 59, control: 46, fisico: 29, defensa: 20, velocidad: 38, aguante: 19 },
    techniques: ['rolling-kick'],
    signature: ['rolling-kick', 'death-zone'],
  },
  // ============================== GEMINI-STORM
  {
    id: 'gordon-star', name: 'Gordon Star', team: 'gemini-storm', position: 'POR', element: 'bosque', rarity: 5,
    stats: { tiro: 31, control: 52, fisico: 64, defensa: 116, velocidad: 50, aguante: 68 },
    techniques: ['killer-blade', 'black-hole'],
    signature: ['killer-blade', 'black-hole', 'wormhole'],
    spirit: 'ent',
  },
  {
    id: 'connor-shuttle', name: 'Connor Shuttle', team: 'gemini-storm', position: 'DEF', element: 'aire', rarity: 4,
    stats: { tiro: 27, control: 51, fisico: 77, defensa: 88, velocidad: 37, aguante: 47 },
    techniques: ['coil-turn', 'the-tower'],
    signature: ['coil-turn', 'the-tower', 'ice-ground'],
    spirit: 'kraken',
  },
  {
    id: 'jim-landing', name: 'Jim Landing', team: 'gemini-storm', position: 'DEF', element: 'fuego', rarity: 4,
    stats: { tiro: 29, control: 48, fisico: 76, defensa: 91, velocidad: 43, aguante: 48 },
    techniques: ['fake-bomber', 'planet-shield'],
    signature: ['fake-bomber', 'planet-shield', 'flame-dance'],
    spirit: 'pegaso',
  },
  {
    id: 'grant-icewater', name: 'Grant Icewater', team: 'gemini-storm', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 25, control: 43, fisico: 73, defensa: 81, velocidad: 35, aguante: 38 },
    techniques: ['shikofumi'],
    signature: ['shikofumi', 'the-wall'],
  },
  {
    id: 'charles-riverboat', name: 'Charles Riverboat', team: 'gemini-storm', position: 'DEF', element: 'fuego', rarity: 3,
    stats: { tiro: 23, control: 42, fisico: 69, defensa: 75, velocidad: 36, aguante: 42 },
    techniques: ['fake-bomber'],
    signature: ['fake-bomber', 'planet-shield'],
  },
  {
    id: 'pat-box', name: 'Pat Box', team: 'gemini-storm', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 40, control: 80, fisico: 40, defensa: 44, velocidad: 46, aguante: 30 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'gregory-saturn', name: 'Gregory Saturn', team: 'gemini-storm', position: 'MED', element: 'montana', rarity: 3,
    stats: { tiro: 41, control: 77, fisico: 42, defensa: 49, velocidad: 48, aguante: 31 },
    techniques: ['dash-accel'],
    signature: ['dash-accel', 'ninin-sankyaku'],
  },
  {
    id: 'izzy-jupiter', name: 'Izzy Jupiter', team: 'gemini-storm', position: 'MED', element: 'fuego', rarity: 3,
    stats: { tiro: 43, control: 81, fisico: 35, defensa: 43, velocidad: 52, aguante: 31 },
    techniques: ['heat-tackle'],
    signature: ['heat-tackle', 'judge-through'],
  },
  {
    id: 'rhona-countdown', name: 'Rhona Countdown', team: 'gemini-storm', position: 'DEL', element: 'bosque', rarity: 3,
    stats: { tiro: 90, control: 59, fisico: 42, defensa: 19, velocidad: 52, aguante: 28 },
    techniques: ['rolling-kick'],
    signature: ['rolling-kick', 'dragon-crash'],
  },
  {
    id: 'jordan-greenway', name: 'Jordan Greenway', team: 'gemini-storm', position: 'MED', element: 'bosque', rarity: 2,
    stats: { tiro: 32, control: 61, fisico: 35, defensa: 35, velocidad: 43, aguante: 30 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'dylan-bluemoon', name: 'Dylan Bluemoon', team: 'gemini-storm', position: 'DEL', element: 'bosque', rarity: 2,
    stats: { tiro: 73, control: 48, fisico: 29, defensa: 23, velocidad: 43, aguante: 25 },
    techniques: ['rolling-kick'],
    signature: ['rolling-kick', 'death-zone'],
  },
  // ============================== EPSILON
  {
    id: 'craven-kenville', name: 'Craven Kenville', team: 'epsilon', position: 'DEF', element: 'fuego', rarity: 5,
    stats: { tiro: 30, control: 53, fisico: 93, defensa: 106, velocidad: 49, aguante: 52 },
    techniques: ['fake-bomber', 'planet-shield'],
    signature: ['fake-bomber', 'planet-shield', 'flame-dance'],
    spirit: 'pegaso',
  },
  {
    id: 'anna-mole', name: 'Anna Mole', team: 'epsilon', position: 'DEF', element: 'bosque', rarity: 4,
    stats: { tiro: 26, control: 45, fisico: 83, defensa: 92, velocidad: 43, aguante: 44 },
    techniques: ['super-scan-df', 'killer-slide'],
    signature: ['super-scan-df', 'killer-slide', 'good-smell'],
    spirit: 'ent',
  },
  {
    id: 'kayson-wattever', name: 'Kayson Wattever', team: 'epsilon', position: 'DEF', element: 'aire', rarity: 4,
    stats: { tiro: 30, control: 42, fisico: 79, defensa: 85, velocidad: 40, aguante: 43 },
    techniques: ['coil-turn', 'the-tower'],
    signature: ['coil-turn', 'the-tower', 'ice-ground'],
    spirit: 'kraken',
  },
  {
    id: 'mike-tytan', name: 'Mike Tytan', team: 'epsilon', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 26, control: 44, fisico: 66, defensa: 80, velocidad: 32, aguante: 45 },
    techniques: ['shikofumi'],
    signature: ['shikofumi', 'the-wall'],
  },
  {
    id: 'mads-hatter', name: 'Mads Hatter', team: 'epsilon', position: 'MED', element: 'fuego', rarity: 3,
    stats: { tiro: 42, control: 73, fisico: 41, defensa: 46, velocidad: 47, aguante: 32 },
    techniques: ['heat-tackle'],
    signature: ['heat-tackle', 'judge-through'],
  },
  {
    id: 'karen-ripton', name: 'Karen Ripton', team: 'epsilon', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 46, control: 79, fisico: 34, defensa: 49, velocidad: 50, aguante: 36 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'yakker-plantsworm', name: 'Yakker Plantsworm', team: 'epsilon', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 39, control: 76, fisico: 33, defensa: 50, velocidad: 48, aguante: 31 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'carrie-mccuring', name: 'Carrie McCuring', team: 'epsilon', position: 'DEL', element: 'aire', rarity: 3,
    stats: { tiro: 84, control: 61, fisico: 36, defensa: 20, velocidad: 53, aguante: 32 },
    techniques: ['god-break'],
    signature: ['god-break', 'eternal-blizzard'],
  },
  {
    id: 'ronny-metcalf', name: 'Ronny Metcalf', team: 'epsilon', position: 'DEL', element: 'aire', rarity: 3,
    stats: { tiro: 86, control: 62, fisico: 44, defensa: 23, velocidad: 45, aguante: 26 },
    techniques: ['god-break'],
    signature: ['god-break', 'eternal-blizzard'],
  },
  // ============================== DIAMOND-DUST
  {
    id: 'ben-north', name: 'Ben North', team: 'diamond-dust', position: 'POR', element: 'montana', rarity: 5,
    stats: { tiro: 32, control: 52, fisico: 67, defensa: 110, velocidad: 45, aguante: 67 },
    techniques: ['god-hand', 'mugen-the-hand'],
    signature: ['god-hand', 'mugen-the-hand', 'majin-the-hand'],
    spirit: 'majin',
  },
  {
    id: 'alan-downhill', name: 'Alan Downhill', team: 'diamond-dust', position: 'DEF', element: 'aire', rarity: 4,
    stats: { tiro: 31, control: 49, fisico: 82, defensa: 89, velocidad: 37, aguante: 45 },
    techniques: ['coil-turn', 'the-tower'],
    signature: ['coil-turn', 'the-tower', 'ice-ground'],
    spirit: 'kraken',
  },
  {
    id: 'claire-lesnow', name: 'Claire Lesnow', team: 'diamond-dust', position: 'DEF', element: 'aire', rarity: 4,
    stats: { tiro: 28, control: 42, fisico: 80, defensa: 92, velocidad: 43, aguante: 50 },
    techniques: ['coil-turn', 'the-tower'],
    signature: ['coil-turn', 'the-tower', 'ice-ground'],
    spirit: 'kraken',
  },
  {
    id: 'albert-denver', name: 'Albert Denver', team: 'diamond-dust', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 23, control: 39, fisico: 64, defensa: 73, velocidad: 35, aguante: 36 },
    techniques: ['shikofumi'],
    signature: ['shikofumi', 'the-wall'],
  },
  {
    id: 'lucy-hailstone', name: 'Lucy Hailstone', team: 'diamond-dust', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 43, control: 81, fisico: 36, defensa: 43, velocidad: 53, aguante: 34 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'brad-coldwater', name: 'Brad Coldwater', team: 'diamond-dust', position: 'MED', element: 'montana', rarity: 3,
    stats: { tiro: 41, control: 79, fisico: 33, defensa: 43, velocidad: 47, aguante: 32 },
    techniques: ['dash-accel'],
    signature: ['dash-accel', 'ninin-sankyaku'],
  },
  {
    id: 'dawson-foxx', name: 'Dawson Foxx', team: 'diamond-dust', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 45, control: 82, fisico: 40, defensa: 44, velocidad: 49, aguante: 34 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'ving-rice', name: 'Ving Rice', team: 'diamond-dust', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 45, control: 80, fisico: 35, defensa: 48, velocidad: 50, aguante: 37 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'bernie-white', name: 'Bernie White', team: 'diamond-dust', position: 'DEL', element: 'aire', rarity: 3,
    stats: { tiro: 90, control: 63, fisico: 44, defensa: 24, velocidad: 47, aguante: 29 },
    techniques: ['god-break'],
    signature: ['god-break', 'eternal-blizzard'],
  },
  {
    id: 'bryce-whitingale', name: 'Bryce Whitingale', team: 'diamond-dust', position: 'DEL', element: 'aire', rarity: 2,
    stats: { tiro: 73, control: 46, fisico: 32, defensa: 22, velocidad: 39, aguante: 22 },
    techniques: ['god-break'],
    signature: ['god-break', 'tri-pegasus'],
  },
  {
    id: 'denzel-freezer', name: 'Denzel Freezer', team: 'diamond-dust', position: 'DEL', element: 'montana', rarity: 2,
    stats: { tiro: 73, control: 55, fisico: 29, defensa: 18, velocidad: 39, aguante: 24 },
    techniques: ['tarzan-kick'],
    signature: ['tarzan-kick', 'megane-crash'],
  },
  // ============================== PROMINENCE
  {
    id: 'grant-cook', name: 'Grant Cook', team: 'prominence', position: 'POR', element: 'fuego', rarity: 5,
    stats: { tiro: 32, control: 54, fisico: 67, defensa: 110, velocidad: 49, aguante: 63 },
    techniques: ['nekketsu-punch', 'pressure-punch'],
    signature: ['nekketsu-punch', 'pressure-punch', 'full-power-shield'],
    spirit: 'pegaso',
  },
  {
    id: 'bonnie-sparks', name: 'Bonnie Sparks', team: 'prominence', position: 'DEF', element: 'bosque', rarity: 4,
    stats: { tiro: 31, control: 47, fisico: 76, defensa: 87, velocidad: 35, aguante: 44 },
    techniques: ['super-scan-df', 'killer-slide'],
    signature: ['super-scan-df', 'killer-slide', 'good-smell'],
    spirit: 'ent',
  },
  {
    id: 'val-flamewood', name: 'Val Flamewood', team: 'prominence', position: 'DEF', element: 'fuego', rarity: 4,
    stats: { tiro: 30, control: 47, fisico: 82, defensa: 92, velocidad: 41, aguante: 42 },
    techniques: ['fake-bomber', 'planet-shield'],
    signature: ['fake-bomber', 'planet-shield', 'flame-dance'],
    spirit: 'pegaso',
  },
  {
    id: 'sean-ashford', name: 'Sean Ashford', team: 'prominence', position: 'DEF', element: 'bosque', rarity: 3,
    stats: { tiro: 25, control: 39, fisico: 69, defensa: 81, velocidad: 36, aguante: 44 },
    techniques: ['super-scan-df'],
    signature: ['super-scan-df', 'killer-slide'],
  },
  {
    id: 'ben-blowton', name: 'Ben Blowton', team: 'prominence', position: 'MED', element: 'fuego', rarity: 3,
    stats: { tiro: 45, control: 75, fisico: 33, defensa: 46, velocidad: 53, aguante: 35 },
    techniques: ['heat-tackle'],
    signature: ['heat-tackle', 'judge-through'],
  },
  {
    id: 'ethan-whitering', name: 'Ethan Whitering', team: 'prominence', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 39, control: 80, fisico: 37, defensa: 50, velocidad: 52, aguante: 36 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'brenda-firequest', name: 'Brenda Firequest', team: 'prominence', position: 'MED', element: 'fuego', rarity: 3,
    stats: { tiro: 45, control: 75, fisico: 39, defensa: 47, velocidad: 52, aguante: 33 },
    techniques: ['heat-tackle'],
    signature: ['heat-tackle', 'judge-through'],
  },
  {
    id: 'sam-bournes', name: 'Sam Bournes', team: 'prominence', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 48, control: 73, fisico: 39, defensa: 45, velocidad: 53, aguante: 37 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'jim-flareson', name: 'Jim Flareson', team: 'prominence', position: 'DEL', element: 'fuego', rarity: 3,
    stats: { tiro: 85, control: 59, fisico: 44, defensa: 27, velocidad: 47, aguante: 31 },
    techniques: ['dragon-tornado'],
    signature: ['dragon-tornado', 'fire-tornado'],
  },
  {
    id: 'claude-beacons', name: 'Claude Beacons', team: 'prominence', position: 'DEL', element: 'fuego', rarity: 2,
    stats: { tiro: 74, control: 52, fisico: 32, defensa: 18, velocidad: 38, aguante: 28 },
    techniques: ['dragon-tornado'],
    signature: ['dragon-tornado', 'the-phoenix'],
  },
  {
    id: 'nigel-august', name: 'Nigel August', team: 'prominence', position: 'DEL', element: 'bosque', rarity: 2,
    stats: { tiro: 74, control: 48, fisico: 35, defensa: 19, velocidad: 40, aguante: 20 },
    techniques: ['rolling-kick'],
    signature: ['rolling-kick', 'death-zone'],
  },
  // ============================== GENESIS
  {
    id: 'nelson-rockwell', name: 'Nelson Rockwell', team: 'genesis', position: 'POR', element: 'aire', rarity: 5,
    stats: { tiro: 38, control: 45, fisico: 66, defensa: 110, velocidad: 51, aguante: 65 },
    techniques: ['tornado-catch', 'kogarashi'],
    signature: ['tornado-catch', 'kogarashi', 'hanafubuki'],
    spirit: 'kraken',
  },
  {
    id: 'gail-baker', name: 'Gail Baker', team: 'genesis', position: 'DEF', element: 'aire', rarity: 4,
    stats: { tiro: 30, control: 43, fisico: 77, defensa: 92, velocidad: 41, aguante: 51 },
    techniques: ['coil-turn', 'the-tower'],
    signature: ['coil-turn', 'the-tower', 'ice-ground'],
    spirit: 'kraken',
  },
  {
    id: 'kim-powell', name: 'Kim Powell', team: 'genesis', position: 'DEF', element: 'fuego', rarity: 4,
    stats: { tiro: 34, control: 49, fisico: 76, defensa: 93, velocidad: 37, aguante: 44 },
    techniques: ['fake-bomber', 'planet-shield'],
    signature: ['fake-bomber', 'planet-shield', 'flame-dance'],
    spirit: 'pegaso',
  },
  {
    id: 'zack-cummings', name: 'Zack Cummings', team: 'genesis', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 30, control: 43, fisico: 66, defensa: 81, velocidad: 37, aguante: 41 },
    techniques: ['shikofumi'],
    signature: ['shikofumi', 'the-wall'],
  },
  {
    id: 'hunt-mercer', name: 'Hunt Mercer', team: 'genesis', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 24, control: 44, fisico: 70, defensa: 78, velocidad: 34, aguante: 40 },
    techniques: ['shikofumi'],
    signature: ['shikofumi', 'the-wall'],
  },
  {
    id: 'connor-murray', name: 'Connor Murray', team: 'genesis', position: 'MED', element: 'fuego', rarity: 3,
    stats: { tiro: 46, control: 76, fisico: 36, defensa: 44, velocidad: 46, aguante: 32 },
    techniques: ['heat-tackle'],
    signature: ['heat-tackle', 'judge-through'],
  },
  {
    id: 'katie-brown', name: 'Katie Brown', team: 'genesis', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 41, control: 81, fisico: 41, defensa: 41, velocidad: 45, aguante: 32 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'ashton-malone', name: 'Ashton Malone', team: 'genesis', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 42, control: 76, fisico: 35, defensa: 41, velocidad: 53, aguante: 35 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'wilbur-watkins', name: 'Wilbur Watkins', team: 'genesis', position: 'DEL', element: 'bosque', rarity: 3,
    stats: { tiro: 83, control: 56, fisico: 37, defensa: 26, velocidad: 53, aguante: 25 },
    techniques: ['rolling-kick'],
    signature: ['rolling-kick', 'dragon-crash'],
  },
  {
    id: 'isabelle-trick', name: 'Isabelle Trick', team: 'genesis', position: 'MED', element: 'aire', rarity: 2,
    stats: { tiro: 35, control: 61, fisico: 30, defensa: 34, velocidad: 46, aguante: 31 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  // ============================== CHAOS
  {
    id: 'grant-cook-2', name: 'Grant Cook', team: 'chaos', position: 'POR', element: 'fuego', rarity: 5,
    stats: { tiro: 36, control: 45, fisico: 68, defensa: 111, velocidad: 48, aguante: 72 },
    techniques: ['nekketsu-punch', 'pressure-punch'],
    signature: ['nekketsu-punch', 'pressure-punch', 'full-power-shield'],
    spirit: 'pegaso',
  },
  {
    id: 'bonnie-sparks-2', name: 'Bonnie Sparks', team: 'chaos', position: 'DEF', element: 'bosque', rarity: 4,
    stats: { tiro: 32, control: 43, fisico: 75, defensa: 87, velocidad: 43, aguante: 47 },
    techniques: ['super-scan-df', 'killer-slide'],
    signature: ['super-scan-df', 'killer-slide', 'good-smell'],
    spirit: 'ent',
  },
  {
    id: 'claire-lesnow-2', name: 'Claire Lesnow', team: 'chaos', position: 'DEF', element: 'aire', rarity: 4,
    stats: { tiro: 32, control: 44, fisico: 77, defensa: 88, velocidad: 44, aguante: 44 },
    techniques: ['coil-turn', 'the-tower'],
    signature: ['coil-turn', 'the-tower', 'ice-ground'],
    spirit: 'kraken',
  },
  {
    id: 'albert-denver-2', name: 'Albert Denver', team: 'chaos', position: 'DEF', element: 'montana', rarity: 3,
    stats: { tiro: 29, control: 42, fisico: 65, defensa: 77, velocidad: 37, aguante: 36 },
    techniques: ['shikofumi'],
    signature: ['shikofumi', 'the-wall'],
  },
  {
    id: 'ben-blowton-2', name: 'Ben Blowton', team: 'chaos', position: 'MED', element: 'fuego', rarity: 3,
    stats: { tiro: 42, control: 75, fisico: 35, defensa: 46, velocidad: 47, aguante: 32 },
    techniques: ['heat-tackle'],
    signature: ['heat-tackle', 'judge-through'],
  },
  {
    id: 'ethan-whitering-2', name: 'Ethan Whitering', team: 'chaos', position: 'MED', element: 'bosque', rarity: 3,
    stats: { tiro: 40, control: 78, fisico: 36, defensa: 50, velocidad: 45, aguante: 37 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
  {
    id: 'dawson-foxx-2', name: 'Dawson Foxx', team: 'chaos', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 39, control: 77, fisico: 35, defensa: 45, velocidad: 45, aguante: 31 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'ving-rice-2', name: 'Ving Rice', team: 'chaos', position: 'MED', element: 'aire', rarity: 3,
    stats: { tiro: 39, control: 76, fisico: 39, defensa: 46, velocidad: 51, aguante: 31 },
    techniques: ['tatsumaki-senpuu'],
    signature: ['tatsumaki-senpuu', 'moonsault'],
  },
  {
    id: 'bryce-whitingale-2', name: 'Bryce Whitingale', team: 'chaos', position: 'DEL', element: 'aire', rarity: 3,
    stats: { tiro: 87, control: 62, fisico: 44, defensa: 22, velocidad: 50, aguante: 26 },
    techniques: ['god-break'],
    signature: ['god-break', 'eternal-blizzard'],
  },
  {
    id: 'claude-beacons-2', name: 'Claude Beacons', team: 'chaos', position: 'DEL', element: 'fuego', rarity: 2,
    stats: { tiro: 68, control: 47, fisico: 37, defensa: 20, velocidad: 44, aguante: 22 },
    techniques: ['dragon-tornado'],
    signature: ['dragon-tornado', 'the-phoenix'],
  },
  {
    id: 'nigel-august-2', name: 'Nigel August', team: 'chaos', position: 'DEL', element: 'bosque', rarity: 2,
    stats: { tiro: 71, control: 46, fisico: 30, defensa: 18, velocidad: 45, aguante: 23 },
    techniques: ['rolling-kick'],
    signature: ['rolling-kick', 'death-zone'],
  },
  {
    id: 'ben-north-2', name: 'Ben North', team: 'chaos', position: 'POR', element: 'montana', rarity: 2,
    stats: { tiro: 24, control: 36, fisico: 40, defensa: 69, velocidad: 31, aguante: 40 },
    techniques: ['god-hand'],
    signature: ['god-hand', 'mugen-the-hand'],
  },
  {
    id: 'brenda-firequest-2', name: 'Brenda Firequest', team: 'chaos', position: 'MED', element: 'fuego', rarity: 2,
    stats: { tiro: 35, control: 61, fisico: 33, defensa: 37, velocidad: 43, aguante: 29 },
    techniques: ['heat-tackle'],
    signature: ['heat-tackle', 'judge-through'],
  },
  {
    id: 'sam-bournes-2', name: 'Sam Bournes', team: 'chaos', position: 'MED', element: 'bosque', rarity: 2,
    stats: { tiro: 39, control: 64, fisico: 29, defensa: 34, velocidad: 43, aguante: 33 },
    techniques: ['super-scan-of'],
    signature: ['super-scan-of', 'illusion-ball'],
  },
]

/** Institutos del torneo; el resto de equipos son SOLO fichables. */
const BRACKET_TEAMS = new Set(['raimon', 'occult', 'otaku', 'wild', 'shuriken', 'farm', 'kirkwood', 'royal', 'zeus'])

/** Equipos extra (temporada 2 y Alius): su gente entra por el ojeador. */
export const EXTRA_TEAMS: string[] = [...new Set(PLAYERS.map((p) => p.team))].filter((t) => !BRACKET_TEAMS.has(t))

/** Nombre visible de los equipos extra (no están en `teams.ts`). */
export const TEAM_NAMES: Record<string, string> = {
  kfc: 'Inazuma KFC',
  oumihara: 'Instituto Oumihara',
  mikage: 'Mikage Sennou',
  manyuuji: 'Instituto Manyuuji',
  yokato: 'Instituto Yokato',
  'gemini-storm': 'Tormenta Géminis',
  epsilon: 'Épsilon',
  'diamond-dust': 'Diamond Dust',
  prominence: 'Prominence',
  genesis: 'Génesis',
  chaos: 'Caos',
}

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
