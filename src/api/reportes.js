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

// Acciones del administrador (RN-08, RN-09, RN-17). Responden el reporte actualizado.

export async function aprobarReporte(id) {
  const { data } = await cliente.post(`/reportes/${id}/aprobar/`)
  return data
}

export async function rechazarReporte(id, motivoRechazo) {
  const { data } = await cliente.post(`/reportes/${id}/rechazar/`, { motivo_rechazo: motivoRechazo })
  return data
}

export async function devolverAPendiente(id) {
  const { data } = await cliente.post(`/reportes/${id}/devolver-a-pendiente/`)
  return data
}

export async function reabrirReporte(id) {
  const { data } = await cliente.post(`/reportes/${id}/reabrir/`)
  return data
}

// Solo los campos que cambiaron: titulo, descripcion, categoria (id de una activa),
// direccion, descripcion_ubicacion, latitud y longitud.
export async function editarReporte(id, cambios) {
  const { data } = await cliente.patch(`/reportes/${id}/`, cambios)
  return data
}

// Eliminación lógica (RN-09). Responde 204 sin cuerpo.
export async function eliminarReporte(id) {
  await cliente.delete(`/reportes/${id}/`)
}
