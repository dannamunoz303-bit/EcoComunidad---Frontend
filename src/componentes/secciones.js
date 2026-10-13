import {
  Activity,
  Bell,
  ClipboardList,
  Gavel,
  LayoutDashboard,
  ListChecks,
  MessageSquareWarning,
  Tags,
  Users,
} from 'lucide-react'

// Secciones del panel del administrador (ecocomunidad.md, sección 8).
export const SECCIONES = [
  { ruta: '/', titulo: 'Resumen', icono: LayoutDashboard },
  { ruta: '/reportes', titulo: 'Reportes', icono: ClipboardList },
  { ruta: '/tareas', titulo: 'Tareas', icono: ListChecks },
  { ruta: '/usuarios', titulo: 'Usuarios', icono: Users },
  { ruta: '/categorias', titulo: 'Categorías', icono: Tags },
  { ruta: '/novedades', titulo: 'Novedades', icono: MessageSquareWarning },
  { ruta: '/sanciones', titulo: 'Sanciones', icono: Gavel },
  { ruta: '/seguimiento', titulo: 'Seguimiento', icono: Activity },
  { ruta: '/notificaciones', titulo: 'Notificaciones', icono: Bell },
]

export function seccionDeRuta(ruta) {
  return SECCIONES.find((seccion) => seccion.ruta === ruta) ?? null
}
