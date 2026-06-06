/** Comparte texto con la Web Share API; si no, copia al portapapeles. */
export async function shareText(text: string, title = 'PokéRogue'): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({ title, text })
      return 'shared'
    }
  } catch {
    /* el usuario canceló o falló; intentamos copiar */
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

const APP_URL = 'https://miasergi.github.io/pokelink/'

/** Texto compartible de una run ganada. */
export function buildShareText(opts: { region: string; difficulty: string; durationMs: number; team: { name: string; level: number }[] }): string {
  const mm = Math.floor(opts.durationMs / 60000)
  const ss = Math.floor((opts.durationMs % 60000) / 1000).toString().padStart(2, '0')
  const diff = opts.difficulty === 'hard' ? 'Difícil' : opts.difficulty === 'nuzlocke' ? 'Nuzlocke' : 'Normal'
  const team = opts.team.map((m) => `${m.name} Nv.${m.level}`).join(', ')
  return `🏆 ¡Campeón de ${opts.region} en PokéRogue!\n⏱️ ${mm}:${ss} · ${diff}\n🎮 Equipo: ${team}\n\n¿Puedes superarme? ${APP_URL}`
}
