// Seguimiento a los gestores (sección 11).

// Tareas activas: asignadas + en proceso.
export const activasDe = (gestor) => (gestor.asignadas ?? 0) + (gestor.en_proceso ?? 0)

// "18 h"; "Sin datos" si todavía no termina ninguna tarea (horas_promedio null).
export function textoHoras(horas) {
  if (horas === null || horas === undefined) return 'Sin datos'
  if (horas < 1) return 'Menos de 1 h'
  return `${Math.round(horas)} h`
}
