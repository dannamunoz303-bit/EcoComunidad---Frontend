import { ArrowLeft, RefreshCw, RotateCcw, Send, UserPlus } from 'lucide-react'
import { useCallback, useId, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { erroresPorCampo } from '../../api/errores.js'
import { obtenerNovedad, responderNovedad } from '../../api/novedades.js'
import { obtenerReporte, obtenerTareasDeReporte } from '../../api/reportes.js'
import { asignarTarea } from '../../api/tareas.js'
import { obtenerUsuario } from '../../api/usuarios.js'
import EstadoNovedad from '../../componentes/EstadoNovedad.jsx'
import EstadoReporte from '../../componentes/EstadoReporte.jsx'
import EstadoTarea from '../../componentes/EstadoTarea.jsx'
import TipoNovedad from '../../componentes/TipoNovedad.jsx'
import { useAvisos } from '../../componentes/avisos/useAvisos.js'
import IconoEstado from '../../componentes/IconoEstado.jsx'
import { formatearFechaHora } from '../../utilidades/fechas.js'
import { rolDeCreador } from '../../utilidades/novedades.js'
import { useCarga } from '../../utilidades/useCarga.js'
import { NOMBRES_ROL, nombreCompleto } from '../../utilidades/usuarios.js'
import DialogoReabrir, { AVISO_REABIERTO } from '../reportes/acciones/DialogoReabrir.jsx'
import ErrorAccion from '../reportes/acciones/ErrorAccion.jsx'
import { useEnvio } from '../reportes/acciones/useEnvio.js'
import DialogoElegirGestor from '../tareas/DialogoElegirGestor.jsx'
import '../reportes/detalle.css'
import './novedades.css'

const ESTADOS_TAREA_ACTIVA = ['asignada', 'en_proceso']

function FormularioRespuesta({ novedad, nombre, alResponder }) {
  const [respuesta, setRespuesta] = useState('')
  const { enviando, error, enviar } = useEnvio()
  const id = useId()
  const valida = respuesta.trim().length > 0
  const errorCampo = erroresPorCampo(error).respuesta

  async function responder(evento) {
    evento.preventDefault()
    if (!valida) return
    const { ok } = await enviar(() => responderNovedad(novedad.id, respuesta.trim()))
    if (ok) alResponder()
  }

  return (
    <form className="formulario-respuesta" onSubmit={responder} noValidate>
      <div className="campo">
        <label htmlFor={id}>Respuesta</label>
        <textarea
          id={id}
          rows={5}
          required
          aria-required="true"
          aria-invalid={errorCampo ? 'true' : undefined}
          aria-describedby={`${id}-ayuda ${id}-contador`}
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          disabled={enviando}
        />
        <div className="campo__ayuda-fila">
          <span id={`${id}-ayuda`} className="campo__ayuda">
            Se enviará a {nombre} y la novedad quedará atendida. La respuesta no se puede editar después.
          </span>
          <span id={`${id}-contador`} className="campo__contador">
            {respuesta.length} {respuesta.length === 1 ? 'carácter' : 'caracteres'}
          </span>
        </div>
        {errorCampo && <p className="campo__error">{errorCampo}</p>}
      </div>
      {!errorCampo && <ErrorAccion error={error} />}
      <button type="submit" className="boton-principal formulario-respuesta__enviar" disabled={!valida || enviando}>
        <Send size={18} aria-hidden="true" />
        {enviando ? 'Enviando…' : 'Enviar respuesta'}
      </button>
    </form>
  )
}

// Atajos para actuar sobre el reporte antes de responder (RN-11, RN-12, RN-17).
function Atajos({ novedad, rol, reporte, tareas, alUsar }) {
  const { mostrarAviso } = useAvisos()
  const [abierto, setAbierto] = useState(null)
  if (!reporte || reporte.eliminado) return null

  // Ayuda de un gestor con el reporte asignado o en proceso: sumar otro gestor (caso A, paso 6)
  const sumarGestor = novedad.tipo === 'ayuda' && ['asignado', 'en_proceso'].includes(reporte.estado)
  // Queja del ciudadano sobre un reporte resuelto: reabrirlo (RN-17)
  const reabrir = novedad.tipo === 'queja' && rol === 'ciudadano' && reporte.estado === 'resuelto'
  if (!sumarGestor && !reabrir) return null

  const conTareaActiva = (tareas ?? [])
    .filter((t) => ESTADOS_TAREA_ACTIVA.includes(t.estado) && t.gestor)
    .map((t) => t.gestor.id)
  const terminar = (texto) => {
    setAbierto(null)
    mostrarAviso({ tipo: 'exito', texto })
    alUsar()
  }

  return (
    <div className="atajos">
      <p>
        Antes de responder, puedes actuar sobre el reporte desde aquí. La novedad sigue abierta hasta que envíes la
        respuesta.
      </p>
      <div className="atajos__botones">
        {sumarGestor && (
          <button type="button" className="boton-secundario" onClick={() => setAbierto('gestor')}>
            <UserPlus size={18} aria-hidden="true" />
            Sumar otro gestor al reporte
          </button>
        )}
        {reabrir && (
          <button type="button" className="boton-secundario" onClick={() => setAbierto('reabrir')}>
            <RotateCcw size={18} aria-hidden="true" />
            Reabrir el reporte
          </button>
        )}
      </div>

      {abierto === 'gestor' && (
        <DialogoElegirGestor
          titulo="Sumar otro gestor"
          textoBoton="Asignar"
          textoEnviando="Asignando…"
          excluir={conTareaActiva}
          accion={(gestor) => asignarTarea(reporte.id, gestor.id)}
          alCerrar={() => setAbierto(null)}
          alTerminar={(gestor) => {
            const nombre = nombreCompleto(gestor)
            terminar(`Tarea asignada a ${nombre}. Se le avisó a ${nombre}.`)
          }}
        />
      )}
      {abierto === 'reabrir' && (
        <DialogoReabrir
          reporteId={reporte.id}
          alCerrar={() => setAbierto(null)}
          alTerminar={() => terminar(AVISO_REABIERTO)}
        />
      )}
    </div>
  )
}

function DetalleNovedad({ novedad, relacionados, alCambiar }) {
  const { mostrarAviso } = useAvisos()
  const { reporte, tareas, creador } = relacionados.datos ?? {}
  const rol = creador?.rol ?? rolDeCreador(novedad)
  const nombre = nombreCompleto(novedad.creado_por)
  const tarea = novedad.tarea ? (tareas ?? []).find((t) => t.id === novedad.tarea) : null

  return (
    <div className="novedad-detalle">
      <header className="detalle__cabecera">
        <div className="novedad-detalle__etiquetas">
          <TipoNovedad tipo={novedad.tipo} />
          <EstadoNovedad estado={novedad.estado} />
        </div>
        <h2 className="detalle__titulo">Novedad #{novedad.id}</h2>
        <p className="detalle__meta">
          <time dateTime={novedad.fecha}>{formatearFechaHora(novedad.fecha)}</time>
        </p>
      </header>

      <section className="detalle__seccion" aria-labelledby="titulo-contexto-novedad">
        <h3 id="titulo-contexto-novedad" className="detalle__subtitulo">
          Contexto
        </h3>
        <dl className="datos-lista">
          <div>
            <dt>Creada por</dt>
            <dd>
              <Link to={`/usuarios/${novedad.creado_por.id}`}>{nombre}</Link>
              {rol && <span className="texto-suave"> · {NOMBRES_ROL[rol]}</span>}
            </dd>
          </div>
          <div>
            <dt>Reporte</dt>
            <dd>
              <Link to={`/reportes/${novedad.reporte}`}>{novedad.reporte_titulo}</Link>
              {reporte && (
                <span className="novedad__estado-reporte">
                  {' '}
                  <EstadoReporte estado={reporte.estado} eliminado={reporte.eliminado} />
                </span>
              )}
            </dd>
          </div>
          {novedad.tarea && (
            <div>
              <dt>Tarea</dt>
              <dd>
                {tarea ? (
                  <>
                    {nombreCompleto(tarea.gestor)} <EstadoTarea estado={tarea.estado} />
                  </>
                ) : (
                  `Tarea #${novedad.tarea}`
                )}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="detalle__seccion" aria-labelledby="titulo-descripcion-novedad">
        <h3 id="titulo-descripcion-novedad" className="detalle__subtitulo">
          Descripción
        </h3>
        <p className="novedad__descripcion">{novedad.descripcion}</p>
      </section>

      <section className="detalle__seccion" aria-labelledby="titulo-respuesta-novedad">
        <h3 id="titulo-respuesta-novedad" className="detalle__subtitulo">
          {novedad.estado === 'atendida' ? 'Respuesta del administrador' : 'Responder'}
        </h3>
        {novedad.estado === 'atendida' ? (
          <p className="novedad__respuesta">{novedad.respuesta}</p>
        ) : (
          <>
            <Atajos novedad={novedad} rol={rol} reporte={reporte} tareas={tareas} alUsar={alCambiar} />
            <FormularioRespuesta
              novedad={novedad}
              nombre={nombre}
              alResponder={() => {
                mostrarAviso({ tipo: 'exito', texto: 'Respuesta enviada.' })
                alCambiar()
              }}
            />
          </>
        )}
      </section>
    </div>
  )
}

export default function PaginaNovedad() {
  const { id } = useParams()
  const cargarNovedad = useCallback(() => obtenerNovedad(id), [id])
  const novedad = useCarga(cargarNovedad)

  // El reporte (estado), sus tareas (gestor de la tarea y gestores a excluir) y quién la creó (rol).
  const reporteId = novedad.datos?.reporte
  const creadorId = novedad.datos?.creado_por?.id
  const cargarRelacionados = useCallback(
    () =>
      reporteId
        ? Promise.all([
            obtenerReporte(reporteId).catch(() => null),
            obtenerTareasDeReporte(reporteId).catch(() => []),
            creadorId ? obtenerUsuario(creadorId).catch(() => null) : null,
          ]).then(([reporte, tareas, creador]) => ({ reporte, tareas, creador }))
        : Promise.resolve(null),
    [reporteId, creadorId],
  )
  const relacionados = useCarga(cargarRelacionados)
  const recargarNovedad = novedad.reintentar
  const recargarRelacionados = relacionados.reintentar
  const recargar = useCallback(() => {
    recargarNovedad()
    recargarRelacionados()
  }, [recargarNovedad, recargarRelacionados])

  let contenido
  if (novedad.datos) {
    contenido = <DetalleNovedad novedad={novedad.datos} relacionados={relacionados} alCambiar={recargar} />
  } else if (novedad.cargando) {
    contenido = (
      <div className="detalle__siluetas" aria-busy="true" data-testid="siluetas-novedad">
        <span className="silueta-fila__bloque silueta-fila__bloque--largo" />
        <span className="silueta-fila__bloque" />
      </div>
    )
  } else if (novedad.error?.response?.status === 404) {
    contenido = (
      <div className="detalle__no-existe">
        <IconoEstado tipo="no-existe" tamano={112} />
        <p>Esta novedad no existe.</p>
        <Link className="boton-principal" to="/novedades">
          Ir a la lista de novedades
        </Link>
      </div>
    )
  } else {
    contenido = (
      <div className="detalle__error">
        <p role="alert">No pudimos cargar la novedad.</p>
        <button type="button" className="boton-principal" onClick={novedad.reintentar}>
          <RefreshCw size={18} aria-hidden="true" />
          Reintentar
        </button>
      </div>
    )
  }

  const volver = novedad.datos?.estado === 'atendida' ? '/novedades?estado=atendida' : '/novedades'

  return (
    <div className="detalle">
      <Link className="boton-secundario detalle__volver" to={volver}>
        <ArrowLeft size={18} aria-hidden="true" />
        Volver a novedades
      </Link>
      {contenido}
    </div>
  )
}
