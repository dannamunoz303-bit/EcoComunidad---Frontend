import { textoBloqueo } from '../utilidades/usuarios.js'
import './estado-reporte.css'

// Estado del usuario (ecocomunidad.md, sección 6.4). Bloqueado con fecha de fin o permanente (RN-21).
const NOMBRES = { activo: 'Activo', inactivo: 'Inactivo', bloqueado: 'Bloqueado' }

export default function EstadoUsuario({ estado, bloqueadoHasta = null }) {
  return (
    <span className={`estado-reporte estado-usuario--${estado}`}>
      <span className="estado-reporte__punto" aria-hidden="true" />
      {NOMBRES[estado] ?? estado}
      {estado === 'bloqueado' && <span className="estado-usuario__detalle">{textoBloqueo(bloqueadoHasta)}</span>}
    </span>
  )
}
