import { AlarmClock } from 'lucide-react'
import './seguimiento.css'

// Cantidad de tareas atrasadas (sección 11): en ámbar con ícono solo si hay alguna.
export default function Atrasadas({ cantidad }) {
  if (!cantidad) return <span className="cifra-tabla">0</span>
  return (
    <span className="etiqueta-atrasada">
      <AlarmClock size={14} aria-hidden="true" />
      {cantidad} {cantidad === 1 ? 'atrasada' : 'atrasadas'}
    </span>
  )
}
