import {
  AlarmClock,
  Ban,
  Bell,
  CircleCheck,
  CircleX,
  Inbox,
  KeyRound,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react'

// Un ícono de Lucide por código de notificación (sección 9). Un tipo desconocido usa la campana.
const ICONOS = {
  reporte_nuevo: Inbox,
  reporte_aprobado: CircleCheck,
  reporte_estado: CircleCheck,
  reporte_rechazado: CircleX,
  reporte_asignado: UserRound,
  reporte_eliminado: Trash2,
  tarea_asignada: UserRound,
  tarea_cancelada: Ban,
  tarea_sin_acciones: AlarmClock,
  novedad_nueva: MessageSquare,
  novedad_respondida: MessageSquare,
  sancion: ShieldAlert,
  bloqueo_levantado: ShieldCheck,
  contrasena_restablecida: KeyRound,
}

export default function IconoNotificacion({ tipo, size = 20 }) {
  const Icono = ICONOS[tipo] ?? Bell
  const alerta = tipo === 'tarea_sin_acciones'
  return (
    <span className={`icono-notificacion${alerta ? ' icono-notificacion--alerta' : ''}`} aria-hidden="true">
      <Icono size={size} />
    </span>
  )
}
