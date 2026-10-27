import { CircleAlert, Hourglass, Inbox, SearchX } from 'lucide-react'
import './componentes.css'

const ICONOS = {
  vacio: Inbox,
  'sin-resultados': SearchX,
  'no-existe': CircleAlert,
  pronto: Hourglass,
}

// Ícono decorativo de los estados vacíos y de error: el mensaje de al lado dice lo que pasa.
export default function IconoEstado({ tipo = 'vacio', tamano = 112 }) {
  const Icono = ICONOS[tipo] ?? ICONOS.vacio
  return <Icono size={tamano} strokeWidth={1.5} className="icono-estado" aria-hidden="true" />
}
