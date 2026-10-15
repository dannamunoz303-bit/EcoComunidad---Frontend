import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { contarNoLeidas } from '../../api/notificaciones.js'
import { ContextoNotificaciones } from './contexto.js'

export const INTERVALO_MS = 60_000

// Número de notificaciones sin leer, compartido por la campana y la página.
// Se pide al abrir, cada 60 s con la pestaña visible, al volver a la pestaña y tras marcar como leídas.
// Nunca hay dos pedidos a la vez.
export default function ProveedorNotificaciones({ children }) {
  const [total, setTotal] = useState(0)
  const enCurso = useRef(null)

  const actualizar = useCallback(() => {
    if (enCurso.current) return enCurso.current
    enCurso.current = contarNoLeidas()
      .then((n) => setTotal(n))
      .catch(() => {})
      .finally(() => {
        enCurso.current = null
      })
    return enCurso.current
  }, [])

  useEffect(() => {
    actualizar()
    const temporizador = setInterval(() => {
      if (document.visibilityState === 'visible') actualizar()
    }, INTERVALO_MS)
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'visible') actualizar()
    }
    document.addEventListener('visibilitychange', alCambiarVisibilidad)
    return () => {
      clearInterval(temporizador)
      document.removeEventListener('visibilitychange', alCambiarVisibilidad)
    }
  }, [actualizar])

  const valor = useMemo(() => ({ total, actualizar }), [total, actualizar])
  return <ContextoNotificaciones.Provider value={valor}>{children}</ContextoNotificaciones.Provider>
}
