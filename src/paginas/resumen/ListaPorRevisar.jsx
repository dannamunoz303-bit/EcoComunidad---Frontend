import { BadgeCheck, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { tiempoRelativo } from '../../utilidades/fechas.js'

export default function ListaPorRevisar({ reportes }) {
  if (reportes.length === 0) {
    return (
      <p className="lista-vacia">
        <BadgeCheck size={22} aria-hidden="true" />
        Todo al día: no hay reportes por revisar.
      </p>
    )
  }

  return (
    <ul className="lista-pendientes">
      {reportes.map(({ id, titulo, categoria, fecha_creacion: fechaCreacion }) => (
        <li key={id}>
          <Link to={`/reportes/${id}`} className="lista-pendientes__enlace">
            <span className="lista-pendientes__titulo">{titulo}</span>
            <span className="lista-pendientes__datos">
              {categoria && <span className="etiqueta">{categoria.nombre}</span>}
              <time dateTime={fechaCreacion} className="texto-suave">
                {tiempoRelativo(fechaCreacion)}
              </time>
            </span>
            <ChevronRight className="lista-pendientes__flecha" size={18} aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
