import { act, fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { guardarSesion } from '../../api/sesion.js'
import { ADMIN, montar, pedidos, responder, simularApi, urlActual } from '../../pruebas/apiSimulada.jsx'
import { fechaHoyColombia, letraDelDia, nombreDelDia, tiempoRelativo } from '../../utilidades/fechas.js'

const RUTA = 'GET /dashboard/resumen/'

// Los 7 días que manda el backend, del más antiguo a hoy (en Colombia).
function semana(totales) {
  const [anio, mes, dia] = fechaHoyColombia().split('-').map(Number)
  return totales.map((total, i) => {
    const fecha = new Date(Date.UTC(anio, mes - 1, dia - (totales.length - 1 - i)))
    return { fecha: fecha.toISOString().slice(0, 10), total }
  })
}

const haceHoras = (horas) => new Date(Date.now() - horas * 60 * 60 * 1000).toISOString()

function resumen(cambios = {}) {
  return {
    reportes_por_estado: {
      pendiente: 4,
      aprobado: 1,
      asignado: 3,
      en_proceso: 2,
      resuelto: 7,
      rechazado: 3,
      total: 20,
    },
    reportes_por_dia: semana([2, 0, 5, 1, 0, 3, 4]),
    porcentaje_resuelto: 42,
    novedades_abiertas: 2,
    tareas_atrasadas: 0,
    gestores_activos: 6,
    ultimos_pendientes: [
      { id: 12, titulo: 'Basura en el parque', categoria: { id: 1, nombre: 'Basura' }, fecha_creacion: haceHoras(2) },
      { id: 9, titulo: 'Árbol caído', categoria: { id: 4, nombre: 'Árboles' }, fecha_creacion: haceHoras(72) },
    ],
    ...cambios,
  }
}

// Respuesta controlada a mano: devuelve [manejador, soltar(datos), fallar(status)].
function respuestaPendiente() {
  let resolver
  const manejador = (c) =>
    new Promise((resolve) => {
      resolver = (status, datos) => resolve(responder(c, status, datos))
    })
  return [manejador, (datos) => resolver(200, datos), (status) => resolver(status)]
}

function abrirResumen(manejadorResumen) {
  guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
  const adaptador = simularApi({
    'GET /auth/yo/': (c) => responder(c, 200, ADMIN),
    [RUTA]: manejadorResumen,
  })
  montar('/')
  return adaptador
}

const tarjeta = (titulo) => screen.getByText(titulo, { selector: '.tarjeta-cifra__titulo' }).closest('article')
const esperarDatos = () => screen.findByText('Reportes de la semana')

beforeEach(() => {
  simularApi({})
})

describe('Resumen: datos', () => {
  it('las 4 tarjetas muestran los números correctos', async () => {
    abrirResumen((c) => responder(c, 200, resumen()))
    await esperarDatos()

    expect(tarjeta('Por revisar')).toHaveTextContent('4')
    expect(tarjeta('Por revisar')).toHaveTextContent('Reportes esperando tu revisión')
    expect(tarjeta('Por revisar')).toHaveClass('tarjeta-cifra--destacada')
    expect(tarjeta('En atención')).toHaveTextContent('5') // asignado 3 + en_proceso 2
    expect(tarjeta('En atención')).toHaveTextContent('Con gestores asignados')
    expect(tarjeta('Resueltos')).toHaveTextContent('7')
    expect(tarjeta('Total')).toHaveTextContent('20')
    expect(tarjeta('Total')).toHaveTextContent('Sin contar eliminados')
  })

  it('la gráfica tiene 7 barras, marca la de hoy y la tabla tiene los 7 días', async () => {
    const datos = resumen()
    abrirResumen((c) => responder(c, 200, datos))
    await esperarDatos()

    const grafica = screen.getByRole('group', { name: 'Reportes creados en los últimos 7 días' })
    const barras = within(grafica).getAllByRole('img')
    expect(barras).toHaveLength(7)

    const hoy = fechaHoyColombia()
    const barraHoy = barras.find((b) => b.getAttribute('aria-current') === 'date')
    expect(barraHoy).toHaveAttribute('data-fecha', hoy)
    expect(barraHoy).toHaveClass('barra--hoy')
    expect(barraHoy).toHaveAccessibleName(`${nombreDelDia(hoy)} (hoy): 4 reportes`)
    expect(barras.filter((b) => b.classList.contains('barra--hoy'))).toHaveLength(1)

    // Días en 0: cápsula vacía de altura completa, con rayas
    const vacias = barras.filter((b) => b.classList.contains('barra--vacia'))
    expect(vacias).toHaveLength(2)
    const altoMasAlta = barras[2].querySelector('.barra__capsula').getAttribute('height') // 5 = máximo
    vacias.forEach((barra) => {
      const capsula = barra.querySelector('.barra__capsula')
      expect(capsula).toHaveAttribute('height', altoMasAlta)
      expect(capsula.style.fill).toMatch(/^url\("?#rayas-/)
    })
    expect(Number(altoMasAlta)).toBe(200)
    // Letra corta de cada día
    datos.reportes_por_dia.forEach(({ fecha }, i) => {
      expect(barras[i]).toHaveTextContent(letraDelDia(fecha))
    })
    // Etiqueta fija solo sobre la barra más alta (5)
    const fijas = grafica.querySelectorAll('.barra__etiqueta--fija')
    expect(fijas).toHaveLength(1)
    expect(fijas[0]).toHaveTextContent('5')

    const tabla = screen.getByRole('table', { name: 'Reportes creados por día' })
    const filas = within(tabla).getAllByRole('row').slice(1)
    expect(filas).toHaveLength(7)
    datos.reportes_por_dia.forEach(({ fecha, total }, i) => {
      expect(filas[i]).toHaveTextContent(nombreDelDia(fecha))
      expect(within(filas[i]).getByRole('cell')).toHaveTextContent(String(total))
    })
  })

  it('el medidor muestra el porcentaje', async () => {
    abrirResumen((c) => responder(c, 200, resumen()))
    await esperarDatos()

    expect(screen.getByText('42%')).toBeInTheDocument()
    expect(screen.getByText('de los reportes aprobados están resueltos')).toBeInTheDocument()
  })

  it('la lista muestra los pendientes con su enlace, categoría y tiempo', async () => {
    abrirResumen((c) => responder(c, 200, resumen()))
    await esperarDatos()

    const enlace = screen.getByRole('link', { name: /Basura en el parque/ })
    expect(enlace).toHaveAttribute('href', '/reportes/12')
    expect(enlace).toHaveTextContent('Basura')
    expect(enlace).toHaveTextContent('hace 2 horas')
    expect(screen.getByRole('link', { name: /Árbol caído/ })).toHaveTextContent('hace 3 días')
  })

  it('con la lista vacía muestra "Todo al día"', async () => {
    abrirResumen((c) => responder(c, 200, resumen({ ultimos_pendientes: [] })))
    await esperarDatos()

    expect(screen.getByText('Todo al día: no hay reportes por revisar.')).toBeInTheDocument()
    expect(document.querySelector('.icono-estado')).not.toBeInTheDocument()
  })

  it('tareas atrasadas en 0 no se ve en ámbar', async () => {
    abrirResumen((c) => responder(c, 200, resumen({ tareas_atrasadas: 0 })))
    await esperarDatos()

    const fila = screen.getByRole('link', { name: /Tareas atrasadas/ })
    expect(fila).toHaveAttribute('href', '/seguimiento?atrasadas=1')
    expect(fila).not.toHaveClass('fila-atencion--alerta')
    expect(fila).not.toHaveTextContent('Más de 1 día sin acciones')
  })

  it('tareas atrasadas mayor que 0 se ve en ámbar', async () => {
    abrirResumen((c) => responder(c, 200, resumen({ tareas_atrasadas: 3 })))
    await esperarDatos()

    const fila = screen.getByRole('link', { name: /Tareas atrasadas/ })
    expect(fila).toHaveClass('fila-atencion--alerta')
    expect(fila).toHaveTextContent('3')
    expect(fila).toHaveTextContent('Más de 1 día sin acciones')
    expect(screen.getByRole('link', { name: /Novedades abiertas/ })).toHaveAttribute('href', '/novedades')
    expect(screen.getByRole('link', { name: /Gestores activos/ })).toHaveAttribute('href', '/usuarios')
  })

  it('el enlace de un pendiente abre el detalle /reportes/<id>', async () => {
    abrirResumen((c) => responder(c, 200, resumen()))
    await esperarDatos()

    fireEvent.click(screen.getByRole('link', { name: /Basura en el parque/ }))

    // El detalle no está simulado en esta prueba: responde 404
    expect(await screen.findByText('Este reporte no existe o fue borrado.')).toBeInTheDocument()
    expect(urlActual()).toBe('/reportes/12')
    expect(screen.getByRole('heading', { level: 1, name: 'Reportes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reportes' })).toHaveAttribute('aria-current', 'page')
  })
})

describe('Resumen: carga y errores', () => {
  it('mientras carga muestra las siluetas', async () => {
    const [manejador, soltar] = respuestaPendiente()
    abrirResumen(manejador)

    expect(await screen.findByTestId('esqueleto-resumen')).toBeInTheDocument()

    await act(async () => soltar(resumen()))
    expect(await esperarDatos()).toBeInTheDocument()
    expect(screen.queryByTestId('esqueleto-resumen')).not.toBeInTheDocument()
  })

  it('si la carga pasa de 1 s aparece el logo con el aviso', async () => {
    const [manejador] = respuestaPendiente()
    abrirResumen(manejador)

    expect(
      await screen.findByText('Revisando los reportes del barrio…', {}, { timeout: 2000 }),
    ).toBeInTheDocument()
    expect(within(screen.getByTestId('esqueleto-resumen')).getByRole('img', { name: 'EcoComunidad' })).toBeInTheDocument()
  })

  it('un error muestra "Reintentar" y al pulsarlo vuelve a pedir los datos', async () => {
    let falla = true
    const adaptador = abrirResumen((c) => (falla ? responder(c, 500) : responder(c, 200, resumen())))

    expect(await screen.findByText('No pudimos cargar el resumen.')).toBeInTheDocument()
    expect(document.querySelector('.icono-estado')).not.toBeInTheDocument()
    const antes = pedidos(adaptador, RUTA)

    falla = false
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await esperarDatos()).toBeInTheDocument()
    expect(pedidos(adaptador, RUTA)).toBe(antes + 1)
    expect(screen.queryByText('No pudimos cargar el resumen.')).not.toBeInTheDocument()
  })

  it('"Actualizar" vuelve a pedir los datos sin mostrar las siluetas', async () => {
    let respuestaActual = (c) => responder(c, 200, resumen())
    const adaptador = abrirResumen((c) => respuestaActual(c))
    await esperarDatos()
    const antes = pedidos(adaptador, RUTA)

    const [manejador, soltar] = respuestaPendiente()
    respuestaActual = manejador
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))

    const boton = await screen.findByRole('button', { name: 'Actualizando…' })
    expect(boton).toBeDisabled()
    expect(screen.queryByTestId('esqueleto-resumen')).not.toBeInTheDocument()
    expect(tarjeta('Total')).toHaveTextContent('20')
    expect(pedidos(adaptador, RUTA)).toBe(antes + 1)

    const nuevos = resumen()
    nuevos.reportes_por_estado = { ...nuevos.reportes_por_estado, total: 21 }
    await act(async () => soltar(nuevos))

    expect(await screen.findByRole('button', { name: 'Actualizar' })).toBeEnabled()
    expect(tarjeta('Total')).toHaveTextContent('21')
  })

  it('si falla al actualizar, conserva los datos y muestra un aviso pequeño', async () => {
    let falla = false
    abrirResumen((c) => (falla ? responder(c, 503) : responder(c, 200, resumen())))
    await esperarDatos()

    falla = true
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el resumen.')
    expect(tarjeta('Total')).toHaveTextContent('20')
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })

  it('vuelve a pedir los datos cuando la pestaña vuelve a estar visible', async () => {
    const adaptador = abrirResumen((c) => responder(c, 200, resumen()))
    await esperarDatos()
    const antes = pedidos(adaptador, RUTA)

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(pedidos(adaptador, RUTA)).toBe(antes + 1)
  })

  it('no pide dos veces a la vez', async () => {
    const [manejador, soltar] = respuestaPendiente()
    const adaptador = abrirResumen(manejador)
    await screen.findByTestId('esqueleto-resumen')

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(pedidos(adaptador, RUTA)).toBe(1)
    await act(async () => soltar(resumen()))
  })
})

describe('utilidades de fecha del Resumen', () => {
  it('letra corta del día según la fecha', () => {
    expect(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'].map(letraDelDia)).toEqual([
      'L',
      'M',
      'X',
      'J',
      'V',
      'S',
      'D',
    ])
  })

  it('tiempo relativo en español', () => {
    const ahora = Date.parse('2026-10-13T15:00:00-05:00')
    expect(tiempoRelativo('2026-10-13T13:00:00-05:00', ahora)).toBe('hace 2 horas')
    expect(tiempoRelativo('2026-10-10T15:00:00-05:00', ahora)).toBe('hace 3 días')
    expect(tiempoRelativo('2026-10-13T14:55:00-05:00', ahora)).toBe('hace 5 minutos')
  })
})
