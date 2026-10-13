import cliente from './cliente.js'
import { todosLosResultados } from './paginacion.js'

// El administrador recibe también las categorías inactivas.
export async function listarCategorias() {
  const { data } = await cliente.get('/categorias/')
  return todosLosResultados(data)
}

// Categorías (sección 4.3): { id, nombre, descripcion, activa }. No se borran, se desactivan.

export async function crearCategoria({ nombre, descripcion }) {
  const { data } = await cliente.post('/categorias/', { nombre, descripcion })
  return data
}

// Solo los campos que cambiaron: nombre y/o descripcion.
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
