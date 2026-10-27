import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { guardarSesion } from '../../api/sesion.js'
import { ADMIN, montar, responder, simularApi, urlActual } from '../../pruebas/apiSimulada.jsx'

const hace = (h) => new Date(Date.now() - h * 3600e3).toISOString()

// GET /api/seguimiento/gestores/ (GestorSeguimientoSerializer)
const gestor = (id, nombre, apellido, estado, asignadas, enProceso, terminadas, canceladas, horas, atrasadas) => ({
  id, nombre, apellido, estado, asignadas, en_proceso: enProceso, terminadas, canceladas, horas_promedio: horas, atrasadas,
})
const GESTORES = [
  gestor(40, 'Carlos', 'Ríos', 'activo', 2, 1, 5, 1, 18.4, 1),
  gestor(41, 'Diana', 'López', 'activo', 0, 1, 10, 0, null, 0),
  gestor(42, 'Andrés', 'Mejía', 'activo', 1, 0, 2, 0, 30, 3),
  gestor(43, 'Ernesto', 'Paz', 'inactivo', 0, 0, 4, 2, 12, 0),
]

// GET /api/seguimiento/gestores/<id>/ (GestorSeguimientoDetalleSerializer)
const DETALLE_40 = {
  ...GESTORES[0],
  tareas_activas: [
    { id: 21, reporte: { id: 7, titulo: 'Basura en el parque Central' }, estado: 'en_proceso', fecha_asignacion: hace(72), ultima_accion: hace(48), atrasada: true },
    { id: 22, reporte: { id: 8, titulo: 'Árbol caído en la avenida' }, estado: 'asignada', fecha_asignacion: hace(5), ultima_accion: null, atrasada: false },
  ],
}

function abrir(ruta, rutas = {}) {
  guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
  simularApi({
    'GET /auth/yo/': (c) => responder(c, 200, ADMIN),
    'GET /seguimiento/gestores/': (c) => responder(c, 200, GESTORES),
    'GET /seguimiento/gestores/40/': (c) => responder(c, 200, DETALLE_40),
    'GET /seguimiento/gestores/41/': (c) => responder(c, 200, { ...GESTORES[1], tareas_activas: [] }),
    ...rutas,
  })
  montar(ruta)
}

const tabla = () => screen.findByRole('table', { name: 'Gestores y su carga de trabajo' })
const nombres = () =>
  within(screen.getByRole('table', { name: 'Gestores y su carga de trabajo' }))
    .getAllByRole('row')
    .slice(1)
    .map((f) => within(f).getByRole('link').textContent)
const fila = (nombre) => screen.getByRole('link', { name: nombre }).closest('tr')

beforeEach(() => {
  simularApi({})
})

describe('Seguimiento a los gestores', () => {
  it('ordena por atrasadas (mayor primero) y luego por activas, sin inactivos', async () => {
    abrir('/seguimiento')
    await tabla()

    expect(nombres()).toEqual(['Andrés Mejía', 'Carlos Ríos', 'Diana López'])
    const atrasadas = screen.getByRole('columnheader', { name: /Atrasadas/ })
    expect(atrasadas).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getByRole('columnheader', { name: /Gestor/ })).toHaveAttribute('aria-sort', 'none')
  })

  it('muestra las cifras de arriba', async () => {
    abrir('/seguimiento')
    await tabla()

    const cifra = (nombre) => screen.getByText(nombre, { selector: 'dt' }).nextElementSibling
    expect(cifra('Gestores activos')).toHaveTextContent('3')
    expect(cifra('Tareas activas')).toHaveTextContent('5')
    expect(cifra('Tareas atrasadas')).toHaveTextContent('4')
  })

  it('las horas null dicen "Sin datos" y las atrasadas solo van en ámbar si son más de 0', async () => {
    abrir('/seguimiento')
    await tabla()

    expect(fila('Carlos Ríos')).toHaveTextContent('18 h')
    expect(fila('Diana López')).toHaveTextContent('Sin datos')
    expect(within(fila('Carlos Ríos')).getByText('1 atrasada')).toHaveClass('etiqueta-atrasada')
    expect(fila('Carlos Ríos')).toHaveTextContent('3') // activas: 2 asignadas + 1 en proceso
    expect(fila('Diana López').querySelector('.etiqueta-atrasada')).toBeNull()
  })

  it('"Solo con tareas atrasadas" e "Incluir inactivos" van en la URL', async () => {
    abrir('/seguimiento')
    await tabla()

    fireEvent.click(screen.getByRole('switch', { name: 'Solo con tareas atrasadas' }))
    expect(urlActual()).toBe('/seguimiento?atrasadas=1')
    expect(nombres()).toEqual(['Andrés Mejía', 'Carlos Ríos'])

    fireEvent.click(screen.getByRole('switch', { name: 'Solo con tareas atrasadas' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Incluir inactivos' }))
    expect(urlActual()).toBe('/seguimiento?inactivos=1')
    expect(nombres()).toEqual(['Andrés Mejía', 'Carlos Ríos', 'Diana López', 'Ernesto Paz'])
  })

  it('lee los filtros de la URL (como el enlace del Resumen)', async () => {
    abrir('/seguimiento?atrasadas=1')
    await tabla()

    expect(screen.getByRole('switch', { name: 'Solo con tareas atrasadas' })).toHaveAttribute('aria-checked', 'true')
    expect(nombres()).toEqual(['Andrés Mejía', 'Carlos Ríos'])
  })

  it('ordena por nombre y por terminadas con aria-sort', async () => {
    abrir('/seguimiento')
    await tabla()

    fireEvent.click(screen.getByRole('button', { name: /Gestor/ }))
    expect(urlActual()).toBe('/seguimiento?orden=nombre')
    expect(nombres()).toEqual(['Andrés Mejía', 'Carlos Ríos', 'Diana López'])
    expect(screen.getByRole('columnheader', { name: /Gestor/ })).toHaveAttribute('aria-sort', 'ascending')

    fireEvent.click(screen.getByRole('button', { name: /Terminadas/ }))
    expect(nombres()).toEqual(['Diana López', 'Carlos Ríos', 'Andrés Mejía'])
    expect(screen.getByRole('columnheader', { name: /Terminadas/ })).toHaveAttribute('aria-sort', 'descending')
  })

  it('sin gestores muestra el ícono y el enlace para crear uno', async () => {
    abrir('/seguimiento', { 'GET /seguimiento/gestores/': (c) => responder(c, 200, []) })

    expect(await screen.findByText('Todavía no hay gestores.')).toBeInTheDocument()
    expect(document.querySelector('.icono-estado.lucide-inbox')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crear un gestor' })).toHaveAttribute('href', '/usuarios/nuevo')
  })
})

describe('Detalle de un gestor', () => {
  it('muestra sus tareas activas con "Sin acciones todavía" y la etiqueta "Atrasada"', async () => {
    abrir('/seguimiento/40')

    expect(await screen.findByRole('heading', { level: 2, name: 'Carlos Ríos' })).toBeInTheDocument()
    expect(screen.getByText('Una tarea está atrasada cuando lleva 1 día o más sin acciones nuevas.')).toBeInTheDocument()
    const tareas = within(screen.getByRole('region', { name: 'Tareas activas' })).getAllByRole('listitem')
    expect(tareas[0]).toHaveTextContent('Basura en el parque Central')
    expect(tareas[0]).toHaveTextContent('Asignada hace 3 días')
    expect(tareas[0]).toHaveTextContent('Última acción hace 2 días')
    expect(within(tareas[0]).getByText('Atrasada')).toHaveClass('etiqueta-atrasada')
    expect(within(tareas[0]).getByRole('link', { name: 'Basura en el parque Central' })).toHaveAttribute('href', '/reportes/7')
    expect(tareas[1]).toHaveTextContent('Sin acciones todavía')
    expect(within(tareas[1]).queryByText('Atrasada')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver todas sus tareas' })).toHaveAttribute('href', '/tareas?gestor=40')
    expect(screen.getByRole('link', { name: 'Ver usuario' })).toHaveAttribute('href', '/usuarios/40')
  })

  it('sin tareas activas lo dice', async () => {
    abrir('/seguimiento/41')

    expect(await screen.findByText('No tiene tareas activas.')).toBeInTheDocument()
    expect(screen.getByText('Horas promedio').nextElementSibling).toHaveTextContent('Sin datos')
  })
})
