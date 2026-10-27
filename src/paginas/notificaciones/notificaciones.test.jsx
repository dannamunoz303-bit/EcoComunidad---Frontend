import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { guardarSesion } from '../../api/sesion.js'
import IconoNotificacion from '../../componentes/notificaciones/IconoNotificacion.jsx'
import { ADMIN, montar, pedidos, responder, simularApi, urlActual } from '../../pruebas/apiSimulada.jsx'

const haceMin = (m) => new Date(Date.now() - m * 60e3).toISOString()
const NO_LEIDAS = 'GET /notificaciones/no-leidas/'

// GET /api/notificaciones/ (NotificacionSerializer)
const notificacion = (id, tipo, leida, minutos, reporte = null) => ({
  id,
  tipo,
  mensaje: `Mensaje de la notificación ${id}.`,
  leida,
  fecha: haceMin(minutos),
  reporte,
})
const NOTIFICACIONES = [
  notificacion(1, 'reporte_nuevo', false, 5, 7),
  notificacion(2, 'tarea_sin_acciones', false, 120, 8),
  notificacion(3, 'novedad_nueva', true, 1440, 7),
  notificacion(4, 'sancion', true, 2880),
  notificacion(5, 'tipo_raro', false, 4320),
]

// "Backend" con estado: marcar como leída cambia la lista y el total.
function abrir(ruta, { lista = NOTIFICACIONES, rutas = {} } = {}) {
  let actuales = lista.map((n) => ({ ...n }))
  guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
  const adaptador = simularApi({
    'GET /auth/yo/': (c) => responder(c, 200, ADMIN),
    'GET /categorias/': (c) => responder(c, 200, []),
    'GET /reportes/': (c) => responder(c, 200, []),
    [NO_LEIDAS]: (c) => responder(c, 200, { total: actuales.filter((n) => !n.leida).length }),
    'GET /notificaciones/': (c) => {
      const leida = c.params?.leida
      return responder(c, 200, leida === undefined ? actuales : actuales.filter((n) => String(n.leida) === leida))
    },
    ...Object.fromEntries(
      lista.map((n) => [
        `POST /notificaciones/${n.id}/leer/`,
        (c) => {
          actuales = actuales.map((x) => (x.id === n.id ? { ...x, leida: true } : x))
          return responder(c, 200, actuales.find((x) => x.id === n.id))
        },
      ]),
    ),
    'POST /notificaciones/leer-todas/': (c) => {
      const cantidad = actuales.filter((n) => !n.leida).length
      actuales = actuales.map((n) => ({ ...n, leida: true }))
      return responder(c, 200, { actualizadas: cantidad })
    },
    ...rutas,
  })
  montar(ruta)
  return adaptador
}

const campana = (n) => screen.findByRole('button', { name: `Notificaciones, ${n} sin leer` })
const aviso = (texto) => screen.findByText(texto, { selector: '.aviso-flotante__texto' })

function ponerVisibilidad(valor) {
  Object.defineProperty(document, 'visibilityState', { value: valor, configurable: true })
}

beforeEach(() => {
  simularApi({})
})
afterEach(() => {
  ponerVisibilidad('visible')
  vi.useRealTimers()
})

describe('Campana', () => {
  it('muestra el número de no leídas', async () => {
    abrir('/categorias')

    const boton = await campana(3)
    expect(within(boton).getByText('3')).toBeInTheDocument()
  })

  it('muestra "9+" con más de 9 y ningún círculo con 0', async () => {
    const muchas = Array.from({ length: 12 }, (_, i) => notificacion(100 + i, 'reporte_nuevo', false, i + 1))
    abrir('/categorias', { lista: muchas })
    expect(within(await campana(12)).getByText('9+')).toBeInTheDocument()
  })

  it('sin no leídas no muestra el círculo', async () => {
    abrir('/categorias', { lista: NOTIFICACIONES.map((n) => ({ ...n, leida: true })) })

    const boton = await campana(0)
    expect(boton.querySelector('.campana__contador')).toBeNull()
  })

  it('pide el número cada 60 segundos con la pestaña visible, y no si está oculta', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const adaptador = abrir('/categorias')
    await campana(3)
    const inicial = pedidos(adaptador, NO_LEIDAS)

    await act(async () => {
      vi.advanceTimersByTime(60_000)
    })
    await waitFor(() => expect(pedidos(adaptador, NO_LEIDAS)).toBe(inicial + 1))

    ponerVisibilidad('hidden')
    await act(async () => {
      vi.advanceTimersByTime(60_000)
    })
    expect(pedidos(adaptador, NO_LEIDAS)).toBe(inicial + 1)

    // Al volver a la pestaña se pide de nuevo
    ponerVisibilidad('visible')
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await waitFor(() => expect(pedidos(adaptador, NO_LEIDAS)).toBe(inicial + 2))
  })

  it('el panel muestra las recientes con un punto en las no leídas y se cierra con Esc', async () => {
    abrir('/categorias')
    const boton = await campana(3)

    fireEvent.click(boton)
    const panel = await screen.findByRole('region', { name: 'Notificaciones recientes' })
    expect(boton).toHaveAttribute('aria-expanded', 'true')
    const items = await within(panel).findAllByRole('button', { name: /Mensaje de la notificación/ })
    expect(items).toHaveLength(5)
    expect(items[0]).toHaveTextContent('hace 5 minutos')
    expect(within(items[0]).getByText('Sin leer')).toBeInTheDocument()
    expect(within(items[2]).queryByText('Sin leer')).not.toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('region', { name: 'Notificaciones recientes' })).not.toBeInTheDocument()
    expect(boton).toHaveFocus()
  })

  it('se cierra al hacer clic afuera', async () => {
    abrir('/categorias')
    fireEvent.click(await campana(3))
    await screen.findByRole('region', { name: 'Notificaciones recientes' })

    fireEvent.mouseDown(document.body)

    expect(screen.queryByRole('region', { name: 'Notificaciones recientes' })).not.toBeInTheDocument()
  })

  it('al hacer clic en una la marca como leída y lleva a su reporte', async () => {
    const adaptador = abrir('/categorias')
    fireEvent.click(await campana(3))
    const panel = await screen.findByRole('region', { name: 'Notificaciones recientes' })

    fireEvent.click(await within(panel).findByRole('button', { name: /Mensaje de la notificación 1\./ }))

    await waitFor(() => expect(urlActual()).toBe('/reportes/7'))
    expect(pedidos(adaptador, 'POST /notificaciones/1/leer/')).toBe(1)
    expect(await campana(2)).toBeInTheDocument()
  })

  it('una sin reporte lleva a /notificaciones', async () => {
    abrir('/categorias')
    fireEvent.click(await campana(3))
    const panel = await screen.findByRole('region', { name: 'Notificaciones recientes' })

    fireEvent.click(await within(panel).findByRole('button', { name: /Mensaje de la notificación 5\./ }))

    await waitFor(() => expect(urlActual()).toBe('/notificaciones'))
  })

  it('"Marcar todas como leídas" baja el número a 0', async () => {
    abrir('/categorias')
    fireEvent.click(await campana(3))
    const panel = await screen.findByRole('region', { name: 'Notificaciones recientes' })

    fireEvent.click(within(panel).getByRole('button', { name: 'Marcar todas como leídas' }))

    expect(await campana(0)).toBeInTheDocument()
    expect(within(panel).getByRole('link', { name: 'Ver todas' })).toHaveAttribute('href', '/notificaciones')
  })

  it('sin notificaciones dice "No tienes notificaciones." sin ícono', async () => {
    abrir('/categorias', { lista: [] })
    fireEvent.click(await campana(0))

    const panel = await screen.findByRole('region', { name: 'Notificaciones recientes' })
    expect(await within(panel).findByText('No tienes notificaciones.')).toBeInTheDocument()
    expect(panel.querySelector('.icono-estado')).not.toBeInTheDocument()
  })
})

describe('Página de notificaciones', () => {
  const mensajes = () =>
    within(screen.getByRole('tabpanel'))
      .queryAllByRole('listitem')
      .map((li) => li.querySelector('.notificacion__mensaje').textContent.replace('Sin leer: ', ''))

  it('por defecto muestra las sin leer, de la más reciente a la más antigua', async () => {
    abrir('/notificaciones')
    await screen.findByText(/Mensaje de la notificación 1\./, { selector: '.notificacion__mensaje' })

    expect(screen.getByRole('tab', { name: 'Sin leer' })).toHaveAttribute('aria-selected', 'true')
    expect(mensajes()).toEqual([
      'Mensaje de la notificación 1.',
      'Mensaje de la notificación 2.',
      'Mensaje de la notificación 5.',
    ])
  })

  it('las pestañas y el filtro por grupo van en la URL', async () => {
    abrir('/notificaciones')
    await screen.findByText(/Mensaje de la notificación 1\./, { selector: '.notificacion__mensaje' })

    fireEvent.click(screen.getByRole('tab', { name: 'Todas' }))
    expect(urlActual()).toBe('/notificaciones?vista=todas')
    await waitFor(() => expect(mensajes()).toHaveLength(5))

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'cuentas' } })
    expect(urlActual()).toBe('/notificaciones?vista=todas&grupo=cuentas')
    expect(mensajes()).toEqual(['Mensaje de la notificación 4.'])

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'tareas' } })
    expect(mensajes()).toEqual(['Mensaje de la notificación 2.'])
  })

  it('cada notificación tiene fecha completa, "hace…" y "Ver reporte" si tiene', async () => {
    abrir('/notificaciones?vista=todas')
    const item = (await screen.findByText(/Mensaje de la notificación 2\./, { selector: '.notificacion__mensaje' })).closest('li')

    expect(item).toHaveTextContent('hace 2 horas')
    expect(item.querySelector('time')).toHaveAttribute('datetime', NOTIFICACIONES[1].fecha)
    expect(within(item).getByRole('link', { name: 'Ver reporte' })).toHaveAttribute('href', '/reportes/8')
    const sinReporte = screen.getByText(/Mensaje de la notificación 4\./, { selector: '.notificacion__mensaje' }).closest('li')
    expect(within(sinReporte).queryByRole('link', { name: 'Ver reporte' })).not.toBeInTheDocument()
    expect(within(sinReporte).queryByRole('button', { name: 'Marcar como leída' })).not.toBeInTheDocument()
  })

  it('"Marcar como leída" la quita de las sin leer y baja el número de la campana', async () => {
    const adaptador = abrir('/notificaciones')
    const item = (await screen.findByText(/Mensaje de la notificación 1\./, { selector: '.notificacion__mensaje' })).closest('li')
    await campana(3)

    fireEvent.click(within(item).getByRole('button', { name: 'Marcar como leída' }))

    await waitFor(() => expect(mensajes()).toEqual(['Mensaje de la notificación 2.', 'Mensaje de la notificación 5.']))
    expect(pedidos(adaptador, 'POST /notificaciones/1/leer/')).toBe(1)
    expect(await campana(2)).toBeInTheDocument()
  })

  it('"Marcar todas como leídas" avisa y deja "Estás al día."', async () => {
    abrir('/notificaciones')
    await screen.findByText(/Mensaje de la notificación 1\./, { selector: '.notificacion__mensaje' })
    await campana(3)

    fireEvent.click(within(screen.getByRole('main')).getByRole('button', { name: 'Marcar todas como leídas' }))

    expect(await aviso('Todas las notificaciones están leídas.')).toBeInTheDocument()
    expect(await screen.findByText('Estás al día.')).toBeInTheDocument()
    expect(await campana(0)).toBeInTheDocument()
  })
})

describe('<IconoNotificacion />', () => {
  it.each([
    ['reporte_nuevo', 'lucide-inbox'],
    ['reporte_aprobado', 'lucide-circle-check'],
    ['reporte_estado', 'lucide-circle-check'],
    ['reporte_rechazado', 'lucide-circle-x'],
    ['reporte_asignado', 'lucide-user-round'],
    ['tarea_asignada', 'lucide-user-round'],
    ['tarea_cancelada', 'lucide-ban'],
    ['tarea_sin_acciones', 'lucide-alarm-clock'],
    ['novedad_nueva', 'lucide-message-square'],
    ['novedad_respondida', 'lucide-message-square'],
    ['sancion', 'lucide-shield-alert'],
    ['bloqueo_levantado', 'lucide-shield-check'],
    ['contrasena_restablecida', 'lucide-key-round'],
    ['reporte_eliminado', 'lucide-trash-?2'],
    ['tipo_desconocido', 'lucide-bell'],
  ])('%s usa %s', (tipo, clase) => {
    const { container } = render(<IconoNotificacion tipo={tipo} />)
    expect(container.querySelector('svg').getAttribute('class')).toMatch(new RegExp(`(^| )${clase}( |$)`))
  })

  it('tarea_sin_acciones va en ámbar', () => {
    const { container } = render(<IconoNotificacion tipo="tarea_sin_acciones" />)
    expect(container.firstChild).toHaveClass('icono-notificacion--alerta')
  })
})
