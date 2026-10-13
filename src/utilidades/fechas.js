const ZONA_COLOMBIA = 'America/Bogota'

const formatoFecha = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: ZONA_COLOMBIA,
})

const formatoHora = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: ZONA_COLOMBIA,
})

// Algunos navegadores ponen espacios no separables en la hora ("p. m."); se dejan espacios normales.
const ESPACIOS_ESPECIALES = new RegExp('[\\u00a0\\u202f]', 'g')
const espaciosNormales = (texto) => texto.replace(ESPACIOS_ESPECIALES, ' ')

// "a. m." y "p. m." no se parten al final de una línea.
const PERIODO_DEL_DIA = / ([ap]\.) (m\.)/
const NO_SEPARABLE = String.fromCharCode(0xa0)

// "15 de octubre de 2026, 3:00 p. m." en hora de Colombia.
export function formatearFechaHora(valor) {
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return null
  return espaciosNormales(`${formatoFecha.format(fecha)}, ${formatoHora.format(fecha)}`).replace(
    PERIODO_DEL_DIA,
    `${NO_SEPARABLE}$1${NO_SEPARABLE}$2`,
  )
}

const formatoDiaIso = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: ZONA_COLOMBIA,
})

// Fecha de hoy en Colombia como "AAAA-MM-DD".
export function fechaHoyColombia(ahora = new Date()) {
  return formatoDiaIso.format(ahora)
}

const formatoDiaDeHoy = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: ZONA_COLOMBIA,
})

// "martes, 13 de octubre" en hora de Colombia.
export function formatearDiaDeHoy(ahora = new Date()) {
  return formatoDiaDeHoy.format(ahora)
}

// Una fecha "AAAA-MM-DD" ya es un día de Colombia: se lee en UTC para no correrla.
function diaCalendario(fechaIso) {
  const [anio, mes, dia] = fechaIso.split('-').map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia))
}

const LETRAS_DIA = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

// "2026-10-13" → "M"
export function letraDelDia(fechaIso) {
  return LETRAS_DIA[diaCalendario(fechaIso).getUTCDay()]
}

const formatoNombreDia = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})

// "2026-10-13" → "martes, 13 de octubre"
export function nombreDelDia(fechaIso) {
  return formatoNombreDia.format(diaCalendario(fechaIso))
}

const formatoRelativo = new Intl.RelativeTimeFormat('es', { numeric: 'always' })

const UNIDADES = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
]

// "hace 2 horas", "hace 3 días"…
export function tiempoRelativo(valor, ahora = Date.now()) {
  const segundos = Math.max(0, Math.round((ahora - new Date(valor).getTime()) / 1000))
  for (const [unidad, tamano] of UNIDADES) {
    if (segundos >= tamano) return formatoRelativo.format(-Math.floor(segundos / tamano), unidad)
  }
  return formatoRelativo.format(-segundos, 'second')
}

const formatoFechaCorta = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: ZONA_COLOMBIA,
})

// "13 oct. 2026" en hora de Colombia.
export function formatearFechaCorta(valor) {
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return null
  const partes = Object.fromEntries(formatoFechaCorta.formatToParts(fecha).map((p) => [p.type, p.value]))
  const mes = partes.month.endsWith('.') ? partes.month : `${partes.month}.`
  return `${partes.day} ${mes} ${partes.year}`
}
