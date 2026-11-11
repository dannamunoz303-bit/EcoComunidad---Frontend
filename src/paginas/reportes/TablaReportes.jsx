import { Link } from 'react-router-dom'
import EstadoReporte from '../../componentes/EstadoReporte.jsx'
import UrgenciaReporte from '../../componentes/UrgenciaReporte.jsx'
import { formatearFechaCorta, tiempoRelativo } from '../../utilidades/fechas.js'
import { nombreMunicipio, nombreZona } from '../../utilidades/territorio.js'

const nombreCompleto = (persona) => (persona ? `${persona.nombre} ${persona.apellido}` : '—')

// Una sola tabla: en pantallas pequeñas el CSS la muestra como tarjetas.
export default function TablaReportes({ reportes, desde }) {
  return (
    <table className="tabla-reportes">
      <caption className="solo-lector">Reportes, por urgencia (alta primero) y del más antiguo al más reciente</caption>
      <thead>
        <tr>
          <th scope="col">Título</th>
          <th scope="col">Urgencia</th>
          <th scope="col">Lugar</th>
          <th scope="col">Categoría</th>
          <th scope="col">Estado</th>
          <th scope="col">Ciudadano</th>
          <th scope="col">Creado</th>
        </tr>
      </thead>
      <tbody>
        {reportes.map((r) => (
          <tr key={r.id} className={r.eliminado ? 'tabla-reportes__fila--eliminado' : undefined}>
            <td className="tabla-reportes__titulo">
              <Link to={`/reportes/${r.id}`} state={{ desde }}>
                {r.titulo}
              </Link>
              {r.direccion && <span className="tabla-reportes__direccion">{r.direccion}</span>}
            </td>
            <td data-etiqueta="Urgencia">{r.urgencia ? <UrgenciaReporte urgencia={r.urgencia} prefijo="" /> : '—'}</td>
            <td data-etiqueta="Lugar">
              <div>
                <span className={r.municipio ? undefined : 'texto-suave'}>{nombreMunicipio(r)}</span>
                {r.vereda && <span className="tabla-reportes__direccion">Vereda {r.vereda}</span>}
                {r.zona && <span className="tabla-reportes__direccion">Zona {nombreZona(r.zona)}</span>}
              </div>
            </td>
            <td data-etiqueta="Categoría">{r.categoria ?? '—'}</td>
            <td data-etiqueta="Estado">
              <EstadoReporte estado={r.estado} eliminado={r.eliminado} />
            </td>
            <td data-etiqueta="Ciudadano">{nombreCompleto(r.ciudadano)}</td>
            <td data-etiqueta="Creado">
              <div>
                <time dateTime={r.fecha_creacion} className="tabla-reportes__fecha">
                  {formatearFechaCorta(r.fecha_creacion)}
                </time>
                <span className="tabla-reportes__hace">{tiempoRelativo(r.fecha_creacion)}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
