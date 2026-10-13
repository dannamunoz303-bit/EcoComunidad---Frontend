import cliente from './cliente.js'

// Resumen del dashboard (ecocomunidad.md, sección 14).
export async function obtenerResumen() {
  const { data } = await cliente.get('/dashboard/resumen/')
  return data
}
