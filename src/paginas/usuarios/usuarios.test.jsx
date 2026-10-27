import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { guardarSesion } from '../../api/sesion.js'
import EstadoUsuario from '../../componentes/EstadoUsuario.jsx'
import { ADMIN, montar, pedidos, responder, simularApi, urlActual } from '../../pruebas/apiSimulada.jsx'
import { contienePersonales, generarContrasena, LARGO_CONTRASENA } from './contrasena.js'

// GET /api/usuarios/ (UsuarioAdminSerializer)
const usuario = (id, rol, nombre, apellido, cambios = {}) => ({
  id,
  nombre,
  apellido,
  cedula: `10${id}`,
  correo: `${nombre.toLowerCase()}@eco.co`,
  telefono: null,
  rol,
  estado: 'activo',
  bloqueado_hasta: null,
  fecha_registro: '2026-09-01T10:00:00-05:00',
  ...cambios,
})

const USUARIOS = [
  usuario(40, 'gestor', 'Carlos', 'Ríos'),
  usuario(41, 'gestor', 'Diana', 'López', { estado: 'inactivo' }),
  usuario(42, 'gestor', 'Andrés', 'Mejía', { telefono: '3001234567' }),
  usuario(30, 'ciudadano', 'Ana', 'Pérez', { cedula: '52123456' }),
  usuario(31, 'ciudadano', 'Luis', 'Torres', { estado: 'bloqueado', bloqueado_hasta: '2026-10-15T15:00:00-05:00' }),
  usuario(32, 'ciudadano', 'Marta', 'Díaz', { estado: 'bloqueado', bloqueado_hasta: null }),
  usuario(33, 'ciudadano', 'Pedro', 'Ruiz', { estado: 'inactivo' }),
  usuario(1, 'administrador', 'Laura', 'Gómez', { cedula: null }),
]

function abrir(ruta, rutas = {}) {
  guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
  const adaptador = simularApi({
    'GET /auth/yo/': (c) => responder(c, 200, ADMIN),
    'GET /usuarios/': (c) => responder(c, 200, USUARIOS),
    ...Object.fromEntries(USUARIOS.map((u) => [`GET /usuarios/${u.id}/`, (c) => responder(c, 200, u)])),
    ...rutas,
  })
  montar(ruta)
  return adaptador
}

const tabla = () => screen.findByRole('table')
const nombres = () =>
  within(screen.getByRole('table'))
    .getAllByRole('link')
    .map((a) => a.textContent)
const aviso = (texto) => screen.findByText(texto, { selector: '.aviso-flotante__texto' })
const cuerpo = (adaptador, metodo, url) =>
  JSON.parse(adaptador.mock.calls.find(([c]) => c.method === metodo && c.url === url)[0].data)

let portapapeles
beforeEach(() => {
  simularApi({})
  portapapeles = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: portapapeles }, configurable: true })
})
afterEach(() => {
  delete navigator.clipboard
})

describe('Lista de usuarios', () => {
  it('las pestañas muestran cada rol con su cantidad y viven en la URL', async () => {
    abrir('/usuarios')
    await tabla()

    expect(screen.getByRole('tab', { name: /Gestores/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Gestores/ })).toHaveTextContent('3')
    expect(screen.getByRole('tab', { name: /Ciudadanos/ })).toHaveTextContent('4')
    expect(screen.getByRole('tab', { name: /Administradores/ })).toHaveTextContent('1')
    expect(nombres()).toEqual(['Carlos Ríos', 'Diana López', 'Andrés Mejía'])

    fireEvent.click(screen.getByRole('tab', { name: /Ciudadanos/ }))
    expect(urlActual()).toBe('/usuarios?rol=ciudadano')
    expect(nombres()).toEqual(['Ana Pérez', 'Luis Torres', 'Marta Díaz', 'Pedro Ruiz'])
    expect(screen.getByRole('link', { name: 'Ana Pérez' })).toHaveAttribute('href', '/usuarios/30')
  })

  it('las flechas del teclado cambian de pestaña', async () => {
    abrir('/usuarios')
    await tabla()
    const gestores = screen.getByRole('tab', { name: /Gestores/ })

    fireEvent.keyDown(gestores, { key: 'ArrowRight' })
    expect(urlActual()).toBe('/usuarios?rol=ciudadano')
    expect(screen.getByRole('tab', { name: /Ciudadanos/ })).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('tab', { name: /Ciudadanos/ }), { key: 'End' })
    expect(urlActual()).toBe('/usuarios?rol=administrador')
  })

  it('la tabla muestra correo, cédula, teléfono, estado y registro', async () => {
    abrir('/usuarios?rol=gestor')
    await tabla()

    const fila = screen.getByRole('link', { name: 'Andrés Mejía' }).closest('tr')
    expect(fila).toHaveTextContent('andrés@eco.co')
    expect(fila).toHaveTextContent('1042')
    expect(fila).toHaveTextContent('3001234567')
    expect(fila).toHaveTextContent('Activo')
    expect(fila).toHaveTextContent('1 sept. 2026')
  })

  it('filtra por estado y lo escribe en la URL', async () => {
    abrir('/usuarios?rol=ciudadano')
    await tabla()

    fireEvent.click(screen.getByRole('button', { name: 'Bloqueados' }))

    expect(urlActual()).toBe('/usuarios?rol=ciudadano&estado=bloqueado')
    expect(nombres()).toEqual(['Luis Torres', 'Marta Díaz'])
    expect(screen.getByRole('link', { name: 'Luis Torres' }).closest('tr')).toHaveTextContent(
      'Bloqueadohasta 15 oct. 2026, 3:00 p. m.',
    )
    expect(screen.getByRole('link', { name: 'Marta Díaz' }).closest('tr')).toHaveTextContent('Bloqueadopermanente')
  })

  it('busca por nombre, correo o cédula tras 300 ms y lo guarda en la URL', async () => {
    abrir('/usuarios?rol=ciudadano')
    await tabla()

    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: '52123' } })
    expect(nombres()).toHaveLength(4)
    await waitFor(() => expect(nombres()).toEqual(['Ana Pérez']))
    expect(urlActual()).toBe('/usuarios?rol=ciudadano&q=52123')

    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'diaz' } })
    await waitFor(() => expect(nombres()).toEqual(['Marta Díaz']))
    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'pedro@eco' } })
    await waitFor(() => expect(nombres()).toEqual(['Pedro Ruiz']))
  })

  it('lee los filtros de la URL y "Quitar filtros" conserva la pestaña', async () => {
    abrir('/usuarios?rol=gestor&estado=bloqueado&q=zz')

    expect(await screen.findByText('No encontramos usuarios con esos filtros.')).toBeInTheDocument()
    expect(document.querySelector('.icono-estado.lucide-search-x')).toBeInTheDocument()
    expect(screen.getByLabelText('Buscar')).toHaveValue('zz')

    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))

    expect(urlActual()).toBe('/usuarios?rol=gestor')
    expect(nombres()).toHaveLength(3)
  })

  it('"Crear usuario" lleva a /usuarios/nuevo', async () => {
    abrir('/usuarios')
    await tabla()

    expect(screen.getByRole('link', { name: 'Crear usuario' })).toHaveAttribute('href', '/usuarios/nuevo')
  })
})

describe('Crear usuario', () => {
  const llenar = ({ nombre = 'Sofía', apellido = 'Vargas', correo = 'sofia@eco.co', cedula = '', password = 'Clave-Segura-2026' } = {}) => {
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: nombre } })
    fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: apellido } })
    fireEvent.change(screen.getByLabelText(/^Cédula/), { target: { value: cedula } })
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: correo } })
    fireEvent.change(screen.getByLabelText('Contraseña inicial'), { target: { value: password } })
  }

  it('solo ofrece gestor o administrador y aclara que los ciudadanos se registran solos', async () => {
    abrir('/usuarios/nuevo')

    const rol = await screen.findByRole('group', { name: 'Rol' })
    expect(within(rol).getAllByRole('radio').map((r) => r.closest('label').textContent)).toEqual([
      'Gestor ambiental',
      'Administrador',
    ])
    expect(within(rol).getByRole('radio', { name: 'Gestor ambiental' })).toBeChecked()
    expect(screen.getByText('Los ciudadanos se registran solos desde la app.')).toBeInTheDocument()
    expect(screen.getByText('Mínimo 8 caracteres.')).toBeInTheDocument()
  })

  it('crear gestor sin cédula muestra el error del backend junto al campo', async () => {
    const adaptador = abrir('/usuarios/nuevo', {
      'POST /usuarios/': (c) => responder(c, 400, { cedula: ['La cédula es obligatoria para el gestor.'] }),
    })
    await screen.findByLabelText('Nombre')

    llenar()
    fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))

    const cedula = screen.getByLabelText(/^Cédula/)
    expect(await screen.findByText('La cédula es obligatoria para el gestor.')).toBeInTheDocument()
    expect(cedula).toHaveAttribute('aria-invalid', 'true')
    expect(cuerpo(adaptador, 'post', '/usuarios/')).toEqual({
      rol: 'gestor',
      nombre: 'Sofía',
      apellido: 'Vargas',
      correo: 'sofia@eco.co',
      password: 'Clave-Segura-2026',
    })
  })

  it('crear administrador sin cédula pasa, muestra la contraseña una sola vez y lleva al detalle', async () => {
    const creado = usuario(50, 'administrador', 'Sofía', 'Vargas', { cedula: null, correo: 'sofia@eco.co' })
    const adaptador = abrir('/usuarios/nuevo', {
      'POST /usuarios/': (c) => responder(c, 201, creado),
      'GET /usuarios/50/': (c) => responder(c, 200, creado),
    })
    await screen.findByLabelText('Nombre')

    fireEvent.click(screen.getByRole('radio', { name: 'Administrador' }))
    expect(screen.getByLabelText(/^Cédula/).closest('.campo')).toHaveTextContent('(opcional)')
    llenar()
    fireEvent.click(screen.getByRole('button', { name: 'Crear usuario' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Usuario creado' })
    expect(cuerpo(adaptador, 'post', '/usuarios/')).toEqual({
      rol: 'administrador',
      nombre: 'Sofía',
      apellido: 'Vargas',
      correo: 'sofia@eco.co',
      password: 'Clave-Segura-2026',
    })
    expect(dialogo).toHaveTextContent('Sofía Vargas')
    expect(dialogo).toHaveTextContent('sofia@eco.co')
    expect(within(dialogo).getByText('Clave-Segura-2026')).toBeInTheDocument()
    expect(dialogo).toHaveTextContent(
      'Entrégale estos datos a Sofía Vargas de forma segura. La contraseña no se volverá a mostrar.',
    )
    expect(dialogo).toHaveTextContent('Deberá cambiar esta contraseña la primera vez que inicie sesión.')

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Copiar datos' }))
    await waitFor(() =>
      expect(portapapeles).toHaveBeenCalledWith('Nombre: Sofía Vargas\nCorreo: sofia@eco.co\nContraseña: Clave-Segura-2026'),
    )

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Ver usuario' }))
    await waitFor(() => expect(urlActual()).toBe('/usuarios/50'))
    expect(await screen.findByRole('heading', { level: 2, name: 'Sofía Vargas' })).toBeInTheDocument()
    expect(screen.queryByText('Clave-Segura-2026')).not.toBeInTheDocument()
  })

  it('"Generar contraseña segura" llena el campo y "Copiar" usa el portapapeles', async () => {
    abrir('/usuarios/nuevo')
    await screen.findByLabelText('Nombre')
    llenar({ password: '' })

    fireEvent.click(screen.getByRole('button', { name: 'Generar contraseña segura' }))

    const campo = screen.getByLabelText('Contraseña inicial')
    const generada = campo.value
    expect(campo).toHaveAttribute('type', 'text')
    expect(generada).toHaveLength(LARGO_CONTRASENA)
    expect(contienePersonales(generada, { nombre: 'Sofía', apellido: 'Vargas', correo: 'sofia@eco.co' })).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Copiar' }))
    await waitFor(() => expect(portapapeles).toHaveBeenCalledWith(generada))
    expect(await aviso('Contraseña copiada.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(campo).toHaveAttribute('type', 'password')
  })
})

describe('Generador de contraseñas', () => {
  const datos = { nombre: 'Ana', apellido: 'Pérez', correo: 'ana.perez@eco.co' }

  it('cumple las reglas en muchos intentos', () => {
    for (let i = 0; i < 300; i += 1) {
      const contrasena = generarContrasena(datos)
      expect(contrasena).toHaveLength(14)
      expect(contrasena).toMatch(/[A-Z]/)
      expect(contrasena).toMatch(/[a-z]/)
      expect(contrasena).toMatch(/[0-9]/)
      expect(contrasena).toMatch(/[^A-Za-z0-9]/)
      expect(contrasena).not.toMatch(/^\d+$/)
      expect(contienePersonales(contrasena, datos)).toBe(false)
    }
  })

  it('usa crypto.getRandomValues', () => {
    const espia = vi.spyOn(crypto, 'getRandomValues')
    generarContrasena(datos)
    expect(espia).toHaveBeenCalled()
    espia.mockRestore()
  })

  it('reconoce los datos personales sin importar mayúsculas', () => {
    expect(contienePersonales('xxPEREZyy', datos)).toBe(true)
    expect(contienePersonales('ana.perez!', datos)).toBe(true)
    expect(contienePersonales('Zq7#mK2pLw9!rT', datos)).toBe(false)
  })
})

describe('Detalle del usuario', () => {
  it('muestra los datos, el rol en español y el enlace a sus tareas', async () => {
    abrir('/usuarios/40')

    expect(await screen.findByRole('heading', { level: 2, name: 'Carlos Ríos' })).toBeInTheDocument()
    expect(screen.getByText('Gestor ambiental')).toBeInTheDocument()
    expect(screen.getByText('carlos@eco.co')).toBeInTheDocument()
    expect(screen.getByText('1040')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver sus tareas' })).toHaveAttribute('href', '/tareas?gestor=40')
    expect(screen.getByRole('link', { name: 'Volver a usuarios' })).toHaveAttribute('href', '/usuarios?rol=gestor')
  })

  it('un ciudadano tiene el enlace a sus reportes', async () => {
    abrir('/usuarios/30')

    expect(await screen.findByRole('link', { name: 'Ver sus reportes' })).toHaveAttribute('href', '/reportes?ciudadano=30')
    expect(screen.getByText('Ciudadano')).toBeInTheDocument()
  })

  it('un administrador no muestra "Inactivar" y explica por qué', async () => {
    abrir('/usuarios/1')
    await screen.findByRole('heading', { level: 2, name: 'Laura Gómez' })

    expect(screen.queryByRole('button', { name: 'Inactivar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reactivar' })).not.toBeInTheDocument()
    expect(screen.getByText('Los administradores no se pueden inactivar.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute('href', '/usuarios/1/editar')
  })

  it('un usuario inactivo muestra "Reactivar" y no "Inactivar"', async () => {
    abrir('/usuarios/41')
    await screen.findByRole('heading', { level: 2, name: 'Diana López' })

    expect(screen.getByRole('button', { name: 'Reactivar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Inactivar' })).not.toBeInTheDocument()
  })

  it('un usuario activo muestra "Inactivar" (en arcilla) y no "Reactivar"', async () => {
    abrir('/usuarios/30')
    await screen.findByRole('heading', { level: 2, name: 'Ana Pérez' })

    expect(screen.getByRole('button', { name: 'Inactivar' })).toHaveClass('boton-peligro')
    expect(screen.queryByRole('button', { name: 'Reactivar' })).not.toBeInTheDocument()
  })

  it('un ciudadano bloqueado muestra el aviso con "Levantar bloqueo" y "Ver sanciones"', async () => {
    abrir('/usuarios/31')
    await screen.findByRole('heading', { level: 2, name: 'Luis Torres' })

    expect(screen.getByText(/Este ciudadano está bloqueado hasta 15 oct\. 2026, 3:00 p\. m\./)).toBeInTheDocument()
    expect(screen.queryByText(/Los bloqueos se manejan en Sanciones/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Levantar bloqueo' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver sanciones' })).toHaveAttribute('href', '/sanciones?ciudadano=31')
  })

  it('el bloqueo permanente se nombra así en el aviso', async () => {
    abrir('/usuarios/32')
    await screen.findByRole('heading', { level: 2, name: 'Marta Díaz' })

    expect(screen.getByText(/Este ciudadano está bloqueado de forma permanente\./)).toBeInTheDocument()
  })

  it('inactivar un gestor muestra sus tareas activas y llama al endpoint', async () => {
    let actual = USUARIOS[0]
    const adaptador = abrir('/usuarios/40', {
      'GET /usuarios/40/': (c) => responder(c, 200, actual),
      'GET /seguimiento/gestores/40/': (c) =>
        responder(c, 200, { id: 40, asignadas: 1, en_proceso: 1, terminadas: 3, canceladas: 0, atrasadas: 0, tareas_activas: [] }),
      'POST /usuarios/40/inactivar/': (c) => {
        actual = { ...actual, estado: 'inactivo' }
        return responder(c, 200, actual)
      },
    })
    await screen.findByRole('heading', { level: 2, name: 'Carlos Ríos' })

    fireEvent.click(screen.getByRole('button', { name: 'Inactivar' }))
    const dialogo = await screen.findByRole('dialog', { name: '¿Inactivar a Carlos Ríos?' })
    expect(dialogo).toHaveTextContent('Se cancelarán sus tareas activas')
    expect(await within(dialogo).findByText('Tiene 2 tareas activas.')).toBeInTheDocument()
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Inactivar' }))

    expect(await aviso('Usuario inactivado.')).toBeInTheDocument()
    expect(pedidos(adaptador, 'POST /usuarios/40/inactivar/')).toBe(1)
    expect(await screen.findByRole('button', { name: 'Reactivar' })).toBeInTheDocument()
  })

  it('inactivar un ciudadano explica que sus reportes siguen su curso', async () => {
    abrir('/usuarios/30', { 'POST /usuarios/30/inactivar/': (c) => responder(c, 200, { ...USUARIOS[3], estado: 'inactivo' }) })
    await screen.findByRole('heading', { level: 2, name: 'Ana Pérez' })

    fireEvent.click(screen.getByRole('button', { name: 'Inactivar' }))
    const dialogo = await screen.findByRole('dialog', { name: '¿Inactivar a Ana Pérez?' })

    expect(dialogo).toHaveTextContent('No podrá iniciar sesión, pero sus reportes siguen su curso.')
  })

  it('reactivar un ciudadano que sigue bloqueado lo avisa', async () => {
    const adaptador = abrir('/usuarios/33', {
      'POST /usuarios/33/reactivar/': (c) =>
        responder(c, 200, { ...USUARIOS[6], estado: 'bloqueado', bloqueado_hasta: '2026-10-20T08:00:00-05:00' }),
    })
    await screen.findByRole('heading', { level: 2, name: 'Pedro Ruiz' })

    fireEvent.click(screen.getByRole('button', { name: 'Reactivar' }))
    const dialogo = await screen.findByRole('dialog', { name: '¿Reactivar a Pedro Ruiz?' })
    expect(dialogo).toHaveTextContent('Podrá volver a iniciar sesión.')
    expect(dialogo).toHaveTextContent('Si tiene un bloqueo vigente, quedará bloqueado hasta que termine.')
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Reactivar' }))

    expect(await aviso('Usuario reactivado, pero sigue bloqueado por una sanción vigente.')).toBeInTheDocument()
    expect(pedidos(adaptador, 'POST /usuarios/33/reactivar/')).toBe(1)
  })

  it('reactivar un gestor avisa "Usuario reactivado."', async () => {
    abrir('/usuarios/41', { 'POST /usuarios/41/reactivar/': (c) => responder(c, 200, { ...USUARIOS[1], estado: 'activo' }) })
    await screen.findByRole('heading', { level: 2, name: 'Diana López' })

    fireEvent.click(screen.getByRole('button', { name: 'Reactivar' }))
    const dialogo = await screen.findByRole('dialog', { name: '¿Reactivar a Diana López?' })
    expect(dialogo).not.toHaveTextContent('bloqueo vigente')
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Reactivar' }))

    expect(await aviso('Usuario reactivado.')).toBeInTheDocument()
  })
})

describe('Editar usuario', () => {
  it('envía solo los campos cambiados, nunca rol, estado ni contraseña', async () => {
    const adaptador = abrir('/usuarios/42/editar', {
      'PATCH /usuarios/42/': (c) => responder(c, 200, { ...USUARIOS[2], ...JSON.parse(c.data) }),
    })
    await screen.findByLabelText('Nombre')
    expect(screen.getByText('El rol y la contraseña no se pueden cambiar desde el panel.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/^Teléfono/), { target: { value: '3109998888' } })
    fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'Mejía Restrepo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await aviso('Cambios guardados.')).toBeInTheDocument()
    const enviado = cuerpo(adaptador, 'patch', '/usuarios/42/')
    expect(enviado).toEqual({ apellido: 'Mejía Restrepo', telefono: '3109998888' })
    for (const prohibido of ['rol', 'estado', 'password']) expect(enviado).not.toHaveProperty(prohibido)
    await waitFor(() => expect(urlActual()).toBe('/usuarios/42'))
  })

  it('muestra los errores del backend junto a cada campo', async () => {
    abrir('/usuarios/42/editar', {
      'PATCH /usuarios/42/': (c) => responder(c, 400, { correo: ['Ya existe un usuario con este correo.'] }),
    })
    await screen.findByLabelText('Nombre')

    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'carlos@eco.co' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText('Ya existe un usuario con este correo.')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('<EstadoUsuario />', () => {
  it('muestra el bloqueo con fecha en hora de Colombia', () => {
    render(<EstadoUsuario estado="bloqueado" bloqueadoHasta="2026-10-15T20:00:00Z" />)
    expect(screen.getByText('Bloqueado')).toHaveTextContent('Bloqueadohasta 15 oct. 2026, 3:00 p. m.')
  })

  it('muestra "permanente" cuando no hay fecha de fin', () => {
    render(<EstadoUsuario estado="bloqueado" bloqueadoHasta={null} />)
    expect(screen.getByText('Bloqueado')).toHaveTextContent('Bloqueadopermanente')
  })

  it.each([
    ['activo', 'Activo', 'estado-usuario--activo'],
    ['inactivo', 'Inactivo', 'estado-usuario--inactivo'],
  ])('%s muestra "%s"', (estado, texto, clase) => {
    render(<EstadoUsuario estado={estado} />)
    expect(screen.getByText(texto)).toHaveClass(clase)
  })
})
