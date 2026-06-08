import { useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button, Card, TopBar } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { cloudEnabled } from '@/persistence/supabase'

export default function AccountScreen() {
  const { back, cloudUser, cloudBusy, cloudMsg, cloudAuth, cloudLogout, cloudSync, alias, setAlias } = useGame()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [aliasInput, setAliasInput] = useState(alias)
  const enabled = cloudEnabled()

  return (
    <div className="flex flex-col flex-1">
      <TopBar title="Cuenta" left={<Button variant="ghost" onClick={back}>‹</Button>} />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar">
        {!enabled ? (
          <Card className="p-4 text-sm text-slate-300">
            <div className="font-bold mb-1">La nube no está configurada</div>
            <p className="text-slate-400 text-xs">
              El juego funciona en local en este dispositivo. Para activar cuentas en la nube
              (progreso sincronizado entre dispositivos), hay que configurar Supabase. Mientras
              tanto, usa la <b>copia de seguridad</b> de Ajustes para mover tu progreso.
            </p>
          </Card>
        ) : cloudUser ? (
          <Card className="p-4 flex flex-col gap-3">
            <div>
              <div className="text-xs text-slate-400">Sesión iniciada como</div>
              <div className="font-bold">{cloudUser.email}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Tu alias en el ranking</div>
              <div className="flex gap-2">
                <input value={aliasInput} onChange={(e) => setAliasInput(e.target.value)} maxLength={20} placeholder="Tu nombre de jugador"
                  className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-red-400" />
                <Button variant="secondary" disabled={aliasInput.trim() === alias} onClick={() => void setAlias(aliasInput)}>Guardar</Button>
              </div>
            </div>
            <p className="text-xs text-slate-400">Tu historial (récords, Pokédex, Glory Runs) se guarda en la nube y se sincroniza al terminar cada partida.</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" disabled={cloudBusy} onClick={() => void cloudSync()}>
                {cloudBusy ? 'Sincronizando…' : <span className="inline-flex items-center justify-center gap-1.5"><Icon name="refresh" className="w-4 h-4" /> Sincronizar ahora</span>}
              </Button>
              <Button variant="danger" className="flex-1" onClick={cloudLogout}>Cerrar sesión</Button>
            </div>
            {cloudMsg && <div className="text-xs text-emerald-300">{cloudMsg}</div>}
          </Card>
        ) : (
          <Card className="p-4 flex flex-col gap-3">
            <div className="flex gap-2">
              <button onClick={() => setMode('in')} className={`flex-1 py-2 rounded-xl font-bold text-sm ${mode === 'in' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'}`}>Iniciar sesión</button>
              <button onClick={() => setMode('up')} className={`flex-1 py-2 rounded-xl font-bold text-sm ${mode === 'up' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'}`}>Crear cuenta</button>
            </div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="Email"
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-red-400" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder="Contraseña (mín. 6)"
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-red-400" />
            <Button variant="primary" full disabled={cloudBusy || !email || password.length < 6} onClick={() => void cloudAuth(mode, email.trim(), password)}>
              {cloudBusy ? 'Conectando…' : mode === 'in' ? 'Entrar' : 'Crear cuenta'}
            </Button>
            {cloudMsg && <div className="text-xs text-rose-300">{cloudMsg}</div>}
            <p className="text-[10px] text-slate-500">Tu progreso local actual se fusionará con el de tu cuenta al entrar.</p>
          </Card>
        )}
      </div>
    </div>
  )
}
