import './estado-reporte.css'

// Estados de la tarea (ecocomunidad.md, sección 6.2).
const NOMBRES = {
  asignada: 'Asignada',
  en_proceso: 'En proceso',
  terminada: 'Terminada',
  cancelada: 'Cancelada',
}

// Misma etiqueta que el estado del reporte: texto, borde y punto de color.
export default function EstadoTarea({ estado }) {
  return (
    <span className={`estado-reporte estado-tarea--${estado}`}>
      <span className="estado-reporte__punto" aria-hidden="true" />
      {NOMBRES[estado] ?? estado}
    </span>
  )
}
