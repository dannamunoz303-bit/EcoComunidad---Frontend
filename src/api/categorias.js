import cliente from './cliente.js'
import { todosLosResultados } from './paginacion.js'

// El administrador recibe también las categorías inactivas.
export async function listarCategorias() {
  const { data } = await cliente.get('/categorias/')
  return todosLosResultados(data)
}
