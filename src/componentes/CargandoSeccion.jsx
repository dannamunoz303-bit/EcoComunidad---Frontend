import { useEffect, useState } from 'react'
import Logo from '../marca/Logo.jsx'
import './componentes.css'

// Espera antes de mostrar el logo: si la sección llega rápido, no se ve nada (sin parpadeo).
export const ESPERA_LOGO_MS = 250

// Mientras se descarga una sección: el logo centrado en el área de contenido.
export default function CargandoSeccion() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const temporizador = setTimeout(() => setVisible(true), ESPERA_LOGO_MS)
    return () => clearTimeout(temporizador)
  }, [])

  return (
    <div className="cargando-seccion" role="status" aria-busy="true">
      {visible && <Logo tamano={56} />}
      <span className="solo-lector">Cargando la sección…</span>
    </div>
  )
}
