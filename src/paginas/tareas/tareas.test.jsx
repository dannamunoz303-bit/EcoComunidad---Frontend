import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { guardarSesion } from '../../api/sesion.js'
import { ADMIN, montar, pedidos, responder, simularApi, urlActual } from '../../pruebas/apiSimulada.jsx'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="mapa">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
}))
vi.mock('leaflet', () => ({ default: { divIcon: (opciones) => opciones } }))

// GET /api/usuarios/?rol=gestor (UsuarioAdminSerializer). Incluye un inactivo para
// comprobar que el diálogo solo ofrece activos aunque llegue alguno de más.
const GESTORES = [
  { id: 40, nombre: 'Carlos', apellido: 'Ríos', cedula: '1001', rol: 'gestor', estado: 'activo' },
  { id: 41, nombre: 'Diana', apellido: 'López', cedula: '1002', rol: 'gestor', estado: 'activo' },
  { id: 42, nombre: 'Andrés', apellido: 'Mejía', cedula: '1003', rol: 'gestor', estado: 'activo' },
  { id: 43, nombre: 'Beatriz', apellido: 'Gómez', cedula: '1004', rol: 'gestor', estado: 'activo' },
  { id: 44, nombre: 'Ernesto', apellido: 'Paz', cedula: '1005', rol: 'gestor', estado: 'inactivo' },
]

// GET /api/seguimiento/gestores/ (sección 11)
const carga = (id, asignadas, enProceso, atrasadas = 0) => ({
  id, asignadas, en_proceso: enProceso, terminadas: 0, canceladas: 0, horas_promedio: null, atrasadas,
})
const SEGUIMIENTO = [carga(40, 1, 1, 1), carga(41, 0, 0), carga(42, 2, 1), carga(43, 1, 0, 1), carga(44, 0, 0)]

const REPORTE = {
  id: 7,
  ciudadano: { id: 30, nombre: 'Ana', apellido: 'Pérez' },
  categoria_id: 1,
  categoria: 'Basura',
  titulo: 'Basura en el parque Central',
  descripcion: 'Hay bolsas acumuladas.',
  direccion: 'Calle 10 # 5-20',
  descripcion_ubicacion: null,
  latitud: null,
  longitud: null,
  estado: 'asignado',
  motivo_rechazo: null,
  eliminado: false,
  fecha_creacion: '2026-10-10T09:00:00-05:00',
  fecha_actualizacion: '2026-10-10T09:00:00-05:00',
  fecha_revision: '2026-10-10T10:00:00-05:00',
  revisado_por: { id: 1, nombre: 'Laura', apellido: 'Gómez' },
  fotos: [],
}

const tarea = (id, gestorId, estado, fecha) => {
  const g = GESTORES.find((x) => x.id === gestorId)
  return {
    id,
    gestor: { id: g.id, nombre: g.nombre, apellido: g.apellido },
    estado,
    fecha_asignacion: fecha,
    fecha_fin: estado === 'terminada' ? '2026-10-12T10:00:00-05:00' : null,
    acciones: [],
  }
}

const DETALLE = 'GET /reportes/7/'

function abrirDetalle({ reporte = {}, tareas, rutas = {} } = {}) {
  let actual = { ...REPORTE, ...reporte }
  let tareasActuales = tareas ?? [
    tarea(21, 40, 'asignada', '2026-10-11T08:00:00-05:00'),
    tarea(20, 42, 'cancelada', '2026-10-10T11:00:00-05:00'),
  ]
  guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
  const adaptador = simularApi({
    'GET /auth/yo/': (c) => responder(c, 200, ADMIN),
    [DETALLE]: (c) => responder(c, 200, actual),
    'GET /reportes/7/tareas/': (c) => responder(c, 200, tareasActuales),
    'GET /usuarios/': (c) => responder(c, 200, GESTORES.filter((u) => u.rol === c.params?.rol)),
    'GET /seguimiento/gestores/': (c) => responder(c, 200, SEGUIMIENTO),
    'POST /tareas/': (c) => {
      const { gestor } = JSON.parse(c.data)
      actual = { ...actual, estado: 'asignado' }
      tareasActuales = [tarea(99, gestor, 'asignada', new Date().toISOString()), ...tareasActuales]
      return responder(c, 201, { id: 99 })
    },
    'POST /tareas/21/reasignar/': (c) => responder(c, 201, { id: 100 }),
    'POST /tareas/21/cancelar/': (c) => responder(c, 200, { id: 21, estado: 'cancelada' }),
    ...rutas,
  })
  montar('/reportes/7')
  return adaptador
}

const panel = async () => {
  await screen.findByRole('heading', { level: 2, name: 'Basura en el parque Central' })
  return screen.getByRole('complementary', { name: 'Acciones del reporte' })
}
const opcionesDelDialogo = (dialogo) =>
  within(dialogo)
    .getAllByRole('radio')
    .map((radio) => radio.closest('label').querySelector('.opcion-gestor__nombre').textContent)
const aviso = (texto) => screen.findByText(texto, { selector: '.aviso-flotante__texto' })

beforeEach(() => {
  simularApi({})
})

describe('Asignar gestor', () => {
  it.each([
    ['aprobado', 'Asignar gestor'],
    ['asignado', 'Sumar otro gestor'],
    ['en_proceso', 'Sumar otro gestor'],
  ])('en %s el panel muestra "%s" como botón principal', async (estado, texto) => {
    abrirDetalle({ reporte: { estado } })
    const contenedor = await panel()

    const boton = await within(contenedor).findByRole('button', { name: texto })
    expect(boton).toHaveClass('boton-principal')
  })

  it.each([
    ['pendiente', {}],
    ['rechazado', { motivo_rechazo: 'No aplica.' }],
    ['resuelto', {}],
    ['aprobado (eliminado)', { estado: 'aprobado', eliminado: true }],
  ])('en %s no se puede asignar', async (estado, cambios) => {
    abrirDetalle({ reporte: { estado: estado.split(' ')[0], ...cambios }, tareas: [] })
    const contenedor = await panel()

    expect(within(contenedor).queryByRole('button', { name: /Asignar gestor|Sumar otro gestor/ })).not.toBeInTheDocument()
  })

  it('el diálogo lista solo gestores activos, sin los que ya trabajan aquí, de menos a más carga', async () => {
    const adaptador = abrirDetalle()
    const contenedor = await panel()

    fireEvent.click(await within(contenedor).findByRole('button', { name: 'Sumar otro gestor' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Sumar otro gestor' })
    await within(dialogo).findAllByRole('radio')

    // Carlos (40) ya tiene una tarea activa; Ernesto está inactivo; Andrés solo tiene una cancelada
    expect(opcionesDelDialogo(dialogo)).toEqual(['Diana López', 'Beatriz Gómez', 'Andrés Mejía'])
    expect(adaptador.mock.calls.some(([c]) => c.url === '/usuarios/' && c.params?.rol === 'gestor' && c.params?.estado === 'activo')).toBe(true)

    const beatriz = within(dialogo).getByRole('radio', { name: /Beatriz Gómez/ }).closest('label')
    expect(beatriz).toHaveTextContent('1 activa')
    const atrasada = within(beatriz).getByText('1 atrasada')
    expect(atrasada).toHaveClass('carga-gestor--atrasada')
    expect(within(dialogo).getByRole('radio', { name: /Andrés Mejía/ }).closest('label')).toHaveTextContent('3 activas')
    expect(dialogo).not.toHaveTextContent('1001')
  })

  it('el buscador filtra por nombre sin importar tildes', async () => {
    abrirDetalle()
    const contenedor = await panel()
    fireEvent.click(await within(contenedor).findByRole('button', { name: 'Sumar otro gestor' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Sumar otro gestor' })
    await within(dialogo).findAllByRole('radio')

    fireEvent.change(within(dialogo).getByLabelText('Buscar gestor'), { target: { value: 'andres' } })

    expect(opcionesDelDialogo(dialogo)).toEqual(['Andrés Mejía'])
  })

  it('"Asignar" se activa al elegir, envía reporte y gestor, avisa y recarga el reporte', async () => {
    const adaptador = abrirDetalle({ reporte: { estado: 'aprobado' }, tareas: [] })
    const contenedor = await panel()
    const pedidosDetalle = pedidos(adaptador, DETALLE)

    fireEvent.click(await within(contenedor).findByRole('button', { name: 'Asignar gestor' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Asignar gestor' })
    const asignar = within(dialogo).getByRole('button', { name: 'Asignar' })
    expect(asignar).toBeDisabled()

    fireEvent.click(await within(dialogo).findByRole('radio', { name: /Diana López/ }))
    expect(asignar).toBeEnabled()
    fireEvent.click(asignar)

    expect(await aviso('Tarea asignada a Diana López. Se le avisó a Diana López y al ciudadano.')).toBeInTheDocument()
    const envio = adaptador.mock.calls.find(([c]) => c.method === 'post' && c.url === '/tareas/')[0]
    expect(JSON.parse(envio.data)).toEqual({ reporte: 7, gestor: 41 })
    await waitFor(() => expect(pedidos(adaptador, DETALLE)).toBe(pedidosDetalle + 1))
    expect(await screen.findByText('Asignado', { selector: '.estado-reporte' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 3, name: 'Diana López' })).toBeInTheDocument()
  })

  it('al sumar otro gestor, el aviso no promete avisar al ciudadano', async () => {
    abrirDetalle()
    const contenedor = await panel()

    fireEvent.click(await within(contenedor).findByRole('button', { name: 'Sumar otro gestor' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Sumar otro gestor' })
    fireEvent.click(await within(dialogo).findByRole('radio', { name: /Diana López/ }))
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Asignar' }))

    expect(await aviso('Tarea asignada a Diana López. Se le avisó a Diana López.')).toBeInTheDocument()
  })

  it('un 400 del backend se muestra en el diálogo sin cerrarlo', async () => {
    const motivo = 'Este gestor ya tiene una tarea activa en este reporte.'
    abrirDetalle({ rutas: { 'POST /tareas/': (c) => responder(c, 400, { gestor: [motivo] }) } })
    const contenedor = await panel()

    fireEvent.click(await within(contenedor).findByRole('button', { name: 'Sumar otro gestor' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Sumar otro gestor' })
    fireEvent.click(await within(dialogo).findByRole('radio', { name: /Diana López/ }))
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Asignar' }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(motivo)
    expect(screen.getByRole('dialog', { name: 'Sumar otro gestor' })).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Asignar' })).toBeEnabled()
  })

  it('sin gestores disponibles muestra el mensaje con enlace a usuarios', async () => {
    abrirDetalle({
      reporte: { estado: 'aprobado' },
      tareas: [],
      rutas: { 'GET /usuarios/': (c) => responder(c, 200, []) },
    })
    const contenedor = await panel()

    fireEvent.click(await within(contenedor).findByRole('button', { name: 'Asignar gestor' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Asignar gestor' })

    expect(await within(dialogo).findByText('No hay gestores activos disponibles para este reporte.')).toBeInTheDocument()
    expect(within(dialogo).getByRole('link', { name: 'Ir a usuarios' })).toHaveAttribute('href', '/usuarios')
  })
})

describe('Reasignar y cancelar', () => {
  it('solo las tareas activas tienen "Reasignar" y "Cancelar"', async () => {
    abrirDetalle()
    await panel()

    expect(await screen.findByRole('button', { name: 'Reasignar la tarea de Carlos Ríos' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar la tarea de Carlos Ríos' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reasignar la tarea de Andrés Mejía' })).not.toBeInTheDocument()
  })

  it('Reasignar excluye al gestor actual y envía el nuevo', async () => {
    const adaptador = abrirDetalle()
    await panel()

    fireEvent.click(await screen.findByRole('button', { name: 'Reasignar la tarea de Carlos Ríos' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Reasignar la tarea de Carlos Ríos' })
    await within(dialogo).findAllByRole('radio')
    expect(opcionesDelDialogo(dialogo)).not.toContain('Carlos Ríos')

    fireEvent.click(within(dialogo).getByRole('radio', { name: /Andrés Mejía/ }))
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Reasignar' }))

    expect(await aviso('Tarea reasignada a Andrés Mejía.')).toBeInTheDocument()
    const envio = adaptador.mock.calls.find(([c]) => c.url === '/tareas/21/reasignar/')[0]
    expect(JSON.parse(envio.data)).toEqual({ gestor: 42 })
  })

  it('Cancelar pide confirmación y llama al endpoint', async () => {
    const adaptador = abrirDetalle()
    await panel()

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar la tarea de Carlos Ríos' }))
    const dialogo = await screen.findByRole('dialog', { name: '¿Cancelar la tarea de Carlos Ríos?' })
    expect(dialogo).toHaveTextContent('Se le avisará y el estado del reporte se recalculará.')
    expect(pedidos(adaptador, 'POST /tareas/21/cancelar/')).toBe(0)

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar tarea' }))

    expect(await aviso('Tarea cancelada. Carlos Ríos recibió una notificación.')).toBeInTheDocument()
    expect(pedidos(adaptador, 'POST /tareas/21/cancelar/')).toBe(1)
  })

  it('"Volver" cierra la confirmación sin cancelar', async () => {
    const adaptador = abrirDetalle()
    await panel()

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar la tarea de Carlos Ríos' }))
    const dialogo = await screen.findByRole('dialog', { name: '¿Cancelar la tarea de Carlos Ríos?' })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Volver' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(pedidos(adaptador, 'POST /tareas/21/cancelar/')).toBe(0)
  })
})

describe('Página /tareas', () => {
  const lista = (id, gestorId, estado, horas) => {
    const g = GESTORES.find((x) => x.id === gestorId)
    return {
      id,
      reporte: { id: id + 100, titulo: `Reporte de la tarea ${id}`, categoria: 'Basura', estado: 'asignado' },
      gestor: { id: g.id, nombre: g.nombre, apellido: g.apellido },
      asignado_por: { id: 1, nombre: 'Laura', apellido: 'Gómez' },
      estado,
      fecha_asignacion: new Date(Date.now() - horas * 3600e3).toISOString(),
      fecha_fin: estado === 'terminada' ? new Date().toISOString() : null,
    }
  }
  const TAREAS = [
    lista(1, 40, 'asignada', 5),
    lista(2, 41, 'en_proceso', 1),
    lista(3, 40, 'terminada', 30),
    lista(4, 42, 'cancelada', 50),
    lista(5, 40, 'en_proceso', 2),
  ]

  function abrirTareas(ruta = '/tareas', rutas = {}) {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    const adaptador = simularApi({
      'GET /auth/yo/': (c) => responder(c, 200, ADMIN),
      'GET /tareas/': (c) =>
        responder(c, 200, c.params?.gestor ? TAREAS.filter((t) => String(t.gestor.id) === c.params.gestor) : TAREAS),
      'GET /usuarios/': (c) => responder(c, 200, GESTORES),
      ...rutas,
    })
    montar(ruta)
    return adaptador
  }

  const tabla = () => screen.findByRole('table', { name: /Tareas/ })
  const titulos = () =>
    within(screen.getByRole('table', { name: /Tareas/ }))
      .getAllByRole('link')
      .map((a) => a.textContent)
  const botonEstado = (nombre) => screen.getByRole('button', { name: new RegExp(`^${nombre}\\s*\\d+$`) })

  it('muestra las tareas de la más reciente a la más antigua, con su cantidad por estado', async () => {
    abrirTareas()
    await tabla()

    expect(titulos()).toEqual([
      'Reporte de la tarea 2',
      'Reporte de la tarea 5',
      'Reporte de la tarea 1',
      'Reporte de la tarea 3',
      'Reporte de la tarea 4',
    ])
    expect(screen.getByRole('link', { name: 'Reporte de la tarea 2' })).toHaveAttribute('href', '/reportes/102')
    expect(botonEstado('Todas')).toHaveTextContent('5')
    expect(botonEstado('Asignadas')).toHaveTextContent('1')
    expect(botonEstado('En proceso')).toHaveTextContent('2')
    expect(botonEstado('Terminadas')).toHaveTextContent('1')
    expect(botonEstado('Canceladas')).toHaveTextContent('1')
    const fila = screen.getByRole('link', { name: 'Reporte de la tarea 2' }).closest('tr')
    expect(fila).toHaveTextContent('Diana López')
    expect(within(fila).getByText('En proceso')).toHaveClass('estado-tarea--en_proceso')
  })

  it('filtra por estado y gestor leyendo la URL, y los escribe al cambiar', async () => {
    const adaptador = abrirTareas('/tareas?estado=en_proceso&gestor=40')
    await tabla()

    expect(titulos()).toEqual(['Reporte de la tarea 5'])
    expect(botonEstado('En proceso')).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByRole('option', { name: 'Carlos Ríos' })).toBeInTheDocument()
    expect(screen.getByLabelText('Gestor')).toHaveValue('40')
    expect(adaptador.mock.calls.some(([c]) => c.url === '/tareas/' && c.params?.gestor === '40')).toBe(true)

    fireEvent.click(botonEstado('Todas'))
    expect(urlActual()).toBe('/tareas?gestor=40')
    expect(titulos()).toHaveLength(3)

    fireEvent.change(screen.getByLabelText('Gestor'), { target: { value: '41' } })
    expect(urlActual()).toBe('/tareas?gestor=41')
    await waitFor(() => expect(titulos()).toEqual(['Reporte de la tarea 2']))
    expect(screen.getByRole('option', { name: 'Ernesto Paz (inactivo)' })).toBeInTheDocument()
  })

  it('sin resultados muestra el ícono y "Quitar filtros" funciona', async () => {
    abrirTareas('/tareas?estado=cancelada&gestor=41')

    expect(await screen.findByText('No hay tareas con esos filtros.')).toBeInTheDocument()
    expect(document.querySelector('.icono-estado.lucide-search-x')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))

    expect(urlActual()).toBe('/tareas')
    await tabla()
    expect(titulos()).toHaveLength(5)
  })

  it('un error al cargar muestra "Reintentar"', async () => {
    let falla = true
    abrirTareas('/tareas', {
      'GET /tareas/': (c) => (falla ? responder(c, 500) : responder(c, 200, TAREAS)),
    })

    expect(await screen.findByText('No pudimos cargar las tareas.')).toBeInTheDocument()
    falla = false
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await tabla()).toBeInTheDocument()
  })
})
