import { Link } from 'react-router-dom'
import TipoSancion from '../../componentes/TipoSancion.jsx'
import { formatearFechaCorta, tiempoRelativo } from '../../utilidades/fechas.js'
import { nombreCompleto } from '../../utilidades/usuarios.js'

// Historial de sanciones (más reciente primero). Una sola tabla: en pantallas pequeñas se ve como tarjetas.
// titulosReportes: { [id]: titulo } para el enlace al reporte relacionado.
export default function TablaSanciones({ sanciones, titulosReportes = {}, conCiudadano = true, titulo = 'Sanciones' }) {
  return (
    <table className="tabla-reportes">
      <caption className="solo-lector">{titulo}, de la más reciente a la más antigua</caption>
      <thead>
        <tr>
          {conCiudadano && <th scope="col">Ciudadano</th>}
          <th scope="col">Tipo</th>
          <th scope="col">Motivo</th>
          <th scope="col">Reporte</th>
          <th scope="col">Fecha</th>
        </tr>
      </thead>
      <tbody>
        {sanciones.map((s) => (
          <tr key={s.id}>
            {conCiudadano && (
              <td className="tabla-reportes__titulo">
                <Link to={`/usuarios/${s.ciudadano.id}`}>{nombreCompleto(s.ciudadano)}</Link>
              </td>
            )}
            <td data-etiqueta="Tipo">
              <TipoSancion sancion={s} />
            </td>
            <td data-etiqueta="Motivo" className="tabla-sanciones__motivo">
              {s.motivo}
            </td>
            <td data-etiqueta="Reporte">
              {s.reporte ? (
                <Link to={`/reportes/${s.reporte}`}>{titulosReportes[s.reporte] ?? `Reporte #${s.reporte}`}</Link>
              ) : (
                <span className="texto-suave">—</span>
              )}
            </td>
            <td data-etiqueta="Fecha">
              <div>
                <time dateTime={s.fecha_inicio} className="tabla-reportes__fecha">
                  {formatearFechaCorta(s.fecha_inicio)}
                </time>
                <span className="tabla-reportes__hace">{tiempoRelativo(s.fecha_inicio)}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
