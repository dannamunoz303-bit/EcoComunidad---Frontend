import { Check, Gavel, Pencil, RotateCcw, Trash2, Undo2, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { aprobarReporte, devolverAPendiente, eliminarReporte, reabrirReporte } from '../../../api/reportes.js'
import { useAvisos } from '../../../componentes/avisos/useAvisos.js'
import DialogoConfirmar from './DialogoConfirmar.jsx'
import DialogoRechazar from './DialogoRechazar.jsx'
import './acciones.css'

// Acciones válidas en cada estado (ecocomunidad.md, sección 6.1, RN-08, RN-09 y RN-17).
// "Eliminar" vale en todos mientras el reporte no esté eliminado.
const ACCIONES_POR_ESTADO = {
  pendiente: ['aprobar', 'rechazar', 'editar'],
  rechazado: ['devolver'],
  aprobado: ['editar'],
  asignado: ['editar'],
  en_proceso: ['editar'],
  resuelto: ['reabrir', 'editar'],
}

const ESTADOS_CON_ASIGNACION = ['aprobado', 'asignado', 'en_proceso']

export default function PanelAcciones({ reporte, desde, alCambiar }) {
  const { mostrarAviso } = useAvisos()
  const [abierto, setAbierto] = useState(null)
  const ciudadano = reporte.ciudadano ? `${reporte.ciudadano.nombre} ${reporte.ciudadano.apellido}` : null
  const nombreCiudadano = ciudadano ?? 'El ciudadano'

  const cerrar = () => setAbierto(null)
  const terminar = (texto) => () => {
    setAbierto(null)
    mostrarAviso({ tipo: 'exito', texto })
    alCambiar()
  }

  if (reporte.eliminado) {
    return (
      <div className="panel-acciones">
        <h2 className="panel-acciones__titulo">Acciones</h2>
        <p className="texto-suave">Este reporte fue eliminado y ya no admite cambios.</p>
      </div>
    )
  }

  const acciones = ACCIONES_POR_ESTADO[reporte.estado] ?? []
  const puede = (accion) => acciones.includes(accion)

  return (
    <div className="panel-acciones">
      <h2 className="panel-acciones__titulo">Acciones</h2>

      <div className="panel-acciones__grupo">
        {puede('aprobar') && (
          <button type="button" className="boton-principal" onClick={() => setAbierto('aprobar')}>
            <Check size={18} aria-hidden="true" />
            Aprobar
          </button>
        )}
        {puede('reabrir') && (
          <button type="button" className="boton-principal" onClick={() => setAbierto('reabrir')}>
            <RotateCcw size={18} aria-hidden="true" />
            Reabrir
          </button>
        )}
        {puede('rechazar') && (
          <button type="button" className="boton-secundario" onClick={() => setAbierto('rechazar')}>
            <X size={18} aria-hidden="true" />
            Rechazar
          </button>
        )}
        {puede('devolver') && (
          <button type="button" className="boton-secundario" onClick={() => setAbierto('devolver')}>
            <Undo2 size={18} aria-hidden="true" />
            Devolver a pendiente
          </button>
        )}
        {puede('editar') && (
          <Link className="boton-secundario" to={`/reportes/${reporte.id}/editar`} state={{ desde }}>
            <Pencil size={18} aria-hidden="true" />
            Editar
          </Link>
        )}
      </div>

      {ESTADOS_CON_ASIGNACION.includes(reporte.estado) && (
        <p className="texto-suave panel-acciones__nota">Asignar gestores llega en el próximo paso.</p>
      )}

      {reporte.estado === 'rechazado' && reporte.ciudadano && (
        <Link
          className="panel-acciones__enlace"
          to={`/sanciones?ciudadano=${reporte.ciudadano.id}&reporte=${reporte.id}`}
        >
          <Gavel size={18} aria-hidden="true" />
          Sancionar a {ciudadano}
        </Link>
      )}

      <div className="panel-acciones__peligro">
        <button type="button" className="boton-peligro" onClick={() => setAbierto('eliminar')}>
          <Trash2 size={18} aria-hidden="true" />
          Eliminar
        </button>
      </div>

      {abierto === 'aprobar' && (
        <DialogoConfirmar
          titulo="¿Aprobar este reporte?"
          textoBoton="Aprobar"
          textoEnviando="Aprobando…"
          accion={() => aprobarReporte(reporte.id)}
          alCerrar={cerrar}
          alTerminar={terminar(`Reporte aprobado. ${nombreCiudadano} recibió una notificación.`)}
        >
          <p>El ciudadano recibirá una notificación.</p>
        </DialogoConfirmar>
      )}

      {abierto === 'rechazar' && (
        <DialogoRechazar
          reporteId={reporte.id}
          alCerrar={cerrar}
          alTerminar={terminar(`Reporte rechazado. ${nombreCiudadano} recibió el motivo.`)}
        />
      )}

      {abierto === 'devolver' && (
        <DialogoConfirmar
          titulo="¿Devolver a pendiente?"
          textoBoton="Devolver a pendiente"
          textoEnviando="Devolviendo…"
          accion={() => devolverAPendiente(reporte.id)}
          alCerrar={cerrar}
          alTerminar={terminar('El reporte volvió a pendiente.')}
        >
          <p>El reporte vuelve a revisión y el ciudadano podrá editarlo otra vez.</p>
        </DialogoConfirmar>
      )}

      {abierto === 'reabrir' && (
        <DialogoConfirmar
          titulo="¿Reabrir este reporte?"
          textoBoton="Reabrir"
          textoEnviando="Reabriendo…"
          accion={() => reabrirReporte(reporte.id)}
          alCerrar={cerrar}
          alTerminar={terminar('Reporte reabierto. Ya puedes asignarle una tarea nueva.')}
        >
          <p>
            Solo se puede reabrir si el ciudadano presentó una queja después de que se resolvió. Las tareas
            anteriores quedan como historial.
          </p>
        </DialogoConfirmar>
      )}

      {abierto === 'eliminar' && (
        <DialogoConfirmar
          titulo="¿Eliminar este reporte?"
          textoBoton="Eliminar reporte"
          textoEnviando="Eliminando…"
          peligro
          accion={() => eliminarReporte(reporte.id)}
          alCerrar={cerrar}
          alTerminar={terminar('Reporte eliminado.')}
        >
          <p>
            El reporte quedará eliminado y sus tareas activas se cancelarán. Se avisará al ciudadano y a los
            gestores. Esta acción no se puede deshacer desde el panel.
          </p>
        </DialogoConfirmar>
      )}
    </div>
  )
}
