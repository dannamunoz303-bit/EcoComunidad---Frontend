import cliente from './cliente.js'
import { todosLosResultados } from './paginacion.js'

// Tareas del administrador (RN-11, RN-12). Cada respuesta trae:
// { id, reporte: { id, titulo, categoria, direccion, …, estado }, gestor: { id, nombre, apellido },
//   asignado_por, estado, fecha_asignacion, fecha_fin }

export async function listarTareas({ estado, gestor, reporte } = {}) {
  const params = {}
  if (estado) params.estado = estado
  if (gestor) params.gestor = gestor
  if (reporte) params.reporte = reporte
  const { data } = await cliente.get('/tareas/', { params })
  return todosLosResultados(data)
}

export async function asignarTarea(reporteId, gestorId) {
  const { data } = await cliente.post('/tareas/', { reporte: reporteId, gestor: gestorId })
  return data
}

export async function cancelarTarea(tareaId) {
  const { data } = await cliente.post(`/tareas/${tareaId}/cancelar/`)
  return data
}

// Cancela la tarea actual y crea otra para el nuevo gestor; responde la tarea nueva.
export async function reasignarTarea(tareaId, gestorId) {
  const { data } = await cliente.post(`/tareas/${tareaId}/reasignar/`, { gestor: gestorId })
  return data
}
