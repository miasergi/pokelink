// Logros de Dragon Ball Rogue. El modo no pasa por `recordRunEnd`, así que la
// comprobación se hace desde su propio embudo de meta (`persistDragonMeta`),
// con el mismo contrato que el resto: devuelve SOLO los ids nuevos.
import type { MetaRecord } from '@/persistence/db'

export function checkDragonAchievements(meta: MetaRecord): string[] {
  const out: string[] = []
  const has = (id: string) => meta.achievements.includes(id)
  const sagas = (meta.dragonSagasCleared ?? []).length
  const forms = meta.dragonForms ?? []

  if (!has('dragon_first') && sagas >= 1) out.push('dragon_first')
  if (!has('dragon_freezer') && sagas >= 2) out.push('dragon_freezer')
  if (!has('dragon_win') && (meta.dragonWins ?? 0) >= 1) out.push('dragon_win')
  if (!has('dragon_balls') && (meta.dragonBalls ?? 0) >= 7) out.push('dragon_balls')
  // El despertar del Superguerrero: el momento que da nombre a todo el arco.
  if (!has('dragon_ssj') && forms.some((f) => f.includes('Superguerrero'))) out.push('dragon_ssj')
  return out
}
