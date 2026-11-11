import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { guardarSesion } from '../../../api/sesion.js'
import { ADMIN, montar, pedidos, responder, simularApi, urlActual } from '../../../pruebas/apiSimulada.jsx'

// Mapa simulado: el marcador expone un botón que imita arrastrarlo a otro punto,
// y el mapa otro que imita un clic (si alguien escucha los clics).
const NUEVA_POSICION = { lat: 4.7123456789, lng: -74.0711111111 }
const PUNTO_CLIC = { lat: 4.6512345678, lng: -74.0987654321 }
const mapaSimulado = vi.hoisted(() => ({ clic: null }))
vi.mock('react-leaflet', () => ({
  MapContainer: ({ center, zoom, children }) => (
    <div data-testid="mapa" data-centro={center.join(',')} data-zoom={zoom}>
      {children}
      <button type="button" onClick={() => mapaSimulado.clic?.({ latlng: PUNTO_CLIC })}>
        Simular clic en el mapa
      </button>
    </div>
  ),
  useMapEvents: (manejadores) => {
    mapaSimulado.clic = manejadores.click
    return {}
  },
  TileLayer: () => null,
  Marker: ({ position, draggable, eventHandlers }) => (
    <button
      type="button"
      data-testid="marcador"
      data-posicion={position.join(',')}
      data-arrastrable={String(Boolean(draggable))}
      onClick={() => eventHandlers.dragend({ target: { getLatLng: () => NUEVA_POSICION } })}
    >
      Simular arrastre
    </button>
  ),
  useMap: () => ({ panTo: () => {} }),
}))
vi.mock('leaflet', () => ({ default: { divIcon: (opciones) => opciones } }))

const REPORTE = {
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
  estado: 'aprobado',
  urgencia: 'media',
  municipio: { id: 15, nombre: 'Popayán' },
  vereda: 'La Playa',
  zona: { id: 2, nombre: 'centro' },
  motivo_rechazo: null,
  eliminado: false,
  fecha_creacion: '2026-10-10T09:00:00-05:00',
  fecha_actualizacion: '2026-10-10T09:00:00-05:00',
  fecha_revision: null,
  revisado_por: null,
  fotos: [],
}

const CATEGORIAS = [
  { id: 1, nombre: 'Basura', descripcion: '', activa: true },
  { id: 2, nombre: 'Árboles', descripcion: '', activa: true },
  { id: 3, nombre: 'Escombros', descripcion: '', activa: false },
]

// GET /api/municipios/ (algunos de los 42, con su zona)
const NORTE = { id: 1, nombre: 'norte' }
const CENTRO = { id: 2, nombre: 'centro' }
const SUR = { id: 3, nombre: 'sur' }
const MUNICIPIOS = [
  { id: 4, nombre: 'Guachené', zona: NORTE },
  { id: 8, nombre: 'Jambaló', zona: NORTE },
  { id: 30, nombre: 'Patía', zona: SUR },
  { id: 12, nombre: 'Piendamó', zona: CENTRO },
  { id: 15, nombre: 'Popayán', zona: CENTRO },
  { id: 20, nombre: 'Santander de Quilichao', zona: NORTE },
]

const PATCH = 'PATCH /reportes/7/'

function abrir(reporte = REPORTE, respuestaPatch, otrosReportes = []) {
  guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
  mapaSimulado.clic = null
  const adaptador = simularApi({
    'GET /reportes/': (c) => responder(c, 200, [reporte, ...otrosReportes]),
    'GET /auth/yo/': (c) => responder(c, 200, ADMIN),
    'GET /reportes/7/': (c) => responder(c, 200, reporte),
    'GET /reportes/7/tareas/': (c) => responder(c, 200, []),
    'GET /categorias/': (c) => responder(c, 200, CATEGORIAS),
    'GET /municipios/': (c) => responder(c, 200, MUNICIPIOS),
    [PATCH]: respuestaPatch ?? ((c) => responder(c, 200, { ...reporte, ...JSON.parse(c.data) })),
  })
  montar('/reportes/7/editar')
  return adaptador
}

const formulario = () => screen.findByLabelText('Título')
const guardar = () => screen.getByRole('button', { name: 'Guardar cambios' })
const cuerpoPatch = (adaptador) => JSON.parse(adaptador.mock.calls.find(([c]) => c.method === 'patch')[0].data)

beforeEach(() => {
  simularApi({})
})

describe('Editar reporte', () => {
  it('carga los datos actuales y no deja guardar sin cambios', async () => {
    abrir()
    await formulario()

    expect(screen.getByLabelText('Título')).toHaveValue('Basura en el parque Central')
    expect(screen.getByLabelText('Título')).toHaveAttribute('maxLength', '150')
    expect(screen.getByLabelText('Dirección')).toHaveAttribute('maxLength', '255')
    expect(screen.getByLabelText('Categoría')).toHaveValue('1')
    expect(screen.getByLabelText('Latitud')).toHaveValue('4.71098600')
    expect(screen.getByLabelText('Longitud')).toHaveValue('-74.07209200')
    expect(screen.getByLabelText('Latitud')).not.toHaveAttribute('readOnly')
    expect(guardar()).toBeDisabled()
  })

  it('solo ofrece categorías activas', async () => {
    abrir()
    await formulario()

    const opciones = within(screen.getByLabelText('Categoría'))
      .getAllByRole('option')
      .map((o) => o.textContent)
    expect(opciones).toEqual(['Basura', 'Árboles'])
  })

  it('si la categoría actual está inactiva, se ve pero no se puede elegir', async () => {
    abrir({ ...REPORTE, categoria_id: 3, categoria: 'Escombros' })
    await formulario()

    const opcion = screen.getByRole('option', { name: 'Escombros (inactiva)' })
    expect(opcion).toBeDisabled()
    expect(screen.getByLabelText('Categoría')).toHaveValue('3')
  })

  it('envía solo los campos que cambiaron, avisa y vuelve al detalle', async () => {
    const adaptador = abrir()
    await formulario()

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Basura en el parque Norte' } })
    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: '2' } })
    fireEvent.click(guardar())

    expect(await screen.findByText('Cambios guardados.', { selector: '.aviso-flotante__texto' })).toBeInTheDocument()
    expect(cuerpoPatch(adaptador)).toEqual({ titulo: 'Basura en el parque Norte', categoria: 2 })
    // La navegación de React Router va en una transición: se espera a que termine
    await waitFor(() => expect(urlActual()).toBe('/reportes/7'))
    expect(await screen.findByRole('complementary', { name: 'Acciones del reporte' })).toBeInTheDocument()
  })

  it('muestra los errores del backend junto a cada campo', async () => {
    abrir(REPORTE, (c) =>
      responder(c, 400, {
        titulo: ['Este campo no puede estar en blanco.'],
        direccion: ['Asegúrese de que este campo no tenga más de 255 caracteres.'],
      }),
    )
    await formulario()

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Dirección'), { target: { value: 'Otra dirección' } })
    fireEvent.click(guardar())

    const titulo = screen.getByLabelText('Título')
    expect(await screen.findByText('Este campo no puede estar en blanco.')).toBeInTheDocument()
    expect(titulo).toHaveAttribute('aria-invalid', 'true')
    expect(titulo).toHaveAccessibleDescription(/Este campo no puede estar en blanco\./)
    expect(screen.getByLabelText('Dirección')).toHaveAccessibleDescription(/no tenga más de 255 caracteres/)
    expect(urlActual()).toBe('/reportes/7/editar')
  })

  it('un "detail" del backend se muestra arriba del formulario', async () => {
    abrir(REPORTE, (c) => responder(c, 400, { detail: 'El reporte ya está eliminado.' }))
    await formulario()

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Otro título' } })
    fireEvent.click(guardar())

    expect(await screen.findByRole('alert')).toHaveTextContent('El reporte ya está eliminado.')
  })

  it('al escribir la latitud y la longitud el marcador se mueve, y al salir se redondean a 8 decimales', async () => {
    const adaptador = abrir()
    await formulario()
    const latitud = screen.getByLabelText('Latitud')
    const longitud = screen.getByLabelText('Longitud')
    expect(latitud).not.toHaveAttribute('readOnly')
    expect(latitud).toHaveAccessibleDescription('Entre -90 y 90. Se redondea a 8 decimales.')

    fireEvent.change(latitud, { target: { value: '4.7123456789' } })
    expect(await screen.findByTestId('marcador')).toHaveAttribute('data-posicion', '4.71234568,-74.072092')
    fireEvent.blur(latitud)
    expect(latitud).toHaveValue('4.71234568')

    // Coma decimal, como se escribe en Colombia
    fireEvent.change(longitud, { target: { value: '-74,05' } })
    fireEvent.blur(longitud)
    expect(longitud).toHaveValue('-74.05000000')
    expect(screen.getByTestId('marcador')).toHaveAttribute('data-posicion', '4.71234568,-74.05')

    fireEvent.click(guardar())
    await screen.findByText('Cambios guardados.', { selector: '.aviso-flotante__texto' })
    expect(cuerpoPatch(adaptador)).toEqual({ latitud: '4.71234568', longitud: '-74.05000000' })
  })

  it.each([
    ['Latitud', '95', 'La latitud debe estar entre -90 y 90.'],
    ['Latitud', '-90.5', 'La latitud debe estar entre -90 y 90.'],
    ['Longitud', '181', 'La longitud debe estar entre -180 y 180.'],
    ['Longitud', '-180.00001', 'La longitud debe estar entre -180 y 180.'],
    ['Latitud', 'abc', 'Escribe un número con punto decimal, por ejemplo 4.71098600.'],
    ['Longitud', '', 'Escribe un número con punto decimal, por ejemplo 4.71098600.'],
  ])('%s "%s" muestra un error y no deja guardar', async (etiqueta, valor, mensaje) => {
    const adaptador = abrir()
    await formulario()
    const campo = screen.getByLabelText(etiqueta)
    const marcador = await screen.findByTestId('marcador')

    fireEvent.change(campo, { target: { value: valor } })
    fireEvent.blur(campo)

    expect(screen.getByText(mensaje)).toBeInTheDocument()
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(campo).toHaveAccessibleDescription(new RegExp(mensaje.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    expect(marcador).toHaveAttribute('data-posicion', '4.710986,-74.072092')
    expect(guardar()).toBeDisabled()
    fireEvent.submit(campo.closest('form'))
    expect(pedidos(adaptador, PATCH)).toBe(0)
  })

  it('se redondea a 8 decimales antes de validar el rango (RN-06)', async () => {
    abrir()
    await formulario()
    const latitud = screen.getByLabelText('Latitud')

    fireEvent.change(latitud, { target: { value: '90.000000001' } })
    fireEvent.blur(latitud)

    expect(latitud).toHaveValue('90.00000000')
    expect(latitud).not.toHaveAttribute('aria-invalid')
    expect(guardar()).toBeEnabled()
  })

  it('al arrastrar el marcador los campos se actualizan y se quitan los errores', async () => {
    abrir()
    await formulario()
    const latitud = screen.getByLabelText('Latitud')
    fireEvent.change(latitud, { target: { value: '200' } })
    fireEvent.blur(latitud)
    expect(screen.getByText('La latitud debe estar entre -90 y 90.')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('marcador'))

    expect(latitud).toHaveValue('4.71234568')
    expect(screen.getByLabelText('Longitud')).toHaveValue('-74.07111111')
    expect(screen.queryByText('La latitud debe estar entre -90 y 90.')).not.toBeInTheDocument()
    expect(guardar()).toBeEnabled()
  })

  it('"Volver a la ubicación original" restablece lo escrito a mano', async () => {
    abrir()
    await formulario()
    const latitud = screen.getByLabelText('Latitud')
    const longitud = screen.getByLabelText('Longitud')
    fireEvent.change(latitud, { target: { value: '5.1' } })
    fireEvent.change(longitud, { target: { value: '999' } })
    fireEvent.blur(longitud)

    fireEvent.click(screen.getByRole('button', { name: 'Volver a la ubicación original' }))

    expect(latitud).toHaveValue('4.71098600')
    expect(longitud).toHaveValue('-74.07209200')
    expect(longitud).not.toHaveAttribute('aria-invalid')
    expect(screen.getByTestId('marcador')).toHaveAttribute('data-posicion', '4.710986,-74.072092')
    expect(guardar()).toBeDisabled()
  })

  it('un reporte sin coordenadas puede recibirlas escribiéndolas, y entonces aparece el mapa', async () => {
    const adaptador = abrir({ ...REPORTE, latitud: null, longitud: null })
    await formulario()
    expect(screen.getByText(/no tiene coordenadas/)).toBeInTheDocument()
    expect(guardar()).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Latitud'), { target: { value: '4.6' } })
    fireEvent.change(screen.getByLabelText('Longitud'), { target: { value: '-74.08' } })

    expect(await screen.findByTestId('marcador')).toHaveAttribute('data-posicion', '4.6,-74.08')
    fireEvent.click(guardar())
    await screen.findByText('Cambios guardados.', { selector: '.aviso-flotante__texto' })
    expect(cuerpoPatch(adaptador)).toEqual({ latitud: '4.60000000', longitud: '-74.08000000' })
  })

  describe('reporte sin coordenadas', () => {
    const SIN = { ...REPORTE, latitud: null, longitud: null }
    const otro = (id, latitud, longitud) => ({ ...REPORTE, id, latitud, longitud })

    it('el mapa se abre en el promedio de los demás reportes con coordenadas (zoom 13)', async () => {
      abrir(SIN, undefined, [otro(8, '4.00000000', '-74.00000000'), otro(9, '5.00000000', '-75.00000000'), otro(10, null, null)])
      await formulario()

      const mapa = await screen.findByTestId('mapa')
      expect(mapa).toHaveAttribute('data-centro', '4.5,-74.5')
      expect(mapa).toHaveAttribute('data-zoom', '13')
      expect(screen.queryByTestId('marcador')).not.toBeInTheDocument()
      expect(screen.getByText(/Haz clic en el mapa para poner el marcador/)).toBeInTheDocument()
    })

    it('si ningún reporte tiene coordenadas, se abre en el centro de Colombia (zoom 6)', async () => {
      abrir(SIN, undefined, [otro(10, null, null)])
      await formulario()

      const mapa = await screen.findByTestId('mapa')
      expect(mapa).toHaveAttribute('data-centro', '4.5709,-74.2973')
      expect(mapa).toHaveAttribute('data-zoom', '6')
    })

    it('si no se pueden cargar los demás reportes, también usa el centro de Colombia', async () => {
      guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
      simularApi({
        'GET /auth/yo/': (c) => responder(c, 200, ADMIN),
        'GET /reportes/7/': (c) => responder(c, 200, SIN),
        'GET /categorias/': (c) => responder(c, 200, CATEGORIAS),
        'GET /reportes/': (c) => responder(c, 500),
      })
      montar('/reportes/7/editar')

      expect(await screen.findByTestId('mapa')).toHaveAttribute('data-centro', '4.5709,-74.2973')
    })

    it('un clic en el mapa pone el marcador y llena latitud y longitud', async () => {
      const adaptador = abrir(SIN, undefined, [otro(8, '4.00000000', '-74.00000000')])
      await formulario()
      await screen.findByTestId('mapa')

      fireEvent.click(screen.getByRole('button', { name: 'Simular clic en el mapa' }))

      expect(screen.getByLabelText('Latitud')).toHaveValue('4.65123457')
      expect(screen.getByLabelText('Longitud')).toHaveValue('-74.09876543')
      expect(await screen.findByTestId('marcador')).toHaveAttribute('data-posicion', '4.65123457,-74.09876543')

      fireEvent.click(guardar())
      await screen.findByText('Cambios guardados.', { selector: '.aviso-flotante__texto' })
      expect(cuerpoPatch(adaptador)).toEqual({ latitud: '4.65123457', longitud: '-74.09876543' })
    })

    it('si el reporte ya tenía coordenadas, el clic en el mapa no mueve el marcador', async () => {
      abrir()
      await formulario()
      await screen.findByTestId('marcador')

      fireEvent.click(screen.getByRole('button', { name: 'Simular clic en el mapa' }))

      expect(screen.getByLabelText('Latitud')).toHaveValue('4.71098600')
    })
  })

  it('los otros reportes solo se piden si el reporte no tiene coordenadas', async () => {
    const adaptador = abrir()
    await formulario()
    await screen.findByTestId('marcador')

    expect(pedidos(adaptador, 'GET /reportes/')).toBe(0)
  })

  it('el marcador se arrastra y "Volver a la ubicación original" restablece las coordenadas', async () => {
    const adaptador = abrir()
    await formulario()
    const marcador = await screen.findByTestId('marcador')
    expect(marcador).toHaveAttribute('data-arrastrable', 'true')
    const volver = screen.getByRole('button', { name: 'Volver a la ubicación original' })
    expect(volver).toBeDisabled()

    fireEvent.click(marcador)
    expect(screen.getByLabelText('Latitud')).toHaveValue('4.71234568')
    expect(screen.getByLabelText('Longitud')).toHaveValue('-74.07111111')
    expect(guardar()).toBeEnabled()

    fireEvent.click(volver)
    expect(screen.getByLabelText('Latitud')).toHaveValue('4.71098600')
    expect(screen.getByLabelText('Longitud')).toHaveValue('-74.07209200')
    expect(screen.getByTestId('marcador')).toHaveAttribute('data-posicion', '4.710986,-74.072092')
    expect(guardar()).toBeDisabled()

    // Si se guarda tras moverlo, se envían solo las coordenadas con 8 decimales
    fireEvent.click(screen.getByTestId('marcador'))
    fireEvent.click(guardar())
    await screen.findByText('Cambios guardados.', { selector: '.aviso-flotante__texto' })
    expect(cuerpoPatch(adaptador)).toEqual({ latitud: '4.71234568', longitud: '-74.07111111' })
  })

  it('el botón "Guardar cambios" no se puede pulsar dos veces', async () => {
    let soltar
    const adaptador = abrir(
      REPORTE,
      (c) =>
        new Promise((resolve) => {
          soltar = () => resolve(responder(c, 200, REPORTE))
        }),
    )
    await formulario()

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Otro' } })
    fireEvent.click(guardar())
    const esperando = screen.getByRole('button', { name: 'Guardando…' })
    expect(esperando).toBeDisabled()
    fireEvent.click(esperando)
    fireEvent.submit(esperando.closest('form'))

    await screen.findByRole('button', { name: 'Guardando…' })
    await new Promise((r) => setTimeout(r, 0))
    expect(pedidos(adaptador, PATCH)).toBe(1)
    soltar()
    expect(await screen.findByText('Cambios guardados.', { selector: '.aviso-flotante__texto' })).toBeInTheDocument()
  })

  it('un reporte eliminado no se puede editar', async () => {
    abrir({ ...REPORTE, eliminado: true })

    expect(await screen.findByText('Este reporte fue eliminado y ya no admite cambios.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Título')).not.toBeInTheDocument()
  })
})

describe('Editar reporte: municipio y vereda (RN-23)', () => {
  const municipio = () => screen.getByRole('combobox', { name: 'Municipio' })
  const nombresMunicipios = () =>
    within(municipio())
      .getAllByRole('option')
      .filter((o) => !o.disabled)
      .map((o) => o.textContent)

  it('muestra el municipio y la vereda actuales, con los municipios agrupados por zona', async () => {
    abrir()
    await formulario()
    await waitFor(() => expect(municipio()).toHaveValue('15'))

    expect(screen.getByLabelText(/^Vereda o corregimiento/)).toHaveValue('La Playa')
    expect(screen.getByLabelText(/^Vereda o corregimiento/)).toHaveAttribute('maxLength', '120')
    expect(municipio()).toHaveAccessibleDescription('Zona Centro. La zona del reporte sale de su municipio.')
    const grupos = [...municipio().querySelectorAll('optgroup')].map((g) => g.label)
    expect(grupos).toEqual(['Zona Centro', 'Zona Norte', 'Zona Sur'])
    expect(guardar()).toBeDisabled()
  })

  it('el buscador encuentra municipios sin importar tildes ni mayúsculas', async () => {
    abrir()
    await formulario()
    await waitFor(() => expect(municipio()).toHaveValue('15'))
    const buscar = screen.getByLabelText('Buscar municipio')

    fireEvent.change(buscar, { target: { value: 'PIENDAMO' } })
    // El elegido (Popayán) se conserva aunque no coincida
    expect(nombresMunicipios()).toEqual(['Piendamó', 'Popayán'])

    fireEvent.change(buscar, { target: { value: 'jambalo' } })
    expect(nombresMunicipios()).toEqual(['Popayán', 'Jambaló'])

    fireEvent.change(buscar, { target: { value: 'guachene' } })
    expect(nombresMunicipios()).toEqual(['Popayán', 'Guachené'])

    fireEvent.change(buscar, { target: { value: 'xyz' } })
    expect(screen.getByText('Ningún municipio coincide con «xyz».')).toBeInTheDocument()
  })

  it('cambiar municipio y vereda envía el id del municipio y la vereda sin espacios', async () => {
    const adaptador = abrir()
    await formulario()
    await waitFor(() => expect(municipio()).toHaveValue('15'))

    fireEvent.change(screen.getByLabelText('Buscar municipio'), { target: { value: 'patia' } })
    fireEvent.change(municipio(), { target: { value: '30' } })
    expect(municipio()).toHaveAccessibleDescription('Zona Sur. La zona del reporte sale de su municipio.')
    fireEvent.change(screen.getByLabelText(/^Vereda o corregimiento/), { target: { value: '  El Bordo  ' } })
    fireEvent.click(guardar())

    await waitFor(() => expect(pedidos(adaptador, PATCH)).toBe(1))
    expect(cuerpoPatch(adaptador)).toEqual({ municipio: 30, vereda: 'El Bordo' })
  })

  it('borrar la vereda la envía vacía', async () => {
    const adaptador = abrir()
    await formulario()

    fireEvent.change(screen.getByLabelText(/^Vereda o corregimiento/), { target: { value: '   ' } })
    fireEvent.click(guardar())

    await waitFor(() => expect(pedidos(adaptador, PATCH)).toBe(1))
    expect(cuerpoPatch(adaptador)).toEqual({ vereda: '' })
  })

  it('un reporte viejo sin municipio pide elegir uno y no se rompe', async () => {
    const adaptador = abrir({ ...REPORTE, municipio: null, vereda: null, zona: null })
    await formulario()
    await waitFor(() => expect(within(municipio()).getAllByRole('option').length).toBeGreaterThan(1))

    expect(municipio()).toHaveValue('')
    expect(screen.getByRole('option', { name: 'Sin municipio: elige uno' })).toBeDisabled()
    expect(screen.getByLabelText(/^Vereda o corregimiento/)).toHaveValue('')

    fireEvent.change(municipio(), { target: { value: '15' } })
    fireEvent.click(guardar())

    await waitFor(() => expect(pedidos(adaptador, PATCH)).toBe(1))
    expect(cuerpoPatch(adaptador)).toEqual({ municipio: 15 })
  })

  it('el error del backend sobre el municipio se muestra junto al campo', async () => {
    abrir(REPORTE, (c) => responder(c, 400, { municipio: ['El municipio no existe.'] }))
    await formulario()
    await waitFor(() => expect(municipio()).toHaveValue('15'))

    fireEvent.change(municipio(), { target: { value: '12' } })
    fireEvent.click(guardar())

    expect(await screen.findByText('El municipio no existe.')).toBeInTheDocument()
    expect(municipio()).toHaveAttribute('aria-invalid', 'true')
  })

  it('si los municipios no cargan, lo dice y deja reintentar', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    simularApi({
      'GET /auth/yo/': (c) => responder(c, 200, ADMIN),
      'GET /reportes/7/': (c) => responder(c, 200, REPORTE),
      'GET /categorias/': (c) => responder(c, 200, CATEGORIAS),
      'GET /municipios/': (c) => responder(c, 500, {}),
    })
    montar('/reportes/7/editar')
    await formulario()

    expect(await screen.findByText('No pudimos cargar los municipios.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
