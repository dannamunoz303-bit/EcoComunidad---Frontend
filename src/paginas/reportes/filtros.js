// Filtros de la lista de reportes. Viven en la URL:
// ?estado=pendiente&categoria=2&q=parque&eliminados=1&ciudadano=30

export const ESTADOS_FILTRO = [
  { valor: '', nombre: 'Todos' },
  { valor: 'pendiente', nombre: 'Pendientes' },
  { valor: 'aprobado', nombre: 'Aprobados' },
  { valor: 'asignado', nombre: 'Asignados' },
  { valor: 'en_proceso', nombre: 'En proceso' },
  { valor: 'resuelto', nombre: 'Resueltos' },
  { valor: 'rechazado', nombre: 'Rechazados' },
]

export function leerFiltros(params) {
  return {
    estado: params.get('estado') ?? '',
    categoria: params.get('categoria') ?? '',
    q: params.get('q') ?? '',
    verEliminados: params.get('eliminados') === '1',
    ciudadano: params.get('ciudadano') ?? '',
  }
}

export const hayFiltros = ({ estado, categoria, q, verEliminados, ciudadano }) =>
  Boolean(estado || categoria || q.trim() || verEliminados || ciudadano)

// Sin tildes ni mayúsculas, para buscar "arbol" y encontrar "Árbol".
const normalizar = (texto) =>
  (texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

// Aplica en el navegador el texto, el ciudadano y "Ver eliminados"; el estado se aplica aparte
// para poder contar cuántos hay en cada uno.
export function filtrarBase(reportes, { q, verEliminados, ciudadano }) {
  const buscado = normalizar(q.trim())
  return reportes.filter(
    (r) =>
      (verEliminados || !r.eliminado) &&
      (!ciudadano || String(r.ciudadano?.id) === ciudadano) &&
      (!buscado || normalizar(r.titulo).includes(buscado) || normalizar(r.direccion).includes(buscado)),
  )
}

export function contarPorEstado(reportes) {
  const conteo = { '': reportes.length }
  for (const { estado } of reportes) conteo[estado] = (conteo[estado] ?? 0) + 1
  return conteo
}

// Del más reciente al más antiguo.
export const ordenarRecientes = (reportes) =>
  [...reportes].sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion) || b.id - a.id)
