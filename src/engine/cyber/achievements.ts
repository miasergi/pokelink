// Logros del modo Cyber PokéBall. Este modo no pasa por recordRunEnd, así que
// la comprobación se hace desde el embudo de meta del cyberStore
// (persistCyberMeta). Mismo contrato que checkAchievements: devuelve SOLO los
// ids nuevos (no presentes ya en meta.achievements).
import type { MetaRecord } from '@/persistence/db'

export function checkCyberAchievements(meta: MetaRecord): string[] {
  const out: string[] = []
  const has = (id: string) => meta.achievements.includes(id)
  if (!has('cyber_champion') && (meta.cyberCompleted ?? []).length > 0) out.push('cyber_champion')
  if (!has('cyber_dex50') && (meta.cyberDexCaught ?? []).length >= 50) out.push('cyber_dex50')
  if (!has('cyber_online') && ((meta.cyberTrades ?? 0) > 0 || (meta.cyberGhostWins ?? 0) > 0)) out.push('cyber_online')
  return out
}
