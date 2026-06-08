import { useState } from 'react'
import { useGame } from '@/state/gameStore'
import { Button } from '@/ui/components/kit'
import Icon from '@/ui/components/Icon'
import { cloudEnabled } from '@/persistence/supabase'

/** Modal de cuenta en la nube: login / registro / alias / sincronizar. */
export default function AccountModal({ onClose }: { onClose: () => void }) {
  const { cloudUser, cloudBusy, cloudMsg, cloudAuth, cloudLogout, cloudSync, alias, setAlias } = useGame()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [aliasInput, setAliasInput] = useState(alias)
  const enabled = cloudEnabled()

  return (
    <div className="absolute inset-0 z-[70] bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-4 animate-pop-in flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="font-extrabold text-lg inline-flex items-center gap-1.5"><Icon name="cloud" className="w-5 h-5" /> Cuenta</div>
          <button className="text-slate-400 px-1 active:scale-90" onClick={onClose} aria-label="Cerrar"><Icon name="x" className="w-5 h-5" /></button>
        </div>

        {!enabled ? (
          <p className="text-xs text-slate-400">
            La nube no está configurada. El juego funciona en local en este dispositivo.
            Usa la copia de seguridad de Ajustes para mover tu progreso.
          </p>
        ) : cloudUser ? (
          <>
            <div>
              <div className="text-xs text-slate-400">Sesión iniciada como</div>
              <div className="font-bold truncate">{cloudUser.email}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Tu alias en el ranking</div>
              <div className="flex gap-2">
                <input value={aliasInput} onChange={(e) => setAliasInput(e.target.value)} maxLength={20} placeholder="Nombre de jugador"
                  className="flex-1 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-red-400" />
                <Button variant="secondary" disabled={aliasInput.trim() === alias} onClick={() => void setAlias(aliasInput)}>Guardar</Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" disabled={cloudBusy} onClick={() => void cloudSync()}>{cloudBusy ? 'Sincronizando…' : <span className="inline-flex items-center justify-center gap-1.5"><Icon name="refresh" className="w-4 h-4" /> Sincronizar</span>}</Button>
              <Button variant="danger" className="flex-1" onClick={cloudLogout}>Cerrar sesión</Button>
            </div>
            {cloudMsg && <div className="text-xs text-emerald-300">{cloudMsg}</div>}
          </>
        ) : (
          <>
            <div className="flex gap-2">
              <button onClick={() => setMode('in')} className={`flex-1 py-2 rounded-xl font-bold text-sm ${mode === 'in' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'}`}>Iniciar sesión</button>
              <button onClick={() => setMode('up')} className={`flex-1 py-2 rounded-xl font-bold text-sm ${mode === 'up' ? 'bg-red-500 text-white' : 'bg-slate-700 text-slate-300'}`}>Crear cuenta</button>
            </div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="Email"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-red-400" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder="Contraseña (mín. 6)"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-red-400" />
            <Button variant="primary" full disabled={cloudBusy || !email || password.length < 6} onClick={async () => { if (await cloudAuth(mode, email.trim(), password)) onClose() }}>
              {cloudBusy ? 'Conectando…' : mode === 'in' ? 'Entrar' : 'Crear cuenta'}
            </Button>
            {cloudMsg && <div className="text-xs text-rose-300">{cloudMsg}</div>}
            <p className="text-[10px] text-slate-500">Tu progreso local se fusionará con el de tu cuenta al entrar.</p>
          </>
        )}
      </div>
    </div>
  )
}
