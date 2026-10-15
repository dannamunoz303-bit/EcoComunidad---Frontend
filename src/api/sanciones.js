import cliente from './cliente.js'
import { todosLosResultados } from './paginacion.js'

// Sanciones (sección 4.9, RN-19 a RN-21). Cada una: { id, ciudadano { id, nombre, apellido },
// admin { id, nombre, apellido }, reporte (id o null), tipo, motivo, fecha_inicio, fecha_fin }.
// No se editan ni se borran.

export async function listarSanciones({ ciudadano, tipo } = {}) {
  const params = {}
  if (ciudadano) params.ciudadano = ciudadano
  if (tipo) params.tipo = tipo
  const { data } = await cliente.get('/sanciones/', { params })
  return todosLosResultados(data)
}

// RN-20: { ciudadano, sanciones_con_reporte, sugerencia, sanciones_previas }.
export async function obtenerSugerencia(ciudadano) {
  const { data } = await cliente.get('/sanciones/sugerencia/', { params: { ciudadano } })
  return data
}

// { ciudadano, tipo, motivo, reporte? }. fecha_inicio y fecha_fin las pone el backend.
export async function crearSancion(datos) {
  const { data } = await cliente.post('/sanciones/', datos)
  return data
}
