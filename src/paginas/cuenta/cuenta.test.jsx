import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import cliente, { EVENTO_CONTRASENA_PENDIENTE, EVENTO_SESION_CERRADA } from '../../api/cliente.js'
import { guardarSesion, leerAccess, leerRefresh } from '../../api/sesion.js'
import { ADMIN, montar, pedidos, responder, simularApi, urlActual } from '../../pruebas/apiSimulada.jsx'

const YO = { ...ADMIN, telefono: null, estado: 'activo', fecha_registro: '2026-09-01T10:00:00-05:00', debe_cambiar_contrasena: false }
const CAMBIO = 'POST /auth/cambiar-contrasena/'
const TOKENS_NUEVOS = { access: 'acc-nuevo', refresh: 'ref-nuevo' }

function abrir(ruta, { yo = YO, rutas = {} } = {}) {
  guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
  const adaptador = simularApi({
    'GET /auth/yo/': (c) => responder(c, 200, yo),
    [CAMBIO]: (c) => responder(c, 200, TOKENS_NUEVOS),
    'GET /dashboard/resumen/': (c) => responder(c, 500),
    ...rutas,
  })
  montar(ruta)
  return adaptador
}

const escribir = ({ actual = 'Temporal-123', nueva = 'Nueva-Clave-2026', confirmar = nueva } = {}) => {
  fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: actual } })
  fireEvent.change(screen.getByLabelText('Contraseña nueva'), { target: { value: nueva } })
  fireEvent.change(screen.getByLabelText('Confirmar contraseña nueva'), { target: { value: confirmar } })
}
const enviar = () => fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }))
const aviso = (texto) => screen.findByText(texto, { selector: '.aviso-flotante__texto' })
const cuerpo = (adaptador) => JSON.parse(adaptador.mock.calls.find(([c]) => c.url === '/auth/cambiar-contrasena/')[0].data)

beforeEach(() => {
  simularApi({})
})

describe('Mi cuenta', () => {
  it('se abre desde el nombre en la barra superior y muestra los datos de /yo/', async () => {
    abrir('/')
    const enlace = await screen.findByRole('link', { name: 'Mi cuenta (Laura Gómez)' })
    expect(enlace).toHaveAttribute('href', '/mi-cuenta')

    fireEvent.click(enlace)

    expect(await screen.findByRole('heading', { level: 1, name: 'Mi cuenta' })).toBeInTheDocument()
    const datos = screen.getByRole('region', { name: 'Mis datos' })
    expect(datos).toHaveTextContent('Laura')
    expect(datos).toHaveTextContent('Gómez')
    expect(datos).toHaveTextContent('laura@eco.co')
    expect(datos).toHaveTextContent('Administrador')
    expect(datos).toHaveTextContent('1 de septiembre de 2026')
    expect(screen.getByText('No puede parecerse a tu correo, nombre o apellido.')).toBeInTheDocument()
  })

  it('no deja enviar si las contraseñas no coinciden', async () => {
    const adaptador = abrir('/mi-cuenta')
    await screen.findByLabelText('Contraseña actual')

    escribir({ confirmar: 'Otra-Clave-2026' })
    enviar()

    const confirmar = screen.getByLabelText('Confirmar contraseña nueva')
    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeInTheDocument()
    expect(confirmar).toHaveAttribute('aria-invalid', 'true')
    expect(pedidos(adaptador, CAMBIO)).toBe(0)
  })

  it('muestra el error del backend junto a la contraseña actual', async () => {
    abrir('/mi-cuenta', {
      rutas: { [CAMBIO]: (c) => responder(c, 400, { contrasena_actual: ['La contraseña actual no es correcta.'] }) },
    })
    await screen.findByLabelText('Contraseña actual')

    escribir()
    enviar()

    expect(await screen.findByText('La contraseña actual no es correcta.')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña actual')).toHaveAttribute('aria-invalid', 'true')
    expect(leerAccess()).toBe('acc-1')
  })

  it('los errores de la nueva contraseña se muestran junto a ese campo', async () => {
    abrir('/mi-cuenta', {
      rutas: {
        [CAMBIO]: (c) =>
          responder(c, 400, { contrasena_nueva: ['Esta contraseña es demasiado común.', 'Esta contraseña es completamente numérica.'] }),
      },
    })
    await screen.findByLabelText('Contraseña actual')

    escribir({ nueva: '12345678' })
    enviar()

    expect(await screen.findByText('Esta contraseña es demasiado común. Esta contraseña es completamente numérica.')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña nueva')).toHaveAttribute('aria-invalid', 'true')
  })

  it('al cambiarla guarda los tokens nuevos, limpia el formulario y avisa', async () => {
    const adaptador = abrir('/mi-cuenta')
    await screen.findByLabelText('Contraseña actual')

    escribir()
    enviar()

    expect(await aviso('Contraseña actualizada.')).toBeInTheDocument()
    expect(cuerpo(adaptador)).toEqual({ contrasena_actual: 'Temporal-123', contrasena_nueva: 'Nueva-Clave-2026' })
    expect(leerAccess()).toBe('acc-nuevo')
    expect(leerRefresh()).toBe('ref-nuevo')
    expect(screen.getByLabelText('Contraseña actual')).toHaveValue('')
    expect(screen.getByLabelText('Contraseña nueva')).toHaveValue('')
    expect(screen.getByLabelText('Confirmar contraseña nueva')).toHaveValue('')
  })

  it('cada campo tiene su botón para mostrar u ocultar', async () => {
    abrir('/mi-cuenta')
    const actual = await screen.findByLabelText('Contraseña actual')

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña actual' }))
    expect(actual).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Contraseña nueva')).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña actual' }))
    expect(actual).toHaveAttribute('type', 'password')
  })
})

describe('Cambio obligatorio de contraseña', () => {
  const PENDIENTE = { ...YO, debe_cambiar_contrasena: true }

  it.each(['/', '/reportes', '/usuarios', '/mi-cuenta'])(
    'con debe_cambiar_contrasena en /yo/, %s lleva a /cambiar-contrasena',
    async (ruta) => {
      abrir(ruta, { yo: PENDIENTE })

      expect(await screen.findByText('Por seguridad, crea una contraseña nueva antes de continuar.')).toBeInTheDocument()
      expect(urlActual()).toBe('/cambiar-contrasena')
      expect(document.querySelector('.cambio-obligatorio__logo')).toHaveTextContent('EcoComunidad')
      // Sin la barra lateral del panel
      expect(screen.queryByRole('navigation', { name: 'Secciones del panel' })).not.toBeInTheDocument()
    },
  )

  it('al cambiarla guarda los tokens, actualiza la sesión y va al Resumen', async () => {
    abrir('/reportes', { yo: PENDIENTE })
    await screen.findByText('Por seguridad, crea una contraseña nueva antes de continuar.')
    expect(screen.getByText('Es la contraseña temporal o inicial que te dieron.')).toBeInTheDocument()

    escribir()
    enviar()

    expect(await screen.findByRole('heading', { level: 1, name: 'Resumen' })).toBeInTheDocument()
    expect(urlActual()).toBe('/')
    expect(leerAccess()).toBe('acc-nuevo')
    expect(await aviso('Contraseña actualizada.')).toBeInTheDocument()
  })

  it('sin el cambio pendiente, /cambiar-contrasena lleva al Resumen', async () => {
    abrir('/cambiar-contrasena')

    expect(await screen.findByRole('heading', { level: 1, name: 'Resumen' })).toBeInTheDocument()
  })

  it('"Cerrar sesión" sí funciona en la pantalla de cambio', async () => {
    abrir('/', { yo: PENDIENTE })
    await screen.findByText('Por seguridad, crea una contraseña nueva antes de continuar.')

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument()
    expect(leerAccess()).toBeNull()
  })

  it('con debe_cambiar_contrasena en el login, va a /cambiar-contrasena', async () => {
    simularApi({
      'POST /auth/login/': (c) => responder(c, 200, { access: 'acc-1', refresh: 'ref-1', debe_cambiar_contrasena: true }),
      'GET /auth/yo/': (c) => responder(c, 200, PENDIENTE),
    })
    montar('/login')

    fireEvent.change(await screen.findByLabelText('Correo'), { target: { value: 'laura@eco.co' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'Temporal-123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Por seguridad, crea una contraseña nueva antes de continuar.')).toBeInTheDocument()
    expect(urlActual()).toBe('/cambiar-contrasena')
  })

  it('el 403 "debe_cambiar_contrasena" lleva a /cambiar-contrasena sin cerrar la sesión', async () => {
    const cerrada = vi.fn()
    window.addEventListener(EVENTO_SESION_CERRADA, cerrada)
    abrir('/reportes', {
      rutas: {
        'GET /reportes/': (c) =>
          responder(c, 403, { detail: 'Debes cambiar tu contraseña antes de continuar.', code: 'debe_cambiar_contrasena' }),
        'GET /categorias/': (c) => responder(c, 200, []),
      },
    })

    expect(await screen.findByText('Por seguridad, crea una contraseña nueva antes de continuar.')).toBeInTheDocument()
    expect(urlActual()).toBe('/cambiar-contrasena')
    expect(leerAccess()).toBe('acc-1')
    expect(leerRefresh()).toBe('ref-1')
    expect(cerrada).not.toHaveBeenCalled()
    window.removeEventListener(EVENTO_SESION_CERRADA, cerrada)
  })
})

describe('Interceptor: 403 "debe_cambiar_contrasena"', () => {
  let alPedir
  let alCerrar
  beforeEach(() => {
    alPedir = vi.fn()
    alCerrar = vi.fn()
    window.addEventListener(EVENTO_CONTRASENA_PENDIENTE, alPedir)
    window.addEventListener(EVENTO_SESION_CERRADA, alCerrar)
  })
  afterEach(() => {
    window.removeEventListener(EVENTO_CONTRASENA_PENDIENTE, alPedir)
    window.removeEventListener(EVENTO_SESION_CERRADA, alCerrar)
  })

  it('avisa con su evento y conserva los tokens', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    simularApi({ 'GET /reportes/': (c) => responder(c, 403, { detail: 'x', code: 'debe_cambiar_contrasena' }) })

    await expect(cliente.get('/reportes/')).rejects.toMatchObject({ response: { status: 403 } })

    expect(alPedir).toHaveBeenCalledTimes(1)
    expect(alCerrar).not.toHaveBeenCalled()
    expect(leerAccess()).toBe('acc-1')
  })
})

describe('Restablecer contraseña', () => {
  const OTRO = {
    id: 40, nombre: 'Carlos', apellido: 'Ríos', cedula: '1040', correo: 'carlos@eco.co', telefono: null,
    rol: 'gestor', estado: 'activo', bloqueado_hasta: null, fecha_registro: '2026-09-01T10:00:00-05:00',
  }
  const YO_COMO_USUARIO = { ...OTRO, id: 1, nombre: 'Laura', apellido: 'Gómez', rol: 'administrador', cedula: null }
  let portapapeles

  beforeEach(() => {
    portapapeles = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: portapapeles }, configurable: true })
  })
  afterEach(() => {
    delete navigator.clipboard
  })

  it('pide confirmación, muestra la temporal una sola vez y "Copiar" funciona', async () => {
    const adaptador = abrir('/usuarios/40', {
      rutas: {
        'GET /usuarios/40/': (c) => responder(c, 200, OTRO),
        'POST /usuarios/40/restablecer-contrasena/': (c) => responder(c, 200, { contrasena_temporal: 'Xk7mQ2pRt9Za' }),
      },
    })
    await screen.findByRole('heading', { level: 2, name: 'Carlos Ríos' })

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer contraseña' }))
    const confirmacion = await screen.findByRole('dialog', { name: '¿Restablecer la contraseña?' })
    expect(confirmacion).toHaveTextContent(
      'Se generará una contraseña temporal para Carlos Ríos. Deberá cambiarla al iniciar sesión. La temporal se mostrará una sola vez.',
    )
    fireEvent.click(within(confirmacion).getByRole('button', { name: 'Restablecer contraseña' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Contraseña temporal' })
    expect(within(dialogo).getByText('Xk7mQ2pRt9Za')).toHaveClass('contrasena-temporal')
    expect(dialogo).toHaveTextContent('Entrégasela a Carlos Ríos de forma segura. No se volverá a mostrar.')
    expect(pedidos(adaptador, 'POST /usuarios/40/restablecer-contrasena/')).toBe(1)

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Copiar' }))
    await waitFor(() => expect(portapapeles).toHaveBeenCalledWith('Xk7mQ2pRt9Za'))

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Listo' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Xk7mQ2pRt9Za')).not.toBeInTheDocument()
  })

  it('no aparece para uno mismo: lleva a Mi cuenta', async () => {
    abrir('/usuarios/1', { rutas: { 'GET /usuarios/1/': (c) => responder(c, 200, YO_COMO_USUARIO) } })
    await screen.findByRole('heading', { level: 2, name: 'Laura Gómez' })

    expect(screen.queryByRole('button', { name: 'Restablecer contraseña' })).not.toBeInTheDocument()
    expect(screen.getByText(/Para cambiar tu contraseña ve a/)).toHaveTextContent('Para cambiar tu contraseña ve a Mi cuenta.')
    expect(screen.getByRole('link', { name: 'Mi cuenta' })).toHaveAttribute('href', '/mi-cuenta')
  })
})
