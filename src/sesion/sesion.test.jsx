import { act, fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { guardarSesion, leerAccess, leerRefresh } from '../api/sesion.js'
import { ADMIN, loginCorrecto, montar, responder, simularApi, sinConexion } from '../pruebas/apiSimulada.jsx'

async function ingresar(correo = 'laura@eco.co', password = 'clave-segura-1') {
  fireEvent.change(await screen.findByLabelText('Correo'), { target: { value: correo } })
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
}

const tituloSeccion = (nombre) => screen.findByRole('heading', { level: 1, name: nombre })

beforeEach(() => {
  simularApi({})
})

// ---- Pruebas ----

describe('login', () => {
  it('un administrador entra y llega al Resumen', async () => {
    const adaptador = simularApi(loginCorrecto())
    montar('/login')

    await ingresar()

    expect(await tituloSeccion('Resumen')).toBeInTheDocument()
    expect(screen.getByText('Laura Gómez')).toBeInTheDocument()
    expect(leerAccess()).toBe('acc-1')
    expect(leerRefresh()).toBe('ref-1')
    const login = adaptador.mock.calls.find(([c]) => c.url === '/auth/login/')[0]
    expect(JSON.parse(login.data)).toEqual({ correo: 'laura@eco.co', password: 'clave-segura-1' })
  })

  it('mientras espera, el botón dice "Ingresando…" y está desactivado', async () => {
    let soltar
    simularApi({
      ...loginCorrecto(),
      'POST /auth/login/': (c) =>
        new Promise((resolve) => {
          soltar = () => resolve(responder(c, 200, { access: 'a', refresh: 'r' }))
        }),
    })
    montar('/login')

    await ingresar()

    const boton = await screen.findByRole('button', { name: 'Ingresando…' })
    expect(boton).toBeDisabled()
    await act(async () => soltar())
    expect(await tituloSeccion('Resumen')).toBeInTheDocument()
  })

  it.each([
    ['401', (c) => responder(c, 401, { detail: 'No active account' }), 'Correo o contraseña incorrectos.'],
    [
      'usuario_inactivo',
      (c) => responder(c, 403, { detail: 'x', code: 'usuario_inactivo', bloqueado_hasta: null }),
      'Tu cuenta está inactiva. Habla con otro administrador.',
    ],
    [
      'usuario_bloqueado',
      (c) =>
        responder(c, 403, { detail: 'x', code: 'usuario_bloqueado', bloqueado_hasta: '2026-10-15T15:00:00-05:00' }),
      'Tu cuenta está bloqueada hasta el 15 de octubre de 2026, 3:00 p. m.',
    ],
    [
      'usuario_bloqueado_permanente',
      (c) => responder(c, 403, { detail: 'x', code: 'usuario_bloqueado_permanente', bloqueado_hasta: null }),
      'Tu cuenta está bloqueada de forma permanente.',
    ],
    ['sin conexión', sinConexion, 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.'],
  ])('error %s muestra su mensaje', async (_caso, respuestaLogin, mensaje) => {
    simularApi({ 'POST /auth/login/': respuestaLogin })
    montar('/login')

    await ingresar()

    const aviso = await screen.findByText(mensaje)
    expect(aviso.closest('[aria-live]')).toBeInTheDocument()
    expect(document.querySelector('.icono-estado')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled()
    expect(leerAccess()).toBeNull()
  })

  it('la fecha del bloqueo sale en hora de Colombia aunque venga en UTC', async () => {
    simularApi({
      'POST /auth/login/': (c) =>
        responder(c, 403, { detail: 'x', code: 'usuario_bloqueado', bloqueado_hasta: '2026-10-16T01:30:00Z' }),
    })
    montar('/login')

    await ingresar()

    expect(await screen.findByText('Tu cuenta está bloqueada hasta el 15 de octubre de 2026, 8:30 p. m.')).toBeInTheDocument()
  })

  it.each(['ciudadano', 'gestor'])('un %s no entra y ve que el panel es solo para administradores', async (rol) => {
    simularApi(loginCorrecto({ ...ADMIN, rol }))
    montar('/login')

    await ingresar()

    expect(
      await screen.findByText('Este panel es solo para administradores. Usa la app móvil.'),
    ).toBeInTheDocument()
    expect(leerAccess()).toBeNull()
    expect(leerRefresh()).toBeNull()

    // Tampoco puede abrir una ruta protegida después.
    montar('/reportes')
    expect(screen.queryByRole('heading', { level: 1, name: 'Reportes' })).not.toBeInTheDocument()
  })

  it('el botón de la contraseña la muestra y la oculta', async () => {
    montar('/login')
    const campo = await screen.findByLabelText('Contraseña')
    expect(campo).toHaveAttribute('type', 'password')

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(campo).toHaveAttribute('type', 'text')

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(campo).toHaveAttribute('type', 'password')
  })

  it('con sesión de administrador, /login lleva al Resumen', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    simularApi(loginCorrecto())
    montar('/login')

    expect(await tituloSeccion('Resumen')).toBeInTheDocument()
  })
})

describe('sesión', () => {
  it('sin sesión, una ruta protegida lleva a /login', async () => {
    montar('/reportes')
    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument()
  })

  it('con tokens, comprueba /auth/yo/ mostrando el logo y luego abre la sección', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    const adaptador = simularApi(loginCorrecto())
    montar('/seguimiento')

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByLabelText('Correo')).not.toBeInTheDocument()
    expect(await tituloSeccion('Seguimiento')).toBeInTheDocument()
    // La sección se descarga aparte (carga diferida)
    expect(await screen.findByRole('switch', { name: 'Solo con tareas atrasadas' })).toBeInTheDocument()
    expect(adaptador.mock.calls.some(([c]) => c.url === '/auth/yo/')).toBe(true)
  })

  it('un gestor con tokens guardados no entra', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    simularApi(loginCorrecto({ ...ADMIN, rol: 'gestor' }))
    montar('/')

    expect(
      await screen.findByText('Este panel es solo para administradores. Usa la app móvil.'),
    ).toBeInTheDocument()
    expect(leerAccess()).toBeNull()
  })

  it('el evento "sesion-cerrada" lleva a /login con el motivo', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    simularApi(loginCorrecto())
    montar('/reportes')
    await tituloSeccion('Reportes')

    act(() => {
      window.dispatchEvent(
        new CustomEvent('sesion-cerrada', {
          detail: { mensaje: 'x', code: 'usuario_bloqueado_permanente', bloqueadoHasta: null },
        }),
      )
    })

    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument()
    expect(screen.getByText('Tu cuenta está bloqueada de forma permanente.')).toBeInTheDocument()
    expect(leerAccess()).toBeNull()
  })

  it('un 403 de estado en una petición cierra la sesión y lleva a /login', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    simularApi({
      'GET /auth/yo/': (c) => responder(c, 403, { detail: 'x', code: 'usuario_inactivo', bloqueado_hasta: null }),
    })
    montar('/')

    expect(await screen.findByText('Tu cuenta está inactiva. Habla con otro administrador.')).toBeInTheDocument()
    expect(leerAccess()).toBeNull()
  })

  it('cerrar sesión borra los tokens y lleva a /login', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    simularApi(loginCorrecto())
    montar('/')
    await tituloSeccion('Resumen')

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument()
    expect(leerAccess()).toBeNull()
    expect(leerRefresh()).toBeNull()
  })
})

describe('diseño del panel', () => {
  it('marca la sección activa en la barra lateral', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    simularApi(loginCorrecto())
    montar('/sanciones')
    await tituloSeccion('Sanciones')

    expect(screen.getByRole('link', { name: 'Sanciones' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Resumen' })).not.toHaveAttribute('aria-current')
  })

  it('el botón de menú abre y cierra la barra lateral', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    simularApi(loginCorrecto())
    montar('/')
    await tituloSeccion('Resumen')

    const menu = screen.getByRole('button', { name: 'Abrir menú' })
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(menu)
    expect(menu).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(menu).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('bienvenida', () => {
  const textoBienvenida = '¡Hola de nuevo, Laura! Tu barrio te está esperando.'

  it('sale tras iniciar sesión y queda vista en cuanto aparece', async () => {
    simularApi(loginCorrecto())
    montar('/login')
    await ingresar()

    expect(await screen.findByText(textoBienvenida)).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Bienvenida' }).querySelector('img, [role="img"]')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('ecocomunidad.bienvenida')).toBe('vista')
  })

  it('el botón la cierra', async () => {
    simularApi(loginCorrecto())
    montar('/login')
    await ingresar()

    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar bienvenida' }))

    expect(screen.queryByText(textoBienvenida)).not.toBeInTheDocument()
  })

  it('no vuelve al recargar, aunque no se haya cerrado', async () => {
    simularApi(loginCorrecto())
    const { unmount } = montar('/login')
    await ingresar()
    expect(await screen.findByText(textoBienvenida)).toBeInTheDocument()

    unmount()
    montar('/')
    await tituloSeccion('Resumen')

    expect(screen.queryByText(textoBienvenida)).not.toBeInTheDocument()
  })

  it('no vuelve al ir a otra sección y regresar al Resumen', async () => {
    simularApi(loginCorrecto())
    montar('/login')
    await ingresar()
    expect(await screen.findByText(textoBienvenida)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Reportes' }))
    await tituloSeccion('Reportes')
    fireEvent.click(screen.getByRole('link', { name: 'Resumen' }))
    await tituloSeccion('Resumen')

    expect(screen.queryByText(textoBienvenida)).not.toBeInTheDocument()
  })

  it('vuelve a salir en el siguiente inicio de sesión', async () => {
    simularApi(loginCorrecto())
    montar('/login')
    await ingresar()
    expect(await screen.findByText(textoBienvenida)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    await ingresar()

    expect(await screen.findByText(textoBienvenida)).toBeInTheDocument()
  })

  it('no sale si la sesión ya existía al abrir la app', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    simularApi(loginCorrecto())
    montar('/')
    await tituloSeccion('Resumen')

    expect(screen.queryByText(textoBienvenida)).not.toBeInTheDocument()
  })
})

describe('sin conexión al abrir la app', () => {
  const mensaje = 'No pudimos conectar con el servidor. Revisa tu conexión.'

  it.each(['/', '/reportes', '/login'])('con tokens en %s muestra el aviso y no el login', async (ruta) => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    simularApi({ 'GET /auth/yo/': sinConexion })
    montar(ruta)

    expect(await screen.findByText(mensaje)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'EcoComunidad' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Correo')).not.toBeInTheDocument()
    expect(leerAccess()).toBe('acc-1')
    expect(leerRefresh()).toBe('ref-1')
  })

  it('"Reintentar" vuelve a pedir /auth/yo/ y entra si el servidor responde', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    let conectado = false
    const adaptador = simularApi({
      'GET /auth/yo/': (c) => (conectado ? responder(c, 200, ADMIN) : sinConexion(c)),
    })
    montar('/tareas')
    await screen.findByText(mensaje)
    const pedidosAntes = adaptador.mock.calls.filter(([c]) => c.url === '/auth/yo/').length

    conectado = true
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await tituloSeccion('Tareas')).toBeInTheDocument()
    expect(adaptador.mock.calls.filter(([c]) => c.url === '/auth/yo/').length).toBe(pedidosAntes + 1)
  })

  it('si al reintentar sigue sin conexión, se queda en el aviso', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    simularApi({ 'GET /auth/yo/': sinConexion })
    montar('/')
    await screen.findByText(mensaje)

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeEnabled()
    expect(screen.getByText(mensaje)).toBeInTheDocument()
    expect(leerAccess()).toBe('acc-1')
  })

  it('si al reintentar el servidor responde 401 y el refresh falla, va al login', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    let conectado = false
    simularApi({
      'GET /auth/yo/': (c) => (conectado ? responder(c, 401) : sinConexion(c)),
      'POST /auth/refresh/': (c) => responder(c, 401, { detail: 'Token inválido' }),
    })
    montar('/')
    await screen.findByText(mensaje)

    conectado = true
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument()
    expect(screen.getByText('Tu sesión terminó. Inicia sesión de nuevo.')).toBeInTheDocument()
    expect(leerAccess()).toBeNull()
  })

  it('si al reintentar el servidor responde el 403 de estado, va al login con su mensaje', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    let conectado = false
    simularApi({
      'GET /auth/yo/': (c) =>
        conectado
          ? responder(c, 403, { detail: 'x', code: 'usuario_inactivo', bloqueado_hasta: null })
          : sinConexion(c),
    })
    montar('/')
    await screen.findByText(mensaje)

    conectado = true
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Tu cuenta está inactiva. Habla con otro administrador.')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo')).toBeInTheDocument()
    expect(leerAccess()).toBeNull()
  })

  it.each([500, 502, 503, 504])('si /auth/yo/ responde %i, muestra el aviso y no el login', async (status) => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    simularApi({ 'GET /auth/yo/': (c) => responder(c, status) })
    montar('/login')

    expect(await screen.findByText(mensaje)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Correo')).not.toBeInTheDocument()
    expect(leerAccess()).toBe('acc-1')
  })

  it('tras un 503, "Reintentar" entra cuando el servidor vuelve', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    let disponible = false
    simularApi({ 'GET /auth/yo/': (c) => responder(c, disponible ? 200 : 503, disponible ? ADMIN : {}) })
    montar('/')
    await screen.findByText(mensaje)

    disponible = true
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await tituloSeccion('Resumen')).toBeInTheDocument()
  })

  it('si el refresh responde 503, conserva la sesión y muestra el aviso', async () => {
    guardarSesion({ access: 'viejo', refresh: 'ref-1' })
    simularApi({
      'GET /auth/yo/': (c) => responder(c, 401),
      'POST /auth/refresh/': (c) => responder(c, 503),
    })
    montar('/')

    expect(await screen.findByText(mensaje)).toBeInTheDocument()
    expect(leerRefresh()).toBe('ref-1')
  })

  it('otros errores del servidor (por ejemplo 404) no cuentan como sin conexión', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    simularApi({ 'GET /auth/yo/': (c) => responder(c, 404) })
    montar('/')

    expect(await screen.findByLabelText('Correo')).toBeInTheDocument()
    expect(screen.queryByText(mensaje)).not.toBeInTheDocument()
  })

  it('si el access venció y el refresh no tiene respuesta, también muestra el aviso', async () => {
    guardarSesion({ access: 'viejo', refresh: 'ref-1' })
    simularApi({
      'GET /auth/yo/': (c) => responder(c, 401),
      'POST /auth/refresh/': sinConexion,
    })
    montar('/')

    expect(await screen.findByText(mensaje)).toBeInTheDocument()
    expect(leerRefresh()).toBe('ref-1')
  })
})
