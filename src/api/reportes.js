import cliente from './cliente.js'
import { todosLosResultados } from './paginacion.js'

// El administrador ve todos los reportes, incluidos los eliminados (RN-10), ordenados por
// urgencia (alta primero) y luego del más antiguo al más reciente (RN-25).
// Cada reporte trae municipio ({ id, nombre } o null), vereda, zona ({ id, nombre } o null) y urgencia.
// `zona`: id de la zona del municipio, o 'sin' para los reportes sin municipio (RN-23).
export async function listarReportes({ estado, categoria, urgencia, zona } = {}) {
  const params = {}
  if (estado) params.estado = estado
  if (categoria) params.categoria = categoria
  if (urgencia) params.urgencia = urgencia
  if (zona) params.zona = zona
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

// RN-25: alta, media o baja, mientras el reporte no esté eliminado.
export async function cambiarUrgencia(id, urgencia) {
  const { data } = await cliente.post(`/reportes/${id}/urgencia/`, { urgencia })
  return data
}

// Solo los campos que cambiaron: titulo, descripcion, categoria (id de una activa),
// direccion, descripcion_ubicacion, municipio (id; no se puede quitar), vereda, latitud y longitud.
export async function editarReporte(id, cambios) {
  const { data } = await cliente.patch(`/reportes/${id}/`, cambios)
  return data
}

// Eliminación lógica (RN-09). Responde 204 sin cuerpo.
export async function eliminarReporte(id) {
  await cliente.delete(`/reportes/${id}/`)
}
