import { formatearFechaHora } from '../utilidades/fechas.js'

export const MENSAJES = {
  credenciales: 'Correo o contraseña incorrectos.',
  inactivo: 'Tu cuenta está inactiva. Habla con otro administrador.',
  bloqueadoPermanente: 'Tu cuenta está bloqueada de forma permanente.',
  sinConexion: 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
  soloAdministradores: 'Este panel es solo para administradores. Usa la app móvil.',
  sesionVencida: 'Tu sesión terminó. Inicia sesión de nuevo.',
  desconocido: 'No pudimos iniciar sesión. Intenta de nuevo.',
}

// Mensaje para un 403 de estado: { code, bloqueado_hasta, detail }.
export function mensajePorEstado(code, bloqueadoHasta, detail = null) {
  if (code === 'usuario_inactivo') return MENSAJES.inactivo
  if (code === 'usuario_bloqueado_permanente') return MENSAJES.bloqueadoPermanente
  if (code === 'usuario_bloqueado') {
    const fecha = bloqueadoHasta && formatearFechaHora(bloqueadoHasta)
    // Sin fecha válida se usa el texto del backend.
    if (!fecha) return detail
    // La hora termina en "a. m."/"p. m.": no se repite el punto final.
    return `Tu cuenta está bloqueada hasta el ${fecha}${fecha.endsWith('.') ? '' : '.'}`
  }
  return null
}

// Mensaje para un error del login (axios).
export function mensajeDeErrorLogin(error) {
  const { response } = error ?? {}
  if (!response) return MENSAJES.sinConexion
  if (response.status === 401) return MENSAJES.credenciales
  if (response.status === 403) {
    const { code, bloqueado_hasta: bloqueadoHasta, detail } = response.data ?? {}
    const porEstado = mensajePorEstado(code, bloqueadoHasta, detail)
    if (porEstado) return porEstado
  }
  return MENSAJES.desconocido
}
