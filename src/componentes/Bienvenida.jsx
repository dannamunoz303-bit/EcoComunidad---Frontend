import { X } from 'lucide-react'
import Brotico from '../marca/Brotico.jsx'
import './componentes.css'

export default function Bienvenida({ nombre, alCerrar }) {
  return (
    <section className="bienvenida" aria-label="Bienvenida">
      <Brotico estado="saluda" tamano={96} />
      <p className="bienvenida__texto">
        ¡Hola de nuevo, {nombre}! Tu barrio te está esperando.
      </p>
      <button type="button" className="bienvenida__cerrar" aria-label="Cerrar bienvenida" onClick={alCerrar}>
        <X size={20} aria-hidden="true" />
      </button>
    </section>
  )
}
