import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import cliente, { EVENTO_SESION_CERRADA } from './cliente.js'
import { guardarSesion, leerAccess, leerRefresh } from './sesion.js'

// Simula la red: el adaptador de axios responde sin llamar al backend.
function responder(config, status, data = {}) {
  const respuesta = { data, status, statusText: '', headers: {}, config }
  if (status >= 200 && status < 300) return Promise.resolve(respuesta)
  return Promise.reject(new AxiosError(`Error ${status}`, AxiosError.ERR_BAD_RESPONSE, config, null, respuesta))
}

const esRefresh = (config) => config.url.endsWith('/auth/refresh/')
const autorizacion = (config) => config.headers.Authorization

let adaptador
let alCerrarSesion

beforeEach(() => {
  adaptador = vi.fn()
  cliente.defaults.adapter = adaptador
  alCerrarSesion = vi.fn()
  window.addEventListener(EVENTO_SESION_CERRADA, alCerrarSesion)
})

afterEach(() => {
  window.removeEventListener(EVENTO_SESION_CERRADA, alCerrarSesion)
})

describe('interceptor de la API', () => {
  it('agrega "Authorization: Bearer <access>"', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    adaptador.mockImplementation((config) => responder(config, 200, { ok: true }))

    await cliente.get('/auth/yo/')

    expect(autorizacion(adaptador.mock.calls[0][0])).toBe('Bearer acc-1')
  })

  it('ante un 401 hace refresh y repite la petición', async () => {
    guardarSesion({ access: 'viejo', refresh: 'ref-1' })
    adaptador.mockImplementation((config) => {
      if (esRefresh(config)) return responder(config, 200, { access: 'nuevo' })
      if (autorizacion(config) === 'Bearer viejo') return responder(config, 401)
      return responder(config, 200, { correo: 'admin@eco.co' })
    })

    const respuesta = await cliente.get('/auth/yo/')

    expect(respuesta.data).toEqual({ correo: 'admin@eco.co' })
    expect(adaptador.mock.calls.filter(([c]) => esRefresh(c))).toHaveLength(1)
    const refresh = adaptador.mock.calls.find(([c]) => esRefresh(c))[0]
    expect(JSON.parse(refresh.data)).toEqual({ refresh: 'ref-1' })
    expect(autorizacion(refresh)).toBeUndefined()
    expect(leerAccess()).toBe('nuevo')
    expect(alCerrarSesion).not.toHaveBeenCalled()
  })

  it('si el refresh falla, borra la sesión y lanza "sesion-cerrada"', async () => {
    guardarSesion({ access: 'viejo', refresh: 'vencido' })
    adaptador.mockImplementation((config) =>
      esRefresh(config) ? responder(config, 401, { detail: 'Token inválido' }) : responder(config, 401),
    )

    await expect(cliente.get('/reportes/')).rejects.toMatchObject({ response: { status: 401 } })

    expect(leerAccess()).toBeNull()
    expect(leerRefresh()).toBeNull()
    expect(alCerrarSesion).toHaveBeenCalledTimes(1)
  })

  it('dos 401 simultáneos esperan un solo refresh', async () => {
    guardarSesion({ access: 'viejo', refresh: 'ref-1' })
    adaptador.mockImplementation((config) => {
      if (esRefresh(config)) return responder(config, 200, { access: 'nuevo' })
      if (autorizacion(config) === 'Bearer viejo') return responder(config, 401)
      return responder(config, 200, { url: config.url })
    })

    const [a, b] = await Promise.all([cliente.get('/reportes/'), cliente.get('/tareas/')])

    expect(a.data.url).toBe('/reportes/')
    expect(b.data.url).toBe('/tareas/')
    expect(adaptador.mock.calls.filter(([c]) => esRefresh(c))).toHaveLength(1)
  })

  it.each([
    ['usuario_inactivo', null],
    ['usuario_bloqueado', '2026-10-20T08:00:00-05:00'],
    ['usuario_bloqueado_permanente', null],
  ])('un 403 con code "%s" cierra la sesión y pasa los datos del backend', async (code, bloqueadoHasta) => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    const detail = 'Texto del backend'
    adaptador.mockImplementation((config) =>
      responder(config, 403, { detail, code, bloqueado_hasta: bloqueadoHasta }),
    )

    await expect(cliente.get('/reportes/')).rejects.toMatchObject({ response: { status: 403 } })

    expect(leerAccess()).toBeNull()
    expect(leerRefresh()).toBeNull()
    expect(alCerrarSesion).toHaveBeenCalledTimes(1)
    expect(alCerrarSesion.mock.calls[0][0].detail).toEqual({ mensaje: detail, code, bloqueadoHasta })
  })

  it('un 403 sin code de estado no cierra la sesión, aunque el texto hable de bloqueo', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    adaptador.mockImplementation((config) =>
      responder(config, 403, { detail: 'No puedes editar un reporte bloqueado.' }),
    )

    await expect(cliente.get('/reportes/')).rejects.toBeTruthy()

    expect(leerAccess()).toBe('acc-1')
    expect(alCerrarSesion).not.toHaveBeenCalled()
  })

  it('si el refresh responde 403 de estado, el aviso lleva el code', async () => {
    guardarSesion({ access: 'viejo', refresh: 'ref-1' })
    adaptador.mockImplementation((config) =>
      esRefresh(config)
        ? responder(config, 403, { detail: 'x', code: 'usuario_inactivo', bloqueado_hasta: null })
        : responder(config, 401),
    )

    await expect(cliente.get('/reportes/')).rejects.toBeTruthy()

    expect(leerRefresh()).toBeNull()
    expect(alCerrarSesion).toHaveBeenCalledTimes(1)
    expect(alCerrarSesion.mock.calls[0][0].detail.code).toBe('usuario_inactivo')
  })

  it('si el refresh no tiene respuesta, conserva la sesión y lanza el error de red', async () => {
    guardarSesion({ access: 'viejo', refresh: 'ref-1' })
    adaptador.mockImplementation((config) =>
      esRefresh(config)
        ? Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, {}))
        : responder(config, 401),
    )

    const error = await cliente.get('/reportes/').catch((e) => e)

    expect(error.response).toBeUndefined()
    expect(error.code).toBe(AxiosError.ERR_NETWORK)
    expect(leerRefresh()).toBe('ref-1')
    expect(alCerrarSesion).not.toHaveBeenCalled()
  })

  it('un 401 sin refresh guardado cierra la sesión', async () => {
    guardarSesion({ access: 'viejo' })
    adaptador.mockImplementation((config) => responder(config, 401))

    await expect(cliente.get('/reportes/')).rejects.toMatchObject({ response: { status: 401 } })

    expect(leerAccess()).toBeNull()
    expect(alCerrarSesion).toHaveBeenCalledTimes(1)
  })

  it.each([500, 502, 503, 504])('si el refresh responde %i, conserva la sesión y lanza ese error', async (status) => {
    guardarSesion({ access: 'viejo', refresh: 'ref-1' })
    adaptador.mockImplementation((config) =>
      esRefresh(config) ? responder(config, status) : responder(config, 401),
    )

    const error = await cliente.get('/reportes/').catch((e) => e)

    expect(error.response.status).toBe(status)
    expect(leerRefresh()).toBe('ref-1')
    expect(alCerrarSesion).not.toHaveBeenCalled()
  })

  it('un 401 en el login no intenta refresh', async () => {
    adaptador.mockImplementation((config) => responder(config, 401, { detail: 'Credenciales incorrectas' }))

    await expect(cliente.post('/auth/login/', { correo: 'a@b.co', password: 'x' })).rejects.toBeTruthy()

    expect(adaptador).toHaveBeenCalledTimes(1)
    expect(alCerrarSesion).not.toHaveBeenCalled()
  })
})
