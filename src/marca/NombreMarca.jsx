import { VARIANTES } from './trazos.js'
import './marca.css'

// Texto "EcoComunidad": "Eco" en peso 500 y "Comunidad" en peso 700.
export default function NombreMarca({ variante = 'color', tamano = 24, className = '' }) {
  const colores = VARIANTES[variante] ?? VARIANTES.color
  return (
    <span className={`nombre-marca ${className}`.trim()} style={{ fontSize: tamano }}>
      <span className="nombre-marca__eco" style={{ color: colores.eco }}>
        Eco
      </span>
      <span className="nombre-marca__comunidad" style={{ color: colores.comunidad }}>
        Comunidad
      </span>
    </span>
  )
}
