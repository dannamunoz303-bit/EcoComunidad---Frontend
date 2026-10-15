// Grupos de tipos de notificación (sección 9) para filtrar.
export const GRUPOS = [
  { valor: '', nombre: 'Todos los tipos' },
  { valor: 'reportes', nombre: 'Reportes' },
  { valor: 'tareas', nombre: 'Tareas' },
  { valor: 'novedades', nombre: 'Novedades' },
  { valor: 'cuentas', nombre: 'Cuentas' },
]

const TIPOS_DE_CUENTA = ['sancion', 'bloqueo_levantado', 'contrasena_restablecida']

export function grupoDe(tipo = '') {
  if (tipo.startsWith('reporte_')) return 'reportes'
  if (tipo.startsWith('tarea_')) return 'tareas'
  if (tipo.startsWith('novedad_')) return 'novedades'
  if (TIPOS_DE_CUENTA.includes(tipo)) return 'cuentas'
  return null
}

// Número del círculo de la campana: hasta "9+".
export const textoContador = (total) => (total > 9 ? '9+' : String(total))
