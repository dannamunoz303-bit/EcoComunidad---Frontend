import cliente from './cliente.js'
import { todosLosResultados } from './paginacion.js'

// Novedades (sección 4.8). Cada una: { id, reporte (id), reporte_titulo, tarea (id o null),
// creado_por { id, nombre, apellido }, tipo, descripcion, estado, respuesta, fecha }.

export async function listarNovedades({ estado, tipo, reporte } = {}) {
  const params = {}
  if (estado) params.estado = estado
  if (tipo) params.tipo = tipo
  if (reporte) params.reporte = reporte
  const { data } = await cliente.get('/novedades/', { params })
  return todosLosResultados(data)
}

export async function obtenerNovedad(id) {
  const { data } = await cliente.get(`/novedades/${id}/`)
  return data
}

// RN-18: una sola vez, solo si está abierta; la novedad queda atendida.
export async function responderNovedad(id, respuesta) {
  const { data } = await cliente.post(`/novedades/${id}/responder/`, { respuesta })
  return data
}
