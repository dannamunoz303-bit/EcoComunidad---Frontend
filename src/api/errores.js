// Errores de la API para mostrar en pantalla.

export const SIN_CONEXION = 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.'
export const ERROR_GENERAL = 'No pudimos completar la acción. Intenta de nuevo.'

const comoTexto = (valor) => (Array.isArray(valor) ? valor.join(' ') : String(valor))

// Errores por campo de un 400: { titulo: ['…'], latitud: ['…'] } → { titulo: '…', latitud: '…' }.
// "detail" y "non_field_errors" no son de un campo.
export function erroresPorCampo(error) {
  const data = error?.response?.status === 400 ? error.response.data : null
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {}
  return Object.fromEntries(
    Object.entries(data)
      .filter(([campo]) => campo !== 'detail' && campo !== 'non_field_errors')
      .map(([campo, valor]) => [campo, comoTexto(valor)]),
  )
}

// Mensaje general: el "detail" del backend tal cual, o los errores por campo juntos.
export function mensajeDeError(error) {
  if (!error?.response) return SIN_CONEXION
  const data = error.response.data
  if (error.response.status === 400 && data) {
    if (typeof data === 'string') return data
    if (data.detail) return comoTexto(data.detail)
    if (data.non_field_errors) return comoTexto(data.non_field_errors)
    const campos = Object.values(erroresPorCampo(error))
    if (campos.length) return campos.join(' ')
  }
  if (data?.detail) return comoTexto(data.detail)
  return ERROR_GENERAL
}
