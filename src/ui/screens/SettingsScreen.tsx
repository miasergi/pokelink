import { useState } from 'react'
import { useGame } from '@/state/gameStore'
import { useSettings, type BattleSpeed } from '@/state/settingsStore'
import { Button, Card, TopBar } from '@/ui/components/kit'
import { exportData, importData } from '@/persistence/db'

export default function SettingsScreen() {
  const { back, run, abandonRun, init, navigate, cloudUser } = useGame()
  const s = useSettings()
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Ajustes" left={<Button variant="ghost" onClick={back}>‹</Button>} />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
        <Card className="p-4 flex items-center justify-between active:scale-[0.99] transition" onClick={() => navigate('account')}>
          <div>
            <div className="font-bold">☁️ Cuenta</div>
            <div className="text-xs text-slate-400">{cloudUser ? cloudUser.email : 'Inicia sesión para guardar tu progreso en la nube'}</div>
          </div>
          <span className="text-slate-500 text-2xl">›</span>
        </Card>

        <Card className="p-4">
          <div className="font-bold mb-2">Velocidad de combate por defecto</div>
          <div className="flex gap-2">
            {([1, 2, 4] as BattleSpeed[]).map((v) => (
              <button
                key={v}
                onClick={() => s.setBattleSpeed(v)}
                className={`flex-1 py-2.5 rounded-xl font-bold ${s.battleSpeed === v ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                {v}×
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="font-bold">Sonido y vibración</div>
            <div className="text-xs text-slate-400">Efectos de combate y feedback táctil</div>
          </div>
          <Toggle on={s.sound} onClick={s.toggleSound} />
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="font-bold">Música de fondo</div>
            <div className="text-xs text-slate-400">Melodía ligera en mapa y combates</div>
          </div>
          <Toggle on={s.music} onClick={() => { s.toggleMusic(); void import('@/utils/music').then((m) => m.syncMusicSetting(run ? 'map' : null)) }} />
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="font-bold">Omitir pantalla informativa</div>
            <div className="text-xs text-slate-400">Al tocar una casilla accesible, entra directo (sin ver la info antes)</div>
          </div>
          <Toggle on={s.skipNodeInfo} onClick={s.toggleSkipNodeInfo} />
        </Card>

        {/* Copia de seguridad (export/import) */}
        <Card className="p-4">
          <div className="font-bold">Copia de seguridad</div>
          <div className="text-xs text-slate-400 mb-2">Guarda tu progreso o llévalo a otro dispositivo con un código.</div>
          <div className="flex gap-2 mb-2">
            <Button variant="secondary" className="flex-1 !py-2" onClick={async () => {
              const c = await exportData()
              setCode(c)
              try { await navigator.clipboard.writeText(c); setMsg('📋 Código copiado al portapapeles') } catch { setMsg('Código generado abajo (cópialo)') }
            }}>Exportar</Button>
            <Button variant="primary" className="flex-1 !py-2" onClick={async () => {
              if (!code.trim()) { setMsg('Pega un código primero'); return }
              const ok = await importData(code)
              if (ok) { await init(); setMsg('✅ Datos importados. Reinicia para verlo todo.') }
              else setMsg('❌ Código no válido')
            }}>Importar</Button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Pega aquí tu código de copia de seguridad…"
            className="w-full h-20 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-[10px] outline-none focus:border-red-400 resize-none break-all"
          />
          {msg && <div className="text-xs text-emerald-300 mt-1">{msg}</div>}
          <div className="text-[10px] text-slate-500 mt-1">Las cuentas en la nube con sincronización automática necesitan un servidor (futuro).</div>
        </Card>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="font-bold">Repetir tutorial</div>
            <div className="text-xs text-slate-400">Vuelve a mostrar la introducción</div>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              try { localStorage.removeItem('pokerogue:onboarded') } catch { /* */ }
              location.reload()
            }}
          >
            Ver
          </Button>
        </Card>

        <div className="text-xs text-slate-500 text-center mt-2">
          PokéRogue · v0.2 — uso personal
        </div>

        {run && (
          <Card className="p-4">
            <div className="font-bold text-rose-300 mb-1">Zona de peligro</div>
            <p className="text-xs text-slate-400 mb-2">Abandonar la run actual la dará por perdida.</p>
            <Button full variant="danger" onClick={() => void abandonRun()}>
              Abandonar run
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-12 h-7 rounded-full transition relative ${on ? 'bg-emerald-500' : 'bg-slate-600'}`}
    >
      <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all ${on ? 'left-[1.625rem]' : 'left-0.5'}`} />
    </button>
  )
}
