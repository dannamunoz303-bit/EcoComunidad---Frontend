// Tokens JWT del administrador en localStorage.
const CLAVE_ACCESS = 'ecocomunidad.access'
const CLAVE_REFRESH = 'ecocomunidad.refresh'
// Bienvenida pendiente: se marca al iniciar sesión y se quita al cerrarla.
const CLAVE_BIENVENIDA = 'ecocomunidad.bienvenida'

export function guardarSesion({ access, refresh }) {
  if (access) localStorage.setItem(CLAVE_ACCESS, access)
  if (refresh) localStorage.setItem(CLAVE_REFRESH, refresh)
}

export function leerAccess() {
  return localStorage.getItem(CLAVE_ACCESS)
}

export function leerRefresh() {
  return localStorage.getItem(CLAVE_REFRESH)
}

export function haySesion() {
  return Boolean(leerAccess() || leerRefresh())
}

export function borrarSesion() {
  localStorage.removeItem(CLAVE_ACCESS)
  localStorage.removeItem(CLAVE_REFRESH)
  localStorage.removeItem(CLAVE_BIENVENIDA)
}

export function marcarBienvenidaPendiente() {
  localStorage.setItem(CLAVE_BIENVENIDA, 'pendiente')
}

export function bienvenidaPendiente() {
  return localStorage.getItem(CLAVE_BIENVENIDA) === 'pendiente'
}

export function descartarBienvenida() {
  localStorage.removeItem(CLAVE_BIENVENIDA)
}
