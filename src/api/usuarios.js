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

export async function obtenerUsuario(id) {
  const { data } = await cliente.get(`/usuarios/${id}/`)
  return data
}

// Crea un gestor o un administrador (RN-01): { nombre, apellido, cedula, correo, password, telefono, rol }.
// La cédula es obligatoria para el gestor (RN-02); la contraseña pasa por los validadores de Django (RN-03).
export async function crearUsuario(datos) {
  const { data } = await cliente.post('/usuarios/', datos)
  return data
}

// Solo nombre, apellido, cedula, correo y telefono; rol, estado y contraseña no se cambian.
export async function editarUsuario(id, cambios) {
  const { data } = await cliente.patch(`/usuarios/${id}/`, cambios)
  return data
}

// RN-05: solo gestores o ciudadanos que no estén inactivos.
export async function inactivarUsuario(id) {
  const { data } = await cliente.post(`/usuarios/${id}/inactivar/`)
  return data
}

// El ciudadano puede quedar bloqueado si tiene un bloqueo vigente (RN-21).
export async function reactivarUsuario(id) {
  const { data } = await cliente.post(`/usuarios/${id}/reactivar/`)
  return data
}

// RN-05: genera una contraseña temporal que se muestra una sola vez ({ contrasena_temporal }).
// El usuario deberá cambiarla al iniciar sesión. No vale para uno mismo.
export async function restablecerContrasena(id) {
  const { data } = await cliente.post(`/usuarios/${id}/restablecer-contrasena/`)
  return data
}
