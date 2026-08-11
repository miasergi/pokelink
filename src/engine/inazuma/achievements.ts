// Logros de Inazuma Rogue. El modo no pasa por `recordRunEnd`, así que la
// comprobación se hace desde su propio embudo de meta (`persistInazumaMeta`),
// con el mismo contrato que el resto: devuelve SOLO los ids nuevos.
import type { MetaRecord } from '@/persistence/db'

export function checkInazumaAchievements(meta: MetaRecord): string[] {
  const out: string[] = []
  const has = (id: string) => meta.achievements.includes(id)
  const signed = (meta.inazumaSigned ?? []).length

  if (!has('inazuma_first') && (meta.inazumaBestRound ?? 0) >= 1) out.push('inazuma_first')
  if (!has('inazuma_title') && (meta.inazumaTitles ?? 0) > 0) out.push('inazuma_title')
  if (!has('inazuma_squad') && signed >= 20) out.push('inazuma_squad')
  if (!has('inazuma_legends') && signed >= 40) out.push('inazuma_legends')
  return out
}
