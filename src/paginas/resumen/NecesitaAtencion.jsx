import { AlarmClock, ChevronRight, MessageSquareWarning, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

function Fila({ a, icono: Icono, titulo, valor, detalle, alerta = false }) {
  return (
    <li>
      <Link to={a} className={`fila-atencion${alerta ? ' fila-atencion--alerta' : ''}`}>
        <span className="fila-atencion__icono" aria-hidden="true">
          <Icono size={20} />
        </span>
        <span className="fila-atencion__texto">
          <span className="fila-atencion__titulo">{titulo}</span>
          {detalle && <span className="fila-atencion__detalle">{detalle}</span>}
        </span>
        <span className="fila-atencion__valor">{valor}</span>
        <ChevronRight className="fila-atencion__flecha" size={18} aria-hidden="true" />
      </Link>
    </li>
  )
}

export default function NecesitaAtencion({ novedades, tareasAtrasadas, gestores }) {
  const hayAtrasadas = tareasAtrasadas > 0
  return (
    <ul className="lista-atencion">
      <Fila a="/novedades" icono={MessageSquareWarning} titulo="Novedades abiertas" valor={novedades} />
      <Fila
        a="/seguimiento?atrasadas=1"
        icono={AlarmClock}
        titulo="Tareas atrasadas"
        valor={tareasAtrasadas}
        detalle={hayAtrasadas ? 'Más de 1 día sin acciones' : null}
        alerta={hayAtrasadas}
      />
      <Fila a="/usuarios" icono={Users} titulo="Gestores activos" valor={gestores} />
    </ul>
  )
}
