import cliente from './cliente.js'
import { todosLosResultados } from './paginacion.js'

// Territorio del Cauca (secciones 4.11 y 4.12). Solo lectura: se cargan con una migración.

// Zonas: [{ id, nombre }] con nombre norte, centro o sur, ordenadas por nombre.
export async function listarZonas() {
  const { data } = await cliente.get('/zonas/')
  return todosLosResultados(data)
}

// Municipios: [{ id, nombre, zona: { id, nombre } }], ordenados por nombre. Con `zona`, solo los de esa zona.
export async function listarMunicipios({ zona } = {}) {
  const params = {}
  if (zona) params.zona = zona
  const { data } = await cliente.get('/municipios/', { params })
  return todosLosResultados(data)
}
