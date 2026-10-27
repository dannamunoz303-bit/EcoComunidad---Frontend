// Trazos exactos de logo.svg (y sus variantes), viewBox 0 0 64 64.
export const TRAZOS = {
  losaIzquierda: 'M8 44 H30 L33 49 L29 53 L32 58 H8 Q4 58 4 54 V48 Q4 44 8 44 Z',
  losaDerecha: 'M34 44 H56 Q60 44 60 48 V54 Q60 58 56 58 H36 L33 53 L37 49 Z',
  tallo: 'M33 47 C33 39 31 35 32 27',
  hojaIzquierda: 'M32 35 C24 35 18 30 18 22 C26 22 32 27 32 35 Z',
  hojaDerecha: 'M32 29 C32 21 38 15 46 15 C46 23 40 29 32 29 Z',
}

// Colores de cada versión del logo, tomados de los archivos SVG.
// "eco" y "comunidad" son los colores del nombre junto al logo.
export const VARIANTES = {
  color: {
    losa: '#3A4740',
    tallo: '#1E5A3A',
    hojaIzquierda: '#3E9B63',
    hojaDerecha: '#1E5A3A',
    eco: 'var(--verde-musgo)',
    comunidad: 'var(--verde-bosque)',
  },
  'sobre-verde': {
    losa: '#CFD8D2',
    tallo: '#FFFFFF',
    hojaIzquierda: '#A8D9B8',
    hojaDerecha: '#FFFFFF',
    eco: 'var(--verde-brote)',
    comunidad: '#FFFFFF',
  },
  'un-color': {
    losa: 'currentColor',
    tallo: 'currentColor',
    hojaIzquierda: 'currentColor',
    hojaDerecha: 'currentColor',
    eco: 'currentColor',
    comunidad: 'currentColor',
  },
}
