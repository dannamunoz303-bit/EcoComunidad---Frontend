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

// Páginas del panel que no están en la barra lateral.
const OTRAS_PAGINAS = [{ ruta: '/mi-cuenta', titulo: 'Mi cuenta' }]

// Título de la barra superior para una ruta.
export function tituloDeRuta(ruta) {
  return seccionDeRuta(ruta)?.titulo ?? OTRAS_PAGINAS.find((p) => p.ruta === ruta)?.titulo ?? ''
}

// "/reportes/12" pertenece a Reportes.
export function seccionDeRuta(ruta) {
  return (
    SECCIONES.find(
      (seccion) => seccion.ruta === ruta || (seccion.ruta !== '/' && ruta.startsWith(`${seccion.ruta}/`)),
    ) ?? null
  )
}
