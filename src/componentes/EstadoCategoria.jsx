import './estado-reporte.css'

// Activa o inactiva (sección 4.3): texto, borde y punto de color.
export default function EstadoCategoria({ activa }) {
  return (
    <span className={`estado-reporte estado-categoria--${activa ? 'activa' : 'inactiva'}`}>
      <span className="estado-reporte__punto" aria-hidden="true" />
      {activa ? 'Activa' : 'Inactiva'}
    </span>
  )
}
