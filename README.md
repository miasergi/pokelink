# PokéRogue — Pokémon Roguelike (PWA)

Roguelike *autobattler* inspirado en [pokelike.xyz](https://pokelike.xyz/), con una UX muy mejorada y **mobile-first**. Eliges un inicial, avanzas por un mapa ramificado (estilo Slay the Spire), construyes tu equipo (capturas, objetos, evoluciones) y te enfrentas a los **8 líderes de gimnasio, el rival, el Alto Mando y el Campeón** reales de la región.

- **Modos:** *Por generación* (solo Pokémon y entrenadores de esa región) y *Todos los Pokémon* (todo el dex nacional).
- **Combate:** autobattler — se resuelve solo según tipos/stats/movimientos, con log animado y control de velocidad (1×/2×/4×). La estrategia está en el draft y el pathing.
- **Datos:** "BD interna" generada desde [PokeAPI](https://pokeapi.co/) (1025 Pokémon, 937 movimientos) y empaquetada en `src/data/generated/`. Sin red en runtime.
- **Persistencia:** IndexedDB (run activa, reanudable) + localStorage (ajustes). Sin backend todavía.
- **PWA:** instalable y offline (sprites de PokeAPI cacheados por el service worker).

## Estado

✅ **Slice completo de Gen 1 (Kanto)** jugable de principio a fin + modo "todos los Pokémon".
🔜 Gen 2–9: añadir rosters en `src/data/trainers/genN.ts` y activar `rostersReady` en `src/data/generations.ts`.

## Comandos

```bash
npm install
npm run dev          # servidor de desarrollo
npm run build        # build de producción (PWA)
npm run preview      # previsualizar el build
npm test             # tests (motor de combate, mapa, balance, render)
npm run build-data   # regenerar la BD desde PokeAPI (cachea en scripts/.cache)
```

## Arquitectura

```
src/
  data/            BD generada + tabla de tipos, objetos, iniciales, rosters por gen
  engine/
    battle/        motor de combate autobattler (daño, IA, estados) -> log de eventos
    team/          instancias, niveles/XP, evoluciones
    run/           generación de mapa, nodos, motor de run
  state/           stores Zustand (run, ajustes) con autoguardado
  persistence/     wrapper IndexedDB
  ui/              pantallas y componentes (mobile-first)
```

### Notas de diseño (balance)

Para que sea un autobattler justo y sin grindeo (la estrategia es la composición de equipo, no farmear):

- **Suelo de nivel por zona:** tu equipo nunca va muy por debajo del área; ante un jefe iguala su nivel (tu ventaja es el nº de Pokémon y la cobertura de tipos). Ver `enforceMinLevel` en `runEngine.ts`.
- **Curación antes de cada jefe:** llegas "preparado" al gimnasio; el combate de jefe va de composición, no de desgaste.
- **Permadeath:** perder un combate normal no acaba la run (tu equipo queda debilitado y debes curarte); **perder ante un jefe = fin de la partida**.
- Combates deterministas con RNG con semilla.
