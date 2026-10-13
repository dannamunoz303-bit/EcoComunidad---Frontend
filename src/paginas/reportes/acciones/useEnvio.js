import { useCallback, useRef, useState } from 'react'

// Envía una sola vez aunque se pulse varias veces; guarda el error para mostrarlo.
export function useEnvio() {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const enCurso = useRef(false)

  const enviar = useCallback(async (accion) => {
    if (enCurso.current) return { ok: false, repetido: true }
    enCurso.current = true
    setEnviando(true)
    setError(null)
    try {
      const resultado = await accion()
      return { ok: true, resultado }
    } catch (err) {
      setError(err)
      return { ok: false, error: err }
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }, [])

  return { enviando, error, enviar }
}
