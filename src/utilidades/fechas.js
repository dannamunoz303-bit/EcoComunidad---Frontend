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

// "15 de octubre de 2026, 3:00 p. m." en hora de Colombia.
export function formatearFechaHora(valor) {
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return null
  return espaciosNormales(`${formatoFecha.format(fecha)}, ${formatoHora.format(fecha)}`)
}
