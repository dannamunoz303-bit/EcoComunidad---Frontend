import { URGENCIAS, normalizar } from '../../utilidades/territorio.js'

// Filtros de la lista de reportes. Viven en la URL:
// ?estado=pendiente&categoria=2&urgencia=alta&zona=3&q=parque&eliminados=1&ciudadano=30
// zona=sin muestra los reportes sin municipio (anteriores a RN-23).

export const ZONA_SIN_MUNICIPIO = 'sin'

export const ESTADOS_FILTRO = [
  { valor: '', nombre: 'Todos' },
  { valor: 'pendiente', nombre: 'Pendientes' },
  { valor: 'aprobado', nombre: 'Aprobados' },
  { valor: 'asignado', nombre: 'Asignados' },
  { valor: 'en_proceso', nombre: 'En proceso' },
  { valor: 'resuelto', nombre: 'Resueltos' },
  { valor: 'rechazado', nombre: 'Rechazados' },
]

const zonaValida = (zona) => zona === ZONA_SIN_MUNICIPIO || /^\d+$/.test(zona ?? '')

export function leerFiltros(params) {
  return {
    estado: params.get('estado') ?? '',
    categoria: params.get('categoria') ?? '',
    // Solo urgencias conocidas: se envían al backend tal cual.
    urgencia: URGENCIAS.some((u) => u.valor === params.get('urgencia')) ? params.get('urgencia') : '',
    // Solo un id o "sin": el backend responde vacío ante cualquier otro valor.
    zona: zonaValida(params.get('zona')) ? params.get('zona') : '',
    q: params.get('q') ?? '',
    verEliminados: params.get('eliminados') === '1',
    ciudadano: params.get('ciudadano') ?? '',
  }
}

export const hayFiltros = ({ estado, categoria, urgencia, zona, q, verEliminados, ciudadano }) =>
  Boolean(estado || categoria || urgencia || zona || q.trim() || verEliminados || ciudadano)

// Aplica en el navegador el texto, el ciudadano y "Ver eliminados"; el estado se aplica aparte
// para poder contar cuántos hay en cada uno. La categoría, la urgencia y la zona las filtra el backend.
// No cambia el orden: el backend ya los manda por urgencia y fecha (RN-25).
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
