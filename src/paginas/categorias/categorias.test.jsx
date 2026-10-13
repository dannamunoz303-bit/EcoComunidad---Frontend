import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { guardarSesion } from '../../api/sesion.js'
import { ADMIN, montar, pedidos, responder, simularApi, urlActual } from '../../pruebas/apiSimulada.jsx'

// GET /api/categorias/ (CategoriaSerializer): { id, nombre, descripcion, activa }
const CATEGORIAS = [
  { id: 1, nombre: 'Basura', descripcion: 'Residuos acumulados en la calle.', activa: true },
  { id: 2, nombre: 'Árboles caídos', descripcion: null, activa: true },
  { id: 3, nombre: 'Escombros', descripcion: 'Restos de obras.', activa: false },
]

// Solo importa categoria_id y eliminado para contar
const reporte = (id, categoriaId, eliminado = false) => ({ id, categoria_id: categoriaId, eliminado })
const REPORTES = [reporte(1, 1), reporte(2, 1), reporte(3, 1, true), reporte(4, 3)]

function abrir(ruta = '/categorias', rutas = {}) {
  guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
  let actuales = [...CATEGORIAS]
  const adaptador = simularApi({
    'GET /auth/yo/': (c) => responder(c, 200, ADMIN),
    'GET /categorias/': (c) => responder(c, 200, actuales),
    'GET /reportes/': (c) => responder(c, 200, REPORTES),
    'POST /categorias/': (c) => {
      const nueva = { id: 9, activa: true, ...JSON.parse(c.data) }
      actuales = [...actuales, nueva]
      return responder(c, 201, nueva)
    },
    'PATCH /categorias/1/': (c) => {
      actuales = actuales.map((x) => (x.id === 1 ? { ...x, ...JSON.parse(c.data) } : x))
      return responder(c, 200, actuales.find((x) => x.id === 1))
    },
    'POST /categorias/1/desactivar/': (c) => {
      actuales = actuales.map((x) => (x.id === 1 ? { ...x, activa: false } : x))
      return responder(c, 200, { ...CATEGORIAS[0], activa: false })
    },
    'POST /categorias/3/activar/': (c) => {
      actuales = actuales.map((x) => (x.id === 3 ? { ...x, activa: true } : x))
      return responder(c, 200, { ...CATEGORIAS[2], activa: true })
    },
    ...rutas,
  })
  montar(ruta)
  return adaptador
}

const tarjeta = (nombre) => screen.getByRole('article', { name: nombre })
const nombres = () => screen.getAllByRole('article').map((a) => within(a).getByRole('heading').textContent)
const aviso = (texto) => screen.findByText(texto, { selector: '.aviso-flotante__texto' })
const botonFiltro = (nombre) => screen.getByRole('button', { name: new RegExp(`^${nombre}\\s*\\d+$`) })
const cuerpo = (adaptador, metodo, url) =>
  JSON.parse(adaptador.mock.calls.find(([c]) => c.method === metodo && c.url === url)[0].data)

beforeEach(() => {
  simularApi({})
})

describe('Lista de categorías', () => {
  it('muestra nombre, descripción, estado y cuántos reportes tiene (sin eliminados)', async () => {
    abrir()
    await screen.findByRole('article', { name: 'Basura' })

    expect(nombres()).toEqual(['Árboles caídos', 'Basura', 'Escombros'])
    await waitFor(() => expect(tarjeta('Basura')).toHaveTextContent('2 reportes'))
    expect(tarjeta('Basura')).toHaveTextContent('Residuos acumulados en la calle.')
    expect(within(tarjeta('Basura')).getByText('Activa')).toHaveClass('estado-categoria--activa')
    expect(tarjeta('Árboles caídos')).toHaveTextContent('Sin reportes')
    expect(tarjeta('Escombros')).toHaveTextContent('1 reporte')
    expect(within(tarjeta('Escombros')).getByText('Inactiva')).toHaveClass('estado-categoria--inactiva')
  })

  it('filtra por estado y lo guarda en la URL', async () => {
    abrir()
    await screen.findByRole('article', { name: 'Basura' })
    expect(botonFiltro('Todas')).toHaveTextContent('3')
    expect(botonFiltro('Activas')).toHaveTextContent('2')
    expect(botonFiltro('Inactivas')).toHaveTextContent('1')

    fireEvent.click(botonFiltro('Inactivas'))

    expect(urlActual()).toBe('/categorias?estado=inactiva')
    expect(nombres()).toEqual(['Escombros'])
    expect(botonFiltro('Inactivas')).toHaveAttribute('aria-pressed', 'true')
  })

  it('lee el filtro de la URL al abrir', async () => {
    abrir('/categorias?estado=activa')
    await screen.findByRole('article', { name: 'Basura' })

    expect(nombres()).toEqual(['Árboles caídos', 'Basura'])
  })

  it('sin categorías muestra a Brotico con el mensaje para crear la primera', async () => {
    abrir('/categorias', { 'GET /categorias/': (c) => responder(c, 200, []) })

    expect(
      await screen.findByText('Todavía no hay categorías. Crea la primera para que los ciudadanos puedan reportar.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Brotico desanimado' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nueva categoría' })).toBeInTheDocument()
  })

  it('no existe ningún botón de borrar', async () => {
    const adaptador = abrir()
    await screen.findByRole('article', { name: 'Basura' })

    expect(screen.queryByRole('button', { name: /borrar|eliminar/i })).not.toBeInTheDocument()
    expect(adaptador.mock.calls.some(([c]) => c.method === 'delete')).toBe(false)
  })
})

describe('Crear y editar', () => {
  it('crea una categoría y avisa', async () => {
    const adaptador = abrir()
    await screen.findByRole('article', { name: 'Basura' })

    fireEvent.click(screen.getByRole('button', { name: 'Nueva categoría' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Nueva categoría' })
    const crear = within(dialogo).getByRole('button', { name: 'Crear categoría' })
    expect(crear).toBeDisabled()

    fireEvent.change(within(dialogo).getByLabelText('Nombre'), { target: { value: '  Ruido  ' } })
    fireEvent.change(within(dialogo).getByLabelText(/Descripción/), { target: { value: 'Contaminación auditiva.' } })
    expect(within(dialogo).getByText('23/255')).toBeInTheDocument()
    fireEvent.click(crear)

    expect(await aviso('Categoría creada.')).toBeInTheDocument()
    expect(cuerpo(adaptador, 'post', '/categorias/')).toEqual({ nombre: 'Ruido', descripcion: 'Contaminación auditiva.' })
    expect(await screen.findByRole('article', { name: 'Ruido' })).toBeInTheDocument()
  })

  it('un nombre repetido muestra el error del backend junto al campo', async () => {
    abrir('/categorias', {
      'POST /categorias/': (c) => responder(c, 400, { nombre: ['Ya existe una categoría con este nombre.'] }),
    })
    await screen.findByRole('article', { name: 'Basura' })

    fireEvent.click(screen.getByRole('button', { name: 'Nueva categoría' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Nueva categoría' })
    fireEvent.change(within(dialogo).getByLabelText('Nombre'), { target: { value: 'Basura' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Crear categoría' }))

    expect(await within(dialogo).findByText('Ya existe una categoría con este nombre.')).toBeInTheDocument()
    expect(within(dialogo).getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('dialog', { name: 'Nueva categoría' })).toBeInTheDocument()
  })

  it('el nombre y la descripción tienen sus límites (80 y 255)', async () => {
    abrir()
    await screen.findByRole('article', { name: 'Basura' })
    fireEvent.click(screen.getByRole('button', { name: 'Nueva categoría' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Nueva categoría' })

    expect(within(dialogo).getByLabelText('Nombre')).toHaveAttribute('maxLength', '80')
    expect(within(dialogo).getByLabelText(/Descripción/)).toHaveAttribute('maxLength', '255')
  })

  it('editar envía solo lo que cambió y avisa', async () => {
    const adaptador = abrir()
    await screen.findByRole('article', { name: 'Basura' })

    fireEvent.click(screen.getByRole('button', { name: 'Editar Basura' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Editar categoría' })
    expect(within(dialogo).getByLabelText('Nombre')).toHaveValue('Basura')
    const guardar = within(dialogo).getByRole('button', { name: 'Guardar cambios' })
    expect(guardar).toBeDisabled()

    fireEvent.change(within(dialogo).getByLabelText(/Descripción/), { target: { value: 'Residuos en la vía pública.' } })
    fireEvent.click(guardar)

    expect(await aviso('Cambios guardados.')).toBeInTheDocument()
    expect(cuerpo(adaptador, 'patch', '/categorias/1/')).toEqual({ descripcion: 'Residuos en la vía pública.' })
    await waitFor(() => expect(tarjeta('Basura')).toHaveTextContent('Residuos en la vía pública.'))
  })
})

describe('Desactivar y activar', () => {
  it('desactivar pide confirmación y llama al endpoint', async () => {
    const adaptador = abrir()
    await screen.findByRole('article', { name: 'Basura' })

    fireEvent.click(screen.getByRole('button', { name: 'Desactivar Basura' }))
    const dialogo = await screen.findByRole('dialog', { name: '¿Desactivar Basura?' })
    expect(dialogo).toHaveTextContent(
      'Los ciudadanos ya no podrán elegirla en reportes nuevos. Los reportes que ya la usan no cambian.',
    )
    expect(pedidos(adaptador, 'POST /categorias/1/desactivar/')).toBe(0)
    const confirmar = within(dialogo).getByRole('button', { name: 'Desactivar' })
    expect(confirmar).toHaveClass('boton-peligro')
    fireEvent.click(confirmar)

    expect(await aviso('Categoría desactivada.')).toBeInTheDocument()
    expect(pedidos(adaptador, 'POST /categorias/1/desactivar/')).toBe(1)
    await waitFor(() => expect(within(tarjeta('Basura')).getByText('Inactiva')).toBeInTheDocument())
  })

  it('activar pide confirmación y llama al endpoint', async () => {
    const adaptador = abrir()
    await screen.findByRole('article', { name: 'Escombros' })

    fireEvent.click(screen.getByRole('button', { name: 'Activar Escombros' }))
    const dialogo = await screen.findByRole('dialog', { name: '¿Activar Escombros?' })
    expect(dialogo).toHaveTextContent('Volverá a aparecer para los ciudadanos.')
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Activar' }))

    expect(await aviso('Categoría activada.')).toBeInTheDocument()
    expect(pedidos(adaptador, 'POST /categorias/3/activar/')).toBe(1)
  })
})
