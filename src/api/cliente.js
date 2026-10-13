import axios from 'axios'
import { borrarSesion, guardarSesion, haySesion, leerAccess, leerRefresh } from './sesion.js'

export const EVENTO_SESION_CERRADA = 'sesion-cerrada'

const RUTA_LOGIN = '/auth/login/'
const RUTA_REFRESH = '/auth/refresh/'

const cliente = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// Texto de error que manda el backend (DRF usa "detail").
export function mensajeDelBackend(data) {
  if (!data) return null
  if (typeof data === 'string') return data
  return data.detail ?? data.mensaje ?? data.error ?? null
}

// 403 por usuario inactivo o con bloqueo vigente (ecocomunidad.md, sección 14).
function esUsuarioInactivoOBloqueado(data) {
  const mensaje = mensajeDelBackend(data)
  return typeof mensaje === 'string' && /inactiv|bloque/i.test(mensaje)
}

// Borra los tokens y avisa a la app. Solo avisa si había sesión,
// así varias respuestas fallidas a la vez generan un único aviso.
export function cerrarSesion(mensaje = null) {
  if (!haySesion()) return
  borrarSesion()
  window.dispatchEvent(new CustomEvent(EVENTO_SESION_CERRADA, { detail: { mensaje } }))
}

const esRuta = (config, ruta) => (config.url ?? '').endsWith(ruta)

// Un único refresh compartido por todas las peticiones que reciben 401 a la vez.
let refreshEnCurso = null

function renovarAccess() {
  if (!refreshEnCurso) {
    const refresh = leerRefresh()
    refreshEnCurso = (
      refresh
        ? cliente.post(RUTA_REFRESH, { refresh }, { _esRefresh: true })
        : Promise.reject(new Error('No hay refresh guardado'))
    )
      .then(({ data }) => {
        guardarSesion({ access: data.access, refresh: data.refresh })
        return data.access
      })
      .catch((error) => {
        const data = error.response?.data
        cerrarSesion(error.response?.status === 403 ? mensajeDelBackend(data) : null)
        throw error
      })
      .finally(() => {
        refreshEnCurso = null
      })
  }
  return refreshEnCurso
}

cliente.interceptors.request.use((config) => {
  const access = leerAccess()
  if (access && !config._esRefresh && !esRuta(config, RUTA_LOGIN)) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

cliente.interceptors.response.use(
  (respuesta) => respuesta,
  async (error) => {
    const { config, response } = error
    if (!config || !response || config._esRefresh || esRuta(config, RUTA_LOGIN)) {
      throw error
    }

    if (response.status === 403 && esUsuarioInactivoOBloqueado(response.data)) {
      cerrarSesion(mensajeDelBackend(response.data))
      throw error
    }

    if (response.status === 401 && !config._reintento && haySesion()) {
      try {
        await renovarAccess()
      } catch {
        throw error
      }
      // El interceptor de petición pone el access nuevo.
      return cliente({ ...config, _reintento: true })
    }

    throw error
  },
)

export default cliente
