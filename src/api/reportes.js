import cliente from './cliente.js'
import { todosLosResultados } from './paginacion.js'

// El administrador ve todos los reportes, incluidos los eliminados (RN-10).
export async function listarReportes({ estado, categoria } = {}) {
  const params = {}
  if (estado) params.estado = estado
  if (categoria) params.categoria = categoria
  const { data } = await cliente.get('/reportes/', { params })
  return todosLosResultados(data)
}

export async function obtenerReporte(id) {
  const { data } = await cliente.get(`/reportes/${id}/`)
  return data
}

// Tareas con gestor, acciones (de la más reciente a la más antigua) y evidencias (RN-14).
export async function obtenerTareasDeReporte(id) {
  const { data } = await cliente.get(`/reportes/${id}/tareas/`)
  return todosLosResultados(data)
}
