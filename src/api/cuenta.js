import cliente from './cliente.js'

// Cambia la propia contraseña (RN-03, RN-05). Responde { access, refresh } nuevos.
// Un 400 trae el motivo en contrasena_actual o contrasena_nueva.
export async function cambiarContrasena(contrasenaActual, contrasenaNueva) {
  const { data } = await cliente.post('/auth/cambiar-contrasena/', {
    contrasena_actual: contrasenaActual,
    contrasena_nueva: contrasenaNueva,
  })
  return data
}
