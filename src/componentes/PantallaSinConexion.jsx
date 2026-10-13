import { RotateCcw } from 'lucide-react'
import Logo from '../marca/Logo.jsx'
import { useSesion } from '../sesion/useSesion.js'
import './componentes.css'

// Hay sesión guardada pero el servidor no respondió al comprobarla.
export default function PantallaSinConexion() {
  const { cargando, reintentar } = useSesion()
  return (
    <main className="pantalla-carga pantalla-sin-conexion">
      <div className="pantalla-sin-conexion__contenido">
        <Logo tamano={72} />
        <p role="alert">No pudimos conectar con el servidor. Revisa tu conexión.</p>
        <button type="button" className="boton-principal" onClick={reintentar} disabled={cargando}>
          <RotateCcw size={18} aria-hidden="true" />
          {cargando ? 'Reintentando…' : 'Reintentar'}
        </button>
      </div>
    </main>
  )
}
