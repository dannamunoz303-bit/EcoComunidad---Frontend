import cliente from './cliente.js'
import { todosLosResultados } from './paginacion.js'

// Notificaciones del usuario (sección 9): { id, tipo, mensaje, leida, fecha, reporte (id o null) }.
// Llegan de la más reciente a la más antigua.

// leida: true, false o sin filtro (todas).
export async function listarNotificaciones({ leida } = {}) {
  const params = leida === undefined ? {} : { leida: String(leida) }
  const { data } = await cliente.get('/notificaciones/', { params })
  return todosLosResultados(data)
}

export async function contarNoLeidas() {
  const { data } = await cliente.get('/notificaciones/no-leidas/')
  return data.total
}

export async function marcarLeida(id) {
  const { data } = await cliente.post(`/notificaciones/${id}/leer/`)
  return data
}

// Responde { actualizadas }.
export async function marcarTodasLeidas() {
  const { data } = await cliente.post('/notificaciones/leer-todas/')
  return data
}
