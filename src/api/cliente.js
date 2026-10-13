import axios from 'axios'
import { borrarSesion, guardarSesion, haySesion, leerAccess, leerRefresh } from './sesion.js'

export const EVENTO_SESION_CERRADA = 'sesion-cerrada'

// Códigos del 403 por estado del usuario (ecocomunidad.md, sección 14).
export const CODIGOS_ESTADO_DENEGADO = ['usuario_inactivo', 'usuario_bloqueado', 'usuario_bloqueado_permanente']

const RUTA_LOGIN = '/auth/login/'
const RUTA_REFRESH = '/auth/refresh/'

const cliente = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

export function esEstadoDenegado(data) {
  return CODIGOS_ESTADO_DENEGADO.includes(data?.code)
}

// Borra los tokens y avisa a la app. Solo avisa si había sesión,
// así varias respuestas fallidas a la vez generan un único aviso.
// `datos` es el cuerpo del 403 de estado: { detail, code, bloqueado_hasta }.
export function cerrarSesion(datos = null) {
  if (!haySesion()) return
  borrarSesion()
  window.dispatchEvent(
    new CustomEvent(EVENTO_SESION_CERRADA, {
      detail: {
        mensaje: datos?.detail ?? null,
        code: datos?.code ?? null,
        bloqueadoHasta: datos?.bloqueado_hasta ?? null,
      },
    }),
  )
}

// El servidor no respondió (red caída, servidor apagado).
const esSinConexion = (error) => !error.response && !error.sinRefresh

const esRuta = (config, ruta) => (config.url ?? '').endsWith(ruta)

// Un único refresh compartido por todas las peticiones que reciben 401 a la vez.
let refreshEnCurso = null

function renovarAccess() {
  if (!refreshEnCurso) {
    const refresh = leerRefresh()
    refreshEnCurso = (
      refresh
        ? cliente.post(RUTA_REFRESH, { refresh }, { _esRefresh: true })
        : Promise.reject(Object.assign(new Error('No hay refresh guardado'), { sinRefresh: true }))
    )
      .then(({ data }) => {
        guardarSesion({ access: data.access, refresh: data.refresh })
        return data.access
      })
      .catch((error) => {
        // Sin respuesta del servidor no se sabe si la sesión sigue válida: se conserva.
        if (!esSinConexion(error)) {
          const data = error.response?.data
          cerrarSesion(esEstadoDenegado(data) ? data : null)
        }
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

    if (response.status === 403 && esEstadoDenegado(response.data)) {
      cerrarSesion(response.data)
      throw error
    }

    if (response.status === 401 && !config._reintento && haySesion()) {
      try {
        await renovarAccess()
      } catch (errorRefresh) {
        // Si el refresh no tuvo respuesta, se propaga ese error para distinguir "sin conexión".
        throw esSinConexion(errorRefresh) ? errorRefresh : error
      }
      // El interceptor de petición pone el access nuevo.
      return cliente({ ...config, _reintento: true })
    }

    throw error
  },
)

export default cliente
