import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { guardarSesion } from '../../api/sesion.js'
import { ADMIN, montar, responder, simularApi, urlActual } from '../../pruebas/apiSimulada.jsx'

const haceHoras = (horas) => new Date(Date.now() - horas * 60 * 60 * 1000).toISOString()
const ciudadano = { id: 30, nombre: 'Ana', apellido: 'Pérez' }

// GET /api/zonas/ y los municipios de los reportes (RN-23)
const ZONAS = [
  { id: 2, nombre: 'centro' },
  { id: 1, nombre: 'norte' },
  { id: 3, nombre: 'sur' },
]
const POPAYAN = { municipio: { id: 15, nombre: 'Popayán' }, zona: ZONAS[0] }
const CALOTO = { municipio: { id: 5, nombre: 'Caloto' }, zona: ZONAS[1] }

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
    urgencia: 'media',
    ...POPAYAN,
    vereda: null,
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

// En el orden en que los manda el backend al administrador (RN-25)
const REPORTES = [
  reporte(1, { titulo: 'Basura en el parque Central', direccion: 'Calle 10 # 5-20', urgencia: 'alta', vereda: 'La Playa' }),
  reporte(2, { titulo: 'Árbol caído en la avenida', categoria_id: 2, categoria: 'Árboles', estado: 'aprobado', urgencia: 'alta', ...CALOTO }),
  reporte(3, { titulo: 'Escombros en la esquina', direccion: 'Carrera 7 frente al Parque', categoria_id: 3, categoria: 'Escombros', estado: 'resuelto' }),
  reporte(4, { titulo: 'Reporte que se borró', eliminado: true }),
  // Reporte anterior a RN-23: sin municipio ni zona
  reporte(5, { titulo: 'Humo de una fábrica', categoria_id: 4, categoria: 'Contaminación', estado: 'rechazado', municipio: null, zona: null }),
  reporte(6, { titulo: 'Poda de árboles', categoria_id: 2, categoria: 'Árboles', estado: 'en_proceso', urgencia: 'baja', ...CALOTO }),
]

const CATEGORIAS = [
  { id: 1, nombre: 'Basura', descripcion: '', activa: true },
  { id: 2, nombre: 'Árboles', descripcion: '', activa: true },
  { id: 3, nombre: 'Escombros', descripcion: '', activa: false },
  { id: 4, nombre: 'Contaminación', descripcion: '', activa: true },
]

// El backend filtra por ?categoria=, ?urgencia= y ?zona= (id o "sin" para los reportes sin municipio)
const coincideZona = (r, zona) => {
  if (!zona) return true
  if (zona === 'sin') return !r.municipio
  return String(r.zona?.id) === zona
}
const respuestaReportes = (c) => {
  const { categoria, urgencia, zona } = c.params ?? {}
  return responder(
    c,
    200,
    REPORTES.filter(
      (r) =>
        (!categoria || String(r.categoria_id) === categoria) &&
        (!urgencia || r.urgencia === urgencia) &&
        coincideZona(r, zona),
    ),
  )
}
const pidioZona = (adaptador, zona) =>
  adaptador.mock.calls.some(([c]) => c.url === '/reportes/' && c.params?.zona === zona)

function abrir(ruta = '/reportes', rutas = {}) {
  guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
  const adaptador = simularApi({
    'GET /auth/yo/': (c) => responder(c, 200, ADMIN),
    'GET /reportes/': respuestaReportes,
    'GET /categorias/': (c) => responder(c, 200, CATEGORIAS),
    'GET /zonas/': (c) => responder(c, 200, ZONAS),
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

describe('Lista de reportes: zona y urgencia', () => {
  const fila = (titulo) => screen.getByRole('link', { name: titulo }).closest('tr')
  const celda = (titulo, etiqueta) => fila(titulo).querySelector(`[data-etiqueta="${etiqueta}"]`)

  it('respeta el orden del backend (urgencia primero) aunque las fechas no lo sigan', async () => {
    // El backend manda primero la alta más antigua y luego la media más reciente
    const enOrden = [
      reporte(9, { titulo: 'Alta antigua', urgencia: 'alta', fecha_creacion: haceHoras(90) }),
      reporte(8, { titulo: 'Alta reciente', urgencia: 'alta', fecha_creacion: haceHoras(2) }),
      reporte(7, { titulo: 'Media reciente', urgencia: 'media', fecha_creacion: haceHoras(1) }),
      reporte(10, { titulo: 'Baja antigua', urgencia: 'baja', fecha_creacion: haceHoras(100) }),
    ]
    abrir('/reportes', { 'GET /reportes/': (c) => responder(c, 200, enOrden) })
    await tabla()

    expect(titulosVisibles()).toEqual(['Alta antigua', 'Alta reciente', 'Media reciente', 'Baja antigua'])
  })

  it('cada fila muestra la urgencia con su color y el municipio, la vereda y la zona', async () => {
    abrir()
    await tabla()

    const alta = within(celda('Basura en el parque Central', 'Urgencia')).getByText('Alta')
    expect(alta).toHaveClass('urgencia--alta')
    expect(within(celda('Poda de árboles', 'Urgencia')).getByText('Baja')).toHaveClass('urgencia--baja')
    expect(within(celda('Escombros en la esquina', 'Urgencia')).getByText('Media')).toHaveClass('urgencia--media')

    expect(celda('Basura en el parque Central', 'Lugar')).toHaveTextContent('PopayánVereda La PlayaZona Centro')
    expect(celda('Árbol caído en la avenida', 'Lugar')).toHaveTextContent('CalotoZona Norte')
  })

  it('un reporte viejo sin municipio muestra "Sin municipio" sin romperse', async () => {
    abrir()
    await tabla()

    expect(celda('Humo de una fábrica', 'Lugar')).toHaveTextContent(/^Sin municipio$/)
  })

  it('filtra por urgencia en el backend y la escribe en la URL', async () => {
    const adaptador = abrir()
    await tabla()

    const urgencia = screen.getByLabelText('Urgencia')
    expect(within(urgencia).getAllByRole('option').map((o) => o.textContent)).toEqual(['Todas', 'Alta', 'Media', 'Baja'])
    fireEvent.change(urgencia, { target: { value: 'alta' } })

    expect(urlActual()).toBe('/reportes?urgencia=alta')
    expect(await screen.findByText('2 reportes')).toBeInTheDocument()
    expect(titulosVisibles()).toEqual(['Basura en el parque Central', 'Árbol caído en la avenida'])
    expect(adaptador.mock.calls.some(([c]) => c.url === '/reportes/' && c.params?.urgencia === 'alta')).toBe(true)
  })

  it('filtra por zona en el backend y la escribe en la URL', async () => {
    const adaptador = abrir()
    await tabla()
    expect(adaptador.mock.calls.some(([c]) => c.url === '/reportes/' && 'zona' in (c.params ?? {}))).toBe(false)

    const zona = screen.getByLabelText('Zona')
    expect(within(zona).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Todas',
      'Centro',
      'Norte',
      'Sur',
      'Sin municipio',
    ])
    fireEvent.change(zona, { target: { value: '1' } })

    expect(urlActual()).toBe('/reportes?zona=1')
    expect(await screen.findByText('2 reportes')).toBeInTheDocument()
    expect(titulosVisibles()).toEqual(['Árbol caído en la avenida', 'Poda de árboles'])
    expect(botonEstado('Todos')).toHaveTextContent('2')
    expect(pidioZona(adaptador, '1')).toBe(true)
  })

  it('"Sin municipio" pide ?zona=sin y muestra los reportes viejos', async () => {
    const adaptador = abrir('/reportes?zona=sin')
    await tabla()

    expect(screen.getByLabelText('Zona')).toHaveValue('sin')
    expect(titulosVisibles()).toEqual(['Humo de una fábrica'])
    expect(pidioZona(adaptador, 'sin')).toBe(true)
  })

  it('el navegador no vuelve a filtrar por zona: muestra lo que responde el backend', async () => {
    // Si el panel filtrara por su cuenta, este reporte de Popayán (centro) no aparecería con ?zona=1
    abrir('/reportes?zona=1', { 'GET /reportes/': (c) => responder(c, 200, [REPORTES[0]]) })
    await tabla()

    expect(titulosVisibles()).toEqual(['Basura en el parque Central'])
  })

  it('una zona inválida en la URL se ignora y no se envía', async () => {
    const adaptador = abrir('/reportes?zona=abc')
    await tabla()

    expect(screen.getByLabelText('Zona')).toHaveValue('')
    expect(adaptador.mock.calls.some(([c]) => c.url === '/reportes/' && 'zona' in (c.params ?? {}))).toBe(false)
    expect(titulosVisibles()).toHaveLength(5)
  })

  it('lee zona y urgencia de la URL y "Quitar filtros" las borra', async () => {
    abrir('/reportes?zona=3&urgencia=baja')
    await screen.findByText('No encontramos reportes con esos filtros. Prueba con otros.')

    expect(screen.getByLabelText('Urgencia')).toHaveValue('baja')
    await screen.findByRole('option', { name: 'Sur' })
    expect(screen.getByLabelText('Zona')).toHaveValue('3')

    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))
    expect(urlActual()).toBe('/reportes')
    expect(await tabla()).toBeInTheDocument()
  })

  it('una urgencia desconocida en la URL se ignora', async () => {
    const adaptador = abrir('/reportes?urgencia=altisima')
    await tabla()

    expect(screen.getByLabelText('Urgencia')).toHaveValue('')
    expect(adaptador.mock.calls.some(([c]) => c.url === '/reportes/' && c.params?.urgencia)).toBe(false)
  })
})

describe('Lista de reportes', () => {
  it('muestra los reportes en el orden del backend, sin los eliminados', async () => {
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

  it('sin resultados muestra el ícono y "Quitar filtros" funciona', async () => {
    abrir('/reportes?q=zzzz&estado=pendiente')

    expect(await screen.findByText('No encontramos reportes con esos filtros. Prueba con otros.')).toBeInTheDocument()
    expect(document.querySelector('.icono-estado.lucide-search-x')).toBeInTheDocument()

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
