import { Link } from 'react-router-dom'
import EstadoNovedad from '../../componentes/EstadoNovedad.jsx'
import TipoNovedad from '../../componentes/TipoNovedad.jsx'
import { tiempoRelativo } from '../../utilidades/fechas.js'
import { NOMBRES_ROL, nombreCompleto } from '../../utilidades/usuarios.js'
import './novedades.css'

// Tarjeta de una novedad: tipo, estado, inicio del texto (2 líneas), quién y cuándo.
export default function TarjetaNovedad({ novedad, rol, conReporte = true }) {
  return (
    <article className="tarjeta-novedad" aria-labelledby={`novedad-${novedad.id}`}>
      <div className="tarjeta-novedad__cabecera">
        <TipoNovedad tipo={novedad.tipo} />
        <EstadoNovedad estado={novedad.estado} />
        <time className="tarjeta-novedad__fecha" dateTime={novedad.fecha}>
          {tiempoRelativo(novedad.fecha)}
        </time>
      </div>
      <h2 id={`novedad-${novedad.id}`} className="tarjeta-novedad__titulo">
        <Link to={`/novedades/${novedad.id}`}>Novedad #{novedad.id}</Link>
      </h2>
      <p className="tarjeta-novedad__descripcion">{novedad.descripcion}</p>
      <p className="tarjeta-novedad__datos">
        <span>
          {nombreCompleto(novedad.creado_por)}
          {rol && <span className="texto-suave"> · {NOMBRES_ROL[rol]}</span>}
        </span>
        {conReporte && (
          <span>
            Reporte: <Link to={`/reportes/${novedad.reporte}`}>{novedad.reporte_titulo}</Link>
          </span>
        )}
      </p>
    </article>
  )
}
