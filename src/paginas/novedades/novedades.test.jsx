import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { guardarSesion } from '../../api/sesion.js'
import { ADMIN, montar, pedidos, responder, simularApi, urlActual } from '../../pruebas/apiSimulada.jsx'

const haceHoras = (h) => new Date(Date.now() - h * 3600e3).toISOString()
const persona = (id, nombre, apellido) => ({ id, nombre, apellido })
const CARLOS = persona(40, 'Carlos', 'Ríos')
const DIANA = persona(41, 'Diana', 'López')
const ANA = persona(30, 'Ana', 'Pérez')
const LUIS = persona(31, 'Luis', 'Torres')

// GET /api/novedades/ (NovedadSerializer)
const novedad = (id, tipo, creadoPor, reporte, tarea, estado, horas, extra = {}) => ({
  id,
  reporte,
  reporte_titulo: reporte === 7 ? 'Basura en el parque Central' : 'Árbol caído en la avenida',
  tarea,
  creado_por: creadoPor,
  tipo,
  descripcion: `Descripción de la novedad ${id}. Necesitamos apoyo con el trabajo en la zona.`,
  estado,
  respuesta: null,
  fecha: haceHoras(horas),
  ...extra,
})

const NOVEDADES = [
  novedad(1, 'ayuda', CARLOS, 7, 21, 'abierta', 30),
  novedad(2, 'queja', ANA, 8, null, 'abierta', 5),
  novedad(3, 'incidente', LUIS, 7, null, 'abierta', 50),
  novedad(4, 'queja', ANA, 8, null, 'atendida', 100, { respuesta: 'Ya enviamos a un gestor para revisar.' }),
  novedad(5, 'incidente', DIANA, 7, 22, 'atendida', 10, { respuesta: 'Gracias por avisar.' }),
]

const USUARIOS = [
  { ...CARLOS, rol: 'gestor', estado: 'activo' },
  { ...DIANA, rol: 'gestor', estado: 'activo' },
  { ...ANA, rol: 'ciudadano', estado: 'activo' },
  { ...LUIS, rol: 'ciudadano', estado: 'activo' },
]

const reporte = (id, estado, extra = {}) => ({
  id,
  ciudadano: ANA,
  categoria_id: 1,
  categoria: 'Basura',
  titulo: id === 7 ? 'Basura en el parque Central' : 'Árbol caído en la avenida',
  descripcion: 'x',
  direccion: 'Calle 10',
  descripcion_ubicacion: null,
  latitud: null,
  longitud: null,
  estado,
  motivo_rechazo: null,
  eliminado: false,
  fecha_creacion: haceHoras(200),
  fecha_actualizacion: haceHoras(2),
  fecha_revision: haceHoras(150),
  revisado_por: null,
  fotos: [],
  ...extra,
})

const TAREAS_7 = [
  { id: 21, gestor: CARLOS, estado: 'en_proceso', fecha_asignacion: haceHoras(60), fecha_fin: null, acciones: [] },
  { id: 22, gestor: DIANA, estado: 'terminada', fecha_asignacion: haceHoras(70), fecha_fin: haceHoras(20), acciones: [] },
]

function abrir(ruta, { estadoReporte7 = 'en_proceso', estadoReporte8 = 'resuelto', rutas = {} } = {}) {
  guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
  let novedades = NOVEDADES.map((n) => ({ ...n }))
  const reportes = { 7: reporte(7, estadoReporte7), 8: reporte(8, estadoReporte8) }
  const adaptador = simularApi({
    'GET /auth/yo/': (c) => responder(c, 200, ADMIN),
    'GET /novedades/': (c) => {
      const p = c.params ?? {}
      return responder(
        c,
        200,
        novedades.filter(
          (n) =>
            (!p.estado || n.estado === p.estado) &&
            (!p.tipo || n.tipo === p.tipo) &&
            (!p.reporte || String(n.reporte) === String(p.reporte)),
        ),
      )
    },
    ...Object.fromEntries(
      NOVEDADES.map((n) => [`GET /novedades/${n.id}/`, (c) => responder(c, 200, novedades.find((x) => x.id === n.id))]),
    ),
    ...Object.fromEntries(
      NOVEDADES.map((n) => [
        `POST /novedades/${n.id}/responder/`,
        (c) => {
          novedades = novedades.map((x) =>
            x.id === n.id ? { ...x, estado: 'atendida', respuesta: JSON.parse(c.data).respuesta } : x,
          )
          return responder(c, 200, novedades.find((x) => x.id === n.id))
        },
      ]),
    ),
    'GET /usuarios/': (c) => responder(c, 200, USUARIOS),
    ...Object.fromEntries(USUARIOS.map((u) => [`GET /usuarios/${u.id}/`, (c) => responder(c, 200, u)])),
    'GET /reportes/7/': (c) => responder(c, 200, reportes[7]),
    'GET /reportes/8/': (c) => responder(c, 200, reportes[8]),
    'GET /reportes/7/tareas/': (c) => responder(c, 200, TAREAS_7),
    'GET /reportes/8/tareas/': (c) => responder(c, 200, []),
    'GET /seguimiento/gestores/': (c) => responder(c, 200, []),
    'POST /reportes/8/reabrir/': (c) => {
      reportes[8] = { ...reportes[8], estado: 'aprobado' }
      return responder(c, 200, reportes[8])
    },
    'POST /tareas/': (c) => responder(c, 201, { id: 99 }),
    ...rutas,
  })
  montar(ruta)
  return adaptador
}

const titulos = () => screen.getAllByRole('article').map((a) => within(a).getByRole('heading').textContent)
const aviso = (texto) => screen.findByText(texto, { selector: '.aviso-flotante__texto' })
const esperarLista = () => screen.findAllByRole('article')

beforeEach(() => {
  simularApi({})
})

describe('Lista de novedades', () => {
  it('por defecto abre Abiertas, de la más antigua a la más reciente', async () => {
    abrir('/novedades')
    await esperarLista()

    expect(screen.getByRole('tab', { name: /Abiertas/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /Abiertas/ })).toHaveTextContent('3')
    expect(screen.getByRole('tab', { name: /Atendidas/ })).toHaveTextContent('2')
    expect(titulos()).toEqual(['Novedad #3', 'Novedad #1', 'Novedad #2'])

    const tarjeta = screen.getByRole('article', { name: 'Novedad #1' })
    expect(tarjeta).toHaveTextContent('Ayuda')
    expect(tarjeta).toHaveTextContent('Carlos Ríos · Gestor ambiental')
    expect(tarjeta).toHaveTextContent('hace 1 día')
    expect(within(tarjeta).getByRole('link', { name: 'Basura en el parque Central' })).toHaveAttribute('href', '/reportes/7')
    expect(within(tarjeta).getByRole('link', { name: 'Novedad #1' })).toHaveAttribute('href', '/novedades/1')
  })

  it('Atendidas va en la URL y se ordena de la más reciente a la más antigua', async () => {
    abrir('/novedades')
    await esperarLista()

    fireEvent.click(screen.getByRole('tab', { name: /Atendidas/ }))

    expect(urlActual()).toBe('/novedades?estado=atendida')
    expect(titulos()).toEqual(['Novedad #5', 'Novedad #4'])
  })

  it('filtra por tipo y por quién la creó, en la URL', async () => {
    abrir('/novedades')
    await esperarLista()

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'queja' } })
    expect(urlActual()).toBe('/novedades?tipo=queja')
    expect(titulos()).toEqual(['Novedad #2'])

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gestores' }))
    expect(urlActual()).toBe('/novedades?creador=gestor')
    await waitFor(() => expect(titulos()).toEqual(['Novedad #1']))
  })

  it('lee los filtros de la URL al abrir', async () => {
    abrir('/novedades?estado=atendida&creador=ciudadano')
    await esperarLista()

    expect(titulos()).toEqual(['Novedad #4'])
    expect(screen.getByRole('button', { name: 'Ciudadanos' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('sin abiertas muestra "Todo al día" sin Brotico', async () => {
    abrir('/novedades', { rutas: { 'GET /novedades/': (c) => responder(c, 200, NOVEDADES.filter((n) => n.estado === 'atendida')) } })

    expect(await screen.findByText('Todo al día: no hay novedades por atender.')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Brotico/ })).not.toBeInTheDocument()
  })

  it('sin resultados con filtros muestra a Brotico y "Quitar filtros"', async () => {
    abrir('/novedades?estado=atendida&tipo=ayuda')

    expect(await screen.findByText('No encontramos novedades con esos filtros.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Brotico desanimado' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))

    expect(urlActual()).toBe('/novedades?estado=atendida')
    expect(titulos()).toHaveLength(2)
  })
})

describe('Detalle de una novedad', () => {
  it('muestra quién la creó, el reporte con su estado, la tarea y la descripción', async () => {
    abrir('/novedades/1')

    expect(await screen.findByRole('heading', { level: 2, name: 'Novedad #1' })).toBeInTheDocument()
    const contexto = screen.getByRole('region', { name: 'Contexto' })
    expect(within(contexto).getByRole('link', { name: 'Carlos Ríos' })).toHaveAttribute('href', '/usuarios/40')
    expect(contexto).toHaveTextContent('Gestor ambiental')
    expect(within(contexto).getByRole('link', { name: 'Basura en el parque Central' })).toHaveAttribute('href', '/reportes/7')
    expect(await within(contexto).findByText('En proceso', { selector: '.estado-reporte--en_proceso' })).toBeInTheDocument()
    expect(within(contexto).getByText('En proceso', { selector: '.estado-tarea--en_proceso' })).toBeInTheDocument()
    expect(screen.getByText(/Descripción de la novedad 1\./)).toBeInTheDocument()
  })

  it('no deja enviar una respuesta vacía o con espacios; al enviar avisa y queda en solo lectura', async () => {
    const adaptador = abrir('/novedades/3')
    const cuadro = await screen.findByLabelText('Respuesta')
    const enviar = screen.getByRole('button', { name: 'Enviar respuesta' })
    expect(cuadro).toHaveAccessibleDescription(/Se enviará a Luis Torres y la novedad quedará atendida\. La respuesta no se puede editar después\./)
    expect(enviar).toBeDisabled()

    fireEvent.change(cuadro, { target: { value: '    ' } })
    expect(enviar).toBeDisabled()
    expect(screen.getByText('4 caracteres')).toBeInTheDocument()

    fireEvent.change(cuadro, { target: { value: '  Gracias, ya lo revisamos.  ' } })
    fireEvent.click(enviar)

    expect(await aviso('Respuesta enviada.')).toBeInTheDocument()
    const envio = adaptador.mock.calls.find(([c]) => c.url === '/novedades/3/responder/')[0]
    expect(JSON.parse(envio.data)).toEqual({ respuesta: 'Gracias, ya lo revisamos.' })
    expect(await screen.findByText('Gracias, ya lo revisamos.', { selector: '.novedad__respuesta' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Respuesta')).not.toBeInTheDocument()
    expect(screen.getByText('Atendida')).toBeInTheDocument()
  })

  it('una novedad atendida muestra la respuesta y no el cuadro', async () => {
    abrir('/novedades/4')

    expect(await screen.findByText('Ya enviamos a un gestor para revisar.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Respuesta')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reabrir el reporte' })).not.toBeInTheDocument()
  })
})

describe('Atajos', () => {
  it('ayuda de un gestor con el reporte en proceso: "Sumar otro gestor" abre el diálogo y asigna', async () => {
    const adaptador = abrir('/novedades/1')
    await screen.findByRole('heading', { level: 2, name: 'Novedad #1' })

    fireEvent.click(await screen.findByRole('button', { name: 'Sumar otro gestor al reporte' }))
    const dialogo = await screen.findByRole('dialog', { name: 'Sumar otro gestor' })
    await within(dialogo).findAllByRole('radio')
    // Carlos ya tiene una tarea activa en el reporte
    expect(within(dialogo).queryByRole('radio', { name: /Carlos Ríos/ })).not.toBeInTheDocument()
    fireEvent.click(within(dialogo).getByRole('radio', { name: /Diana López/ }))
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Asignar' }))

    expect(await aviso('Tarea asignada a Diana López. Se le avisó a Diana López.')).toBeInTheDocument()
    const envio = adaptador.mock.calls.find(([c]) => c.method === 'post' && c.url === '/tareas/')[0]
    expect(JSON.parse(envio.data)).toEqual({ reporte: 7, gestor: 41 })
    // Se recarga la novedad y el reporte; la novedad sigue abierta
    await waitFor(() => expect(pedidos(adaptador, 'GET /novedades/1/')).toBeGreaterThanOrEqual(2))
    expect(pedidos(adaptador, 'GET /reportes/7/')).toBeGreaterThanOrEqual(2)
    expect(screen.getByLabelText('Respuesta')).toBeInTheDocument()
  })

  it('el atajo de ayuda no aparece si el reporte no está asignado ni en proceso', async () => {
    abrir('/novedades/1', { estadoReporte7: 'aprobado' })
    await screen.findByText('Aprobado', { selector: '.estado-reporte' })

    expect(screen.queryByRole('button', { name: 'Sumar otro gestor al reporte' })).not.toBeInTheDocument()
  })

  it('queja de un ciudadano sobre un reporte resuelto: "Reabrir el reporte" lo reabre', async () => {
    const adaptador = abrir('/novedades/2')
    await screen.findByRole('heading', { level: 2, name: 'Novedad #2' })

    fireEvent.click(await screen.findByRole('button', { name: 'Reabrir el reporte' }))
    const dialogo = await screen.findByRole('dialog', { name: '¿Reabrir este reporte?' })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Reabrir' }))

    expect(await aviso('Reporte reabierto. Ya puedes asignarle una tarea nueva.')).toBeInTheDocument()
    expect(pedidos(adaptador, 'POST /reportes/8/reabrir/')).toBe(1)
    expect(await screen.findByText('Aprobado', { selector: '.estado-reporte' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reabrir el reporte' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Respuesta')).toBeInTheDocument()
  })

  it('un 400 al reabrir muestra su motivo en el diálogo', async () => {
    const motivo = 'Para reabrir el reporte debe existir una queja del ciudadano posterior a la última revisión.'
    abrir('/novedades/2', { rutas: { 'POST /reportes/8/reabrir/': (c) => responder(c, 400, { detail: motivo }) } })

    fireEvent.click(await screen.findByRole('button', { name: 'Reabrir el reporte' }))
    const dialogo = await screen.findByRole('dialog', { name: '¿Reabrir este reporte?' })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Reabrir' }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(motivo)
    expect(screen.getByRole('dialog', { name: '¿Reabrir este reporte?' })).toBeInTheDocument()
  })

  it('el atajo de queja no aparece si el reporte no está resuelto', async () => {
    abrir('/novedades/2', { estadoReporte8: 'asignado' })
    await screen.findByText('Asignado', { selector: '.estado-reporte' })

    expect(screen.queryByRole('button', { name: 'Reabrir el reporte' })).not.toBeInTheDocument()
  })
})

describe('Novedades en el detalle del reporte', () => {
  it('lista las novedades del reporte con enlace a cada una', async () => {
    const adaptador = abrir('/reportes/7')

    const seccion = await screen.findByRole('region', { name: 'Novedades de este reporte' })
    const tarjetas = await within(seccion).findAllByRole('article')
    expect(tarjetas.map((t) => within(t).getByRole('heading').textContent)).toEqual([
      'Novedad #5',
      'Novedad #1',
      'Novedad #3',
    ])
    expect(within(seccion).getByRole('link', { name: 'Novedad #1' })).toHaveAttribute('href', '/novedades/1')
    expect(adaptador.mock.calls.some(([c]) => c.url === '/novedades/' && String(c.params?.reporte) === '7')).toBe(true)
  })

  it('sin novedades lo dice', async () => {
    abrir('/reportes/8', { rutas: { 'GET /novedades/': (c) => responder(c, 200, []) } })

    const seccion = await screen.findByRole('region', { name: 'Novedades de este reporte' })
    expect(await within(seccion).findByText('Este reporte no tiene novedades.')).toBeInTheDocument()
  })
})

describe('Desde el Resumen', () => {
  it('"Novedades abiertas" abre la pestaña Abiertas', async () => {
    abrir('/', {
      rutas: {
        'GET /dashboard/resumen/': (c) =>
          responder(c, 200, {
            reportes_por_estado: { pendiente: 0, aprobado: 0, asignado: 0, en_proceso: 0, resuelto: 0, rechazado: 0, total: 0 },
            reportes_por_dia: [],
            porcentaje_resuelto: 0,
            novedades_abiertas: 3,
            tareas_atrasadas: 0,
            gestores_activos: 2,
            ultimos_pendientes: [],
          }),
      },
    })

    fireEvent.click(await screen.findByRole('link', { name: /Novedades abiertas/ }))

    expect(await screen.findByRole('tab', { name: /Abiertas/ })).toHaveAttribute('aria-selected', 'true')
    expect(urlActual()).toBe('/novedades')
    await esperarLista()
    expect(titulos()).toHaveLength(3)
  })
})
