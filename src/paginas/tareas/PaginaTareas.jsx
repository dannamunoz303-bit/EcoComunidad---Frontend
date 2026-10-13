import { RefreshCw } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listarTareas } from '../../api/tareas.js'
import { listarUsuarios } from '../../api/usuarios.js'
import EstadoTarea from '../../componentes/EstadoTarea.jsx'
import Brotico from '../../marca/Brotico.jsx'
import { formatearFechaCorta, tiempoRelativo } from '../../utilidades/fechas.js'
import { useCarga } from '../../utilidades/useCarga.js'
import '../reportes/reportes.css'
import './tareas.css'

// Filtros en la URL: ?estado=en_proceso&gestor=40
const ESTADOS = [
  { valor: '', nombre: 'Todas' },
  { valor: 'asignada', nombre: 'Asignadas' },
  { valor: 'en_proceso', nombre: 'En proceso' },
  { valor: 'terminada', nombre: 'Terminadas' },
  { valor: 'cancelada', nombre: 'Canceladas' },
]

const nombreDe = (persona) => (persona ? `${persona.nombre} ${persona.apellido}` : '—')
const masReciente = (a, b) => new Date(b.fecha_asignacion) - new Date(a.fecha_asignacion) || b.id - a.id
const todosLosGestores = () => listarUsuarios({ rol: 'gestor' })

function Fecha({ valor }) {
  if (!valor) return <span className="texto-suave">—</span>
  return (
    <div>
      <time dateTime={valor} className="tabla-reportes__fecha">
        {formatearFechaCorta(valor)}
      </time>
      <span className="tabla-reportes__hace">{tiempoRelativo(valor)}</span>
    </div>
  )
}

function SiluetasFilas() {
  return (
    <div className="siluetas-filas" aria-busy="true" data-testid="siluetas-tareas">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="silueta-fila" aria-hidden="true">
          <span className="silueta-fila__bloque silueta-fila__bloque--largo" />
          <span className="silueta-fila__bloque" />
          <span className="silueta-fila__bloque" />
          <span className="silueta-fila__bloque" />
          <span className="silueta-fila__bloque" />
        </div>
      ))}
    </div>
  )
}

export default function PaginaTareas() {
  const [params, setParams] = useSearchParams()
  const estado = params.get('estado') ?? ''
  const gestor = params.get('gestor') ?? ''

  // El gestor se filtra en el backend; el estado, aquí, para contar cuántas hay de cada uno.
  const cargarTareas = useCallback(() => listarTareas({ gestor }), [gestor])
  const tareas = useCarga(cargarTareas)
  const gestores = useCarga(todosLosGestores)

  const cambiar = (clave, valor) =>
    setParams((anteriores) => {
      const nuevos = new URLSearchParams(anteriores)
      if (valor) nuevos.set(clave, valor)
      else nuevos.delete(clave)
      return nuevos
    })

  const { visibles, conteo } = useMemo(() => {
    const todas = tareas.datos ?? []
    const porEstado = { '': todas.length }
    for (const t of todas) porEstado[t.estado] = (porEstado[t.estado] ?? 0) + 1
    const filtradas = estado ? todas.filter((t) => t.estado === estado) : todas
    return { visibles: [...filtradas].sort(masReciente), conteo: porEstado }
  }, [tareas.datos, estado])

  const gestoresOrdenados = useMemo(
    () =>
      [...(gestores.datos ?? [])].sort((a, b) => nombreDe(a).localeCompare(nombreDe(b), 'es')),
    [gestores.datos],
  )

  let contenido
  if (tareas.cargando && !tareas.datos) {
    contenido = <SiluetasFilas />
  } else if (tareas.error) {
    contenido = (
      <div className="reportes__error">
        <p role="alert">No pudimos cargar las tareas.</p>
        <button type="button" className="boton-principal" onClick={tareas.reintentar}>
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  } else if (visibles.length === 0) {
    contenido = (
      <div className="reportes__vacio">
        <Brotico estado="triste" tamano={112} />
        <p>No hay tareas con esos filtros.</p>
        {(estado || gestor) && (
          <button type="button" className="boton-principal" onClick={() => setParams(new URLSearchParams())}>
            Quitar filtros
          </button>
        )}
      </div>
    )
  } else {
    contenido = (
      <table className="tabla-reportes">
        <caption className="solo-lector">Tareas, de la más reciente a la más antigua</caption>
        <thead>
          <tr>
            <th scope="col">Reporte</th>
            <th scope="col">Gestor</th>
            <th scope="col">Estado</th>
            <th scope="col">Asignación</th>
            <th scope="col">Fin</th>
          </tr>
        </thead>
        <tbody>
          {visibles.map((t) => (
            <tr key={t.id}>
              <td className="tabla-reportes__titulo">
                {t.reporte ? <Link to={`/reportes/${t.reporte.id}`}>{t.reporte.titulo}</Link> : '—'}
                {t.reporte?.categoria && <span className="tabla-reportes__direccion">{t.reporte.categoria}</span>}
              </td>
              <td data-etiqueta="Gestor">{nombreDe(t.gestor)}</td>
              <td data-etiqueta="Estado">
                <EstadoTarea estado={t.estado} />
              </td>
              <td data-etiqueta="Asignación">
                <Fecha valor={t.fecha_asignacion} />
              </td>
              <td data-etiqueta="Fin">
                <Fecha valor={t.fecha_fin} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <div className="reportes">
      <p className="reportes__total" aria-live="polite">
        {tareas.cargando && !tareas.datos
          ? 'Cargando tareas…'
          : `${visibles.length} ${visibles.length === 1 ? 'tarea' : 'tareas'}`}
      </p>

      <div className="filtros-reportes">
        <div className="filtros-reportes__estados" role="group" aria-label="Filtrar por estado">
          {ESTADOS.map(({ valor, nombre }) => (
            <button
              key={valor || 'todas'}
              type="button"
              className="filtro-estado"
              aria-pressed={estado === valor}
              onClick={() => cambiar('estado', valor)}
            >
              {nombre}
              <span className="filtro-estado__cantidad">{conteo[valor] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="filtros-reportes__fila">
          <div className="campo filtros-tareas__gestor">
            <label htmlFor="filtro-gestor">Gestor</label>
            <select id="filtro-gestor" value={gestor} onChange={(e) => cambiar('gestor', e.target.value)}>
              <option value="">Todos</option>
              {gestoresOrdenados.map((g) => (
                <option key={g.id} value={String(g.id)}>
                  {nombreDe(g)}
                  {g.estado !== 'activo' ? ` (${g.estado})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {contenido}
    </div>
  )
}
