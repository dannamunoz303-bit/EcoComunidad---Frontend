import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { guardarSesion } from '../../../api/sesion.js'
import { ADMIN, montar, pedidos, responder, simularApi } from '../../../pruebas/apiSimulada.jsx'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="mapa">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
}))
vi.mock('leaflet', () => ({ default: { divIcon: (opciones) => opciones } }))

const CAUSANTE = { id: 35, nombre: 'Jorge', apellido: 'Muñoz' }

// GET /api/reportes/<id>/ para el administrador (RN-27): causante_cedula y causante
const REPORTE = {
  id: 7,
  ciudadano: { id: 30, nombre: 'Ana', apellido: 'Pérez' },
  categoria_id: 1,
  categoria: 'Basura',
  titulo: 'Basura en el parque Central',
  descripcion: 'Hay bolsas acumuladas.',
  direccion: 'Calle 10 # 5-20',
  descripcion_ubicacion: null,
  municipio: { id: 15, nombre: 'Popayán' },
  vereda: null,
  zona: { id: 2, nombre: 'centro' },
  latitud: null,
  longitud: null,
  estado: 'aprobado',
  urgencia: 'media',
  motivo_rechazo: null,
  eliminado: false,
  fecha_creacion: '2026-10-10T09:00:00-05:00',
  fecha_actualizacion: '2026-10-10T09:00:00-05:00',
  fecha_revision: '2026-10-10T10:00:00-05:00',
  revisado_por: { id: 1, nombre: 'Laura', apellido: 'Gómez' },
  fotos: [],
  causante_cedula: '1061234567',
  causante: { registrado: true, ciudadano: CAUSANTE, sanciones_como_causante: 1, sugerencia: 'bloqueo_temporal' },
}

const NO_REGISTRADO = { registrado: false, ciudadano: null, sanciones_como_causante: null, sugerencia: null }

// GET /api/sanciones/?ciudadano=35: una como causante y otra por un reporte erróneo
const SANCIONES_CAUSANTE = [
  {
    id: 90,
    ciudadano: CAUSANTE,
    admin: { id: 1, nombre: 'Laura', apellido: 'Gómez' },
    reporte: 3,
    tipo: 'advertencia',
    motivo: 'Dejó escombros en la vía.',
    por_causante: true,
    fecha_inicio: '2026-09-01T10:00:00-05:00',
    fecha_fin: null,
  },
  {
    id: 91,
    ciudadano: CAUSANTE,
    admin: { id: 1, nombre: 'Laura', apellido: 'Gómez' },
    reporte: 4,
    tipo: 'advertencia',
    motivo: 'Reporte falso.',
    por_causante: false,
    fecha_inicio: '2026-08-01T10:00:00-05:00',
    fecha_fin: null,
  },
]

const SANCIONAR = 'POST /reportes/7/sancionar-causante/'

function abrir(cambios = {}, rutas = {}) {
  let actual = { ...REPORTE, ...cambios }
  guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
  const adaptador = simularApi({
    'GET /auth/yo/': (c) => responder(c, 200, ADMIN),
    'GET /reportes/7/': (c) => responder(c, 200, actual),
    'GET /reportes/7/tareas/': (c) => responder(c, 200, []),
    'GET /sanciones/': (c) => responder(c, 200, c.params?.ciudadano === 35 ? SANCIONES_CAUSANTE : []),
    [SANCIONAR]: (c) => {
      const { tipo, motivo } = JSON.parse(c.data)
      actual = {
        ...actual,
        causante: { ...actual.causante, sanciones_como_causante: actual.causante.sanciones_como_causante + 1 },
      }
      return responder(c, 201, { id: 99, ciudadano: CAUSANTE, reporte: 7, tipo, motivo, por_causante: true })
    },
    ...rutas,
  })
  montar('/reportes/7')
  return adaptador
}

const seccion = async () => {
  const titulo = await screen.findByRole('heading', { level: 2, name: 'Causante del daño' })
  return titulo.closest('section')
}
const aviso = (texto) => screen.findByText(texto, { selector: '.aviso-flotante__texto' })
const esperarDetalle = () => screen.findByRole('heading', { level: 2, name: 'Basura en el parque Central' })

beforeEach(() => {
  simularApi({})
})

describe('Detalle: causante del daño (RN-27)', () => {
  it('sin cédula del causante no muestra la sección', async () => {
    abrir({ causante_cedula: null, causante: null })
    await esperarDetalle()

    expect(screen.queryByRole('heading', { name: 'Causante del daño' })).not.toBeInTheDocument()
  })

  it('con un ciudadano registrado muestra la cédula, su nombre con enlace y sus sanciones como causante', async () => {
    abrir()
    const caja = await seccion()

    expect(caja).toHaveTextContent('1061234567')
    expect(within(caja).getByRole('link', { name: 'Jorge Muñoz' })).toHaveAttribute('href', '/usuarios/35')
    expect(caja).toHaveTextContent('Tiene 1 sanción previa como causante.')
    // Solo las de causante, con su etiqueta
    const tabla = await within(caja).findByRole('table', { name: /Sanciones como causante/ })
    expect(tabla).toHaveTextContent('Dejó escombros en la vía.')
    expect(tabla).not.toHaveTextContent('Reporte falso.')
    expect(within(tabla).getByText('Por causar el daño')).toBeInTheDocument()
    expect(within(caja).getByRole('button', { name: 'Sancionar al causante' })).toBeInTheDocument()
  })

  it('sin sanciones previas como causante lo dice y no pide la lista', async () => {
    const adaptador = abrir({ causante: { ...REPORTE.causante, sanciones_como_causante: 0, sugerencia: 'advertencia' } })
    const caja = await seccion()

    expect(caja).toHaveTextContent('No tiene sanciones previas como causante.')
    expect(pedidos(adaptador, 'GET /sanciones/')).toBe(0)
  })

  it('si la cédula no es de un ciudadano registrado, lo dice y no hay botón', async () => {
    abrir({ causante: NO_REGISTRADO })
    const caja = await seccion()

    expect(caja).toHaveTextContent('1061234567')
    expect(within(caja).getByText('No está registrado en EcoComunidad')).toBeInTheDocument()
    expect(within(caja).queryByRole('button', { name: 'Sancionar al causante' })).not.toBeInTheDocument()
    expect(within(caja).queryByRole('link')).not.toBeInTheDocument()
  })

  it.each(['aprobado', 'asignado', 'en_proceso', 'resuelto'])('en %s se puede sancionar al causante', async (estado) => {
    abrir({ estado })
    const caja = await seccion()

    expect(within(caja).getByRole('button', { name: 'Sancionar al causante' })).toBeInTheDocument()
  })

  it.each([
    ['pendiente', {}],
    ['rechazado', { motivo_rechazo: 'No aplica.' }],
  ])('en %s no hay botón y explica cuándo se puede', async (estado, extra) => {
    abrir({ estado, ...extra })
    const caja = await seccion()

    expect(within(caja).queryByRole('button', { name: 'Sancionar al causante' })).not.toBeInTheDocument()
    expect(caja).toHaveTextContent(
      'Se puede sancionar al causante cuando el reporte está aprobado, asignado, en proceso o resuelto.',
    )
  })

  it('un reporte eliminado no ofrece sancionar al causante', async () => {
    abrir({ eliminado: true })
    const caja = await seccion()

    expect(within(caja).queryByRole('button', { name: 'Sancionar al causante' })).not.toBeInTheDocument()
  })
})

describe('Sancionar al causante', () => {
  async function abrirFormulario(cambios, rutas) {
    const adaptador = abrir(cambios, rutas)
    const caja = await seccion()
    fireEvent.click(within(caja).getByRole('button', { name: 'Sancionar al causante' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Sancionar al causante' })
    return { adaptador, dialogo }
  }

  it('muestra la sugerencia de su propia escalera y el texto de ayuda del motivo', async () => {
    const { dialogo } = await abrirFormulario()

    const sugerencia = within(dialogo).getByRole('group', { name: 'Sugerencia' })
    expect(sugerencia).toHaveTextContent('Bloqueo temporal')
    expect(sugerencia).toHaveTextContent('Tiene 1 sanción previa como causante.')
    expect(within(dialogo).getByLabelText('Motivo')).toHaveAccessibleDescription(
      expect.stringContaining('No menciones quién hizo el reporte: el causante verá este motivo.'),
    )
    expect(within(dialogo).getByRole('radio', { name: 'Advertencia' })).not.toBeChecked()

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Usar sugerencia' }))
    expect(within(dialogo).getByRole('radio', { name: 'Bloqueo temporal' })).toBeChecked()
  })

  it('el tipo y el motivo son obligatorios: sin ellos no se envía', async () => {
    const { adaptador, dialogo } = await abrirFormulario()

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Revisar sanción' }))
    expect(within(dialogo).getByText('Elige el tipo de sanción.')).toBeInTheDocument()
    expect(within(dialogo).getByText('El motivo es obligatorio.')).toBeInTheDocument()

    fireEvent.click(within(dialogo).getByRole('radio', { name: 'Advertencia' }))
    fireEvent.change(within(dialogo).getByLabelText('Motivo'), { target: { value: '   ' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Revisar sanción' }))

    expect(within(dialogo).getByLabelText('Motivo')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByRole('dialog', { name: '¿Sancionar al causante?' })).not.toBeInTheDocument()
    expect(pedidos(adaptador, SANCIONAR)).toBe(0)
  })

  it('pide confirmación, envía tipo y motivo, avisa y recarga el detalle', async () => {
    const { adaptador, dialogo } = await abrirFormulario()
    const pedidosDetalle = pedidos(adaptador, 'GET /reportes/7/')

    fireEvent.click(within(dialogo).getByRole('radio', { name: 'Bloqueo temporal' }))
    fireEvent.change(within(dialogo).getByLabelText('Motivo'), { target: { value: '  Quemó basura en el parque.  ' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Revisar sanción' }))

    const confirmacion = await screen.findByRole('dialog', { name: '¿Sancionar al causante?' })
    expect(confirmacion).toHaveTextContent('Jorge Muñoz')
    expect(confirmacion).toHaveTextContent('Bloqueo temporal')
    expect(confirmacion).toHaveTextContent('Quemó basura en el parque.')
    expect(confirmacion).toHaveTextContent('sin datos del reporte ni de quién lo hizo')
    expect(pedidos(adaptador, SANCIONAR)).toBe(0)

    fireEvent.click(within(confirmacion).getByRole('button', { name: 'Registrar sanción' }))

    expect(await aviso('Sanción registrada. Jorge Muñoz recibió una notificación.')).toBeInTheDocument()
    const envio = adaptador.mock.calls.find(([c]) => c.method === 'post' && c.url === '/reportes/7/sancionar-causante/')[0]
    expect(JSON.parse(envio.data)).toEqual({ tipo: 'bloqueo_temporal', motivo: 'Quemó basura en el parque.' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(pedidos(adaptador, 'GET /reportes/7/')).toBe(pedidosDetalle + 1))
    expect(await screen.findByText('Tiene 2 sanciones previas como causante.')).toBeInTheDocument()
  })

  it('"Volver" en la confirmación regresa al formulario con lo escrito', async () => {
    const { dialogo } = await abrirFormulario()
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'Advertencia' }))
    fireEvent.change(within(dialogo).getByLabelText('Motivo'), { target: { value: 'Botó escombros.' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Revisar sanción' }))

    const confirmacion = await screen.findByRole('dialog', { name: '¿Sancionar al causante?' })
    fireEvent.click(within(confirmacion).getByRole('button', { name: 'Volver' }))

    const formulario = await screen.findByRole('dialog', { name: 'Sancionar al causante' })
    expect(within(formulario).getByLabelText('Motivo')).toHaveValue('Botó escombros.')
    expect(within(formulario).getByRole('radio', { name: 'Advertencia' })).toBeChecked()
  })

  it('un "detail" del backend se muestra en la confirmación sin cerrarla', async () => {
    const motivo = 'Solo se puede sancionar al causante de un reporte aprobado, asignado, en proceso o resuelto.'
    const { dialogo } = await abrirFormulario({}, { [SANCIONAR]: (c) => responder(c, 400, { detail: motivo }) })
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'Advertencia' }))
    fireEvent.change(within(dialogo).getByLabelText('Motivo'), { target: { value: 'Botó escombros.' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Revisar sanción' }))
    const confirmacion = await screen.findByRole('dialog', { name: '¿Sancionar al causante?' })
    fireEvent.click(within(confirmacion).getByRole('button', { name: 'Registrar sanción' }))

    expect(await within(confirmacion).findByRole('alert')).toHaveTextContent(motivo)
    expect(screen.getByRole('dialog', { name: '¿Sancionar al causante?' })).toBeInTheDocument()
  })

  it('un error del motivo vuelve al formulario y se muestra junto al campo', async () => {
    const { dialogo } = await abrirFormulario({}, {
      [SANCIONAR]: (c) => responder(c, 400, { motivo: ['Asegúrese de que este campo no tenga más de 255 caracteres.'] }),
    })
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'Advertencia' }))
    fireEvent.change(within(dialogo).getByLabelText('Motivo'), { target: { value: 'Botó escombros.' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Revisar sanción' }))
    fireEvent.click(within(await screen.findByRole('dialog', { name: '¿Sancionar al causante?' })).getByRole('button', {
      name: 'Registrar sanción',
    }))

    const formulario = await screen.findByRole('dialog', { name: 'Sancionar al causante' })
    expect(
      await within(formulario).findByText('Asegúrese de que este campo no tenga más de 255 caracteres.'),
    ).toBeInTheDocument()
    expect(within(formulario).getByLabelText('Motivo')).toHaveAttribute('aria-invalid', 'true')
  })
})
