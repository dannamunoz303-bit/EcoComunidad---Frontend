// Coordenadas del reporte (RN-06): latitud entre -90 y 90, longitud entre -180 y 180.
// Si traen más de 8 decimales se redondean a 8 antes de validar el rango.

export const DECIMALES = 8

const LIMITES = {
  latitud: { maximo: 90, rango: 'La latitud debe estar entre -90 y 90.' },
  longitud: { maximo: 180, rango: 'La longitud debe estar entre -180 y 180.' },
}

export const MENSAJE_FORMATO = 'Escribe un número con punto decimal, por ejemplo 4.71098600.'

const NUMERO = /^[-+]?(\d+(\.\d*)?|\.\d+)$/

const redondear = (numero) => Number(numero.toFixed(DECIMALES))

// "4,7" y "4.7" valen igual (en Colombia se usa coma decimal).
// Devuelve { valor } con el número redondeado, o { error } con el mensaje para mostrar.
export function leerCoordenada(texto, tipo) {
  const limpio = String(texto ?? '')
    .trim()
    .replace(',', '.')
  if (!NUMERO.test(limpio)) return { error: MENSAJE_FORMATO }
  const valor = redondear(Number(limpio))
  if (Math.abs(valor) > LIMITES[tipo].maximo) return { error: LIMITES[tipo].rango }
  return { valor }
}

// Texto con 8 decimales, como lo guarda el backend.
export const conOchoDecimales = (numero) => numero.toFixed(DECIMALES)
