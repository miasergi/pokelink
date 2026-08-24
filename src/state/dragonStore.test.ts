// @vitest-environment jsdom
// Prueba del BUCLE REAL que juega una persona, a través del store: empezar,
// elegir casilla, pelear, cobrar y volver al mapa. El motor ya tiene sus tests;
// esto cubre el pegamento, que es donde se rompen las cosas de verdad.
import { beforeEach, describe, expect, it } from 'vitest'
import { BOSS_LAYER, layerNodes, recruit, TEAM_MAX } from '@/engine/dragon/run'
import { advance, ally, foe } from '@/engine/dragon/battle'
import { afterOutcome, useDragon } from './dragonStore'

/**
 * Juega el combate en curso hasta que termine. Como el motor solo para en los
 * momentos clave, el bot únicamente tiene que responder a las decisiones; el
 * ticker de la UI no corre en los tests, así que se avanza a mano.
 */
function resolveBattle(): void {
  const st = () => useDragon.getState()
  let guard = 0
  while (st().battle && !st().battle!.over && guard++ < 600) {
    const b = st().battle!
    if (b.phase !== 'decision') { advance(b); continue }
    const d = b.decision!
    // Lo más simple que siempre existe: el cuerpo a cuerpo, o la primera opción.
    const golpe = d.options.find((o) => o.id === 'golpe') ?? d.options[0]
    st().decide(golpe.id)
  }
  expect(guard).toBeLessThan(600)
}

describe('store de Dragon Ball', () => {
  beforeEach(async () => {
    await useDragon.getState().abandonRun()
  })

  it('empieza una aventura con Goku y el compañero elegido', async () => {
    await useDragon.getState().newRun('piccolo')
    const { save, phase } = useDragon.getState()
    expect(phase).toBe('intro')
    expect(save?.team.map((f) => f.baseId)).toEqual(['goku', 'piccolo'])
    expect(save?.saga).toBe(0)
    expect(save?.layer).toBe(0)
  })

  it('se puede jugar una casilla de combate de principio a fin', async () => {
    const st = () => useDragon.getState()
    await st().newRun('piccolo')
    st().goTo('map')

    const combate = layerNodes(st().save!).find((n) => n.kind === 'combate' || n.kind === 'elite')
    expect(combate, 'toda capa tiene que ofrecer al menos un combate').toBeDefined()

    st().pickNode(combate!.id)
    expect(st().phase).toBe('node')
    st().confirmNode()
    expect(st().phase).toBe('battle')
    expect(st().battle).not.toBeNull()
    expect(st().revealed, 'la retransmisión empieza sin contar nada').toBe(0)
    // El combate arranca con los dos bandos en pie y esperando tu decisión.
    expect(ally(st().battle!).hp).toBeGreaterThan(0)
    expect(foe(st().battle!).hp).toBeGreaterThan(0)

    const nivelAntes = st().save!.team[0].level
    resolveBattle()
    st().finishBattle()
    expect(st().phase).toBe('outcome')
    const outcome = st().outcome!
    expect(outcome).not.toBeNull()

    afterOutcome()
    if (outcome.win) {
      // Ganar sube de nivel a TODO el equipo y devuelve al mapa, una capa más allá.
      expect(st().save!.team[0].level).toBeGreaterThan(nivelAntes)
      expect(st().save!.zeni).toBeGreaterThan(800)
      expect(['map', 'wish']).toContain(st().phase)
      expect(st().save!.layer).toBe(1)
    } else {
      expect(st().phase).toBe('gameover')
    }
  })

  it('la tienda cobra, guarda lo comprado y al salir consume la casilla', async () => {
    const st = () => useDragon.getState()
    await st().newRun('krilin')
    st().goTo('map')
    const save = st().save!
    // Se fuerza una tienda: el mapa no siempre ofrece una en la primera capa.
    save.map[0].kind = 'tienda'
    save.map[0].label = 'Tienda'
    st().pickNode(save.map[0].id)
    st().confirmNode()
    expect(st().phase).toBe('shop')

    const zeni = st().save!.zeni
    st().buy('elixir')
    expect(st().save!.zeni).toBeLessThan(zeni)
    expect(st().save!.bag.elixir).toBe(1)

    st().leaveShop()
    expect(st().phase).toBe('map')
    // Salir avanza el mapa: no se puede entrar y salir para comprar sin coste.
    expect(st().save!.layer).toBe(1)
  })

  it('ir al equipo desde la tienda y volver NO regala la casilla', async () => {
    const st = () => useDragon.getState()
    await st().newRun('krilin')
    st().goTo('map')
    const save = st().save!
    save.map[0].kind = 'tienda'
    st().pickNode(save.map[0].id)
    st().confirmNode()
    expect(st().phase).toBe('shop')

    // Este era el agujero: Equipo → volver te devolvía al mapa con el nodo sin
    // consumir, así que comprabas gratis y elegías otra casilla de la capa.
    st().openTeam()
    expect(st().phase).toBe('team')
    st().closeTeam()
    expect(st().phase).toBe('shop')
    expect(st().save!.layer).toBe(0)

    st().leaveShop()
    expect(st().phase).toBe('map')
    expect(st().save!.layer).toBe(1)
  })

  it('equipar y quitar un objeto lo devuelve a la bolsa, sin perderlo', async () => {
    const st = () => useDragon.getState()
    await st().newRun('krilin')
    st().save!.bag.guantes = 1
    const uid = st().save!.team[0].uid

    st().equip(uid, 'guantes')
    expect(st().save!.team[0].item).toBe('guantes')
    expect(st().save!.bag.guantes).toBeUndefined()

    st().equip(uid, undefined)
    expect(st().save!.team[0].item).toBeUndefined()
    expect(st().save!.bag.guantes).toBe(1)
  })

  it('reclutar con el equipo lleno ofrece sustituir, y no se come la casilla', async () => {
    const st = () => useDragon.getState()
    await st().newRun('krilin')
    st().goTo('map')
    const save = st().save!
    // Equipo al completo y una casilla de aliado delante.
    recruit(save, 'ten')
    recruit(save, 'yamcha')
    expect(save.team.length).toBe(TEAM_MAX)
    const nodo = save.map.find((n) => n.layer === 0)!
    nodo.kind = 'reclutar'
    nodo.recruit = 'piccolo'

    st().pickNode(nodo.id)
    st().confirmNode()
    // NO avanza el mapa: se queda esperando a que decidas.
    expect(st().pendingRecruit?.baseId).toBe('piccolo')
    expect(st().save!.layer).toBe(0)

    const sale = st().save!.team[3]
    st().resolveRecruit(sale.uid)
    expect(st().pendingRecruit).toBeNull()
    expect(st().save!.team.map((f) => f.baseId)).toContain('piccolo')
    expect(st().save!.team.map((f) => f.uid)).not.toContain(sale.uid)
    expect(st().save!.team.length).toBe(TEAM_MAX)
    expect(st().save!.layer, 'la casilla se resuelve y el mapa avanza').toBe(1)
  })

  it('y se puede rechazar al que se ofrece', async () => {
    const st = () => useDragon.getState()
    await st().newRun('krilin')
    st().goTo('map')
    const save = st().save!
    recruit(save, 'ten')
    recruit(save, 'yamcha')
    const antes = save.team.map((f) => f.uid)
    const nodo = save.map.find((n) => n.layer === 0)!
    nodo.kind = 'reclutar'
    nodo.recruit = 'piccolo'
    st().pickNode(nodo.id)
    st().confirmNode()
    st().resolveRecruit(null)
    expect(st().save!.team.map((f) => f.uid)).toEqual(antes)
    expect(st().save!.layer).toBe(1)
  })

  it('las siete bolas abren la pantalla de deseo y el deseo se cumple', async () => {
    const st = () => useDragon.getState()
    await st().newRun('krilin')
    st().goTo('map')
    const save = st().save!
    save.balls = 6
    save.map[0].kind = 'bola'
    save.map[0].label = 'Bola de Dragón'
    st().pickNode(save.map[0].id)
    st().confirmNode()
    expect(st().save!.balls).toBe(7)
    expect(st().phase).toBe('wish')

    st().wish('zeni')
    expect(st().save!.zeni).toBeGreaterThan(8000)
    expect(st().save!.balls).toBe(0)
    expect(st().phase).toBe('map')
  })

  it('el equipo llega curado al jefe: el clímax no lo decide el desgaste', async () => {
    const st = () => useDragon.getState()
    await st().newRun('piccolo')
    const save = st().save!
    save.layer = BOSS_LAYER - 1
    save.team.forEach((f) => { f.hp = 5 })
    // Avanzar a la capa del jefe es lo que dispara la curación.
    save.map.filter((n) => n.layer === save.layer).forEach((n) => { n.kind = 'bola' })
    st().pickNode(save.map.find((n) => n.layer === save.layer)!.id)
    st().confirmNode()
    expect(st().save!.layer).toBe(BOSS_LAYER)
    for (const f of st().save!.team) expect(f.hp).toBeGreaterThan(5)
  })
})
