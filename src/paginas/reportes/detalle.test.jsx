import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { guardarSesion } from '../../api/sesion.js'
import { ADMIN, montar, responder, simularApi } from '../../pruebas/apiSimulada.jsx'
import { formatearFechaHora } from '../../utilidades/fechas.js'

// Testing Library normaliza los espacios del DOM (incluido el no separable de "p. m.").
const fechaHora = (valor) => formatearFechaHora(valor).replace(/\s+/g, ' ')

// Leaflet no funciona en jsdom: se simula el mapa.
vi.mock('react-leaflet', () => ({
  MapContainer: ({ center, children }) => (
    <div data-testid="mapa" data-centro={center.join(',')}>
      {children}
    </div>
  ),
  TileLayer: ({ attribution }) => <span data-testid="teselas" data-atribucion={attribution} />,
  Marker: ({ position }) => <span data-testid="marcador" data-posicion={position.join(',')} />,
}))
vi.mock('leaflet', () => ({ default: { divIcon: (opciones) => opciones } }))

// Campos tal como los manda GET /api/reportes/<id>/ (ReporteSerializer del backend).
const REPORTE = {
  id: 7,
  ciudadano: { id: 30, nombre: 'Ana', apellido: 'Pérez' },
  categoria_id: 1,
  categoria: 'Basura',
  titulo: 'Basura en el parque Central',
  descripcion: 'Hay bolsas acumuladas desde hace una semana.',
  direccion: 'Calle 10 # 5-20',
  descripcion_ubicacion: 'Frente a la cancha',
  latitud: '4.71098600',
  longitud: '-74.07209200',
  estado: 'rechazado',
  motivo_rechazo: 'No es un tema ambiental.',
  eliminado: false,
  fecha_creacion: '2026-10-10T09:00:00-05:00',
  fecha_actualizacion: '2026-10-12T15:30:00-05:00',
  fecha_revision: '2026-10-12T15:30:00-05:00',
  revisado_por: { id: 1, nombre: 'Laura', apellido: 'Gómez' },
  fotos: [
    { id: 11, url: 'https://fotos.ejemplo/1.jpg', fecha: '2026-10-10T09:00:00-05:00' },
    { id: 12, url: 'https://fotos.ejemplo/2.jpg', fecha: '2026-10-10T09:00:00-05:00' },
    { id: 13, url: 'https://fotos.ejemplo/3.jpg', fecha: '2026-10-10T09:00:00-05:00' },
  ],
}

// GET /api/reportes/<id>/tareas/ (TareaConAccionesSerializer)
const TAREAS = [
  {
    id: 21,
    gestor: { id: 40, nombre: 'Carlos', apellido: 'Ríos' },
    estado: 'terminada',
    fecha_asignacion: '2026-10-11T08:00:00-05:00',
    fecha_fin: '2026-10-12T10:00:00-05:00',
    acciones: [
      {
        id: 2,
        descripcion: 'Retiré las bolsas.',
        fecha: '2026-10-12T09:00:00-05:00',
        fotos: [{ id: 31, url: 'https://fotos.ejemplo/e1.jpg', fecha: '2026-10-12T09:00:00-05:00' }],
      },
      { id: 1, descripcion: 'Revisé el lugar.', fecha: '2026-10-11T10:00:00-05:00', fotos: [] },
    ],
  },
]

function abrir(reporte = REPORTE, tareas = TAREAS) {
  guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
  simularApi({
    'GET /auth/yo/': (c) => responder(c, 200, ADMIN),
    [`GET /reportes/${reporte.id}/`]: (c) => responder(c, 200, reporte),
    [`GET /reportes/${reporte.id}/tareas/`]: (c) => responder(c, 200, tareas),
  })
  montar(`/reportes/${reporte.id}`)
}

const esperarDetalle = () => screen.findByRole('heading', { level: 2, name: 'Basura en el parque Central' })

beforeEach(() => {
  simularApi({})
})

describe('Detalle del reporte', () => {
  it('muestra los datos del reporte', async () => {
    abrir()
    await esperarDetalle()

    expect(screen.getByText('Reporte #7')).toBeInTheDocument()
    expect(screen.getByText('Rechazado', { selector: '.estado-reporte' })).toBeInTheDocument()
    expect(screen.getByText(fechaHora(REPORTE.fecha_creacion))).toBeInTheDocument()
    expect(screen.getByText('Hay bolsas acumuladas desde hace una semana.')).toBeInTheDocument()

    const datos = screen.getByRole('region', { name: 'Datos del reporte' })
    expect(datos).toHaveTextContent('Basura')
    expect(datos).toHaveTextContent('Ana Pérez')
    expect(datos).toHaveTextContent('Laura Gómez')
    expect(datos).not.toHaveTextContent(/c[eé]dula/i)

    expect(screen.getByText('Calle 10 # 5-20')).toBeInTheDocument()
    expect(screen.getByText('Frente a la cancha')).toBeInTheDocument()
    expect(screen.getByText('Acciones del reporte (próximo paso)')).toBeInTheDocument()
  })

  it('muestra el aviso de rechazo con su motivo', async () => {
    abrir()
    await esperarDetalle()

    expect(screen.getByText('Reporte rechazado')).toBeInTheDocument()
    expect(screen.getByText('Motivo: No es un tema ambiental.')).toBeInTheDocument()
  })

  it('muestra el aviso gris si el reporte fue eliminado', async () => {
    abrir({ ...REPORTE, estado: 'pendiente', motivo_rechazo: null, eliminado: true })
    await esperarDetalle()

    expect(screen.getByText('Este reporte fue eliminado')).toBeInTheDocument()
    expect(screen.queryByText('Reporte rechazado')).not.toBeInTheDocument()
  })

  it('muestra las fotos con su texto alternativo', async () => {
    abrir()
    await esperarDetalle()

    const fotos = screen.getByRole('region', { name: 'Fotos' })
    expect(within(fotos).getAllByRole('button')).toHaveLength(3)
    expect(within(fotos).getByAltText('Foto 1 del reporte')).toHaveAttribute('src', 'https://fotos.ejemplo/1.jpg')
  })

  it('la galería se abre, avanza con las flechas y se cierra con Esc', async () => {
    abrir()
    await esperarDetalle()
    const miniatura = screen.getByRole('button', { name: 'Ver en grande: Foto 1 del reporte' })

    fireEvent.click(miniatura)
    const dialogo = screen.getByRole('dialog', { name: 'Foto 1 del reporte' })
    expect(within(dialogo).getByRole('button', { name: 'Cerrar' })).toHaveFocus()
    expect(within(dialogo).getByText(/1 de 3/)).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(screen.getByRole('dialog', { name: 'Foto 2 del reporte' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(screen.getByRole('dialog', { name: 'Foto 1 del reporte' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(screen.getByRole('dialog', { name: 'Foto 3 del reporte' })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    // El foco vuelve a la miniatura de la última foto vista
    expect(screen.getByRole('button', { name: 'Ver en grande: Foto 3 del reporte' })).toHaveFocus()
  })

  it('el botón "Cerrar" también cierra la galería', async () => {
    abrir()
    await esperarDetalle()

    fireEvent.click(screen.getByRole('button', { name: 'Ver en grande: Foto 2 del reporte' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('muestra el mapa con las coordenadas y el enlace a OpenStreetMap', async () => {
    abrir()
    await esperarDetalle()

    const mapa = await screen.findByTestId('mapa')
    expect(mapa).toHaveAttribute('data-centro', '4.710986,-74.072092')
    expect(screen.getByTestId('teselas').getAttribute('data-atribucion')).toContain('OpenStreetMap')
    const enlace = screen.getByRole('link', { name: /Abrir en OpenStreetMap/ })
    expect(enlace).toHaveAttribute('href', expect.stringContaining('mlat=4.710986&mlon=-74.072092'))
    expect(enlace).toHaveAttribute('target', '_blank')
  })

  it('sin coordenadas muestra un mensaje en lugar del mapa', async () => {
    abrir({ ...REPORTE, latitud: null, longitud: null })
    await esperarDetalle()

    expect(screen.getByText(/no tiene coordenadas/)).toBeInTheDocument()
    expect(screen.queryByTestId('mapa')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Abrir en OpenStreetMap/ })).not.toBeInTheDocument()
  })

  it('muestra el historial de tareas con sus acciones de la más reciente a la más antigua', async () => {
    abrir()
    await esperarDetalle()

    const historial = screen.getByRole('region', { name: 'Historial de tareas' })
    expect(await within(historial).findByRole('heading', { name: 'Carlos Ríos' })).toBeInTheDocument()
    expect(within(historial).getByText('Terminada')).toBeInTheDocument()
    expect(historial).toHaveTextContent(fechaHora(TAREAS[0].fecha_asignacion))
    expect(historial).toHaveTextContent(fechaHora(TAREAS[0].fecha_fin))

    const acciones = [...within(historial).getByRole('list', { name: 'Acciones de Carlos Ríos' }).children]
    expect(acciones[0]).toHaveTextContent('Retiré las bolsas.')
    expect(acciones[1]).toHaveTextContent('Revisé el lugar.')

    // La evidencia también se abre en grande
    fireEvent.click(within(acciones[0]).getByRole('button', { name: /Ver en grande: Evidencia 1/ }))
    expect(screen.getByRole('dialog', { name: /Evidencia 1 de la acción/ })).toBeInTheDocument()
  })

  it('sin tareas muestra "Este reporte aún no tiene tareas."', async () => {
    abrir(REPORTE, [])
    await esperarDetalle()

    expect(await screen.findByText('Este reporte aún no tiene tareas.')).toBeInTheDocument()
  })

  it('un 404 muestra que el reporte no existe', async () => {
    guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
    simularApi({
      'GET /auth/yo/': (c) => responder(c, 200, ADMIN),
      'GET /reportes/999/': (c) => responder(c, 404, { detail: 'No encontrado.' }),
      'GET /reportes/999/tareas/': (c) => responder(c, 404, { detail: 'No encontrado.' }),
    })
    montar('/reportes/999')

    expect(await screen.findByText('Este reporte no existe o fue borrado.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Brotico desanimado' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a la lista de reportes' })).toHaveAttribute('href', '/reportes')
  })
})
