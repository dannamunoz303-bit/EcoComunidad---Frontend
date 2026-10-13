// Tokens JWT del administrador en localStorage.
const CLAVE_ACCESS = 'ecocomunidad.access'
const CLAVE_REFRESH = 'ecocomunidad.refresh'
// Bienvenida (sessionStorage): "pendiente" al iniciar sesión, "vista" en cuanto aparece.
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
  sessionStorage.removeItem(CLAVE_BIENVENIDA)
}

export function marcarBienvenidaPendiente() {
  sessionStorage.setItem(CLAVE_BIENVENIDA, 'pendiente')
}

export function bienvenidaPendiente() {
  return sessionStorage.getItem(CLAVE_BIENVENIDA) === 'pendiente'
}

export function marcarBienvenidaVista() {
  sessionStorage.setItem(CLAVE_BIENVENIDA, 'vista')
}
