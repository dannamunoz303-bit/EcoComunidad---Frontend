import { describe, expect, it } from 'vitest'
import { conOchoDecimales, leerCoordenada, MENSAJE_FORMATO } from './coordenadas.js'

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
