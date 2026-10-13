import { useCallback, useEffect, useState } from 'react'

// Ejecuta `cargar` (una función estable, por ejemplo de useCallback) y guarda su resultado.
// Si `cargar` cambia, vuelve a cargar; las respuestas viejas se descartan.
export function useCarga(cargar) {
  const [intento, setIntento] = useState(0)
  const [resultado, setResultado] = useState({ cargar: null, intento: -1, datos: null, error: null })

  useEffect(() => {
    let vigente = true
    cargar().then(
      (datos) => vigente && setResultado({ cargar, intento, datos, error: null }),
      (error) => vigente && setResultado({ cargar, intento, datos: null, error }),
    )
    return () => {
      vigente = false
    }
  }, [cargar, intento])

  const reintentar = useCallback(() => setIntento((n) => n + 1), [])
  const listo = resultado.cargar === cargar && resultado.intento === intento
  return {
    datos: listo ? resultado.datos : null,
    error: listo ? resultado.error : null,
    cargando: !listo,
    reintentar,
  }
}
