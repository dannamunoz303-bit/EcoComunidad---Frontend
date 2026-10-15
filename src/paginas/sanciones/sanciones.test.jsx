import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { guardarSesion } from '../../api/sesion.js'
import TipoSancion from '../../componentes/TipoSancion.jsx'
import { ADMIN, montar, pedidos, responder, simularApi, urlActual } from '../../pruebas/apiSimulada.jsx'
import { textoVigencia } from '../../utilidades/sanciones.js'

const hace = (h) => new Date(Date.now() - h * 3600e3).toISOString()
const en = (h) => new Date(Date.now() + h * 3600e3).toISOString()
// Testing Library normaliza los espacios del DOM (incluido el no separable de "p. m.").
const sinEspeciales = (texto) => texto.replace(/\s+/g, ' ')

const persona = (id, nombre, apellido) => ({ id, nombre, apellido })
const ANA = persona(30, 'Ana', 'Pérez')
const LUIS = persona(31, 'Luis', 'Torres')
const MARTA = persona(32, 'Marta', 'Díaz')
const PEDRO = persona(33, 'Pedro', 'Ruiz')

const usuario = (p, estado, extra = {}) => ({
  ...p,
  cedula: `52${p.id}`,
  correo: `${p.nombre.toLowerCase()}@eco.co`,
  telefono: null,
  rol: 'ciudadano',
  estado,
  bloqueado_hasta: null,
  fecha_registro: hace(500),
  ...extra,
})
const USUARIOS = [
  usuario(ANA, 'activo', { cedula: '52123456' }),
  usuario(LUIS, 'bloqueado', { bloqueado_hasta: en(38) }),
  usuario(MARTA, 'inactivo'),
  usuario(PEDRO, 'activo'),
  // Un gestor: el buscador no debe ofrecerlo
  { ...persona(40, 'Carlos', 'Ríos'), cedula: '1040', correo: 'carlos@eco.co', telefono: null, rol: 'gestor', estado: 'activo', bloqueado_hasta: null, fecha_registro: hace(500) },
]

// GET /api/sanciones/ (SancionSerializer)
const sancion = (id, ciudadano, tipo, reporte, inicio, fin = null) => ({
  id,
  ciudadano,
  admin: persona(1, 'Laura', 'Gómez'),
  reporte,
  tipo,
  motivo: `Motivo de la sanción ${id}.`,
  fecha_inicio: inicio,
  fecha_fin: fin,
})
const SANCIONES = [
  sancion(1, ANA, 'advertencia', 8, hace(100)),
  sancion(2, LUIS, 'bloqueo_temporal', 9, hace(10), en(38)),
  sancion(3, LUIS, 'advertencia', 10, hace(200)),
  sancion(4, MARTA, 'bloqueo_permanente', null, hace(50)),
  sancion(5, ANA, 'bloqueo_permanente', null, hace(20), hace(5)),
]

const SUGERENCIAS = {
  30: { ciudadano: 30, sanciones_con_reporte: 1, sugerencia: 'bloqueo_temporal', sanciones_previas: [SANCIONES[4], SANCIONES[0]] },
  31: { ciudadano: 31, sanciones_con_reporte: 2, sugerencia: 'bloqueo_permanente', sanciones_previas: [SANCIONES[1], SANCIONES[2]] },
  32: { ciudadano: 32, sanciones_con_reporte: 0, sugerencia: 'advertencia', sanciones_previas: [SANCIONES[3]] },
  33: { ciudadano: 33, sanciones_con_reporte: 0, sugerencia: 'advertencia', sanciones_previas: [] },
}

const reporte = (id, ciudadano, titulo, estado, horas) => ({
  id, ciudadano, categoria_id: 1, categoria: 'Basura', titulo, descripcion: 'x', direccion: 'Calle 1',
  descripcion_ubicacion: null, latitud: null, longitud: null, estado, motivo_rechazo: null, eliminado: false,
  fecha_creacion: hace(horas), fecha_actualizacion: hace(horas), fecha_revision: null, revisado_por: null, fotos: [],
})
const REPORTES = [
  reporte(8, ANA, 'Foto de una fiesta', 'rechazado', 120),
  reporte(11, ANA, 'Árbol caído en la calle 5', 'aprobado', 30),
  reporte(12, ANA, 'Queja por ruido de vecinos', 'rechazado', 300),
  reporte(9, LUIS, 'Publicidad de mi negocio', 'rechazado', 20),
  // Eliminado y reciente: igual va al final de la lista
  { ...reporte(13, ANA, 'Reporte borrado', 'rechazado', 1), eliminado: true },
]

function abrir(ruta, { sanciones = SANCIONES, rutas = {} } = {}) {
  guardarSesion({ access: 'acc-1', refresh: 'ref-1' })
  const adaptador = simularApi({
    'GET /auth/yo/': (c) => responder(c, 200, ADMIN),
    'GET /sanciones/': (c) => {
      const p = c.params ?? {}
      return responder(
        c,
        200,
        sanciones.filter((s) => (!p.ciudadano || String(s.ciudadano.id) === String(p.ciudadano)) && (!p.tipo || s.tipo === p.tipo)),
      )
    },
    'GET /sanciones/sugerencia/': (c) => responder(c, 200, SUGERENCIAS[c.params.ciudadano]),
    // Devuelve todos sin filtrar: la página debe quedarse solo con los ciudadanos
    'GET /usuarios/': (c) => responder(c, 200, USUARIOS),
    ...Object.fromEntries(USUARIOS.map((u) => [`GET /usuarios/${u.id}/`, (c) => responder(c, 200, u)])),
    'GET /reportes/': (c) => responder(c, 200, REPORTES),
    'POST /sanciones/': (c) => responder(c, 201, { id: 99, ...JSON.parse(c.data) }),
    'POST /usuarios/31/levantar-bloqueo/': (c) => responder(c, 200, { ...USUARIOS[1], estado: 'activo', bloqueado_hasta: null }),
    'POST /usuarios/32/levantar-bloqueo/': (c) => responder(c, 200, USUARIOS[2]),
    ...rutas,
  })
  montar(ruta)
  return adaptador
}

const filas = () => within(screen.getByRole('table', { name: /Sanciones/ })).getAllByRole('row').slice(1)
const aviso = (texto) => screen.findByText(texto, { selector: '.aviso-flotante__texto' })

beforeEach(() => {
  simularApi({})
})

describe('<TipoSancion />', () => {
  const ahora = Date.parse('2026-10-14T12:00:00-05:00')

  it('muestra la vigencia en hora de Colombia según el caso', () => {
    const temporal = { tipo: 'bloqueo_temporal', fecha_fin: '2026-10-15T20:00:00Z' }
    expect(sinEspeciales(textoVigencia(temporal, ahora))).toBe('Vigente hasta 15 oct. 2026, 3:00 p. m.')
    expect(sinEspeciales(textoVigencia(temporal, Date.parse('2026-10-16T00:00:00Z')))).toBe('Terminó el 15 oct. 2026, 3:00 p. m.')
    expect(textoVigencia({ tipo: 'bloqueo_permanente', fecha_fin: null }, ahora)).toBe('Vigente')
    expect(sinEspeciales(textoVigencia({ tipo: 'bloqueo_permanente', fecha_fin: '2026-10-15T20:00:00Z' }, ahora))).toBe(
      'Levantado el 15 oct. 2026, 3:00 p. m.',
    )
    expect(textoVigencia({ tipo: 'advertencia', fecha_fin: null }, ahora)).toBeNull()
  })

  it.each([
    ['advertencia', 'Advertencia'],
    ['bloqueo_temporal', 'Bloqueo temporal'],
    ['bloqueo_permanente', 'Bloqueo permanente'],
  ])('%s se nombra "%s" y tiene su clase de color', (tipo, nombre) => {
    render(<TipoSancion tipo={tipo} />)
    expect(screen.getByText(nombre)).toHaveClass(`tipo-sancion--${tipo}`)
  })
})

describe('Historial de sanciones', () => {
  it('muestra todas de la más reciente a la más antigua, con su vigencia y el reporte', async () => {
    abrir('/sanciones')
    await screen.findByRole('table', { name: /Sanciones/ })

    expect(filas().map((f) => within(f).getAllByRole('link')[0].textContent)).toEqual([
      'Luis Torres',
      'Ana Pérez',
      'Marta Díaz',
      'Ana Pérez',
      'Luis Torres',
    ])
    expect(filas()[0]).toHaveTextContent('Bloqueo temporal')
    expect(filas()[0]).toHaveTextContent('Vigente hasta')
    expect(filas()[1]).toHaveTextContent('Levantado el')
    expect(filas()[2]).toHaveTextContent('Bloqueo permanenteVigente')
    expect(within(filas()[0]).getByRole('link', { name: 'Luis Torres' })).toHaveAttribute('href', '/usuarios/31')
    expect(await within(filas()[3]).findByRole('link', { name: 'Foto de una fiesta' })).toHaveAttribute('href', '/reportes/8')
    expect(screen.getByRole('link', { name: 'Nueva sanción' })).toHaveAttribute('href', '/sanciones/nueva')
  })

  it('filtra por tipo y por ciudadano en la URL', async () => {
    const adaptador = abrir('/sanciones')
    await screen.findByRole('table', { name: /Sanciones/ })

    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'advertencia' } })
    expect(urlActual()).toBe('/sanciones?tipo=advertencia')
    expect(filas()).toHaveLength(2)

    fireEvent.change(await screen.findByLabelText('Ciudadano'), { target: { value: '31' } })
    expect(urlActual()).toBe('/sanciones?tipo=advertencia&ciudadano=31')
    await waitFor(() => expect(filas()).toHaveLength(1))
    expect(adaptador.mock.calls.some(([c]) => c.url === '/sanciones/' && c.params?.ciudadano === '31')).toBe(true)
  })

  it('con ?ciudadano= muestra el chip quitable y "Levantar bloqueo" si está bloqueado', async () => {
    abrir('/sanciones?ciudadano=31')

    expect(await screen.findByText('Sanciones de Luis Torres')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Nueva sanción' })).toHaveAttribute('href', '/sanciones/nueva?ciudadano=31')
    expect(screen.getByRole('button', { name: 'Levantar bloqueo' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Quitar el filtro: Sanciones de Luis Torres' }))
    expect(urlActual()).toBe('/sanciones')
  })

  it('"Levantar bloqueo" no aparece si el ciudadano no está bloqueado', async () => {
    abrir('/sanciones?ciudadano=30')

    expect(await screen.findByText('Sanciones de Ana Pérez')).toBeInTheDocument()
    await screen.findByRole('table', { name: /Sanciones/ })
    expect(screen.queryByRole('button', { name: 'Levantar bloqueo' })).not.toBeInTheDocument()
  })

  it('levantar bloqueo pide confirmación, llama al endpoint y avisa', async () => {
    const adaptador = abrir('/sanciones?ciudadano=31')

    fireEvent.click(await screen.findByRole('button', { name: 'Levantar bloqueo' }))
    const dialogo = await screen.findByRole('dialog', { name: '¿Levantar el bloqueo de Luis Torres?' })
    expect(dialogo).toHaveTextContent('Se cerrarán sus sanciones de bloqueo vigentes y podrá volver a iniciar sesión.')
    expect(dialogo).not.toHaveTextContent('Seguirá inactivo')
    expect(pedidos(adaptador, 'POST /usuarios/31/levantar-bloqueo/')).toBe(0)
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Levantar bloqueo' }))

    expect(await aviso('Bloqueo levantado.')).toBeInTheDocument()
    expect(pedidos(adaptador, 'POST /usuarios/31/levantar-bloqueo/')).toBe(1)
  })

  it('un inactivo con bloqueo vigente también se puede levantar, y se le avisa que sigue inactivo', async () => {
    abrir('/sanciones?ciudadano=32')

    fireEvent.click(await screen.findByRole('button', { name: 'Levantar bloqueo' }))
    const dialogo = await screen.findByRole('dialog', { name: '¿Levantar el bloqueo de Marta Díaz?' })
    expect(dialogo).toHaveTextContent('Seguirá inactivo hasta que lo reactiven.')
  })

  it('sin sanciones dice "Todavía no hay sanciones."', async () => {
    abrir('/sanciones', { sanciones: [] })

    expect(await screen.findByText('Todavía no hay sanciones.')).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Brotico/ })).not.toBeInTheDocument()
  })

  it('sin resultados con filtros muestra a Brotico y "Quitar filtros"', async () => {
    abrir('/sanciones?ciudadano=33')

    expect(await screen.findByText('No encontramos sanciones con esos filtros.')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Brotico desanimado' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))
    expect(urlActual()).toBe('/sanciones')
  })
})

describe('Nueva sanción', () => {
  const elegirAna = async () => {
    fireEvent.change(await screen.findByLabelText('Buscar ciudadano'), { target: { value: '52123' } })
    fireEvent.click(screen.getByRole('button', { name: /Ana Pérez/ }))
    await screen.findByText('Sugerencia')
  }

  it('desde un reporte rechazado (?ciudadano=&reporte=) el formulario llega con ambos datos', async () => {
    abrir('/sanciones?ciudadano=30&reporte=8')

    await waitFor(() => expect(urlActual()).toBe('/sanciones/nueva?ciudadano=30&reporte=8'))
    expect(await screen.findByText('Ana Pérez', { selector: 'strong' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText(/Reporte relacionado/)).toHaveValue('8'))
  })

  it('el buscador solo ofrece ciudadanos (por nombre, correo o cédula)', async () => {
    abrir('/sanciones/nueva')
    const buscar = await screen.findByLabelText('Buscar ciudadano')

    fireEvent.change(buscar, { target: { value: 'Ríos' } })
    expect(screen.queryByRole('button', { name: /Carlos Ríos/ })).not.toBeInTheDocument()
    expect(screen.getByText('0 resultados')).toBeInTheDocument()

    fireEvent.change(buscar, { target: { value: 'marta@' } })
    expect(screen.getByRole('button', { name: /Marta Díaz/ })).toBeInTheDocument()
  })

  it('al elegir muestra su historial y la sugerencia; "Usar sugerencia" marca el tipo', async () => {
    abrir('/sanciones/nueva')
    await elegirAna()

    const historial = screen.getByRole('table', { name: /Sanciones previas/ })
    expect(within(historial).getAllByRole('row').slice(1)).toHaveLength(2)
    const sugerencia = screen.getByRole('group', { name: 'Sugerencia' })
    expect(sugerencia).toHaveTextContent('Bloqueo temporal')
    expect(sugerencia).toHaveTextContent('Tiene 1 sanción previa por un reporte erróneo.')
    expect(sugerencia).toHaveTextContent('Es solo una sugerencia; tú decides.')

    fireEvent.click(within(sugerencia).getByRole('button', { name: 'Usar sugerencia' }))
    expect(screen.getByRole('radio', { name: 'Bloqueo temporal' })).toBeChecked()
  })

  it('el selector de reporte solo trae los de ese ciudadano: rechazados primero y eliminados al final', async () => {
    abrir('/sanciones/nueva')
    await elegirAna()

    const opciones = within(screen.getByLabelText(/Reporte relacionado/))
      .getAllByRole('option')
      .map((o) => o.textContent)
    expect(opciones).toEqual([
      'Sin reporte relacionado',
      'Foto de una fiesta (Rechazado)',
      'Queja por ruido de vecinos (Rechazado)',
      'Árbol caído en la calle 5 (Aprobado)',
      'Reporte borrado (Rechazado, eliminado)',
    ])
  })

  it('cada tipo explica su efecto', async () => {
    abrir('/sanciones/nueva')
    await elegirAna()

    expect(screen.getByRole('radio', { name: 'Advertencia' })).toHaveAccessibleDescription('No cambia su cuenta. Queda en su historial.')
    expect(screen.getByRole('radio', { name: 'Bloqueo temporal' })).toHaveAccessibleDescription('No podrá iniciar sesión durante 2 días.')
    expect(screen.getByRole('radio', { name: 'Bloqueo permanente' })).toHaveAccessibleDescription(
      'No podrá iniciar sesión hasta que un administrador levante el bloqueo.',
    )
  })

  it('no deja enviar sin tipo o sin motivo', async () => {
    abrir('/sanciones/nueva')
    await elegirAna()
    const registrar = screen.getByRole('button', { name: 'Registrar sanción' })
    const motivo = screen.getByLabelText('Motivo')
    expect(motivo).toHaveAttribute('maxLength', '255')

    expect(registrar).toBeDisabled()
    fireEvent.change(motivo, { target: { value: 'Reporte que no es ambiental.' } })
    expect(registrar).toBeDisabled()
    expect(screen.getByText('28/255')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: 'Advertencia' }))
    expect(registrar).toBeEnabled()
    fireEvent.change(motivo, { target: { value: '   ' } })
    expect(registrar).toBeDisabled()
  })

  it('muestra el aviso de inactivo', async () => {
    abrir('/sanciones/nueva?ciudadano=32')

    expect(
      await screen.findByText('Está inactivo: la sanción quedará registrada, pero su estado no cambiará hasta que lo reactiven.'),
    ).toBeInTheDocument()
  })

  it('con un bloqueo vigente, elegir bloqueo temporal muestra su aviso', async () => {
    abrir('/sanciones/nueva?ciudadano=31')
    await screen.findByText('Sugerencia')
    const textoAviso = 'Ya tiene un bloqueo vigente; una sanción nueva nunca lo acorta.'

    fireEvent.click(screen.getByRole('radio', { name: 'Advertencia' }))
    expect(screen.queryByText(textoAviso)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Bloqueo temporal' }))
    expect(screen.getByText(textoAviso)).toBeInTheDocument()
  })

  it('crear muestra la confirmación con el resumen, llama al endpoint, avisa y vuelve al historial', async () => {
    const adaptador = abrir('/sanciones/nueva')
    await elegirAna()

    fireEvent.change(screen.getByLabelText(/Reporte relacionado/), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Advertencia' }))
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: '  Reportó algo que no es ambiental.  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar sanción' }))

    const dialogo = await screen.findByRole('dialog', { name: '¿Registrar esta sanción?' })
    expect(dialogo).toHaveTextContent('Ana Pérez')
    expect(dialogo).toHaveTextContent('Advertencia')
    expect(dialogo).toHaveTextContent('Reportó algo que no es ambiental.')
    expect(dialogo).toHaveTextContent('Foto de una fiesta')
    expect(pedidos(adaptador, 'POST /sanciones/')).toBe(0)
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar sanción' }))

    expect(await aviso('Sanción registrada. Ana Pérez recibió una notificación.')).toBeInTheDocument()
    const envio = adaptador.mock.calls.find(([c]) => c.method === 'post' && c.url === '/sanciones/')[0]
    expect(JSON.parse(envio.data)).toEqual({ ciudadano: 30, tipo: 'advertencia', motivo: 'Reportó algo que no es ambiental.', reporte: 8 })
    await waitFor(() => expect(urlActual()).toBe('/sanciones?ciudadano=30'))
  })

  it('un 400 del backend se muestra en la confirmación', async () => {
    abrir('/sanciones/nueva?ciudadano=30', {
      rutas: { 'POST /sanciones/': (c) => responder(c, 400, { reporte: ['El reporte no es de este ciudadano.'] }) },
    })
    await screen.findByText('Sugerencia')
    fireEvent.click(screen.getByRole('radio', { name: 'Advertencia' }))
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Motivo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar sanción' }))
    const dialogo = await screen.findByRole('dialog', { name: '¿Registrar esta sanción?' })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar sanción' }))

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('El reporte no es de este ciudadano.')
  })
})

describe('Sanciones en el detalle del usuario', () => {
  it('un ciudadano muestra sus sanciones más recientes y "Ver todas"', async () => {
    abrir('/usuarios/31')

    const seccion = await screen.findByRole('region', { name: 'Sanciones' })
    const tabla = await within(seccion).findByRole('table', { name: /Sanciones más recientes/ })
    expect(within(tabla).getAllByRole('row').slice(1)).toHaveLength(2)
    expect(within(seccion).getByRole('link', { name: 'Ver todas' })).toHaveAttribute('href', '/sanciones?ciudadano=31')
  })

  it('muestra como máximo 5', async () => {
    const muchas = Array.from({ length: 7 }, (_, i) => sancion(100 + i, ANA, 'advertencia', null, hace(i + 1)))
    abrir('/usuarios/30', { sanciones: muchas })

    const seccion = await screen.findByRole('region', { name: 'Sanciones' })
    const tabla = await within(seccion).findByRole('table', { name: /Sanciones más recientes/ })
    expect(within(tabla).getAllByRole('row').slice(1)).toHaveLength(5)
  })

  it('sin sanciones lo dice y no muestra "Levantar bloqueo"', async () => {
    abrir('/usuarios/33')

    const seccion = await screen.findByRole('region', { name: 'Sanciones' })
    expect(await within(seccion).findByText('No tiene sanciones.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Levantar bloqueo' })).not.toBeInTheDocument()
  })

  it('levantar el bloqueo desde el usuario llama al endpoint y avisa', async () => {
    const adaptador = abrir('/usuarios/31')
    await screen.findByRole('heading', { level: 2, name: 'Luis Torres' })

    fireEvent.click(screen.getByRole('button', { name: 'Levantar bloqueo' }))
    const dialogo = await screen.findByRole('dialog', { name: '¿Levantar el bloqueo de Luis Torres?' })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Levantar bloqueo' }))

    expect(await aviso('Bloqueo levantado.')).toBeInTheDocument()
    expect(pedidos(adaptador, 'POST /usuarios/31/levantar-bloqueo/')).toBe(1)
  })

  it('un inactivo con bloqueo vigente tiene "Levantar bloqueo" en su sección de sanciones', async () => {
    abrir('/usuarios/32')

    const seccion = await screen.findByRole('region', { name: 'Sanciones' })
    expect(await within(seccion).findByRole('button', { name: 'Levantar bloqueo' })).toBeInTheDocument()
  })

  it('un gestor no tiene sección de sanciones', async () => {
    abrir('/usuarios/40')
    await screen.findByRole('heading', { level: 2, name: 'Carlos Ríos' })

    expect(screen.queryByRole('region', { name: 'Sanciones' })).not.toBeInTheDocument()
  })
})
