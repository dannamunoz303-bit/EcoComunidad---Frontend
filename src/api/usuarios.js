import cliente from './cliente.js'
import { todosLosResultados } from './paginacion.js'

// Usuarios vistos por el administrador: { id, nombre, apellido, cedula, correo, telefono,
// rol, estado, bloqueado_hasta, fecha_registro }. La cédula no se muestra donde no hace falta.
export async function listarUsuarios({ rol, estado } = {}) {
  const params = {}
  if (rol) params.rol = rol
  if (estado) params.estado = estado
  const { data } = await cliente.get('/usuarios/', { params })
  return todosLosResultados(data)
}
