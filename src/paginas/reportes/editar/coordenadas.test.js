import { describe, expect, it } from 'vitest'
import { CENTRO_COLOMBIA, centroInicial, conOchoDecimales, leerCoordenada, MENSAJE_FORMATO } from './coordenadas.js'

describe('leerCoordenada', () => {
  it.each([
    ['4.71098600', 'latitud', 4.710986],
    ['-90', 'latitud', -90],
    ['90.000000004', 'latitud', 90],
    ['  -74,072092  ', 'longitud', -74.072092],
    ['180', 'longitud', 180],
    ['.5', 'longitud', 0.5],
    ['1.123456789', 'latitud', 1.12345679],
  ])('"%s" como %s vale %d', (texto, tipo, valor) => {
    expect(leerCoordenada(texto, tipo)).toEqual({ valor })
  })

  it.each([
    ['90.00000001', 'latitud', 'La latitud debe estar entre -90 y 90.'],
    ['-180.1', 'longitud', 'La longitud debe estar entre -180 y 180.'],
    ['', 'latitud', MENSAJE_FORMATO],
    ['4.7.1', 'latitud', MENSAJE_FORMATO],
    ['1e2', 'longitud', MENSAJE_FORMATO],
    ['-', 'longitud', MENSAJE_FORMATO],
  ])('"%s" como %s da error', (texto, tipo, error) => {
    expect(leerCoordenada(texto, tipo)).toEqual({ error })
  })

  it('formatea con 8 decimales', () => {
    expect(conOchoDecimales(-74.05)).toBe('-74.05000000')
  })
})

describe('centroInicial', () => {
  const r = (id, latitud, longitud) => ({ id, latitud, longitud })

  it('promedia los reportes con coordenadas válidas, sin contar el que se edita', () => {
    const reportes = [r(1, '2', '-70'), r(2, '4', '-72'), r(3, null, null), r(4, 'x', '1'), r(7, '80', '80')]
    expect(centroInicial(reportes, 7)).toEqual({ centro: [3, -71], zoom: 13 })
  })

  it('sin reportes con coordenadas usa el centro de Colombia', () => {
    expect(centroInicial([r(3, null, null)], 7)).toBe(CENTRO_COLOMBIA)
    expect(centroInicial(undefined, 7)).toEqual({ centro: [4.5709, -74.2973], zoom: 6 })
  })
})
