import { formatearFechaHoraCorta } from './fechas.js'

// Tipos de sanción (sección 4.9).
export const NOMBRES_TIPO_SANCION = {
  advertencia: 'Advertencia',
  bloqueo_temporal: 'Bloqueo temporal',
  bloqueo_permanente: 'Bloqueo permanente',
}

// Tipos con su efecto (RN-21; el bloqueo temporal dura 2 días, RN-20).
export const TIPOS_SANCION = [
  { valor: 'advertencia', efecto: 'No cambia su cuenta. Queda en su historial.' },
  { valor: 'bloqueo_temporal', efecto: 'No podrá iniciar sesión durante 2 días.' },
  { valor: 'bloqueo_permanente', efecto: 'No podrá iniciar sesión hasta que un administrador levante el bloqueo.' },
]

// Estados del reporte en que se puede sancionar al causante (RN-27).
export const ESTADOS_SANCIONAR_CAUSANTE = ['aprobado', 'asignado', 'en_proceso', 'resuelto']

// Igual que el backend (RN-21): permanentes sin fecha_fin y temporales que terminan en el futuro.
export function esBloqueoVigente(sancion, ahora = Date.now()) {
  if (sancion.tipo === 'bloqueo_permanente') return !sancion.fecha_fin
  if (sancion.tipo === 'bloqueo_temporal') return Boolean(sancion.fecha_fin) && new Date(sancion.fecha_fin) > ahora
  return false
}

export const tieneBloqueoVigente = (sanciones, ahora = Date.now()) =>
  (sanciones ?? []).some((s) => esBloqueoVigente(s, ahora))

// Línea de vigencia bajo el tipo. La advertencia no tiene.
export function textoVigencia(sancion, ahora = Date.now()) {
  if (sancion.tipo === 'bloqueo_permanente') {
    return sancion.fecha_fin ? `Levantado el ${formatearFechaHoraCorta(sancion.fecha_fin)}` : 'Vigente'
  }
  if (sancion.tipo === 'bloqueo_temporal' && sancion.fecha_fin) {
    const fin = formatearFechaHoraCorta(sancion.fecha_fin)
    return new Date(sancion.fecha_fin) > ahora ? `Vigente hasta ${fin}` : `Terminó el ${fin}`
  }
  return null
}

// "Tiene 1 sanción previa por un reporte erróneo." (RN-20 cuenta solo las ligadas a un reporte)
export function razonSugerencia(conReporte) {
  if (!conReporte) return 'No tiene sanciones previas por reportes erróneos.'
  return conReporte === 1
    ? 'Tiene 1 sanción previa por un reporte erróneo.'
    : `Tiene ${conReporte} sanciones previas por reportes erróneos.`
}

// RN-27: la escalera del causante cuenta solo sus sanciones anteriores como causante.
export function razonSugerenciaCausante(comoCausante) {
  if (!comoCausante) return 'No tiene sanciones previas como causante.'
  return comoCausante === 1
    ? 'Tiene 1 sanción previa como causante.'
    : `Tiene ${comoCausante} sanciones previas como causante.`
}
