import cliente from './cliente.js'
import { todosLosResultados } from './paginacion.js'

// El administrador recibe también las categorías inactivas.
export async function listarCategorias() {
  const { data } = await cliente.get('/categorias/')
  return todosLosResultados(data)
}

// Categorías (sección 4.3): { id, nombre, descripcion, activa, urgencia_sugerida }.
// No se borran, se desactivan. urgencia_sugerida (alta, media o baja) es la urgencia
// con la que nacen sus reportes (RN-25); si no se envía, el backend usa media.

export async function crearCategoria({ nombre, descripcion, urgencia_sugerida }) {
  const datos = { nombre, descripcion }
  if (urgencia_sugerida) datos.urgencia_sugerida = urgencia_sugerida
  const { data } = await cliente.post('/categorias/', datos)
  return data
}

// Solo los campos que cambiaron: nombre, descripcion y/o urgencia_sugerida.
export async function editarCategoria(id, cambios) {
  const { data } = await cliente.patch(`/categorias/${id}/`, cambios)
  return data
}

export async function desactivarCategoria(id) {
  const { data } = await cliente.post(`/categorias/${id}/desactivar/`)
  return data
}

export async function activarCategoria(id) {
  const { data } = await cliente.post(`/categorias/${id}/activar/`)
  return data
}
