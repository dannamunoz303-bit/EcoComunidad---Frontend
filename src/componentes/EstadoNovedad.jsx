import './estado-reporte.css'

// Estado de la novedad (sección 6.3): abierta → atendida.
export default function EstadoNovedad({ estado }) {
  return (
    <span className={`estado-reporte estado-novedad--${estado}`}>
      <span className="estado-reporte__punto" aria-hidden="true" />
      {estado === 'atendida' ? 'Atendida' : 'Abierta'}
    </span>
  )
}
