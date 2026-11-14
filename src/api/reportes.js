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

// El detalle, para el administrador, trae además causante_cedula y causante (RN-27):
// null si no hay cédula, o { registrado, ciudadano { id, nombre, apellido } | null,
// sanciones_como_causante (número) | null, sugerencia (tipo) | null }.
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

// RN-27: sanciona al ciudadano registrado con la cédula del causante. { tipo, motivo }.
// Responde la sanción creada (por_causante = true). Solo con el reporte aprobado, asignado,
// en proceso o resuelto.
export async function sancionarCausante(id, { tipo, motivo }) {
  const { data } = await cliente.post(`/reportes/${id}/sancionar-causante/`, { tipo, motivo })
  return data
}

// RN-25: alta, media o baja, mientras el reporte no esté eliminado.
export async function cambiarUrgencia(id, urgencia) {
  const { data } = await cliente.post(`/reportes/${id}/urgencia/`, { urgencia })
  return data
}

// Solo los campos que cambiaron: titulo, descripcion, categoria (id de una activa),
// direccion, descripcion_ubicacion, municipio (id; no se puede quitar), vereda, causante_cedula
// (vacía la quita, RN-27), latitud y longitud. Con tareas activas, el municipio no puede pasar a
// otra zona: el backend responde 400 con el error en "municipio" (RN-23).
export async function editarReporte(id, cambios) {
  const { data } = await cliente.patch(`/reportes/${id}/`, cambios)
  return data
}

// Eliminación lógica (RN-09). Responde 204 sin cuerpo.
export async function eliminarReporte(id) {
  await cliente.delete(`/reportes/${id}/`)
}
