import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// PWA: auto-actualización. Cuando hay una versión nueva, el nuevo Service Worker
// toma el control y la página se recarga sola (sin quedarse en versión vieja).
if ('serviceWorker' in navigator) {
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, reg) {
    // Comprueba si hay actualización cada 60 s mientras la app está abierta.
    if (reg) setInterval(() => reg.update().catch(() => {}), 60_000)
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
