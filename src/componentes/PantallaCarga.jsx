import Logo from '../marca/Logo.jsx'
import './componentes.css'

// Mientras se comprueba la sesión: solo el logo en el centro.
export default function PantallaCarga() {
  return (
    <div className="pantalla-carga" role="status">
      <Logo tamano={72} />
      <span className="solo-lector">Comprobando tu sesión…</span>
    </div>
  )
}
