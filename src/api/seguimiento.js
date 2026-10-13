import cliente from './cliente.js'
import { todosLosResultados } from './paginacion.js'

// Sección 11. Por gestor: { id, nombre, apellido, estado, asignadas, en_proceso, terminadas,
// canceladas, horas_promedio, atrasadas }.
export async function listarSeguimientoGestores() {
  const { data } = await cliente.get('/seguimiento/gestores/')
  return todosLosResultados(data)
}

// Un gestor con sus conteos y sus tareas_activas [{ id, reporte, estado, fecha_asignacion, ultima_accion, atrasada }].
export async function obtenerSeguimientoGestor(id) {
  const { data } = await cliente.get(`/seguimiento/gestores/${id}/`)
  return data
}
