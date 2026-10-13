import { render } from '@testing-library/react'
import { AxiosError } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import cliente from '../api/cliente.js'
import App from '../App.jsx'
import ProveedorSesion from '../sesion/ProveedorSesion.jsx'
import UbicacionActual from './UbicacionActual.jsx'

// API simulada para las pruebas: el adaptador de axios responde sin llamar al backend.

export const ADMIN = { id: 1, nombre: 'Laura', apellido: 'Gómez', correo: 'laura@eco.co', rol: 'administrador' }

export function responder(config, status, data = {}) {
  const respuesta = { data, status, statusText: '', headers: {}, config }
  if (status >= 200 && status < 300) return Promise.resolve(respuesta)
  return Promise.reject(new AxiosError(`Error ${status}`, AxiosError.ERR_BAD_RESPONSE, config, null, respuesta))
}

export const sinConexion = (config) =>
  Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, {}))

// rutas: { 'POST /auth/login/': (config) => Promise, ... }
export function simularApi(rutas) {
  const adaptador = vi.fn((config) => {
    const clave = `${config.method.toUpperCase()} ${config.url}`
    const manejador = rutas[clave]
    if (!manejador) return responder(config, 404, { detail: `Sin simular: ${clave}` })
    return manejador(config)
  })
  cliente.defaults.adapter = adaptador
  return adaptador
}

export const loginCorrecto = (usuario = ADMIN) => ({
  'POST /auth/login/': (c) => responder(c, 200, { access: 'acc-1', refresh: 'ref-1' }),
  'GET /auth/yo/': (c) => responder(c, 200, usuario),
})

export function montar(ruta = '/') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <ProveedorSesion>
        <App />
        <UbicacionActual />
      </ProveedorSesion>
    </MemoryRouter>,
  )
}

export const urlActual = () => document.querySelector('[data-testid="url-actual"]').textContent

// Cuántas veces se pidió una ruta ("GET /dashboard/resumen/").
export function pedidos(adaptador, clave) {
  return adaptador.mock.calls.filter(([c]) => `${c.method.toUpperCase()} ${c.url}` === clave).length
}
