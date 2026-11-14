import { useId, useState } from 'react'
import { erroresPorCampo } from '../../../api/errores.js'
import { sancionarCausante } from '../../../api/reportes.js'
import Dialogo from '../../../componentes/Dialogo.jsx'
import TipoSancion from '../../../componentes/TipoSancion.jsx'
import { NOMBRES_TIPO_SANCION, TIPOS_SANCION, razonSugerenciaCausante } from '../../../utilidades/sanciones.js'
import { nombreCompleto } from '../../../utilidades/usuarios.js'
import ErrorAccion from '../acciones/ErrorAccion.jsx'
import { useEnvio } from '../acciones/useEnvio.js'
import '../../sanciones/sanciones.css'

// Largo de sancion.motivo (sección 4.9).
const MAXIMO_MOTIVO = 255
export const AYUDA_MOTIVO_CAUSANTE = 'No menciones quién hizo el reporte: el causante verá este motivo.'

// RN-27: sancionar al ciudadano registrado con la cédula del causante.
// Dos pasos en el mismo diálogo: el formulario y la confirmación.
// alTerminar(sancion) se llama cuando el backend la registró.
export default function DialogoSancionarCausante({ reporte, alCerrar, alTerminar }) {
  const { ciudadano, sugerencia, sanciones_como_causante: comoCausante } = reporte.causante
  const nombre = nombreCompleto(ciudadano)
  const [tipo, setTipo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [revisado, setRevisado] = useState(false)
  const { enviando, error, enviar } = useEnvio()
  const idMotivo = useId()
  const idTipo = useId()

  const errores = erroresPorCampo(error)
  const motivoLimpio = motivo.trim()
  const faltaTipo = revisado && !tipo
  const errorMotivo = (revisado && !motivoLimpio ? 'El motivo es obligatorio.' : null) ?? errores.motivo

  function revisar(evento) {
    evento.preventDefault()
    setRevisado(true)
    if (tipo && motivoLimpio) setConfirmando(true)
  }

  async function confirmar() {
    const envio = await enviar(() => sancionarCausante(reporte.id, { tipo, motivo: motivoLimpio }))
    if (envio.ok) alTerminar(envio.resultado)
    // Si el error es de un campo (tipo o motivo), se vuelve al formulario para corregirlo junto al campo.
    else if (envio.error && ['tipo', 'motivo'].some((c) => c in erroresPorCampo(envio.error))) setConfirmando(false)
  }

  if (confirmando) {
    return (
      <Dialogo
        titulo="¿Sancionar al causante?"
        alCerrar={alCerrar}
        bloqueado={enviando}
        pie={
          <>
            <button type="button" className="boton-secundario" onClick={() => setConfirmando(false)} disabled={enviando}>
              Volver
            </button>
            <button
              type="button"
              className={tipo === 'advertencia' ? 'boton-principal' : 'boton-peligro'}
              onClick={confirmar}
              disabled={enviando}
              data-autofoco
            >
              {enviando ? 'Registrando…' : 'Registrar sanción'}
            </button>
          </>
        }
      >
        <dl className="resumen-sancion">
          <div>
            <dt>Causante</dt>
            <dd>{nombre}</dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd>{NOMBRES_TIPO_SANCION[tipo]}</dd>
          </div>
          <div>
            <dt>Motivo</dt>
            <dd>{motivoLimpio}</dd>
          </div>
        </dl>
        <p>{nombre} recibirá una notificación con el tipo y el motivo, sin datos del reporte ni de quién lo hizo.</p>
        <ErrorAccion error={error} />
      </Dialogo>
    )
  }

  return (
    <Dialogo
      titulo="Sancionar al causante"
      alCerrar={alCerrar}
      bloqueado={enviando}
      grande
      pie={
        <>
          <button type="button" className="boton-secundario" onClick={alCerrar}>
            Cancelar
          </button>
          <button type="submit" form={idTipo} className="boton-principal">
            Revisar sanción
          </button>
        </>
      }
    >
      <form id={idTipo} className="nueva-sancion" onSubmit={revisar} noValidate>
        <p>
          Causante: <strong>{nombre}</strong>
        </p>

        {sugerencia && (
          <div className="sugerencia" role="group" aria-labelledby={`${idTipo}-sugerencia`}>
            <p id={`${idTipo}-sugerencia`} className="sugerencia__titulo">
              Sugerencia
            </p>
            <div className="sugerencia__fila">
              <TipoSancion tipo={sugerencia} />
              <span>{razonSugerenciaCausante(comoCausante)}</span>
            </div>
            <p className="texto-suave">Es solo una sugerencia; tú decides.</p>
            <button type="button" className="boton-secundario" onClick={() => setTipo(sugerencia)}>
              Usar sugerencia
            </button>
          </div>
        )}

        <fieldset className="opciones-sancion" aria-describedby={faltaTipo ? `${idTipo}-error` : undefined}>
          <legend>Tipo</legend>
          {TIPOS_SANCION.map((t) => (
            <label key={t.valor} className="opcion-sancion">
              <input
                type="radio"
                name={`tipo-${idTipo}`}
                value={t.valor}
                checked={tipo === t.valor}
                onChange={() => setTipo(t.valor)}
                aria-labelledby={`${idTipo}-nombre-${t.valor}`}
                aria-describedby={`${idTipo}-efecto-${t.valor}`}
              />
              <span id={`${idTipo}-nombre-${t.valor}`}>{NOMBRES_TIPO_SANCION[t.valor]}</span>
              <span id={`${idTipo}-efecto-${t.valor}`} className="opcion-sancion__efecto">
                {t.efecto}
              </span>
            </label>
          ))}
        </fieldset>
        {(faltaTipo || errores.tipo) && (
          <p id={`${idTipo}-error`} className="campo__error">
            {errores.tipo ?? 'Elige el tipo de sanción.'}
          </p>
        )}

        <div className="campo">
          <label htmlFor={idMotivo}>Motivo</label>
          <textarea
            id={idMotivo}
            rows={4}
            maxLength={MAXIMO_MOTIVO}
            required
            aria-required="true"
            aria-invalid={errorMotivo ? 'true' : undefined}
            aria-describedby={[`${idMotivo}-ayuda`, `${idMotivo}-contador`, errorMotivo && `${idMotivo}-error`]
              .filter(Boolean)
              .join(' ')}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <span id={`${idMotivo}-ayuda`} className="campo__ayuda">
            {AYUDA_MOTIVO_CAUSANTE}
          </span>
          <span id={`${idMotivo}-contador`} className="campo__contador">
            {motivo.length}/{MAXIMO_MOTIVO}
          </span>
          {errorMotivo && (
            <p id={`${idMotivo}-error`} className="campo__error">
              {errorMotivo}
            </p>
          )}
        </div>
      </form>
    </Dialogo>
  )
}
