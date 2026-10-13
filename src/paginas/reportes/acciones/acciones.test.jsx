import { act, fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { guardarSesion } from '../../../api/sesion.js'
import { ADMIN, montar, pedidos, responder, simularApi, urlActual } from '../../../pruebas/apiSimulada.jsx'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="mapa">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
}))
vi.mock('leaflet', () => ({ default: { divIcon: (opciones) => opciones } }))

const REPORTE_BASE = {
  id: 7,
  ciudadano: { id: 30, nombre: 'Ana', apellido: 'Pérez' },
  categoria_id: 1,
  categoria: 'Basura',
  titulo: 'Basura en el parque Central',
  descripcion: 'Hay bolsas acumuladas.',
  direccion: 'Calle 10 # 5-20',
  descripcion_ubicacion: null,
  latitud: '4.71098600',
  longitud: '-74.07209200',
  estado: 'pendiente',
  motivo_rechazo: null,
  eliminado: false,
  fecha_creacion: '2026-10-10T09:00:00-05:00',
  fecha_actualizacion: '2026-10-10T09:00:00-05:00',
  fecha_revision: null,
  revisado_por: null,
  fotos: [],
}

const DETALLE = 'GET /reportes/7/'
const TAREAS = 'GET /reportes/7/tareas/'

// El "backend" guarda el reporte actual; cada acción lo cambia como lo haría el real.
function abrir(cambios = {}, rutas = {}) {
  let actual = { ...REPORTE_BASE, ...cambios }
  const actualizar = (nuevos) => {
    actual = { ...actual, ...nuevos }
    return actual
  }
  guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
  const adaptador = simularApi({
    'GET /auth/yo/': (c) => responder(c, 200, ADMIN),
    [DETALLE]: (c) => responder(c, 200, actual),
    [TAREAS]: (c) => responder(c, 200, []),
    'POST /reportes/7/aprobar/': (c) => responder(c, 200, actualizar({ estado: 'aprobado' })),
    'POST /reportes/7/rechazar/': (c) =>
      responder(c, 200, actualizar({ estado: 'rechazado', motivo_rechazo: JSON.parse(c.data).motivo_rechazo })),
    'POST /reportes/7/devolver-a-pendiente/': (c) =>
      responder(c, 200, actualizar({ estado: 'pendiente', motivo_rechazo: null })),
    'DELETE /reportes/7/': (c) => {
      actualizar({ eliminado: true })
      return responder(c, 204, '')
    },
    ...rutas,
  })
  montar('/reportes/7')
  return adaptador
}

const panel = async () => {
  await screen.findByRole('heading', { level: 2, name: 'Basura en el parque Central' })
  return screen.getByRole('complementary', { name: 'Acciones del reporte' })
}

const nombresDeAcciones = (contenedor) =>
  [...within(contenedor).queryAllByRole('button'), ...within(contenedor).queryAllByRole('link')].map(
    (el) => el.textContent.trim(),
  )

const dialogo = (nombre) => screen.findByRole('dialog', { name: nombre })
const aviso = (texto) => screen.findByText(texto, { selector: '.aviso-flotante__texto' })

beforeEach(() => {
  simularApi({})
})

describe('Panel de acciones: botones por estado', () => {
  it.each([
    ['pendiente', ['Aprobar', 'Rechazar', 'Editar', 'Eliminar']],
    ['rechazado', ['Devolver a pendiente', 'Sancionar a Ana Pérez', 'Eliminar']],
    ['aprobado', ['Editar', 'Eliminar']],
    ['asignado', ['Editar', 'Eliminar']],
    ['en_proceso', ['Editar', 'Eliminar']],
    ['resuelto', ['Reabrir', 'Editar', 'Eliminar']],
  ])('%s muestra solo sus acciones', async (estado, esperadas) => {
    abrir({ estado })
    const contenedor = await panel()

    expect(nombresDeAcciones(contenedor).sort()).toEqual([...esperadas].sort())
    const nota = within(contenedor).queryByText('Asignar gestores llega en el próximo paso.')
    if (['aprobado', 'asignado', 'en_proceso'].includes(estado)) expect(nota).toBeInTheDocument()
    else expect(nota).not.toBeInTheDocument()
  })

  it('eliminado no muestra botones', async () => {
    abrir({ eliminado: true })
    const contenedor = await panel()

    expect(nombresDeAcciones(contenedor)).toEqual([])
    expect(within(contenedor).getByText('Este reporte fue eliminado y ya no admite cambios.')).toBeInTheDocument()
  })

  it('Aprobar y Reabrir son el botón principal; Eliminar va aparte como acción peligrosa', async () => {
    abrir()
    const contenedor = await panel()

    expect(within(contenedor).getByRole('button', { name: 'Aprobar' })).toHaveClass('boton-principal')
    const eliminar = within(contenedor).getByRole('button', { name: 'Eliminar' })
    expect(eliminar).toHaveClass('boton-peligro')
    expect(eliminar.closest('.panel-acciones__peligro')).toBeInTheDocument()
  })

  it('"Editar" lleva a la página de edición', async () => {
    abrir()
    const contenedor = await panel()

    fireEvent.click(within(contenedor).getByRole('link', { name: 'Editar' }))

    expect(urlActual()).toBe('/reportes/7/editar')
  })
})

describe('Panel de acciones: cada acción', () => {
  it('Aprobar pide confirmación, llama al endpoint, avisa con el nombre y recarga el detalle', async () => {
    const adaptador = abrir()
    const contenedor = await panel()
    const pedidosDetalle = pedidos(adaptador, DETALLE)
    const pedidosTareas = pedidos(adaptador, TAREAS)

    fireEvent.click(within(contenedor).getByRole('button', { name: 'Aprobar' }))
    const confirmacion = await dialogo('¿Aprobar este reporte?')
    expect(confirmacion).toHaveTextContent('El ciudadano recibirá una notificación.')
    fireEvent.click(within(confirmacion).getByRole('button', { name: 'Aprobar' }))

    expect(await aviso('Reporte aprobado. Ana Pérez recibió una notificación.')).toBeInTheDocument()
    expect(pedidos(adaptador, 'POST /reportes/7/aprobar/')).toBe(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByText('Aprobado', { selector: '.estado-reporte' })).toBeInTheDocument()
    expect(pedidos(adaptador, DETALLE)).toBe(pedidosDetalle + 1)
    expect(pedidos(adaptador, TAREAS)).toBe(pedidosTareas + 1)
  })

  it('Rechazar no deja enviar con el motivo vacío o con espacios', async () => {
    abrir()
    const contenedor = await panel()

    fireEvent.click(within(contenedor).getByRole('button', { name: 'Rechazar' }))
    const formulario = await dialogo('Rechazar reporte')
    const motivo = within(formulario).getByLabelText('Motivo del rechazo')
    const rechazar = within(formulario).getByRole('button', { name: 'Rechazar' })

    expect(motivo).toHaveAccessibleDescription(/Explica por qué no es un tema ambiental\./)
    expect(rechazar).toBeDisabled()
    fireEvent.change(motivo, { target: { value: '    ' } })
    expect(rechazar).toBeDisabled()
    expect(within(formulario).getByText('4/255')).toBeInTheDocument()
    expect(motivo).toHaveAttribute('maxLength', '255')
  })

  it('Rechazar envía el motivo y muestra el enlace para sancionar al ciudadano', async () => {
    const adaptador = abrir()
    const contenedor = await panel()

    fireEvent.click(within(contenedor).getByRole('button', { name: 'Rechazar' }))
    const formulario = await dialogo('Rechazar reporte')
    fireEvent.change(within(formulario).getByLabelText('Motivo del rechazo'), {
      target: { value: '  No es un tema ambiental.  ' },
    })
    fireEvent.click(within(formulario).getByRole('button', { name: 'Rechazar' }))

    expect(await aviso('Reporte rechazado. Ana Pérez recibió el motivo.')).toBeInTheDocument()
    const envio = adaptador.mock.calls.find(([c]) => c.url === '/reportes/7/rechazar/')[0]
    expect(JSON.parse(envio.data)).toEqual({ motivo_rechazo: 'No es un tema ambiental.' })

    const sancionar = await screen.findByRole('link', { name: 'Sancionar a Ana Pérez' })
    expect(sancionar).toHaveAttribute('href', '/sanciones?ciudadano=30&reporte=7')
  })

  it('Devolver a pendiente pide confirmación y llama a su endpoint', async () => {
    const adaptador = abrir({ estado: 'rechazado', motivo_rechazo: 'No aplica.' })
    const contenedor = await panel()

    fireEvent.click(within(contenedor).getByRole('button', { name: 'Devolver a pendiente' }))
    const confirmacion = await dialogo('¿Devolver a pendiente?')
    expect(confirmacion).toHaveTextContent('El reporte vuelve a revisión y el ciudadano podrá editarlo otra vez.')
    expect(pedidos(adaptador, 'POST /reportes/7/devolver-a-pendiente/')).toBe(0)
    fireEvent.click(within(confirmacion).getByRole('button', { name: 'Devolver a pendiente' }))

    expect(await aviso('El reporte volvió a pendiente.')).toBeInTheDocument()
    expect(pedidos(adaptador, 'POST /reportes/7/devolver-a-pendiente/')).toBe(1)
  })

  it('Eliminar pide confirmación con advertencia y llama a DELETE', async () => {
    const adaptador = abrir()
    const contenedor = await panel()

    fireEvent.click(within(contenedor).getByRole('button', { name: 'Eliminar' }))
    const confirmacion = await dialogo('¿Eliminar este reporte?')
    expect(confirmacion).toHaveTextContent('Esta acción no se puede deshacer desde el panel.')
    const boton = within(confirmacion).getByRole('button', { name: 'Eliminar reporte' })
    expect(boton).toHaveClass('boton-peligro')
    fireEvent.click(boton)

    expect(await aviso('Reporte eliminado.')).toBeInTheDocument()
    expect(pedidos(adaptador, 'DELETE /reportes/7/')).toBe(1)
    expect(await screen.findByText('Este reporte fue eliminado y ya no admite cambios.')).toBeInTheDocument()
  })

  it('Reabrir con 400 muestra el motivo del backend sin cerrar el diálogo', async () => {
    const motivo = 'Para reabrir el reporte debe existir una queja del ciudadano posterior a la última revisión.'
    abrir({ estado: 'resuelto' }, { 'POST /reportes/7/reabrir/': (c) => responder(c, 400, { detail: motivo }) })
    const contenedor = await panel()

    fireEvent.click(within(contenedor).getByRole('button', { name: 'Reabrir' }))
    const confirmacion = await dialogo('¿Reabrir este reporte?')
    expect(confirmacion).toHaveTextContent('Las tareas anteriores quedan como historial.')
    fireEvent.click(within(confirmacion).getByRole('button', { name: 'Reabrir' }))

    expect(await within(confirmacion).findByRole('alert')).toHaveTextContent(motivo)
    expect(screen.getByRole('dialog', { name: '¿Reabrir este reporte?' })).toBeInTheDocument()
    expect(within(confirmacion).getByRole('button', { name: 'Reabrir' })).toBeEnabled()
    expect(screen.queryByText(/Reporte reabierto/)).not.toBeInTheDocument()
  })

  it('Reabrir con éxito avisa que ya se puede asignar una tarea nueva', async () => {
    abrir({ estado: 'resuelto' }, { 'POST /reportes/7/reabrir/': (c) => responder(c, 200, { ...REPORTE_BASE, estado: 'aprobado' }) })
    const contenedor = await panel()

    fireEvent.click(within(contenedor).getByRole('button', { name: 'Reabrir' }))
    fireEvent.click(within(await dialogo('¿Reabrir este reporte?')).getByRole('button', { name: 'Reabrir' }))

    expect(await aviso('Reporte reabierto. Ya puedes asignarle una tarea nueva.')).toBeInTheDocument()
  })

  it('un botón no se puede pulsar dos veces mientras espera', async () => {
    let soltar
    const adaptador = abrir(
      {},
      {
        'POST /reportes/7/aprobar/': (c) =>
          new Promise((resolve) => {
            soltar = () => resolve(responder(c, 200, { ...REPORTE_BASE, estado: 'aprobado' }))
          }),
      },
    )
    const contenedor = await panel()

    fireEvent.click(within(contenedor).getByRole('button', { name: 'Aprobar' }))
    const confirmacion = await dialogo('¿Aprobar este reporte?')
    const boton = within(confirmacion).getByRole('button', { name: 'Aprobar' })
    fireEvent.click(boton)
    fireEvent.click(boton)

    const esperando = within(confirmacion).getByRole('button', { name: 'Aprobando…' })
    expect(esperando).toBeDisabled()
    fireEvent.click(esperando)
    // Mientras espera tampoco se cierra con Esc
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('dialog', { name: '¿Aprobar este reporte?' })).toBeInTheDocument()
    // Los interceptores de axios son asíncronos: se deja avanzar la cola antes de contar
    await act(async () => {})
    expect(pedidos(adaptador, 'POST /reportes/7/aprobar/')).toBe(1)

    await act(async () => soltar())
    expect(await aviso('Reporte aprobado. Ana Pérez recibió una notificación.')).toBeInTheDocument()
  })

  it('un error sin respuesta del servidor se muestra en el diálogo', async () => {
    abrir({}, { 'POST /reportes/7/aprobar/': (c) => Promise.reject(Object.assign(new Error('Network Error'), { config: c })) })
    const contenedor = await panel()

    fireEvent.click(within(contenedor).getByRole('button', { name: 'Aprobar' }))
    const confirmacion = await dialogo('¿Aprobar este reporte?')
    fireEvent.click(within(confirmacion).getByRole('button', { name: 'Aprobar' }))

    expect(await within(confirmacion).findByRole('alert')).toHaveTextContent(
      'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
    )
  })
})

describe('Diálogo', () => {
  it('se cierra con Esc y devuelve el foco al botón que lo abrió', async () => {
    abrir()
    const contenedor = await panel()
    const rechazar = within(contenedor).getByRole('button', { name: 'Rechazar' })
    rechazar.focus()

    fireEvent.click(rechazar)
    const formulario = await dialogo('Rechazar reporte')
    expect(within(formulario).getByLabelText('Motivo del rechazo')).toHaveFocus()

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(rechazar).toHaveFocus()
  })

  it('se cierra con el botón "Cerrar" y mantiene el foco dentro con Tab', async () => {
    abrir()
    const contenedor = await panel()
    fireEvent.click(within(contenedor).getByRole('button', { name: 'Eliminar' }))
    const confirmacion = await dialogo('¿Eliminar este reporte?')
    const botones = within(confirmacion).getAllByRole('button')
    const ultimo = botones[botones.length - 1]

    ultimo.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(botones[0]).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(ultimo).toHaveFocus()

    fireEvent.click(within(confirmacion).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
