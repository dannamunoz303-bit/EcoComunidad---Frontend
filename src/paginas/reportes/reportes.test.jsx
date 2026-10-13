import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { guardarSesion } from '../../api/sesion.js'
import { ADMIN, montar, responder, simularApi, urlActual } from '../../pruebas/apiSimulada.jsx'

const haceHoras = (horas) => new Date(Date.now() - horas * 60 * 60 * 1000).toISOString()
const ciudadano = { id: 30, nombre: 'Ana', apellido: 'Pérez' }

// Campos tal como los manda GET /api/reportes/ (ReporteSerializer del backend).
function reporte(id, cambios) {
  return {
    id,
    ciudadano,
    categoria_id: 1,
    categoria: 'Basura',
    titulo: `Reporte ${id}`,
    descripcion: 'Descripción',
    direccion: 'Calle 1',
    descripcion_ubicacion: '',
    latitud: '4.71098600',
    longitud: '-74.07209200',
    estado: 'pendiente',
    motivo_rechazo: null,
    eliminado: false,
    fecha_creacion: haceHoras(id),
    fecha_actualizacion: haceHoras(id),
    fecha_revision: null,
    revisado_por: null,
    fotos: [],
    ...cambios,
  }
}

const REPORTES = [
  reporte(1, { titulo: 'Basura en el parque Central', direccion: 'Calle 10 # 5-20' }),
  reporte(2, { titulo: 'Árbol caído en la avenida', categoria_id: 2, categoria: 'Árboles', estado: 'aprobado' }),
  reporte(3, { titulo: 'Escombros en la esquina', direccion: 'Carrera 7 frente al Parque', categoria_id: 3, categoria: 'Escombros', estado: 'resuelto' }),
  reporte(4, { titulo: 'Reporte que se borró', eliminado: true }),
  reporte(5, { titulo: 'Humo de una fábrica', categoria_id: 4, categoria: 'Contaminación', estado: 'rechazado' }),
  reporte(6, { titulo: 'Poda de árboles', categoria_id: 2, categoria: 'Árboles', estado: 'en_proceso' }),
]

const CATEGORIAS = [
  { id: 1, nombre: 'Basura', descripcion: '', activa: true },
  { id: 2, nombre: 'Árboles', descripcion: '', activa: true },
  { id: 3, nombre: 'Escombros', descripcion: '', activa: false },
  { id: 4, nombre: 'Contaminación', descripcion: '', activa: true },
]

// El backend filtra por ?categoria=
const respuestaReportes = (c) => {
  const categoria = c.params?.categoria
  return responder(c, 200, categoria ? REPORTES.filter((r) => String(r.categoria_id) === categoria) : REPORTES)
}

function abrir(ruta = '/reportes', rutas = {}) {
  guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
  const adaptador = simularApi({
    'GET /auth/yo/': (c) => responder(c, 200, ADMIN),
    'GET /reportes/': respuestaReportes,
    'GET /categorias/': (c) => responder(c, 200, CATEGORIAS),
    ...rutas,
  })
  montar(ruta)
  return adaptador
}

const tabla = () => screen.findByRole('table', { name: /Reportes/ })
const titulosVisibles = () =>
  within(screen.getByRole('table', { name: /Reportes/ }))
    .getAllByRole('link')
    .map((enlace) => enlace.textContent)
const botonEstado = (nombre) => screen.getByRole('button', { name: new RegExp(`^${nombre}\\s*\\d+$`) })

beforeEach(() => {
  simularApi({})
})

describe('Lista de reportes', () => {
  it('muestra los reportes del más reciente al más antiguo, sin los eliminados', async () => {
    abrir()
    await tabla()

    expect(titulosVisibles()).toEqual([
      'Basura en el parque Central',
      'Árbol caído en la avenida',
      'Escombros en la esquina',
      'Humo de una fábrica',
      'Poda de árboles',
    ])
    expect(screen.getByText('5 reportes')).toBeInTheDocument()

    const fila = screen.getByRole('link', { name: 'Basura en el parque Central' }).closest('tr')
    expect(fila).toHaveTextContent('Basura')
    expect(fila).toHaveTextContent('Pendiente')
    expect(fila).toHaveTextContent('Ana Pérez')
    expect(fila).toHaveTextContent('hace 1 hora')
    expect(screen.getByRole('link', { name: 'Basura en el parque Central' })).toHaveAttribute('href', '/reportes/1')
  })

  it('muestra la cantidad de cada estado', async () => {
    abrir()
    await tabla()

    expect(botonEstado('Todos')).toHaveTextContent('5')
    expect(botonEstado('Pendientes')).toHaveTextContent('1')
    expect(botonEstado('Aprobados')).toHaveTextContent('1')
    expect(botonEstado('Asignados')).toHaveTextContent('0')
    expect(botonEstado('En proceso')).toHaveTextContent('1')
    expect(botonEstado('Resueltos')).toHaveTextContent('1')
    expect(botonEstado('Rechazados')).toHaveTextContent('1')
    expect(botonEstado('Todos')).toHaveAttribute('aria-pressed', 'true')
  })

  it('filtra por estado y lo escribe en la URL', async () => {
    abrir()
    await tabla()

    fireEvent.click(botonEstado('Resueltos'))

    expect(titulosVisibles()).toEqual(['Escombros en la esquina'])
    expect(botonEstado('Resueltos')).toHaveAttribute('aria-pressed', 'true')
    expect(urlActual()).toBe('/reportes?estado=resuelto')
  })

  it('filtra por categoría en el backend y la escribe en la URL', async () => {
    const adaptador = abrir()
    await tabla()

    fireEvent.change(screen.getByLabelText('Categoría'), { target: { value: '2' } })

    expect(urlActual()).toBe('/reportes?categoria=2')
    await screen.findByText('2 reportes')
    expect(titulosVisibles()).toEqual(['Árbol caído en la avenida', 'Poda de árboles'])
    expect(adaptador.mock.calls.some(([c]) => c.url === '/reportes/' && c.params?.categoria === '2')).toBe(true)
    // Las categorías inactivas también salen, marcadas
    expect(screen.getByRole('option', { name: 'Escombros (inactiva)' })).toBeInTheDocument()
  })

  it('filtra por texto en título o dirección, sin importar tildes, tras 300 ms', async () => {
    abrir()
    await tabla()

    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'parque' } })
    // Antes de la espera todavía no filtra
    expect(titulosVisibles()).toHaveLength(5)

    await screen.findByText('2 reportes')
    expect(titulosVisibles()).toEqual(['Basura en el parque Central', 'Escombros en la esquina'])
    expect(urlActual()).toBe('/reportes?q=parque')

    fireEvent.change(screen.getByLabelText('Buscar'), { target: { value: 'ARBOL CAIDO' } })
    await screen.findByText('1 reporte')
    expect(titulosVisibles()).toEqual(['Árbol caído en la avenida'])
  })

  it('lee los filtros de la URL al abrir', async () => {
    abrir('/reportes?estado=aprobado&categoria=2&q=avenida')
    await tabla()

    expect(titulosVisibles()).toEqual(['Árbol caído en la avenida'])
    expect(botonEstado('Aprobados')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Categoría')).toHaveValue('2')
    expect(screen.getByLabelText('Buscar')).toHaveValue('avenida')
  })

  it('"Ver eliminados" apagado los oculta; encendido los muestra con la etiqueta gris', async () => {
    abrir()
    await tabla()
    const interruptor = screen.getByRole('switch', { name: 'Ver eliminados' })
    expect(interruptor).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByRole('link', { name: 'Reporte que se borró' })).not.toBeInTheDocument()

    fireEvent.click(interruptor)

    expect(interruptor).toHaveAttribute('aria-checked', 'true')
    expect(urlActual()).toBe('/reportes?eliminados=1')
    const fila = screen.getByRole('link', { name: 'Reporte que se borró' }).closest('tr')
    const etiqueta = within(fila).getByText('Eliminado')
    expect(etiqueta).toHaveClass('estado-reporte--eliminado')
    expect(botonEstado('Todos')).toHaveTextContent('6')
  })

  it('sin resultados muestra a Brotico y "Quitar filtros" funciona', async () => {
    abrir('/reportes?q=zzzz&estado=pendiente')

    expect(await screen.findByText('No encontramos reportes con esos filtros. Prueba con otros.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Brotico desanimado' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))

    expect(urlActual()).toBe('/reportes')
    expect(titulosVisibles()).toHaveLength(5)
    expect(screen.getByLabelText('Buscar')).toHaveValue('')
  })

  it('soporta la respuesta paginada y junta todas las páginas', async () => {
    const siguiente = 'https://api.ejemplo/api/reportes/?page=2'
    abrir('/reportes', {
      'GET /reportes/': (c) =>
        responder(c, 200, { count: 6, next: siguiente, previous: null, results: REPORTES.slice(0, 3) }),
      [`GET ${siguiente}`]: (c) =>
        responder(c, 200, { count: 6, next: null, previous: siguiente, results: REPORTES.slice(3) }),
    })
    await tabla()

    expect(titulosVisibles()).toHaveLength(5)
    expect(botonEstado('Todos')).toHaveTextContent('5')
  })

  it('mientras carga muestra siluetas y, si falla, "Reintentar"', async () => {
    let falla = true
    abrir('/reportes', {
      'GET /reportes/': (c) => (falla ? responder(c, 500) : respuestaReportes(c)),
    })

    expect(screen.queryByTestId('siluetas-reportes') ?? (await screen.findByTestId('siluetas-reportes'))).toBeInTheDocument()
    expect(await screen.findByText('No pudimos cargar los reportes.')).toBeInTheDocument()

    falla = false
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await tabla()).toBeInTheDocument()
  })

  it('?ciudadano=<id> filtra por ese ciudadano y el chip se puede quitar', async () => {
    const otro = { id: 31, nombre: 'Luis', apellido: 'Torres' }
    const conOtro = REPORTES.map((r) => (r.id === 2 || r.id === 5 ? { ...r, ciudadano: otro } : r))
    abrir('/reportes?ciudadano=31&estado=aprobado', {
      'GET /reportes/': (c) => responder(c, 200, conOtro),
      'GET /usuarios/31/': (c) => responder(c, 200, { ...otro, rol: 'ciudadano' }),
    })
    await tabla()

    expect(titulosVisibles()).toEqual(['Árbol caído en la avenida'])
    expect(botonEstado('Todos')).toHaveTextContent('2')
    const chip = screen.getByText('Reportes de Luis Torres')
    expect(chip).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Quitar el filtro: Reportes de Luis Torres' }))

    expect(urlActual()).toBe('/reportes?estado=aprobado')
    expect(screen.queryByText('Reportes de Luis Torres')).not.toBeInTheDocument()
    expect(botonEstado('Todos')).toHaveTextContent('5')
  })

  it('el chip toma el nombre del usuario si el ciudadano no tiene reportes', async () => {
    abrir('/reportes?ciudadano=99', {
      'GET /usuarios/99/': (c) => responder(c, 200, { id: 99, nombre: 'Rosa', apellido: 'Mora', rol: 'ciudadano' }),
    })

    expect(await screen.findByText('Reportes de Rosa Mora')).toBeInTheDocument()
    expect(screen.getByText('No encontramos reportes con esos filtros. Prueba con otros.')).toBeInTheDocument()
  })

  it('si no se encuentra el nombre, el chip dice "Reportes del ciudadano #<id>"', async () => {
    abrir('/reportes?ciudadano=77', { 'GET /usuarios/77/': (c) => responder(c, 404, { detail: 'No encontrado.' }) })

    expect(await screen.findByText('Reportes del ciudadano #77')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quitar el filtro: Reportes del ciudadano #77' })).toBeInTheDocument()
  })

  it('el detalle vuelve a la lista con los mismos filtros', async () => {
    abrir('/reportes?estado=pendiente', {
      'GET /reportes/1/': (c) => responder(c, 200, REPORTES[0]),
      'GET /reportes/1/tareas/': (c) => responder(c, 200, []),
    })
    await tabla()

    fireEvent.click(screen.getByRole('link', { name: 'Basura en el parque Central' }))

    const volver = await screen.findByRole('link', { name: 'Volver a reportes' })
    expect(volver).toHaveAttribute('href', '/reportes?estado=pendiente')
  })
})
