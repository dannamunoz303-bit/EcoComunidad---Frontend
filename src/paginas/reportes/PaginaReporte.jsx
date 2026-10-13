import { ArrowLeft, CircleAlert, RefreshCw, Trash2 } from 'lucide-react'
import { useCallback } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { obtenerReporte, obtenerTareasDeReporte } from '../../api/reportes.js'
import EstadoReporte from '../../componentes/EstadoReporte.jsx'
import Brotico from '../../marca/Brotico.jsx'
import { formatearFechaHora } from '../../utilidades/fechas.js'
import { useCarga } from '../../utilidades/useCarga.js'
import GaleriaFotos from './GaleriaFotos.jsx'
import HistorialTareas from './HistorialTareas.jsx'
import UbicacionReporte from './UbicacionReporte.jsx'
import NovedadesDelReporte from '../novedades/NovedadesDelReporte.jsx'
import PanelAcciones from './acciones/PanelAcciones.jsx'
import './detalle.css'

const nombreCompleto = (persona) => (persona ? `${persona.nombre} ${persona.apellido}` : null)

function Seccion({ id, titulo, children }) {
  return (
    <section className="detalle__seccion" aria-labelledby={id}>
      <h2 id={id} className="detalle__subtitulo">
        {titulo}
      </h2>
      {children}
    </section>
  )
}

function DetalleReporte({ reporte, tareas, desde, alCambiar }) {
  const fotos = (reporte.fotos ?? []).map((foto, i) => ({ ...foto, alt: `Foto ${i + 1} del reporte` }))
  const ciudadano = nombreCompleto(reporte.ciudadano)
  const revisor = nombreCompleto(reporte.revisado_por)

  // Áreas: cabecera, acciones y contenido. En pantalla grande, las acciones van a la derecha;
  // en pantallas pequeñas, debajo de la cabecera.
  return (
    <div className="detalle__columnas">
      <header className="detalle__cabecera">
        <div className="detalle__titulo-fila">
          <h2 className="detalle__titulo">{reporte.titulo}</h2>
          <EstadoReporte estado={reporte.estado} eliminado={reporte.eliminado} />
        </div>
        <p className="detalle__meta">
          <span>Reporte #{reporte.id}</span>
          <span>
            Creado el <time dateTime={reporte.fecha_creacion}>{formatearFechaHora(reporte.fecha_creacion)}</time>
          </span>
          {reporte.fecha_actualizacion && (
            <span>
              Última actualización:{' '}
              <time dateTime={reporte.fecha_actualizacion}>{formatearFechaHora(reporte.fecha_actualizacion)}</time>
            </span>
          )}
        </p>
      </header>

      <aside className="detalle__acciones" aria-label="Acciones del reporte">
        <PanelAcciones
          reporte={reporte}
          // Mientras llegan las tareas no se sabe a quién excluir al asignar
          tareas={tareas.cargando && !tareas.datos ? null : (tareas.datos ?? [])}
          desde={desde}
          alCambiar={alCambiar}
        />
      </aside>

      <div className="detalle__principal">
        {reporte.eliminado && (
          <p className="aviso aviso--gris">
            <Trash2 size={20} aria-hidden="true" />
            Este reporte fue eliminado
          </p>
        )}
        {reporte.estado === 'rechazado' && (
          <div className="aviso aviso--arcilla">
            <CircleAlert size={20} aria-hidden="true" />
            <div>
              <p className="aviso__titulo">Reporte rechazado</p>
              <p>Motivo: {reporte.motivo_rechazo || 'sin motivo registrado.'}</p>
            </div>
          </div>
        )}

        <Seccion id="titulo-fotos" titulo="Fotos">
          {fotos.length ? (
            <GaleriaFotos fotos={fotos} />
          ) : (
            <p className="texto-suave">Este reporte no tiene fotos.</p>
          )}
        </Seccion>

        <Seccion id="titulo-datos" titulo="Datos del reporte">
          <dl className="datos-lista">
            <div className="datos-lista__ancho">
              <dt>Descripción del problema</dt>
              <dd className="detalle__descripcion">{reporte.descripcion || '—'}</dd>
            </div>
            <div>
              <dt>Categoría</dt>
              <dd>{reporte.categoria ?? '—'}</dd>
            </div>
            <div>
              <dt>Ciudadano</dt>
              <dd>{ciudadano ?? '—'}</dd>
            </div>
            {revisor && (
              <div>
                <dt>Revisado por</dt>
                <dd>{revisor}</dd>
              </div>
            )}
            {reporte.fecha_revision && (
              <div>
                <dt>Fecha de revisión</dt>
                <dd>
                  <time dateTime={reporte.fecha_revision}>{formatearFechaHora(reporte.fecha_revision)}</time>
                </dd>
              </div>
            )}
          </dl>
        </Seccion>

        <Seccion id="titulo-ubicacion" titulo="Ubicación">
          <UbicacionReporte reporte={reporte} />
        </Seccion>

        <Seccion id="titulo-tareas" titulo="Historial de tareas">
          <HistorialTareas
            tareas={tareas.datos}
            cargando={tareas.cargando && !tareas.datos}
            error={tareas.error}
            reintentar={tareas.reintentar}
            reporte={reporte}
            alCambiar={alCambiar}
          />
        </Seccion>

        <Seccion id="titulo-novedades" titulo="Novedades de este reporte">
          <NovedadesDelReporte reporteId={reporte.id} />
        </Seccion>
      </div>
    </div>
  )
}

export default function PaginaReporte() {
  const { id } = useParams()
  const { state } = useLocation()
  const volver = `/reportes${state?.desde ?? ''}`

  const cargarReporte = useCallback(() => obtenerReporte(id), [id])
  const cargarTareas = useCallback(() => obtenerTareasDeReporte(id), [id])
  const reporte = useCarga(cargarReporte)
  const tareas = useCarga(cargarTareas)
  const recargarReporte = reporte.reintentar
  const recargarTareas = tareas.reintentar

  // Tras una acción: recarga el detalle y sus tareas, sin quitar lo que ya se ve.
  const recargar = useCallback(() => {
    recargarReporte()
    recargarTareas()
  }, [recargarReporte, recargarTareas])

  let contenido
  if (reporte.datos) {
    contenido = (
      <DetalleReporte reporte={reporte.datos} tareas={tareas} desde={state?.desde ?? ''} alCambiar={recargar} />
    )
  } else if (reporte.cargando) {
    contenido = (
      <div className="detalle__siluetas" aria-busy="true" data-testid="siluetas-detalle">
        <span className="silueta-fila__bloque silueta-fila__bloque--largo" />
        <span className="silueta-fila__bloque" />
        <span className="detalle__silueta-galeria" />
      </div>
    )
  } else if (reporte.error?.response?.status === 404) {
    contenido = (
      <div className="detalle__no-existe">
        <Brotico estado="triste" tamano={112} />
        <p>Este reporte no existe o fue borrado.</p>
        <Link className="boton-principal" to={volver}>
          Ir a la lista de reportes
        </Link>
      </div>
    )
  } else {
    contenido = (
      <div className="detalle__error">
        <p role="alert">No pudimos cargar el reporte.</p>
        <button type="button" className="boton-principal" onClick={reporte.reintentar}>
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="detalle">
      <Link className="boton-secundario detalle__volver" to={volver}>
        <ArrowLeft size={18} aria-hidden="true" />
        Volver a reportes
      </Link>
      {contenido}
    </div>
  )
}
