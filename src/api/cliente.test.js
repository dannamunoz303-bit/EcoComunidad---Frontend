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

  it('un 403 por usuario bloqueado cierra la sesión con el mensaje del backend', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    const detail = 'Tu cuenta está bloqueada hasta el 20/10/2026.'
    adaptador.mockImplementation((config) => responder(config, 403, { detail }))

    await expect(cliente.get('/reportes/')).rejects.toMatchObject({ response: { status: 403 } })

    expect(leerAccess()).toBeNull()
    expect(alCerrarSesion).toHaveBeenCalledTimes(1)
    expect(alCerrarSesion.mock.calls[0][0].detail.mensaje).toBe(detail)
  })

  it('un 403 de permisos normal no cierra la sesión', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    adaptador.mockImplementation((config) =>
      responder(config, 403, { detail: 'No tiene permiso para realizar esta acción.' }),
    )

    await expect(cliente.get('/reportes/')).rejects.toBeTruthy()

    expect(leerAccess()).toBe('acc-1')
    expect(alCerrarSesion).not.toHaveBeenCalled()
  })

  it('un 401 en el login no intenta refresh', async () => {
    adaptador.mockImplementation((config) => responder(config, 401, { detail: 'Credenciales incorrectas' }))

    await expect(cliente.post('/auth/login/', { correo: 'a@b.co', password: 'x' })).rejects.toBeTruthy()

    expect(adaptador).toHaveBeenCalledTimes(1)
    expect(alCerrarSesion).not.toHaveBeenCalled()
  })
})
