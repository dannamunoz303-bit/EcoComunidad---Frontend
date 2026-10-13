// Novedades (sección 4.8, RN-18).

export const NOMBRES_TIPO = { ayuda: 'Ayuda', queja: 'Queja', incidente: 'Incidente' }

// La API no trae el rol de quien creó la novedad. Se toma de /usuarios/ y, si no está,
// de RN-18: la ayuda solo la crea un gestor y la queja solo un ciudadano; el incidente
// de un gestor siempre lleva su tarea, así que sin tarea es de un ciudadano.
export function rolDeCreador(novedad, rolesPorId = {}) {
  const conocido = rolesPorId[novedad.creado_por?.id]
  if (conocido) return conocido
  if (novedad.tipo === 'ayuda') return 'gestor'
  if (novedad.tipo === 'queja') return 'ciudadano'
  if (novedad.tipo === 'incidente' && !novedad.tarea) return 'ciudadano'
  return null
}
