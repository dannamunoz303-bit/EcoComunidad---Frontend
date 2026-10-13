import { LifeBuoy, MessageSquareWarning, TriangleAlert } from 'lucide-react'
import { NOMBRES_TIPO } from '../utilidades/novedades.js'
import './estado-reporte.css'

const ICONOS = { ayuda: LifeBuoy, queja: MessageSquareWarning, incidente: TriangleAlert }

// Tipo de novedad: ícono, texto y color (nunca solo color).
export default function TipoNovedad({ tipo }) {
  const Icono = ICONOS[tipo] ?? TriangleAlert
  return (
    <span className={`estado-reporte tipo-novedad tipo-novedad--${tipo}`}>
      <Icono size={14} aria-hidden="true" className="tipo-novedad__icono" />
      {NOMBRES_TIPO[tipo] ?? tipo}
    </span>
  )
}
