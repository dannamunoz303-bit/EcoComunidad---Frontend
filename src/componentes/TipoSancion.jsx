import { Ban, Clock, TriangleAlert } from 'lucide-react'
import { NOMBRES_TIPO_SANCION, textoVigencia } from '../utilidades/sanciones.js'
import './estado-reporte.css'

const ICONOS = { advertencia: TriangleAlert, bloqueo_temporal: Clock, bloqueo_permanente: Ban }

// Tipo de sanción con ícono, texto y color; debajo, su vigencia en hora de Colombia.
// Con `sancion` se muestra la vigencia; con solo `tipo`, solo la etiqueta.
export default function TipoSancion({ tipo, sancion = null }) {
  const clave = sancion?.tipo ?? tipo
  const Icono = ICONOS[clave] ?? TriangleAlert
  const vigencia = sancion ? textoVigencia(sancion) : null
  return (
    <span className="tipo-sancion">
      <span className={`estado-reporte tipo-sancion--${clave}`}>
        <Icono size={14} aria-hidden="true" className="tipo-novedad__icono" />
        {NOMBRES_TIPO_SANCION[clave] ?? clave}
      </span>
      {vigencia && <span className="tipo-sancion__vigencia">{vigencia}</span>}
    </span>
  )
}
