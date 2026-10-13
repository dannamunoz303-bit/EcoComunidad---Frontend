import { useId, useState } from 'react'
import { erroresPorCampo } from '../../../api/errores.js'
import { rechazarReporte } from '../../../api/reportes.js'
import Dialogo from '../../../componentes/Dialogo.jsx'
import ErrorAccion from './ErrorAccion.jsx'
import { useEnvio } from './useEnvio.js'

// Largo de reporte.motivo_rechazo en el backend.
const MAXIMO_MOTIVO = 255

// RN-08: rechazar exige motivo (que el reporte no es un tema ambiental).
export default function DialogoRechazar({ reporteId, alCerrar, alTerminar }) {
  const [motivo, setMotivo] = useState('')
  const { enviando, error, enviar } = useEnvio()
  const idCampo = useId()
  const idAyuda = useId()
  const idContador = useId()
  const motivoValido = motivo.trim().length > 0
  const errorCampo = erroresPorCampo(error).motivo_rechazo

  async function rechazar(evento) {
    evento.preventDefault()
    if (!motivoValido) return
    const { ok, resultado } = await enviar(() => rechazarReporte(reporteId, motivo.trim()))
    if (ok) alTerminar(resultado)
  }

  return (
    <Dialogo
      titulo="Rechazar reporte"
      alCerrar={alCerrar}
      bloqueado={enviando}
      pie={
        <>
          <button type="button" className="boton-secundario" onClick={alCerrar} disabled={enviando}>
            Cancelar
          </button>
          <button type="submit" form={`${idCampo}-formulario`} className="boton-peligro" disabled={!motivoValido || enviando}>
            {enviando ? 'Rechazando…' : 'Rechazar'}
          </button>
        </>
      }
    >
      <form id={`${idCampo}-formulario`} className="campo" onSubmit={rechazar} noValidate>
        <label htmlFor={idCampo}>Motivo del rechazo</label>
        <textarea
          id={idCampo}
          className="campo__area"
          rows={4}
          maxLength={MAXIMO_MOTIVO}
          required
          aria-required="true"
          aria-invalid={errorCampo ? 'true' : undefined}
          aria-describedby={`${idAyuda} ${idContador}`}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          disabled={enviando}
        />
        <div className="campo__ayuda-fila">
          <span id={idAyuda} className="campo__ayuda">
            Explica por qué no es un tema ambiental.
          </span>
          <span id={idContador} className="campo__contador" aria-live="polite">
            {motivo.length}/{MAXIMO_MOTIVO}
          </span>
        </div>
        {errorCampo && <p className="campo__error">{errorCampo}</p>}
      </form>
      {!errorCampo && <ErrorAccion error={error} />}
    </Dialogo>
  )
}
