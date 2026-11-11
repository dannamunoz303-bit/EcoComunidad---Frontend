import { nombreUrgencia } from '../utilidades/territorio.js'
import './estado-reporte.css'

// Etiqueta de urgencia (RN-25): texto y punto de color, como la del estado.
// `prefijo` se lee antes del nombre ("Urgencia alta") para que no dependa del contexto.
export default function UrgenciaReporte({ urgencia, prefijo = 'Urgencia' }) {
  const nombre = nombreUrgencia(urgencia)
  if (!nombre) return null
  return (
    <span className={`estado-reporte urgencia urgencia--${urgencia}`}>
      <span className="estado-reporte__punto" aria-hidden="true" />
      {prefijo ? `${prefijo} ${nombre.toLowerCase()}` : nombre}
    </span>
  )
}
