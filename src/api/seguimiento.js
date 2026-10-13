import cliente from './cliente.js'
import { todosLosResultados } from './paginacion.js'

// Sección 11. Por gestor: { id, nombre, apellido, estado, asignadas, en_proceso, terminadas,
// canceladas, horas_promedio, atrasadas }.
export async function listarSeguimientoGestores() {
  const { data } = await cliente.get('/seguimiento/gestores/')
  return todosLosResultados(data)
}
