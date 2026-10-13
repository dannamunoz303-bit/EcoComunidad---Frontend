// Tokens JWT del administrador en localStorage.
const CLAVE_ACCESS = 'ecocomunidad.access'
const CLAVE_REFRESH = 'ecocomunidad.refresh'

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
}
