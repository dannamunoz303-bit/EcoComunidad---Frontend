import { useCallback, useEffect, useRef, useState } from 'react'
import { obtenerResumen } from '../../api/dashboard.js'

// Datos del Resumen: se piden al abrir, con "Actualizar" y al volver a la pestaña.
// Si ya hay una petición en curso, no se lanza otra.
export function useResumen() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(true)
  const enCurso = useRef(null)

  const cargar = useCallback(() => {
    if (enCurso.current) return enCurso.current
    setCargando(true)
    enCurso.current = obtenerResumen()
      .then((respuesta) => {
        setDatos(respuesta)
        setError(null)
      })
      .catch((err) => setError(err))
      .finally(() => {
        enCurso.current = null
        setCargando(false)
      })
    return enCurso.current
  }, [])

  useEffect(() => {
    cargar()
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'visible') cargar()
    }
    document.addEventListener('visibilitychange', alCambiarVisibilidad)
    return () => document.removeEventListener('visibilitychange', alCambiarVisibilidad)
  }, [cargar])

  return { datos, error, cargando, cargar }
}
