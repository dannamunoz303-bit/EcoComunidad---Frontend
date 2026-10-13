import NombreMarca from './NombreMarca.jsx'
import { TRAZOS, VARIANTES } from './trazos.js'
import './marca.css'

export default function Logo({ variante = 'color', tamano = 48, conNombre = false }) {
  const colores = VARIANTES[variante] ?? VARIANTES.color

  const svg = (
    <svg
      viewBox="0 0 64 64"
      width={tamano}
      height={tamano}
      // Con el nombre visible, el texto ya dice "EcoComunidad": el dibujo se oculta al lector.
      {...(conNombre ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'EcoComunidad' })}
      focusable="false"
    >
      <path d={TRAZOS.losaIzquierda} fill={colores.losa} />
      <path d={TRAZOS.losaDerecha} fill={colores.losa} />
      <path d={TRAZOS.tallo} stroke={colores.tallo} strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d={TRAZOS.hojaIzquierda} fill={colores.hojaIzquierda} />
      <path d={TRAZOS.hojaDerecha} fill={colores.hojaDerecha} />
    </svg>
  )

  if (!conNombre) return svg

  return (
    <span className="logo-con-nombre">
      {svg}
      <NombreMarca variante={variante} tamano={Math.round(tamano * 0.5)} />
    </span>
  )
}
