import './estado-reporte.css'

// Estados del reporte (ecocomunidad.md, sección 6.1).
const NOMBRES = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  asignado: 'Asignado',
  en_proceso: 'En proceso',
  resuelto: 'Resuelto',
  rechazado: 'Rechazado',
}

// Etiqueta con texto y punto de color: el estado nunca se comunica solo con color.
// Si el reporte está eliminado se agrega la etiqueta gris "Eliminado".
export default function EstadoReporte({ estado, eliminado = false }) {
  const nombre = NOMBRES[estado]
  return (
    <span className="estados-reporte">
      {eliminado && (
        <span className="estado-reporte estado-reporte--eliminado">
          <span className="estado-reporte__punto" aria-hidden="true" />
          Eliminado
        </span>
      )}
      {nombre && (
        <span className={`estado-reporte estado-reporte--${estado}`}>
          <span className="estado-reporte__punto" aria-hidden="true" />
          {nombre}
        </span>
      )}
    </span>
  )
}
