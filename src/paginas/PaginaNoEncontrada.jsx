import { Link } from 'react-router-dom'
import IconoEstado from '../componentes/IconoEstado.jsx'
import './paginas.css'

export default function PaginaNoEncontrada() {
  return (
    <main className="pagina-centrada">
      <IconoEstado tipo="no-existe" tamano={120} />
      <h1>No encontramos esta página</h1>
      <p className="texto-suave">La dirección no existe o cambió.</p>
      <Link className="boton-principal" to="/login">
        Ir al inicio de sesión
      </Link>
    </main>
  )
}
