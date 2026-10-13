import { Check, Gavel, Pencil, RotateCcw, Trash2, Undo2, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { aprobarReporte, devolverAPendiente, eliminarReporte } from '../../../api/reportes.js'
import { asignarTarea } from '../../../api/tareas.js'
import { useAvisos } from '../../../componentes/avisos/useAvisos.js'
import DialogoElegirGestor from '../../tareas/DialogoElegirGestor.jsx'
import DialogoConfirmar from './DialogoConfirmar.jsx'
import DialogoReabrir, { AVISO_REABIERTO } from './DialogoReabrir.jsx'
import DialogoRechazar from './DialogoRechazar.jsx'
import './acciones.css'

// Acciones válidas en cada estado (ecocomunidad.md, sección 6.1, RN-08, RN-09 y RN-17).
// "Eliminar" vale en todos mientras el reporte no esté eliminado.
// Asignar vale en aprobado, asignado y en proceso (RN-11).
const ACCIONES_POR_ESTADO = {
  pendiente: ['aprobar', 'rechazar', 'editar'],
  rechazado: ['devolver'],
  aprobado: ['asignar', 'editar'],
  asignado: ['asignar', 'editar'],
  en_proceso: ['asignar', 'editar'],
  resuelto: ['reabrir', 'editar'],
}

const ESTADOS_TAREA_ACTIVA = ['asignada', 'en_proceso']

export default function PanelAcciones({ reporte, tareas, desde, alCambiar }) {
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
  // Con un gestor ya trabajando, asignar es sumar otro (RN-12).
  const textoAsignar = reporte.estado === 'aprobado' ? 'Asignar gestor' : 'Sumar otro gestor'
  // Un gestor no puede tener dos tareas activas en el mismo reporte (RN-11).
  const gestoresConTareaActiva = (tareas ?? [])
    .filter((t) => ESTADOS_TAREA_ACTIVA.includes(t.estado) && t.gestor)
    .map((t) => t.gestor.id)
  // Al pasar de aprobado a asignado el backend también avisa al ciudadano (RN-16, sección 9).
  const avisoAsignacion = (gestor) => {
    const nombre = `${gestor.nombre} ${gestor.apellido}`
    return reporte.estado === 'aprobado'
      ? `Tarea asignada a ${nombre}. Se le avisó a ${nombre} y al ciudadano.`
      : `Tarea asignada a ${nombre}. Se le avisó a ${nombre}.`
  }

  return (
    <div className="panel-acciones">
      <h2 className="panel-acciones__titulo">Acciones</h2>

      <div className="panel-acciones__grupo">
        {puede('asignar') && (
          <button
            type="button"
            className="boton-principal"
            onClick={() => setAbierto('asignar')}
            disabled={tareas === null}
          >
            <UserPlus size={18} aria-hidden="true" />
            {textoAsignar}
          </button>
        )}
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

      {abierto === 'asignar' && (
        <DialogoElegirGestor
          titulo={textoAsignar}
          textoBoton="Asignar"
          textoEnviando="Asignando…"
          excluir={gestoresConTareaActiva}
          accion={(gestor) => asignarTarea(reporte.id, gestor.id)}
          alCerrar={cerrar}
          alTerminar={(gestor) => terminar(avisoAsignacion(gestor))()}
        />
      )}

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
        <DialogoReabrir reporteId={reporte.id} alCerrar={cerrar} alTerminar={terminar(AVISO_REABIERTO)} />
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
