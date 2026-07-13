// Detección de sacudida del dispositivo (DeviceMotion) con permiso iOS 13+ y
// fallback universal: pulsar rápido cuenta como agitar. API única para el
// radar y la captura del modo Cyber PokéBall.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const PERM_KEY = 'pokerogue:motion-perm'
const PEAK_THRESHOLD = 12 // m/s² por encima de la gravedad
const PEAK_DEBOUNCE_MS = 80
const HITS_FOR_FULL = 6

interface DeviceMotionEventStatic {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

export interface ShakeApi {
  /** ¿Hay sensor de movimiento? (si no, solo funciona el modo pulsar). */
  supported: boolean
  /** iOS 13+: hay que pedir permiso desde un gesto del usuario. */
  needsPermission: boolean
  permission: 'unknown' | 'granted' | 'denied'
  /** Llamar SIEMPRE desde un onClick (requisito de Safari iOS). */
  requestPermission: () => Promise<boolean>
  start: () => void
  stop: () => void
  reset: () => void
  /** También cuenta un tap/click/espacio como una sacudida (fallback). */
  tap: () => void
  /** Intensidad acumulada 0..1 en la ventana actual. */
  score: number
  /** Lectura FRESCA del score (para callbacks/timeouts: `score` puede quedar
   *  congelado en la clausura del render en que se creó). */
  getScore: () => number
}

export function useShake(windowMs = 1500): ShakeApi {
  const [score, setScore] = useState(0)
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>(() => {
    try {
      const saved = localStorage.getItem(PERM_KEY)
      return saved === 'granted' || saved === 'denied' ? saved : 'unknown'
    } catch { return 'unknown' }
  })
  const hitsRef = useRef<number[]>([])
  const lastPeakRef = useRef(0)
  const activeRef = useRef(false)

  const supported = typeof window !== 'undefined' && typeof DeviceMotionEvent !== 'undefined'
  const needsPermission = supported &&
    typeof (DeviceMotionEvent as unknown as DeviceMotionEventStatic).requestPermission === 'function'

  const registerHit = useCallback(() => {
    const now = Date.now()
    hitsRef.current = [...hitsRef.current.filter((t) => now - t < windowMs), now]
    setScore(Math.min(1, hitsRef.current.length / HITS_FOR_FULL))
  }, [windowMs])

  useEffect(() => {
    if (!supported) return
    const onMotion = (e: DeviceMotionEvent) => {
      if (!activeRef.current) return
      const a = e.accelerationIncludingGravity
      if (!a) return
      const mag = Math.sqrt((a.x ?? 0) ** 2 + (a.y ?? 0) ** 2 + (a.z ?? 0) ** 2)
      const excess = Math.abs(mag - 9.81)
      const now = Date.now()
      if (excess > PEAK_THRESHOLD && now - lastPeakRef.current > PEAK_DEBOUNCE_MS) {
        lastPeakRef.current = now
        registerHit()
      }
    }
    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, [supported, registerHit])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!needsPermission) {
      setPermission('granted')
      return true
    }
    try {
      const dme = DeviceMotionEvent as unknown as DeviceMotionEventStatic
      const result = await dme.requestPermission!()
      setPermission(result)
      try { localStorage.setItem(PERM_KEY, result) } catch { /* ignore */ }
      return result === 'granted'
    } catch {
      setPermission('denied')
      return false
    }
  }, [needsPermission])

  const start = useCallback(() => { activeRef.current = true }, [])
  const stop = useCallback(() => { activeRef.current = false }, [])
  const reset = useCallback(() => {
    hitsRef.current = []
    setScore(0)
  }, [])
  const tap = useCallback(() => { registerHit() }, [registerHit])
  const getScore = useCallback(() => {
    const now = Date.now()
    return Math.min(1, hitsRef.current.filter((t) => now - t < windowMs).length / HITS_FOR_FULL)
  }, [windowMs])

  // Identidad estable (salvo cambios reales): el objeto entero se usa en deps
  // de efectos en las vistas; sin memo se recrearía en cada render.
  return useMemo(
    () => ({ supported, needsPermission, permission, requestPermission, start, stop, reset, tap, score, getScore }),
    [supported, needsPermission, permission, requestPermission, start, stop, reset, tap, score, getScore],
  )
}
