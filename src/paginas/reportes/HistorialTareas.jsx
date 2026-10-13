import { RefreshCw } from 'lucide-react'
import { formatearFechaHora } from '../../utilidades/fechas.js'
import GaleriaFotos from './GaleriaFotos.jsx'

// Estados de la tarea (ecocomunidad.md, sección 6.2).
const ESTADOS_TAREA = {
  asignada: 'Asignada',
  en_proceso: 'En proceso',
  terminada: 'Terminada',
  cancelada: 'Cancelada',
}

const masReciente = (a, b) => new Date(b.fecha) - new Date(a.fecha) || b.id - a.id

function Tarea({ tarea }) {
  const acciones = [...(tarea.acciones ?? [])].sort(masReciente)
  const gestor = tarea.gestor ? `${tarea.gestor.nombre} ${tarea.gestor.apellido}` : 'Gestor sin nombre'

  return (
    <li className="tarea">
      <div className="tarea__cabecera">
        <h3 className="tarea__gestor">{gestor}</h3>
        <span className={`estado-tarea estado-tarea--${tarea.estado}`}>
          {ESTADOS_TAREA[tarea.estado] ?? tarea.estado}
        </span>
      </div>
      <dl className="tarea__fechas">
        <div>
          <dt>Asignación</dt>
          <dd>{formatearFechaHora(tarea.fecha_asignacion) ?? '—'}</dd>
        </div>
        {tarea.fecha_fin && (
          <div>
            <dt>Fin</dt>
            <dd>{formatearFechaHora(tarea.fecha_fin)}</dd>
          </div>
        )}
      </dl>

      {acciones.length === 0 ? (
        <p className="texto-suave tarea__sin-acciones">El gestor todavía no registra acciones.</p>
      ) : (
        <ol className="acciones" aria-label={`Acciones de ${gestor}`}>
          {acciones.map((accion) => (
            <li key={accion.id} className="accion">
              <time className="accion__fecha" dateTime={accion.fecha}>
                {formatearFechaHora(accion.fecha)}
              </time>
              <p className="accion__descripcion">{accion.descripcion}</p>
              {accion.fotos?.length > 0 && (
                <GaleriaFotos
                  className="galeria--miniaturas"
                  fotos={accion.fotos.map((foto, i) => ({
                    ...foto,
                    alt: `Evidencia ${i + 1} de la acción del ${formatearFechaHora(accion.fecha)}`,
                  }))}
                />
              )}
            </li>
          ))}
        </ol>
      )}
    </li>
  )
}

export default function HistorialTareas({ tareas, cargando, error, reintentar }) {
  if (cargando) {
    return (
      <div className="tareas-siluetas" aria-busy="true" data-testid="siluetas-tareas">
        <span className="silueta-fila__bloque silueta-fila__bloque--largo" />
        <span className="silueta-fila__bloque" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="detalle__error-pequeno">
        <p role="alert">No pudimos cargar las tareas de este reporte.</p>
        <button type="button" className="boton-secundario" onClick={reintentar}>
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  }
  if (!tareas?.length) {
    return <p className="texto-suave">Este reporte aún no tiene tareas.</p>
  }
  return (
    <ol className="tareas">
      {tareas.map((tarea) => (
        <Tarea key={tarea.id} tarea={tarea} />
      ))}
    </ol>
  )
}
