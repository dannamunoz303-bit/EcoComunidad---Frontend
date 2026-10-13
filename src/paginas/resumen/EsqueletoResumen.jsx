import { useEffect, useState } from 'react'
import Brotico from '../../marca/Brotico.jsx'

const ESPERA_BROTICO_MS = 1000

// Siluetas con la forma de cada bloque mientras llegan los datos.
// Si la carga pasa de 1 s, aparece Brotico pensando (marca.md).
export default function EsqueletoResumen() {
  const [cargaLarga, setCargaLarga] = useState(false)

  useEffect(() => {
    const temporizador = setTimeout(() => setCargaLarga(true), ESPERA_BROTICO_MS)
    return () => clearTimeout(temporizador)
  }, [])

  return (
    <div className="esqueleto" aria-busy="true" data-testid="esqueleto-resumen">
      <div className="resumen__rejilla" aria-hidden="true">
        <div className="tarjetas-resumen">
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="silueta silueta--tarjeta" />
          ))}
        </div>
        <div className="silueta silueta--semana" />
        <div className="silueta silueta--atencion" />
        <div className="silueta silueta--lista" />
        <div className="silueta silueta--avance" />
      </div>

      <div className="esqueleto__aviso" role="status">
        {cargaLarga && (
          <div className="esqueleto__brotico">
            <Brotico estado="piensa" tamano={72} />
            <p>Revisando los reportes del barrio…</p>
          </div>
        )}
      </div>
    </div>
  )
}
