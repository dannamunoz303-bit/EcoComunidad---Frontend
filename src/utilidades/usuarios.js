import { formatearFechaHoraCorta } from './fechas.js'

// Roles (ecocomunidad.md, sección 1).
export const NOMBRES_ROL = {
  ciudadano: 'Ciudadano',
  gestor: 'Gestor ambiental',
  administrador: 'Administrador',
}

export const nombreCompleto = (usuario) => (usuario ? `${usuario.nombre} ${usuario.apellido}` : '—')

// "hasta 15 oct. 2026, 3:00 p. m." o "permanente" si no tiene fecha de fin (RN-21).
export function textoBloqueo(bloqueadoHasta) {
  return bloqueadoHasta ? `hasta ${formatearFechaHoraCorta(bloqueadoHasta)}` : 'permanente'
}
