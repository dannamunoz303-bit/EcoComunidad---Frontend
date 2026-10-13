import NombreMarca from './NombreMarca.jsx'
import { TRAZOS, VARIANTES } from './trazos.js'
import './marca.css'

// Animación del login (marca.md). Para repetirla, cambiar la prop `key`.
// El formulario que acompaña al logo usa la clase "aparece-formulario".
export default function LogoAnimado({ tamano = 96, conNombre = true }) {
  const colores = VARIANTES.color

  return (
    <div className="logo-animado">
      <svg
        viewBox="0 0 64 64"
        width={tamano}
        height={tamano}
        {...(conNombre ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'EcoComunidad' })}
        focusable="false"
      >
        <path className="la-losa la-losa--izquierda" d={TRAZOS.losaIzquierda} fill={colores.losa} />
        <path className="la-losa la-losa--derecha" d={TRAZOS.losaDerecha} fill={colores.losa} />
        <path
          className="la-tallo"
          d={TRAZOS.tallo}
          pathLength="1"
          stroke={colores.tallo}
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <path className="la-hoja la-hoja--izquierda" d={TRAZOS.hojaIzquierda} fill={colores.hojaIzquierda} />
        <path className="la-hoja la-hoja--derecha" d={TRAZOS.hojaDerecha} fill={colores.hojaDerecha} />
      </svg>
      {conNombre && <NombreMarca className="la-nombre" tamano={Math.round(tamano * 0.4)} />}
    </div>
  )
}
