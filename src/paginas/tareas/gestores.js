import { listarSeguimientoGestores } from '../../api/seguimiento.js'
import { listarUsuarios } from '../../api/usuarios.js'

// Gestores activos (RN-11) con su carga de trabajo (sección 11).
// Si el seguimiento falla, se listan igual, sin la carga.
export async function cargarGestoresActivos() {
  const [usuarios, seguimiento] = await Promise.all([
    listarUsuarios({ rol: 'gestor', estado: 'activo' }),
    listarSeguimientoGestores().catch(() => null),
  ])
  const cargas = new Map((seguimiento ?? []).map((g) => [g.id, g]))
  return usuarios
    .filter((u) => u.rol === 'gestor' && u.estado === 'activo')
    .map((u) => {
      const carga = cargas.get(u.id)
      return {
        id: u.id,
        nombre: u.nombre,
        apellido: u.apellido,
        activas: carga ? carga.asignadas + carga.en_proceso : null,
        atrasadas: carga?.atrasadas ?? 0,
      }
    })
}

const nombreCompleto = (g) => `${g.nombre} ${g.apellido}`

// Menos tareas activas primero; a igual carga, por nombre.
export function ordenarPorCarga(gestores) {
  return [...gestores].sort(
    (a, b) =>
      (a.activas ?? Infinity) - (b.activas ?? Infinity) || nombreCompleto(a).localeCompare(nombreCompleto(b), 'es'),
  )
}
