import { RefreshCw, UserRoundCog, XCircle } from 'lucide-react'
import { useState } from 'react'
import { cancelarTarea, reasignarTarea } from '../../api/tareas.js'
import { useAvisos } from '../../componentes/avisos/useAvisos.js'
import EstadoTarea from '../../componentes/EstadoTarea.jsx'
import { formatearFechaHora } from '../../utilidades/fechas.js'
import DialogoElegirGestor from '../tareas/DialogoElegirGestor.jsx'
import DialogoConfirmar from './acciones/DialogoConfirmar.jsx'
import GaleriaFotos from './GaleriaFotos.jsx'

const ESTADOS_ACTIVOS = ['asignada', 'en_proceso']

const masReciente = (a, b) => new Date(b.fecha) - new Date(a.fecha) || b.id - a.id
const nombreDe = (persona) => (persona ? `${persona.nombre} ${persona.apellido}` : 'Gestor sin nombre')

function Tarea({ tarea, editable, alReasignar, alCancelar }) {
  const acciones = [...(tarea.acciones ?? [])].sort(masReciente)
  const gestor = nombreDe(tarea.gestor)
  const activa = ESTADOS_ACTIVOS.includes(tarea.estado)

  return (
    <li className="tarea">
      <div className="tarea__cabecera">
        <h3 className="tarea__gestor">{gestor}</h3>
        <EstadoTarea estado={tarea.estado} />
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

      {editable && activa && (
        <div className="tarea__acciones">
          <button
            type="button"
            className="boton-secundario"
            aria-label={`Reasignar la tarea de ${gestor}`}
            onClick={() => alReasignar(tarea)}
          >
            <UserRoundCog size={16} aria-hidden="true" />
            Reasignar
          </button>
          <button
            type="button"
            className="boton-secundario"
            aria-label={`Cancelar la tarea de ${gestor}`}
            onClick={() => alCancelar(tarea)}
          >
            <XCircle size={16} aria-hidden="true" />
            Cancelar
          </button>
        </div>
      )}

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

export default function HistorialTareas({ tareas, cargando, error, reintentar, reporte, alCambiar }) {
  const { mostrarAviso } = useAvisos()
  const [dialogo, setDialogo] = useState(null) // { tipo: 'reasignar' | 'cancelar', tarea }
  // Un reporte eliminado ya no tiene tareas activas que gestionar (RN-09).
  const editable = Boolean(reporte && !reporte.eliminado)

  const cerrar = () => setDialogo(null)
  const terminar = (texto) => {
    setDialogo(null)
    mostrarAviso({ tipo: 'exito', texto })
    alCambiar?.()
  }

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
  const tareaAbierta = dialogo?.tarea
  // Al reasignar se excluye al gestor actual y a quienes ya tienen otra tarea activa aquí (RN-11, RN-12).
  const excluir = tareas
    .filter((t) => ESTADOS_ACTIVOS.includes(t.estado) && t.gestor)
    .map((t) => t.gestor.id)

  return (
    <>
      <ol className="tareas">
        {tareas.map((tarea) => (
          <Tarea
            key={tarea.id}
            tarea={tarea}
            editable={editable}
            alReasignar={(t) => setDialogo({ tipo: 'reasignar', tarea: t })}
            alCancelar={(t) => setDialogo({ tipo: 'cancelar', tarea: t })}
          />
        ))}
      </ol>

      {dialogo?.tipo === 'reasignar' && (
        <DialogoElegirGestor
          titulo={`Reasignar la tarea de ${nombreDe(tareaAbierta.gestor)}`}
          textoBoton="Reasignar"
          textoEnviando="Reasignando…"
          excluir={excluir}
          accion={(gestor) => reasignarTarea(tareaAbierta.id, gestor.id)}
          alCerrar={cerrar}
          alTerminar={(gestor) => terminar(`Tarea reasignada a ${nombreDe(gestor)}.`)}
        />
      )}

      {dialogo?.tipo === 'cancelar' && (
        <DialogoConfirmar
          titulo={`¿Cancelar la tarea de ${nombreDe(tareaAbierta.gestor)}?`}
          textoBoton="Cancelar tarea"
          textoEnviando="Cancelando…"
          textoDescartar="Volver"
          peligro
          accion={() => cancelarTarea(tareaAbierta.id)}
          alCerrar={cerrar}
          alTerminar={() => terminar(`Tarea cancelada. ${nombreDe(tareaAbierta.gestor)} recibió una notificación.`)}
        >
          <p>Se le avisará y el estado del reporte se recalculará.</p>
        </DialogoConfirmar>
      )}
    </>
  )
}
